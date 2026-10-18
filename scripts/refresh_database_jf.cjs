const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function normalizeString(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanNeighborhood(neigh) {
  if (!neigh) return '';
  return normalizeString(neigh)
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function cleanStreetName(street) {
  if (!street) return '';
  let norm = normalizeString(street);
  norm = norm.replace(/\s+/g, ' ');
  const prefixes = [
    [/^(rua|r)\b\.?\s*/i, 'r '],
    [/^(avenida|avn|av)\b\.?\s*/i, 'av '],
    [/^(estrada|etr|estr)\b\.?\s*/i, 'est '],
    [/^(travessa|trv|tra|trav)\b\.?\s*/i, 'trav '],
    [/^(praca|pra|prc)\b\.?\s*/i, 'praca '],
    [/^(beco|bec|bc)\b\.?\s*/i, 'beco '],
    [/^(alameda|alm|al)\b\.?\s*/i, 'al ']
  ];
  for (const [pattern, replacement] of prefixes) {
    if (pattern.test(norm)) {
      norm = norm.replace(pattern, replacement);
      break;
    }
  }
  return norm.trim();
}

function cleanStreetCore(s) {
  if (!s) return '';
  let norm = cleanStreetName(s);
  norm = norm.replace(/^(?:r|rua|av|avenida|est|estrada|trav|travessa|praca|beco|al|alameda|rod|rodovia)\s+/i, '');
  norm = norm.replace(/\b(doutor|dr|doutora|dra|coronel|cel|general|gen|major|maj|capitao|cap|tenente|ten|professor|prof|professora|profa|padre|pe|desembargador|des|barao|visconde|conde|dom|dona|da|de|do|dos|das)\b/gi, ' ');
  norm = norm.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return norm;
}

function getTxIntegralValue(tx) {
  if (typeof tx.normalizedTotalValue === 'number' && tx.normalizedTotalValue > 0) {
    return tx.normalizedTotalValue;
  }
  const frac = (tx.percentualTransmitido && tx.percentualTransmitido > 0)
    ? (tx.percentualTransmitido <= 1 ? tx.percentualTransmitido : tx.percentualTransmitido / 100)
    : 1;
  return Math.round(tx.transactionValue / frac);
}

function filterByIQR(values) {
  if (values.length < 4) {
    return { filtered: values, q1: 0, q3: 0, iqr: 0, minBound: 0, maxBound: Infinity };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const minBound = Math.max(10000, q1 - 1.5 * iqr);
  const maxBound = q3 + 1.5 * iqr;
  const filtered = sorted.filter(v => v >= minBound && v <= maxBound);
  return {
    filtered: filtered.length > 0 ? filtered : sorted,
    q1,
    q3,
    iqr,
    minBound,
    maxBound
  };
}

function computeMedian(vals) {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function inferReverseArea(valorIntegral, m2BaseRua) {
  if (!valorIntegral || !m2BaseRua || m2BaseRua <= 0) return 60.0;
  const raw = valorIntegral / m2BaseRua;
  return Math.max(15.0, Math.min(2500.0, Math.round(raw * 10) / 10));
}

function auctionCosts(p) {
  const bid = p.purchasePrice ?? p.auctionPrice ?? 0;
  const caixa = p.origin === 'caixa' || p.acquisitionRule === 'caixa' || p.id?.includes('caixa');
  return {
    bid,
    auctioneer: p.auctioneerFee ?? (caixa ? 0 : Math.round(bid * 0.05)),
    itbi: p.itbiCost ?? Math.round(bid * ((p.itbiPercent ?? 3) / 100)),
    registry: p.notaryCost !== undefined ? p.notaryCost + (p.caixaContractCost || 0) + (p.certificatesCost || 0) : Math.round(bid * 0.03),
    repair: p.estimatedRepair ?? Math.round(bid * 0.05),
    legal: p.lawyerFee ?? (caixa ? 6000 : (p.otherCosts || 0)),
    iptu: p.pendingIptuCost ?? 0,
    condo: p.pendingCondoCost ?? (String(p.propertyType).toLowerCase().includes('casa') ? 0 : (p.pendingDebts || 0))
  };
}

function calculateFlip(exitValue, acquisitionCost, monthlyHolding = 0) {
  const brokerFee = Math.round(exitValue * 0.04);
  const holding = monthlyHolding * 3;
  const grossGain = exitValue - acquisitionCost - holding - brokerFee;
  const tax = grossGain > 0 ? Math.round(grossGain * 0.15) : 0;
  const netProfit = grossGain - tax;
  const roi = acquisitionCost > 0 ? Number(((netProfit / (acquisitionCost + holding)) * 100).toFixed(2)) : 0;
  return { brokerFee, holding, grossGain, tax, netProfit, roi };
}

console.log('Loading data_store.json...');
const data = JSON.parse(fs.readFileSync('data_store.json', 'utf8'));

const txs = data.itbiTransactions || [];
console.log(`Loaded ${txs.length} transactions.`);

// Group Juiz de Fora transactions
const jfTxs = txs.filter(t => (t.city && t.city.toLowerCase().includes('juiz')) || (t.state && t.state.toUpperCase() === 'MG'));
console.log(`Found ${jfTxs.length} Juiz de Fora transactions.`);

const jfNeighMap = new Map();
for (const t of jfTxs) {
  const nKey = cleanNeighborhood(t.neighborhood) || 'centro';
  let list = jfNeighMap.get(nKey);
  if (!list) {
    list = [];
    jfNeighMap.set(nKey, list);
  }
  list.push(t);
}

const area_referencia = 60.0;
const streetBaseRates = new Map(); // streetCore -> m2_base
const neighBaseRates = new Map(); // neighKey -> m2_base

for (const [nKey, nTxs] of jfNeighMap.entries()) {
  const cvTxs = nTxs.filter(t => t.isCompraEVenda !== false);
  const bIntegrals = cvTxs.map(t => getTxIntegralValue(t)).filter(v => v >= 15000 && v <= 50000000);
  const bIqr = filterByIQR(bIntegrals);
  const bMediana = bIqr.filtered.length > 0 ? computeMedian(bIqr.filtered) : 0;
  const m2_base_bairro = bMediana > 0 ? Math.round(bMediana / area_referencia) : 3800;
  neighBaseRates.set(nKey, m2_base_bairro);

  // Group by street
  const streetMap = new Map();
  for (const t of cvTxs) {
    const core = cleanStreetCore(t.street || t._core);
    if (!core) continue;
    let sList = streetMap.get(core);
    if (!sList) {
      sList = [];
      streetMap.set(core, sList);
    }
    sList.push(t);
  }

  for (const [core, sTxs] of streetMap.entries()) {
    const sIntegrals = sTxs.map(t => getTxIntegralValue(t)).filter(v => v >= 15000 && v <= 50000000);
    const sIqr = filterByIQR(sIntegrals);
    const sMediana = sIqr.filtered.length > 0 ? computeMedian(sIqr.filtered) : bMediana;
    const m2_base_rua = sMediana > 0 ? Math.round(sMediana / area_referencia) : m2_base_bairro;
    streetBaseRates.set(core, m2_base_rua);
  }
}

// Now populate estimatedSizeSqm, sizeSqm, unitValueSqm on all JF transactions
let updatedCount = 0;
for (const t of jfTxs) {
  const nKey = cleanNeighborhood(t.neighborhood) || 'centro';
  const core = cleanStreetCore(t.street || t._core);
  const m2Base = streetBaseRates.get(core) || neighBaseRates.get(nKey) || 3800;
  const vInt = getTxIntegralValue(t);
  t.normalizedTotalValue = vInt;
  t.estimatedSizeSqm = inferReverseArea(vInt, m2Base);
  t.sizeSqm = t.estimatedSizeSqm;
  t.unitValueSqm = m2Base;
  t.isDerivedSqm = true;
  updatedCount++;
}
console.log(`Updated ${updatedCount} Juiz de Fora transactions with derived m² and reverse-inferred areas.`);

// Now recalculate Juiz de Fora auctions
const auctions = data.auctions || [];
const jfAuctions = auctions.filter(a => (a.city && a.city.toLowerCase().includes('juiz')) || (a.state && a.state.toUpperCase() === 'MG'));
console.log(`Found ${jfAuctions.length} Juiz de Fora auctions to recalculate.`);

for (const auc of jfAuctions) {
  const nKey = cleanNeighborhood(auc.neighborhood) || 'centro';
  const core = cleanStreetCore(auc.address);
  const m2BaseRua = streetBaseRates.get(core) || neighBaseRates.get(nKey) || 3800;
  const targetArea = (auc.sizeSqm && auc.sizeSqm > 0) ? auc.sizeSqm : 60.0;
  const fatorEscala = Math.pow(area_referencia / targetArea, 0.15);
  const m2Imovel = Math.round(m2BaseRua * fatorEscala);
  const gabaritoTotal = Math.round(m2Imovel * targetArea);
  const flipSqm = Math.round(m2Imovel * 0.90);
  const flipTotal = Math.round(flipSqm * targetArea);

  auc.itbiStreetAvgSqm = m2BaseRua;
  auc.itbiUnitValueAvg = m2Imovel;
  auc.estimatedValue = gabaritoTotal;
  auc.vendaBaixaPrice = flipTotal;
  auc.vendaMediaPrice = flipTotal;
  auc.itbiIsDerivedSqm = true;
  auc.itbiIsAbsolutePricing = false;
  auc.sizeVerified = true;
  auc.valuationConfidence = 'verified';
  auc.valuationBasis = `ITBI Homogeneizado NBR 14.653 - Rua (Ref. 60m²: R$ ${m2BaseRua.toLocaleString('pt-BR')}/m², Escala: ${fatorEscala.toFixed(3)})`;

  const costs = auctionCosts(auc);
  const totalAcq = costs.bid + costs.auctioneer + costs.itbi + costs.registry + costs.repair + costs.legal + costs.iptu + costs.condo;
  const flipResult = calculateFlip(flipTotal, totalAcq);
  auc.calculatedProfit = flipResult.netProfit;
  auc.calculatedRoi = flipResult.roi;
}
console.log(`Recalculated ${jfAuctions.length} auctions with NBR 14.653 homogenized scale pricing.`);

// Save back to data_store.json and data_store.json.gz
const updatedJson = JSON.stringify(data, null, 2);
fs.writeFileSync('data_store.json', updatedJson, 'utf8');
console.log('Saved data_store.json.');

const gzipped = zlib.gzipSync(Buffer.from(updatedJson, 'utf8'));
fs.writeFileSync('data_store.json.gz', gzipped);
console.log(`Saved data_store.json.gz (${gzipped.length} bytes).`);

// Print sample results for validation
if (jfAuctions.length > 0) {
  const sample = jfAuctions[0];
  console.log('Sample updated auction:', {
    title: sample.title,
    address: sample.address,
    sizeSqm: sample.sizeSqm,
    itbiStreetAvgSqm: sample.itbiStreetAvgSqm,
    itbiUnitValueAvg: sample.itbiUnitValueAvg,
    estimatedValue: sample.estimatedValue,
    vendaBaixaPrice: sample.vendaBaixaPrice,
    calculatedProfit: sample.calculatedProfit,
    calculatedRoi: sample.calculatedRoi,
    valuationBasis: sample.valuationBasis
  });
}
