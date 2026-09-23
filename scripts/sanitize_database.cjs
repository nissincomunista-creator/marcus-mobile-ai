const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const numeric = (s) => Number(s.includes(',') ? s.replace(/\./g,'').replace(',','.') : /^\d{1,3}(?:\.\d{3})+$/.test(s) ? s.replace(/\./g,'') : s);

function auditOfficialArea(input) {
  let candidates = [];
  const add = (value, kind, excerpt) => { if (Number.isFinite(value) && value > 0) candidates.push({ value, kind, excerpt: excerpt.trim().slice(0, 220), approximate: /aproxim|cerca de|estimad/i.test(excerpt) }); };
  const text = (input.text || '').split(/Outros lotes|Lotes relacionados|Veja também|Imóveis similares/i)[0];
  const label = '(?:[aá]rea\\s+(?:privativa|[uú]til|constru[ií]da|edificada|total|comum|do\\s+terreno|de\\s+terreno)(?:\\s*\\([^)]*\\))?|metragem\\s+constru[ií]da)';
  const amount = '(\\d+(?:[.,]\\d+)*)';
  const unit = '(?:m[²2]|metros?\\s+quadrados?|ha|hectares?)';
  const kind = (s) => /comum/i.test(s) ? 'common' : /terreno/i.test(s) ? 'land' : /privativa/i.test(s) ? 'private' : /[uú]til/i.test(s) ? 'usable' : /constru|edificada/i.test(s) ? 'built' : 'total';

  for (const m of text.matchAll(new RegExp('(' + label + ')\\s*(?:aproximad[ao](?:mente)?|de)?\\s*[:=]?\\s*' + amount + '\\s*(' + unit + ')', 'gi'))) add(numeric(m[2]) * (/ha|hectare/i.test(m[3]) ? 10000 : 1), kind(m[1]), m[0]);
  for (const m of text.matchAll(new RegExp(amount + '\\s*(' + unit + ')\\s+de\\s+(' + label + ')', 'gi'))) add(numeric(m[1]) * (/ha|hectare/i.test(m[2]) ? 10000 : 1), kind(m[3]), m[0]);
  for (const m of text.matchAll(new RegExp('[aá]rea\\s+de\\s*' + amount + '\\s*(' + unit + ')', 'gi'))) add(numeric(m[1]) * (/ha|hectare/i.test(m[2]) ? 10000 : 1), 'unspecified', m[0]);
  for (const m of text.matchAll(new RegExp('(?:possui|mede|medindo)\\s+(?:aproximadamente\\s+)?' + amount + '\\s*(' + unit + ')', 'gi'))) add(numeric(m[1]) * (/ha|hectare/i.test(m[2]) ? 10000 : 1), 'unspecified', m[0]);
  for (const m of text.matchAll(new RegExp('\\b(privativa|priv\\.|constru[ií]da|constr\\.|edificada|terreno|terr\\.)(?:\\s*\\([^)]*\\))?\\s*(?:estimada|aproximada|de)?\\s*[:=]?\\s*' + amount + '\\s*(' + unit + ')', 'gi'))) add(numeric(m[2]) * (/ha|hectare/i.test(m[3]) ? 10000 : 1), /^priv/i.test(m[1]) ? 'private' : /^terr/i.test(m[1]) ? 'land' : 'built', m[0]);
  for (const m of (input.title || '').matchAll(new RegExp(amount + '\\s*(' + unit + ')', 'gi'))) add(numeric(m[1]) * (/ha|hectare/i.test(m[2]) ? 10000 : 1), 'title', m[0]);
  for (const value of input.structuredSizes || []) add(value, 'structured', 'Área publicada nos dados estruturados do lote');

  const land = /Terreno|Gleba|Fazenda/i.test(input.propertyType);
  if (!land) {
    const hasBuiltOrPrivate = candidates.some(c => (c.kind === 'private' || c.kind === 'usable' || c.kind === 'built') && c.value > 10 && c.value <= 800);
    if (hasBuiltOrPrivate) {
      candidates = candidates.filter(c => c.kind !== 'land' && c.value <= 800);
    }
  }

  const ranks = land ? ['land', 'total', 'unspecified', 'structured', 'title'] : ['private', 'usable', 'built', 'structured', 'unspecified', 'title'];
  let selected; let conflict = false;
  for (const rank of ranks) {
    const group = candidates.filter(c => c.kind === rank);
    if (!group.length) continue;
    const unique = new Set(group.map(c => c.value));
    if (unique.size > 1) { conflict = true; break; }
    selected = group[0];
    break;
  }
  const status = conflict ? 'conflict' : !selected ? 'missing' : selected.approximate ? 'approximate' : 'confirmed';
  return { status, sourceUrl: input.url, checkedAt: new Date().toISOString(), selected, candidates, extractedValue: input.extractedValue, disagrees: Boolean(selected && input.extractedValue && Math.abs(selected.value - input.extractedValue) > 0.01) };
}

