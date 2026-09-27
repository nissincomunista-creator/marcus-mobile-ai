import assert from 'node:assert/strict';
import { extractAddress } from '../auctioneerSyncService.ts';
import { parseAddressComponents } from '../src/utils/addressComponents.ts';

assert.deepEqual(
  parseAddressComponents('Apartamento localizado na Rua Guimaraes Junior, nº 735, apartamento 72, Juiz de Fora/MG'),
  { street: 'Rua Guimaraes Junior', number: '735', complement: 'apartamento 72' }
);
assert.deepEqual(
  parseAddressComponents('Rua 35, nº 400 - Bairro São Mateus, Juiz de Fora/MG'),
  { street: 'Rua 35', number: '400', complement: '' }
);
assert.deepEqual(
  parseAddressComponents('Endereço: Av. José Luiz Ferraz 400, bloco 2'),
  { street: 'Avenida José Luiz Ferraz', number: '400', complement: 'bloco 2' }
);
assert.deepEqual(
  parseAddressComponents('Rua 35'),
  { street: 'Rua 35', number: '', complement: '' },
  'A numeração que faz parte do nome da rua não pode virar o número do imóvel'
);

assert.equal(
  extractAddress('Apartamento localizado na Rua Guimaraes Junior, nº 735, apartamento 72, Juiz de Fora/MG', ''),
  'Rua Guimaraes Junior, nº 735, apartamento 72'
);
assert.equal(
  extractAddress('Endereço: Rua 35, nº 400 - Bairro São Mateus, Juiz de Fora/MG', ''),
  'Rua 35, nº 400'
);
assert.deepEqual(
  parseAddressComponents(extractAddress('Avenida José Luiz Ferraz, 400, bloco 2, Recreio dos Bandeirantes', '')),
  { street: 'Avenida José Luiz Ferraz', number: '400', complement: 'bloco 2' }
);

console.log('Auction address parsing passed: labeled descriptions, street numbers, unit details, and numbered street names are separated correctly.');
