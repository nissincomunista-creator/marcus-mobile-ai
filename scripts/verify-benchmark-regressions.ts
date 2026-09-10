import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { computeBidirectionalBenchmarks, cleanStreetCore } from '../src/utils/bidirectionalBenchmark.ts';

const store = JSON.parse(gunzipSync(readFileSync('data_store.json.gz')).toString());
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const neighborhood = store.itbiTransactions.filter((t: any) => normalize(t.neighborhood || '') === 'engenho da rainha' && t.propertyType === 'Apartamento');
const result = computeBidirectionalBenchmarks(neighborhood, 'Estrada Adhemar Bebiano', '4106', 50, 'similar', 0.5, 'Apartamento');
assert(result && result.predio.validas > 0);
assert(result.mediaCorteReal < 4500, 'O preço do prédio barato não pode ser substituído pelo grupo caro da rua');
assert.equal(cleanStreetCore('Rua Nossa Senhora da Paz'), 'nossa senhora da paz');
const building = store.itbiTransactions.filter((t: any) => /lygia|ligia/i.test(t.street || '') && String(t.number) === '270');
const similar = building.filter((t: any) => t.sizeSqm >= Math.round(65 * 0.67) && t.sizeSqm <= Math.round(65 * 1.33));
assert(similar.some((t: any) => t.sizeSqm === 45), '45m2 deve participar do recorte de 65m2 +/-33%');
assert(similar.every((t: any) => building.includes(t)));

const oneStreetSample = [
  { id: 'street', street: 'Rua das Dálias', number: '20', sizeSqm: 177, unitValueSqm: 4762, propertyType: 'Casa', distanceKm: 0 },
  { id: 'near-1', street: 'Rua A', number: '1', sizeSqm: 160, unitValueSqm: 3600, propertyType: 'Casa', distanceKm: 0.2 },
  { id: 'near-2', street: 'Rua B', number: '2', sizeSqm: 190, unitValueSqm: 3900, propertyType: 'Casa', distanceKm: 0.3 },
  { id: 'near-3', street: 'Rua C', number: '3', sizeSqm: 150, unitValueSqm: 3850, propertyType: 'Casa', distanceKm: 0.4 },
  { id: 'wide-1', street: 'Rua D', number: '4', sizeSqm: 45, unitValueSqm: 2600, propertyType: 'Casa', distanceKm: 0.25 },
  { id: 'wide-2', street: 'Rua E', number: '5', sizeSqm: 500, unitValueSqm: 2900, propertyType: 'Casa', distanceKm: 0.45 }
] as any;
const oneStreetSimilar = computeBidirectionalBenchmarks(oneStreetSample, 'Rua das Dálias', '135', 177, 'similar', 0.5, 'Casa');
const oneStreetAll = computeBidirectionalBenchmarks(oneStreetSample, 'Rua das Dálias', '135', 177, 'all', 0.5, 'Casa');
assert(oneStreetSimilar && oneStreetAll);
assert.equal(oneStreetSimilar.rua.validas, 1);
assert.equal(oneStreetAll.rua.validas, 1);
assert.equal(oneStreetSimilar.rua.saneada, 4762);
assert.equal(oneStreetAll.rua.saneada, 4762);
assert.equal(oneStreetSimilar.nivelUtilizado, 'Rua');
assert.equal(oneStreetAll.nivelUtilizado, 'Rua');

console.log(JSON.stringify({
  adhemar: { street: result.rua, building: result.predio, exitSqm: result.flipRapidoSqm },
  similarAreas: similar.map((t: any) => t.sizeSqm),
  oneStreetSample: {
    similar: { streetSqm: oneStreetSimilar.rua.saneada, flipSqm: oneStreetSimilar.flipRapidoSqm, source: oneStreetSimilar.nivelUtilizado },
    all: { streetSqm: oneStreetAll.rua.saneada, flipSqm: oneStreetAll.flipRapidoSqm, source: oneStreetAll.nivelUtilizado }
  }
}, null, 2));
