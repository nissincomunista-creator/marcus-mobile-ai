import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { toCanonicalPropertyType } from '../src/utils/propertyTypes.ts';
import { auditOfficialArea } from '../src/utils/officialAreaAudit.ts';
import { isExpiredAuction, isRetired } from '../auctionPipeline/lifecycle.ts';
import type { PropertyType, AuctionProperty } from '../src/types.ts';

const STORE_PATH = 'data_store.json.gz';
const STORE_RAW_PATH = 'data_store.json';

if (!fs.existsSync(STORE_PATH)) {
  console.error('Store file does not exist:', STORE_PATH);
  process.exit(1);
}

const rawGz = fs.readFileSync(STORE_PATH);
const store = JSON.parse(zlib.gunzipSync(rawGz).toString('utf-8'));

console.log('--- Current Store Summary ---');
console.log('Total auctions:', store.auctions.length);
console.log('Total ITBI txs:', store.itbiTransactions?.length || 0);

// 1. Sanitize Caixa Properties
let caixaFixed = 0;
let caixaSizeUpdated = 0;
const typeCounts: Record<string, number> = {};

for (const a of store.auctions) {
  const isCaixa = a.origin === 'caixa' || a.origin === 'caixa_radar' || (typeof a.id === 'string' && a.id.startsWith('auc-caixa-'));
  if (!isCaixa) continue;

  const desc = a.description || '';
  const matchDesc = desc.match(/Descrição:\s*(.*)/i);
  const rawDesc = matchDesc ? matchDesc[1].trim() : desc;

  // Extract raw Caixa type from description
  const rawCaixaType = (rawDesc.split(/[,.\s]+/)[0] || '').trim();
  const correctedType: PropertyType = toCanonicalPropertyType(rawCaixaType, '', rawDesc);

  if (a.propertyType !== correctedType) {
    a.propertyType = correctedType;
    caixaFixed++;
  }
  typeCounts[correctedType] = (typeCounts[correctedType] || 0) + 1;

  // Re-audit official area with corrected propertyType
  const audit = auditOfficialArea({
    text: rawDesc,
    title: a.title || '',
    propertyType: correctedType,
    url: a.auctionLink || 'https://venda-imoveis.caixa.gov.br/listaweb/'
  });
  const auditedArea = audit.selected?.value || 0;
  if (auditedArea > 0 && Math.abs(a.sizeSqm - auditedArea) > 0.01) {
    a.sizeSqm = auditedArea;
    caixaSizeUpdated++;
  }
  a.sizeVerified = a.sizeSqm > 0;

  // Fix title
  const cleanBairro = (a.neighborhood || '').toUpperCase();
  a.title = `${correctedType} Retomado Caixa - ${cleanBairro}`;

  // Fix evaluationPrice if missing
  if (!a.evaluationPrice || a.evaluationPrice <= 0) {
    const matchEval = desc.match(/Avaliação original Caixa: R\$\s*([\d.]+)/i);
    if (matchEval) {
      a.evaluationPrice = parseFloat(matchEval[1]);
    }
  }

  // Parse bathrooms if missing
  if (!a.bathrooms) {
    const wcNumMatch = rawDesc.match(/(\d+)\s*wc/i) || rawDesc.match(/(\d+)\s*banheiro/i);
    if (wcNumMatch) {
      a.bathrooms = parseInt(wcNumMatch[1]);
    } else if (/\bwc\b/i.test(rawDesc) || /\bbanheiro\b/i.test(rawDesc)) {
      a.bathrooms = 1;
    }
  }
}

console.log('\n--- Caixa Properties Updated ---');
console.log('Tipology corrections applied:', caixaFixed);
console.log('Size updates applied:', caixaSizeUpdated);
console.log('New Caixa Typology breakdown:', typeCounts);

// 2. Check Judicial and Extrajudicial Auctions
let judicialTotal = 0;
let judicialExpired = 0;
let extraTotal = 0;
let extraExpired = 0;

for (const a of store.auctions) {
  if (a.origin === 'judicial') {
    judicialTotal++;
    if (isExpiredAuction(a)) {
      judicialExpired++;
      a.ingestionStatus = 'expirado_por_data';
      a.status = 'Arquivado';
    }
  } else if (a.origin === 'extrajudicial') {
    extraTotal++;
    if (isExpiredAuction(a)) {
      extraExpired++;
      a.ingestionStatus = 'expirado_por_data';
      a.status = 'Arquivado';
    }
  }
}

console.log('\n--- Judicial / Extrajudicial Audit ---');
console.log(`Judicial: ${judicialTotal} total, ${judicialExpired} expired/archived`);
console.log(`Extrajudicial: ${extraTotal} total, ${extraExpired} expired/archived`);

