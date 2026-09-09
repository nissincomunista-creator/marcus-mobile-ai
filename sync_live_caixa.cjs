const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const puppeteer = require('puppeteer');
const csvParser = require('csv-parser');
const iconv = require('iconv-lite');
const { Readable } = require('stream');

const STORE_PATH = path.resolve('c:/Users/Marcus/OneDrive/Desktop/app garimpo leilao/marcus-mobile-ai/data_store.json');
const STORE_GZ_PATH = path.resolve('c:/Users/Marcus/OneDrive/Desktop/app garimpo leilao/marcus-mobile-ai/data_store.json.gz');

function cleanCaixaCity(rawCity, uf) {
  if (!rawCity) return uf === 'RJ' ? 'Rio de Janeiro' : 'São Paulo';
  let cleaned = rawCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.includes('RIO DE JANEIRO')) return 'Rio de Janeiro';
  if (cleaned.includes('NITEROI')) return 'Niterói';
  if (cleaned.includes('SAO GONCALO')) return 'São Gonçalo';
  if (cleaned.includes('DUQUE DE CAXIAS')) return 'Duque de Caxias';
  if (cleaned.includes('NOVA IGUACU')) return 'Nova Iguaçu';
  if (cleaned.includes('BELFORD ROXO')) return 'Belford Roxo';
  if (cleaned.includes('SAO JOAO DE MERITI')) return 'São João de Meriti';
  if (cleaned.includes('PETROPOLIS')) return 'Petrópolis';
  if (cleaned.includes('TERESOPOLIS')) return 'Teresópolis';
  if (cleaned.includes('CABO FRIO')) return 'Cabo Frio';
  if (cleaned.includes('CAMPOS DOS GOYTACAZES')) return 'Campos dos Goytacazes';
  if (cleaned.includes('MACAE')) return 'Macaé';
  if (cleaned.includes('MARICA')) return 'Maricá';
  if (cleaned.includes('ITABORAI')) return 'Itaboraí';
  if (cleaned.includes('ANGRA DOS REIS')) return 'Angra dos Reis';
  if (cleaned.includes('VOLTA REDONDA')) return 'Volta Redonda';
  if (cleaned.includes('BARRA MANSA')) return 'Barra Mansa';
  if (cleaned.includes('RESENDE')) return 'Resende';
  if (cleaned.includes('MESQUITA')) return 'Mesquita';
  if (cleaned.includes('NILOPOLIS')) return 'Nilópolis';
  if (cleaned.includes('SAQUAREMA')) return 'Saquarema';
  if (cleaned.includes('ARARUAMA')) return 'Araruama';
  if (cleaned.includes('SANTOS DUMONT')) return 'Santos Dumont';
  if (cleaned.includes('JUIZ DE FORA')) return 'Juiz de Fora';
  if (cleaned.includes('BELO HORIZONTE')) return 'Belo Horizonte';
  if (cleaned.includes('UBERLANDIA')) return 'Uberlândia';
  if (cleaned.includes('CONTAGEM')) return 'Contagem';
  if (cleaned.includes('BETIM')) return 'Betim';
  if (cleaned.includes('SAO PAULO')) return 'São Paulo';
  if (cleaned.includes('CAMPINAS')) return 'Campinas';
  if (cleaned.includes('GUARULHOS')) return 'Guarulhos';
  if (cleaned.includes('SAO BERNARDO')) return 'São Bernardo do Campo';
  if (cleaned.includes('SANTO ANDRE')) return 'Santo André';
  if (cleaned.includes('OSASCO')) return 'Osasco';
  if (cleaned.includes('SANTOS')) return 'Santos';
  if (cleaned.includes('SOROCABA')) return 'Sorocaba';
  if (cleaned.includes('RIBEIRAO PRETO')) return 'Ribeirão Preto';

  return rawCity.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function parseCaixaSizeSqm(descricao, propertyType) {
  if (!descricao) return 60;
  const privMatch = descricao.match(/([\d\.,]+)\s*(?:m2|m²)?\s*de\s*área\s*privativa/i);
  if (privMatch) {
    const val = parseFloat(privMatch[1].replace(/\./g, '').replace(',', '.'));
    if (val && val > 5 && val < 50000) return Math.round(val);
  }
  const totMatch = descricao.match(/([\d\.,]+)\s*(?:m2|m²)?\s*de\s*área\s*total/i);
  if (totMatch) {
    const val = parseFloat(totMatch[1].replace(/\./g, '').replace(',', '.'));
    if (val && val > 5 && val < 50000) return Math.round(val);
  }
  const terrMatch = descricao.match(/([\d\.,]+)\s*(?:m2|m²)?\s*de\s*área\s*do\s*terreno/i);
  if (terrMatch) {
    const val = parseFloat(terrMatch[1].replace(/\./g, '').replace(',', '.'));
    if (val && val > 5 && val < 50000) return Math.round(val);
  }
  const genMatch = descricao.match(/([\d\.,]+)\s*(?:m2|m²)/i);
  if (genMatch) {
    const val = parseFloat(genMatch[1].replace(/\./g, '').replace(',', '.'));
    if (val && val > 5 && val < 50000) return Math.round(val);
  }
  if (propertyType === 'Casa') return 120;
  if (propertyType === 'Terreno') return 300;
  if (propertyType === 'Comercial') return 80;
  return 60;
}

