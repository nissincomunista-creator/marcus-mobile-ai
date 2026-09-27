import assert from 'node:assert/strict';
import { computeBidirectionalBenchmarks } from '../src/utils/bidirectionalBenchmark.ts';
import { fitJuizDeForaAreaModel } from '../src/utils/juizDeForaAreaModel.ts';

const anchors = [
  [40, 160000], [50, 190000], [60, 230000], [70, 270000],
  [80, 300000], [90, 330000], [100, 365000], [110, 395000],
  [120, 425000], [140, 480000], [160, 530000], [180, 590000]
].map(([sizeSqm, marketValue]) => ({
  sizeSqm, marketValue, propertyType: 'Apartamento', sizeVerified: true, source: 'caixa'
}));
const model = fitJuizDeForaAreaModel(anchors, 'Apartamento');
assert(model.referenceValue > 0 && model.sampleCount >= 10);

const transactions: any[] = [
  { id: 'building-1', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '35', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 240000, normalizedTotalValue: 480000, percentualTransmitido: 50, isCompraEVenda: true, date: '2025-04-01' },
  { id: 'building-wrong-neighborhood', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São João Batista - Santa Cruz', street: 'Rua Guacui', number: '35', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 360000, normalizedTotalValue: 360000, percentualTransmitido: 100, isCompraEVenda: true, date: '2024-07-05', complement: 'SNLT Q B' },
  { id: 'street-1', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '36', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 450000, normalizedTotalValue: 450000, percentualTransmitido: 100, isCompraEVenda: true, date: '2025-05-01' },
  { id: 'street-2', state: 'MG', city: 'Juiz de Fora', neighborhood: 'Centro', street: 'Rua Guacui', number: '42', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 280000, normalizedTotalValue: 280000, percentualTransmitido: 100, isCompraEVenda: true, date: '2025-06-01' },
  { id: 'street-3', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '48', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 210000, normalizedTotalValue: 210000, percentualTransmitido: 100, isCompraEVenda: true, date: '2025-08-01' },
  { id: 'street-4', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '52', propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0, transactionValue: 180000, normalizedTotalValue: 180000, percentualTransmitido: 100, isCompraEVenda: true, date: '2025-09-01' },
  { id: 'donation', state: 'MG', city: 'Juiz de Fora', neighborhood: 'Centro', street: 'Rua Guacui', number: '35', propertyType: 'Apartamento', sizeSqm: 0, unitValueSqm: 0, transactionValue: 900000, normalizedTotalValue: 900000, percentualTransmitido: 100, isCompraEVenda: false, naturezaOperacao: 'DOAÇÃO', date: '2025-07-01' }
];

const largeUnit = computeBidirectionalBenchmarks(transactions, 'Rua Guacui', '35', 140, 'similar', 0.5, 'Apartamento', 'São Mateus', model);
const smallUnit = computeBidirectionalBenchmarks(transactions, 'Rua Guacui', '35', 50, 'similar', 0.5, 'Apartamento', 'São Mateus', model);
assert(largeUnit?.hasMicroData, 'Vendas locais suficientes devem habilitar preço estimado');
assert(smallUnit?.hasMicroData);
assert(largeUnit.gabaritoTotal > smallUnit.gabaritoTotal, 'O valor deve respeitar a área informada do imóvel');
assert.equal(largeUnit.compraEVendaCount, 6, 'Doação não entra na base de mercado');
assert.equal(transactions.some(tx => tx.sizeSqm !== 0 || tx.unitValueSqm !== 0), false, 'O processo não pode gravar metragem estimada no ITBI');
assert.equal(largeUnit.predio.validas + largeUnit.rua.validas, 2, 'A cota de 50% não pode ser confundida com metragem');
assert.equal(largeUnit.predio.total, 1, 'Escritura no mesmo número, mas em bairro divergente, não entra no prédio comparável');

const verifiedAreaSales: any[] = [
  { id: 'building-55', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '35', complement: 'APTO 402', propertyType: 'Apartamento', sizeSqm: 55, unitValueSqm: 5091, transactionValue: 280000, sourceVerified: true, sourceFile: 'transações imobiliárias de juiz de fora 2024-2025.csv', sourceRow: 15285, isCompraEVenda: true, date: '2024-04-18' },
  { id: 'building-75', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '35', complement: 'APT 206', propertyType: 'Apartamento', sizeSqm: 75, unitValueSqm: 4800, transactionValue: 360000, sourceVerified: true, sourceFile: 'transações imobiliárias de juiz de fora 2024-2025.csv', sourceRow: 15291, isCompraEVenda: true, date: '2024-07-05' },
  { id: 'building-55-duplicate', state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: '35', complement: 'APTO 402', propertyType: 'Apartamento', sizeSqm: 55, unitValueSqm: 5091, transactionValue: 280000, sourceVerified: true, sourceFile: 'transações imobiliárias de juiz de fora 2024-2025.csv', sourceRow: 15285, isCompraEVenda: true, date: '2024-04-18' },
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `street-verified-${i}`, state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: 'Rua Guacui', number: String(45 + i),
    propertyType: 'Apartamento', sizeSqm: 140 + i * 3, unitValueSqm: 3900 + i * 75,
    transactionValue: Math.round((3900 + i * 75) * (140 + i * 3)), sourceVerified: true,
    sourceFile: 'transações imobiliárias de juiz de fora 2024-2025.csv', sourceRow: 16000 + i,
    isCompraEVenda: true, date: `2025-0${i + 1}-01`
  }))
];
const verifiedAreaBenchmark = computeBidirectionalBenchmarks(
  verifiedAreaSales, 'Rua Guacui', '35', 147, 'similar', 0.5, 'Apartamento', 'São Mateus', model
);
assert(verifiedAreaBenchmark);
assert.equal(verifiedAreaBenchmark.compraEVendaCount, 7, 'Uma linha duplicada da planilha conta uma única vez');
assert.equal(verifiedAreaBenchmark.predio.total, 2, 'As duas vendas oficiais no número ficam visíveis como fonte');
assert.equal(verifiedAreaBenchmark.predio.validas, 0, 'Unidades de 55 e 75 m² não são comparáveis diretamente a uma unidade de 147 m²');
assert(verifiedAreaBenchmark.mediaCorteReal >= 800 && verifiedAreaBenchmark.mediaCorteReal <= 30000,
  'A média final de m² precisa permanecer em faixa plausível');
