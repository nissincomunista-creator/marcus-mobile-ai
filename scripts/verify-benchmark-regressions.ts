import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { computeBidirectionalBenchmarks, cleanStreetCore } from '../src/utils/bidirectionalBenchmark.ts';
import { computeFourTierValuation } from '../src/utils/fourTierValuation.ts';
import { assessDataQuality, getVerifiedLocalComparableCount } from '../src/utils/dataQuality.ts';

const store = JSON.parse(gunzipSync(readFileSync('data_store.json.gz')).toString());
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const neighborhood = store.itbiTransactions.filter((t: any) => normalize(t.neighborhood || '') === 'engenho da rainha' && t.propertyType === 'Apartamento');
const result = computeBidirectionalBenchmarks(neighborhood, 'Estrada Adhemar Bebiano', '4106', 50, 'similar', 0.5, 'Apartamento');
assert(result && result.predio.validas > 0);
const expectedAdhemarValue = computeFourTierValuation({
  building: { value: result.predio.saneada, count: result.predio.validas },
  street: { value: result.rua.saneada, count: result.rua.validas },
  surrounding: { value: result.radiusVerified && result.fallbackLevel === '0.5km' ? result.raio.saneada : 0, count: result.radiusVerified && result.fallbackLevel === '0.5km' ? result.raio.validas : 0 },
  neighborhood: { value: result.bairro.saneada, count: result.bairro.validas }
});
assert.equal(result.mediaCorteReal, expectedAdhemarValue.value, 'A média deve seguir os quatro pesos, sem substituir o prédio por outro nível');
assert.equal(cleanStreetCore('Rua Nossa Senhora da Paz'), 'nossa senhora paz');
const building = [{ sizeSqm: 45 }, { sizeSqm: 43 }, { sizeSqm: 87 }];
const similar = building.filter((t: any) => t.sizeSqm >= Math.round(65 * 0.67) && t.sizeSqm <= Math.round(65 * 1.33));
assert(similar.some((t: any) => t.sizeSqm === 45), '45m2 deve participar do recorte de 65m2 +/-33%');
assert(!similar.some((t: any) => t.sizeSqm === 43 || t.sizeSqm === 87), 'O filtro por área deve excluir metragem fora da faixa');

const oneStreetSample = [
  { id: 'street', street: 'Rua das Dálias', number: '20', sizeSqm: 177, unitValueSqm: 4762, propertyType: 'Casa', distanceKm: 0 },
  { id: 'near-1', street: 'Rua A', number: '1', sizeSqm: 160, unitValueSqm: 3600, propertyType: 'Casa', distanceKm: 0.2 },
  { id: 'near-2', street: 'Rua B', number: '2', sizeSqm: 190, unitValueSqm: 3900, propertyType: 'Casa', distanceKm: 0.3 },
  { id: 'near-3', street: 'Rua C', number: '3', sizeSqm: 150, unitValueSqm: 3850, propertyType: 'Casa', distanceKm: 0.4 },
  { id: 'wide-1', street: 'Rua D', number: '4', sizeSqm: 45, unitValueSqm: 2600, propertyType: 'Casa', distanceKm: 0.25 },
  { id: 'wide-2', street: 'Rua E', number: '5', sizeSqm: 500, unitValueSqm: 2900, propertyType: 'Casa', distanceKm: 0.45 }
] as any;
const oneStreetSimilar = computeBidirectionalBenchmarks(oneStreetSample, 'Rua das Dálias', '135', 177, 'similar', 0.5, 'Casa');
const oneStreetAll = computeBidirectionalBenchmarks(oneStreetSample, 'Rua das Dálias', '135', 177, 'all', 0.5, 'Casa');
assert(oneStreetSimilar && oneStreetAll);
assert.equal(oneStreetSimilar.rua.validas, 1);
assert.equal(oneStreetAll.rua.validas, 1);
assert.equal(oneStreetSimilar.rua.saneada, 4762);
assert.equal(oneStreetAll.rua.saneada, 4762);
assert.equal(oneStreetSimilar.nivelUtilizado, 'Sem Dados Suficientes');
assert.equal(oneStreetAll.nivelUtilizado, 'Sem Dados Suficientes');
assert.equal(oneStreetSimilar.gabaritoTotal, 0);
assert.equal(oneStreetAll.flipTotal, 0);

const samplesOutsideSelectedRadius = [
  { id: 'target-street', street: 'Rua da Referência', number: '10', sizeSqm: 80, unitValueSqm: 9000, propertyType: 'Apartamento', distanceKm: 0 },
  { id: 'outside-1', street: 'Rua Próxima A', number: '1', sizeSqm: 78, unitValueSqm: 7500, propertyType: 'Apartamento', distanceKm: 0.7 },
  { id: 'outside-2', street: 'Rua Próxima B', number: '2', sizeSqm: 82, unitValueSqm: 7200, propertyType: 'Apartamento', distanceKm: 1.6 }
] as any;
const strictRadius = computeBidirectionalBenchmarks(samplesOutsideSelectedRadius, 'Rua da Referência', '10', 80, 'similar', 0.5, 'Apartamento');
assert(strictRadius);
assert.equal(strictRadius.radiusVerified, false, 'Amostras a 700m e 1,6km não confirmam o raio selecionado de 500m');
assert.equal(strictRadius.raio.total, 0, 'Amostras fora do raio selecionado não podem alimentar o entorno');
assert.equal(strictRadius.raio.validas, 0, 'Sem expansão automática para 1km ou 2km');

