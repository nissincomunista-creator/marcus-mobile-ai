const fs=require('fs');let s=fs.readFileSync('server.ts','utf8');s="import { declaredAuctionLocation, correctDeclaredAuctionLocation } from './src/utils/auctionLocation.ts';\nimport { canonicalStreet, resolveOfficialStreet } from './src/utils/streetMatching.ts';\n"+s;
s=s.replace('): AuctionProperty {\n  const state = (auc.state', '): AuctionProperty {\n  auc = correctDeclaredAuctionLocation(auc);\n  const state = (auc.state');
s=s.replace('let store = loadStore();',`let store = loadStore();
const correctedLocations = store.auctions.map(a => correctDeclaredAuctionLocation(a));
if (correctedLocations.some((a,i) => a !== store.auctions[i])) {
  store.auctions = recalculateAuctions(correctedLocations, store.itbiTransactions);
  saveStore(store);
}
`);
let a=s.indexOf("  const phon = phoneticStreet(street as string);",s.indexOf("app.get('/api/itbi/resolve-street'"));let b=s.indexOf("  return res.json({ found: false });",a);
s=s.slice(0,a)+`  const candidates = store.itbiTransactions.filter(t => normalizeString(t.state || '') === normalizeString(String(state)) && normalizeString(t.city || '') === normalizeString(String(city)) && t.street && t.neighborhood);
  const name = resolveOfficialStreet(String(street), [...new Set(candidates.map(t => t.street))]);
  if (name) {
    const matches = candidates.filter(t => canonicalStreet(t.street) === canonicalStreet(name));
    const neighborhoods = [...new Set(matches.map(t => t.neighborhood))];
    if (neighborhoods.length === 1) return res.json({found:true, neighborhood:neighborhoods[0],officialStreet:name,count:matches.length});
    return res.json({found:false, ambiguous:true, neighborhoods});
  }
`+s.slice(b);
fs.writeFileSync('server.ts',s);
let d=fs.readFileSync('src/components/Dashboard.tsx','utf8');d="import { declaredAuctionLocation } from '../utils/auctionLocation.ts';\n"+d;d=d.replaceAll("(a.state || 'SP').toUpperCase()", "(declaredAuctionLocation(a)?.state || a.state || '').toUpperCase()");fs.writeFileSync('src/components/Dashboard.tsx',d);
let sync=fs.readFileSync('auctioneerSyncService.ts','utf8');sync="import { declaredAuctionLocation } from './src/utils/auctionLocation.ts';\n"+sync;
sync=sync.replace('  for (const draft of allDrafts) {',`  for (const draft of allDrafts) {
    const declared = declaredAuctionLocation(draft);
    if (declared && (declared.state !== state || normalizeStr(declared.city) !== normalizeStr(city))) {
      pendingReview.push({draft,reason:'outside_requested_location'});
      continue;
    }
    if (declared) Object.assign(draft, declared);
`);
sync=sync.replace('Object.assign(existing, recalculateFn({ ...existing, origin: targetType,', 'Object.assign(existing, recalculateFn({ ...existing, state: draft.state, city: draft.city, neighborhood: draft.neighborhood, origin: targetType,');
fs.writeFileSync('auctioneerSyncService.ts',sync);
