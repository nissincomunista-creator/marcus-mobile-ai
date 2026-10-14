import type { AuctionProperty } from '../src/types.ts';
import type { Availability } from './lifecycle.ts';
import { isRetired } from './lifecycle.ts';
import { aggregateAuctions } from './aggregation.ts';

/** Retire exactly the source that disappeared, then select any remaining live offer. */
export function retireAuctionSource(parent: AuctionProperty, url: string, result: Availability, canonicalize: (url:string)=>string) {
  const { sourceRecords, offers, ...primary } = parent;
  const records = new Map((sourceRecords || []).map(a => [canonicalize(a.auctionLink || ''), a]));
  records.set(canonicalize(parent.auctionLink || ''), primary as AuctionProperty);
  const source = records.get(canonicalize(url));
  if (!source) return false;
  Object.assign(source, { sourceClosed:true, availability:result, sourceAvailability:result, ingestionStatus:result.status || 'finalizado' });
  const merged = aggregateAuctions([...records.values()], canonicalize)[0];
  Object.assign(parent, merged, { id:parent.id, saved:parent.saved, sourceClosed:isRetired(merged) });
  return true;
}