function parseBrazilianMoney(val) {
  if (!val) return 0;
  let clean = val.replace(/[^\d.,]/g, '').trim();
  if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/\./g, '').replace(',', '.');
  else if (clean.includes(',')) clean = clean.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) clean = clean.replace(/\./g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

function normalizeDateStr(dateStr) {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return dateStr;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  let year = match[3];
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${day}`;
}

function extractAuctionRoundsAndPrices(text, today) {
  if (!text) return { activePrice: 0, priceVerified: false };

  let firstAuctionPrice;
  let firstAuctionDate;

  const m1Date = text.match(/(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,100}?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (m1Date) firstAuctionDate = normalizeDateStr(m1Date[1]);

  const m1Price = text.match(/(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,120}?R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)[\s\S]{0,80}?(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)/i);
  if (m1Price) {
    const p1 = parseBrazilianMoney(m1Price[1]);
    if (p1 > 1000) firstAuctionPrice = p1;
  }

  // 2. Look for 2º leilão / praça price and date
  let secondAuctionPrice;
  let secondAuctionDate;

  const m2Date = text.match(/(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,100}?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (m2Date) secondAuctionDate = normalizeDateStr(m2Date[1]);

  const m2Price = text.match(/(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,120}?R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/ser[aá]\s+realizado\s+o\s+2[ºªo°]\s+leil[aã]o[\s\S]{0,120}?pelo\s+valor\s+de\s*R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)[\s\S]{0,80}?(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)/i);
  if (m2Price) {
    const p2 = parseBrazilianMoney(m2Price[1]);
    if (p2 > 1000) secondAuctionPrice = p2;
  }

  const mGeneric = text.match(/(?:lance\s*(?:inicial|m[ií]nimo)|valor\s*m[ií]nimo(?:\s*para\s*proposta)?|valor\s*inicial|maior\s*lance\s*atual|lance\s*atual)\s*:?\s*(?:<[^>]+>)*\s*R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)\s*(?:<[^>]+>)*\s*(?:lance\s*(?:inicial|m[ií]nimo)|valor\s*m[ií]nimo)/i)
    || text.match(/(?:Em\s+leil[aã]o\s+pelo\s+valor\s+de|venda\s+direta)\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  let genericPrice = 0;
  if (mGeneric) {
    const pGen = parseBrazilianMoney(mGeneric[1]);
    if (pGen > 1000) genericPrice = pGen;
  }

  let activePrice = 0;
  let activeDate = '';

  if (firstAuctionPrice && firstAuctionPrice > 0) {
    if (firstAuctionDate && firstAuctionDate >= today) {
      activePrice = firstAuctionPrice;
      activeDate = firstAuctionDate;
    } else if (firstAuctionDate && firstAuctionDate < today && secondAuctionPrice && secondAuctionPrice > 0) {
      activePrice = secondAuctionPrice;
      activeDate = secondAuctionDate || firstAuctionDate;
    } else {
      activePrice = firstAuctionPrice;
      activeDate = firstAuctionDate || secondAuctionDate || '';
    }
  } else if (secondAuctionPrice && secondAuctionPrice > 0) {
    activePrice = secondAuctionPrice;
    activeDate = secondAuctionDate || '';
  } else if (genericPrice > 0) {
    activePrice = genericPrice;
    activeDate = firstAuctionDate || '';
  }

  // Appraisal extraction
  let appraisal;
  const mAppr = text.match(/(?:avalia[cç][aã]o|valor\s+avaliado|laudo\s+de\s+avalia[cç][aã]o)\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (mAppr) {
    const pApp = parseBrazilianMoney(mAppr[1]);
    if (pApp > 1000) appraisal = pApp;
  }

  return {
    firstAuctionPrice,
    firstAuctionDate,
    secondAuctionPrice,
    secondAuctionDate,
    activePrice,
    activeDate,
    appraisal,
    priceVerified: activePrice > 0
  };
}

const gzPath = path.join(__dirname, '..', 'data_store.json.gz');
const storePath = path.join(__dirname, '..', 'data_store.json');

const raw = zlib.gunzipSync(fs.readFileSync(gzPath));
const store = JSON.parse(raw.toString('utf-8'));
const today = new Date().toISOString().slice(0, 10);

console.log(`Carregados ${store.auctions.length} leilões de data_store.json.gz`);

let fixedSizes = 0;
let fixedBids = 0;
let fixedRounds = 0;
let fixedValuations = 0;

for (const a of store.auctions) {
  const combinedText = (a.description || '') + ' ' + (a.title || '');

  // 1. Sanitize apartment and commercial condominium land plot size mismatch
  if ((a.propertyType === 'Apartamento' || a.propertyType === 'Comercial') && a.sizeSqm > 800) {
    if (a.description) {
      const audit = auditOfficialArea({
        text: a.description,
        title: a.title || '',
        propertyType: a.propertyType,
        url: a.auctionLink || '',
        extractedValue: a.sizeSqm
      });
      if (audit.selected && audit.selected.value > 0 && audit.selected.value <= 800) {
        console.log(`[Área Corrigida] ${a.id}: ${a.sizeSqm} m² -> ${audit.selected.value} m² (${audit.selected.excerpt})`);
        const oldSize = a.sizeSqm;
        a.sizeSqm = Math.round(audit.selected.value * 100) / 100;
        a.areaAudit = audit;
        fixedSizes++;

        // If estimatedValue was based on the massive land size, rescale it
        if (a.estimatedValue && oldSize > 0) {
          const ratio = a.sizeSqm / oldSize;
          const oldVal = a.estimatedValue;
          a.estimatedValue = Math.round(oldVal * ratio);
          if (a.vendaBaixaPrice) a.vendaBaixaPrice = Math.round(a.vendaBaixaPrice * ratio);
          if (a.vendaMediaPrice) a.vendaMediaPrice = Math.round(a.vendaMediaPrice * ratio);
          console.log(`[Avaliação Reescalada] ${a.id}: R$ ${oldVal.toLocaleString('pt-BR')} -> R$ ${a.estimatedValue.toLocaleString('pt-BR')}`);
          fixedValuations++;
        }
      }
    }
  }

  // 2. Sanitize unconfirmed / zero bids
  const rounds = extractAuctionRoundsAndPrices(combinedText, today);

  if (rounds.firstAuctionPrice && !a.firstAuctionPrice) a.firstAuctionPrice = rounds.firstAuctionPrice;
  if (rounds.secondAuctionPrice && !a.secondAuctionPrice) a.secondAuctionPrice = rounds.secondAuctionPrice;
  if (rounds.firstAuctionDate && !a.firstAuctionDate) a.firstAuctionDate = rounds.firstAuctionDate;
  if (rounds.secondAuctionDate && !a.secondAuctionDate) a.secondAuctionDate = rounds.secondAuctionDate;

  if (!(a.auctionPrice > 0)) {
    if (rounds.activePrice > 0) {
      a.auctionPrice = rounds.activePrice;
      a.priceVerified = true;
      if (rounds.activeDate && !a.auctionDate) a.auctionDate = rounds.activeDate;
      fixedBids++;
    }
  } else if (a.firstAuctionPrice && a.firstAuctionDate) {
    // Check if 1st auction is still active/future, ensure we show 1st round price
    if (a.firstAuctionDate >= today && a.auctionPrice !== a.firstAuctionPrice && a.firstAuctionPrice > 0) {
      console.log(`[Rodada Ativa 1º Leilão] ${a.id}: R$ ${a.auctionPrice} -> R$ ${a.firstAuctionPrice}`);
      a.auctionPrice = a.firstAuctionPrice;
      fixedRounds++;
    } else if (a.firstAuctionDate < today && a.secondAuctionPrice && a.secondAuctionPrice > 0 && a.auctionPrice !== a.secondAuctionPrice) {
      console.log(`[Rodada Ativa 2º Leilão] ${a.id}: R$ ${a.auctionPrice} -> R$ ${a.secondAuctionPrice}`);
      a.auctionPrice = a.secondAuctionPrice;
      fixedRounds++;
    }
  }

  // 3. Recalculate profit and ROI if bid price or valuation changed
  if (a.auctionPrice > 0 && a.estimatedValue && a.estimatedValue > 0) {
    const bidPrice = a.auctionPrice;
    const repair = a.estimatedRepair || Math.round(bidPrice * 0.05);
    const condo = a.pendingCondoCost || 0;
    const itbi = Math.round(bidPrice * 0.03);
    const notary = a.notaryCost || 3000;
    const totalCost = bidPrice + repair + condo + itbi + notary + (a.auctioneerFee || Math.round(bidPrice * 0.05));
    const exitPrice = a.vendaBaixaPrice || Math.round(a.estimatedValue * 0.90);
    const netProfit = exitPrice - totalCost;
    a.calculatedProfit = netProfit;
    a.calculatedRoi = Math.round((netProfit / totalCost) * 100);
  }
}

store.calibrationVersion = 'v22_active_round_and_condo_area_sanitization';

console.log(`--- Resumo da Higienização ---`);
console.log(`Metragens privativas corrigidas: ${fixedSizes}`);
console.log(`Avaliações reescaladas (fim de valores 22M/41M): ${fixedValuations}`);
console.log(`Lances zerados recuperados: ${fixedBids}`);
console.log(`Rodadas ativas sincronizadas com o portal: ${fixedRounds}`);

const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(store)));
fs.writeFileSync(gzPath, compressed);
console.log(`Salvo data_store.json.gz com sucesso! (${compressed.length} bytes)`);

if (fs.existsSync(storePath)) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  console.log(`Salvo data_store.json com sucesso!`);
}
