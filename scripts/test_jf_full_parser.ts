import fs from 'fs';
import { PDFParse } from 'pdf-parse';

export interface JuizDeForaParsedTransaction {
  id: string;
  state: 'MG';
  city: 'Juiz de Fora';
  neighborhood: string;
  street: string;
  number?: string;
  complement?: string;
  propertyType: 'Apartamento' | 'Casa' | 'Comercial' | 'Terreno';
  sizeSqm: number; // 0 for Juiz de Fora (never mock)
  transactionValue: number;
  normalizedTotalValue: number;
  percentualTransmitido: number;
  naturezaOperacao: string;
  isCompraEVenda: boolean;
  date: string;
  unitValueSqm: number; // 0 for Juiz de Fora
  sourceFile: string;
}

function parseFraction(raw: string): number {
  if (!raw) return 100;
  const cleaned = raw.replace('%', '').replace(',', '.').trim();
  const val = parseFloat(cleaned);
  if (isNaN(val) || val <= 0) return 100;
  return val;
}

function parseValBRL(raw: string): number {
  if (!raw) return 0;
  let str = raw.replace(/[^\d.,]/g, '').trim();
  if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
  else if (str.includes(',')) str = str.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(str)) str = str.replace(/\./g, '');
  const v = parseFloat(str);
  return isNaN(v) ? 0 : Math.round(v * 100) / 100;
}

function normalizeTitleCase(str: string): string {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
}

function inferPropertyType(complement: string, street: string, neighborhood: string): 'Apartamento' | 'Casa' | 'Comercial' | 'Terreno' {
  const text = `${complement} ${street} ${neighborhood}`.toLowerCase();
  if (/\b(?:ap|apto|apartamento|bl|bloco|cob|cobertura|ed|edificio)\b/.test(text)) return 'Apartamento';
  if (/\b(?:loja|sala|sl|comercial|galpao|escritorio|clinica|box|sobreloja)\b/.test(text)) return 'Comercial';
  if (/\b(?:lote|terreno|gleba|chacara|sitio)\b/.test(text)) return 'Terreno';
  return 'Apartamento'; // Default for urban Juiz de Fora registry
}

