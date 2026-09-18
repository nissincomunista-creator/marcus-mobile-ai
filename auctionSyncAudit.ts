import { AsyncLocalStorage } from 'node:async_hooks';

export interface SourceAudit {
  source: string;
  url?: string;
  pages?: number;
  found?: number;
  complete: boolean;
  error?: string;
}
export const auctionSyncAudit = new AsyncLocalStorage<SourceAudit[]>();
export function recordSourceAudit(report: SourceAudit) {
  auctionSyncAudit.getStore()?.push(report);
}
