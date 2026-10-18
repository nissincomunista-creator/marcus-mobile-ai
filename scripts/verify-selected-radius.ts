import assert from 'node:assert/strict';
import { selectRadiusTransactions } from '../src/utils/itbiRadius.ts';
import { computeBidirectionalBenchmarks } from '../src/utils/bidirectionalBenchmark.ts';
import type { ItbiTransaction } from '../src/types.ts';

const row = (id: string, distanceKm: number, extra = {}): ItbiTransaction => ({
  id, city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Bairro vizinho',
  street: 'Rua Vizinha', number: '10', propertyType: 'Apartamento',
  sizeSqm: 80, transactionValue: 400000, unitValueSqm: 5000,
  date: '2026-01-01', distanceKm, transactionLocationPrecision: 'exact_number',
  distanceAnchorPrecision: 'official_address', ...extra
} as ItbiTransaction);
const radius = [row('inside', .2), row('boundary', .5), row('outside', .50001),
  row('one-km', .8), row('null', null as any), row('negative', -.1),
  row('centroid', .1, { transactionLocationPrecision: 'street_centroid' }),
  row('bad-anchor', .1, { distanceAnchorPrecision: 'street_axis' }),
  row('same-street', .3, { street: 'Rua do Alvo' })];
assert.deepEqual(selectRadiusTransactions(radius, .5).map(t => t.id), ['inside', 'boundary', 'same-street']);
assert.equal(selectRadiusTransactions(radius, 1).length, 5);

const local = [row('local', 0, { street: 'Rua do Alvo', neighborhood: 'Bairro do alvo' })];
const compute = (base: ItbiTransaction[], rows: ItbiTransaction[], km = .5, model?: any) =>
  computeBidirectionalBenchmarks(base, 'Rua do Alvo', '10', 80, 'similar', km, 'Apartamento', 'Bairro do alvo', model, rows)!;
assert.equal(compute(local, radius).raio.total, 3);
assert.equal(compute(local, radius, 1).raio.total, 5);
assert.equal(compute([], radius).raio.total, 3, 'Bairro sem transações não apaga o círculo geográfico');
assert.equal(compute([], radius).bairro.total, 0, 'O entorno não vira uma amostra inventada do bairro');
assert.equal(compute(local, [row('far', .8)]).raio.total, 0, 'Não expande automaticamente');

const jf = (tx: ItbiTransaction) => ({ ...tx, state: 'MG', city: 'Juiz de Fora', isCompraEVenda: true });
const jfRadius = [jf(row('jf1', .1)), jf(row('jf2', .2)), jf(row('not-sale', .2, { isCompraEVenda: false }))];
jfRadius[2].isCompraEVenda = false;
const model = { referenceAreaSqm: 80, referenceValue: 400000, minAreaSqm: 40, maxAreaSqm: 160, elasticity: .7, confidence: 'high', sampleCount: 20, rSquared: .9, source: 'official_appraisals' };
const jfResult = compute(local.map(jf), jfRadius, .5, model);
assert.equal(jfResult.raio.total, 2, 'JF aceita outra vizinhança dentro do raio e somente compra e venda');
assert.equal(jfResult.raio.validas, 2);
assert.equal(compute([], jfRadius, .5, model).raio.validas, 2);
console.log('PASS: círculo selecionado, limite exato, mesma rua, outro bairro, bairro vazio, JF, coordenadas inválidas e sem expansão.');
