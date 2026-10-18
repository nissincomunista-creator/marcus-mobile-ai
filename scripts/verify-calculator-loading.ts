import assert from 'node:assert/strict';
import { filterStreetSuggestions, fetchCalculatorJson, parseCalculatorBRL } from '../src/utils/calculatorItbi.ts';
import { computeBidirectionalBenchmarks } from '../src/utils/bidirectionalBenchmark.ts';

const base = process.env.APP_URL || 'http://localhost:3000';
assert.equal(parseCalculatorBRL('60.288,49'), 60288.49);
assert.equal(parseCalculatorBRL('60288,49'), 60288.49);
assert.equal(parseCalculatorBRL('R$ 60.288,49'), 60288.49);
assert.equal(parseCalculatorBRL('60,'), 60);
assert.equal(parseCalculatorBRL('60288'), 60288);
assert.equal(parseCalculatorBRL(''), 0);
assert(Number.isNaN(parseCalculatorBRL('60,288,49')));
const streets = await fetchCalculatorJson(`${base}/api/itbi/streets?${new URLSearchParams({ state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'PENHA CIRCULAR' })}`);
assert(streets.length > 50);
assert.equal(filterStreetSuggestions(streets, '').length, streets.length, 'Abrir lista não a filtra pelo endereço pré-preenchido');
assert(filterStreetSuggestions(streets, 'flaminia').some(s => s.street === 'Rua Flamínia'));
assert.equal(filterStreetSuggestions(streets, 'logradouro inexistente').length, 0);
const params = new URLSearchParams({ state: 'RJ', city: 'Rio de Janeiro', neighborhood: 'PENHA CIRCULAR', targetStreet: 'RUA IBICUI', targetNumber: '238, apartamento 202', propertyType: 'Apartamento', includeRadius: 'true', propertyId: 'auc-caixa-8021270008809' });
const tx = await fetchCalculatorJson(`${base}/api/itbi/transactions?${params}`);
const result = computeBidirectionalBenchmarks(tx.transactions, 'RUA IBICUI', '238', 57, 'similar', .5, 'Apartamento', 'PENHA CIRCULAR', undefined, tx.radiusTransactions);
assert(result?.hasMicroData && result.flipTotal > 0);
assert.equal(result.predio.validas, 0, 'Não inventa vendas no prédio ausentes da base');
assert(result.raio.validas >= 5);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('Falha', { status: 503 });
  await assert.rejects(fetchCalculatorJson('/unavailable'), /503/);
  globalThis.fetch = async () => new Response('<html>App</html>', { headers: { 'content-type': 'text/html' } });
  await assert.rejects(fetchCalculatorJson('/invalid'), /inválida/);
} finally { globalThis.fetch = originalFetch; }
console.log('PASS: sugestões do bairro, busca sem acento, falhas HTTP/HTML e cálculo real da Rua Ibicuí.', { streets: streets.length, comparableRadius: result.raio.validas });
