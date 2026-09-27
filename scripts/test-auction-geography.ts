import assert from 'node:assert/strict';
import { sourceAuctionLocation, sourceNeighborhoodLocation, sourceTargetCityLocation } from '../src/utils/auctionGeography.ts';
import { allowedSyncLocation } from '../src/utils/auctionSyncScope.ts';

const silasIraja = 'APARTAMENTO IRAJÁ, Av. Brasil, nº 17475, Irajá - RJ - 32m²';
const niteroiAddress = 'Rua Belisário Augusto, 100, apto 102, Icaraí, Niterói, Rio de Janeiro';
const juizDeForaAddress = 'Apartamento, Rua Guaçuí, 35, São Mateus, Juiz de Fora';

assert.deepEqual(sourceNeighborhoodLocation(silasIraja), { city: 'Rio de Janeiro', state: 'RJ' });
assert.deepEqual(sourceTargetCityLocation(niteroiAddress), { city: 'Niterói', state: 'RJ' });
assert.deepEqual(sourceTargetCityLocation(juizDeForaAddress), { city: 'Juiz de Fora', state: 'MG' });
assert.deepEqual(sourceAuctionLocation('Rua Guaçuí, 35, Juiz de Fora/MG'), { city: 'Juiz de Fora', state: 'MG' });

for (const location of [
  sourceNeighborhoodLocation(silasIraja),
  sourceTargetCityLocation(niteroiAddress),
  sourceTargetCityLocation(juizDeForaAddress)
]) {
  assert.ok(location && allowedSyncLocation(location.city, location.state));
}

assert.equal(sourceTargetCityLocation('Leiloeiro no Rio de Janeiro'), null, 'a city in site chrome without property address is ignored');
assert.equal(sourceNeighborhoodLocation('Apartamento no Centro, RJ'), null, 'generic neighbourhoods cannot guess the municipality');
assert.equal(sourceTargetCityLocation('Apartamento em Maricá, RJ'), null, 'out-of-scope cities are never promoted into the target set');

console.log('Auction geography fallbacks resolve official target-city formats without widening scope.');
