import assert from 'node:assert/strict';
import { declaredAuctionLocation, correctDeclaredAuctionLocation } from '../src/utils/auctionLocation.ts';
import { locationOptions, selectOfficialOption } from '../src/utils/locationOptions.ts';
const rows=[{state:'RJ',city:'Rio de Janeiro',neighborhood:'Cocotá'},{state:'RJ',city:'Niterói',neighborhood:'Centro'},{state:'MG',city:'Juiz de Fora',neighborhood:'Centro'}];
assert.equal(selectOfficialOption('Niteroi',locationOptions(rows,'RJ').cities),'Niterói');
assert.equal(selectOfficialOption('Rio de Janeiro/RJ Valor Inicial',locationOptions(rows,'RJ','Rio de Janeiro').neighborhoods),'');
assert.equal(selectOfficialOption('Juiz de Fora',locationOptions(rows,'RJ').cities),'');
for(const [title,state,city] of [['Maringá/PR - Parque das Grevíleas - Casa com 475m²','PR','Maringá'],['Salvador/BA - Alphaville I - Casa com 738m²','BA','Salvador'],['Itajaí/SC - Centro - Apartamento com 317m²','SC','Itajaí']]) {
 const old={title,state:'RJ',city:'Rio de Janeiro',neighborhood:'COCOTA',address:`Rua Pajuçara, 7, ${city}/${state}, Rio de Janeiro - RJ`,itbiStreetAvgSqm:999,calculatedProfit:999,estimatedValue:999};
 assert.deepEqual(declaredAuctionLocation(old),{state,city});const corrected=correctDeclaredAuctionLocation(old);assert.equal(corrected.state,state);assert.equal(corrected.city,city);assert.equal(corrected.itbiStreetAvgSqm,undefined);assert(!corrected.address.endsWith('Rio de Janeiro - RJ'));assert.equal(correctDeclaredAuctionLocation(corrected),corrected);
}
console.log('PASS: canonical selectors, invalid neighborhood rejection, city isolation, PR/BA/SC contamination regression and idempotent correction');
