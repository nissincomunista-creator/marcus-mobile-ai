import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

export interface AuctioneerRecord {
  nome: string;
  matricula: string;
  dataMatricula?: string;
  cidade?: string;
  estado: string;
  telefones: string[];
  emails: string[];
  website?: string;
  websites: string[];
  origemPdf: string;
}

export interface AuctioneerAuditReport {
  totalCatalog: number;
  totalRjCatalog: number;
  totalMgCatalog: number;
  feedMapped: number;
  feedPendingScraper: number;
  mappedList: string[];
  pendingList: string[];
}

export async function parseAuctioneersPdf(customPdfPath?: string): Promise<AuctioneerRecord[]> {
  const potentialPaths = [
    customPdfPath,
    'C:\\Users\\Marcus\\OneDrive\\Desktop\\Junta Comercial do estado de Minas Gerais - JUCEMG.pdf',
    path.join(process.cwd(), 'Junta Comercial do estado de Minas Gerais - JUCEMG.pdf'),
    path.join(process.cwd(), 'assets', 'JUCEMG.pdf'),
    path.join(process.cwd(), 'assets', 'JUCERJA.pdf'),
    path.join(process.cwd(), 'dados', 'JUCEMG.pdf'),
    path.join(process.cwd(), 'dados', 'JUCERJA.pdf')
  ].filter(Boolean) as string[];

  const existingPaths = potentialPaths.filter(p => fs.existsSync(p));
  if (!existingPaths.length) {
    console.warn('[Auctioneer PDF Parser] Nenhum PDF de leiloeiros encontrado nos caminhos padrão.');
    return [];
  }

  const allRecords: AuctioneerRecord[] = [];

  for (const pdfPath of existingPaths) {
    try {
      console.log(`[Auctioneer PDF Parser] Processando: ${path.basename(pdfPath)}`);
      const dataBuffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      const text = typeof textResult === 'string' ? textResult : (textResult.text || '');

      const isRj = /jucerja|rio\s+de\s+janeiro/i.test(pdfPath) || /jucerja/i.test(text.slice(0, 1000));
      const defaultState = isRj ? 'RJ' : 'MG';

      // Split entries
      const blocks = text.split(/\n(?=[A-ZÀ-Ú][a-zà-úA-ZÀ-Ú\s.'-]+\n(?:Matr[íi]cula|MATR[ÍI]CULA):)/g);

      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;

        const matriculaLine = lines.find(l => /^Matr[íi]cula:/i.test(l));
        if (!matriculaLine) continue;

        const name = lines[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
        if (name.length < 3) continue;

        const matriculaMatch = matriculaLine.match(/Matr[íi]cula:\s*(\d+)(?:\s+de\s+(\d{2}\/\d{2}\/\d{4}))?/i);
        const matricula = matriculaMatch ? matriculaMatch[1] : '';
        const dataMatricula = matriculaMatch ? matriculaMatch[2] : undefined;

        // Website / URLs
        const urlMatches = block.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com\.br|adv\.br|imb\.br|lel\.br)\b/gi) || [];
        const websites = [...new Set(urlMatches.map(u => {
          let clean = u.replace(/[;,.)]+$/, '').toLowerCase();
          if (!clean.startsWith('http')) clean = 'https://' + clean;
          return clean;
        }).filter(u => !u.includes('@') && !u.includes('jucemg') && !u.includes('jucerja')))];

        // Emails
        const emails = [...new Set((block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map(e => e.toLowerCase()))];

        // Phones
        const phones = [...new Set((block.match(/\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g) || []))];

        // City & State
        let cidade: string | undefined = undefined;
        let estado = defaultState;
        const cityStateMatch = block.match(/-\s*([A-Za-zÀ-ÿ\s]+?)\s*-\s*([A-Z]{2})\b/);
        if (cityStateMatch) {
          cidade = cityStateMatch[1].trim();
          estado = cityStateMatch[2].trim().toUpperCase();
        } else {
          const directCityMatch = block.match(/\b(Belo Horizonte|Juiz de Fora|Contagem|Betim|Uberlândia|Rio de Janeiro|Niterói|Petrópolis|Volta Redonda)\b/i);
          if (directCityMatch) cidade = directCityMatch[1];
        }

        allRecords.push({
          nome: name,
          matricula,
          dataMatricula,
          cidade,
          estado,
          telefones: phones,
          emails,
          website: websites[0] || undefined,
          websites,
          origemPdf: path.basename(pdfPath)
        });
      }
    } catch (err: any) {
      console.error(`[Auctioneer PDF Parser] Erro ao processar ${pdfPath}:`, err.message);
    }
  }

  // Save to auctioneer_registry.json
  const registryPath = path.join(process.cwd(), 'auctioneer_registry.json');
  fs.writeFileSync(registryPath, JSON.stringify(allRecords, null, 2), 'utf8');
  console.log(`[Auctioneer PDF Parser] Catálogo gravado com ${allRecords.length} leiloeiros em ${registryPath}`);

  return allRecords;
}

export function auditAuctioneerCoverage(records: AuctioneerRecord[], storeAuctions: any[]): AuctioneerAuditReport {
  const norm = (s?: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

  // Extract all distinct auctioneers currently present in feed
  const feedAuctioneers = new Set<string>();
  for (const a of storeAuctions) {
    if (a.leiloeiro) feedAuctioneers.add(a.leiloeiro);
    if (a.auctioneerName) feedAuctioneers.add(a.auctioneerName);
  }

  const feedList = Array.from(feedAuctioneers).map(norm).filter(Boolean);

  const mappedList: string[] = [];
  const pendingList: string[] = [];

  for (const rec of records) {
    const normName = norm(rec.nome);
    const domain = rec.website ? rec.website.replace(/^https?:\/\/(?:www\.)?/, '').split('/')[0] : '';

    const isMatched = feedList.some(feedName => {
      if (normName.length > 5 && feedName.includes(normName)) return true;
      if (feedName.length > 5 && normName.includes(feedName)) return true;
      if (domain && feedName.includes(domain)) return true;
      return false;
    });

    if (isMatched) {
      mappedList.push(rec.nome);
    } else {
      pendingList.push(rec.nome);
    }
  }

  const rjRecords = records.filter(r => r.estado === 'RJ');
  const mgRecords = records.filter(r => r.estado === 'MG');

  const report: AuctioneerAuditReport = {
    totalCatalog: records.length,
    totalRjCatalog: rjRecords.length,
    totalMgCatalog: mgRecords.length,
    feedMapped: mappedList.length,
    feedPendingScraper: pendingList.length,
    mappedList,
    pendingList
  };

  console.log(`[Audit] Leiloeiros ativos no RJ: ${rjRecords.length} | Mapeados no feed: ${mappedList.length} | Pendentes de scraper direto: ${pendingList.length}`);

  return report;
}

// Standalone execution
if (process.argv[1]?.includes('parseAuctioneersPdf')) {
  (async () => {
    const records = await parseAuctioneersPdf();
    let auctions: any[] = [];
    try {
      const storeData = JSON.parse(fs.readFileSync('data_store.json', 'utf8'));
      auctions = storeData.auctions || [];
    } catch {}
    auditAuctioneerCoverage(records, auctions);
  })();
}
