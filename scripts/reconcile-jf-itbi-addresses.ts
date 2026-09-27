import fs from 'node:fs';
import path from 'node:path';
import { parseJfAddressReferenceCsv, reconcileJfTransactionAddresses } from '../src/utils/juizDeForaAddressReconciliation.ts';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function main() {
  const defaultInput = path.join(process.cwd(), 'jf_itbi_migration.json.applied');
  const defaultCsv = 'C:\\Users\\Marcus\\OneDrive\\Desktop\\ITBI DAS CIDADES\\transações imobiliárias de juiz de fora 2024-2025.csv';
  const inputPath = option('--input', defaultInput);
  const csvPath = option('--csv', defaultCsv);
  const outputPath = option('--output', path.join(process.cwd(), 'jf_itbi_migration.json'));

  if (!fs.existsSync(inputPath)) throw new Error(`Arquivo ITBI de origem não encontrado: ${inputPath}`);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV de conferência não encontrado: ${csvPath}`);
  if (fs.existsSync(outputPath) && !process.argv.includes('--overwrite')) {
    throw new Error(`O destino já existe; informe outro --output ou use --overwrite: ${outputPath}`);
  }

  const source = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as {
    itbiTransactions?: any[];
    itbiStats?: unknown[];
  };
  const transactions = Array.isArray(source.itbiTransactions) ? source.itbiTransactions : [];
  const referenceRows = parseJfAddressReferenceCsv(fs.readFileSync(csvPath, 'utf8'));
  const result = reconcileJfTransactionAddresses(transactions, referenceRows, path.basename(csvPath));
  const correctedPayload = {
    itbiTransactions: result.transactions,
    itbiStats: source.itbiStats || [],
    createdAt: new Date().toISOString(),
    addressReconciliation: {
      input: path.basename(inputPath),
      reference: path.basename(csvPath),
      ...{
        matchedRows: result.matchedRows,
        correctedNeighborhoods: result.correctedNeighborhoods,
        correctedComplements: result.correctedComplements,
        correctedAreas: result.correctedAreas,
        ambiguousRows: result.ambiguousRows,
        unmatchedRows: result.unmatchedRows
      }
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(correctedPayload), 'utf8');
  console.log(JSON.stringify({
    output: outputPath,
    transactions: result.transactions.length,
    matchedRows: result.matchedRows,
    correctedNeighborhoods: result.correctedNeighborhoods,
    correctedComplements: result.correctedComplements,
    correctedAreas: result.correctedAreas,
    ambiguousRows: result.ambiguousRows,
    unmatchedRows: result.unmatchedRows,
    preserved: ['transactionValue', 'naturezaOperacao', 'percentualTransmitido', 'date'],
    verifiedFromReference: ['neighborhood', 'complement', 'sizeSqm', 'unitValueSqm']
  }, null, 2));
}

main().catch(error => {
  console.error('Falha ao reconciliar endereços do ITBI de Juiz de Fora:', error);
  process.exitCode = 1;
});
