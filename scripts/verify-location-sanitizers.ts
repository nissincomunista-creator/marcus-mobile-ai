import assert from 'node:assert/strict';
import { enrichLocation, neighborhoodEvidence } from '../auctionPipeline/location.ts';
import { sanitizeNeighborhoodLabel } from '../src/utils/locationSanitizers.ts';

assert.equal(sanitizeNeighborhoodLabel('N'), '');
assert.equal(sanitizeNeighborhoodLabel('São Mateus'), 'São Mateus');
const parsed = { state: 'MG', city: 'Juiz de Fora', neighborhood: 'N', address: 'Rua Guimaraes Junior, 735' };
assert.equal(neighborhoodEvidence(parsed), undefined, 'A letra de um complemento ou rótulo não pode virar bairro');
assert.equal(enrichLocation(parsed).neighborhood, '', 'Sem bairro confirmado, o endereço deve permanecer sem bairro inventado');

console.log('Auction location sanitation passed: invalid single-letter neighborhood stays blank while address remains intact.');
