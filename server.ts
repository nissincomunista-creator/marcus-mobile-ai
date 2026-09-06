import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

app.use(express.json({ limit: '10mb' }));

// Robust data_store.json path resolution
let DATA_STORE_PATH = path.join(__dirname, 'data_store.json');
if (!fs.existsSync(DATA_STORE_PATH)) {
  DATA_STORE_PATH = path.join(__dirname, '..', 'data_store.json');
}

let storeData: any = { auctions: [], itbiTransactions: [] };

try {
  if (fs.existsSync(DATA_STORE_PATH)) {
    const raw = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
    storeData = JSON.parse(raw);
    console.log(`[Mobile Server] Base carregada: ${storeData.auctions?.length || 0} leilões e ${storeData.itbiTransactions?.length || 0} ITBI.`);
  }
} catch (e) {
  console.error('[Mobile Server] Erro ao carregar data_store.json:', e);
}

// Host & Network Info
app.get('/api/network/host-info', (req, res) => {
  const nets = os.networkInterfaces();
  let localIp = 'localhost';
  const allIps: string[] = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        allIps.push(net.address);
        if (localIp === 'localhost') {
          localIp = net.address;
        }
      }
    }
  }

  res.json({
    localIp,
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrl: `http://${localIp}:${PORT}`,
    allIps
  });
});

// REST Endpoints
app.get('/api/auctions', (req, res) => {
  res.json(storeData.auctions || []);
});

app.get('/api/itbi', (req, res) => {
  res.json(storeData.itbiTransactions || []);
});

// Helper for ITBI lookup in memory
function lookupItbiAverage(city: string, neighborhood: string): number {
  if (!storeData.itbiTransactions || storeData.itbiTransactions.length === 0) return 5000;
  const c = (city || '').toLowerCase();
  const n = (neighborhood || '').toLowerCase();

  const matches = storeData.itbiTransactions.filter(
    (t: any) => t.city.toLowerCase() === c && (t.neighborhood.toLowerCase().includes(n) || n.includes(t.neighborhood.toLowerCase()))
  );

  if (matches.length > 0) {
    const sum = matches.reduce((acc: number, m: any) => acc + (m.unitValueSqm || 0), 0);
    return Math.round(sum / matches.length);
  }

  const cityMatches = storeData.itbiTransactions.filter((t: any) => t.city.toLowerCase() === c);
  if (cityMatches.length > 0) {
    const sum = cityMatches.reduce((acc: number, m: any) => acc + (m.unitValueSqm || 0), 0);
    return Math.round(sum / cityMatches.length);
  }

  return c.includes('rio') ? 6500 : (c.includes('niteroi') || c.includes('niterói') ? 7200 : 3800);
}