function cleanNeighborhood(n) {
  if (!n) return '';
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function normalizeString(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function normalizeCaixaSaleMode(rawMode, fallbackText = '') {
  const source = `${rawMode || ''} ${fallbackText || ''}`.trim();
  const normalized = normalizeString(source);
  if (!normalized) return undefined;

  if (normalized.includes('venda direta')) {
    return normalized.includes('online') ? 'Venda Direta Online' : 'Venda Direta';
  }
  if (normalized.includes('venda online')) return 'Venda Online';
  if (normalized.includes('licitacao aberta')) return 'Licitação Aberta';
  if (normalized.includes('leilao sfi') || normalized.includes('edital unico')) {
    return 'Leilão SFI - Edital Único';
  }
  if (normalized.includes('leilao')) return 'Leilão Online';

  return rawMode && rawMode.trim().replace(/\s+/g, ' ');
}

function getCaixaCatalogField(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function buildItbiIndexes(txs) {
  const avgSqmMap = new Map();
  const streetAvgSqmMap = new Map();
  const cityAvgSqmMap = new Map();
  const stateAvgSqmMap = new Map();
  const volMap = new Map();
  const neighCityMap = new Map();

  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    const state = (t.state || 'SP').toLowerCase();
    const neigh = cleanNeighborhood(t.neighborhood);
    const propType = t.propertyType;
    const normCity = normalizeString(t.city || '');

    // 1. Neighborhood + PropType
    const avgKey = `${state}|${neigh}|${propType}`;
    let avgEntry = avgSqmMap.get(avgKey);
    if (!avgEntry) {
      avgEntry = { sumSqm: 0, count: 0 };
      avgSqmMap.set(avgKey, avgEntry);
    }
    avgEntry.sumSqm += t.unitValueSqm;
    avgEntry.count += 1;

    // 2. Neighborhood overall
    const neighAnyKey = `${state}|${neigh}|any`;
    let neighAnyEntry = avgSqmMap.get(neighAnyKey);
    if (!neighAnyEntry) {
      neighAnyEntry = { sumSqm: 0, count: 0 };
      avgSqmMap.set(neighAnyKey, neighAnyEntry);
    }
    neighAnyEntry.sumSqm += t.unitValueSqm;
    neighAnyEntry.count += 1;

    // 3. City + PropType
    if (normCity) {
      const cityKey = `${state}|${normCity}|${propType}`;
      let cityEntry = cityAvgSqmMap.get(cityKey);
      if (!cityEntry) {
        cityEntry = { sumSqm: 0, count: 0 };
        cityAvgSqmMap.set(cityKey, cityEntry);
      }
      cityEntry.sumSqm += t.unitValueSqm;
      cityEntry.count += 1;

      const cityAnyKey = `${state}|${normCity}|any`;
      let cityAnyEntry = cityAvgSqmMap.get(cityAnyKey);
      if (!cityAnyEntry) {
        cityAnyEntry = { sumSqm: 0, count: 0 };
        cityAvgSqmMap.set(cityAnyKey, cityAnyEntry);
      }
      cityAnyEntry.sumSqm += t.unitValueSqm;
      cityAnyEntry.count += 1;
    }

    // 4. State + PropType
    const stKey = `${state}|${propType}`;
    let stEntry = stateAvgSqmMap.get(stKey);
    if (!stEntry) {
      stEntry = { sumSqm: 0, count: 0 };
      stateAvgSqmMap.set(stKey, stEntry);
    }
    stEntry.sumSqm += t.unitValueSqm;
    stEntry.count += 1;

    // 5. Volume
    volMap.set(`${state}|${neigh}`, (volMap.get(`${state}|${neigh}`) || 0) + 1);
    if (t.city && !neighCityMap.has(`${state}|${neigh}`)) {
      neighCityMap.set(`${state}|${neigh}`, t.city);
    }
  }

  return { avgSqmMap, streetAvgSqmMap, cityAvgSqmMap, stateAvgSqmMap, volMap, neighCityMap };
}

function recalculateAuctionWithIndex(auc, avgSqmMap, streetAvgSqmMap, volMap, neighCityMap, cityAvgSqmMap, stateAvgSqmMap) {
  const uf = (auc.state || 'SP').toLowerCase();
  const neighNorm = cleanNeighborhood(auc.neighborhood);
  const cityNorm = normalizeString(auc.city || '');
  const propType = auc.propertyType;

  let chosenAvg = 0;
  let source = 'state';

  // 1. Neighborhood + Type
  const entry = avgSqmMap.get(`${uf}|${neighNorm}|${propType}`);
  if (entry && entry.count >= 2) {
    chosenAvg = entry.sumSqm / entry.count;
    source = 'neighborhood';
  }

  // 2. Neighborhood overall
  if (!chosenAvg) {
    const anyEntry = avgSqmMap.get(`${uf}|${neighNorm}|any`);
    if (anyEntry && anyEntry.count >= 2) {
      chosenAvg = anyEntry.sumSqm / anyEntry.count;
      source = 'neighborhood';
    }
  }

  // 3. City + Type
  if (!chosenAvg && cityNorm) {
    const cEntry = cityAvgSqmMap.get(`${uf}|${cityNorm}|${propType}`);
    if (cEntry && cEntry.count >= 2) {
      chosenAvg = cEntry.sumSqm / cEntry.count;
      source = 'city';
    }
  }

  // 4. City overall
  if (!chosenAvg && cityNorm) {
    const cAnyEntry = cityAvgSqmMap.get(`${uf}|${cityNorm}|any`);
    if (cAnyEntry && cAnyEntry.count >= 2) {
      chosenAvg = cAnyEntry.sumSqm / cAnyEntry.count;
      source = 'city';
    }
  }

  // 5. State fallback
  if (!chosenAvg) {
    const sEntry = stateAvgSqmMap.get(`${uf}|${propType}`);
    if (sEntry && sEntry.count > 0) {
      chosenAvg = sEntry.sumSqm / sEntry.count;
    } else {
      chosenAvg = uf === 'rj' ? 6200 : (uf === 'mg' ? 4800 : 7000);
    }
    source = 'state';
  }

  auc.estimatedValue = Math.round(auc.sizeSqm * chosenAvg);

  // Balanced Liquidity Score (3-10)
  let baseScore = 5;
  const discountRatio = auc.estimatedValue > 0 ? (auc.estimatedValue - auc.auctionPrice) / auc.estimatedValue : 0;
  if (discountRatio >= 0.50) baseScore += 2;
  else if (discountRatio >= 0.35) baseScore += 1;
  else if (discountRatio < 0.15) baseScore -= 1;

  if (auc.propertyType === 'Apartamento') baseScore += 1;
  if (auc.allowsFinancing) baseScore += 1;
  if (!auc.occupied) baseScore += 1;

  const volume = volMap.get(`${uf}|${neighNorm}`) || 0;
  if (volume >= 20) baseScore += 1;

  auc.liquidityScore = Math.max(3, Math.min(10, baseScore));

  const totalCost = auc.auctionPrice + auc.estimatedRepair + auc.pendingDebts + auc.otherCosts;
  const netProfit = auc.estimatedValue - totalCost;
  auc.roi = totalCost > 0 ? parseFloat(((netProfit / totalCost) * 100).toFixed(1)) : 0;

  return auc;
}

async function run() {
  console.log('Loading existing store data...');
  const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  console.log(`Current auctions in store: ${store.auctions.length}`);

  const itbiIndexes = buildItbiIndexes(store.itbiTransactions || []);
  console.log('ITBI indexes built.');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  console.log('Navigating to Caixa download page...');
  await page.goto('https://venda-imoveis.caixa.gov.br/sistema/download-lista.asp', {
    waitUntil: 'networkidle2',
    timeout: 35000
  });

  const targetStates = ['RJ', 'SP', 'MG'];
  const todayStr = new Date().toISOString().split('T')[0];

  for (const uf of targetStates) {
    try {
      console.log(`\n--- Fetching Caixa CSV for ${uf} ---`);
      const base64 = await page.evaluate(async (ufParam) => {
        const res = await fetch('/listaweb/Lista_imoveis_' + ufParam + '.csv?' + Date.now());
        const buffer = await res.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      }, uf);

      if (!base64) {
        console.warn(`No data returned for ${uf}`);
        continue;
      }

      const buffer = Buffer.from(base64, 'base64');
      const content = iconv.decode(buffer, 'latin1');
      const lines = content.split('\n');

      let headerIdx = -1;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        if (lines[i].includes('UF') && (lines[i].includes('Cidade') || lines[i].includes('Bairro'))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        console.warn(`Header not found for ${uf}`);
        continue;
      }

      const cleanContent = lines.slice(headerIdx).join('\n');
      const stream = Readable.from(Buffer.from(cleanContent, 'utf-8'));
      const rawResults = [];
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser({ separator: ';' }))
          .on('data', d => rawResults.push(d))
          .on('end', resolve)
          .on('error', reject);
      });

      console.log(`Raw items parsed for ${uf}: ${rawResults.length}`);

      const stateAuctions = [];
      for (const rawRow of rawResults) {
        const row = {};
        for (const k of Object.keys(rawRow)) {
          const normKey = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          row[normKey] = rawRow[k];
        }
        if (!row.ndoimovel) continue;

        const rawBairro = (row.bairro || '').trim();
        const rawCidade = (row.cidade || '').trim();
        const ufCaixa = (row.uf || uf).toUpperCase().trim();
        const enderecoCaixa = (row.endereco || '').trim();
        const precoStr = (row.preco || '0').replace(/\./g, '').replace(',', '.');
        const avaliacaoStr = (row.valordeavaliacao || '0').replace(/\./g, '').replace(',', '.');
        const descricaoCaixa = (row.descricao || '').trim();
        const linkCaixa = getCaixaCatalogField(row, 'linkdeacesso', 'link') || 'https://venda-imoveis.caixa.gov.br/';
        const modalidadeRaw = getCaixaCatalogField(row, 'modalidadedevenda', 'modalidadedavenda', 'modalidade');
        const saleMode = normalizeCaixaSaleMode(modalidadeRaw, descricaoCaixa);

        const cleanCidade = cleanCaixaCity(rawCidade, ufCaixa);
        const cleanBairro = rawBairro ? rawBairro.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Não informado';

        const auctionPrice = Math.round(Number(precoStr) || 0);
        if (auctionPrice === 0) continue;

        let propertyType = 'Casa';
        const descLower = descricaoCaixa.toLowerCase();
        if (descLower.startsWith('apartamento') || descLower.includes('apartamento')) propertyType = 'Apartamento';
        else if (descLower.startsWith('casa') || descLower.includes('casa')) propertyType = 'Casa';
        else if (descLower.startsWith('terreno') || descLower.startsWith('lote')) propertyType = 'Terreno';
        else if (descLower.startsWith('comercial') || descLower.startsWith('galp') || descLower.startsWith('sala') || descLower.includes('comercial')) propertyType = 'Comercial';
        else if ((descLower.includes('terreno') || descLower.includes('lote')) && !descLower.includes('casa')) propertyType = 'Terreno';

        const sizeSqm = parseCaixaSizeSqm(descricaoCaixa, propertyType);
        const title = `${propertyType} Retomado Caixa - ${cleanBairro.toUpperCase()}`;
        const allowsFinancing = (row.financiamento || '').toLowerCase() === 'sim';

        let parsedBedrooms = undefined;
        const qtoMatch = descricaoCaixa.match(/(\d+)\s*qto/i);
        if (qtoMatch) {
          parsedBedrooms = parseInt(qtoMatch[1]);
        } else {
          const quartoMatch = descricaoCaixa.match(/(\d+)\s*quarto/i);
          if (quartoMatch) parsedBedrooms = parseInt(quartoMatch[1]);
        }

        let parsedParkingSpaces = undefined;
        const vagaMatch = descricaoCaixa.match(/(\d+)\s*vaga/i);
        if (vagaMatch) {
          parsedParkingSpaces = parseInt(vagaMatch[1]);
        }

        const newAuc = {
          id: `auc-caixa-${row.ndoimovel ? row.ndoimovel.replace(/\s+/g, '') : Date.now()}`,
          title: title.substring(0, 100),
          address: enderecoCaixa,
          neighborhood: cleanBairro,
          city: cleanCidade,
          propertyType,
          sizeSqm,
          auctionPrice,
          estimatedRepair: Math.round(5000 + Math.random() * 20000),
          pendingDebts: 0,
          otherCosts: 0,
          estimatedValue: 0,
          auctionDate: todayStr,
          auctionLink: linkCaixa,
          description: [
            'Imóvel Retomado Caixa Econômica Federal.',
            saleMode ? `Modalidade: ${saleMode}.` : '',
            `Avaliação original Caixa: R$ ${avaliacaoStr}.`,
            `Descrição: ${descricaoCaixa}`
          ].filter(Boolean).join(' '),
          status: 'Pendente',
          occupied: true,
          state: ufCaixa,
          allowsFinancing,
          allowsInstallments: false,
          userId: store.users && store.users[0] ? store.users[0].id : 'user-admin',
          origin: 'caixa',
          bedrooms: parsedBedrooms,
          parkingSpaces: parsedParkingSpaces,
          saleMode
        };

        const recalculated = recalculateAuctionWithIndex(
          newAuc,
          itbiIndexes.avgSqmMap,
          itbiIndexes.streetAvgSqmMap,
          itbiIndexes.volMap,
          itbiIndexes.neighCityMap,
          itbiIndexes.cityAvgSqmMap,
          itbiIndexes.stateAvgSqmMap
        );
        stateAuctions.push(recalculated);
      }

      console.log(`Processed ${stateAuctions.length} active auctions for ${uf}`);
      if (stateAuctions.length > 0) {
        // Remove existing caixa auctions for this state and prepend fresh ones
        store.auctions = store.auctions.filter(a => !(a.origin === 'caixa' && (a.state || 'SP').toUpperCase() === uf.toUpperCase()));
        store.auctions.unshift(...stateAuctions);
        console.log(`Replaced Caixa catalog for ${uf}. Total auctions in store now: ${store.auctions.length}`);
      }
    } catch (e) {
      console.error(`Error processing ${uf}:`, e);
    }
  }

  await browser.close();

  console.log('\n--- Verification: Niterói Properties ---');
  const niteroi = store.auctions.filter(a => a.city === 'Niterói' && a.origin === 'caixa');
  console.log(`Niterói total Caixa properties: ${niteroi.length}`);
  const niteroiTypes = {};
  niteroi.forEach(a => {
    niteroiTypes[a.propertyType] = (niteroiTypes[a.propertyType] || 0) + 1;
  });
  console.log('Niterói breakdown:', niteroiTypes);

  console.log('\nSaving data_store.json...');
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  console.log('Compressing data_store.json.gz...');
  const jsonContent = fs.readFileSync(STORE_PATH);
  const compressed = zlib.gzipSync(jsonContent);
  fs.writeFileSync(STORE_GZ_PATH, compressed);
  console.log(`Done! Compressed size: ${(compressed.length / 1024 / 1024).toFixed(2)} MB`);
}

run().catch(console.error);
