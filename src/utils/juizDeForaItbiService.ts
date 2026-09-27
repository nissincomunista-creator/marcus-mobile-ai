import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { ItbiTransaction, PropertyType } from '../types.ts';

export interface JuizDeForaItbiTransaction extends ItbiTransaction {
  naturezaOperacao?: string;
  percentualTransmitido?: number;
  normalizedTotalValue?: number;
  isCompraEVenda?: boolean;
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

function inferPropertyType(complement: string, street: string, neighborhood: string): PropertyType {
  const text = `${complement} ${street} ${neighborhood}`.toLowerCase();
  if (/\b(?:ap|apto|apartamento|bl|bloco|cob|cobertura|ed|edificio)\b/.test(text)) return 'Apartamento';
  if (/\b(?:loja|sala|sl|comercial|galpao|escritorio|clinica|box|sobreloja)\b/.test(text)) return 'Comercial';
  if (/\b(?:lote|terreno|gleba|chacara|sitio)\b/.test(text)) return 'Terreno';
  if (/\b(?:casa|sobrado|residencia)\b/.test(text)) return 'Casa';
  return 'Apartamento';
}

function isPropertyTypeExplicit(complement: string, street: string, neighborhood: string): boolean {
  return /\b(?:ap|apto|apartamento|bl|bloco|cob|cobertura|ed|edificio|loja|sala|sl|comercial|galpao|escritorio|clinica|box|sobreloja|lote|terreno|gleba|chacara|sitio|casa|sobrado|residencia)\b/i
    .test(`${complement} ${street} ${neighborhood}`);
}

export function isCompraEVendaNature(nat?: string): boolean {
  if (!nat) return false;
  const upper = nat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  if (upper.includes('COMPRA E VENDA') || upper.includes('VENDA DIRETA')) {
    if (upper.includes('NUA PROPRIEDADE')) return false; // Nua-propriedade deve ser isolada conforme especificação
    return true;
  }
  return false;
}

export async function parseJuizDeFora2024Pdf(filePath: string): Promise<JuizDeForaItbiTransaction[]> {
  if (!fs.existsSync(filePath)) return [];
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const res = await parser.getText();
  await parser.destroy();

  const cleanLines = res.text.split('\n').filter(l => !l.trim().startsWith('-- ') && !l.trim().endsWith('--'));
  const c1Header = cleanLines.findIndex(l => l.includes('PERCENTUAL'));
  const c2Header = cleanLines.findIndex(l => l.includes('VALOR DA TRANSAÇÃO'));
  const c3Header = cleanLines.findIndex(l => l.includes('COMPLEMENTO \tBAIRRO'));

  if (c1Header === -1 || c2Header === -1 || c3Header === -1) return [];

  const count = c2Header - c1Header - 1;
  const results: JuizDeForaItbiTransaction[] = [];

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
    let normalizedTotal = val;
    if (frac > 0 && frac < 100) {
      normalizedTotal = Math.round(val / (frac / 100));
    }

    const isCV = isCompraEVendaNature(rawNat);

    let cleanStreet = normalizeTitleCase(rawStreet.replace(/^RUA\s+|^AVENIDA\s+|^AV\s+/i, ''));
    let cleanNeigh = normalizeTitleCase(rawNeigh.replace(/-\d+\s*SECAO/i, '').replace(/-\w+$/i, ''));
    if (cleanStreet.includes('Sem Inf') || !cleanStreet || cleanStreet === '0') {
      cleanStreet = 'Logradouro não informado';
      cleanNeigh = cleanNeigh || 'Juiz de Fora';
    }
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
      sizeSqm: 0, // Metragem não existe na base oficial de JF (nunca simular como área)
      transactionValue: val,
      normalizedTotalValue: normalizedTotal,
      percentualTransmitido: frac,
      naturezaOperacao: rawNat || 'NATUREZA NÃO IDENTIFICADA',
      isCompraEVenda: isCV,
      propertyTypeVerified: isPropertyTypeExplicit(rawCompl, cleanStreet, cleanNeigh),
      date: isoDate,
      unitValueSqm: 0, // Desativado para Juiz de Fora
      description: `Juiz de Fora/MG - ${cleanNeigh} - ${cleanStreet}${rawNum ? ', ' + rawNum : ''}${rawCompl ? ' ' + rawCompl : ''} (Cota: ${frac}%)`
    });
  }

  return results;
}

