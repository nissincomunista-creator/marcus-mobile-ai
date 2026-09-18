const fs=require('fs');let s=fs.readFileSync('server.ts','utf8');
s="import { getOfficialPropertyLocation } from './propertyLocationService.ts';\n"+s;
s=s.replace("const point = getCachedCoords(a.address, a.neighborhood, a.city, a.state);\n    return point?.precision === 'rooftop' ? [{ id: a.id, address: a.address, ...point }] : [];", "const point = getOfficialPropertyLocation(a);\n    return [point];");
s=s.replace("const point = getCachedCoords(a.address, a.neighborhood, a.city, a.state);\n    if (point?.precision !== 'rooftop') continue;", "const point = getOfficialPropertyLocation(a);\n    if (point.status !== 'located') continue;");
s=s.replace('inside.push({ ...a, lat, lng, status_geocodificacao: geocodeStatus });','inside.push({ ...a, lat, lng, status_geocodificacao: geocodeStatus, precisa_revisao: false, mapLocation: point } as AuctionProperty);');
s=s.replace('// GET /api/auctions/bbox - Bounding Box estilo Zap Imóveis / Airbnb (Cap estrito de 150 imóveis)','// All verified locations inside the requested viewport. No silent truncation.');fs.writeFileSync('server.ts',s);
