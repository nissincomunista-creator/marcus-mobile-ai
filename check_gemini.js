import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const sizeSqm = 150;
const bedrooms = 3;
const parkingSpaces = 2;
const uf = 'RJ';
const cityName = 'Rio de Janeiro';
const neighborhood = 'Copacabana';
const street = 'Avenida Atlantica';
const propertyType = 'Apartamento';

const searchPrompt = `
Você é um analista imobiliário encarregado de pesquisar imóveis ativos para venda nos portais ZapImóveis ou QuintoAndar no estado de ${uf}, cidade de ${cityName}, bairro de ${neighborhood}.
Imóvel de referência:
- Tipologia principal: "${propertyType}" (Se for Casa, busque por Casa, Sobrado ou Casa de Condomínio. Se for Apartamento, busque por Apartamento ou Cobertura).
- Tamanho desejado: ${sizeSqm} m²
- Quartos: ${bedrooms}
- Vagas de garagem: ${parkingSpaces}
- Rua alvo (se aplicável): "${street || ''}"

Você deve retornar os anúncios classificados exatamente em três faixas de tamanho em relação à área de referência de ${sizeSqm}m²:
1. Faixa "below": área entre ${Math.round(sizeSqm * 0.7)}m² e ${Math.round(sizeSqm * 0.9)}m² (retorne 2 amostras reais).
2. Faixa "close": área entre ${Math.round(sizeSqm * 0.9)}m² e ${Math.round(sizeSqm * 1.1)}m² (retorne 2 ou 3 amostras reais).
3. Faixa "above": área entre ${Math.round(sizeSqm * 1.1)}m² e ${Math.round(sizeSqm * 1.35)}m² (retorne 2 amostras reais).

Certifique-se de retornar as URLs de anúncios ativos no ZapImóveis (zapimoveis.com.br) ou QuintoAndar (quintoandar.com.br).

Retorne os resultados estritamente em formato JSON com a seguinte estrutura estruturada:
{
  "below": {
    "range": "${Math.round(sizeSqm * 0.7)}m² - ${Math.round(sizeSqm * 0.9)}m²",
    "matches": [
      {
        "title": "string",
        "price": número (inteiro),
        "sizeSqm": número (inteiro),
        "unitValueSqm": preço por m² (número inteiro),
        "address": "endereço contendo rua, número se disponível, bairro e cidade",
        "link": "URL real de acesso ao anúncio",
        "description": "descrição curta dos quartos, vagas e estado"
      }
    ]
  },
  "close": {
    "range": "${Math.round(sizeSqm * 0.9)}m² - ${Math.round(sizeSqm * 1.1)}m²",
    "matches": [...]
  },
  "above": {
    "range": "${Math.round(sizeSqm * 1.1)}m² - ${Math.round(sizeSqm * 1.35)}m²",
    "matches": [...]
  }
}
Não inclua nenhuma outra marcação no texto além do JSON puro.
`;

async function run() {
  try {
    console.log("Calling Gemini with search grounding (no responseMimeType)...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || '';
    console.log("Received response text:\n", text);
    
    // Manual JSON extractor
    let cleaned = text.trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(cleaned);
    console.log("Parse Success! Keys:", Object.keys(parsed));
    console.log("Close matches:", JSON.stringify(parsed.close, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