export async function parseJuizDeFora2025Pdf(filePath: string): Promise<JuizDeForaItbiTransaction[]> {
  if (!fs.existsSync(filePath)) return [];
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const res = await parser.getText();
  await parser.destroy();

  const lines = res.text.split('\n');
  const results: JuizDeForaItbiTransaction[] = [];
  let rowIdx = 0;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l || l.includes('INSCRICAO REDUZIDA') || l.startsWith('-- ')) continue;

    const parts = l.split('\t').map(p => p.trim());
    if (parts.length < 5) continue;

    const valIdx = parts.findIndex(p => p.includes('R$') || /^\d{1,3}(?:\.\d{3})*,\d{2}/.test(p));
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

    // In the official 2025 layout, the operation is the column immediately
    // before the transaction amount. Looking backwards across address fields
    // can mistake a neighborhood/city spill for the operation classification.
    let rawNat = parts[valIdx - 1] || '';
    if (rawNat.includes('JUIZ DE FORA')) {
      rawNat = rawNat.replace(/.*JUIZ DE FORA(?:\s+MG)?\s*/i, '').trim();
    }
    const isCV = isCompraEVendaNature(rawNat);

    const dateRaw = parts.find(part => /^\d{2}\/\d{2}\/\d{4}$/.test(part)) || '01/01/2025';
    const dParts = dateRaw.split('/');
    let isoDate = '2025-01-01';
    if (dParts.length === 3) {
      const d = parseInt(dParts[0], 10);
      const m = parseInt(dParts[1], 10);
      const y = parseInt(dParts[2], 10);
      isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const cityIdx = parts.findIndex(part => /\bJUIZ\s+DE\s+FORA\b/i.test(part));
    const viaAndCep = parts[2] || '';
    const viaText = viaAndCep.replace(/^\s*\d{5,8}\s*/, '').trim();
    const viaMatch = viaText.match(/^(RUA|AVENIDA|AV\.?|ALAMEDA|LARGO|PRA[CÇ]A|TRAVESSA|ESTRADA|RODOVIA)\b/i);
    const streetBody = parts[3] || '';
    const bodyTypeMatch = streetBody.match(/^(RUA|AVENIDA|AV\.?|ALAMEDA|LARGO|PRA[CÇ]A|TRAVESSA|ESTRADA|RODOVIA)\b\s*/i);
    const viaType = viaMatch?.[1]?.replace(/^AV\.?$/i, 'Avenida');
    const bodyType = bodyTypeMatch?.[1]?.replace(/^AV\.?$/i, 'Avenida');
    const rawStreetName = streetBody.replace(/^(?:RUA|AVENIDA|AV\.?|ALAMEDA|LARGO|PRA[CÇ]A|TRAVESSA|ESTRADA|RODOVIA)\b\s*/i, '').trim();
    const rawStreet = `${viaType || bodyType || 'Rua'} ${rawStreetName}`.trim();
    const rawNum = cityIdx >= 6 ? (parts[4] || '') : '';
    const rawNeigh = cityIdx >= 6 ? (parts[cityIdx - 1] || '') : '';
    const rawCompl = cityIdx >= 7 ? (parts[5] || '') : '';

    let cleanStreet = normalizeTitleCase(rawStreet);
    let cleanNeigh = normalizeTitleCase(rawNeigh.replace(/-\d+\s*SECAO/i, '').replace(/-\w+$/i, ''));
    const noAddress = /^(?:0|SEM\s+INF|00000000\s+SEM\s+INF)?$/i.test(viaAndCep.trim()) || !streetBody || streetBody === '0';
    if (noAddress) cleanStreet = 'Logradouro não informado';
    if (!cleanNeigh || cleanNeigh === '0' || /^JUIZ DE FORA(?: MG)?$/i.test(cleanNeigh)) cleanNeigh = 'Juiz de Fora';
    const propType = inferPropertyType(rawCompl, cleanStreet, cleanNeigh);

    results.push({
      id: `itbi-jf-2025-${rowIdx}-${inscricao.slice(-4) || 'row'}`,
      state: 'MG',
      city: 'Juiz de Fora',
      neighborhood: cleanNeigh || 'Juiz de Fora',
      street: cleanStreet || 'Logradouro não informado',
      number: rawNum && rawNum !== '0' ? rawNum.trim() : undefined,
      complement: rawCompl ? rawCompl.trim() : undefined,
      propertyType: propType,
      sizeSqm: 0,
      transactionValue: val,
      normalizedTotalValue: normalizedTotal,
      percentualTransmitido: frac,
      naturezaOperacao: rawNat || 'NATUREZA NÃO IDENTIFICADA',
      isCompraEVenda: isCV,
      propertyTypeVerified: isPropertyTypeExplicit(rawCompl, cleanStreet, cleanNeigh),
      date: isoDate,
      unitValueSqm: 0,
      description: `Juiz de Fora/MG - ${cleanNeigh} - ${cleanStreet}${rawNum ? ', ' + rawNum : ''}${rawCompl ? ' ' + rawCompl : ''} (Cota: ${frac}%)`
    });
  }

  return results;
}

export async function loadAllJuizDeForaTransactions(): Promise<JuizDeForaItbiTransaction[]> {
  const possiblePaths2024 = [
    'C:\\Users\\Marcus\\OneDrive\\Desktop\\ITBI DAS CIDADES\\itbi juiz de fora 2024.pdf',
    path.join(process.cwd(), 'data', 'itbi juiz de fora 2024.pdf')
  ];
  const possiblePaths2025 = [
    'C:\\Users\\Marcus\\OneDrive\\Desktop\\ITBI DAS CIDADES\\itbi juiz de fora 2025.pdf',
    path.join(process.cwd(), 'data', 'itbi juiz de fora 2025.pdf')
  ];

  let p24 = possiblePaths2024.find(p => fs.existsSync(p));
  let p25 = possiblePaths2025.find(p => fs.existsSync(p));

  const list24 = p24 ? await parseJuizDeFora2024Pdf(p24) : [];
  const list25 = p25 ? await parseJuizDeFora2025Pdf(p25) : [];

  return [...list24, ...list25];
}
