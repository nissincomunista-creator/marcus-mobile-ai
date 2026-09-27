import assert from 'node:assert/strict';
import { parseJfAddressReferenceCsv, reconcileJfTransactionAddresses } from '../src/utils/juizDeForaAddressReconciliation.ts';

const csv = [
  'CIDADE;BAIRRO;LOGRADOURO;NUMERO;COMPLEMENTO;TIPOLOGIA;VALOR_TRANSACAO_R$;AREA_M2;VALOR_M2_R$;DATA_ITBI',
  'Juiz de Fora;São Mateus;Rua Guacui;35;APT 206;Apartamento;R$ 360.000,00;75;R$ 4.800,00;2024-07-05'
].join('\n');
const referenceRows = parseJfAddressReferenceCsv(csv);
assert.equal(referenceRows.length, 1);
assert.equal(referenceRows[0].sourceRow, 2);

const original = {
  id: 'itbi-jf-2024-6197-9077',
  state: 'MG', city: 'Juiz de Fora', neighborhood: 'Sao Joao Batista-santa Cruz',
  street: 'Rua Guacui', number: '35', complement: 'SNLT Q B',
  propertyType: 'Apartamento' as const, sizeSqm: 0, unitValueSqm: 0,
  transactionValue: 360000, normalizedTotalValue: 360000,
  naturezaOperacao: 'COMPRA E VENDA', percentualTransmitido: 100,
  isCompraEVenda: true, date: '2024-07-05'
};
const result = reconcileJfTransactionAddresses([original], referenceRows, 'reference.csv');
const corrected = result.transactions[0];
assert.equal(corrected.neighborhood, 'São Mateus');
assert.equal(corrected.complement, 'APT 206');
assert.equal(corrected.sourceParserNeighborhood, 'Sao Joao Batista-santa Cruz');
assert.equal(corrected.sourceParserComplement, 'SNLT Q B');
assert.equal(corrected.addressSourceVerified, true);
assert.equal(corrected.addressSourceRow, 2);
assert.equal(corrected.sizeSqm, 75);
assert.equal(corrected.unitValueSqm, 4800);
assert.equal(corrected.sizeSourceVerified, true);
assert.equal(corrected.sizeSourceRow, 2);
for (const field of ['transactionValue', 'normalizedTotalValue', 'naturezaOperacao', 'percentualTransmitido', 'date'] as const) {
  assert.equal(corrected[field], original[field], `The cross-check must preserve ${field}`);
}
assert.equal(result.correctedNeighborhoods, 1);
assert.equal(result.correctedComplements, 1);
assert.equal(result.correctedAreas, 1);

const ambiguous = reconcileJfTransactionAddresses([original], [...referenceRows, { ...referenceRows[0], sourceRow: 3 }], 'reference.csv');
assert.equal(ambiguous.transactions[0].neighborhood, original.neighborhood, 'Ambiguous matches must not rewrite location');
assert.equal(ambiguous.transactions[0].sizeSqm, original.sizeSqm, 'Ambiguous matches must not rewrite area');
assert.equal(ambiguous.ambiguousRows, 1);

console.log('Juiz de Fora source reconciliation passed: unique official rows repair address and area provenance without changing declared amount, nature, share, or date.');