const exactRadiusRows = [
  { id: 'radius-in-1', street: 'Rua Vizinha A', number: '10', sizeSqm: 80, unitValueSqm: 7600, propertyType: 'Apartamento', distanceKm: 0.2, transactionLocationPrecision: 'exact_number' },
  { id: 'radius-in-2', street: 'Rua Vizinha B', number: '20', sizeSqm: 82, unitValueSqm: 7400, propertyType: 'Apartamento', distanceKm: 0.4, transactionLocationPrecision: 'exact_number' },
  { id: 'radius-same-street', street: 'Rua da Referência', number: '11', sizeSqm: 81, unitValueSqm: 7800, propertyType: 'Apartamento', distanceKm: 0.3, transactionLocationPrecision: 'exact_number' },
  { id: 'radius-fake-street-point', street: 'Rua Vizinha C', number: '30', sizeSqm: 79, unitValueSqm: 9900, propertyType: 'Apartamento', distanceKm: 0.1 },
  { id: 'radius-out-long-road', street: 'Rua Vizinha D', number: '2000', sizeSqm: 81, unitValueSqm: 12000, propertyType: 'Apartamento', distanceKm: 1.1, transactionLocationPrecision: 'exact_number' }
] as any;
const exactRadiusBenchmark = computeBidirectionalBenchmarks(
  samplesOutsideSelectedRadius, 'Rua da Referência', '10', 80, 'similar', 0.5, 'Apartamento', 'Centro', undefined, exactRadiusRows
);
assert(exactRadiusBenchmark);
assert.equal(exactRadiusBenchmark.raio.total, 3, 'O raio inclui todas as vendas numeradas dentro do círculo, inclusive a mesma rua, e remove ponto de eixo e venda fora');
assert.equal(exactRadiusBenchmark.radiusVerified, true);

const contextualOnly = computeFourTierValuation({
  surrounding: { value: 6000, count: 5 },
  neighborhood: { value: 5000, count: 7 }
});
assert.equal(contextualOnly.priceable, true);
assert.equal(contextualOnly.calibrationKind, 'radius_neighborhood');
assert.equal(contextualOnly.value, 5600, 'Sem amostras locais, raio e bairro calibram em 60/40 (15/10 renormalizado)');
const tooFewContextSamples = computeFourTierValuation({
  surrounding: { value: 6000, count: 4 }, neighborhood: { value: 5000, count: 6 }
});
assert.equal(tooFewContextSamples.priceable, false, 'Contexto abaixo de 5 no raio e 7 no bairro não libera valor');

const allFourTiers = computeFourTierValuation({
  building: { value: 10000, count: 5 },
  street: { value: 8000, count: 10 },
  surrounding: { value: 6000, count: 12 },
  neighborhood: { value: 4000, count: 40 }
});
assert.equal(allFourTiers.priceable, true);
assert.equal(allFourTiers.value, 8100, 'Os pesos devem ser prédio 40%, rua 35%, raio 15% e bairro 10%');

const oneLocalPlusContext = computeFourTierValuation({
  building: { value: 10000, count: 1 },
  surrounding: { value: 6000, count: 5 },
  neighborhood: { value: 4000, count: 7 }
});
assert.equal(oneLocalPlusContext.priceable, true, 'Uma amostra local só pode virar calibragem com contexto mínimo');
assert.equal(oneLocalPlusContext.calibrationKind, 'radius_neighborhood');
assert.equal(oneLocalPlusContext.value, 5200, 'Uma única venda local não pode dominar a calibragem contextual');
assert.equal(computeFourTierValuation({
  building: { value: 10000, count: 4 }, street: { value: 8000, count: 1 },
  surrounding: { value: 6000, count: 8 }, neighborhood: { value: 5000, count: 20 }
}).calibrationKind, 'few_local_samples', 'Menos de sete amostras locais precisa ser rotulado como calibrado');

