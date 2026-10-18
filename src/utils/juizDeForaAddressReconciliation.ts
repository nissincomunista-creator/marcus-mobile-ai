import type { ItbiTransaction } from '../types.ts';
import { isUsableNeighborhoodLabel } from './locationSanitizers.ts';

export interface JfAddressReferenceRow {
  sourceRow: number;
  date: string;
  transactionValue: number;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  areaSqm?: number;
  unitValueSqm?: number;
  city?: string;
}

export interface JfAddressReconciliationSummary {
  transactions: ItbiTransaction[];
  matchedRows: number;
  correctedNeighborhoods: number;
  correctedComplements: number;
  correctedAreas: number;
  ambiguousRows: number;
  unmatchedRows: number;
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeStreet(value: unknown): string {
  return normalizeText(value)
    .replace(/^(?:rua|r|avenida|av|alameda|al|travessa|trv|estrada|est|rodovia|rod|praca|largo)\s+/, '')
    .replace(/\s+/g, '');
}

function normalizeNumber(value: unknown): string {
  return normalizeText(value).replace(/^(?:n|numero)\s+/, '').replace(/[^a-z0-9]/g, '');
}

function normalizeDate(value: unknown): string {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  return text;
}

function parseMoney(value: unknown): number {
  let text = String(value ?? '').replace(/[^\d,.-]/g, '').trim();
  if (!text) return 0;
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  const amount = Number(text);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ';' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some(cell => cell.trim())) rows.push(row);
  }
  return rows;
}

export function parseJfAddressReferenceCsv(text: string): JfAddressReferenceRow[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  if (!headerRow) return [];
  const header = headerRow.map(normalizeText).map(value => value.replace(/\s/g, ''));
  const indexOf = (...names: string[]) => header.findIndex(value => names.includes(value));
  const indexes = {
    date: indexOf('dataitbi', 'data', 'date'),
    transactionValue: indexOf('valortransacaor', 'valortransacaors', 'valortransacao', 'transactionvalue'),
    street: indexOf('logradouro', 'street'),
    number: indexOf('numero', 'number'),
    complement: indexOf('complemento', 'complement'),
    neighborhood: indexOf('bairro', 'neighborhood'),
    areaSqm: indexOf('aream2', 'aream²', 'area', 'sizessqm'),
    unitValueSqm: indexOf('valorm2r', 'valorm2rs', 'valorm2', 'unitvaluesqm'),
    city: indexOf('cidade', 'city')
  };
  if (indexes.date < 0 || indexes.transactionValue < 0 || indexes.street < 0 || indexes.number < 0) return [];

  return dataRows.flatMap((cells, index) => {
    const read = (field: keyof typeof indexes) => indexes[field] >= 0 ? String(cells[indexes[field]] || '').trim() : '';
    const date = normalizeDate(read('date'));
    const transactionValue = parseMoney(read('transactionValue'));
    const street = read('street');
    const number = read('number');
    const city = read('city');
    if (!date || transactionValue <= 0 || !street || !number || (city && normalizeText(city) !== 'juiz de fora')) return [];

    return [{
      sourceRow: index + 2,
      date,
      transactionValue,
      street,
      number,
      complement: read('complement'),
      neighborhood: read('neighborhood'),
      areaSqm: parseMoney(read('areaSqm')),
      unitValueSqm: parseMoney(read('unitValueSqm')),
      city: city || undefined
    }];
  });
}

function addressKey(date: unknown, value: unknown, street: unknown, number: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return [normalizeDate(date), amount.toFixed(2), normalizeStreet(street), normalizeNumber(number)].join('|');
}

function isJuizDeFora(tx: ItbiTransaction): boolean {
  return (tx.state || '').toUpperCase() === 'MG' && normalizeText(tx.city).replace(/\s/g, '') === 'juizdefora';
}

