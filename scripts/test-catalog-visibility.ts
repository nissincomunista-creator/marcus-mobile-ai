import assert from 'node:assert/strict';
import { catalogEligible, catalogVisible } from '../auctionPipeline/validation.ts';
import { configureNeighborhoods, enrichLocation, neighborhoodEvidence } from '../auctionPipeline/location.ts';
import { aggregateAuctions } from '../auctionPipeline/aggregation.ts';
import { pestanaApiDraft } from '../listedPortalApis.ts';
import { reconcileAuctionDrafts } from '../auctioneerSyncService.ts';

const activeUnpriced = {
  id: 'auc-pestana-regression',
  title: 'Apartamento em Juiz de Fora',
  city: 'Juiz de Fora',
  state: 'MG',
  origin: 'extrajudicial',
  auctionLink: 'https://www.pestanaleiloes.com.br/agenda-de-leiloes/6282/439173',
  auctionPrice: 0,
  priceVerified: false,
  sizeSqm: 147,
  sizeVerified: true,
  neighborhood: 'São Mateus',
  ingestionStatus: 'quarentena_extracao'
};

assert.equal(catalogVisible(activeUnpriced), true, 'active official listings with unresolved extraction stay in the catalog');
assert.equal(catalogEligible(activeUnpriced), false, 'unconfirmed bid must not be ranked or valued');
assert.equal(catalogVisible({ ...activeUnpriced, availability: { state: 'closed' } }), false, 'closed lots stay out of the catalog');
assert.equal(catalogVisible({ ...activeUnpriced, auctionLink: '' }), false, 'an unowned listing without a source link is not published');

const ready = { ...activeUnpriced, auctionPrice: 350000, priceVerified: true, ingestionStatus: 'ativo' };
assert.equal(catalogEligible(ready), true, 'verified bid, area, and neighborhood can enter the calculation path');

configureNeighborhoods([
  { city: 'Juiz de Fora', neighborhood: 'Juiz De Fora' },
  { city: 'Juiz de Fora', neighborhood: '1' },
  { city: 'Juiz de Fora', neighborhood: 'Lote' },
  { city: 'Juiz de Fora', neighborhood: 'Granbery' },
  { city: 'Juiz de Fora', neighborhood: 'Eldorado' }
]);
const corrected = neighborhoodEvidence({
  city: 'Juiz de Fora',
  address: 'Rua Guaçuí, 35, Apto 404, Edifício Residencial Pôr do Sol, São Mateus, Juiz de Fora/MG',
  neighborhood: 'Granbery'
});
assert.equal(corrected?.value?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), 'sao mateus', 'explicit neighborhood in the official address overrides a conflicting stored label');

const correctedFromDescription = neighborhoodEvidence({
  city: 'Juiz de Fora',
  address: 'Rua Guaçuí, 35, Apto 404',
  description: 'MG\nJuiz de Fora\nSão Mateus\nRua Guaçuí\n35\nApto 404'
});
assert.equal(correctedFromDescription?.value, 'sao mateus', 'structured official lot text can recover the neighborhood when the parsed address omits it');

const officialPestanaDraft = pestanaApiDraft({
  id: 439173,
  leilao: 6282,
  descricao: 'Apartamento - Juiz de Fora - MG',
  status: 'Disponível',
  visivel: true,
  valorInicial: 351702,
  informacoesLei9514: { pertenceLei: false },
  bens: [{
    origem: 'Retomado',
    descricao: 'Rua Guacui, 35, Apto 404, Edificio Residencial Por Do Sol, São Mateus, Juiz de Fora, MG. Área privativa: 147,0 m². Matrícula 49.161.',
    caracteristicas: [{ valor: '147,0 m²' }],
    documentos: [{ nome: 'Matrícula do Imóvel', link: 'https://api.pestanaleiloes.com.br/sgl/v1/leiloes/6282/lotes/439173/Matricula/18979620' }]
  }]
}, {
  id: 6282,
  nome: 'Leilão de Imóveis Santander',
  data: '2099-10-06T10:00:00',
  informacoesLei9514: { pertenceLei: false }
});
assert.ok(officialPestanaDraft, 'official Pestana lot resolves to one configured target city');
assert.equal(officialPestanaDraft.auctionPrice, 351702, 'use the official API lot bid instead of leaving price at zero');
assert.equal(officialPestanaDraft.sizeSqm, 147, 'read the area from the official lot description');
assert.equal(officialPestanaDraft.sourceVerified, true);
assert.equal(officialPestanaDraft.originVerified, true);
assert.match(officialPestanaDraft.matriculaUrl || '', /439173\/Matricula/);

const retained = reconcileAuctionDrafts([officialPestanaDraft], 'extrajudicial', 'MG', 'Juiz de Fora', [], row => row, false, false);
assert.equal(retained.newAuctions.length, 1, 'a complete official active lot is ingested');
assert.equal(retained.newAuctions[0].auctionPrice, 351702);
assert.equal(retained.newAuctions[0].neighborhood?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), 'sao mateus');

const vitrineApartment = {
  id: 'auc-vitrine-703',
  title: 'Apartamento - Juiz de Fora/MG - Rua Doutor Sebastião de Andrade 1255 Eldorado',
  city: 'Juiz de Fora',
  state: 'MG',
  propertyType: 'Apartamento',
  address: 'Rua Doutor Sebastião de Andrade 1255 Eldorado',
  description: 'Apartamento nº 703, Bloco 02, Condomínio Jardins do Eldorado.',
  auctionLink: 'https://vitrinebradesco.com.br/auctions/apartamento-juiz-de-fora-1255-eldorado-16',
  auctionPrice: 2068409,
  origin: 'extrajudicial'
} as any;
const duplicateVitrineEntry = {
  ...vitrineApartment,
  id: 'auc-vitrine-703-duplicate',
  auctionLink: 'https://vitrinebradesco.com.br/auctions/apartamento-juiz-de-fora-1255-eldorado-16_1',
  ingestionStatus: 'quarentena_extracao'
};
const distinctVitrineUnit = {
  ...vitrineApartment,
  id: 'auc-vitrine-704',
  auctionLink: 'https://vitrinebradesco.com.br/auctions/apartamento-juiz-de-fora-1255-eldorado-16_2',
  description: 'Apartamento nº 704, Bloco 02, Condomínio Jardins do Eldorado.'
};
const consolidatedVitrine = aggregateAuctions(
  [vitrineApartment, duplicateVitrineEntry, distinctVitrineUnit],
  url => url
);
assert.equal(consolidatedVitrine.length, 2, 'official unit numbers consolidate duplicate URLs while keeping a different apartment unit separate');
assert.equal(consolidatedVitrine.find(row => row.sourceRecords?.length === 2)?.sourceRecords?.length, 2);
const staleVitrineNeighborhood = aggregateAuctions([
  { ...vitrineApartment, neighborhood: 'Recanto Da Mata Ii' },
  { ...duplicateVitrineEntry, neighborhood: 'Recanto Da Mata Ii' }
], url => url)[0];
assert.equal(enrichLocation({ ...staleVitrineNeighborhood, city: staleVitrineNeighborhood.city || '' }).neighborhood, 'Eldorado', 'the official address corrects an old neighborhood after cross-site aggregation');

console.log('Catalog visibility and neighborhood regressions passed.');
