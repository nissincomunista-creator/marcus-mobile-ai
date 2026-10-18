import assert from 'node:assert/strict';
import { deduplicateVerifiedItbiSourceRows } from '../src/utils/itbiSourceDeduplication.ts';

const original: any = {
  id: 'row-a', state: 'MG', city: 'Juiz de Fora', street: 'Rua Guacui', number: '35',
  complement: 'APTO 402', neighborhood: 'São Mateus', propertyType: 'Apartamento',
  sizeSqm: 55, transactionValue: 280000, unitValueSqm: 5091, date: '2024-04-18',
  sourceVerified: true, sourceFile: 'transações imobiliárias de juiz de fora 2024-2025.csv', sourceRow: 15285
};
const duplicate = { ...original, id: 'row-b', neighborhood: undefined, complement: undefined };
const conflict = { ...original, id: 'row-c', transactionValue: 300000 };
const result = deduplicateVerifiedItbiSourceRows([original, duplicate, conflict]);
assert.equal(result.duplicatesRemoved, 1);
assert.equal(result.conflictingSourceRows, 1);
assert.equal(result.transactions.length, 2);
assert.equal(result.transactions[0].neighborhood, 'São Mateus', 'Deduplication must keep the better populated source row');
assert(result.transactions.some(tx => tx.transactionValue === 300000), 'Conflicting facts must be preserved for review');

console.log('Verified ITBI source-row deduplication passed.');