/**
 * Cross-check against the official city export. A match is accepted only when
 * date, declared amount, street and number identify one row in both sources.
 * Location and a positive area explicitly present in the export may be filled
 * from that source; declared amount, date, nature and ownership share stay as-is.
 */
export function reconcileJfTransactionAddresses(
  transactions: ItbiTransaction[],
  referenceRows: JfAddressReferenceRow[],
  referenceFile: string
): JfAddressReconciliationSummary {
  const transactionsByKey = new Map<string, ItbiTransaction[]>();
  const referencesByKey = new Map<string, JfAddressReferenceRow[]>();
  for (const tx of transactions) {
    if (!isJuizDeFora(tx)) continue;
    const key = addressKey(tx.date, tx.transactionValue, tx.street, tx.number);
    if (key) transactionsByKey.set(key, [...(transactionsByKey.get(key) || []), tx]);
  }
  for (const reference of referenceRows) {
    const key = addressKey(reference.date, reference.transactionValue, reference.street, reference.number);
    if (key) referencesByKey.set(key, [...(referencesByKey.get(key) || []), reference]);
  }

  const matchedById = new Map<string, { reference: JfAddressReferenceRow; tx: ItbiTransaction }>();
  let ambiguousRows = 0;
  let unmatchedRows = 0;
  for (const [key, txRows] of transactionsByKey) {
    const refRows = referencesByKey.get(key) || [];
    if (txRows.length === 1 && refRows.length === 1) {
      matchedById.set(txRows[0].id, { tx: txRows[0], reference: refRows[0] });
    } else if (refRows.length > 0) {
      ambiguousRows += txRows.length;
    } else {
      unmatchedRows += txRows.length;
    }
  }

  let correctedNeighborhoods = 0;
  let correctedComplements = 0;
  let correctedAreas = 0;
  const reconciled = transactions.map(tx => {
    const match = matchedById.get(tx.id);
    if (!match) return tx;
    const { reference } = match;
    const next: ItbiTransaction = { ...tx };
    const neighborhood = reference.neighborhood.trim();
    const complement = reference.complement.trim();
    if (isUsableNeighborhoodLabel(neighborhood) && normalizeText(neighborhood) !== normalizeText(tx.neighborhood)) {
      next.sourceParserNeighborhood = tx.neighborhood;
      next.neighborhood = neighborhood;
      correctedNeighborhoods++;
    }
    if (complement && normalizeText(complement) !== normalizeText(tx.complement)) {
      next.sourceParserComplement = tx.complement;
      next.complement = complement;
      correctedComplements++;
    }
    const officialArea = Number(reference.areaSqm);
    if (Number.isFinite(officialArea) && officialArea >= 15 && officialArea <= 1000) {
      if (Number(tx.sizeSqm) !== officialArea) {
        next.sourceParserSizeSqm = Number(tx.sizeSqm) || 0;
        next.sizeSqm = officialArea;
        correctedAreas++;
      }
      const officialUnitValue = Number(reference.unitValueSqm) > 0
        ? Number(reference.unitValueSqm)
        : Math.round(tx.transactionValue / officialArea);
      if (Number.isFinite(officialUnitValue) && officialUnitValue > 0 && Number(tx.unitValueSqm) !== officialUnitValue) {
        next.sourceParserUnitValueSqm = Number(tx.unitValueSqm) || 0;
        next.unitValueSqm = officialUnitValue;
      }
      next.sizeSourceVerified = true;
      next.sizeSourceFile = referenceFile;
      next.sizeSourceRow = reference.sourceRow;
      next.sourceVerified = true;
      next.sourceFile = referenceFile;
      next.sourceRow = reference.sourceRow;
    }
    next.addressSourceVerified = true;
    next.addressSourceFile = referenceFile;
    next.addressSourceRow = reference.sourceRow;
    return next;
  });

  return {
    transactions: reconciled,
    matchedRows: matchedById.size,
    correctedNeighborhoods,
    correctedComplements,
    correctedAreas,
    ambiguousRows,
    unmatchedRows
  };
}