const streetAndBuildingLot: any = {
  address: 'Rua Cardoso de Morais, 538', auctionPrice: 168353, sizeSqm: 62,
  estimatedValue: 201810, vendaBaixaPrice: 181660, valuationConfidence: 'verified',
  valuationLevel: 'Prédio', valuationSampleCount: 1, itbiBuildingCount: 1,
  itbiStreetCount: 7, priceVerified: true, sizeVerified: true, addressVerified: true
};
assert.equal(getVerifiedLocalComparableCount(streetAndBuildingLot), 8, 'O nível rua deve somar ao prédio em vez de ser ignorado');
assert.equal(assessDataQuality(streetAndBuildingLot).status, 'Auditado');
const contextualLot: any = {
  address: 'Rua Exemplo, 10', auctionPrice: 200000, sizeSqm: 70, estimatedValue: 300000,
  vendaBaixaPrice: 270000, valuationConfidence: 'projected', valuationCalibration: 'radius_neighborhood',
  valuationLevel: 'Raio Entorno', valuationSampleCount: 0, itbiBuildingCount: 0, itbiStreetCount: 0,
  itbiSurroundingCount: 8, itbiNeighborhoodCount: 30, valuationRadiusKm: 0.5,
  priceVerified: true, sizeVerified: true, addressVerified: true
};
assert.equal(assessDataQuality(contextualLot).badgeLabel, 'Calibrado por raio e bairro');
assert(assessDataQuality(contextualLot).liquidityCeiling <= 5, 'Contexto sem amostra local não pode receber liquidez alta');
const fewLocalLot: any = { ...contextualLot, valuationCalibration:'few_local_samples', valuationLevel:'Rua', itbiStreetCount:4, valuationSampleCount:4 };
assert.equal(assessDataQuality(fewLocalLot).liquidityCeiling, 5, 'Amostragem local abaixo de cinco reduz a nota');

const neighborhoodOnlyLot: any = {
  address: 'Rua Projetada 2', auctionPrice: 119069, sizeSqm: 112,
  estimatedValue: 0, vendaBaixaPrice: 0, valuationConfidence: 'unavailable',
  valuationLevel: 'Sem Dados Suficientes', precisa_revisao: false,
  priceVerified: true, sizeVerified: true, addressVerified: true
};
assert.equal(assessDataQuality(neighborhoodOnlyLot).badgeLabel, 'Poucos dados ITBI para precificação');

const byAuctionId = (id: string) => store.auctions.find((auc: any) => auc.id === id);
const calculateStoredExample = (id: string) => {
  const auc = byAuctionId(id);
  assert(auc, `Lote de regressão ausente: ${id}`);
  const txs = store.itbiTransactions.filter((tx: any) =>
    normalize(tx.neighborhood || '') === normalize(auc.neighborhood || '') &&
    normalize(tx.city || '') === normalize(auc.city || '') &&
    normalize(tx.state || '') === normalize(auc.state || '')
  );
  const number = String(auc.address || '').match(/\b(?:n[º°.]?\s*)?(\d{1,5})\b/i)?.[1] || '';
  const benchmark = computeBidirectionalBenchmarks(txs, auc.address, number, auc.sizeSqm || 0, 'similar', 0.5, auc.propertyType);
  assert(benchmark, `ITBI não retornou benchmark para ${id}`);
  return computeFourTierValuation({
    building: { value: benchmark.predio.saneada, count: benchmark.predio.validas },
    street: { value: benchmark.rua.validas ? benchmark.rua.saneada : (auc.itbiStreetAvgSqm || 0), count: benchmark.rua.validas || auc.itbiStreetCount || 0 },
    surrounding: { value: benchmark.radiusVerified && benchmark.fallbackLevel === '0.5km' ? benchmark.raio.saneada : 0, count: benchmark.radiusVerified && benchmark.fallbackLevel === '0.5km' ? benchmark.raio.validas : 0 },
    neighborhood: { value: benchmark.bairro.saneada, count: benchmark.bairro.validas }
  });
};

const guaratibaExample = calculateStoredExample('auc-caixa-8787718712556');
const euclidesExample = calculateStoredExample('auc-emgea-2615db6a87f87a216eb4');
const cardosoExample = calculateStoredExample('auc-facanha-cd89f13d7b5e652c25f9');
assert.equal(guaratibaExample.priceable, false, 'Guaratiba sem rua/prédio não deve conservar gabarito de bairro');
assert(euclidesExample.priceable, 'Rua Euclides Faria deve combinar a amostra predial com as transações da rua');
assert(cardosoExample.priceable, 'Cardoso de Morais deve combinar transações do número e da rua');

console.log(JSON.stringify({
  adhemar: { street: result.rua, building: result.predio, exitSqm: result.flipRapidoSqm },
  similarAreas: similar.map((t: any) => t.sizeSqm),
  screenshots: {
    guaratiba: { priceable: guaratibaExample.priceable, localSamples: guaratibaExample.localSampleCount, value: guaratibaExample.value },
    euclidesFaria: { priceable: euclidesExample.priceable, localSamples: euclidesExample.localSampleCount, value: euclidesExample.value },
    cardosoDeMorais: { priceable: cardosoExample.priceable, localSamples: cardosoExample.localSampleCount, value: cardosoExample.value }
  },
  oneStreetSample: {
    similar: { streetSqm: oneStreetSimilar.rua.saneada, flipSqm: oneStreetSimilar.flipRapidoSqm, source: oneStreetSimilar.nivelUtilizado },
    all: { streetSqm: oneStreetAll.rua.saneada, flipSqm: oneStreetAll.flipRapidoSqm, source: oneStreetAll.nivelUtilizado }
  }
}, null, 2));