// Local Natural Language Processor for Instant Voice Parsing (Zero Latency / Offline Fallback)
function localNlpProcess(message: string, currentCalculator: any) {
  const text = message.toLowerCase();

  // 1. Detect City
  let city = currentCalculator?.city || 'Rio de Janeiro';
  let state = currentCalculator?.state || 'RJ';
  if (text.includes('niterói') || text.includes('niteroi')) {
    city = 'Niterói'; state = 'RJ';
  } else if (text.includes('juiz de fora') || text.includes('jf')) {
    city = 'Juiz de Fora'; state = 'MG';
  } else if (text.includes('santos dumont')) {
    city = 'Santos Dumont'; state = 'MG';
  } else if (text.includes('rio de janeiro') || text.includes('capital') || text.includes(' rj')) {
    city = 'Rio de Janeiro'; state = 'RJ';
  } else if (text.includes('são paulo') || text.includes('sao paulo') || text.includes(' sp')) {
    city = 'São Paulo'; state = 'SP';
  }

  // 2. Detect Neighborhood
  let neighborhood = currentCalculator?.neighborhood || 'Centro';
  const knownNeighborhoods = [
    'icaraí', 'icarai', 'santa rosa', 'fonseca', 'ingá', 'inga', 'centro', 'charitas', 'itaipu', 'piratininga',
    'são mateus', 'sao mateus', 'granbery', 'bom pastor', 'cascatinha', 'santa helena', 'benfica',
    'copacabana', 'ipanema', 'botafogo', 'flamengo', 'tijuca', 'barra da tijuca', 'recreio', 'jacarepaguá',
    'méier', 'meier', 'madureira', 'campo grande', 'bangu', 'taquara', 'vila isabel'
  ];
  for (const kn of knownNeighborhoods) {
    if (text.includes(kn)) {
      neighborhood = kn.charAt(0).toUpperCase() + kn.slice(1);
      break;
    }
  }

  // 3. Detect Area (m²)
  let sizeSqm = currentCalculator?.sizeSqm || 70;
  const sizeMatch = text.match(/(\d+)\s*(?:m2|m²|metros|metro)/i) || text.match(/(?:de|com)\s*(\d+)\s*m/i);
  if (sizeMatch) {
    sizeSqm = parseInt(sizeMatch[1]);
  }

  // 4. Detect Price / Lance
  let auctionPrice = currentCalculator?.auctionPrice || 180000;
  const priceMilMatch = text.match(/(?:por|lance\s*de|preço\s*de|valor\s*de)?\s*(\d+[\.,]?\d*)\s*(?:mil|k)\b/i);
  const priceFullMatch = text.match(/(?:r\$\s*|lance\s*de\s*)(\d{5,8})/i);

  if (priceMilMatch) {
    const rawVal = parseFloat(priceMilMatch[1].replace(',', '.'));
    auctionPrice = Math.round(rawVal * 1000);
  } else if (priceFullMatch) {
    auctionPrice = parseInt(priceFullMatch[1]);
  }

  // 5. Detect Repair
  let estimatedRepair = currentCalculator?.estimatedRepair || Math.round(sizeSqm * 180);
  const repairMatch = text.match(/(?:reforma|obras?)\s*(?:de)?\s*(\d+[\.,]?\d*)\s*(?:mil|k)?/i);
  if (repairMatch) {
    const rVal = parseFloat(repairMatch[1].replace(',', '.'));
    estimatedRepair = rVal < 1000 ? Math.round(rVal * 1000) : Math.round(rVal);
  }

  // Check if intent is filter radar
  if (text.includes('radar') || text.includes('buscar') || text.includes('melhores') || text.includes('listar')) {
    return {
      replyText: `Filtrei as melhores oportunidades da Caixa em ${city} para você! Você pode ordenar por maior lucro líquido ou ROI.`,
      action: {
        type: 'filter_radar',
        data: { city, sortBy: 'profit' },
        summary: `Radar filtrado: ${city} (Maior Lucro)`
      }
    };
  }

  // Calculate metrics
  const itbiSqm = lookupItbiAverage(city, neighborhood);
  const itbiRate = state === 'MG' ? 2 : 3;
  const marketValue = Math.round(sizeSqm * itbiSqm);
  const itbiCost = Math.round(auctionPrice * (itbiRate / 100));
  const rgiCost = Math.round(auctionPrice * 0.025);
  const evictionCost = 6000;
  const totalCost = Math.round(auctionPrice + itbiCost + rgiCost + estimatedRepair + evictionCost);
  const netProfit = Math.round(marketValue - totalCost);
  const roi = totalCost > 0 ? Math.round((netProfit / totalCost) * 100) : 0;

  const replyText = `Calculei para você, Marcus! O imóvel em ${neighborhood}, ${city} (${sizeSqm}m²) tem valor de mercado pelo ITBI de R$ ${marketValue.toLocaleString('pt-BR')} (R$ ${itbiSqm.toLocaleString('pt-BR')}/m²). Com lance de R$ ${auctionPrice.toLocaleString('pt-BR')} e custos totais de R$ ${totalCost.toLocaleString('pt-BR')}, o lucro líquido estimado é de +R$ ${netProfit.toLocaleString('pt-BR')} com ROI de ${roi}%. ${roi >= 35 ? 'É uma excelente oportunidade de arrematação!' : 'Margem moderada, analise com cautela.'}`;

  return {
    replyText,
    action: {
      type: 'fill_calculator',
      data: {
        city,
        state,
        neighborhood,
        sizeSqm,
        auctionPrice,
        estimatedRepair,
        evictionCost,
        itbiRate,
        itbiSqm,
        marketValueItbi: marketValue,
        totalAcquisitionCost: totalCost,
        netProfit,
        roiPercent: roi
      },
      summary: `Calculadora preenchida: ${neighborhood}, ${sizeSqm}m², R$ ${auctionPrice.toLocaleString('pt-BR')}`
    }
  };
}

