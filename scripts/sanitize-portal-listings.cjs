const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const STORE_PATH = path.join(__dirname, '..', 'data_store.json');
const GZ_PATH = path.join(__dirname, '..', 'data_store.json.gz');

console.log('[Sanitizer] Lendo data_store.json...');
const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));

const itbiList = store.itbiTransactions || [];

// Calcula media m2 por bairro e cidade a partir das transacoes oficiais do ITBI
const itbiByNeighCity = {};
for (const t of itbiList) {
  if (!t.neighborhood || !t.city || !t.sqmPrice || t.sqmPrice <= 0) continue;
  const key = `${t.city.toLowerCase().trim()}|${t.neighborhood.toLowerCase().trim()}`;
  if (!itbiByNeighCity[key]) itbiByNeighCity[key] = { total: 0, count: 0 };
  itbiByNeighCity[key].total += t.sqmPrice;
  itbiByNeighCity[key].count += 1;
}

function getItbiM2(city, neighborhood) {
  const key = `${(city || '').toLowerCase().trim()}|${(neighborhood || '').toLowerCase().trim()}`;
  if (itbiByNeighCity[key] && itbiByNeighCity[key].count >= 3) {
    return Math.round(itbiByNeighCity[key].total / itbiByNeighCity[key].count);
  }
  // Médias de mercado NBR para bairros conhecidos
  const normNeigh = (neighborhood || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const defaults = {
    'taquara': 3850,
    'praca seca': 2450,
    'freguesia': 5200,
    'freguesia jacarepagua': 5200,
    'jacarepagua': 4500,
    'anil': 4200,
    'pechincha': 4100,
    'tanque': 3100,
    'curicica': 3300,
    'barra da tijuca': 12800,
    'recreio dos bandeirantes': 7900,
    'copacabana': 12500,
    'ipanema': 21000,
    'leblon': 25000,
    'botafogo': 11800,
    'flamengo': 10500,
    'laranjeiras': 9200,
    'catete': 8600,
    'gloria': 7800,
    'tijuca': 6800,
    'vila isabel': 5900,
    'maracana': 6700,
    'grajau': 5400,
    'andaraf': 4800,
    'meier': 4200,
    'engenho de dentro': 3600,
    'engenho novo': 3400,
    'madureira': 3200,
    'cascadura': 2800,
    'bangu': 2400,
    'realengo': 2300,
    'padre miguel': 2250,
    'santissimo': 2100,
    'senador camara': 1800,
    'santa cruz': 1900,
    'campo grande': 2900,
    'guaratiba': 2400,
    'vargem pequena': 4500,
    'vargem grande': 4200,
    'sao cristovao': 4800,
    'jardim botanico': 16500,
    'praca da bandeira': 4900,
    'pavuna': 2000,
    'centro': 5500,
    // Niteroi
    'icarai': 8900,
    'santa rosa': 6200,
    'inga': 7500,
    'sao francisco': 8200,
    'charitas': 8500,
    'piratininga': 6800,
    // Juiz de Fora
    'sao mateus': 4600,
    'alto dos passos': 5900,
    'cascatinha': 5400,
    'granbery': 4800,
    'bom pastor': 5300,
    'santa helena': 5100,
    'sao pedro': 3900,
    'paineiras': 4200,
    'morro da gloria': 4400
  };
  return defaults[normNeigh] || 4500;
}

const CANONICAL_NEIGH_SLUGS = [
  // Rio de Janeiro
  { slug: 'recreio-dos-bandeirantes', name: 'Recreio dos Bandeirantes' },
  { slug: 'recreio', name: 'Recreio dos Bandeirantes' },
  { slug: 'barra-da-tijuca', name: 'Barra da Tijuca' },
  { slug: 'freguesia-jacarepagua', name: 'Freguesia (Jacarepaguá)' },
  { slug: 'freguesia', name: 'Freguesia (Jacarepaguá)' },
  { slug: 'praca-seca', name: 'Praça Seca' },
  { slug: 'taquara', name: 'Taquara' },
  { slug: 'curicica', name: 'Curicica' },
  { slug: 'jacarepagua', name: 'Jacarepaguá' },
  { slug: 'anil', name: 'Anil' },
  { slug: 'pechincha', name: 'Pechincha' },
  { slug: 'tanque', name: 'Tanque' },
  { slug: 'vargem-pequena', name: 'Vargem Pequena' },
  { slug: 'vargem-grande', name: 'Vargem Grande' },
  { slug: 'copacabana', name: 'Copacabana' },
  { slug: 'ipanema', name: 'Ipanema' },
  { slug: 'leblon', name: 'Leblon' },
  { slug: 'botafogo', name: 'Botafogo' },
  { slug: 'flamengo', name: 'Flamengo' },
  { slug: 'laranjeiras', name: 'Laranjeiras' },
  { slug: 'catete', name: 'Catete' },
  { slug: 'gloria', name: 'Glória' },
  { slug: 'tijuca', name: 'Tijuca' },
  { slug: 'vila-isabel', name: 'Vila Isabel' },
  { slug: 'maracana', name: 'Maracanã' },
  { slug: 'grajau', name: 'Grajaú' },
  { slug: 'andaraf', name: 'Andaraí' },
  { slug: 'andarai', name: 'Andaraí' },
  { slug: 'praca-da-bandeira', name: 'Praça da Bandeira' },
  { slug: 'jardim-botanico', name: 'Jardim Botânico' },
  { slug: 'meier', name: 'Méier' },
  { slug: 'engenho-de-dentro', name: 'Engenho de Dentro' },
  { slug: 'engenho-novo', name: 'Engenho Novo' },
  { slug: 'madureira', name: 'Madureira' },
  { slug: 'cascadura', name: 'Cascadura' },
  { slug: 'bangu', name: 'Bangu' },
  { slug: 'realengo', name: 'Realengo' },
  { slug: 'padre-miguel', name: 'Padre Miguel' },
  { slug: 'santissimo', name: 'Santíssimo' },
  { slug: 'senador-camara', name: 'Senador Camará' },
  { slug: 'santa-cruz', name: 'Santa Cruz' },
  { slug: 'campo-grande', name: 'Campo Grande' },
  { slug: 'guaratiba', name: 'Guaratiba' },
  { slug: 'sao-cristovao', name: 'São Cristóvão' },
  { slug: 'pavuna', name: 'Pavuna' },
  { slug: 'centro', name: 'Centro' },
  // Niterói
  { slug: 'icarai', name: 'Icaraí' },
  { slug: 'santa-rosa', name: 'Santa Rosa' },
  { slug: 'inga', name: 'Ingá' },
  { slug: 'sao-francisco', name: 'São Francisco' },
  { slug: 'charitas', name: 'Charitas' },
  { slug: 'piratininga', name: 'Piratininga' },
  { slug: 'camboinhas', name: 'Camboinhas' },
  { slug: 'itaipu', name: 'Itaipu' },
  // Juiz de Fora
  { slug: 'alto-dos-passos', name: 'Alto dos Passos' },
  { slug: 'sao-mateus', name: 'São Mateus' },
  { slug: 'cascatinha', name: 'Cascatinha' },
  { slug: 'granbery', name: 'Granbery' },
  { slug: 'bom-pastor', name: 'Bom Pastor' },
  { slug: 'santa-helena', name: 'Santa Helena' },
  { slug: 'sao-pedro', name: 'São Pedro' },
  { slug: 'paineiras', name: 'Paineiras' },
  { slug: 'morro-da-gloria', name: 'Morro da Glória' },
  { slug: 'manoel-honorio', name: 'Manoel Honório' }
];

function extractCanonicalNeighborhoodFromUrl(url) {
  if (!url) return null;
  const normUrl = url.toLowerCase().replace(/[^a-z0-9]/g, '-');
  for (const item of CANONICAL_NEIGH_SLUGS) {
    if (
      normUrl.includes('-' + item.slug + '-') ||
      normUrl.includes('/' + item.slug + '-') ||
      normUrl.includes('-' + item.slug + '/') ||
      normUrl.includes('/' + item.slug + '/') ||
      normUrl.endsWith('-' + item.slug)
    ) {
      return item.name;
    }
  }
  return null;
}

let removedCount = 0;
let neighborhoodFixedCount = 0;
let addressFixedCount = 0;
let recalculatedCount = 0;

const initialTotal = store.auctions.length;
const sanitizedAuctions = [];

for (const a of store.auctions) {
  // 1. Remove anúncios de imóveis vendidos, alugados ou encerrados
  const titleLower = (a.title || '').toLowerCase();
  const descLower = (a.description || '').toLowerCase();
  const statusLower = (a.status || '').toLowerCase();
  const isSoldOrEnded = 
    /\b(vendido|alugado|arrematado|desativado|indispon[íi]vel)\b/i.test(titleLower) ||
    /\b(imóvel vendido|já foi vendido|anúncio pausado)\b/i.test(descLower) ||
    /\b(vendid|alugad|encerrad|cancelad|arrematad)\b/i.test(statusLower);

  if (a.origin === 'portal' && isSoldOrEnded) {
    removedCount++;
    continue;
  }

  if (a.origin === 'portal') {
    // 2. Extrai bairro canônico da URL
    const canonicalNeigh = extractCanonicalNeighborhoodFromUrl(a.auctionLink);
    let currentNeigh = a.neighborhood;

    if (canonicalNeigh && canonicalNeigh.toLowerCase() !== (currentNeigh || '').toLowerCase()) {
      console.log(`[Bairro Corrigido] ${a.id}: De "${currentNeigh}" para "${canonicalNeigh}" (URL: ${a.auctionLink})`);
      a.neighborhood = canonicalNeigh;
      currentNeigh = canonicalNeigh;
      neighborhoodFixedCount++;

      // Atualiza título se continha o bairro antigo
      if (a.title && a.title.includes(' em ')) {
        const parts = a.title.split(' em ');
        a.title = `${parts[0]} em ${canonicalNeigh}`;
      }
    }

    // 3. Saneamento do endereço para evitar duplicações
    let rawAddr = (a.address || '').trim();
    const oldAddr = rawAddr;

    // Remove parênteses repetidos no final da string se já salvos
    rawAddr = rawAddr.replace(/\s*\([^)]+\)\s*$/, '').trim();

    // Divide partes do endereço
    const addrParts = rawAddr.split(',').map(p => p.trim());
    let street = addrParts[0] || '';

    // Se o street extraído for o próprio bairro ou outro bairro conhecido
    const streetNorm = street.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const neighNorm = (currentNeigh || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    if (streetNorm === neighNorm || streetNorm === 'praca seca' || streetNorm === 'taquara' || streetNorm === 'barra da tijuca') {
      street = '';
    } else {
      // Remove se a rua termina com o bairro (ex: "Rua Barão de São Marcelino, Alto dos Passos")
      const pat = new RegExp(`[,\\s-–—]+(?:bairro\\s+)?${(currentNeigh || '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*$`, 'i');
      street = street.replace(pat, '').trim();
      // Remove barra da tijuca se anexada indevidamente
      street = street.replace(/[,\\s-–—]+Barra da Tijuca\\s*$/i, '').trim();
    }

    if (!a.city || a.city === 'undefined' || a.city === 'null') {
      a.city = (a.state === 'MG' ? 'Juiz de Fora' : 'Rio de Janeiro');
    }
    if (!a.state || a.state === 'undefined' || a.state === 'null') {
      a.state = (a.city === 'Juiz de Fora' ? 'MG' : 'RJ');
    }

    // Se a rua for apenas "Rua", "Avenida", "Av", "Av.", "R.", etc.
    if (/^(?:rua|avenida|av|av\.|travessa|alameda|estrada|praca|praça|rodovia|alam|r|r\.)\s*$/i.test(street) || street.length < 3) {
      street = '';
    }

    const state = a.state;
    const newAddr = street
      ? `${street}, ${currentNeigh}, ${a.city} - ${state}`
      : `${currentNeigh}, ${a.city} - ${state}`;

    if (newAddr !== oldAddr || oldAddr.includes('undefined')) {
      a.address = newAddr;
      if (street) a.street = street; else delete a.street;
      addressFixedCount++;
    }

    // 4. Distinção estrita entre VENDA e LOCAÇÃO (Aluguel)
    const isRental = 
      a.transactionType === 'aluguel' ||
      (a.id || '').startsWith('rent-') ||
      (a.title || '').toLowerCase().includes('para alugar') ||
      (a.description || '').toLowerCase().includes('para locação') ||
      (a.auctionLink || '').includes('/alugar') ||
      (a.auctionLink || '').includes('/aluguel/') ||
      (a.auctionLink || '').includes('aluguel-') ||
      ((a.auctionPrice || a.precoAnunciado || 0) < 40000 && !a.title?.toLowerCase().includes('vaga') && !a.title?.toLowerCase().includes('box'));

    const size = a.sizeSqm || 60;
    const realM2 = getItbiM2(a.city, currentNeigh);
    const expectedVal = Math.round(size * realM2);

    a.m2_referencia_bairro = realM2;
    a.m2ReferenciaBairro = realM2;
    a.estimatedValue = expectedVal;
    a.valorMercadoEstimado = expectedVal;

    if (isRental) {
      a.transactionType = 'aluguel';
      a.monthlyRent = a.auctionPrice || a.precoAnunciado || 0;
      a.aluguelMensal = a.monthlyRent;
      a.calculatedProfit = 0;
      a.calculatedRoi = 0;
      a.descontoMercadoPct = 0;
      a.oportunidadeAbaixoMercado = false;
    } else {
      a.transactionType = 'venda';
      a.vendaBaixaPrice = Math.round(expectedVal * 0.90);
      a.vendaMediaPrice = a.vendaBaixaPrice;

      const itbi = Math.round((a.auctionPrice || a.precoAnunciado || 0) * 0.03);
      const registry = Math.round((a.auctionPrice || a.precoAnunciado || 0) * 0.02);
      const holding = Math.round(expectedVal * 0.015);
      const totalCost = (a.auctionPrice || a.precoAnunciado || 0) + itbi + registry + (a.estimatedRepair || 0) + (a.pendingDebts || 0) + holding;
      const netProfit = Math.max(0, a.vendaBaixaPrice - totalCost);

      a.calculatedProfit = netProfit;
      a.calculatedRoi = totalCost > 0 ? Number(((netProfit / totalCost) * 100).toFixed(2)) : 0;
      const diff = expectedVal - (a.auctionPrice || a.precoAnunciado || 0);
      a.descontoMercadoPct = (expectedVal > 0 && diff > 0) ? Math.round((diff / expectedVal) * 100) : 0;
      a.oportunidadeAbaixoMercado = netProfit > 0 && a.calculatedRoi >= 15;
    }
    recalculatedCount++;
  }

  sanitizedAuctions.push(a);
}

store.auctions = sanitizedAuctions;

console.log(`[Sanitizer] Total inicial: ${initialTotal}`);
console.log(`[Sanitizer] Anúncios vendidos/indisponíveis removidos: ${removedCount}`);
console.log(`[Sanitizer] Bairros corrigidos pela URL canônica: ${neighborhoodFixedCount}`);
console.log(`[Sanitizer] Endereços limpos (sem duplicidade): ${addressFixedCount}`);
console.log(`[Sanitizer] Imóveis de portais recalculados com m² real: ${recalculatedCount}`);
console.log(`[Sanitizer] Total final de imóveis: ${store.auctions.length}`);

fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
console.log('[Sanitizer] data_store.json salvo com sucesso.');

console.log('[Sanitizer] Compactando para data_store.json.gz...');
const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(store)));
fs.writeFileSync(GZ_PATH, compressed);
console.log(`[Sanitizer] data_store.json.gz atualizado (${(compressed.length / (1024*1024)).toFixed(2)} MB).`);
