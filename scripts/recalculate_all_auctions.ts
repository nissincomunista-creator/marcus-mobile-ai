import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

process.env.RECALCULATE_ONLY = 'true';
process.env.NODE_ENV = 'production';

import { recalculateAuctions } from '../server.ts';

async function main() {
  console.log('[Script] Iniciando recálculo global SSOT de leilões...');

  const GZ_ITBI_PATH = path.join(process.cwd(), 'itbi_store.json.gz');
  const GZ_STORE_PATH = path.join(process.cwd(), 'data_store.json.gz');
  const JSON_STORE_PATH = path.join(process.cwd(), 'data_store.json');

  if (!fs.existsSync(GZ_ITBI_PATH)) {
    throw new Error(`Arquivo ${GZ_ITBI_PATH} não encontrado.`);
  }
  if (!fs.existsSync(GZ_STORE_PATH)) {
    throw new Error(`Arquivo ${GZ_STORE_PATH} não encontrado.`);
  }

  console.log('[Script] Lendo transações ITBI de itbi_store.json.gz...');
  const itbiRaw = fs.readFileSync(GZ_ITBI_PATH);
  const itbiTransactions = JSON.parse(zlib.gunzipSync(itbiRaw).toString('utf-8'));
  console.log(`[Script] ${itbiTransactions.length} transações ITBI carregadas.`);

  console.log('[Script] Lendo catálogo de data_store.json.gz...');
  const storeRaw = fs.readFileSync(GZ_STORE_PATH);
  const storeData = JSON.parse(zlib.gunzipSync(storeRaw).toString('utf-8'));
  console.log(`[Script] ${storeData.auctions?.length || 0} leilões carregados.`);

  const targetBefore = storeData.auctions.find((a: any) => a.id === 'auc-caixa-1444415849155');
  if (targetBefore) {
    console.log('[Script] Estrada João Melo 485 ANTES:', {
      vendaBaixaPrice: targetBefore.vendaBaixaPrice,
      estimatedValue: targetBefore.estimatedValue,
      calculatedProfit: targetBefore.calculatedProfit,
      calculatedRoi: targetBefore.calculatedRoi,
      itbiSurroundingAvgSqm: targetBefore.itbiSurroundingAvgSqm,
      itbiStreetAvgSqm: targetBefore.itbiStreetAvgSqm
    });
  }

  console.log('[Script] Executando recalculateAuctions sobre todos os imóveis...');
  const startTime = Date.now();
  const recalculatedAuctions = recalculateAuctions(storeData.auctions, itbiTransactions);
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Script] Recálculo concluído em ${duration}s!`);

  storeData.auctions = recalculatedAuctions;
  storeData.calibrationVersion = 'v24_purge_radius_outliers_parity_ssot';

  const targetAfter = storeData.auctions.find((a: any) => a.id === 'auc-caixa-1444415849155');
  if (targetAfter) {
    console.log('[Script] Estrada João Melo 485 DEPOIS:', {
      vendaBaixaPrice: targetAfter.vendaBaixaPrice,
      estimatedValue: targetAfter.estimatedValue,
      calculatedProfit: targetAfter.calculatedProfit,
      calculatedRoi: targetAfter.calculatedRoi,
      itbiSurroundingAvgSqm: targetAfter.itbiSurroundingAvgSqm,
      itbiStreetAvgSqm: targetAfter.itbiStreetAvgSqm
    });
  }

  // Verificar outliers de raio > 10k em bairros não-nobres
  const remainingWeird = storeData.auctions.filter((a: any) => {
    if (a.itbiSurroundingAvgSqm && a.itbiSurroundingAvgSqm > 10000) {
      const neigh = (a.neighborhood || '').toLowerCase();
      const isNoble = /leblon|ipanema|copacabana|gavea|jardim botanico|lagoa|barra da tijuca/i.test(neigh);
      return !isNoble;
    }
    return false;
  });
  console.log(`[Script] Imóveis não-nobres com surrounding > 10k restantes: ${remainingWeird.length}`);

  // Salvar data_store.json.gz atualizado
  console.log('[Script] Comprimindo e salvando data_store.json.gz...');
  const newGz = zlib.gzipSync(Buffer.from(JSON.stringify(storeData)));
  fs.writeFileSync(GZ_STORE_PATH, newGz);
  console.log(`[Script] data_store.json.gz salvo com sucesso (${(newGz.length / 1024 / 1024).toFixed(2)} MB).`);

  // Salvar data_store.json se existir
  if (fs.existsSync(JSON_STORE_PATH)) {
    fs.writeFileSync(JSON_STORE_PATH, JSON.stringify(storeData, null, 2), 'utf-8');
    console.log('[Script] data_store.json atualizado.');
  }

  // Limpar cache de resposta para forçar reconstrução imediata
  const cacheDir = path.join(process.cwd(), '.cache');
  if (fs.existsSync(cacheDir)) {
    const files = fs.readdirSync(cacheDir);
    for (const f of files) {
      if (f.startsWith('auction-catalog-response')) {
        fs.unlinkSync(path.join(cacheDir, f));
        console.log(`[Script] Cache removido: ${f}`);
      }
    }
  }

  console.log('[Script] Processo concluído com êxito total!');
}

main().catch(err => {
  console.error('[Script] Erro fatal:', err);
  process.exit(1);
});