assert(verifiedAreaBenchmark.gabaritoTotal < 5_000_000, 'O valor não pode explodir por confusão entre preço total e preço por m²');

const noLocal = computeBidirectionalBenchmarks(
  transactions.filter(tx => tx.street === 'Other Street'),
  'Other Street', undefined, 140, 'similar', 0.5, 'Apartamento', 'Centro', model
);
assert.equal(noLocal?.gabaritoTotal || 0, 0, 'Dados apenas de contexto não liberam um gabarito');

const contextOnlySales: any[] = [
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `radius-${i}`, state: 'MG', city: 'Juiz de Fora', neighborhood: 'São Mateus', street: `Rua Raio ${i}`,
    number: String(10 + i), propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0,
    transactionValue: 510000 + i * 5000, normalizedTotalValue: 510000 + i * 5000, percentualTransmitido: 100,
    isCompraEVenda: true, date: '2025-06-01', distanceKm: 0.2 + i * 0.03, transactionLocationPrecision: 'exact_number'
  })),
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `neighborhood-${i}`, state: 'MG', city: 'Juiz de Fora', neighborhood: 'Centro', street: `Rua Bairro ${i}`,
    number: String(100 + i), propertyType: 'Apartamento', propertyTypeVerified: true, sizeSqm: 0, unitValueSqm: 0,
    transactionValue: 520000 + i * 3000, normalizedTotalValue: 520000 + i * 3000, percentualTransmitido: 100,
    isCompraEVenda: true, date: '2025-06-01'
  }))
];
const contextCalibrated = computeBidirectionalBenchmarks(
  contextOnlySales, 'Rua Sem Dados', undefined, 140, 'similar', 0.5, 'Apartamento', 'Centro', model, contextOnlySales.filter(tx => tx.transactionLocationPrecision === 'exact_number')
);
assert.equal(contextCalibrated?.calibrationKind, 'radius_neighborhood', 'Cinco amostras exatas no raio e sete no bairro reativam a calibragem sem rua/prédio');
assert((contextCalibrated?.gabaritoTotal || 0) > 0);
assert(contextCalibrated.mediaCorteReal >= 1000 && contextCalibrated.mediaCorteReal < 20000,
  'O gabarito calibrado deve usar R$/m², nunca o total de uma transação como se fosse preço unitário');
assert(contextCalibrated.gabaritoTotal < 2_800_000,
  'A calibragem de imóvel de 140 m² não pode produzir um gabarito multimilionário por erro de unidade');

console.log(JSON.stringify({
  model: { samples: model.sampleCount, confidence: model.confidence, rSquared: Number(model.rSquared.toFixed(3)) },
  140: { estimate: largeUnit.gabaritoTotal, localSales: largeUnit.predio.validas + largeUnit.rua.validas },
  50: { estimate: smallUnit.gabaritoTotal, localSales: smallUnit.predio.validas + smallUnit.rua.validas },
  purchaseSalesOnly: largeUnit.compraEVendaCount,
  verifiedArea: {
    buildingRows: verifiedAreaBenchmark.predio.total,
    comparableBuildingRows: verifiedAreaBenchmark.predio.validas,
    gabarito: verifiedAreaBenchmark.gabaritoTotal,
    sqm: verifiedAreaBenchmark.mediaCorteReal
  }
}, null, 2));
