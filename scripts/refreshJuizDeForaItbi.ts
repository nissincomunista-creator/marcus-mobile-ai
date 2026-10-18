import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { parseJuizDeFora2024Pdf, parseJuizDeFora2025Pdf, JuizDeForaItbiTransaction } from '../src/utils/juizDeForaItbiService.ts';
import { ItbiTransaction } from '../src/types.ts';

async function main() {
  console.log('[Juiz de Fora ITBI Refresh] Iniciando leitura dos PDFs oficiais...');

  const p24 = 'C:\\Users\\Marcus\\OneDrive\\Desktop\\ITBI DAS CIDADES\\itbi juiz de fora 2024.pdf';
  const p25 = 'C:\\Users\\Marcus\\OneDrive\\Desktop\\ITBI DAS CIDADES\\itbi juiz de fora 2025.pdf';

  const txs24 = await parseJuizDeFora2024Pdf(p24);
  console.log(`[Juiz de Fora 2024] Extraídas ${txs24.length} transações (${txs24.filter(t => t.isCompraEVenda).length} Compra e Venda).`);

  const txs25 = await parseJuizDeFora2025Pdf(p25);
  console.log(`[Juiz de Fora 2025] Extraídas ${txs25.length} transações (${txs25.filter(t => t.isCompraEVenda).length} Compra e Venda).`);

  const allJf = [...txs24, ...txs25];
  const classifiedSales = allJf.filter(t => t.isCompraEVenda === true).length;
  console.log(`[Juiz de Fora Total] ${allJf.length} linhas oficiais; ${classifiedSales} compras e vendas classificadas.`);
  if (allJf.length < 10000 || classifiedSales < 8000) {
    throw new Error(`Leitura incompleta dos PDFs (${allJf.length} linhas; ${classifiedSales} compra e venda). Base existente preservada.`);
  }

  const storePath = path.join(process.cwd(), 'data_store.json');
  if (!fs.existsSync(storePath)) {
    console.error('data_store.json não encontrado!');
    return;
  }

  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  const oldTxs: ItbiTransaction[] = store.itbiTransactions || [];

  // Replace only Juiz de Fora rows. Other municipalities in MG are preserved.
  const nonJfTxs = oldTxs.filter(t => {
    const isJF = ((t.city && t.city.toLowerCase().includes('juiz')) && (t.state || '').toUpperCase() === 'MG') || t.id.startsWith('itbi-jf');
    return !isJF;
  });

  console.log(`[Store] Preservadas ${nonJfTxs.length} transações de outras cidades (Rio de Janeiro, Niterói, etc.).`);

  // Merge official JF transactions
  // ITBI reports contain transaction value and ownership share, but no unit
  // area. Never retain or manufacture an area or unit value for these rows.
  for (const tx of allJf) {
    tx.sizeSqm = 0;
    tx.estimatedSizeSqm = undefined;
    tx.estimatedAreaSqm = undefined;
    tx.unitValueSqm = 0;
    tx.isDerivedSqm = false;
  }
  store.itbiTransactions = [...nonJfTxs, ...allJf];
  // Juiz de Fora's official extracts do not contain area. Remove any old
  // cached R$/m² aggregates for the city so the UI cannot revive fabricated
  // values after the raw transactions have been cleaned.
  if (Array.isArray(store.itbiStats)) {
    store.itbiStats = store.itbiStats.filter((stat: any) =>
      !String(stat.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('juiz de fora')
    );
  }
  console.log(`[Store] Total de transações após merge: ${store.itbiTransactions.length}`);

  // Stage by default. The running desktop server may still be writing the
  // current store; loadStore applies this sidecar on the next app start.
  if (!process.argv.includes('--apply')) {
    const stagePath = path.join(process.cwd(), 'jf_itbi_migration.json');
    fs.writeFileSync(stagePath, JSON.stringify({ itbiTransactions: allJf, itbiStats: store.itbiStats, createdAt: new Date().toISOString() }), 'utf8');
    console.log(`[Stage] Migração preparada em ${stagePath}; será aplicada quando o aplicativo iniciar novamente.`);
    return;
  }

  // Write to data_store.json and data_store.json.gz
  const jsonStr = JSON.stringify(store);
  fs.writeFileSync(storePath, jsonStr, 'utf8');
  console.log('[Store] data_store.json salvo com sucesso.');

  const gzPath = path.join(process.cwd(), 'data_store.json.gz');
  fs.writeFileSync(gzPath, zlib.gzipSync(Buffer.from(jsonStr, 'utf8')));
  console.log('[Store] data_store.json.gz compactado e salvo.');
}

main().catch(err => {
  console.error('Erro ao atualizar ITBI de Juiz de Fora:', err);
  process.exit(1);
});