// 3. Recalculate valuations for all Caixa properties based on ITBI averages of their correct typology
// Build ITBI map: key = `${city}|${neighborhood}|${propertyType}` -> avgSqm
const itbiMap = new Map<string, { sum: number; count: number }>();
for (const tx of store.itbiTransactions || []) {
  if (!tx.unitValueSqm || tx.unitValueSqm <= 0 || !tx.sizeSqm || tx.sizeSqm <= 0) continue;
  const c = String(tx.city || '').toLowerCase().trim();
  const n = String(tx.neighborhood || '').toLowerCase().trim();
  const pt = tx.propertyType || 'Apartamento';
  const key = `${c}|${n}|${pt}`;
  const cur = itbiMap.get(key) || { sum: 0, count: 0 };
  cur.sum += tx.unitValueSqm;
  cur.count += 1;
  itbiMap.set(key, cur);
}

// Bairro general map: key = `${city}|${neighborhood}`
const bairroMap = new Map<string, { sum: number; count: number }>();
for (const tx of store.itbiTransactions || []) {
  if (!tx.unitValueSqm || tx.unitValueSqm <= 0) continue;
  const c = String(tx.city || '').toLowerCase().trim();
  const n = String(tx.neighborhood || '').toLowerCase().trim();
  const key = `${c}|${n}`;
  const cur = bairroMap.get(key) || { sum: 0, count: 0 };
  cur.sum += tx.unitValueSqm;
  cur.count += 1;
  bairroMap.set(key, cur);
}

let recalculatedCount = 0;
for (const a of store.auctions) {
  if (a.origin !== 'caixa' && a.origin !== 'caixa_radar' && !(a.id && a.id.startsWith('auc-caixa-'))) continue;

  const c = String(a.city || '').toLowerCase().trim();
  const n = String(a.neighborhood || '').toLowerCase().trim();
  const pt = a.propertyType || 'Apartamento';

  const typeAvg = itbiMap.get(`${c}|${n}|${pt}`);
  const genAvg = bairroMap.get(`${c}|${n}`);

  const m2Ref = typeAvg && typeAvg.count >= 2
    ? Math.round(typeAvg.sum / typeAvg.count)
    : genAvg && genAvg.count >= 2
      ? Math.round(genAvg.sum / genAvg.count)
      : a.m2ReferenciaBairro || (pt === 'Casa' ? 3800 : pt === 'Terreno' ? 1200 : 4500);

  a.m2ReferenciaBairro = m2Ref;
  const size = a.sizeSqm > 0 ? a.sizeSqm : 50;

  // Valuation logic
  let expectedVal = Math.round(size * m2Ref);
  if (a.evaluationPrice && a.evaluationPrice > 0) {
    // Harmonize with Caixa's official evaluation price (do not let ITBI stray wildly if few samples)
    if (expectedVal <= 0 || expectedVal > a.evaluationPrice * 2.5 || expectedVal < a.evaluationPrice * 0.4) {
      expectedVal = Math.round((expectedVal + a.evaluationPrice) / 2);
    }
  }

  a.estimatedValue = expectedVal;
  a.valorMercadoEstimado = expectedVal;
  a.vendaBaixaPrice = Math.round(expectedVal * 0.90);
  a.vendaMediaPrice = a.vendaBaixaPrice;

  // Costs and ROI
  const bid = a.auctionPrice || 0;
  const itbiCost = Math.round(bid * 0.03);
  const notaryCost = Math.round(bid * 0.02);
  const repairCost = Math.round((a.sizeSqm || 50) * 350);
  a.estimatedRepair = repairCost;
  a.itbiCost = itbiCost;
  a.notaryCost = notaryCost;

  const totalCost = bid + itbiCost + notaryCost + repairCost + (a.pendingDebts || 0);
  const netProfit = Math.max(0, a.vendaBaixaPrice - totalCost);
  a.calculatedProfit = netProfit;
  a.calculatedRoi = totalCost > 0 ? Number(((netProfit / totalCost) * 100).toFixed(2)) : 0;

  const diff = expectedVal - bid;
  a.descontoMercadoPct = expectedVal > 0 && diff > 0 ? Math.round((diff / expectedVal) * 100) : 0;
  a.oportunidadeAbaixoMercado = netProfit > 0 && (a.calculatedRoi || 0) >= 15;

  recalculatedCount++;
}

console.log(`\n--- Recalculation Complete ---`);
console.log(`Recalculated valuations and ROIs for ${recalculatedCount} Caixa lots.`);

// 4. Save sanitized store
console.log('\nSaving updated store to disk...');
const updatedJson = JSON.stringify(store);
const compressed = zlib.gzipSync(Buffer.from(updatedJson, 'utf-8'));
fs.writeFileSync(STORE_PATH, compressed);
if (fs.existsSync(STORE_RAW_PATH)) {
  fs.writeFileSync(STORE_RAW_PATH, updatedJson, 'utf-8');
}
console.log('Saved to data_store.json.gz and data_store.json successfully!');

// 5. Clean cache files
const cacheDir = path.join(process.cwd(), '.cache');
if (fs.existsSync(cacheDir)) {
  const files = fs.readdirSync(cacheDir);
  for (const f of files) {
    if (f.startsWith('auction-catalog-response')) {
      fs.unlinkSync(path.join(cacheDir, f));
      console.log(`Removed cache file: ${f}`);
    }
  }
}
console.log('Cache invalidated.');
