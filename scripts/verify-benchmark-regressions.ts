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
console.log(JSON.stringify({ adhemar: { street: result.rua, building: result.predio, exitSqm: result.flipRapidoSqm }, similarAreas: similar.map((t: any) => t.sizeSqm) }, null, 2));
