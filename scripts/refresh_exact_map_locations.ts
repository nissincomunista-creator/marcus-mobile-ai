import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { geocodePendingPropertyLocations, validOfficialLocation } from '../propertyLocationService.ts';

const store = JSON.parse(gunzipSync(readFileSync('data_store.json.gz')).toString());
const properties = (store.auctions || []).map((property: any) => ({
  id: property.id,
  address: property.address || '',
  city: property.city || '',
  state: property.state || '',
  neighborhood: property.neighborhood || ''
}));

await geocodePendingPropertyLocations(properties);

const locations = JSON.parse(readFileSync('official_property_locations.json', 'utf8'));
const byId = new Map(locations.map((row: any) => [row.id, row]));
const summary = { total: properties.length, located: 0, pending: 0, noNumber: 0, exactGeocoder: 0, cnefe: 0 };
for (const property of properties) {
  const row: any = byId.get(property.id);
  if (row && validOfficialLocation(row)) {
    summary.located++;
    if (row.source === 'GEOCODE_NUMBER') summary.exactGeocoder++;
    if (row.source === 'IBGE_CNEFE_2022') summary.cnefe++;
  } else {
    summary.pending++;
    if (row?.reason === 'missing_number') summary.noNumber++;
  }
}
console.log(JSON.stringify(summary, null, 2));
