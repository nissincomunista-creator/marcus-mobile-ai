import { assessAvailability, isRetired, lifecycleDates, type Availability } from './lifecycle.ts';
import type { AuctionProperty } from '../src/types.ts';

export type AuditTarget = { url: string; parentIds: string[]; snapshot: AuctionProperty };
export function availabilityTargets(auctions: AuctionProperty[]): AuditTarget[] {
  const targets = new Map<string, AuditTarget>();
  for (const parent of auctions) {
    const { sourceRecords, offers, ...primary } = parent;
    for (const row of [...(sourceRecords || []), primary as AuctionProperty]) {
      if (!row.auctionLink || isRetired(row)) continue;
      let url: string;
      try {
        const parsed = new URL(row.auctionLink);
        if (!['http:', 'https:'].includes(parsed.protocol)) continue;
        parsed.hash = ''; url = parsed.href;
      } catch { continue; }
      const existing = targets.get(url);
      if (existing) {
        if (!existing.parentIds.includes(parent.id)) existing.parentIds.push(parent.id);
      } else targets.set(url, { url, parentIds: [parent.id], snapshot: row });
    }
  }
  return [...targets.values()].sort((a,b)=>(Date.parse(a.snapshot.availability?.checkedAt||'')||0)-(Date.parse(b.snapshot.availability?.checkedAt||'')||0));
}

/** Audit every selected URL, at most six requests globally and two per host. */
export async function auditAvailability(
  targets: AuditTarget[],
  apply: (target: AuditTarget, result: Availability, html?: string) => void | Promise<void>,
  fetcher: typeof fetch = fetch,
) {
  const pending = [...targets];
  const active = new Set<Promise<void>>();
  const hosts = new Map<string, number>();
  const failures = new Map<string, number>();
  const report = { total: targets.length, checked: 0, retired: 0, unconfirmed: 0, skipped: 0 };
  while (pending.length || active.size) {
    while (active.size < 6) {
      const index = pending.findIndex(t => (hosts.get(new URL(t.url).host) || 0) < 2);
      if (index < 0) break;
      const target = pending.splice(index, 1)[0], host = new URL(target.url).host;
      hosts.set(host, (hosts.get(host) || 0) + 1);
      let task: Promise<void>;
      task = (async () => {
        const checkedAt = new Date().toISOString();
        if ((failures.get(host) || 0) >= 3) {
          await apply(target, { ...target.snapshot.availability, url:target.url, checkedAt,
            state:target.snapshot.availability?.state || 'unknown', reason:'Fonte temporariamente inacessível nesta execução; verificação pendente' });
          report.checked++; report.unconfirmed++; report.skipped++;
          return;
        }
        let status = 0, html = '', finalUrl = target.url;
        try {
          const response = await fetcher(target.url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
          status = response.status; finalUrl = response.url || target.url;
          html = await response.text();
        } catch { /* Network errors are inconclusive, never evidence of removal. */ }
        const result = assessAvailability(target.snapshot.availability, target.url, status, html, checkedAt,
          { finalUrl, dates: lifecycleDates(target.snapshot), saleMode: target.snapshot.saleMode });
        failures.set(host, /Consulta bloqueada/.test(result.reason) ? (failures.get(host) || 0) + 1 : 0);
        await apply(target, result, html);
        report.checked++;
        if (isRetired({ availability: result })) report.retired++;
        else if (result.reason !== 'Disponibilidade explícita na fonte') report.unconfirmed++;
      })().finally(() => { active.delete(task); hosts.set(host, (hosts.get(host) || 1) - 1); });
      active.add(task);
    }
    if (active.size) await Promise.race(active);
  }
  return report;
}
