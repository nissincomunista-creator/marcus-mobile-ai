const fs=require('fs');let s=fs.readFileSync('auctioneerSyncService.ts','utf8');let a=s.indexOf('async function collectListingPages<');let b=s.indexOf('\nexport async function scrapeMegaLeiloes',a);
s=s.slice(0,a)+`export async function collectListingPages<T extends { link: string }>(page: any, read: () => Promise<T[]>): Promise<T[]> {
  const lots = new Map<string, T>();
  const visited = new Set<string>();
  const snapshots = new Set<string>();
  const pending: string[] = [];
  const startUrl = page.url();
  const report = { startUrl, checkedAt: new Date().toISOString(), pages: 0, found: 0, navigationExhausted: false, error: '' };
  try {
    while (true) {
      const rows = await read();
      const snapshot = page.url() + '|' + rows.map(row => row.link).sort().join('|');
      if (snapshots.has(snapshot)) { report.error = 'A navegação repetiu a mesma página; cobertura não confirmada.'; break; }
      snapshots.add(snapshot); visited.add(page.url()); report.pages++;
      for (const row of rows) if (row.link) lots.set(row.link, row);
      const navigation = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const available = (el: Element) => !el.closest('.disabled, [aria-disabled="true"]') && !(el as HTMLButtonElement).disabled;
        const next = links.find(a => available(a) && (a.rel === 'next' || /^(pr[oó]xim[ao]|seguinte|next|›|»|>)$/i.test((a.innerText || a.getAttribute('aria-label') || '').trim())));
        const children = links.filter(a => /\\/leilao\\/\\d+(?:\\/lotes)?(?:\\?|$)|\\/agenda(?:\\?|$)|\\/busca(?:\\?|$)/i.test(a.href)).map(a => a.href);
        return {next:next?.href || '',children};
      });
      pending.push(...navigation.children.filter((url:string) => !visited.has(url) && !pending.includes(url) && new URL(url).origin === new URL(page.url()).origin));
      let next = navigation.next && !visited.has(navigation.next) ? navigation.next : '';
      if (!next) {
        const clicked = await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => !el.closest('.disabled, [aria-disabled="true"]') && !(el as HTMLButtonElement).disabled && /^(carregar mais|mostrar mais|ver mais|load more|pr[oó]xim[ao]|seguinte|next)(?:\\s+(?:im[oó]veis|lotes|an[uú]ncios|resultados))?$/i.test((el.textContent || el.getAttribute('aria-label') || '').trim()));
          if (!button) return false;
          (button as HTMLElement).click(); return true;
        });
        if (clicked) { await page.waitForNetworkIdle({idleTime:750,timeout:15000}).catch(() => undefined); continue; }
        next = pending.find(url => !visited.has(url)) || '';
      }
      if (!next) { report.navigationExhausted = true; break; }
      if (new URL(next).origin !== new URL(startUrl).origin) { report.error = 'Paginação mudou de domínio.'; break; }
      await page.goto(next, {waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForNetworkIdle({idleTime:500,timeout:6000}).catch(() => undefined);
    }
  } catch (error:any) { report.error = error.message; }
  finally {
    report.found = lots.size;
    fs.mkdirSync('sync-audits/pages', {recursive:true});
    const name = new URL(startUrl).hostname.replace(/[^a-z0-9.-]/gi,'_');
    fs.writeFileSync('sync-audits/pages/' + name + '-' + Date.now() + '.json',JSON.stringify(report,null,2));
  }
  return [...lots.values()];
}
`+s.slice(b);
s=s.replace("    if (!isConfiguredAuctionLink(draft.auctionLink) || (lastKnownDate && lastKnownDate < today)) continue;", "    if (!isConfiguredAuctionLink(draft.auctionLink)) { pendingReview.push({draft,reason:'unverified_link'}); continue; }\n    if (lastKnownDate && lastKnownDate < today) { pendingReview.push({draft,reason:'past_date'}); continue; }");
let p=s.indexOf('    if (draft.sizeSqm <= 0) {',s.indexOf('  for (const draft of allDrafts)'));let q=s.indexOf('    const addressCity',p);
s=s.slice(0,p)+`    if (draft.sizeSqm <= 0 || draft.auctionPrice <= 0 || !lastKnownDate) {
      pendingReview.push({draft,reason: draft.auctionPrice <= 0 ? 'missing_price' : draft.sizeSqm <= 0 ? 'missing_area' : 'missing_date'});
      continue;
    }

`+s.slice(q);
s=s.replace("    if (addressCity && normalizeStr(addressCity) !== normalizeStr(city)) continue;", "    if (addressCity && normalizeStr(addressCity) !== normalizeStr(city)) { pendingReview.push({draft,reason:'outside_requested_city'}); continue; }");
fs.writeFileSync('auctioneerSyncService.ts',s);