// Google Gemini Copilot Endpoint
app.post('/api/copilot/chat', async (req, res) => {
  const { message, history, currentCalculator } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensagem obrigatória' });
  }

  // If no Gemini key or upon API error, instantly use local NLP engine
  if (!GEMINI_API_KEY) {
    const localResult = localNlpProcess(message, currentCalculator);
    return res.json(localResult);
  }

  try {
    const systemPrompt = `Você é o Copiloto de Inteligência Imobiliária da Marcus Assessoria, especialista em Leilões de Imóveis, Retomados Caixa e Arbitragem balizada por ITBI Oficial.
Você está conversando com o Marcus através de um aplicativo para celular com comando por voz.

SUA MISSÃO:
1. Responder em português brasileiro de forma direta, amigável e consultiva.
2. Quando o usuário pedir para calcular um imóvel (ex: "calcula um apartamento de 80m em Icaraí por 200 mil"), você DEVE:
   - Identificar a cidade (Rio de Janeiro, Niterói, Juiz de Fora, Santos Dumont ou São Paulo), o bairro, a área em m², o lance/preço e possíveis reformas.
   - Retornar uma AÇÃO estruturada "fill_calculator" para que o aplicativo preencha a calculadora automaticamente na tela dele.
3. Quando o usuário pedir para buscar ou filtrar oportunidades (ex: "me mostra os melhores imóveis de Niterói"), você DEVE retornar "filter_radar".

FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
{
  "replyText": "Seu texto falado para o usuário",
  "action": null OU {
    "type": "fill_calculator" | "filter_radar" | "switch_tab",
    "data": { ... },
    "summary": "Resumo curto da ação"
  }
}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nMensagem do usuário: "${message}"` }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    };

    const apiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!apiRes.ok) {
      console.warn('Gemini quota/status issue, using local intelligent NLP engine...');
      const localResult = localNlpProcess(message, currentCalculator);
      return res.json(localResult);
    }

    const result = await apiRes.json();
    const candidateText = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsedResponse = JSON.parse(candidateText);

    if (parsedResponse.action && parsedResponse.action.type === 'fill_calculator') {
      const city = parsedResponse.action.data.city || currentCalculator?.city || 'Rio de Janeiro';
      const nb = parsedResponse.action.data.neighborhood || currentCalculator?.neighborhood || 'Centro';
      const itbiAvg = lookupItbiAverage(city, nb);
      parsedResponse.action.data.itbiSqm = itbiAvg;
    }

    res.json(parsedResponse);
  } catch (error: any) {
    console.warn('Copilot error, fallback to local NLP:', error);
    const localResult = localNlpProcess(message, currentCalculator);
    res.json(localResult);
  }
});

// Serve compiled static files in production
const DIST_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
  ? __dirname
  : path.join(__dirname, 'dist');

if (fs.existsSync(DIST_PATH) && fs.existsSync(path.join(DIST_PATH, 'index.html'))) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  console.log('====================================================================');
  console.log('  MARCUS ASSESSORIA - MOBILE AI COPILOT & PWA INICIADO');
  console.log('====================================================================');
  console.log(`  Local PC:      http://localhost:${PORT}`);
  console.log(`  Celular Wi-Fi: http://${localIp}:${PORT}`);
  console.log('====================================================================');
});
