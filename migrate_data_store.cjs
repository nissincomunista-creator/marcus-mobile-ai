const fs = require('fs');

const housePattern = /\b(casa|sobrado|moradia|residencia|vila|condom[ií]nio\s+fechado|funda[cç][aã]o|chal[eé]|bangal[oô]|im[oó]vel\s+residencial(?!\s+apto))\b/i;

function normalizePropertyType(rawType = '', title = '', desc = '') {
  const fullText = `${rawType} ${title} ${desc}`.toLowerCase();
  if (fullText.includes('apartamento') || fullText.includes('apto') || fullText.includes('conjugado') || fullText.includes('kitnet') || fullText.includes('loft') || fullText.includes('cobertura')) {
    return 'APARTAMENTO';
  }
  if (housePattern.test(fullText)) {
    return 'CASA';
  }
  if (fullText.includes('comercial') || fullText.includes('sala') || fullText.includes('loja') || fullText.includes('pr[eé]dio')) {
    return 'COMERCIAL';
  }
  if (fullText.includes('terreno') || fullText.includes('lote')) {
    return 'TERRENO';
  }
  return 'OUTRO';
}

function toCanonicalPropertyType(rawType = '', title = '', desc = '') {
  const norm = normalizePropertyType(rawType, title, desc);
  switch (norm) {
    case 'CASA': return 'Casa';
    case 'APARTAMENTO': return 'Apartamento';
    case 'COMERCIAL': return 'Comercial';
    case 'TERRENO': return 'Terreno';
    default: return 'Apartamento';
  }
}

const data = JSON.parse(fs.readFileSync('data_store.json', 'utf8'));
const auctions = data.auctions || [];

let reclassifiedCasas = 0;
let canonicalKeysAssigned = 0;

for (const a of auctions) {
  const oldType = a.propertyType;
  const newType = toCanonicalPropertyType(oldType, a.title, a.description);
  if (newType === 'Casa' && oldType !== 'Casa') {
    a.propertyType = 'Casa';
    reclassifiedCasas++;
  }

  // Canonical keys
  if (!a.canonicalPropertyId) {
    const combined = `${a.title || ''} ${a.description || ''} ${a.auctionLink || ''} ${a.id || ''}`;
    const caixaMatch = (a.id || '').match(/caixa[_-](\d{6,18})/i)
      || (a.auctionLink || '').match(/(?:hdnimovel=|imovel-caixa[a-z0-9-]*|cef[a-z0-9-]*|detalhe-imovel\.asp\?hdnimovel=)(\d{6,18})/i)
      || combined.match(/\[['"]?(\d{10,16})['"]?\]/)
      || combined.match(/\b(?:im[oó]vel\s+(?:n[ºo°.]*\s*)?|cef\s+|caixa\s+|n[ºo°.]\s*im[oó]vel\s*)(\d{10,16})\b/i);

    if (caixaMatch) {
      a.canonicalPropertyId = `CAIXA_${caixaMatch[1]}`;
      canonicalKeysAssigned++;
    } else if (a.origin === 'judicial' || /judicial/i.test(combined)) {
      const processMatch = (a.processNumber || '').replace(/\D/g, '')
        || combined.match(/\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/)?.[1]?.replace(/\D/g, '');
      if (processMatch && processMatch.length >= 10) {
        a.canonicalPropertyId = `JUD_${processMatch}_01`;
        canonicalKeysAssigned++;
      }
    }
  }
}

fs.writeFileSync('data_store.json', JSON.stringify(data, null, 2), 'utf8');

const rjAuctions = auctions.filter(a => (a.state || '').toUpperCase() === 'RJ');
const rjCasas = rjAuctions.filter(a => a.propertyType === 'Casa');

console.log(`[Migração Concluída]`);
console.log(`Reclassificados para CASA: ${reclassifiedCasas}`);
console.log(`Chaves Canônicas atribuídas: ${canonicalKeysAssigned}`);
console.log(`Total Geral no Banco: ${auctions.length}`);
console.log(`Total RJ: ${rjAuctions.length}`);
console.log(`Total Casas em RJ: ${rjCasas.length}`);
