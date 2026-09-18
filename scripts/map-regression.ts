import assert from 'node:assert/strict';
import { getPropertyCoordinates } from '../src/utils/geoCoords.ts';
import { propertyLocationKey, validOfficialLocation } from '../propertyLocationService.ts';
import { applySpiderfyClustering, exportToGeoJSON } from '../src/utils/geocodingPipeline.ts';
const source: any = { id:'one', address:'ESTRADA ADHEMAR BEBIANO, N. 4013, Apto 401, BL R', city:'Rio de Janeiro', state:'RJ', neighborhood:'Engenho Da Rainha', status:'located', source:'IBGE_CNEFE_2022', precision:'address', geocodeLevel:1, lat:-22.866237,lng:-43.293378,cnefeId:'45802117',matchedStreet:'ESTRADA ADHEMAR BEBIANO',matchedNumber:'4013',spreadMeters:0 };
const property:any = {...source, mapLocation:source};
assert.deepEqual(getPropertyCoordinates(property),[-22.866237,-43.293378]);
assert(validOfficialLocation(source));
for(const change of [{city:'Niterói'},{state:'MG'},{address:source.address.replace('4013','4015')},{address:source.address.replace('BL R','BL S')},{neighborhood:'Centro'}]) {
 assert.equal(getPropertyCoordinates({...property,...change}),null,'Changed identity must invalidate the marker');
 assert.notEqual(propertyLocationKey({...property,...change}),propertyLocationKey(property));
}
for(const change of [{lat:NaN},{lng:Infinity},{lat:0},{precision:'street'},{geocodeLevel:4},{spreadMeters:100},{source:'legacy'},{status:'pending'}]) assert.equal(getPropertyCoordinates({...property,mapLocation:{...source,...change}}),null);
assert.equal(getPropertyCoordinates({ ...property, mapLocation:undefined, status_geocodificacao:'EXATO_PREDIO', lat:-22.9,lng:-43.2 }),null,'Legacy exact labels are not evidence');
const geocoded:any[] = Array.from({length:350},(_,i)=>({id:String(i),lat:-22.866237,lon:-43.293378,precisa_revisao:false,status_geocodificacao:'EXATO_PREDIO'}));
const points = applySpiderfyClustering(geocoded);
assert.equal(points.size,350);
for(const point of points.values()) { assert.equal(point.displayLat,-22.866237);assert.equal(point.displayLon,-43.293378);assert.equal(point.isSpiderfied,false); }
const exported=exportToGeoJSON(geocoded);assert.equal(exported.features.length,350);
assert(exported.features.every((f:any)=>f.geometry.coordinates[0]===-43.293378 && f.geometry.coordinates[1]===-22.866237));
console.log('Map regressions passed: address identity, city/state/block isolation, provenance, invalid coordinates, 350 colocated records without displacement or truncation.');
