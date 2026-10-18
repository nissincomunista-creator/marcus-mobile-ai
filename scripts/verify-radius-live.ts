import assert from 'node:assert/strict';
import { computeBidirectionalBenchmarks } from '../src/utils/bidirectionalBenchmark.ts';
import { selectRadiusTransactions } from '../src/utils/itbiRadius.ts';

const base = process.env.APP_URL || 'http://localhost:3000';
async function query(params: Record<string, string>) {
  const response = await fetch(`${base}/api/itbi/transactions?${new URLSearchParams({ propertyType: 'Apartamento', includeRadius: 'true', radiusKm: '0.5', ...params })}`);
  assert(response.ok, `HTTP ${response.status}`);
  return response.json();
}
const tests = [
  { state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'QUINTINO BOCAIUVA', targetStreet: 'Rua da República', targetNumber: '386, bloco 03, apartamento 108', propertyId: 'auc-biasi-5bdc913c525a2fa614e6' },
  { state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'copacabana', targetStreet: 'Avenida Princesa Isabel', targetNumber: '500', propertyId: 'auc-megaleiloes-8581beb2949127f6eb91' },
  { state: 'MG', city: 'Juiz de Fora', neighborhood: 'Granbery', targetStreet: 'Rua Guacui', targetNumber: '35', propertyId: 'auc-pestana-96839a65b6093ddbe198' }
];
for (const p of tests) {
  const d = await query(p);
  const noBairro = await query({ ...p, neighborhood: '' });
  assert.equal(d.radiusAnchorPrecision, 'official_address');
  assert.deepEqual(d.radiusTransactions.map((t: any) => t.id).sort(), noBairro.radiusTransactions.map((t: any) => t.id).sort(), 'O bairro não limita o círculo');
  const nearby = selectRadiusTransactions(d.radiusTransactions, .5);
  assert(nearby.length > 0, `Nenhuma transação para ${p.targetStreet}`);
  let model;
  if (p.state === 'MG') model = await (await fetch(`${base}/api/itbi/jf-area-model?propertyType=Apartamento`)).json();
  const result = computeBidirectionalBenchmarks(d.transactions, p.targetStreet, p.targetNumber, p.state === 'MG' ? 147 : 60, 'similar', .5, 'Apartamento', p.neighborhood, model, d.radiusTransactions);
  assert(result && result.raio.validas > 0, `Entorno não chegou ao cálculo de ${p.targetStreet}`);
  console.log(JSON.stringify({ address: `${p.targetStreet}, ${p.targetNumber}`, anchor: d.radiusAnchorPrecision, exactWithin500m: nearby.length, comparableWithin500m: result.raio.validas, sqm: result.raio.saneada }));
}
// Manual calculator must use the same block, without relying on a catalog id.
const manual = await query({ ...tests[0], propertyId: '' });
assert.equal(manual.radiusAnchorPrecision, 'official_address');
assert(selectRadiusTransactions(manual.radiusTransactions, .5).length > 0);
console.log('PASS: API em execução e cálculo compartilham o entorno confirmado nos três endereços.');
