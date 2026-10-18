import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locationAddress, addressUnits } from '../src/utils/locationAddress.ts';
import { getOfficialPropertyLocation, validOfficialLocation } from '../propertyLocationService.ts';

const p = { address: 'Rua da República, 386, Quintino Bocaiúva, Rio de Janeiro/RJ',
  description: 'Rua da República n° 386 – Apto. nº 108 – Bloco 03 – Condomínio Residencial República.' };
assert.deepEqual(addressUnits(locationAddress(p)), { bloco: '3', apartamento: '108' });
assert.equal(locationAddress({ ...p, description: 'Rua Outra, 386, bloco 2' }), p.address);
assert.equal(locationAddress({ ...p, description: p.description + '\nRua da República, 386, bloco 4' }), p.address);
const auctions = JSON.parse(readFileSync('data_store.json', 'utf8')).auctions;
const actual = auctions.find((a: any) => a.id === 'auc-biasi-5bdc913c525a2fa614e6');
assert(actual, 'Caso real Biasi deve estar disponível');
const point = getOfficialPropertyLocation(actual);
assert(validOfficialLocation(point));
assert.equal(point.complements?.bloco, '3');
assert.equal(point.complements?.apartamento, '108');
assert.equal(point.cnefeId, '104246035');
const ambiguous = getOfficialPropertyLocation({ address: p.address, city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Quintino Bocaiuva' });
assert.equal(ambiguous.status, 'pending', 'Sem bloco, não escolher aleatoriamente entre prédios distintos');
const manual = getOfficialPropertyLocation({ address: 'Rua da República, 386, bloco 03, apartamento 108', city: 'Rio de Janeiro', state: 'RJ', neighborhood: 'Quintino Bocaiuva' });
assert.equal(manual.cnefeId, point.cnefeId);
console.log('PASS: complemento oficial recuperado, bloco 3/apto 108 localizado e endereço ambíguo rejeitado.', {lat: point.lat, lng: point.lng});
