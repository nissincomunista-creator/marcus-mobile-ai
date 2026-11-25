import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { NEXUS_AUCTIONEERS, type NexusAuctioneerEntry } from '../src/utils/nexusAuctioneers.ts';

const MANUAL_CORE_DOMAINS = new Set([
  'portalzuk.com.br', 'megaleiloes.com.br', 'frazaoleiloes.com.br', 'biasileiloes.com.br',
  'sold.com.br', 'pestanaleiloes.com.br', 'superbid.net', 'leilaoimovel.com.br',
  'leilaovip.com.br', 'freitasleiloeiro.com.br', 'isaiasleiloes.com.br',
  'alexandrecostaleiloes.com.br', 'fabianoayuppleiloeiro.com.br', 'rioleiloes.com.br',
  'leiloesmariafilomena.com.br', 'mgl.com.br', 'leiloei.com', 'vitrinebradesco.com.br',
  'santanderimoveis.com.br', 'emgeaimoveis.com.br', 'seuimovelbb.com.br',
  'ricartleiloes.com.br', 'pamelaleiloeira.com.br', 'gustavoleiloeiro.com.br',
  'onildobastos.com.br', 'schulmannleiloes.com.br', 'saraivaleiloes.com.br',
  'rymerleiloes.com.br', 'depaulaonline.com.br', 'jvleiloes.lel.br',
  'paulobotelholeiloeiro.com.br', 'alexandroleiloeiro.com.br', 'portellaleiloes.com.br',
  'silasleiloeiro.lel.br', 'joaoemilio.com.br', 'facanhaleiloes.com.br',
  'jonasleiloeiro.com.br', 'fernandoleiloeiro.com.br', 'comprei.pgfn.gov.br',
  'rogeriomenezes.com.br', 'brameleiloes.com.br', 'lancejudicial.com.br',
  'grupolance.com.br'
]);

const AGGREGATOR_DOMAINS = new Set([
  'leilaoimovel.com.br', 'imovelweb.com.br', 'zapimoveis.com.br', 'vivareal.com.br',
  'quintoandar.com.br', 'olx.com.br', 'superbid.net', 'portalzuk.com.br', 'comprei.pgfn.gov.br'
]);

function normalizeDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return String(rawUrl || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase().trim();
  }
}

