// Leiloeiros extraídos automaticamente de https://nexusleiloes.com.br/leiloeiros
// Ordenados por prioridade (com imóveis ativos primeiro, depois agregadores/em atualização/sem imóveis).
export interface NexusAuctioneerEntry {
  id: string;
  name: string;
  domain: string;
  aliasDomains?: string[];
  baseUrl: string;
  searchUrl?: string;
  genericScrape: boolean;
  enabled: boolean;
  nexusImoveis?: number;
  nexusSituacao?: string;
}

export const NEXUS_AUCTIONEERS: NexusAuctioneerEntry[] = [
  {
    "id": "lancenoleilao_com_br",
    "name": "Lance no Leilão",
    "domain": "lancenoleilao.com.br",
    "baseUrl": "https://www.lancenoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 737,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "baldisseraleiloeiros_com_br",
    "name": "Baldissera Leiloeiros",
    "domain": "baldisseraleiloeiros.com.br",
    "baseUrl": "https://www.baldisseraleiloeiros.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 568,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "liderleiloes_com_br",
    "name": "Lider Leilões",
    "domain": "liderleiloes.com.br",
    "baseUrl": "https://www.liderleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 551,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bomvalor_com_br",
    "name": "Bom Valor Leilões",
    "domain": "bomvalor.com.br",
    "aliasDomains": [
      "mercado.bomvalor.com.br"
    ],
    "baseUrl": "https://mercado.bomvalor.com.br",
    "searchUrl": "https://mercado.bomvalor.com.br/busca/segmento/imoveis",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 449,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jmleiloes_com_br",
    "name": "JM Leilões",
    "domain": "jmleiloes.com.br",
    "aliasDomains": [
      "jmleiloes.leilao.br"
    ],
    "baseUrl": "https://www.jmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 432,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jrleiloes_com_br",
    "name": "Joyce Ribeiro Leilões",
    "domain": "jrleiloes.com.br",
    "baseUrl": "https://www.jrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 304,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "webleiloes_com_br",
    "name": "Web Leilões",
    "domain": "webleiloes.com.br",
    "baseUrl": "https://www.webleiloes.com.br",
    "searchUrl": "https://www.webleiloes.com.br/imoveis",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 239,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jeleiloes_com_br",
    "name": "Je Leilões",
    "domain": "jeleiloes.com.br",
    "baseUrl": "https://www.jeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 227,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "turanileiloes_com_br",
    "name": "Gustavo Turani Leilões",
    "domain": "turanileiloes.com.br",
    "baseUrl": "https://www.turanileiloes.com.br",
    "searchUrl": "https://www.turanileiloes.com.br/imoveis",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 226,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaosicoob_com_br",
    "name": "Sicoob (Portal de Imóveis)",
    "domain": "leilaosicoob.com.br",
    "baseUrl": "https://www.leilaosicoob.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 202,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rmoyses_com_br",
    "name": "Rmoyses leilões",
    "domain": "rmoyses.com.br",
    "baseUrl": "https://www.rmoyses.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 194,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "topoleiloes_com_br",
    "name": "Topo Leilões",
    "domain": "topoleiloes.com.br",
    "baseUrl": "https://www.topoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 159,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rafaelcoutinho_lel_br",
    "name": "Rafael Coutinho",
    "domain": "rafaelcoutinho.lel.br",
    "baseUrl": "https://www.rafaelcoutinho.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 144,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gfleiloes_com_br",
    "name": "GF Leilões | Galvão Frota Leilões",
    "domain": "gfleiloes.com.br",
    "baseUrl": "https://www.gfleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 138,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "satoleiloes_com_br",
    "name": "Sato Leilões",
    "domain": "satoleiloes.com.br",
    "baseUrl": "https://www.satoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 126,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "clebercardosoleiloes_com_br",
    "name": "Cleber Cardoso leilões",
    "domain": "clebercardosoleiloes.com.br",
    "baseUrl": "https://www.clebercardosoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 123,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "albertomacedoleiloes_com_br",
    "name": "Alberto Macedo",
    "domain": "albertomacedoleiloes.com.br",
    "baseUrl": "https://www.albertomacedoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 122,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "d1lance_com_br",
    "name": "D1 Lances Leilões",
    "domain": "d1lance.com.br",
    "baseUrl": "https://www.d1lance.com.br",
    "searchUrl": "https://d1lance.com.br/navegar-pelo-mapa?tipo_filtro=imoveis",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 119,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "legisleiloes_com_br",
    "name": "Legis Leilões",
    "domain": "legisleiloes.com.br",
    "baseUrl": "https://www.legisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 119,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "renovarleiloes_com_br",
    "name": "Renovar Leilões",
    "domain": "renovarleiloes.com.br",
    "baseUrl": "https://www.renovarleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 119,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pecinileiloes_com_br",
    "name": "Pecini Leilões",
    "domain": "pecinileiloes.com.br",
    "baseUrl": "https://www.pecinileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 117,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "centralsuldeleiloes_com_br",
    "name": "Central Sul de Leilões",
    "domain": "centralsuldeleiloes.com.br",
    "baseUrl": "https://www.centralsuldeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 113,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alvaroleiloes_com_br",
    "name": "Alvaro Leilões",
    "domain": "alvaroleiloes.com.br",
    "baseUrl": "https://www.alvaroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 109,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeiropublico_com_br",
    "name": "Rodolfo Schontag",
    "domain": "leiloeiropublico.com.br",
    "baseUrl": "https://www.leiloeiropublico.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 103,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaoeletronico_com_br",
    "name": "Leilão Eletrônico",
    "domain": "leilaoeletronico.com.br",
    "baseUrl": "https://www.leilaoeletronico.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 99,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nakakogueleiloes_com_br",
    "name": "Nakakogue Leilões",
    "domain": "nakakogueleiloes.com.br",
    "baseUrl": "https://www.nakakogueleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 99,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "allianceleiloes_com_br",
    "name": "Alliance Leilões",
    "domain": "allianceleiloes.com.br",
    "baseUrl": "https://www.allianceleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 90,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tabaleiloes_com_br",
    "name": "Taba Leilões",
    "domain": "tabaleiloes.com.br",
    "baseUrl": "https://www.tabaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 89,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "sublimeleiloes_com_br",
    "name": "Sublime Leilões",
    "domain": "sublimeleiloes.com.br",
    "baseUrl": "https://www.sublimeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 88,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "hastapublica_com_br",
    "name": "Hasta Publica",
    "domain": "hastapublica.com.br",
    "baseUrl": "https://www.hastapublica.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 84,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "calilleiloes_com_br",
    "name": "Calil leilões",
    "domain": "calilleiloes.com.br",
    "baseUrl": "https://www.calilleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 77,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "dhleiloes_com_br",
    "name": "DH Leilões",
    "domain": "dhleiloes.com.br",
    "baseUrl": "https://www.dhleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 75,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "danielgarcialeiloes_com_br",
    "name": "Daniel Garcia Leilões",
    "domain": "danielgarcialeiloes.com.br",
    "baseUrl": "https://www.danielgarcialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 74,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloariasmart_com_br",
    "name": "Smart Leilões",
    "domain": "leiloariasmart.com.br",
    "baseUrl": "https://www.leiloariasmart.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 73,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesgold_com_br",
    "name": "Gold Leilões",
    "domain": "leiloesgold.com.br",
    "baseUrl": "https://www.leiloesgold.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 71,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vegasleiloes_com_br",
    "name": "Vegas Leilões",
    "domain": "vegasleiloes.com.br",
    "baseUrl": "https://www.vegasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 71,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "barretoleiloes_com_br",
    "name": "Barreto Leilões",
    "domain": "barretoleiloes.com.br",
    "baseUrl": "https://www.barretoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 70,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "eckertleiloes_com_br",
    "name": "Eckert Leilões",
    "domain": "eckertleiloes.com.br",
    "baseUrl": "https://www.eckertleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 69,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "trileiloes_com_br",
    "name": "TriLeilões",
    "domain": "trileiloes.com.br",
    "baseUrl": "https://www.trileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 66,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mullerleiloes_com_br",
    "name": "Muller Leilões",
    "domain": "mullerleiloes.com.br",
    "baseUrl": "https://www.mullerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 63,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "portalbayit_com_br",
    "name": "Portal Bayit",
    "domain": "portalbayit.com.br",
    "baseUrl": "https://www.portalbayit.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 63,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "kleiloes_com_br",
    "name": "Klockner Leilões",
    "domain": "kleiloes.com.br",
    "baseUrl": "https://www.kleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 55,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "inovaleilao_com_br",
    "name": "Diogo Martins Leiloeiro",
    "domain": "inovaleilao.com.br",
    "baseUrl": "https://www.inovaleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 53,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "balbinoleiloes_com_br",
    "name": "Balbino Leilões",
    "domain": "balbinoleiloes.com.br",
    "baseUrl": "https://www.balbinoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 52,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "e_leiloes_com_br",
    "name": "E-Leilões Market",
    "domain": "e-leiloes.com.br",
    "baseUrl": "https://www.e-leiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 51,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lutheroleiloes_com_br",
    "name": "Luthero Leilões",
    "domain": "lutheroleiloes.com.br",
    "baseUrl": "https://www.lutheroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 50,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "picellileiloes_com_br",
    "name": "Picelli Leilões",
    "domain": "picellileiloes.com.br",
    "baseUrl": "https://www.picellileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 50,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "thaisteixeiraleiloes_com_br",
    "name": "Thais Teixeira Leilões",
    "domain": "thaisteixeiraleiloes.com.br",
    "baseUrl": "https://www.thaisteixeiraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 50,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gilsonleiloes_com_br",
    "name": "Gilson Leilões",
    "domain": "gilsonleiloes.com.br",
    "baseUrl": "https://www.gilsonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 49,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "hastapublica_lel_br",
    "name": "Hasta Pública Leilões",
    "domain": "hastapublica.lel.br",
    "baseUrl": "https://www.hastapublica.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 49,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "balboleiloes_com_br",
    "name": "Balbo leilões",
    "domain": "balboleiloes.com.br",
    "baseUrl": "https://www.balboleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 48,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "santoseborinleiloes_com_br",
    "name": "Santos & Borin Leilões",
    "domain": "santoseborinleiloes.com.br",
    "baseUrl": "https://www.santoseborinleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 48,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaooficialonline_com_br",
    "name": "Leilão Oficial",
    "domain": "leilaooficialonline.com.br",
    "baseUrl": "https://www.leilaooficialonline.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 47,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "patiorochaleiloes_com_br",
    "name": "Pátio Rocha Leilões",
    "domain": "patiorochaleiloes.com.br",
    "baseUrl": "https://www.patiorochaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 47,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pwleiloes_com_br",
    "name": "PW Leilões",
    "domain": "pwleiloes.com.br",
    "baseUrl": "https://www.pwleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 47,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vivaleiloes_com_br",
    "name": "Viva Leilões",
    "domain": "vivaleiloes.com.br",
    "baseUrl": "https://www.vivaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 43,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cargneluttileiloes_com_br",
    "name": "Cargnelutti Leilões",
    "domain": "cargneluttileiloes.com.br",
    "baseUrl": "https://www.cargneluttileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 42,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rechleiloes_com_br",
    "name": "Rech Leilões",
    "domain": "rechleiloes.com.br",
    "baseUrl": "https://www.rechleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 41,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "milanleiloes_com_br",
    "name": "Miani Leilões",
    "domain": "milanleiloes.com.br",
    "baseUrl": "https://www.milanleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 40,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "zallileiloes_com_br",
    "name": "Zalli Leilões",
    "domain": "zallileiloes.com.br",
    "baseUrl": "https://www.zallileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 40,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "apiceleiloes_com_br",
    "name": "Apice Leilões",
    "domain": "apiceleiloes.com.br",
    "baseUrl": "https://www.apiceleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 39,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vendasjudiciais_com_br",
    "name": "Vendas Judiciais Leilões",
    "domain": "vendasjudiciais.com.br",
    "baseUrl": "https://www.vendasjudiciais.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 37,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nortenordesteleiloes_com_br",
    "name": "Norte Nordeste Leilões",
    "domain": "nortenordesteleiloes.com.br",
    "baseUrl": "https://www.nortenordesteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 36,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rauppleiloes_com_br",
    "name": "Raupp Leilões",
    "domain": "rauppleiloes.com.br",
    "baseUrl": "https://www.rauppleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 35,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "santamarialeiloes_com_br",
    "name": "Santa Maria Leilões",
    "domain": "santamarialeiloes.com.br",
    "baseUrl": "https://www.santamarialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 35,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "oroleiloes_lel_br",
    "name": "Oro Leilões",
    "domain": "oroleiloes.lel.br",
    "baseUrl": "https://www.oroleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 34,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nrnleiloes_com_br",
    "name": "NRN Leilões",
    "domain": "nrnleiloes.com.br",
    "baseUrl": "https://www.nrnleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 32,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cidafixerleiloes_com_br",
    "name": "Cida Fixer",
    "domain": "cidafixerleiloes.com.br",
    "baseUrl": "https://www.cidafixerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 31,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pessoaleiloes_com_br",
    "name": "Pessoa Leilões",
    "domain": "pessoaleiloes.com.br",
    "baseUrl": "https://www.pessoaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 31,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "scheid_leilao_br",
    "name": "Scheid Leilões",
    "domain": "scheid.leilao.br",
    "baseUrl": "https://www.scheid.leilao.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 31,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jussiaraleiloes_com",
    "name": "Jussiara Leilões",
    "domain": "jussiaraleiloes.com",
    "baseUrl": "https://www.jussiaraleiloes.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 30,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "paulistanaleiloes_com_br",
    "name": "Paulistana Leilões",
    "domain": "paulistanaleiloes.com.br",
    "baseUrl": "https://www.paulistanaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 30,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "argonetworkleiloes_com_br",
    "name": "Argo network leilões",
    "domain": "argonetworkleiloes.com.br",
    "baseUrl": "https://www.argonetworkleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 29,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cristianoescolaleiloes_com_br",
    "name": "Cristiano Escola Leilões",
    "domain": "cristianoescolaleiloes.com.br",
    "baseUrl": "https://www.cristianoescolaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 29,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "damianileiloes_com_br",
    "name": "Damiani Leilões",
    "domain": "damianileiloes.com.br",
    "baseUrl": "https://www.damianileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 28,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "grandesleiloes_com_br",
    "name": "Grandes Leilões",
    "domain": "grandesleiloes.com.br",
    "baseUrl": "https://www.grandesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 28,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jrfleiloes_com_br",
    "name": "JRF leilões",
    "domain": "jrfleiloes.com.br",
    "baseUrl": "https://www.jrfleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 28,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "qleilao_lel_br",
    "name": "Q Leilão",
    "domain": "qleilao.lel.br",
    "baseUrl": "https://www.qleilao.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 28,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fvleiloes_com_br",
    "name": "FV Leilões",
    "domain": "fvleiloes.com.br",
    "baseUrl": "https://www.fvleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 27,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marcusviniciusleiloes_com_br",
    "name": "Marcus Vinícios Leilões",
    "domain": "marcusviniciusleiloes.com.br",
    "baseUrl": "https://www.marcusviniciusleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 27,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "presottoleiloes_com_br",
    "name": "Presotto Leilões",
    "domain": "presottoleiloes.com.br",
    "baseUrl": "https://www.presottoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 27,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vecchileiloes_com_br",
    "name": "Vecchi Leilões",
    "domain": "vecchileiloes.com.br",
    "baseUrl": "https://www.vecchileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 27,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alienajud_com_br",
    "name": "Alienajud",
    "domain": "alienajud.com.br",
    "baseUrl": "https://www.alienajud.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 26,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesjudiciaisbahia_com_br",
    "name": "Leilões Judiciais Bahia",
    "domain": "leiloesjudiciaisbahia.com.br",
    "baseUrl": "https://www.leiloesjudiciaisbahia.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 26,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nsleiloes_lel_br",
    "name": "NS Leilões",
    "domain": "nsleiloes.lel.br",
    "baseUrl": "https://www.nsleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 25,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "simonleiloes_com_br",
    "name": "Simon Leilões",
    "domain": "simonleiloes.com.br",
    "baseUrl": "https://www.simonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 25,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "regionalleiloes_com_br",
    "name": "Regional Leilões",
    "domain": "regionalleiloes.com.br",
    "baseUrl": "https://www.regionalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 24,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "sodresantoro_com_br",
    "name": "Sodré Santoro",
    "domain": "sodresantoro.com.br",
    "baseUrl": "https://www.sodresantoro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 24,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "teleselimaleiloes_com_br",
    "name": "Teles e Lima Leilões",
    "domain": "teleselimaleiloes.com.br",
    "baseUrl": "https://www.teleselimaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 24,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bastonleiloes_com_br",
    "name": "Baston Leilões",
    "domain": "bastonleiloes.com.br",
    "baseUrl": "https://www.bastonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 23,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeiro_lel_br",
    "name": "André Soares Menegat",
    "domain": "leiloeiro.lel.br",
    "baseUrl": "https://www.leiloeiro.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 23,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lottileiloes_com_br",
    "name": "Lotti Leilões",
    "domain": "lottileiloes.com.br",
    "baseUrl": "https://www.lottileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 23,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "montenegroleiloes_com_br",
    "name": "Montenegro Leilões",
    "domain": "montenegroleiloes.com.br",
    "baseUrl": "https://www.montenegroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 23,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alemaoleiloeiro_com_br",
    "name": "Alemão Leiloeiro",
    "domain": "alemaoleiloeiro.com.br",
    "baseUrl": "https://www.alemaoleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 22,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "oesteleiloes_com_br",
    "name": "Oeste Leilões",
    "domain": "oesteleiloes.com.br",
    "baseUrl": "https://www.oesteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 22,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "dilsonmoreira_com_br",
    "name": "Dilson Moreira Leilões",
    "domain": "dilsonmoreira.com.br",
    "baseUrl": "https://www.dilsonmoreira.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 21,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "faleiloes_com_br",
    "name": "Flares Aguiar Leilões",
    "domain": "faleiloes.com.br",
    "baseUrl": "https://www.faleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 21,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marangonileiloes_com_br",
    "name": "Marangoni Leilões",
    "domain": "marangonileiloes.com.br",
    "baseUrl": "https://www.marangonileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 21,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mpleilao_com_br",
    "name": "MP Leilões",
    "domain": "mpleilao.com.br",
    "baseUrl": "https://www.mpleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 21,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "projudleiloes_com_br",
    "name": "Projud Leilões",
    "domain": "projudleiloes.com.br",
    "baseUrl": "https://www.projudleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 21,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "chbarbosaleiloes_com_br",
    "name": "CH Barbosa Leilões",
    "domain": "chbarbosaleiloes.com.br",
    "baseUrl": "https://www.chbarbosaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cunhaleiloeiro_com_br",
    "name": "Cunha Leilões",
    "domain": "cunhaleiloeiro.com.br",
    "baseUrl": "https://www.cunhaleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "kleiberjrleiloes_com_br",
    "name": "Kleiber Jr Leilões",
    "domain": "kleiberjrleiloes.com.br",
    "baseUrl": "https://www.kleiberjrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesgoias_com_br",
    "name": "Bueno Leilões",
    "domain": "leiloesgoias.com.br",
    "baseUrl": "https://www.leiloesgoias.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marceloleiloeiro_com_br",
    "name": "Marcelo Leiloeiro",
    "domain": "marceloleiloeiro.com.br",
    "baseUrl": "https://www.marceloleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mouzarbastonleiloes_com_br",
    "name": "Mouzar Baston Leilões",
    "domain": "mouzarbastonleiloes.com.br",
    "baseUrl": "https://www.mouzarbastonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "scholanteleiloes_com_br",
    "name": "Scholante Leilões",
    "domain": "scholanteleiloes.com.br",
    "baseUrl": "https://www.scholanteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vsleiloes_com",
    "name": "VS Leilões",
    "domain": "vsleiloes.com",
    "baseUrl": "https://www.vsleiloes.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 20,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gtleiloes_com_br",
    "name": "GT Leilões",
    "domain": "gtleiloes.com.br",
    "baseUrl": "https://www.gtleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaonet_com_br",
    "name": "Leilao Net",
    "domain": "leilaonet.com.br",
    "baseUrl": "https://www.leilaonet.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloes_sicoobvaledovinho_coop_br",
    "name": "Sicoob Vale do Vinho",
    "domain": "leiloes.sicoobvaledovinho.coop.br",
    "baseUrl": "https://www.leiloes.sicoobvaledovinho.coop.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mariafixerleiloes_com_br",
    "name": "Maria Leilões",
    "domain": "mariafixerleiloes.com.br",
    "baseUrl": "https://www.mariafixerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "moraesleiloes_com_br",
    "name": "Moraes Leilões",
    "domain": "moraesleiloes.com.br",
    "baseUrl": "https://www.moraesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pimentelleiloes_com_br",
    "name": "Pimentel Leilões",
    "domain": "pimentelleiloes.com.br",
    "baseUrl": "https://www.pimentelleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 19,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "amleiloeiro_com_br",
    "name": "AM Leiloeiro",
    "domain": "amleiloeiro.com.br",
    "baseUrl": "https://www.amleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 18,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bronzattoleiloes_com_br",
    "name": "Bronzatto Leilões",
    "domain": "bronzattoleiloes.com.br",
    "baseUrl": "https://www.bronzattoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 18,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pietosoleiloes_com_br",
    "name": "Pietoso Leilões",
    "domain": "pietosoleiloes.com.br",
    "baseUrl": "https://www.pietosoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 18,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alinemarquesleiloeira_lel_br",
    "name": "Aline Marques - Leiloeira Pública",
    "domain": "alinemarquesleiloeira.lel.br",
    "baseUrl": "https://www.alinemarquesleiloeira.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "dmleiloesjudiciais_com_br",
    "name": "Danyllo Maia",
    "domain": "dmleiloesjudiciais.com.br",
    "baseUrl": "https://www.dmleiloesjudiciais.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jmfleiloes_com_br",
    "name": "JMF Leilões",
    "domain": "jmfleiloes.com.br",
    "baseUrl": "https://www.jmfleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lancevip_com_br",
    "name": "Lance Vip",
    "domain": "lancevip.com.br",
    "baseUrl": "https://www.lancevip.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leffaleiloes_com_br",
    "name": "Leffa Leilões",
    "domain": "leffaleiloes.com.br",
    "baseUrl": "https://www.leffaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "suedpeterleiloes_com_br",
    "name": "Sued Peter Bastos Dyna",
    "domain": "suedpeterleiloes.com.br",
    "baseUrl": "https://www.suedpeterleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tenleilao_com_br",
    "name": "Ten Leilão",
    "domain": "tenleilao.com.br",
    "baseUrl": "https://www.tenleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 17,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "araujoleiloes_com_br",
    "name": "Araújo Leilões",
    "domain": "araujoleiloes.com.br",
    "baseUrl": "https://www.araujoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "giulianoferronato_com_br",
    "name": "Giuliano Ferronato Leilões",
    "domain": "giulianoferronato.com.br",
    "baseUrl": "https://www.giulianoferronato.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "grupoarremateleiloes_com_br",
    "name": "Arremate Leilões",
    "domain": "grupoarremateleiloes.com.br",
    "baseUrl": "https://www.grupoarremateleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jacleiloes_com_br",
    "name": "JAC Leilões",
    "domain": "jacleiloes.com.br",
    "baseUrl": "https://www.jacleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "multipliqueleiloes_com_br",
    "name": "Multiplique Leilões",
    "domain": "multipliqueleiloes.com.br",
    "baseUrl": "https://www.multipliqueleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "peixotoleiloes_com_br",
    "name": "Peixoto Leilões",
    "domain": "peixotoleiloes.com.br",
    "baseUrl": "https://www.peixotoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "sumareleiloes_com_br",
    "name": "Sumare Leilões",
    "domain": "sumareleiloes.com.br",
    "baseUrl": "https://www.sumareleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 16,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesbrasil_com_br",
    "name": "Leilões Brasil",
    "domain": "leiloesbrasil.com.br",
    "baseUrl": "https://www.leiloesbrasil.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 15,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "oleiloes_com_br",
    "name": "O Leilões",
    "domain": "oleiloes.com.br",
    "baseUrl": "https://www.oleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 15,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "clademirleiloeiro_com_br",
    "name": "Clademir Leilões",
    "domain": "clademirleiloeiro.com.br",
    "baseUrl": "https://www.clademirleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "eduardovivian_com_br",
    "name": "Eduardo Vivian Leiloeiro",
    "domain": "eduardovivian.com.br",
    "baseUrl": "https://www.eduardovivian.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fidalgoleiloes_com_br",
    "name": "Fidalgo Leilões",
    "domain": "fidalgoleiloes.com.br",
    "baseUrl": "https://www.fidalgoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "galvanileiloes_com_br",
    "name": "Galvani Leilões",
    "domain": "galvanileiloes.com.br",
    "baseUrl": "https://www.galvanileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lunellileiloes_com_br",
    "name": "Lunelli Leilões",
    "domain": "lunellileiloes.com.br",
    "baseUrl": "https://www.lunellileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "machadoleiloeiro_com_br",
    "name": "Machado Leiloeiro",
    "domain": "machadoleiloeiro.com.br",
    "baseUrl": "https://www.machadoleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 14,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "casareisleiloes_com_br",
    "name": "Casa Reis Leilões",
    "domain": "casareisleiloes.com.br",
    "baseUrl": "https://www.casareisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 13,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tribunaleiloes_com_br",
    "name": "Tribuna Leilões",
    "domain": "tribunaleiloes.com.br",
    "baseUrl": "https://www.tribunaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 13,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "aragaoleiloes_com_br",
    "name": "Aragão Leilões",
    "domain": "aragaoleiloes.com.br",
    "baseUrl": "https://www.aragaoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fabianebaldisseraleiloes_com_br",
    "name": "Fabiane Baldissera Leilões",
    "domain": "fabianebaldisseraleiloes.com.br",
    "baseUrl": "https://www.fabianebaldisseraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "franklinleiloes_com_br",
    "name": "Franklin Leilões",
    "domain": "franklinleiloes.com.br",
    "baseUrl": "https://www.franklinleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "ktzleiloes_com_br",
    "name": "KTZ Leilões",
    "domain": "ktzleiloes.com.br",
    "baseUrl": "https://www.ktzleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesaguiar_com_br",
    "name": "Leilões Aguiar",
    "domain": "leiloesaguiar.com.br",
    "baseUrl": "https://www.leiloesaguiar.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "silveiraleiloes_com_br",
    "name": "Silveira Leilões",
    "domain": "silveiraleiloes.com.br",
    "baseUrl": "https://www.silveiraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tonialleiloes_com_br",
    "name": "Tonial Leilões",
    "domain": "tonialleiloes.com.br",
    "baseUrl": "https://www.tonialleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "valeroleiloes_com_br",
    "name": "Valero Leilões",
    "domain": "valeroleiloes.com.br",
    "baseUrl": "https://www.valeroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 12,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "atrioleiloes_com_br",
    "name": "Atrio Leilões",
    "domain": "atrioleiloes.com.br",
    "baseUrl": "https://www.atrioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "benedettoleiloes_com_br",
    "name": "Benedetto Leilões",
    "domain": "benedettoleiloes.com.br",
    "baseUrl": "https://www.benedettoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bezerraleiloes_com_br",
    "name": "Bezerra Leilões",
    "domain": "bezerraleiloes.com.br",
    "baseUrl": "https://www.bezerraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "colodeteleiloes_com_br",
    "name": "Mauro Colodete Leilões",
    "domain": "colodeteleiloes.com.br",
    "baseUrl": "https://www.colodeteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "faroonline_com_br",
    "name": "Faro Leilões",
    "domain": "faroonline.com.br",
    "baseUrl": "https://www.faroonline.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "flaviogarcia_lel_br",
    "name": "Flávio Garcia",
    "domain": "flaviogarcia.lel.br",
    "baseUrl": "https://www.flaviogarcia.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lancese_com_br",
    "name": "Lance Leilões Sergipe",
    "domain": "lancese.com.br",
    "baseUrl": "https://www.lancese.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesrn_com_br",
    "name": "Leilões RN",
    "domain": "leiloesrn.com.br",
    "baseUrl": "https://www.leiloesrn.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pbcastro_com_br",
    "name": "PB Castro",
    "domain": "pbcastro.com.br",
    "baseUrl": "https://www.pbcastro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "topleiloes_com_br",
    "name": "Top Leilões",
    "domain": "topleiloes.com.br",
    "baseUrl": "https://www.topleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "totalleiloes_com_br",
    "name": "Total leilões",
    "domain": "totalleiloes.com.br",
    "baseUrl": "https://www.totalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vmleiloes_com_br",
    "name": "VM Leilões",
    "domain": "vmleiloes.com.br",
    "baseUrl": "https://www.vmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "wspleiloes_com_br",
    "name": "WSP Leilões",
    "domain": "wspleiloes.com.br",
    "baseUrl": "https://www.wspleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 11,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "123leiloes_com_br",
    "name": "123 Leilões",
    "domain": "123leiloes.com.br",
    "baseUrl": "https://www.123leiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "absolutaleiloes_com_br",
    "name": "Absoluta Leilões",
    "domain": "absolutaleiloes.com.br",
    "baseUrl": "https://www.absolutaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "agsleiloes_com_br",
    "name": "AGS Leilões",
    "domain": "agsleiloes.com.br",
    "baseUrl": "https://www.agsleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alexandrepedrosaleiloeiro_com_br",
    "name": "Alexandre Pedrosa Leiloeiro",
    "domain": "alexandrepedrosaleiloeiro.com.br",
    "baseUrl": "https://www.alexandrepedrosaleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "arremaxleiloes_com_br",
    "name": "Arremax Leilões",
    "domain": "arremaxleiloes.com.br",
    "baseUrl": "https://www.arremaxleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "drleiloes_com_br",
    "name": "DR Leilões",
    "domain": "drleiloes.com.br",
    "baseUrl": "https://www.drleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "felipefrazao_com_br",
    "name": "Felipe Frazao Leilões",
    "domain": "felipefrazao.com.br",
    "baseUrl": "https://www.felipefrazao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jdleiloes_com_br",
    "name": "JD Leilões",
    "domain": "jdleiloes.com.br",
    "baseUrl": "https://www.jdleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marcaleiloes_com_br",
    "name": "Marca Leilões",
    "domain": "marcaleiloes.com.br",
    "baseUrl": "https://www.marcaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "planaltoleiloes_com_br",
    "name": "Planalto Leilões",
    "domain": "planaltoleiloes.com.br",
    "baseUrl": "https://www.planaltoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "planoleiloes_com_br",
    "name": "Plano Leilões",
    "domain": "planoleiloes.com.br",
    "baseUrl": "https://www.planoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "polileiloes_com_br",
    "name": "Poli Leilões",
    "domain": "polileiloes.com.br",
    "baseUrl": "https://www.polileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "serpaleiloes_com_br",
    "name": "Serpa Leilões",
    "domain": "serpaleiloes.com.br",
    "baseUrl": "https://www.serpaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "victordortaleiloes_com_br",
    "name": "Victor Dorta Leilões",
    "domain": "victordortaleiloes.com.br",
    "baseUrl": "https://www.victordortaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 10,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "arrematabem_com_br",
    "name": "Arremata Bem Leilões Oficiais",
    "domain": "arrematabem.com.br",
    "baseUrl": "https://www.arrematabem.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bcoleiloes_com_br",
    "name": "BCO Leilões",
    "domain": "bcoleiloes.com.br",
    "baseUrl": "https://www.bcoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "custodioleiloes_com_br",
    "name": "Custódio Leilões",
    "domain": "custodioleiloes.com.br",
    "baseUrl": "https://www.custodioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "donizetteleiloes_com_br",
    "name": "Donizette Leilões",
    "domain": "donizetteleiloes.com.br",
    "baseUrl": "https://www.donizetteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "duarteleiloes_com_br",
    "name": "Duarte Leilões Oficiais",
    "domain": "duarteleiloes.com.br",
    "baseUrl": "https://www.duarteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "flexleiloes_com_br",
    "name": "Flex Leilões",
    "domain": "flexleiloes.com.br",
    "baseUrl": "https://www.flexleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeirobarbieri_com_br",
    "name": "Marciano Barbieri Leilões",
    "domain": "leiloeirobarbieri.com.br",
    "baseUrl": "https://www.leiloeirobarbieri.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloescentrooeste_com_br",
    "name": "Leilões Centro Oeste",
    "domain": "leiloescentrooeste.com.br",
    "baseUrl": "https://www.leiloescentrooeste.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mgleiloes_rs_com_br",
    "name": "MGLeilões-RS",
    "domain": "mgleiloes-rs.com.br",
    "baseUrl": "https://www.mgleiloes-rs.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rochaleiloes_com_br",
    "name": "Rocha Leilões",
    "domain": "rochaleiloes.com.br",
    "baseUrl": "https://www.rochaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tmleiloes_com_br",
    "name": "TM Leilões",
    "domain": "tmleiloes.com.br",
    "baseUrl": "https://www.tmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 9,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "agencialeilao_com_br",
    "name": "Agência de Leilões",
    "domain": "agencialeilao.com.br",
    "baseUrl": "https://www.agencialeilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alexandridisleiloes_com_br",
    "name": "Alexandridis Leilões",
    "domain": "alexandridisleiloes.com.br",
    "baseUrl": "https://www.alexandridisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "amazonasleiloes_com_br",
    "name": "Amazonas Leilões",
    "domain": "amazonasleiloes.com.br",
    "baseUrl": "https://www.amazonasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "baldisseraleiloes_com_br",
    "name": "Andréa Baldissera",
    "domain": "baldisseraleiloes.com.br",
    "baseUrl": "https://www.baldisseraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "brasilsulleiloes_com_br",
    "name": "Brasil Sul Leilões",
    "domain": "brasilsulleiloes.com.br",
    "baseUrl": "https://www.brasilsulleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cassianoleiloes_com_br",
    "name": "Cassiano Dall'ago",
    "domain": "cassianoleiloes.com.br",
    "baseUrl": "https://www.cassianoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "crisleiloes_com_br",
    "name": "Cris Leilões",
    "domain": "crisleiloes.com.br",
    "baseUrl": "https://www.crisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "crleiloes_com_br",
    "name": "Cláudio Reis Leiloeiro",
    "domain": "crleiloes.com.br",
    "baseUrl": "https://www.crleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "dcmleiloes_com_br",
    "name": "DCM Leilões",
    "domain": "dcmleiloes.com.br",
    "baseUrl": "https://www.dcmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "elance_com_br",
    "name": "E-Lance Leilões",
    "domain": "elance.com.br",
    "baseUrl": "https://www.elance.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fabiobarbosaleiloes_com_br",
    "name": "Fabio Barbosa Leilões",
    "domain": "fabiobarbosaleiloes.com.br",
    "baseUrl": "https://www.fabiobarbosaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fbleiloes_com_br",
    "name": "Frida Becker Leilões",
    "domain": "fbleiloes.com.br",
    "baseUrl": "https://www.fbleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nasarleiloes_com_br",
    "name": "Nasar Leilões",
    "domain": "nasarleiloes.com.br",
    "baseUrl": "https://www.nasarleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pulseleiloes_com_br",
    "name": "Pulse Leilões",
    "domain": "pulseleiloes.com.br",
    "baseUrl": "https://www.pulseleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 8,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "akimotoleiloes_com_br",
    "name": "Akimoto Leilões",
    "domain": "akimotoleiloes.com.br",
    "baseUrl": "https://www.akimotoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bianchileiloes_com_br",
    "name": "Bianchi Leilões",
    "domain": "bianchileiloes.com.br",
    "baseUrl": "https://www.bianchileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cardosoleiloes_com_br",
    "name": "Cardoso Leilões",
    "domain": "cardosoleiloes.com.br",
    "baseUrl": "https://www.cardosoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "doleiloes_com_br",
    "name": "Daniel Oliveira Leiloeiro Oficial",
    "domain": "doleiloes.com.br",
    "baseUrl": "https://www.doleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lecapeleiloes_com_br",
    "name": "Lecape Leilões",
    "domain": "lecapeleiloes.com.br",
    "baseUrl": "https://www.lecapeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaopernambuco_com_br",
    "name": "Leilão Pernambuco",
    "domain": "leilaopernambuco.com.br",
    "baseUrl": "https://www.leilaopernambuco.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lucianleiloes_com_br",
    "name": "Lucian Leilões",
    "domain": "lucianleiloes.com.br",
    "baseUrl": "https://www.lucianleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mazzollileiloes_com_br",
    "name": "Mazzolli Leilões",
    "domain": "mazzollileiloes.com.br",
    "baseUrl": "https://www.mazzollileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nelcileiloes_com_br",
    "name": "Nelci Leilões",
    "domain": "nelcileiloes.com.br",
    "baseUrl": "https://www.nelcileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "oaleiloes_com_br",
    "name": "OAL Leilões",
    "domain": "oaleiloes.com.br",
    "baseUrl": "https://www.oaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "pinheiroleiloes_com_br",
    "name": "Pinheiro Leilões",
    "domain": "pinheiroleiloes.com.br",
    "baseUrl": "https://www.pinheiroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "raotaleiloes_com_br",
    "name": "Raota Leilões",
    "domain": "raotaleiloes.com.br",
    "baseUrl": "https://www.raotaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rapidaovende_com_br",
    "name": "Rapidão Vende",
    "domain": "rapidaovende.com.br",
    "baseUrl": "https://www.rapidaovende.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "ruipintoleiloeiro_com_br",
    "name": "Rui Pinto Leiloeiro",
    "domain": "ruipintoleiloeiro.com.br",
    "baseUrl": "https://www.ruipintoleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vargasepintoleiloes_com_br",
    "name": "Vargas e Pinto Leilões",
    "domain": "vargasepintoleiloes.com.br",
    "baseUrl": "https://www.vargasepintoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 7,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alleiloes_com_br",
    "name": "AL Leilões",
    "domain": "alleiloes.com.br",
    "baseUrl": "https://www.alleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "correaleiloes_com_br",
    "name": "Corrêa Leilões",
    "domain": "correaleiloes.com.br",
    "baseUrl": "https://www.correaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fidelisleiloes_com_br",
    "name": "Fidelis Leilões",
    "domain": "fidelisleiloes.com.br",
    "baseUrl": "https://www.fidelisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gelsonleiloes_com_br",
    "name": "Gelson Leilões",
    "domain": "gelsonleiloes.com.br",
    "baseUrl": "https://www.gelsonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "goldenbrazilleiloes_com_br",
    "name": "Golden Leilões",
    "domain": "goldenbrazilleiloes.com.br",
    "baseUrl": "https://www.goldenbrazilleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "krobelleiloes_com_br",
    "name": "Krobel Leilões",
    "domain": "krobelleiloes.com.br",
    "baseUrl": "https://www.krobelleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesmonteiro_com_br",
    "name": "Leilões Monteiro",
    "domain": "leiloesmonteiro.com.br",
    "baseUrl": "https://www.leiloesmonteiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lessaleiloes_com_br",
    "name": "Mário Lessa",
    "domain": "lessaleiloes.com.br",
    "baseUrl": "https://www.lessaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "reginaaudeleiloes_com_br",
    "name": "Regina Aude Leilões",
    "domain": "reginaaudeleiloes.com.br",
    "baseUrl": "https://www.reginaaudeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "superaleiloes_com_br",
    "name": "Supera Leilões",
    "domain": "superaleiloes.com.br",
    "baseUrl": "https://www.superaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "trustbid_com_br",
    "name": "Trust Bid",
    "domain": "trustbid.com.br",
    "baseUrl": "https://www.trustbid.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vidalleiloes_com_br",
    "name": "Vidal Leilões",
    "domain": "vidalleiloes.com.br",
    "baseUrl": "https://www.vidalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 6,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "3torresleiloes_com_br",
    "name": "3torres Leilões",
    "domain": "3torresleiloes.com.br",
    "baseUrl": "https://www.3torresleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "capitalleiloes_com_br",
    "name": "Capital Leilões",
    "domain": "capitalleiloes.com.br",
    "baseUrl": "https://www.capitalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "capitalvalorleiloes_com_br",
    "name": "Capital Valor Leilões",
    "domain": "capitalvalorleiloes.com.br",
    "baseUrl": "https://www.capitalvalorleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gabrielleiloes_com_br",
    "name": "Gabriel Rosa Leilões",
    "domain": "gabrielleiloes.com.br",
    "baseUrl": "https://www.gabrielleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "insigneleiloes_com_br",
    "name": "Insigne Leilões",
    "domain": "insigneleiloes.com.br",
    "baseUrl": "https://www.insigneleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesonlinems_com_br",
    "name": "Leilões Online MS",
    "domain": "leiloesonlinems.com.br",
    "baseUrl": "https://www.leiloesonlinems.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marcotulioleiloes_com_br",
    "name": "Marco Túlio Leilões",
    "domain": "marcotulioleiloes.com.br",
    "baseUrl": "https://www.marcotulioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "norteleiloes_com_br",
    "name": "Norte Leilões",
    "domain": "norteleiloes.com.br",
    "baseUrl": "https://www.norteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nossoleilao_com_br",
    "name": "Nosso Leilão",
    "domain": "nossoleilao.com.br",
    "baseUrl": "https://www.nossoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "santayanaleiloes_com_br",
    "name": "Santayana Leilões",
    "domain": "santayanaleiloes.com.br",
    "baseUrl": "https://www.santayanaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "verdeamareloleiloes_com_br",
    "name": "Verde Amarelo Leilões",
    "domain": "verdeamareloleiloes.com.br",
    "baseUrl": "https://www.verdeamareloleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "zagoleiloes_com_br",
    "name": "Zago Leilões",
    "domain": "zagoleiloes.com.br",
    "baseUrl": "https://www.zagoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 5,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "adrianoapolinario_com_br",
    "name": "Adriano Apolinário",
    "domain": "adrianoapolinario.com.br",
    "baseUrl": "https://www.adrianoapolinario.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "andreluizleiloes_com_br",
    "name": "André Luiz Leilões",
    "domain": "andreluizleiloes.com.br",
    "baseUrl": "https://www.andreluizleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "arenaleilao_com_br",
    "name": "Arena Leilões",
    "domain": "arenaleilao.com.br",
    "baseUrl": "https://www.arenaleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "arnoldoleiloes_com_br",
    "name": "Arnoldo Leilões",
    "domain": "arnoldoleiloes.com.br",
    "baseUrl": "https://www.arnoldoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "backleiloes_com_br",
    "name": "Back Leilões",
    "domain": "backleiloes.com.br",
    "baseUrl": "https://www.backleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bestleiloes_com_br",
    "name": "Best Leilões",
    "domain": "bestleiloes.com.br",
    "baseUrl": "https://www.bestleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "casaforteleiloes_com_br",
    "name": "Casa Forte Leilões",
    "domain": "casaforteleiloes.com.br",
    "baseUrl": "https://www.casaforteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "casaleiloeira_com_br",
    "name": "Casa Leiloeira",
    "domain": "casaleiloeira.com.br",
    "baseUrl": "https://www.casaleiloeira.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "cencin_com_br",
    "name": "Cencin Leilões",
    "domain": "cencin.com.br",
    "baseUrl": "https://www.cencin.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "clovisleiloeiro_com_br",
    "name": "Clóvis Leiloeiro",
    "domain": "clovisleiloeiro.com.br",
    "baseUrl": "https://www.clovisleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "colossoleiloes_com_br",
    "name": "Colosso Leilões",
    "domain": "colossoleiloes.com.br",
    "baseUrl": "https://www.colossoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jorgebrasil_lel_br",
    "name": "Engenheiro Jorge Brasil",
    "domain": "jorgebrasil.lel.br",
    "baseUrl": "https://www.jorgebrasil.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jritta_lel_br",
    "name": "Ritta Leilões",
    "domain": "jritta.lel.br",
    "baseUrl": "https://www.jritta.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "kingleiloes_net",
    "name": "King Leilões",
    "domain": "kingleiloes.net",
    "baseUrl": "https://www.kingleiloes.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeiro_online",
    "name": "Carstens Leiloeiros",
    "domain": "leiloeiro.online",
    "baseUrl": "https://www.leiloeiro.online",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leomarkirinusleiloes_com_br",
    "name": "Leomar Kirinus Leilões",
    "domain": "leomarkirinusleiloes.com.br",
    "baseUrl": "https://www.leomarkirinusleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "monzonleiloes_com_br",
    "name": "Monzon Leilões",
    "domain": "monzonleiloes.com.br",
    "baseUrl": "https://www.monzonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "raicherleiloes_com_br",
    "name": "Raicher Leilões",
    "domain": "raicherleiloes.com.br",
    "baseUrl": "https://www.raicherleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rz_leilao_br",
    "name": "[AGENTE] Roberta Zago Leilões 2110 212517",
    "domain": "rz.leilao.br",
    "baseUrl": "https://www.rz.leilao.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "selectleiloes_com_br",
    "name": "Select Leilões",
    "domain": "selectleiloes.com.br",
    "baseUrl": "https://www.selectleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "superleiloes_net",
    "name": "Super Leilões",
    "domain": "superleiloes.net",
    "baseUrl": "https://www.superleiloes.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tulioleiloes_com_br",
    "name": "Tulio Leilões",
    "domain": "tulioleiloes.com.br",
    "baseUrl": "https://www.tulioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "valerioiaminleiloes_com_br",
    "name": "Valerio Iamin Leilões",
    "domain": "valerioiaminleiloes.com.br",
    "baseUrl": "https://www.valerioiaminleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vasconcelosleiloes_com_br",
    "name": "Vasconcelos Leilões",
    "domain": "vasconcelosleiloes.com.br",
    "baseUrl": "https://www.vasconcelosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "zampierileiloes_com_br",
    "name": "Zampieri Leilões",
    "domain": "zampierileiloes.com.br",
    "baseUrl": "https://www.zampierileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 4,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "andrealeiloeira_lel_br",
    "name": "Andréa Leiloeira Pública",
    "domain": "andrealeiloeira.lel.br",
    "baseUrl": "https://www.andrealeiloeira.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bampileiloes_com_br",
    "name": "RB Leilões",
    "domain": "bampileiloes.com.br",
    "baseUrl": "https://www.bampileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bnleiloes_com_br",
    "name": "BN Leilões",
    "domain": "bnleiloes.com.br",
    "baseUrl": "https://www.bnleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "caiapoleiloes_com_br",
    "name": "Caiapó Leilões",
    "domain": "caiapoleiloes.com.br",
    "baseUrl": "https://www.caiapoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "centraldosleiloes_com_br",
    "name": "Central dos Leilões",
    "domain": "centraldosleiloes.com.br",
    "baseUrl": "https://www.centraldosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "deluccaleiloes_com_br",
    "name": "De Lucca Leilões",
    "domain": "deluccaleiloes.com.br",
    "baseUrl": "https://www.deluccaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gspleiloes_com_br",
    "name": "GSP Leilões",
    "domain": "gspleiloes.com.br",
    "baseUrl": "https://www.gspleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "ibecleiloes_com_br",
    "name": "Ibec Leilões",
    "domain": "ibecleiloes.com.br",
    "baseUrl": "https://www.ibecleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "jorgemarcoleiloes_com_br",
    "name": "Jorge Marco Leilões",
    "domain": "jorgemarcoleiloes.com.br",
    "baseUrl": "https://www.jorgemarcoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "juleiloes_com_br",
    "name": "Jucenara de Mello Vieira Bordignon - Leilões",
    "domain": "juleiloes.com.br",
    "baseUrl": "https://www.juleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloesfederal_com_br",
    "name": "Federal Leilões",
    "domain": "leiloesfederal.com.br",
    "baseUrl": "https://www.leiloesfederal.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeslaraforster_com_br",
    "name": "Lara-Forster Leilões",
    "domain": "leiloeslaraforster.com.br",
    "baseUrl": "https://www.leiloeslaraforster.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "luizleiloes_com_br",
    "name": "Luiz Leilões",
    "domain": "luizleiloes.com.br",
    "baseUrl": "https://www.luizleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "magalhaesleiloes_com_br",
    "name": "Magalhães Leilões",
    "domain": "magalhaesleiloes.com.br",
    "baseUrl": "https://www.magalhaesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "portaldoleiloeiro_com_br",
    "name": "Júlio Ramos Leilões",
    "domain": "portaldoleiloeiro.com.br",
    "baseUrl": "https://www.portaldoleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rjleiloes_com_br",
    "name": "RJ Leilões",
    "domain": "rjleiloes.com.br",
    "baseUrl": "https://www.rjleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "tononleiloes_com_br",
    "name": "Tonon Leilões",
    "domain": "tononleiloes.com.br",
    "baseUrl": "https://www.tononleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 3,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "abaleiloes_com_br",
    "name": "Aba Leilões",
    "domain": "abaleiloes.com.br",
    "baseUrl": "https://www.abaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "agilileiloes_com_br",
    "name": "Agili Leilões",
    "domain": "agilileiloes.com.br",
    "baseUrl": "https://www.agilileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "blmleiloes_com_br",
    "name": "BLM Leilões",
    "domain": "blmleiloes.com.br",
    "baseUrl": "https://www.blmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "centraljudicial_com_br",
    "name": "Central Judicial Leilões",
    "domain": "centraljudicial.com.br",
    "baseUrl": "https://www.centraljudicial.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "correaquinhonesleiloes_com_br",
    "name": "Correa Quinhones Leilões",
    "domain": "correaquinhonesleiloes.com.br",
    "baseUrl": "https://www.correaquinhonesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "deborabarzleiloes_com_br",
    "name": "Débora Barz Leilões",
    "domain": "deborabarzleiloes.com.br",
    "baseUrl": "https://www.deborabarzleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "diegoleiloes_com_br",
    "name": "Diego Wolf de Oliveira",
    "domain": "diegoleiloes.com.br",
    "baseUrl": "https://www.diegoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "fariasleiloes_com_br",
    "name": "Farias Leilões",
    "domain": "fariasleiloes.com.br",
    "baseUrl": "https://www.fariasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gaialeiloes_com_br",
    "name": "Gaia Leilões",
    "domain": "gaialeiloes.com.br",
    "baseUrl": "https://www.gaialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "gustavoreisleiloes_com_br",
    "name": "Gustavo Reis Leilões",
    "domain": "gustavoreisleiloes.com.br",
    "baseUrl": "https://www.gustavoreisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "judiciali_com",
    "name": "Judiciali leilões",
    "domain": "judiciali.com",
    "baseUrl": "https://www.judiciali.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lancetotal_com_br",
    "name": "Lance Total Leilões",
    "domain": "lancetotal.com.br",
    "baseUrl": "https://www.lancetotal.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloador_com_br",
    "name": "Leiloador",
    "domain": "leiloador.com.br",
    "baseUrl": "https://www.leiloador.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloeirobonatto_com_br",
    "name": "Leiloeiro Bonatto",
    "domain": "leiloeirobonatto.com.br",
    "baseUrl": "https://www.leiloeirobonatto.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leiloespb_com_br",
    "name": "Leilões PB",
    "domain": "leiloespb.com.br",
    "baseUrl": "https://www.leiloespb.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "luciverareisleiloes_com_br",
    "name": "Reis Leilões",
    "domain": "luciverareisleiloes.com.br",
    "baseUrl": "https://www.luciverareisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "maisleilao_com_br",
    "name": "Mais Leilões",
    "domain": "maisleilao.com.br",
    "baseUrl": "https://www.maisleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "marquesleiloes_com_br",
    "name": "Marques Leilões",
    "domain": "marquesleiloes.com.br",
    "baseUrl": "https://www.marquesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rmcleiloes_com_br",
    "name": "RMC leilões",
    "domain": "rmcleiloes.com.br",
    "baseUrl": "https://www.rmcleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rmmleiloes_com_br",
    "name": "RMM Leilões",
    "domain": "rmmleiloes.com.br",
    "baseUrl": "https://www.rmmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "schererleiloes_com_br",
    "name": "Adalberto Scherer Leilões",
    "domain": "schererleiloes.com.br",
    "baseUrl": "https://www.schererleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "sfrazao_com_br",
    "name": "SFrazão Leilões",
    "domain": "sfrazao.com.br",
    "baseUrl": "https://www.sfrazao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "spencerleiloes_com_br",
    "name": "Spencer Leilões",
    "domain": "spencerleiloes.com.br",
    "baseUrl": "https://www.spencerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "startupleiloes_com_br",
    "name": "Startup Leilões",
    "domain": "startupleiloes.com.br",
    "baseUrl": "https://www.startupleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vlleiloes_com_br",
    "name": "VL Leilões",
    "domain": "vlleiloes.com.br",
    "baseUrl": "https://www.vlleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "wleiloes_com_br",
    "name": "W Leilões",
    "domain": "wleiloes.com.br",
    "baseUrl": "https://www.wleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "zuccalmaglioleiloes_com_br",
    "name": "Zuccalmaglio Leilões",
    "domain": "zuccalmaglioleiloes.com.br",
    "baseUrl": "https://www.zuccalmaglioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 2,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "adringleiloes_com_br",
    "name": "ADring Leilões",
    "domain": "adringleiloes.com.br",
    "baseUrl": "https://www.adringleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "agleiloes_com_br",
    "name": "AG Leilões",
    "domain": "agleiloes.com.br",
    "baseUrl": "https://www.agleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "alvaroantonioleiloes_com_br",
    "name": "Álvaro Antônio Leilões",
    "domain": "alvaroantonioleiloes.com.br",
    "baseUrl": "https://www.alvaroantonioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "atlanticoleiloes_com_br",
    "name": "Atlântico Leilões",
    "domain": "atlanticoleiloes.com.br",
    "baseUrl": "https://www.atlanticoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bigleilao_com_br",
    "name": "Big Leilão",
    "domain": "bigleilao.com.br",
    "baseUrl": "https://www.bigleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "brancalliao_com_br",
    "name": "Brancalliao Leilões",
    "domain": "brancalliao.com.br",
    "baseUrl": "https://www.brancalliao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "bringelleiloes_com_br",
    "name": "Bringel Leilões",
    "domain": "bringelleiloes.com.br",
    "baseUrl": "https://www.bringelleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "brunoleiloes_com_br",
    "name": "Bruno Leilões",
    "domain": "brunoleiloes.com.br",
    "baseUrl": "https://www.brunoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "casadeleiloes_com_br",
    "name": "Casa de Leilões",
    "domain": "casadeleiloes.com.br",
    "baseUrl": "https://www.casadeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "catarinaleiloes_com_br",
    "name": "Catarinense Leilões",
    "domain": "catarinaleiloes.com.br",
    "baseUrl": "https://www.catarinaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "ceciliadelzeirleiloes_com_br",
    "name": "Cecília Delzeir Leilões",
    "domain": "ceciliadelzeirleiloes.com.br",
    "baseUrl": "https://www.ceciliadelzeirleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "darioleiloes_com_br",
    "name": "Dario Leilões",
    "domain": "darioleiloes.com.br",
    "baseUrl": "https://www.darioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "dbsleiloes_com_br",
    "name": "DBS Leilões",
    "domain": "dbsleiloes.com.br",
    "baseUrl": "https://www.dbsleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "desouzaleiloes_com_br",
    "name": "De Souza Leilões",
    "domain": "desouzaleiloes.com.br",
    "baseUrl": "https://www.desouzaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "douglasleiloeiro_com_br",
    "name": "Douglas Leilões",
    "domain": "douglasleiloeiro.com.br",
    "baseUrl": "https://www.douglasleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "espressoleiloes_com_br",
    "name": "Espresso Leilões",
    "domain": "espressoleiloes.com.br",
    "baseUrl": "https://www.espressoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "impactoleiloes_com_br",
    "name": "Impacto Leilões",
    "domain": "impactoleiloes.com.br",
    "baseUrl": "https://www.impactoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "iniciativabr_com_br",
    "name": "Iniciativa Leilões",
    "domain": "iniciativabr.com.br",
    "baseUrl": "https://www.iniciativabr.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "isabelleiloes_com_br",
    "name": "Isabel Leilões",
    "domain": "isabelleiloes.com.br",
    "baseUrl": "https://www.isabelleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "lancecertoleiloes_com_br",
    "name": "Lance Certo Leilões",
    "domain": "lancecertoleiloes.com.br",
    "baseUrl": "https://www.lancecertoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilaoinvestment_com_br",
    "name": "Leilão Investment Leilões",
    "domain": "leilaoinvestment.com.br",
    "baseUrl": "https://www.leilaoinvestment.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "leilo_com_br",
    "name": "Leilo",
    "domain": "leilo.com.br",
    "baseUrl": "https://www.leilo.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "machadoleiloesrs_com_br",
    "name": "Machado Leilões RS",
    "domain": "machadoleiloesrs.com.br",
    "baseUrl": "https://www.machadoleiloesrs.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "mrl4leiloes_com_br",
    "name": "MRL4 Leilões",
    "domain": "mrl4leiloes.com.br",
    "baseUrl": "https://www.mrl4leiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "nordesteleiloes_com_br",
    "name": "Nordeste Leilões",
    "domain": "nordesteleiloes.com.br",
    "baseUrl": "https://www.nordesteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "omcleiloes_com_br",
    "name": "OMC leilões",
    "domain": "omcleiloes.com.br",
    "baseUrl": "https://www.omcleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "prosperarleiloes_com_br",
    "name": "Prosperar Leilões",
    "domain": "prosperarleiloes.com.br",
    "baseUrl": "https://www.prosperarleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "rdleiloes_com_br",
    "name": "RD Leilões",
    "domain": "rdleiloes.com.br",
    "baseUrl": "https://www.rdleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "sfleiloes_com_br",
    "name": "SF Leilões",
    "domain": "sfleiloes.com.br",
    "baseUrl": "https://www.sfleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "ubaldoleiloes_com_br",
    "name": "Ubaldo Jordão Leilões",
    "domain": "ubaldoleiloes.com.br",
    "baseUrl": "https://www.ubaldoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "unileiloes_com_br",
    "name": "Uni Leilões",
    "domain": "unileiloes.com.br",
    "baseUrl": "https://www.unileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "vianaleiloes_com_br",
    "name": "Viana Leilões",
    "domain": "vianaleiloes.com.br",
    "baseUrl": "https://www.vianaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "zampierileiloeiro_com_br",
    "name": "Zampieri Leiloeiro",
    "domain": "zampierileiloeiro.com.br",
    "baseUrl": "https://www.zampierileiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 1,
    "nexusSituacao": "com_imoveis"
  },
  {
    "id": "canaljudicial_com_br",
    "name": "Canal judicial leilões",
    "domain": "canaljudicial.com.br",
    "baseUrl": "https://www.canaljudicial.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "escritoriodeleiloes_com_br",
    "name": "Escritório de Leilões",
    "domain": "escritoriodeleiloes.com.br",
    "baseUrl": "https://www.escritoriodeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "leiloesjudiciais_com_br",
    "name": "leiloesjudiciais.com.br",
    "domain": "leiloesjudiciais.com.br",
    "baseUrl": "https://www.leiloesjudiciais.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "leiloesjudiciaismg_com_br",
    "name": "Leilões Judiciais MG",
    "domain": "leiloesjudiciaismg.com.br",
    "baseUrl": "https://www.leiloesjudiciaismg.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "maisativojudicial_com_br",
    "name": "maisativojudicial.com.br",
    "domain": "maisativojudicial.com.br",
    "baseUrl": "https://www.maisativojudicial.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "oneleiloes_com_br",
    "name": "One Leilões",
    "domain": "oneleiloes.com.br",
    "baseUrl": "https://www.oneleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "agregador"
  },
  {
    "id": "alvaroferreiraleiloeiro_com_br",
    "name": "Alvaro Ferreira Leiloeiro",
    "domain": "alvaroferreiraleiloeiro.com.br",
    "baseUrl": "https://www.alvaroferreiraleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "andrearaujoleiloes_com_br",
    "name": "André Araujo Leilões",
    "domain": "andrearaujoleiloes.com.br",
    "baseUrl": "https://www.andrearaujoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "celsocunhaleiloes_com_br",
    "name": "Celso Cunha Leilões",
    "domain": "celsocunhaleiloes.com.br",
    "baseUrl": "https://www.celsocunhaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "coimbraleiloes_com_br",
    "name": "Coimbra Leilões",
    "domain": "coimbraleiloes.com.br",
    "baseUrl": "https://www.coimbraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "crepaldileiloes_com_br",
    "name": "Crepaldi leilões",
    "domain": "crepaldileiloes.com.br",
    "baseUrl": "https://www.crepaldileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "damasioleiloes_com_br",
    "name": "Damasio Leilões",
    "domain": "damasioleiloes.com.br",
    "baseUrl": "https://www.damasioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "daux_com_br",
    "name": "Daux Leilões",
    "domain": "daux.com.br",
    "baseUrl": "https://www.daux.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "hastaleiloes_com_br",
    "name": "Hasta Leilões",
    "domain": "hastaleiloes.com.br",
    "baseUrl": "https://www.hastaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "ipirangaleiloes_com_br",
    "name": "Ipiiranga Leilões",
    "domain": "ipirangaleiloes.com.br",
    "baseUrl": "https://www.ipirangaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "jikalleiloes_com_br",
    "name": "Jikal Leilões",
    "domain": "jikalleiloes.com.br",
    "baseUrl": "https://www.jikalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "jocaleiloesagro_com_br",
    "name": "Joca Leilões AGRO",
    "domain": "jocaleiloesagro.com.br",
    "baseUrl": "https://www.jocaleiloesagro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "lbleiloes_com_br",
    "name": "LB Leilões",
    "domain": "lbleiloes.com.br",
    "baseUrl": "https://www.lbleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "legalbidleilao_com_br",
    "name": "Legal BID",
    "domain": "legalbidleilao.com.br",
    "baseUrl": "https://www.legalbidleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "leiloesbonfadini_com_br",
    "name": "Leilões Bonfadini",
    "domain": "leiloesbonfadini.com.br",
    "baseUrl": "https://www.leiloesbonfadini.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "macedoleiloes_com_br",
    "name": "Macêdo Leilões",
    "domain": "macedoleiloes.com.br",
    "baseUrl": "https://www.macedoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "parkleiloes_com_br",
    "name": "Park Leilões",
    "domain": "parkleiloes.com.br",
    "baseUrl": "https://www.parkleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "portalax_com_br",
    "name": "AX Leilões",
    "domain": "portalax.com.br",
    "baseUrl": "https://www.portalax.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "realizaleiloes_com_br",
    "name": "Realiza Leilões",
    "domain": "realizaleiloes.com.br",
    "baseUrl": "https://www.realizaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "sperancaleiloes_com_br",
    "name": "Sperança Leilões",
    "domain": "sperancaleiloes.com.br",
    "baseUrl": "https://www.sperancaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "spironelloleiloes_com_br",
    "name": "Spironello Leilões",
    "domain": "spironelloleiloes.com.br",
    "baseUrl": "https://www.spironelloleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "sulleiloes_com_br",
    "name": "Sul Leilões",
    "domain": "sulleiloes.com.br",
    "baseUrl": "https://www.sulleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "tochaleiloes_com_br",
    "name": "Tocha Leilões",
    "domain": "tochaleiloes.com.br",
    "baseUrl": "https://www.tochaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "em_atualizacao"
  },
  {
    "id": "3rleiloes_net",
    "name": "3R Leilões",
    "domain": "3rleiloes.net",
    "baseUrl": "https://www.3rleiloes.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "abrantesleiloes_com",
    "name": "Abrantes Leilões",
    "domain": "abrantesleiloes.com",
    "baseUrl": "https://www.abrantesleiloes.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "acleiloeiro_com_br",
    "name": "acleiloeiro.com.br",
    "domain": "acleiloeiro.com.br",
    "baseUrl": "https://www.acleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "actleiloes_com_br",
    "name": "ACT Leilões",
    "domain": "actleiloes.com.br",
    "baseUrl": "https://www.actleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "adelanepedrozoleiloes_com_br",
    "name": "Adelane Pedrozo Leilões",
    "domain": "adelanepedrozoleiloes.com.br",
    "baseUrl": "https://www.adelanepedrozoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "alanleiloeiro_lel_br",
    "name": "Alan Machado Ribeiro",
    "domain": "alanleiloeiro.lel.br",
    "baseUrl": "https://www.alanleiloeiro.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "albinoqueiroz_com_br",
    "name": "Albino Queiroz Leiloeiro Oficial",
    "domain": "albinoqueiroz.com.br",
    "baseUrl": "https://www.albinoqueiroz.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "albuquerquelins_com_br",
    "name": "Albuquerque Lins Leiloeiro Oficial",
    "domain": "albuquerquelins.com.br",
    "baseUrl": "https://www.albuquerquelins.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "alegranzzileiloes_com_br",
    "name": "Alegranzzi Leilões",
    "domain": "alegranzzileiloes.com.br",
    "baseUrl": "https://www.alegranzzileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "alencastroleiloes_com_br",
    "name": "Alencastro Leilões",
    "domain": "alencastroleiloes.com.br",
    "baseUrl": "https://www.alencastroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "alessandraleiloes_com_br",
    "name": "Alessandra Leilões",
    "domain": "alessandraleiloes.com.br",
    "baseUrl": "https://www.alessandraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "alexsandroleiloes_com_br",
    "name": "Alexsandro Leilões",
    "domain": "alexsandroleiloes.com.br",
    "baseUrl": "https://www.alexsandroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "almoedaleiloes_com_br",
    "name": "Almoeda Leilões",
    "domain": "almoedaleiloes.com.br",
    "baseUrl": "https://www.almoedaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "amaralleiloes_com_br",
    "name": "Amaral Leilões",
    "domain": "amaralleiloes.com.br",
    "baseUrl": "https://www.amaralleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "amarquesleiloes_com_br",
    "name": "Auriannye Marques Leilões",
    "domain": "amarquesleiloes.com.br",
    "baseUrl": "https://www.amarquesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "amtleiloes_com_br",
    "name": "AMT Leilões",
    "domain": "amtleiloes.com.br",
    "baseUrl": "https://www.amtleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "andradeleiloes_com_br",
    "name": "andradeleiloes.com.br",
    "domain": "andradeleiloes.com.br",
    "baseUrl": "https://www.andradeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "andraleiloes_com_br",
    "name": "Andra Leilões",
    "domain": "andraleiloes.com.br",
    "baseUrl": "https://www.andraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "argleiloes_com_br",
    "name": "ARG Leilões",
    "domain": "argleiloes.com.br",
    "baseUrl": "https://www.argleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "arremataronline_com_br",
    "name": "arremataronline.com.br",
    "domain": "arremataronline.com.br",
    "baseUrl": "https://www.arremataronline.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "arremateleilao_com_br",
    "name": "Arremate leilões",
    "domain": "arremateleilao.com.br",
    "baseUrl": "https://www.arremateleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "arremateleiloes_com_br",
    "name": "Arremate Leilões",
    "domain": "arremateleiloes.com.br",
    "baseUrl": "https://www.arremateleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "arremateleiloesjudiciais_com_br",
    "name": "Arremate Leilões Judiciais",
    "domain": "arremateleiloesjudiciais.com.br",
    "baseUrl": "https://www.arremateleiloesjudiciais.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "arthurnunes_net",
    "name": "Arthur Nunes Leilões",
    "domain": "arthurnunes.net",
    "baseUrl": "https://www.arthurnunes.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "asamileiloes_com_br",
    "name": "Asami Leilões",
    "domain": "asamileiloes.com.br",
    "baseUrl": "https://www.asamileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bartmannleiloes_com_br",
    "name": "Bartmann Leilões",
    "domain": "bartmannleiloes.com.br",
    "baseUrl": "https://www.bartmannleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "batistaleiloes_com_br",
    "name": "Batista leilões",
    "domain": "batistaleiloes.com.br",
    "baseUrl": "https://www.batistaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "batistaregisleiloes_com_br",
    "name": "Batista Régis Leilões",
    "domain": "batistaregisleiloes.com.br",
    "baseUrl": "https://www.batistaregisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bbmnetleiloes_com_br",
    "name": "BBMNET Leilões",
    "domain": "bbmnetleiloes.com.br",
    "baseUrl": "https://www.bbmnetleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "benitosolucoesjudiciais_com_br",
    "name": "benitosolucoesjudiciais.com.br",
    "domain": "benitosolucoesjudiciais.com.br",
    "baseUrl": "https://www.benitosolucoesjudiciais.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "benozzati_com_br",
    "name": "Benozzati Leilões",
    "domain": "benozzati.com.br",
    "baseUrl": "https://www.benozzati.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bertoncello_lel_br",
    "name": "Bertoncello Leilões",
    "domain": "bertoncello.lel.br",
    "baseUrl": "https://www.bertoncello.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bessaleiloes_com_br",
    "name": "Bessa Leilões",
    "domain": "bessaleiloes.com.br",
    "baseUrl": "https://www.bessaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bidmax_com_br",
    "name": "BidMax",
    "domain": "bidmax.com.br",
    "baseUrl": "https://www.bidmax.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bleiloes_com_br",
    "name": "bleiloes.com.br",
    "domain": "bleiloes.com.br",
    "baseUrl": "https://www.bleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bolsadeleiloesbh_com_br",
    "name": "Bolsa de Leilões",
    "domain": "bolsadeleiloesbh.com.br",
    "baseUrl": "https://www.bolsadeleiloesbh.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bomnegocioleiloes_com_br",
    "name": "bomnegocioleiloes.com.br",
    "domain": "bomnegocioleiloes.com.br",
    "baseUrl": "https://www.bomnegocioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "borgesleiloes_com_br",
    "name": "Borges Leilões",
    "domain": "borgesleiloes.com.br",
    "baseUrl": "https://www.borgesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "brasilialeiloes_com_br",
    "name": "Brasília Leilões",
    "domain": "brasilialeiloes.com.br",
    "baseUrl": "https://www.brasilialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "bsbleiloes_com_br",
    "name": "BSB Leilões",
    "domain": "bsbleiloes.com.br",
    "baseUrl": "https://www.bsbleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "burihamleiloes_com_br",
    "name": "Buriham leilões | Leilões Oficiais Buriham",
    "domain": "burihamleiloes.com.br",
    "baseUrl": "https://www.burihamleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "camilaleiloes_com_br",
    "name": "Camila Leilões",
    "domain": "camilaleiloes.com.br",
    "baseUrl": "https://www.camilaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "canaldeleiloes_net",
    "name": "Canal de Leilões",
    "domain": "canaldeleiloes.net",
    "baseUrl": "https://www.canaldeleiloes.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "canezinleiloes_com_br",
    "name": "Canezin Leilões",
    "domain": "canezinleiloes.com.br",
    "baseUrl": "https://www.canezinleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "cariocaleiloes_com_br",
    "name": "Carioca Leilões",
    "domain": "cariocaleiloes.com.br",
    "baseUrl": "https://www.cariocaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "carrollruralleiloes_com_br",
    "name": "Carrol Soluções Inteligentes",
    "domain": "carrollruralleiloes.com.br",
    "baseUrl": "https://www.carrollruralleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ccjleiloes_com_br",
    "name": "CCJ Leilões",
    "domain": "ccjleiloes.com.br",
    "baseUrl": "https://www.ccjleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "cesarbritoleiloes_com_br",
    "name": "Cesar Brito Leilões",
    "domain": "cesarbritoleiloes.com.br",
    "baseUrl": "https://www.cesarbritoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "chuileiloes_com_br",
    "name": "chuileiloes.com.br",
    "domain": "chuileiloes.com.br",
    "baseUrl": "https://www.chuileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "cianacionalleiloes_com_br",
    "name": "CIA Nacional leilões",
    "domain": "cianacionalleiloes.com.br",
    "baseUrl": "https://www.cianacionalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ckleiloes_com_br",
    "name": "CK Leilões",
    "domain": "ckleiloes.com.br",
    "baseUrl": "https://www.ckleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "claudiokussleiloes_com_br",
    "name": "Claudio Cesar Kuss",
    "domain": "claudiokussleiloes.com.br",
    "baseUrl": "https://www.claudiokussleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "clicleiloes_com_br",
    "name": "clicleiloes.com.br",
    "domain": "clicleiloes.com.br",
    "baseUrl": "https://www.clicleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "coliseumleiloes_com_br",
    "name": "Coliseum Leilões",
    "domain": "coliseumleiloes.com.br",
    "baseUrl": "https://www.coliseumleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "conceitoleiloes_com_br",
    "name": "Conceito Leilões",
    "domain": "conceitoleiloes.com.br",
    "baseUrl": "https://www.conceitoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "construbemleiloes_com_br",
    "name": "Construbem Leilões",
    "domain": "construbemleiloes.com.br",
    "baseUrl": "https://www.construbemleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "costasalmanleiloes_com_br",
    "name": "Costa Salman Leilões",
    "domain": "costasalmanleiloes.com.br",
    "baseUrl": "https://www.costasalmanleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "cpkleiloes_com_br",
    "name": "CPK Leilões",
    "domain": "cpkleiloes.com.br",
    "baseUrl": "https://www.cpkleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "curiauleiloes_com_br",
    "name": "Curiaú Leilões",
    "domain": "curiauleiloes.com.br",
    "baseUrl": "https://www.curiauleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dalaqualeiloes_com_br",
    "name": "Dal'Aqua Leilões",
    "domain": "dalaqualeiloes.com.br",
    "baseUrl": "https://www.dalaqualeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dalcanaleleiloes_com_br",
    "name": "dalcanaleleiloes.com.br",
    "domain": "dalcanaleleiloes.com.br",
    "baseUrl": "https://www.dalcanaleleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dallagnolleiloes_com_br",
    "name": "Dallagnol Leilões",
    "domain": "dallagnolleiloes.com.br",
    "baseUrl": "https://www.dallagnolleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dantasleiloes_com_br",
    "name": "Dantas Leilões",
    "domain": "dantasleiloes.com.br",
    "baseUrl": "https://www.dantasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dbmleiloes_com_br",
    "name": "DBM leilões",
    "domain": "dbmleiloes.com.br",
    "baseUrl": "https://www.dbmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dearaujoleiloes_com_br",
    "name": "De Araujo Leilões",
    "domain": "dearaujoleiloes.com.br",
    "baseUrl": "https://www.dearaujoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "deboramullerleiloes_com_br",
    "name": "Débora Müller Leilões",
    "domain": "deboramullerleiloes.com.br",
    "baseUrl": "https://www.deboramullerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "delanoleiloes_com_br",
    "name": "delanoleiloes.com.br",
    "domain": "delanoleiloes.com.br",
    "baseUrl": "https://www.delanoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "delttaleiloes_com_br",
    "name": "Delta Leilões",
    "domain": "delttaleiloes.com.br",
    "baseUrl": "https://www.delttaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "desantileiloes_com_br",
    "name": "De Santi Leilões",
    "domain": "desantileiloes.com.br",
    "baseUrl": "https://www.desantileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "deseulance_com",
    "name": "deseulance.com",
    "domain": "deseulance.com",
    "baseUrl": "https://www.deseulance.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "djanirleiloes_com_br",
    "name": "Djanir Leilões",
    "domain": "djanirleiloes.com.br",
    "baseUrl": "https://www.djanirleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dldleiloeiro_com_br",
    "name": "DLD Leiloeiro",
    "domain": "dldleiloeiro.com.br",
    "baseUrl": "https://www.dldleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "domingosleiloes_com_br",
    "name": "domingosleiloes.com.br",
    "domain": "domingosleiloes.com.br",
    "baseUrl": "https://www.domingosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "dsleiloes_com_br",
    "name": "DS Leilões",
    "domain": "dsleiloes.com.br",
    "baseUrl": "https://www.dsleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "duxleiloes_com_br",
    "name": "Dux Leilões",
    "domain": "duxleiloes.com.br",
    "baseUrl": "https://www.duxleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "editalleiloes_com_br",
    "name": "Edital Leilões",
    "domain": "editalleiloes.com.br",
    "baseUrl": "https://www.editalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "eduardosorgileiloeiro_com_br",
    "name": "eduardosorgileiloeiro.com.br",
    "domain": "eduardosorgileiloeiro.com.br",
    "baseUrl": "https://www.eduardosorgileiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "eixoleiloes_com_br",
    "name": "Eixo Leilões",
    "domain": "eixoleiloes.com.br",
    "baseUrl": "https://www.eixoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "elloleiloes_com_br",
    "name": "Ello Leilões",
    "domain": "elloleiloes.com.br",
    "baseUrl": "https://www.elloleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "emleilao_com_br",
    "name": "Em Leilão",
    "domain": "emleilao.com.br",
    "baseUrl": "https://www.emleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "esleiloes_com_br",
    "name": "ES Leilões",
    "domain": "esleiloes.com.br",
    "baseUrl": "https://www.esleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "euamoleilao_com_br",
    "name": "Eu Amo Leilão",
    "domain": "euamoleilao.com.br",
    "baseUrl": "https://www.euamoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "euroleiloes_com_br",
    "name": "Euro Leilões",
    "domain": "euroleiloes.com.br",
    "baseUrl": "https://www.euroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "eustacio_com_br",
    "name": "Eustácio Leilões",
    "domain": "eustacio.com.br",
    "baseUrl": "https://www.eustacio.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "excellenceleiloes_com_br",
    "name": "Excellence Leilões",
    "domain": "excellenceleiloes.com.br",
    "baseUrl": "https://www.excellenceleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "extrajustleiloes_com_br",
    "name": "extrajustleiloes.com.br",
    "domain": "extrajustleiloes.com.br",
    "baseUrl": "https://www.extrajustleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "fabriccaleiloes_com_br",
    "name": "Fabrica de Leilões",
    "domain": "fabriccaleiloes.com.br",
    "baseUrl": "https://www.fabriccaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "fauthleiloes_com_br",
    "name": "Fauth Leiloeiro",
    "domain": "fauthleiloes.com.br",
    "baseUrl": "https://www.fauthleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "favaretoleiloes_com_br",
    "name": "Favareto Leilões",
    "domain": "favaretoleiloes.com.br",
    "baseUrl": "https://www.favaretoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "fcrleiloes_com_br",
    "name": "FCR Leilões",
    "domain": "fcrleiloes.com.br",
    "baseUrl": "https://www.fcrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "fernandaleiloes_lel_br",
    "name": "Fernanda Leilões",
    "domain": "fernandaleiloes.lel.br",
    "baseUrl": "https://www.fernandaleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ferrarileiloes_com_br",
    "name": "Ferrari Leilões",
    "domain": "ferrarileiloes.com.br",
    "baseUrl": "https://www.ferrarileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ferronatoleiloes_com_br",
    "name": "Ferronato Leilões",
    "domain": "ferronatoleiloes.com.br",
    "baseUrl": "https://www.ferronatoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "finattoleiloes_com_br",
    "name": "Finatto Leilões",
    "domain": "finattoleiloes.com.br",
    "baseUrl": "https://www.finattoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "formullaleiloes_com_br",
    "name": "Fórmula Leilões",
    "domain": "formullaleiloes.com.br",
    "baseUrl": "https://www.formullaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "fumagallileiloes_com_br",
    "name": "Fumagalli Leilões",
    "domain": "fumagallileiloes.com.br",
    "baseUrl": "https://www.fumagallileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gabrielleiloeiro_com_br",
    "name": "Gabriel Leiloeiro",
    "domain": "gabrielleiloeiro.com.br",
    "baseUrl": "https://www.gabrielleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ganikoleiloes_com_br",
    "name": "ganikoleiloes.com.br",
    "domain": "ganikoleiloes.com.br",
    "baseUrl": "https://www.ganikoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "garantialeiloes_com_br",
    "name": "garantialeiloes.com.br",
    "domain": "garantialeiloes.com.br",
    "baseUrl": "https://www.garantialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gbleiloes_com_br",
    "name": "GB Leilões",
    "domain": "gbleiloes.com.br",
    "baseUrl": "https://www.gbleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gdleiloes_com_br",
    "name": "GD Leilões",
    "domain": "gdleiloes.com.br",
    "baseUrl": "https://www.gdleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gestaodeleiloes_com_br",
    "name": "Gestão de Leilões",
    "domain": "gestaodeleiloes.com.br",
    "baseUrl": "https://www.gestaodeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gestorleiloes_com_br",
    "name": "Gestor Leilões",
    "domain": "gestorleiloes.com.br",
    "baseUrl": "https://www.gestorleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ghisimachadoleiloes_com_br",
    "name": "Ghisi Machado Leilões",
    "domain": "ghisimachadoleiloes.com.br",
    "baseUrl": "https://www.ghisimachadoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ghvmleiloes_com_br",
    "name": "GHVM Leilões",
    "domain": "ghvmleiloes.com.br",
    "baseUrl": "https://www.ghvmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gislerleiloes_com_br",
    "name": "Gisler Leiloeiro Oficial",
    "domain": "gislerleiloes.com.br",
    "baseUrl": "https://www.gislerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "glleiloes_com_br",
    "name": "GL Leilões",
    "domain": "glleiloes.com.br",
    "baseUrl": "https://www.glleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gmleiloes_com_br",
    "name": "GM Leilões",
    "domain": "gmleiloes.com.br",
    "baseUrl": "https://www.gmleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gracieleiloes_com_br",
    "name": "Gracie Leilões",
    "domain": "gracieleiloes.com.br",
    "baseUrl": "https://www.gracieleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gracindoleiloes_com_br",
    "name": "gracindoleiloes.com.br",
    "domain": "gracindoleiloes.com.br",
    "baseUrl": "https://www.gracindoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "granadoleiloes_com_br",
    "name": "Granado Leilões",
    "domain": "granadoleiloes.com.br",
    "baseUrl": "https://www.granadoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "guariglialeiloes_com_br",
    "name": "guariglialeiloes.com.br",
    "domain": "guariglialeiloes.com.br",
    "baseUrl": "https://www.guariglialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "guinchofederalleiloes_com_br",
    "name": "Guincho Federal Leilões",
    "domain": "guinchofederalleiloes.com.br",
    "baseUrl": "https://www.guinchofederalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "gutembergaraujoleiloes_com_br",
    "name": "Gutemberg Araujo Leilões",
    "domain": "gutembergaraujoleiloes.com.br",
    "baseUrl": "https://www.gutembergaraujoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hamouileiloes_com_br",
    "name": "Hamou Leilões",
    "domain": "hamouileiloes.com.br",
    "baseUrl": "https://www.hamouileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hastasleiloes_com_br",
    "name": "Hastas Leilões",
    "domain": "hastasleiloes.com.br",
    "baseUrl": "https://www.hastasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hastasp_com_br",
    "name": "Hasta SP",
    "domain": "hastasp.com.br",
    "baseUrl": "https://www.hastasp.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hatoryleiloes_com_br",
    "name": "Hatory Leilões",
    "domain": "hatoryleiloes.com.br",
    "baseUrl": "https://www.hatoryleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hcleiloes_com_br",
    "name": "HC Leilões",
    "domain": "hcleiloes.com.br",
    "baseUrl": "https://www.hcleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hirasawaleiloes_com_br",
    "name": "hirasawaleiloes.com.br",
    "domain": "hirasawaleiloes.com.br",
    "baseUrl": "https://www.hirasawaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "hisaleiloes_com_br",
    "name": "hisaleiloes.com.br",
    "domain": "hisaleiloes.com.br",
    "baseUrl": "https://www.hisaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "imoveis_economia_gov_br",
    "name": "SPU",
    "domain": "imoveis.economia.gov.br",
    "baseUrl": "https://www.imoveis.economia.gov.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ineuleiloes_com_br",
    "name": "Ineu Leilões",
    "domain": "ineuleiloes.com.br",
    "baseUrl": "https://www.ineuleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "innovaleiloes_com_br",
    "name": "Innova Leilões",
    "domain": "innovaleiloes.com.br",
    "baseUrl": "https://www.innovaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ipcleiloes_com_br",
    "name": "IPC Leilões",
    "domain": "ipcleiloes.com.br",
    "baseUrl": "https://www.ipcleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "isacleiloes_com_br",
    "name": "Isac Leilões",
    "domain": "isacleiloes.com.br",
    "baseUrl": "https://www.isacleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "jgcargneluttileiloes_com_br",
    "name": "João Guilherme Leiloeiro Oficial",
    "domain": "jgcargneluttileiloes.com.br",
    "baseUrl": "https://www.jgcargneluttileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "jhcleiloeirooficial_lel_br",
    "name": "João Honor Coirollo de Souza - Leilões",
    "domain": "jhcleiloeirooficial.lel.br",
    "baseUrl": "https://www.jhcleiloeirooficial.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "jhleiloes_com_br",
    "name": "JH Leilões",
    "domain": "jhleiloes.com.br",
    "baseUrl": "https://www.jhleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "josequencaleiloeiro_com_br",
    "name": "josequencaleiloeiro.com.br",
    "domain": "josequencaleiloeiro.com.br",
    "baseUrl": "https://www.josequencaleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "jsilvaleiloes_com_br",
    "name": "Junior Silva Leilões",
    "domain": "jsilvaleiloes.com.br",
    "baseUrl": "https://www.jsilvaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "judhastas_com_br",
    "name": "JudHastas",
    "domain": "judhastas.com.br",
    "baseUrl": "https://www.judhastas.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "junkesleiloes_com_br",
    "name": "Junkes Leilões",
    "domain": "junkesleiloes.com.br",
    "baseUrl": "https://www.junkesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kairosleiloes_com_br",
    "name": "Kairos Leilões",
    "domain": "kairosleiloes.com.br",
    "baseUrl": "https://www.kairosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kcleiloes_com_br",
    "name": "KC Leilões",
    "domain": "kcleiloes.com.br",
    "baseUrl": "https://www.kcleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kielleiloes_com_br",
    "name": "Kiel Leilões",
    "domain": "kielleiloes.com.br",
    "baseUrl": "https://www.kielleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kildareleiloes_com_br",
    "name": "Kildare Leilões",
    "domain": "kildareleiloes.com.br",
    "baseUrl": "https://www.kildareleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kleiberleiloes_com_br",
    "name": "Kleiber Leilões",
    "domain": "kleiberleiloes.com.br",
    "baseUrl": "https://www.kleiberleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "kronberg_lel_br",
    "name": "PK Leiloaria Digital",
    "domain": "kronberg.lel.br",
    "baseUrl": "https://www.kronberg.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ksleiloes_com_br",
    "name": "KS Leilões",
    "domain": "ksleiloes.com.br",
    "baseUrl": "https://www.ksleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lancejusto_com_br",
    "name": "Lance Justo",
    "domain": "lancejusto.com.br",
    "baseUrl": "https://www.lancejusto.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lanceleiloes_com_br",
    "name": "Lance Leilões",
    "domain": "lanceleiloes.com.br",
    "baseUrl": "https://www.lanceleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lancemaiorleiloes_com_br",
    "name": "Lance Maior Leilões",
    "domain": "lancemaiorleiloes.com.br",
    "baseUrl": "https://www.lancemaiorleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lancenow_com_br",
    "name": "Lance now",
    "domain": "lancenow.com.br",
    "baseUrl": "https://www.lancenow.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lauandleiloes_com_br",
    "name": "lauandleiloes.com.br",
    "domain": "lauandleiloes.com.br",
    "baseUrl": "https://www.lauandleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leialeiloes_lel_br",
    "name": "Léia Leilões",
    "domain": "leialeiloes.lel.br",
    "baseUrl": "https://www.leialeiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leilaobutia_com_br",
    "name": "Leilão Butiá",
    "domain": "leilaobutia.com.br",
    "baseUrl": "https://www.leilaobutia.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leilaosantos_com_br",
    "name": "Santos Leiloeiro Oficial",
    "domain": "leilaosantos.com.br",
    "baseUrl": "https://www.leilaosantos.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloaria_com_br",
    "name": "Leiloaria",
    "domain": "leiloaria.com.br",
    "baseUrl": "https://www.leiloaria.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeiramcl_com_br",
    "name": "Leiloeira MCL",
    "domain": "leiloeiramcl.com.br",
    "baseUrl": "https://www.leiloeiramcl.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeiroeduardo_com_br",
    "name": "leiloeiroeduardo.com.br",
    "domain": "leiloeiroeduardo.com.br",
    "baseUrl": "https://www.leiloeiroeduardo.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeirojudicial_lel_br",
    "name": "Leiloeiro Judicial",
    "domain": "leiloeirojudicial.lel.br",
    "baseUrl": "https://www.leiloeirojudicial.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeironacif_com",
    "name": "On Leilões",
    "domain": "leiloeironacif.com",
    "baseUrl": "https://www.leiloeironacif.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeirosdebrasilia_com_br",
    "name": "Leiloeiros de Brasília",
    "domain": "leiloeirosdebrasilia.com.br",
    "baseUrl": "https://www.leiloeirosdebrasilia.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloes_sc_com_br",
    "name": "Leilões SC",
    "domain": "leiloes-sc.com.br",
    "baseUrl": "https://www.leiloes-sc.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloes61_com_br",
    "name": "Leilões 61",
    "domain": "leiloes61.com.br",
    "baseUrl": "https://www.leiloes61.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesalbino_com_br",
    "name": "Leilões Albino",
    "domain": "leiloesalbino.com.br",
    "baseUrl": "https://www.leiloesalbino.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesanapolis_com_br",
    "name": "Leilões Anápolis",
    "domain": "leiloesanapolis.com.br",
    "baseUrl": "https://www.leiloesanapolis.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesaraujo_com_br",
    "name": "Felipe Araujo Leiloeiro Oficial",
    "domain": "leiloesaraujo.com.br",
    "baseUrl": "https://www.leiloesaraujo.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesbrasilto_com_br",
    "name": "Leilões Brasil Tocantins",
    "domain": "leiloesbrasilto.com.br",
    "baseUrl": "https://www.leiloesbrasilto.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesdonorte_com_br",
    "name": "Leilões do Norte",
    "domain": "leiloesdonorte.com.br",
    "baseUrl": "https://www.leiloesdonorte.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesitamar_com_br",
    "name": "Leilões Itamar",
    "domain": "leiloesitamar.com.br",
    "baseUrl": "https://www.leiloesitamar.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesjudiciaissc_com_br",
    "name": "Leilões Judiciais SC",
    "domain": "leiloesjudiciaissc.com.br",
    "baseUrl": "https://www.leiloesjudiciaissc.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesmager_com_br",
    "name": "leiloesmager.com.br",
    "domain": "leiloesmager.com.br",
    "baseUrl": "https://www.leiloesmager.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesmwd_com_br",
    "name": "Leilões MWD",
    "domain": "leiloesmwd.com.br",
    "baseUrl": "https://www.leiloesmwd.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloesrei_com_br",
    "name": "Rei dos Leilões",
    "domain": "leiloesrei.com.br",
    "baseUrl": "https://www.leiloesrei.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloestocantins_com",
    "name": "Leilões Tocantins",
    "domain": "leiloestocantins.com",
    "baseUrl": "https://www.leiloestocantins.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leiloeszanoni_com_br",
    "name": "Leilões Zanoni",
    "domain": "leiloeszanoni.com.br",
    "baseUrl": "https://www.leiloeszanoni.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leilofacil_lel_br",
    "name": "Mauro Cesar Rocha Leiloeiro",
    "domain": "leilofacil.lel.br",
    "baseUrl": "https://www.leilofacil.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "leilovale_com_br",
    "name": "leilovale.com.br",
    "domain": "leilovale.com.br",
    "baseUrl": "https://www.leilovale.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lelialenz_com_br",
    "name": "Lélia Lenz Leilões",
    "domain": "lelialenz.com.br",
    "baseUrl": "https://www.lelialenz.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lfrleiloes_com_br",
    "name": "Luiz Fernando Rocha",
    "domain": "lfrleiloes.com.br",
    "baseUrl": "https://www.lfrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "licitari_com_br",
    "name": "Licitari Leilões",
    "domain": "licitari.com.br",
    "baseUrl": "https://www.licitari.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lipinskileiloes_com_br",
    "name": "Lipinski Leilões",
    "domain": "lipinskileiloes.com.br",
    "baseUrl": "https://www.lipinskileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "liraleiloes_com_br",
    "name": "Lira Leilões Leiloeira Oficial",
    "domain": "liraleiloes.com.br",
    "baseUrl": "https://www.liraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "livialeiloes_com_br",
    "name": "Lívia Leilões",
    "domain": "livialeiloes.com.br",
    "baseUrl": "https://www.livialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lkleiloes_com_br",
    "name": "LK Leilões",
    "domain": "lkleiloes.com.br",
    "baseUrl": "https://www.lkleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lopesleiloes_com_br",
    "name": "lopesleiloes.com.br",
    "domain": "lopesleiloes.com.br",
    "baseUrl": "https://www.lopesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lopesleiloes_net_br",
    "name": "Lopes Leilões Leiloeiro Oficial",
    "domain": "lopesleiloes.net.br",
    "baseUrl": "https://www.lopesleiloes.net.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "loteleiloes_com_br",
    "name": "Lote Leilões",
    "domain": "loteleiloes.com.br",
    "baseUrl": "https://www.loteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ltjleiloes_com_br",
    "name": "LTJ Leilões",
    "domain": "ltjleiloes.com.br",
    "baseUrl": "https://www.ltjleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "lumussaleiloes_com_br",
    "name": "Luzinete Mussa de Moraes Pereira Leiloeira",
    "domain": "lumussaleiloes.com.br",
    "baseUrl": "https://www.lumussaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maestroleiloes_com_br",
    "name": "Maestro Leilões",
    "domain": "maestroleiloes.com.br",
    "baseUrl": "https://www.maestroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maiorofertaleiloes_com_br",
    "name": "Maior Oferta Leilões e Venda Direta",
    "domain": "maiorofertaleiloes.com.br",
    "baseUrl": "https://www.maiorofertaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maleiloesro_com_br",
    "name": "MA Leilões",
    "domain": "maleiloesro.com.br",
    "baseUrl": "https://www.maleiloesro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "manrubialeiloes_com_br",
    "name": "Manrubia Leilões",
    "domain": "manrubialeiloes.com.br",
    "baseUrl": "https://www.manrubialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maraurzedoleilao_com_br",
    "name": "Mara Urzedo Leilão",
    "domain": "maraurzedoleilao.com.br",
    "baseUrl": "https://www.maraurzedoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "marcellolemosleiloeiro_com_br",
    "name": "Marcello Lemos",
    "domain": "marcellolemosleiloeiro.com.br",
    "baseUrl": "https://www.marcellolemosleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "marcoleiloes_com_br",
    "name": "Marco Leilões",
    "domain": "marcoleiloes.com.br",
    "baseUrl": "https://www.marcoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mariavitorinoleiloeira_com_br",
    "name": "Maria Vitorino Leiloeira",
    "domain": "mariavitorinoleiloeira.com.br",
    "baseUrl": "https://www.mariavitorinoleiloeira.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "marquesbarretoleiloes_com_br",
    "name": "Marques Barreto Leilões",
    "domain": "marquesbarretoleiloes.com.br",
    "baseUrl": "https://www.marquesbarretoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "martelodigital_com_br",
    "name": "Martelo Digital",
    "domain": "martelodigital.com.br",
    "baseUrl": "https://www.martelodigital.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mateusleiloes_com_br",
    "name": "Mateus Silva Leiloeiro Oficial",
    "domain": "mateusleiloes.com.br",
    "baseUrl": "https://www.mateusleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "matogrossoleiloes_com_br",
    "name": "Mato Grosso Leilões",
    "domain": "matogrossoleiloes.com.br",
    "baseUrl": "https://www.matogrossoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maxterleiloes_com_br",
    "name": "Master Leilões",
    "domain": "maxterleiloes.com.br",
    "baseUrl": "https://www.maxterleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "maxxleiloes_com_br",
    "name": "Max Leilões",
    "domain": "maxxleiloes.com.br",
    "baseUrl": "https://www.maxxleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mcleilao_com_br",
    "name": "MC Leilão",
    "domain": "mcleilao.com.br",
    "baseUrl": "https://www.mcleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "medeirosleiloes_com_br",
    "name": "Medeiros Leilões",
    "domain": "medeirosleiloes.com.br",
    "baseUrl": "https://www.medeirosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "megavaleleiloes_com_br",
    "name": "Mega Vale Leilões",
    "domain": "megavaleleiloes.com.br",
    "baseUrl": "https://www.megavaleleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "meirelesleiloes_com_br",
    "name": "Meireles Leilões",
    "domain": "meirelesleiloes.com.br",
    "baseUrl": "https://www.meirelesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mesquitaleiloes_com_br",
    "name": "Mesquita Leilões",
    "domain": "mesquitaleiloes.com.br",
    "baseUrl": "https://www.mesquitaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mgrleiloes_com_br",
    "name": "MGR Leilões",
    "domain": "mgrleiloes.com.br",
    "baseUrl": "https://www.mgrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "miguelperezleiloes_com_br",
    "name": "miguelperezleiloes.com.br",
    "domain": "miguelperezleiloes.com.br",
    "baseUrl": "https://www.miguelperezleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "milanileiloes_com_br",
    "name": "Milani Leilões",
    "domain": "milanileiloes.com.br",
    "baseUrl": "https://www.milanileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "miottileiloes_com_br",
    "name": "Miotti Leilões",
    "domain": "miottileiloes.com.br",
    "baseUrl": "https://www.miottileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mjleiloes_com_br",
    "name": "MJE Leilões",
    "domain": "mjleiloes.com.br",
    "baseUrl": "https://www.mjleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mlleiloes_com_br",
    "name": "ML Leilões",
    "domain": "mlleiloes.com.br",
    "baseUrl": "https://www.mlleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mnleilao_com_br",
    "name": "MN Leilões",
    "domain": "mnleilao.com.br",
    "baseUrl": "https://www.mnleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "moacira_lel_br",
    "name": "Moacira Goedert",
    "domain": "moacira.lel.br",
    "baseUrl": "https://www.moacira.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "molgado_com_br",
    "name": "Molgado Leilões",
    "domain": "molgado.com.br",
    "baseUrl": "https://www.molgado.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "moralesleiloes_com_br",
    "name": "moralesleiloes.com.br",
    "domain": "moralesleiloes.com.br",
    "baseUrl": "https://www.moralesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "morescoleiloes_com_br",
    "name": "Cesar Moresco Leilões",
    "domain": "morescoleiloes.com.br",
    "baseUrl": "https://www.morescoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "mrleiloes_com_br",
    "name": "mrleiloes.com.br",
    "domain": "mrleiloes.com.br",
    "baseUrl": "https://www.mrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "nacionalleiloes_com_br",
    "name": "Nacional Leilões",
    "domain": "nacionalleiloes.com.br",
    "baseUrl": "https://www.nacionalleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "natalialeiloes_com_br",
    "name": "Natália Nunes Leilões",
    "domain": "natalialeiloes.com.br",
    "baseUrl": "https://www.natalialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "neteditaisleiloes_com_br",
    "name": "Net editais leilões",
    "domain": "neteditaisleiloes.com.br",
    "baseUrl": "https://www.neteditaisleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "newtonleiloes_com_br",
    "name": "Newton Leilões",
    "domain": "newtonleiloes.com.br",
    "baseUrl": "https://www.newtonleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "nextleiloes_com_br",
    "name": "Next Leilões",
    "domain": "nextleiloes.com.br",
    "baseUrl": "https://www.nextleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "nogarileiloes_com_br",
    "name": "Nogari Leilões",
    "domain": "nogarileiloes.com.br",
    "baseUrl": "https://www.nogarileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "nogueiraleiloes_com_br",
    "name": "Nogueira leilões",
    "domain": "nogueiraleiloes.com.br",
    "baseUrl": "https://www.nogueiraleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "npleiloes_com_br",
    "name": "NP Leilões",
    "domain": "npleiloes.com.br",
    "baseUrl": "https://www.npleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "octavioleiloes_com_br",
    "name": "Octavio Leilões",
    "domain": "octavioleiloes.com.br",
    "baseUrl": "https://www.octavioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "olivirogerioleiloes_com_br",
    "name": "Olivi Rogério leilões",
    "domain": "olivirogerioleiloes.com.br",
    "baseUrl": "https://www.olivirogerioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "olmosleiloes_com_br",
    "name": "olmosleiloes.com.br",
    "domain": "olmosleiloes.com.br",
    "baseUrl": "https://www.olmosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "omega1leiloes_com_br",
    "name": "Ômega Leilões",
    "domain": "omega1leiloes.com.br",
    "baseUrl": "https://www.omega1leiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "oportunidadeleiloes_com_br",
    "name": "oportunidadeleiloes.com.br",
    "domain": "oportunidadeleiloes.com.br",
    "baseUrl": "https://www.oportunidadeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "organizacaodeleiloes_com_br",
    "name": "Organização de Leilões",
    "domain": "organizacaodeleiloes.com.br",
    "baseUrl": "https://www.organizacaodeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "oscarleiloes_com_br",
    "name": "Oscar Leilões",
    "domain": "oscarleiloes.com.br",
    "baseUrl": "https://www.oscarleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "osvaldoleiloes_com_br",
    "name": "Osvaldo Leilões",
    "domain": "osvaldoleiloes.com.br",
    "baseUrl": "https://www.osvaldoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ouroleiloes_com_br",
    "name": "Ouro Leilões",
    "domain": "ouroleiloes.com.br",
    "baseUrl": "https://www.ouroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pagliarinileiloes_com_br",
    "name": "Pagliarini Leilões",
    "domain": "pagliarinileiloes.com.br",
    "baseUrl": "https://www.pagliarinileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pavanileiloes_com_br",
    "name": "pavanileiloes.com.br",
    "domain": "pavanileiloes.com.br",
    "baseUrl": "https://www.pavanileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pedroalmeidaleiloeiro_rio_br",
    "name": "Pedro José de Almeida",
    "domain": "pedroalmeidaleiloeiro.rio.br",
    "baseUrl": "https://www.pedroalmeidaleiloeiro.rio.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pedrocastroleiloes_com_brprincipal_asp",
    "name": "Pedro Castro Leilões",
    "domain": "pedrocastroleiloes.com.brprincipal.asp",
    "baseUrl": "https://www.pedrocastroleiloes.com.brprincipal.asp",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pegoraroleiloes_com_br",
    "name": "Pegoraro leilões",
    "domain": "pegoraroleiloes.com.br",
    "baseUrl": "https://www.pegoraroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pereiraleiloesce_com_br",
    "name": "Pereira Leilões",
    "domain": "pereiraleiloesce.com.br",
    "baseUrl": "https://www.pereiraleiloesce.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "pineiroleiloes_com_br",
    "name": "Pineiro Leilões",
    "domain": "pineiroleiloes.com.br",
    "baseUrl": "https://www.pineiroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "planetadosleiloes_com_br",
    "name": "Planeta dos Leilões",
    "domain": "planetadosleiloes.com.br",
    "baseUrl": "https://www.planetadosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "plusleiloes_lel_br",
    "name": "Plus Leilões",
    "domain": "plusleiloes.lel.br",
    "baseUrl": "https://www.plusleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "portaldosleiloes_com",
    "name": "Portal Dos Leilões",
    "domain": "portaldosleiloes.com",
    "baseUrl": "https://www.portaldosleiloes.com",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "portelaleiloes_com_br",
    "name": "Portela Leilões",
    "domain": "portelaleiloes.com.br",
    "baseUrl": "https://www.portelaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "portoleiloes_com_br",
    "name": "Porto Leilões",
    "domain": "portoleiloes.com.br",
    "baseUrl": "https://www.portoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "primeirapraca_com_br",
    "name": "primeirapraca.com.br",
    "domain": "primeirapraca.com.br",
    "baseUrl": "https://www.primeirapraca.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "psnleiloes_com_br",
    "name": "PSN Leilões",
    "domain": "psnleiloes.com.br",
    "baseUrl": "https://www.psnleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rabuskeleiloes_com_br",
    "name": "Rabuske Leilões",
    "domain": "rabuskeleiloes.com.br",
    "baseUrl": "https://www.rabuskeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ramosleiloes_com_br",
    "name": "Ramos Leilões",
    "domain": "ramosleiloes.com.br",
    "baseUrl": "https://www.ramosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rangelleiloes_com_br",
    "name": "Rangel Leilões",
    "domain": "rangelleiloes.com.br",
    "baseUrl": "https://www.rangelleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rapportleiloes_com_br",
    "name": "Rapport Leilões",
    "domain": "rapportleiloes.com.br",
    "baseUrl": "https://www.rapportleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "renannerisleiloeiro_com_br",
    "name": "Renan Neris Leiloeiro",
    "domain": "renannerisleiloeiro.com.br",
    "baseUrl": "https://www.renannerisleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rfleiloes_com_br",
    "name": "Rafael Figueiredo Leiloeiro Oficial",
    "domain": "rfleiloes.com.br",
    "baseUrl": "https://www.rfleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ribeiroleiloes_com_br",
    "name": "Ribeiro Leilões",
    "domain": "ribeiroleiloes.com.br",
    "baseUrl": "https://www.ribeiroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ricardogomesleiloes_com_br",
    "name": "Ricardo Gomes Leilões",
    "domain": "ricardogomesleiloes.com.br",
    "baseUrl": "https://www.ricardogomesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "ricoleiloes_com_br",
    "name": "ricoleiloes.com.br",
    "domain": "ricoleiloes.com.br",
    "baseUrl": "https://www.ricoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "robertofernandesleiloes_com_br",
    "name": "Roberto Fernandes Leilões",
    "domain": "robertofernandesleiloes.com.br",
    "baseUrl": "https://www.robertofernandesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "robertomauroleiloes_com_br",
    "name": "Roberto Mauro Leilões",
    "domain": "robertomauroleiloes.com.br",
    "baseUrl": "https://www.robertomauroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rocketleiloes_com_br",
    "name": "Rocket Leilões",
    "domain": "rocketleiloes.com.br",
    "baseUrl": "https://www.rocketleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "romeuherter_com_br",
    "name": "Romeu Herter Leilões",
    "domain": "romeuherter.com.br",
    "baseUrl": "https://www.romeuherter.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rossileiloes_com_br",
    "name": "Rossi Leilões",
    "domain": "rossileiloes.com.br",
    "baseUrl": "https://www.rossileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "rubenshcastro_com_br",
    "name": "Rubens Henrique de Castro",
    "domain": "rubenshcastro.com.br",
    "baseUrl": "https://www.rubenshcastro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sabrinaleiloes_lel_br",
    "name": "Sabrina Leilões",
    "domain": "sabrinaleiloes.lel.br",
    "baseUrl": "https://www.sabrinaleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sabrinaverroneleiloeira_com_br",
    "name": "Sabrina Verrone",
    "domain": "sabrinaverroneleiloeira.com.br",
    "baseUrl": "https://www.sabrinaverroneleiloeira.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "saleiloes_com_br",
    "name": "SA Leilões",
    "domain": "saleiloes.com.br",
    "baseUrl": "https://www.saleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "salgadoleiloes_com_br",
    "name": "Salgado Leilões",
    "domain": "salgadoleiloes.com.br",
    "baseUrl": "https://www.salgadoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "salgueiroleiloes_com_br",
    "name": "Salgueiro Leilões",
    "domain": "salgueiroleiloes.com.br",
    "baseUrl": "https://www.salgueiroleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sampaioleiloes_com_br",
    "name": "Sampaio Leilões",
    "domain": "sampaioleiloes.com.br",
    "baseUrl": "https://www.sampaioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sancarleiloes_com_br",
    "name": "Sancar Leilões",
    "domain": "sancarleiloes.com.br",
    "baseUrl": "https://www.sancarleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sanchesleiloes_com_br",
    "name": "Sanches Leilões",
    "domain": "sanchesleiloes.com.br",
    "baseUrl": "https://www.sanchesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "santacatarinaleiloes_com_br",
    "name": "Santa Catarina Leilões",
    "domain": "santacatarinaleiloes.com.br",
    "baseUrl": "https://www.santacatarinaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "santosmoraesleiloes_com_br",
    "name": "Santos Moraes Leilões",
    "domain": "santosmoraesleiloes.com.br",
    "baseUrl": "https://www.santosmoraesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "saocaetanoleiloes_com_br",
    "name": "São Caetano Leilões",
    "domain": "saocaetanoleiloes.com.br",
    "baseUrl": "https://www.saocaetanoleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "savoyleiloes_com_br",
    "name": "savoyleiloes.com.br",
    "domain": "savoyleiloes.com.br",
    "baseUrl": "https://www.savoyleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sbleiloes_lel_br",
    "name": "SB Leilões",
    "domain": "sbleiloes.lel.br",
    "baseUrl": "https://www.sbleiloes.lel.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "schanzerleiloes_com_br",
    "name": "Schanzer Leilões",
    "domain": "schanzerleiloes.com.br",
    "baseUrl": "https://www.schanzerleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "shiokawaleiloes_com_br",
    "name": "Shiokawa leilões",
    "domain": "shiokawaleiloes.com.br",
    "baseUrl": "https://www.shiokawaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "siteleiloes_com_br",
    "name": "Site Leilões",
    "domain": "siteleiloes.com.br",
    "baseUrl": "https://www.siteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "snleiloes_com_br",
    "name": "Sérgio Nogueira Leilões",
    "domain": "snleiloes.com.br",
    "baseUrl": "https://www.snleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sopranoleilao_com_br",
    "name": "Soprano Leilão",
    "domain": "sopranoleilao.com.br",
    "baseUrl": "https://www.sopranoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sudesteleiloes_com_br",
    "name": "sudesteleiloes.com.br",
    "domain": "sudesteleiloes.com.br",
    "baseUrl": "https://www.sudesteleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "suenagaleiloes_com_br",
    "name": "suenagaleiloes.com.br",
    "domain": "suenagaleiloes.com.br",
    "baseUrl": "https://www.suenagaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "superdiasleiloes_com_br",
    "name": "Super Dias Leilões",
    "domain": "superdiasleiloes.com.br",
    "baseUrl": "https://www.superdiasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "superlojao_net",
    "name": "Super Lojão",
    "domain": "superlojao.net",
    "baseUrl": "https://www.superlojao.net",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "suzanacarvalholeiloes_com_br",
    "name": "Suzana Carvalho Leilões",
    "domain": "suzanacarvalholeiloes.com.br",
    "baseUrl": "https://www.suzanacarvalholeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "sydneyleiloes_com_br",
    "name": "Sydney Leilões",
    "domain": "sydneyleiloes.com.br",
    "baseUrl": "https://www.sydneyleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tahaleiloes_com_br",
    "name": "tahaleiloes.com.br",
    "domain": "tahaleiloes.com.br",
    "baseUrl": "https://www.tahaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "taniagrimaldileiloes_com_br",
    "name": "Tânia Grimaldi Leiloeira Oficial",
    "domain": "taniagrimaldileiloes.com.br",
    "baseUrl": "https://www.taniagrimaldileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "telesleiloes_com_br",
    "name": "Teles Leilões",
    "domain": "telesleiloes.com.br",
    "baseUrl": "https://www.telesleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tenorioleiloes_com_br",
    "name": "Tenório Leilões",
    "domain": "tenorioleiloes.com.br",
    "baseUrl": "https://www.tenorioleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "terrabrasilleiloes_com_br",
    "name": "Terra Brasil Leilões",
    "domain": "terrabrasilleiloes.com.br",
    "baseUrl": "https://www.terrabrasilleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tezaleiloes_com_br",
    "name": "Teza Leilões",
    "domain": "tezaleiloes.com.br",
    "baseUrl": "https://www.tezaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tirlonileiloes_com_br",
    "name": "Tirloni Leilões",
    "domain": "tirlonileiloes.com.br",
    "baseUrl": "https://www.tirlonileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tkl_com_br",
    "name": "TKL Leilões | Turn Key Leilões",
    "domain": "tkl.com.br",
    "baseUrl": "https://www.tkl.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "tonoleilao_com_br",
    "name": "Tono Leilões",
    "domain": "tonoleilao.com.br",
    "baseUrl": "https://www.tonoleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "torresleiloes_com_br",
    "name": "Torres Leilões",
    "domain": "torresleiloes.com.br",
    "baseUrl": "https://www.torresleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "triadeleiloes_com_br",
    "name": "Tríade Leilões",
    "domain": "triadeleiloes.com.br",
    "baseUrl": "https://www.triadeleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "universodosleiloes_com_br",
    "name": "Universo dos Leilões",
    "domain": "universodosleiloes.com.br",
    "baseUrl": "https://www.universodosleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "upleilao_com_br",
    "name": "upleilao.com.br",
    "domain": "upleilao.com.br",
    "baseUrl": "https://www.upleilao.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "valdeirpereiraleiloeiro_com_br",
    "name": "Valdeir Pereira Leiloeiro",
    "domain": "valdeirpereiraleiloeiro.com.br",
    "baseUrl": "https://www.valdeirpereiraleiloeiro.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "valleleiloes_com_br",
    "name": "valleleiloes.com.br",
    "domain": "valleleiloes.com.br",
    "baseUrl": "https://www.valleleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vardanaleiloes_com_br",
    "name": "Vardana Leilões",
    "domain": "vardanaleiloes.com.br",
    "baseUrl": "https://www.vardanaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "venturelileiloes_com_br",
    "name": "venturelileiloes.com.br",
    "domain": "venturelileiloes.com.br",
    "baseUrl": "https://www.venturelileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "veronicaleiloes_com_br",
    "name": "Verônica Leilões",
    "domain": "veronicaleiloes.com.br",
    "baseUrl": "https://www.veronicaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "verrileiloes_com_br",
    "name": "Verri Leilões",
    "domain": "verrileiloes.com.br",
    "baseUrl": "https://www.verrileiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vgleiloespublicos_com_br",
    "name": "VG Leilões",
    "domain": "vgleiloespublicos.com.br",
    "baseUrl": "https://www.vgleiloespublicos.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vialeiloes_com_br",
    "name": "Via Leilões",
    "domain": "vialeiloes.com.br",
    "baseUrl": "https://www.vialeiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "viannaleiloes_com_br",
    "name": "Priscila Vianna Leiloeira Pública",
    "domain": "viannaleiloes.com.br",
    "baseUrl": "https://www.viannaleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vincileiloes_com_brexterno",
    "name": "Vinci Leilões",
    "domain": "vincileiloes.com.brexterno",
    "baseUrl": "https://www.vincileiloes.com.brexterno",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vivagoiasleiloes_com_br",
    "name": "Viva Goiás Leilões",
    "domain": "vivagoiasleiloes.com.br",
    "baseUrl": "https://www.vivagoiasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vixleiloes_com_br",
    "name": "Vix Leilões",
    "domain": "vixleiloes.com.br",
    "baseUrl": "https://www.vixleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "vizeuonline_com_br",
    "name": "vizeuonline.com.br",
    "domain": "vizeuonline.com.br",
    "baseUrl": "https://www.vizeuonline.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "wendelgarcia_com_br",
    "name": "Wendel Garcia - Leiloeiro Oficial",
    "domain": "wendelgarcia.com.br",
    "baseUrl": "https://www.wendelgarcia.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "wrleiloes_com_br",
    "name": "WR Leilões",
    "domain": "wrleiloes.com.br",
    "baseUrl": "https://www.wrleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "zaccariasleiloes_com_br",
    "name": "Zaccarias Leiloeiro Oficial",
    "domain": "zaccariasleiloes.com.br",
    "baseUrl": "https://www.zaccariasleiloes.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "zaccarino_com_br",
    "name": "Zaccarino Leilões",
    "domain": "zaccarino.com.br",
    "baseUrl": "https://www.zaccarino.com.br",
    "genericScrape": true,
    "enabled": true,
    "nexusImoveis": 0,
    "nexusSituacao": "sem_imoveis"
  },
  {
    "id": "almeidaleiloes_com_br",
    "name": "Almeida Leilões",
    "domain": "almeidaleiloes.com.br",
    "baseUrl": "https://www.almeidaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "americaleiloes_com_br",
    "name": "América Leilões",
    "domain": "americaleiloes.com.br",
    "baseUrl": "https://www.americaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "amleiloes_lel_br",
    "name": "AM Leilões",
    "domain": "amleiloes.lel.br",
    "baseUrl": "https://www.amleiloes.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "anabrasilleiloes_com_br",
    "name": "Ana Brasil Leilões",
    "domain": "anabrasilleiloes.com.br",
    "baseUrl": "https://www.anabrasilleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "andersonleiloeiro_lel_br",
    "name": "Anderson Leiloeiro",
    "domain": "andersonleiloeiro.lel.br",
    "baseUrl": "https://www.andersonleiloeiro.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "bramoleiloes_com_br",
    "name": "Bramo Leilões",
    "domain": "bramoleiloes.com.br",
    "baseUrl": "https://www.bramoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "casareisleiloesonline_com_br",
    "name": "Casa Reis Leilões",
    "domain": "casareisleiloesonline.com.br",
    "baseUrl": "https://www.casareisleiloesonline.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "cearaleiloes_com_br",
    "name": "Ceará Leilões",
    "domain": "cearaleiloes.com.br",
    "baseUrl": "https://www.cearaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "clicleilao_com_br",
    "name": "Giuliano Ferronato",
    "domain": "clicleilao.com.br",
    "baseUrl": "https://www.clicleilao.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "confiancaleiloes_com_br",
    "name": "Confiança Leilões",
    "domain": "confiancaleiloes.com.br",
    "baseUrl": "https://www.confiancaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "confiancaleiloes_leilao_br",
    "name": "Confiança Leilões",
    "domain": "confiancaleiloes.leilao.br",
    "baseUrl": "https://www.confiancaleiloes.leilao.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "corleiloes_com_br",
    "name": "Cor Leilões",
    "domain": "corleiloes.com.br",
    "baseUrl": "https://www.corleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "costanetoleiloeiro_com_br",
    "name": "Costa Neto Leiloeiro",
    "domain": "costanetoleiloeiro.com.br",
    "baseUrl": "https://www.costanetoleiloeiro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "danieloliveiraleiloes_com_br",
    "name": "Daniel Oliveira Leilões",
    "domain": "danieloliveiraleiloes.com.br",
    "baseUrl": "https://www.danieloliveiraleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "dasilvaleiloes_com_br",
    "name": "Da Silva Leilões",
    "domain": "dasilvaleiloes.com.br",
    "baseUrl": "https://www.dasilvaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "e_confianca_com_br",
    "name": "e-Confiança Leilões",
    "domain": "e-confianca.com.br",
    "baseUrl": "https://www.e-confianca.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "e_leiloeiro_com_br",
    "name": "e-Leilões",
    "domain": "e-leiloeiro.com.br",
    "baseUrl": "https://www.e-leiloeiro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "ednleiloes_com_br",
    "name": "EDN Leilões",
    "domain": "ednleiloes.com.br",
    "baseUrl": "https://www.ednleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "emersonoliveira_com_br",
    "name": "Emerson Oliveira",
    "domain": "emersonoliveira.com.br",
    "baseUrl": "https://www.emersonoliveira.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "emperadorleiloes_com_br",
    "name": "Emperador Leilões",
    "domain": "emperadorleiloes.com.br",
    "baseUrl": "https://www.emperadorleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "ericosobral_com_br",
    "name": "Erico Sobral Leilões",
    "domain": "ericosobral.com.br",
    "baseUrl": "https://www.ericosobral.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "evolveleiloes_com_br",
    "name": "Evolve Leilões",
    "domain": "evolveleiloes.com.br",
    "baseUrl": "https://www.evolveleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "ferronato_leilao_br",
    "name": "Giuliano Ferronato",
    "domain": "ferronato.leilao.br",
    "baseUrl": "https://www.ferronato.leilao.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "freitasleiloes_com_br",
    "name": "Freitas Leilões",
    "domain": "freitasleiloes.com.br",
    "baseUrl": "https://www.freitasleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "hastaceara_com_br",
    "name": "Hasta Ceará",
    "domain": "hastaceara.com.br",
    "baseUrl": "https://www.hastaceara.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "hastavip_com_br",
    "name": "Leilão VIP Leilões",
    "domain": "hastavip.com.br",
    "baseUrl": "https://www.hastavip.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "icaroleiloes_com_br",
    "name": "Icaro Leilões",
    "domain": "icaroleiloes.com.br",
    "baseUrl": "https://www.icaroleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "idleiloes_com_br",
    "name": "ID Leilões",
    "domain": "idleiloes.com.br",
    "baseUrl": "https://www.idleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "imperioleiloes_com",
    "name": "Império dos Leilões",
    "domain": "imperioleiloes.com",
    "baseUrl": "https://www.imperioleiloes.com",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "infinityleiloes_com_br",
    "name": "Infinity Leilões",
    "domain": "infinityleiloes.com.br",
    "baseUrl": "https://www.infinityleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "judicialileiloes_com_br",
    "name": "Judiciali Leilões",
    "domain": "judicialileiloes.com.br",
    "baseUrl": "https://www.judicialileiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leilaomanaus_com_br",
    "name": "Leilão Manaus",
    "domain": "leilaomanaus.com.br",
    "baseUrl": "https://www.leilaomanaus.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leiloesjudiciaisgo_com_br",
    "name": "Leilões Judiciais GO",
    "domain": "leiloesjudiciaisgo.com.br",
    "baseUrl": "https://www.leiloesjudiciaisgo.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leiloesjudiciaismgnorte_com_br",
    "name": "Leilões Judiciais MG Norte",
    "domain": "leiloesjudiciaismgnorte.com.br",
    "baseUrl": "https://www.leiloesjudiciaismgnorte.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leiloesjudiciaisrs_com_br",
    "name": "Leilões Judiciais RS",
    "domain": "leiloesjudiciaisrs.com.br",
    "baseUrl": "https://www.leiloesjudiciaisrs.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leiloesonlinesp_com_br",
    "name": "Leilões Online SP",
    "domain": "leiloesonlinesp.com.br",
    "baseUrl": "https://www.leiloesonlinesp.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leiloesrionegro_com_br",
    "name": "Leilões Rio Negro",
    "domain": "leiloesrionegro.com.br",
    "baseUrl": "https://www.leiloesrionegro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leilofy_com_br",
    "name": "Leilofy",
    "domain": "leilofy.com.br",
    "baseUrl": "https://www.leilofy.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "leilomaster_com_br",
    "name": "Leilo Master",
    "domain": "leilomaster.com.br",
    "baseUrl": "https://www.leilomaster.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "lut_com_br",
    "name": "lut.com.br",
    "domain": "lut.com.br",
    "baseUrl": "https://www.lut.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "martinsleiloes_com_br",
    "name": "Martins Leilões",
    "domain": "martinsleiloes.com.br",
    "baseUrl": "https://www.martinsleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "meloleiloes_com_br",
    "name": "Melo Leilões",
    "domain": "meloleiloes.com.br",
    "baseUrl": "https://www.meloleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "multleiloes_com",
    "name": "Mult Leilões",
    "domain": "multleiloes.com",
    "baseUrl": "https://www.multleiloes.com",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "munizleiloes_com_br",
    "name": "Muniz Leilões",
    "domain": "munizleiloes.com.br",
    "baseUrl": "https://www.munizleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "mzmleiloes_com_br",
    "name": "MZM Leilões Oficiais",
    "domain": "mzmleiloes.com.br",
    "baseUrl": "https://www.mzmleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "onebid_com_br",
    "name": "Onebid Leilões",
    "domain": "onebid.com.br",
    "baseUrl": "https://www.onebid.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "oreidosleiloes_com_br",
    "name": "O Rei dos Leilões",
    "domain": "oreidosleiloes.com.br",
    "baseUrl": "https://www.oreidosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "pactoleiloes_com_br",
    "name": "Pacto Leilões",
    "domain": "pactoleiloes.com.br",
    "baseUrl": "https://www.pactoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "pamplonaleiloes_com_br",
    "name": "Pamplona Leilões",
    "domain": "pamplonaleiloes.com.br",
    "baseUrl": "https://www.pamplonaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "paulotolentino_com_br",
    "name": "Paulo Tolentino",
    "domain": "paulotolentino.com.br",
    "baseUrl": "https://www.paulotolentino.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "pietrangello_com_br",
    "name": "Pietrângello Leiloeiro",
    "domain": "pietrangello.com.br",
    "baseUrl": "https://www.pietrangello.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "portovelholeiloes_com_br",
    "name": "Porto Velho Leilões",
    "domain": "portovelholeiloes.com.br",
    "baseUrl": "https://www.portovelholeiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "rzleiloes_com_br",
    "name": "Roberta Zago Leilões",
    "domain": "rzleiloes.com.br",
    "baseUrl": "https://www.rzleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "sandraleiloeira_com_br",
    "name": "Sandra Santos Leilões",
    "domain": "sandraleiloeira.com.br",
    "baseUrl": "https://www.sandraleiloeira.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "silviabarros_com_br",
    "name": "Sílvia Barros Leilões",
    "domain": "silviabarros.com.br",
    "baseUrl": "https://www.silviabarros.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "sold_superbid_net",
    "name": "Sold Leilões",
    "domain": "sold.superbid.net",
    "baseUrl": "https://www.sold.superbid.net",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "souzasilvaleiloes_com_br",
    "name": "souzasilvaleiloes.com.br",
    "domain": "souzasilvaleiloes.com.br",
    "baseUrl": "https://www.souzasilvaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "valland_com_br",
    "name": "Valland Leilões",
    "domain": "valland.com.br",
    "baseUrl": "https://www.valland.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "outro_site"
  },
  {
    "id": "acleiloes_com_br",
    "name": "A Costa Leilões",
    "domain": "acleiloes.com.br",
    "baseUrl": "https://www.acleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "alexiusleiloes_com_br",
    "name": "Alexius Leilões",
    "domain": "alexiusleiloes.com.br",
    "baseUrl": "https://www.alexiusleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "anhangueraleiloes_com_br",
    "name": "Anhanguera Leilões",
    "domain": "anhangueraleiloes.com.br",
    "baseUrl": "https://www.anhangueraleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "assuncaoleiloes_com_br",
    "name": "Assunção Leilões",
    "domain": "assuncaoleiloes.com.br",
    "baseUrl": "https://www.assuncaoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "bagarolloleiloes_com_br",
    "name": "Bagarollo Leilões",
    "domain": "bagarolloleiloes.com.br",
    "baseUrl": "https://www.bagarolloleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "baraodosleiloes_com_br",
    "name": "Barão dos Leilões",
    "domain": "baraodosleiloes.com.br",
    "baseUrl": "https://www.baraodosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "bvleiloes_com_br",
    "name": "BV Leilões",
    "domain": "bvleiloes.com.br",
    "baseUrl": "https://www.bvleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "c3leiloes_com_br",
    "name": "C3 Leilões",
    "domain": "c3leiloes.com.br",
    "baseUrl": "https://www.c3leiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "camargonet_com_br",
    "name": "CamargoNet Leilões",
    "domain": "camargonet.com.br",
    "baseUrl": "https://www.camargonet.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "carmencapellaleiloes_com",
    "name": "Camen Capella Leilões",
    "domain": "carmencapellaleiloes.com",
    "baseUrl": "https://www.carmencapellaleiloes.com",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "castroleiloes_com_br",
    "name": "Castro Leilões",
    "domain": "castroleiloes.com.br",
    "baseUrl": "https://www.castroleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "cecleiloes_com_br",
    "name": "C&C Leilões",
    "domain": "cecleiloes.com.br",
    "baseUrl": "https://www.cecleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "centrodeleiloescanoas_lel_br",
    "name": "Centro de Leilões Canoas",
    "domain": "centrodeleiloescanoas.lel.br",
    "baseUrl": "https://www.centrodeleiloescanoas.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "cleversonleiloes_com_br",
    "name": "Cleverson Leilões",
    "domain": "cleversonleiloes.com.br",
    "baseUrl": "https://www.cleversonleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "cobalchinileiloes_com_br",
    "name": "Cobalchini Leilões",
    "domain": "cobalchinileiloes.com.br",
    "baseUrl": "https://www.cobalchinileiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "cruzeiroleiloes_com_br",
    "name": "Cruzeiro Leilões",
    "domain": "cruzeiroleiloes.com.br",
    "baseUrl": "https://www.cruzeiroleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "ctsleiloes_com_br",
    "name": "CTS Leilões",
    "domain": "ctsleiloes.com.br",
    "baseUrl": "https://www.ctsleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "daianaleiloeira_com_br",
    "name": "Daiana Martins Leiloeira",
    "domain": "daianaleiloeira.com.br",
    "baseUrl": "https://www.daianaleiloeira.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "darkeleiloes_com_br",
    "name": "Darke Leilões",
    "domain": "darkeleiloes.com.br",
    "baseUrl": "https://www.darkeleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "destroleiloes_com_br",
    "name": "Destro Leilões",
    "domain": "destroleiloes.com.br",
    "baseUrl": "https://www.destroleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "dinamicaleiloes_com_br",
    "name": "Dinâmica Leilões",
    "domain": "dinamicaleiloes.com.br",
    "baseUrl": "https://www.dinamicaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "dinizmartinsleiloes_com_br",
    "name": "Diniz Martins Leilões",
    "domain": "dinizmartinsleiloes.com.br",
    "baseUrl": "https://www.dinizmartinsleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "feldensleiloes_lel_br",
    "name": "Feldens Leilões",
    "domain": "feldensleiloes.lel.br",
    "baseUrl": "https://www.feldensleiloes.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "fgleiloes_com_br",
    "name": "FG Leilões",
    "domain": "fgleiloes.com.br",
    "baseUrl": "https://www.fgleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "futuraleiloes_com_br",
    "name": "Futura Leilões",
    "domain": "futuraleiloes.com.br",
    "baseUrl": "https://www.futuraleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "gabrielfelixleiloes_com_br",
    "name": "Gabriel Felix Rio Leilões",
    "domain": "gabrielfelixleiloes.com.br",
    "baseUrl": "https://www.gabrielfelixleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "gestornacional_com_br",
    "name": "Gestor Nacional",
    "domain": "gestornacional.com.br",
    "baseUrl": "https://www.gestornacional.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "gomesleiloes_com_br",
    "name": "Gomes Leilões",
    "domain": "gomesleiloes.com.br",
    "baseUrl": "https://www.gomesleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "gracamedeirosleiloes_com_br",
    "name": "Graça Medeiros Leilões",
    "domain": "gracamedeirosleiloes.com.br",
    "baseUrl": "https://www.gracamedeirosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "gualeiloes_com_br",
    "name": "Gua Leilões",
    "domain": "gualeiloes.com.br",
    "baseUrl": "https://www.gualeiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "hkleiloes_com_br",
    "name": "Helcio Kronberg Leilões",
    "domain": "hkleiloes.com.br",
    "baseUrl": "https://www.hkleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "horizonteleiloes_com_br",
    "name": "Horizonte Leilões",
    "domain": "horizonteleiloes.com.br",
    "baseUrl": "https://www.horizonteleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "hugopimentaleiloeiro_lel_br",
    "name": "Hugo Pimenta Leiloeiro",
    "domain": "hugopimentaleiloeiro.lel.br",
    "baseUrl": "https://www.hugopimentaleiloeiro.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "inoveleiloes_com_br",
    "name": "Inove Leilões",
    "domain": "inoveleiloes.com.br",
    "baseUrl": "https://www.inoveleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "jicleiloes_com_br",
    "name": "JIC Leilões",
    "domain": "jicleiloes.com.br",
    "baseUrl": "https://www.jicleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "jtleiloes_com_br",
    "name": "JT Leilões",
    "domain": "jtleiloes.com.br",
    "baseUrl": "https://www.jtleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "k2leiloes_com_br",
    "name": "K2 Leilões",
    "domain": "k2leiloes.com.br",
    "baseUrl": "https://www.k2leiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "kikoproencaleiloes_com_br",
    "name": "Kiko Proença Leilões",
    "domain": "kikoproencaleiloes.com.br",
    "baseUrl": "https://www.kikoproencaleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "kirinusleiloes_com_br",
    "name": "Kirinus Leilões",
    "domain": "kirinusleiloes.com.br",
    "baseUrl": "https://www.kirinusleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "knleiloes_com_br",
    "name": "KN Leilões",
    "domain": "knleiloes.com.br",
    "baseUrl": "https://www.knleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "kriegerleiloes_com_br",
    "name": "Krieger Leilões",
    "domain": "kriegerleiloes.com.br",
    "baseUrl": "https://www.kriegerleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "lbnleiloes_com_br",
    "name": "LBN Leilões",
    "domain": "lbnleiloes.com.br",
    "baseUrl": "https://www.lbnleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leilaojud_com_br",
    "name": "Leilão Jud",
    "domain": "leilaojud.com.br",
    "baseUrl": "https://www.leilaojud.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloeiroqueiroz_com_br",
    "name": "Leiloeiro Queiroz",
    "domain": "leiloeiroqueiroz.com.br",
    "baseUrl": "https://www.leiloeiroqueiroz.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloeirosp_com_br",
    "name": "Leiloeiro SP",
    "domain": "leiloeirosp.com.br",
    "baseUrl": "https://www.leiloeirosp.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloescruz_com_br",
    "name": "Leilões Cruz",
    "domain": "leiloescruz.com.br",
    "baseUrl": "https://www.leiloescruz.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloesjudiciaisdf_com_br",
    "name": "Leiloeiro Oficial Álvaro Sérgio Fuzo",
    "domain": "leiloesjudiciaisdf.com.br",
    "baseUrl": "https://www.leiloesjudiciaisdf.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloesjudiciaisparaiba_com_br",
    "name": "Leilões Judiciais Paraíba",
    "domain": "leiloesjudiciaisparaiba.com.br",
    "baseUrl": "https://www.leiloesjudiciaisparaiba.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "leiloesjvfarias_com_br",
    "name": "Leilões JV Farias",
    "domain": "leiloesjvfarias.com.br",
    "baseUrl": "https://www.leiloesjvfarias.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "ligiaseixasleiloes_com_br",
    "name": "Ligia Seixas Leilões",
    "domain": "ligiaseixasleiloes.com.br",
    "baseUrl": "https://www.ligiaseixasleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "lotusleiloes_com_br",
    "name": "Lotus Leilões",
    "domain": "lotusleiloes.com.br",
    "baseUrl": "https://www.lotusleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "luizbalbinoleiloes_com_br",
    "name": "Luiz Banbino Leilões",
    "domain": "luizbalbinoleiloes.com.br",
    "baseUrl": "https://www.luizbalbinoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "macariosleiloes_com_br",
    "name": "Macarios Leilões",
    "domain": "macariosleiloes.com.br",
    "baseUrl": "https://www.macariosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "magarte_com_br",
    "name": "Margarte Leilões",
    "domain": "magarte.com.br",
    "baseUrl": "https://www.magarte.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "marcelocemin_lel_br",
    "name": "Marcelo Cemin Leilões",
    "domain": "marcelocemin.lel.br",
    "baseUrl": "https://www.marcelocemin.lel.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "marianalangleiloes_com_br",
    "name": "Mariana Lang Leilões",
    "domain": "marianalangleiloes.com.br",
    "baseUrl": "https://www.marianalangleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "marianapintoleiloes_com_br",
    "name": "Mariana Pinto Leilões",
    "domain": "marianapintoleiloes.com.br",
    "baseUrl": "https://www.marianapintoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "melhorlanceleiloes_com_br",
    "name": "Melhor Lance Leilões",
    "domain": "melhorlanceleiloes.com.br",
    "baseUrl": "https://www.melhorlanceleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "mikedutraleiloeiro_com_br",
    "name": "Mike Dutra Leiloeiro",
    "domain": "mikedutraleiloeiro.com.br",
    "baseUrl": "https://www.mikedutraleiloeiro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "mleiloes_com_br",
    "name": "M Leilões",
    "domain": "mleiloes.com.br",
    "baseUrl": "https://www.mleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "msoleiloes_com_br",
    "name": "MSO Leilões",
    "domain": "msoleiloes.com.br",
    "baseUrl": "https://www.msoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "muckleiloes_com_br",
    "name": "Evandro Muck Leilões",
    "domain": "muckleiloes.com.br",
    "baseUrl": "https://www.muckleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "multialeiloes_com_br",
    "name": "MultiA Leilões",
    "domain": "multialeiloes.com.br",
    "baseUrl": "https://www.multialeiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "mundodosleiloes_com_br",
    "name": "Mundos dos Leilões",
    "domain": "mundodosleiloes.com.br",
    "baseUrl": "https://www.mundodosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "navesleiloes_com_br",
    "name": "Naves Leilões",
    "domain": "navesleiloes.com.br",
    "baseUrl": "https://www.navesleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "new_bid_com",
    "name": "New Bid Leilões",
    "domain": "new-bid.com",
    "baseUrl": "https://www.new-bid.com",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "niltonbrancalliao_com_br",
    "name": "niltonbrancalliao.com.br",
    "domain": "niltonbrancalliao.com.br",
    "baseUrl": "https://www.niltonbrancalliao.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "nortebahialeiloes_com_br",
    "name": "Norte Bahia Leilões",
    "domain": "nortebahialeiloes.com.br",
    "baseUrl": "https://www.nortebahialeiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "nortonleiloes_com_br",
    "name": "Norton Leilões",
    "domain": "nortonleiloes.com.br",
    "baseUrl": "https://www.nortonleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "olianileiloes_com_br",
    "name": "Oliani Leilões",
    "domain": "olianileiloes.com.br",
    "baseUrl": "https://www.olianileiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "perfilleiloes_com_br",
    "name": "Perfil Leilões",
    "domain": "perfilleiloes.com.br",
    "baseUrl": "https://www.perfilleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "publicumleiloes_com_br",
    "name": "Publicum Leilões",
    "domain": "publicumleiloes.com.br",
    "baseUrl": "https://www.publicumleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "rdantasleiloes_com_br",
    "name": "Roberto Dantas Leiloeiro",
    "domain": "rdantasleiloes.com.br",
    "baseUrl": "https://www.rdantasleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "realfgleiloes_com_br",
    "name": "Real FG Leilões",
    "domain": "realfgleiloes.com.br",
    "baseUrl": "https://www.realfgleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "rondoleiloes_com_br",
    "name": "Rondo Leilões",
    "domain": "rondoleiloes.com.br",
    "baseUrl": "https://www.rondoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "rondonialeiloes_com_br",
    "name": "Rondônia Leilões",
    "domain": "rondonialeiloes.com.br",
    "baseUrl": "https://www.rondonialeiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "superlanceleilao_com_br",
    "name": "Super Lance Leilão",
    "domain": "superlanceleilao.com.br",
    "baseUrl": "https://www.superlanceleilao.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "targetleiloes_com_br",
    "name": "Target Leilões",
    "domain": "targetleiloes.com.br",
    "baseUrl": "https://www.targetleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "tempoleiloes_com_br",
    "name": "Tempo Leilões",
    "domain": "tempoleiloes.com.br",
    "baseUrl": "https://www.tempoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "trevosleiloes_com_br",
    "name": "Trevos Leilões",
    "domain": "trevosleiloes.com.br",
    "baseUrl": "https://www.trevosleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "trt_eduardosorgileiloeiro_com_br",
    "name": "Eduardo Sorgi",
    "domain": "trt.eduardosorgileiloeiro.com.br",
    "baseUrl": "https://www.trt.eduardosorgileiloeiro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "uonleiloes_com_br",
    "name": "Uon Leilões",
    "domain": "uonleiloes.com.br",
    "baseUrl": "https://www.uonleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "valeleilao_com_br",
    "name": "Vale Leilão",
    "domain": "valeleilao.com.br",
    "baseUrl": "https://www.valeleilao.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "varonesleiloes_com_br",
    "name": "Varones Drabach Leilões",
    "domain": "varonesleiloes.com.br",
    "baseUrl": "https://www.varonesleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "vbleiloes_com_br",
    "name": "VB Leilões",
    "domain": "vbleiloes.com.br",
    "baseUrl": "https://www.vbleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "vdleiloes_com_br",
    "name": "Varones Drabach",
    "domain": "vdleiloes.com.br",
    "baseUrl": "https://www.vdleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "venetoleiloes_com_br",
    "name": "Veneto Leilões",
    "domain": "venetoleiloes.com.br",
    "baseUrl": "https://www.venetoleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "veraleiloes_com_br",
    "name": "Vera Leilões",
    "domain": "veraleiloes.com.br",
    "baseUrl": "https://www.veraleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "vicenteleiloeiro_com_br",
    "name": "Vicente de Paula Xavier Filho",
    "domain": "vicenteleiloeiro.com.br",
    "baseUrl": "https://www.vicenteleiloeiro.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "vicenteleiloes_com_br",
    "name": "Vicente Leilões",
    "domain": "vicenteleiloes.com.br",
    "baseUrl": "https://www.vicenteleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "weiderleiloes_com_br",
    "name": "Weider Leilões",
    "domain": "weiderleiloes.com.br",
    "baseUrl": "https://www.weiderleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "whleiloes_com_br",
    "name": "WH Leilões",
    "domain": "whleiloes.com.br",
    "baseUrl": "https://www.whleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "willianleiloes_com_br",
    "name": "Willian Leilões",
    "domain": "willianleiloes.com.br",
    "baseUrl": "https://www.willianleiloes.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  },
  {
    "id": "zampierileilao_com_br",
    "name": "Zampieri Leilão",
    "domain": "zampierileilao.com.br",
    "baseUrl": "https://www.zampierileilao.com.br",
    "genericScrape": true,
    "enabled": false,
    "nexusImoveis": 0,
    "nexusSituacao": "site_indisponivel"
  }
];