export async function parseJuizDeFora2024(filePath: string): Promise<JuizDeForaParsedTransaction[]> {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const res = await parser.getText();
  await parser.destroy();

  const cleanLines = res.text.split('\n').filter(l => !l.trim().startsWith('-- ') && !l.trim().endsWith('--'));
  const c1Header = cleanLines.findIndex(l => l.includes('PERCENTUAL'));
  const c2Header = cleanLines.findIndex(l => l.includes('VALOR DA TRANSAÇÃO'));
  const c3Header = cleanLines.findIndex(l => l.includes('COMPLEMENTO \tBAIRRO'));

  const count = c2Header - c1Header - 1;
  const results: JuizDeForaParsedTransaction[] = [];

  for (let i = 1; i <= count; i++) {
    const l1 = cleanLines[c1Header + i]?.trim();
    const l2 = cleanLines[c2Header + i]?.trim();
    const l3 = cleanLines[c3Header + i]?.trim();
    if (!l1 && !l2 && !l3) continue;

    // l1: 006838000 \t33,3333 COMPRA E VENDA \t1/1/2024
    const parts1 = (l1 || '').split('\t').map(p => p.trim());
    const inscricao = parts1[0] || '';
    const middle1 = parts1[1] || '';
    const dateRaw = parts1[2] || '1/1/2024';

    const fracMatch = middle1.match(/^([\d,.]+)\s+(.*)$/);
    const rawFrac = fracMatch ? fracMatch[1] : '100';
    const rawNat = fracMatch ? fracMatch[2].trim() : middle1;

    // Date parse: M/D/YYYY
    const dParts = dateRaw.split('/');
    let isoDate = '2024-01-01';
    if (dParts.length === 3) {
      const m = parseInt(dParts[0], 10);
      const d = parseInt(dParts[1], 10);
      const y = parseInt(dParts[2], 10);
      isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // l2: - \t180.000,00- 36062000 SETE DE SETEMBRO \t1282
    const parts2 = (l2 || '').split('\t').map(p => p.trim());
    let rawVal = '';
    let rawStreet = '';
    let rawNum = '';

    const l2Combined = l2 || '';
    const m2 = l2Combined.match(/-\s*([0-9.,]+)\s*-\s*(\d{8})?\s*(.*?)\s*(?:\t\s*(\d+.*))?$/);
    if (m2) {
      rawVal = m2[1];
      rawStreet = m2[3] || '';
      rawNum = m2[4] || '';
    } else {
      rawVal = parts2[0]?.replace(/^[-\s]+/, '') || '';
      rawStreet = parts2[1] || '';
      rawNum = parts2[2] || '';
    }

    // l3: AP203 \tSAO MATEUS \tJUIZ DE FORA \tMG
    const parts3 = (l3 || '').split('\t').map(p => p.trim());
    let rawCompl = '';
    let rawNeigh = '';
    if (parts3.length >= 3) {
      rawCompl = parts3[0];
      rawNeigh = parts3[1];
    } else if (parts3.length === 2) {
      rawNeigh = parts3[0];
    } else {
      rawNeigh = parts3[0] || 'Centro';
    }

    const val = parseValBRL(rawVal);
    if (val <= 0) continue;

    const frac = parseFraction(rawFrac);
    // Adjusted 100% total value:
    let normalizedTotal = val;
    if (frac > 0 && frac < 100) {
      normalizedTotal = Math.round(val / (frac / 100));
    }

    const natUpper = rawNat.toUpperCase().trim();
    const isCV = natUpper.includes('COMPRA E VENDA') || natUpper.includes('VENDA DIRETA');

    const cleanStreet = normalizeTitleCase(rawStreet.replace(/^RUA\s+|^AVENIDA\s+|^AV\s+/i, ''));
    const cleanNeigh = normalizeTitleCase(rawNeigh.replace(/-\d+\s*SECAO/i, '').replace(/-\w+$/i, ''));
    const propType = inferPropertyType(rawCompl, cleanStreet, cleanNeigh);

    results.push({
      id: `itbi-jf-2024-${i}-${inscricao.slice(-4) || 'row'}`,
      state: 'MG',
      city: 'Juiz de Fora',
      neighborhood: cleanNeigh || 'Juiz de Fora',
      street: cleanStreet ? `Rua ${cleanStreet}` : 'Logradouro não informado',
      number: rawNum ? rawNum.trim() : undefined,
      complement: rawCompl ? rawCompl.trim() : undefined,
      propertyType: propType,
      sizeSqm: 0, // Metragem ausente na fonte municipal de Juiz de Fora
      transactionValue: val,
      normalizedTotalValue: normalizedTotal,
      percentualTransmitido: frac,
      naturezaOperacao: rawNat || 'COMPRA E VENDA',
      isCompraEVenda: isCV,
      date: isoDate,
      unitValueSqm: 0, // Desativado para Juiz de Fora
      sourceFile: 'itbi juiz de fora 2024.pdf'
    });
  }

  return results;
}

export async function parseJuizDeFora2025(filePath: string): Promise<JuizDeForaParsedTransaction[]> {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const res = await parser.getText();
  await parser.destroy();

  const lines = res.text.split('\n');
  const results: JuizDeForaParsedTransaction[] = [];
  let rowIdx = 0;

  for (const raw of lines) {
    const l = raw.trim();
    if (!l || l.includes('INSCRICAO REDUZIDA') || l.startsWith('-- ')) continue;

    // Example 2025 line:
    // 009963004 \t 0 \t 36036000 AVENIDA \t DOS ANDRADAS \t 874 \t 201 \t MORRO DA GLORIA \t JUIZ DE FORA MG \t COMPRA E VENDA \t 299.429,00 R$ \t 01/01/2025 \t SIM
    const parts = l.split('\t').map(p => p.trim());
    if (parts.length < 5) continue;

    const valIdx = parts.findIndex(p => p.includes('R$') || /^\d{1,3}(\.\d{3})*,\d{2}/.test(p));
    if (valIdx === -1) continue;

    const rawVal = parts[valIdx];
    const val = parseValBRL(rawVal);
    if (val <= 0) continue;

    rowIdx++;
    const inscricao = parts[0];
    const rawFrac = parts[1];
    const frac = parseFraction(rawFrac);

    let normalizedTotal = val;
    if (frac > 0 && frac < 100) {
      normalizedTotal = Math.round(val / (frac / 100));
    }

    // Natureza da operacao is immediately before valor
    let rawNat = parts[valIdx - 1] || 'COMPRA E VENDA';
    // Clean potential city/neighborhood spill in rawNat
    if (rawNat.includes('JUIZ DE FORA')) {
      rawNat = rawNat.replace(/.*JUIZ DE FORA(?:\s+MG)?\s*/i, '').trim();
    }
    const natUpper = rawNat.toUpperCase().trim();
    const isCV = natUpper.includes('COMPRA E VENDA') || natUpper.includes('VENDA DIRETA');

    // Date is immediately after valor
    const dateRaw = parts[valIdx + 1] || '01/01/2025';
    const dParts = dateRaw.split('/');
    let isoDate = '2025-01-01';
    if (dParts.length === 3) {
      const d = parseInt(dParts[0], 10);
      const m = parseInt(dParts[1], 10);
      const y = parseInt(dParts[2], 10);
      isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // Street, number, complement, neighborhood between parts[2] and valIdx - 1
    // parts[2]: CEP TIPO VIA (e.g. 36036000 AVENIDA)
    // parts[3]: Street name (DOS ANDRADAS)
    let rawStreet = parts[3] || '';
    let rawNum = '';
    let rawCompl = '';
    let rawNeigh = '';

    if (valIdx >= 7) {
      rawNum = parts[4] || '';
      if (valIdx === 8) {
        // no complement
        rawNeigh = parts[5] || '';
      } else if (valIdx >= 9) {
        rawCompl = parts[5] || '';
        rawNeigh = parts[6] || '';
      }
    } else {
      rawStreet = parts[2] || '';
      rawNeigh = parts[3] || '';
    }

    const cleanStreet = normalizeTitleCase(rawStreet.replace(/^RUA\s+|^AVENIDA\s+|^AV\s+/i, ''));
    const cleanNeigh = normalizeTitleCase(rawNeigh.replace(/-\d+\s*SECAO/i, '').replace(/-\w+$/i, ''));
    const propType = inferPropertyType(rawCompl, cleanStreet, cleanNeigh);

    results.push({
      id: `itbi-jf-2025-${rowIdx}-${inscricao.slice(-4) || 'row'}`,
      state: 'MG',
      city: 'Juiz de Fora',
      neighborhood: cleanNeigh || 'Juiz de Fora',
      street: cleanStreet ? `Rua ${cleanStreet}` : 'Logradouro não informado',
      number: rawNum ? rawNum.trim() : undefined,
      complement: rawCompl ? rawCompl.trim() : undefined,
      propertyType: propType,
      sizeSqm: 0,
      transactionValue: val,
      normalizedTotalValue: normalizedTotal,
      percentualTransmitido: frac,
      naturezaOperacao: rawNat || 'COMPRA E VENDA',
      isCompraEVenda: isCV,
      date: isoDate,
      unitValueSqm: 0,
      sourceFile: 'itbi juiz de fora 2025.pdf'
    });
  }

  return results;
}

if (process.argv[1]?.includes('test_jf_full_parser')) {
  (async () => {
    console.log('Testing 2024 parser...');
    const r24 = await parseJuizDeFora2024('C:/Users/Marcus/OneDrive/Desktop/ITBI DAS CIDADES/itbi juiz de fora 2024.pdf');
    console.log('2024 total parsed:', r24.length);
    console.log('2024 Compra e Venda:', r24.filter(r => r.isCompraEVenda).length);
    console.log('2024 Sample record:', JSON.stringify(r24[1], null, 2));

    console.log('Testing 2025 parser...');
    const r25 = await parseJuizDeFora2025('C:/Users/Marcus/OneDrive/Desktop/ITBI DAS CIDADES/itbi juiz de fora 2025.pdf');
    console.log('2025 total parsed:', r25.length);
    console.log('2025 Compra e Venda:', r25.filter(r => r.isCompraEVenda).length);
    console.log('2025 Sample record:', JSON.stringify(r25[1], null, 2));
  })();
}