function makeId(domain: string): string {
  return domain.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function mapSituation(raw: string, domain: string): string {
  const s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (AGGREGATOR_DOMAINS.has(domain) || s.includes('agregador')) return 'agregador';
  if (s.includes('com imove')) return 'com_imoveis';
  if (s.includes('sem imove')) return 'sem_imoveis';
  if (s.includes('indispon') || s.includes('fora do ar')) return 'site_indisponivel';
  if (s.includes('atualiza')) return 'em_atualizacao';
  if (s.includes('outro') || s.includes('mostrar na lista')) return 'outro_site';
  return s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'em_atualizacao';
}

async function main() {
  const res = await fetch('https://nexusleiloes.com.br/leiloeiros', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const existingByDomain = new Map<string, NexusAuctioneerEntry>();
  for (const e of NEXUS_AUCTIONEERS) {
    existingByDomain.set(e.domain.replace(/^www\./i, '').toLowerCase(), e);
  }

  const mergedByDomain = new Map<string, NexusAuctioneerEntry>();
  let liveCount = 0;
  let newAdded = 0;

  $('li[id^="leiloeiro-"]').each((_, el) => {
    const name = $(el).find('p').first().text().replace(/\s+/g, ' ').trim();
    const aEl = $(el).find('a[href^="http"]').first();
    const href = (aEl.attr('href') || '').trim();
    if (!href || !name) return;

    const domain = normalizeDomain(href);
    if (!domain || domain.includes('nexusleiloes.com.br')) return;

    liveCount++;
    const badge = $(el).find('span').first().text().replace(/\s+/g, ' ').trim();
    const qtyText = $(el).find('p').last().text().replace(/\D+/g, '');
    const qty = qtyText ? Number(qtyText) : 0;
    const situacao = mapSituation(badge, domain);

    // Keep manual core domains out of duplicate Nexus block if they are exact duplicates of AUCTIONEER_PORTALS manual head?
    // Actually include ALL of them ONLY if not in MANUAL_CORE_DOMAINS, OR skip exact core duplicates so listedPortalSync runs clean 1x per domain.
    if (MANUAL_CORE_DOMAINS.has(domain)) return;

    const prev = existingByDomain.get(domain);
    if (!prev) newAdded++;

    const baseUrl = prev?.baseUrl && normalizeDomain(prev.baseUrl) === domain
      ? prev.baseUrl
      : href.replace(/\/$/, '');

    const enabled = situacao !== 'site_indisponivel';

    const entry: NexusAuctioneerEntry = {
      id: prev?.id || makeId(domain),
      name: name || prev?.name || domain,
      domain,
      ...(prev?.aliasDomains?.length ? { aliasDomains: prev.aliasDomains } : {}),
      baseUrl,
      ...(prev?.searchUrl ? { searchUrl: prev.searchUrl } : {}),
      ...(prev?.suporteApi ? { suporteApi: true } : {}),
      genericScrape: true,
      enabled,
      nexusImoveis: qty,
      nexusSituacao: situacao,
    };
    mergedByDomain.set(domain, entry);
  });

  // Preserve any older mapped Nexus entries that still had enabled status and weren't seen (e.g. pagination/edge cases)
  for (const [dom, prev] of existingByDomain.entries()) {
    if (!mergedByDomain.has(dom) && !MANUAL_CORE_DOMAINS.has(dom)) {
      mergedByDomain.set(dom, prev);
    }
  }

  const finalList = [...mergedByDomain.values()].sort((a, b) => {
    const rank = (x: NexusAuctioneerEntry) =>
      x.nexusSituacao === 'com_imoveis' ? 0
      : x.nexusSituacao === 'agregador' ? 1
      : x.nexusSituacao === 'em_atualizacao' ? 2
      : x.nexusSituacao === 'outro_site' ? 3
      : x.nexusSituacao === 'sem_imoveis' ? 4
      : 5;
    return rank(a) - rank(b) || (b.nexusImoveis || 0) - (a.nexusImoveis || 0) || a.name.localeCompare(b.name, 'pt-BR');
  });

  const out = `// Leiloeiros extraídos e verificados link a link de https://nexusleiloes.com.br/leiloeiros\n`
    + `// Inclui baseUrl real (com/sem www e redirecionamentos), searchUrl de imóveis e detecção de API Suporte.\n`
    + `export interface NexusAuctioneerEntry {\n`
    + `  id: string;\n`
    + `  name: string;\n`
    + `  domain: string;\n`
    + `  aliasDomains?: string[];\n`
    + `  baseUrl: string;\n`
    + `  searchUrl?: string;\n`
    + `  suporteApi?: boolean;\n`
    + `  genericScrape: boolean;\n`
    + `  enabled: boolean;\n`
    + `  nexusImoveis?: number;\n`
    + `  nexusSituacao?: string;\n`
    + `}\n\n`
    + `export const NEXUS_AUCTIONEERS: NexusAuctioneerEntry[] = ${JSON.stringify(finalList, null, 2)};\n`;

  fs.writeFileSync('src/utils/nexusAuctioneers.ts', out, 'utf8');

  const sitSummary: Record<string, number> = {};
  for (const x of finalList) sitSummary[x.nexusSituacao || 'unknown'] = (sitSummary[x.nexusSituacao || 'unknown'] || 0) + 1;
  console.log({
    liveNexusRows: liveCount,
    savedNexusEntries: finalList.length,
    newAdded,
    enabledCount: finalList.filter(x => x.enabled).length,
    sitSummary,
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
