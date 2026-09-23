import { auditOfficialArea, type AreaAudit } from './src/utils/officialAreaAudit.ts';
import { createHash } from 'node:crypto';
import { officialLotFinancials } from './officialLotPayload.ts';
import { auctionSyncAudit, recordSourceAudit } from './auctionSyncAudit.ts';
import { declaredAuctionLocation } from './src/utils/auctionLocation.ts';
import fs from 'fs';
import { AUCTION_STATES, municipalityId, sourceAuctionLocation } from './src/utils/auctionGeography.ts';
import puppeteer from 'puppeteer';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { readRegistryPdf } from './documentTextService.ts';

let documentOcrPausedUntil = 0;
import { AuctionProperty, PropertyType } from './src/types.ts';

export interface AuctioneerPortalConfig {
  id: string;
  name: string;
  domain: string;
  baseUrl: string;
  searchUrl?: string;
  genericScrape?: boolean;
  enabled: boolean;
}

export const AUCTIONEER_PORTALS: AuctioneerPortalConfig[] = [
  { id: 'freitas', name: 'Freitas Leiloeiro', domain: 'freitasleiloeiro.com.br', baseUrl: 'https://www.freitasleiloeiro.com.br', genericScrape: true, enabled: true },
  { id: 'leilaovip', name: 'Leilão VIP', domain: 'leilaovip.com.br', baseUrl: 'https://www.leilaovip.com.br', genericScrape: true, enabled: true },
  { id: "isaias", name: "Isaías Leilões", domain: "isaiasleiloes.com.br", baseUrl: "https://www.isaiasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alexandrecosta", name: "Alexandre Costa Leilões", domain: "alexandrecostaleiloes.com.br", baseUrl: "https://www.alexandrecostaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ayupp", name: "Fabiano Ayupp Leiloeiro", domain: "fabianoayuppleiloeiro.com.br", baseUrl: "https://fabianoayuppleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rioleiloes", name: "Rio Leilões", domain: "rioleiloes.com.br", baseUrl: "https://www.rioleiloes.com.br", genericScrape: true, enabled: true },
  { id: "frazao", name: "Frazão Leilões", domain: "frazaoleiloes.com.br", baseUrl: "https://www.frazaoleiloes.com.br", enabled: true },
  { id: "biasi", name: "Biasi Leilões", domain: "biasileiloes.com.br", baseUrl: "https://www.biasileiloes.com.br", enabled: true },
  { id: "megaleiloes", name: "Mega Leilões", domain: "megaleiloes.com.br", baseUrl: "https://www.megaleiloes.com.br", enabled: true },
  { id: "portalzuk", name: "Portal Zuk", domain: "portalzuk.com.br", baseUrl: "https://www.portalzuk.com.br", enabled: true },
  { id: "sold", name: "Sold Leilões", domain: "sold.com.br", baseUrl: "https://www.sold.com.br", genericScrape: true, enabled: true },
  { id: "pestana", name: "Pestana Leilões", domain: "pestanaleiloes.com.br", baseUrl: "https://www.pestanaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "mgl", name: "MGL Leilões", domain: "mgl.com.br", baseUrl: "https://www.mgl.com.br", searchUrl: "https://www.mgl.com.br/online/1/4/", genericScrape: true, enabled: true },
  { id: "leilaoimovel", name: "Leilão Imóvel", domain: "leilaoimovel.com.br", baseUrl: "https://www.leilaoimovel.com.br", genericScrape: true, enabled: true },
  { id: "leiloei", name: "Leiloei", domain: "leiloei.com", baseUrl: "https://leiloei.com", genericScrape: true, enabled: true },
  { id: "vitrinebradesco", name: "Vitrine Bradesco", domain: "vitrinebradesco.com.br", baseUrl: "https://vitrinebradesco.com.br", searchUrl: "https://vitrinebradesco.com.br/auctions?type=realstate", genericScrape: true, enabled: true },
  { id: "santander", name: "Santander Imóveis", domain: "santanderimoveis.com.br", baseUrl: "https://www.santanderimoveis.com.br", genericScrape: true, enabled: true },
  { id: "emgea", name: "EMGEA Imóveis", domain: "emgeaimoveis.com.br", baseUrl: "https://www.emgeaimoveis.com.br", searchUrl: "https://www.emgeaimoveis.com.br/busca", genericScrape: true, enabled: true },
  { id: "bb", name: "Seu Imóvel BB", domain: "seuimovelbb.com.br", baseUrl: "https://seuimovelbb.com.br", genericScrape: true, enabled: true },
  { id: "ricart", name: "Ricart Leilões", domain: "ricartleiloes.com.br", baseUrl: "https://www.ricartleiloes.com.br", genericScrape: true, enabled: true },
  { id: "pamela", name: "Pamela Leiloeira", domain: "pamelaleiloeira.com.br", baseUrl: "https://www.pamelaleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "gustavo", name: "Gustavo Leiloeiro", domain: "gustavoleiloeiro.com.br", baseUrl: "https://gustavoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "onildo", name: "Onildo Bastos", domain: "onildobastos.com.br", baseUrl: "https://www.onildobastos.com.br", searchUrl: "https://www.onildobastos.com.br/Principal.asp", genericScrape: true, enabled: true },
  { id: "schulmann", name: "Schulmann Leilões", domain: "schulmannleiloes.com.br", baseUrl: "https://schulmannleiloes.com.br", genericScrape: true, enabled: true },
  { id: "saraiva", name: "Saraiva Leilões", domain: "saraivaleiloes.com.br", baseUrl: "https://www.saraivaleiloes.com.br", searchUrl: "https://www.saraivaleiloes.com.br/buscador?categoria=2", genericScrape: true, enabled: true },
  { id: "rymer", name: "Rymer Leilões", domain: "rymerleiloes.com.br", baseUrl: "https://www.rymerleiloes.com.br", genericScrape: true, enabled: true },
  { id: "depaula", name: "De Paula Leilões", domain: "depaulaonline.com.br", baseUrl: "https://depaulaonline.com.br", genericScrape: true, enabled: true },
  { id: "jv", name: "JV Leilões", domain: "jvleiloes.lel.br", baseUrl: "https://www.jvleiloes.lel.br", searchUrl: "https://www.jvleiloes.lel.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "paulobotelho", name: "Paulo Botelho Leiloeiro", domain: "paulobotelholeiloeiro.com.br", baseUrl: "https://www.paulobotelholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "alexandro", name: "Alexandro Leiloeiro", domain: "alexandroleiloeiro.com.br", baseUrl: "https://alexandroleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "portella", name: "Portella Leilões", domain: "portellaleiloes.com.br", baseUrl: "https://portellaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "silas", name: "Silas Leiloeiro", domain: "silasleiloeiro.lel.br", baseUrl: "https://www.silasleiloeiro.lel.br", searchUrl: "https://www.silasleiloeiro.lel.br/Principal.asp?at=jd", genericScrape: true, enabled: true },
  { id: "joaoemilio", name: "João Emílio Leiloeiro", domain: "joaoemilio.com.br", baseUrl: "https://www.joaoemilio.com.br", searchUrl: "https://www.joaoemilio.com.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "facanha", name: "Façanha Leilões", domain: "facanhaleiloes.com.br", baseUrl: "https://facanhaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "jonas", name: "Jonas Leiloeiro", domain: "jonasleiloeiro.com.br", baseUrl: "https://www.jonasleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "fernandoleiloeiro", name: "Fernando Leiloeiro", domain: "fernandoleiloeiro.com.br", baseUrl: "https://www.fernandoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "comprei", name: "Comprei PGFN", domain: "comprei.pgfn.gov.br", baseUrl: "https://comprei.pgfn.gov.br", genericScrape: true, enabled: true },
  { id: "rogeriomenezes", name: "Rogério Menezes", domain: "rogeriomenezes.com.br", baseUrl: "https://www.rogeriomenezes.com.br", genericScrape: true, enabled: true },
  { id: "edgardecarvalho", name: "Edgar de Carvalho", domain: "edgardecarvalholeiloeiro.com.br", baseUrl: "https://www.edgardecarvalholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "brame", name: "Brame Leilões", domain: "brameleiloes.com.br", baseUrl: "https://www.brameleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lancejudicial", name: "Lance Judicial", domain: "lancejudicial.com.br", baseUrl: "https://www.lancejudicial.com.br", genericScrape: true, enabled: true },
  { id: "superbid", name: "Superbid", domain: "superbid.net", baseUrl: "https://www.superbid.net", genericScrape: true, enabled: true },
  { id: "murilochaves_com_br", name: "MURILO CARDOZO CHAVES", domain: "murilochaves.com.br", baseUrl: "https://www.murilochaves.com.br", genericScrape: true, enabled: true },
  { id: "depaulaonline_br", name: "LUIZ TENÓRIO DE PAULA", domain: "depaulaonline.br", baseUrl: "https://www.depaulaonline.br", genericScrape: true, enabled: true },
  { id: "edgarcarvalholeiloeiro_com_br", name: "EDGAR DE CARVALHO JUNIOR", domain: "edgarcarvalholeiloeiro.com.br", baseUrl: "https://www.edgarcarvalholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "machadoleiloes_com_br", name: "NORMA MARIA MACHADO", domain: "machadoleiloes.com.br", baseUrl: "https://www.machadoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloeirasilvani_com_br", name: "SILVANI DAS GRAÇAS LOPES DIAS", domain: "leiloeirasilvani.com.br", baseUrl: "https://www.leiloeirasilvani.com.br", genericScrape: true, enabled: true },
  { id: "robertohaddad_com_br", name: "ROBERTO HADDAD", domain: "robertohaddad.com.br", baseUrl: "https://www.robertohaddad.com.br", genericScrape: true, enabled: true },
  { id: "raulbarbosa_lel_br", name: "RAUL BARBOSA CESAR FILHO", domain: "raulbarbosa.lel.br", baseUrl: "https://www.raulbarbosa.lel.br", genericScrape: true, enabled: true },
  { id: "fernandobraga_lel_br", name: "FERNANDO MOREIRA BRAGA", domain: "fernandobraga.lel.br", baseUrl: "https://www.fernandobraga.lel.br", genericScrape: true, enabled: true },
  { id: "leiloesbraga_lel_br", name: "FERNANDO MOREIRA BRAGA", domain: "leiloesbraga.lel.br", baseUrl: "https://www.leiloesbraga.lel.br", genericScrape: true, enabled: true },
  { id: "josimarleiloeiro_com_br", name: "JOSIMAR DE AZEVEDO SANTOS", domain: "josimarleiloeiro.com.br", baseUrl: "https://www.josimarleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "marioricart_lel_br", name: "MARIO MILTON BITTENCOURT RICART", domain: "marioricart.lel.br", baseUrl: "https://www.marioricart.lel.br", genericScrape: true, enabled: true },
  { id: "antonioferreira_lel_br", name: "ANTONIO CARLOS DA COSTA FERREIRA", domain: "antonioferreira.lel.br", baseUrl: "https://www.antonioferreira.lel.br", genericScrape: true, enabled: true },
  { id: "andrealeiloeirapublica_lel_br", name: "ANDR&#201;A ROSA COSTA", domain: "andrealeiloeirapublica.lel.br", baseUrl: "https://www.andrealeiloeirapublica.lel.br", genericScrape: true, enabled: true },
  { id: "levyleiloeiro_com_br", name: "FRANKLIN LEVY", domain: "levyleiloeiro.com.br", baseUrl: "https://www.levyleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "walterrezende_com_br", name: "WALTER FONSECA REZENDE FILH0", domain: "walterrezende.com.br", baseUrl: "https://www.walterrezende.com.br", genericScrape: true, enabled: true },
  { id: "mvleiloes_lel_br", name: "VAL&#201;RIA PONTES  BRAGA KAHN", domain: "mvleiloes.lel.br", baseUrl: "https://www.mvleiloes.lel.br", genericScrape: true, enabled: true },
  { id: "alexandreleiloeiro_com_br", name: "ALEXANDRO DA SILVA LACERDA", domain: "alexandreleiloeiro.com.br", baseUrl: "https://www.alexandreleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "gustavoleileiro_com", name: "GUSTAVO PORTELLA LOURENÇO", domain: "gustavoleileiro.com", baseUrl: "https://www.gustavoleileiro.com", genericScrape: true, enabled: true },
  { id: "gustavoleiloeiro_com", name: "GUSTAVO PORTELLA LOURENÇO", domain: "gustavoleiloeiro.com", baseUrl: "https://www.gustavoleiloeiro.com", genericScrape: true, enabled: true },
  { id: "galeriaalphaville_com_br", name: "CRISTINA MARIA ANTUNES GOSTON", domain: "galeriaalphaville.com.br", baseUrl: "https://www.galeriaalphaville.com.br", genericScrape: true, enabled: true },
  { id: "ricardocorrealeiloes_com", name: "RICARDO IGNACIO XAVIER CORR&#202;A", domain: "ricardocorrealeiloes.com", baseUrl: "https://www.ricardocorrealeiloes.com", genericScrape: true, enabled: true },
  { id: "schulmann_com_br", name: "LEONARDO SCHULMANN", domain: "schulmann.com.br", baseUrl: "https://www.schulmann.com.br", genericScrape: true, enabled: true },
  { id: "rodrigocostaleiloeiro_com_br", name: "RODRIGO DA SILVA COSTA", domain: "rodrigocostaleiloeiro.com.br", baseUrl: "https://www.rodrigocostaleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "leiloeirolegentil_com_br", name: "JESSUALDO FORTUNA LE GENTIL", domain: "leiloeirolegentil.com.br", baseUrl: "https://www.leiloeirolegentil.com.br", genericScrape: true, enabled: true },
  { id: "analucialeiloeira_com_br", name: "ANA LUCIA GOMES DE S&#193;", domain: "analucialeiloeira.com.br", baseUrl: "https://www.analucialeiloeira.com.br", genericScrape: true, enabled: true },
  { id: "fabioleiloes_com_br", name: "FABIO MANOEL GUIMAR&#195;ES", domain: "fabioleiloes.com.br", baseUrl: "https://www.fabioleiloes.com.br", genericScrape: true, enabled: true },
  { id: "octaviovianna_lel_br", name: "OCTAVIO HENRIQUE BARBIERI CYSNEIROS VIANNA", domain: "octaviovianna.lel.br", baseUrl: "https://www.octaviovianna.lel.br", genericScrape: true, enabled: true },
  { id: "mvleiloes_com_br", name: "MAICON RODRIGUES ITABORAY", domain: "mvleiloes.com.br", baseUrl: "https://www.mvleiloes.com.br", genericScrape: true, enabled: true },
  { id: "sergiorepresasleiloes_com_br", name: "S&#201;RGIO LUIS REPRESAS CARDOSO", domain: "sergiorepresasleiloes.com.br", baseUrl: "https://www.sergiorepresasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "wmsleiloes_com_br", name: "WILKERSON MACHADO DOS SANTOS", domain: "wmsleiloes.com.br", baseUrl: "https://www.wmsleiloes.com.br", genericScrape: true, enabled: true },
  { id: "marcoscostaleiloeiro_com_br", name: "MARCOS LEONARDO DE MELLO COSTA", domain: "marcoscostaleiloeiro.com.br", baseUrl: "https://www.marcoscostaleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "gpleilao_com_br", name: "GUSTAVO PEDRO DE LIMA DE PAULA", domain: "gpleilao.com.br", baseUrl: "https://www.gpleilao.com.br", genericScrape: true, enabled: true },
  { id: "bspleiloes_com_br", name: "BIANCA SOARES PAIS DE CARVALHO", domain: "bspleiloes.com.br", baseUrl: "https://www.bspleiloes.com.br", genericScrape: true, enabled: true },
  { id: "dagsaboya_com_br", name: "LUIZ SERGIO PEREIRA", domain: "dagsaboya.com.br", baseUrl: "https://www.dagsaboya.com.br", genericScrape: true, enabled: true },
  { id: "karlapepe_lel_br", name: "KARLA LUDMILA PEPE AGUIAR", domain: "karlapepe.lel.br", baseUrl: "https://www.karlapepe.lel.br", genericScrape: true, enabled: true },
  { id: "alanleiloeiro_com_br", name: "ALAN MACHADO RIBEIRO", domain: "alanleiloeiro.com.br", baseUrl: "https://www.alanleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "sevidanesleiloeira_com_br", name: "SANDRA REGINA SEVIDANES DE RODRIGUES", domain: "sevidanesleiloeira.com.br", baseUrl: "https://www.sevidanesleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "mariapia_lel_br", name: "MARIA DA PIEDADE FERNANDES ATHAYDE DE MORAES", domain: "mariapia.lel.br", baseUrl: "https://www.mariapia.lel.br", genericScrape: true, enabled: true },
  { id: "thaisalexandreleiloeira_com_br", name: "THAIS VILLELA ALEXANDRE", domain: "thaisalexandreleiloeira.com.br", baseUrl: "https://www.thaisalexandreleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "tostesleiloeiro_com_br", name: "CELSO BARROS TOSTES", domain: "tostesleiloeiro.com.br", baseUrl: "https://www.tostesleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "fabianoleiloeiro_net", name: "FABIANO AYUPP MAGALH&#195;ES", domain: "fabianoleiloeiro.net", baseUrl: "https://www.fabianoleiloeiro.net", genericScrape: true, enabled: true },
  { id: "britesleiloeiro_com_br", name: "ANTONIO CLAUDIO BRITES", domain: "britesleiloeiro.com.br", baseUrl: "https://www.britesleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "leiloeiraerikamaciel_com_br", name: "ERIKA MACIEL RAMOS", domain: "leiloeiraerikamaciel.com.br", baseUrl: "https://www.leiloeiraerikamaciel.com.br", genericScrape: true, enabled: true },
  { id: "marciopinho_com_br", name: "MARCIO PINHO PEREIRA", domain: "marciopinho.com.br", baseUrl: "https://www.marciopinho.com.br", genericScrape: true, enabled: true },
  { id: "albertolopesleiloeiro_com_br", name: "ALBERTO CRISTIANO RAMOS LOPES DA SILVA", domain: "albertolopesleiloeiro.com.br", baseUrl: "https://www.albertolopesleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "thaisqueirozleiloeira_com_br", name: "THAIS DIAS BRAND&#195;O DE QUEIROZ", domain: "thaisqueirozleiloeira.com.br", baseUrl: "https://www.thaisqueirozleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "mauromarcello_lel_br", name: "MAURO MARCELLO DA COSTA MACHADO", domain: "mauromarcello.lel.br", baseUrl: "https://www.mauromarcello.lel.br", genericScrape: true, enabled: true },
  { id: "tavaresleiloes_com_br", name: "JEAN FILLIPE MATTOS TAVARES", domain: "tavaresleiloes.com.br", baseUrl: "https://www.tavaresleiloes.com.br", genericScrape: true, enabled: true },
  { id: "andreadiniz_com_br", name: "LUCIA ANDREA DINIZ HADDAD", domain: "andreadiniz.com.br", baseUrl: "https://www.andreadiniz.com.br", genericScrape: true, enabled: true },
  { id: "mauriciomarizleiloes_com_br", name: "MAURICIO MARIZ MILCZEWSKI", domain: "mauriciomarizleiloes.com.br", baseUrl: "https://www.mauriciomarizleiloes.com.br", genericScrape: true, enabled: true },
  { id: "tassianamenezes_com_br", name: "TASSIANA MENEZES DE MELLO", domain: "tassianamenezes.com.br", baseUrl: "https://www.tassianamenezes.com.br", genericScrape: true, enabled: true },
  { id: "mauriciokronemberg_com_br", name: "MAURICIO KRONEMBERG HARTMANN", domain: "mauriciokronemberg.com.br", baseUrl: "https://www.mauriciokronemberg.com.br", genericScrape: true, enabled: true },
  { id: "mklance_com_br", name: "MAURICIO KRONEMBERG HARTMANN", domain: "mklance.com.br", baseUrl: "https://www.mklance.com.br", genericScrape: true, enabled: true },
  { id: "fredericoleiloes_com_br", name: "FREDERICO ALBERT KRAUSEGG NEVES", domain: "fredericoleiloes.com.br", baseUrl: "https://www.fredericoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "duplaleiloes_com_br", name: "BERNARDO CUNHA DE AGUIAR", domain: "duplaleiloes.com.br", baseUrl: "https://www.duplaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "valdirteixeiraleiloeiro_com_br", name: "VALDIR ALEXANDRE GOMES TEIXEIRA", domain: "valdirteixeiraleiloeiro.com.br", baseUrl: "https://www.valdirteixeiraleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "leiloesja_com_br", name: "JULIANA  SEVIDANES DE ARAUJO", domain: "leiloesja.com.br", baseUrl: "https://www.leiloesja.com.br", genericScrape: true, enabled: true },
  { id: "leje_com_br", name: "DENYS PYERRE DE OLIVEIRA", domain: "leje.com.br", baseUrl: "https://www.leje.com.br", genericScrape: true, enabled: true },
  { id: "mirandacarvalholeiloes_com_br", name: "IGOR BARROS DE MIRANDA CARVALHO", domain: "mirandacarvalholeiloes.com.br", baseUrl: "https://www.mirandacarvalholeiloes.com.br", genericScrape: true, enabled: true },
  { id: "pedrocastroleiloes_com_br", name: "PEDRO HENRIQUE COSTA CASTRO", domain: "pedrocastroleiloes.com.br", baseUrl: "https://www.pedrocastroleiloes.com.br", genericScrape: true, enabled: true },
  { id: "marthapadilhaleiloeira_lel_br", name: "MARTHA ISOLDA TENÓRIO PADILHA", domain: "marthapadilhaleiloeira.lel.br", baseUrl: "https://www.marthapadilhaleiloeira.lel.br", genericScrape: true, enabled: true },
  { id: "joaofrancoleiloeiro_com_br", name: "JO&#195;O MACIEL FERNANDES DE FRANCO", domain: "joaofrancoleiloeiro.com.br", baseUrl: "https://www.joaofrancoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "joaodefrancoleiloeiro_com_br", name: "JO&#195;O MACIEL FERNANDES DE FRANCO", domain: "joaodefrancoleiloeiro.com.br", baseUrl: "https://www.joaodefrancoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "palaciodosleiloes_com_br", name: "RAFAELA MELO FERREIRA MARZANO", domain: "palaciodosleiloes.com.br", baseUrl: "https://www.palaciodosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "palaciosleiloes_com_br", name: "IZABELLA MELO FERREIRA PRAES", domain: "palaciosleiloes.com.br", baseUrl: "https://www.palaciosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "davimattosleiloeiro_com_br", name: "DAVI DA SILVA MATTOS", domain: "davimattosleiloeiro.com.br", baseUrl: "https://www.davimattosleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "lucasleiloeiro_com_br", name: "LUCAS RAFAEL ANTUNES MOREIRA", domain: "lucasleiloeiro.com.br", baseUrl: "https://www.lucasleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "lucas_leilao_br", name: "LUCAS RAFAEL ANTUNES MOREIRA", domain: "lucas.leilao.br", baseUrl: "https://www.lucas.leilao.br", genericScrape: true, enabled: true },
  { id: "meloleiloeiro_com_br", name: "RAFAEL CUNHA MELO", domain: "meloleiloeiro.com.br", baseUrl: "https://www.meloleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "veratostesleiloes_com_br", name: "VERA LUCIA BOTTREL TOSTES", domain: "veratostesleiloes.com.br", baseUrl: "https://www.veratostesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "bourgerthteixeiraleiloeiros_com_br", name: "EDUARDO RENZULLO BORGERTH TEIXEIRA", domain: "bourgerthteixeiraleiloeiros.com.br", baseUrl: "https://www.bourgerthteixeiraleiloeiros.com.br", genericScrape: true, enabled: true },
  { id: "hoppeleiloes_com_br", name: "ALEX WILLIAN HOPPE", domain: "hoppeleiloes.com.br", baseUrl: "https://www.hoppeleiloes.com.br", genericScrape: true, enabled: true },
  { id: "evanioalvesleiloeiro_com_br", name: "EVANIO ALVES PEREIRA", domain: "evanioalvesleiloeiro.com.br", baseUrl: "https://www.evanioalvesleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "fernandafreireleiloes_com_br", name: "FERNANDA JOSE DA SILVA FREIRE", domain: "fernandafreireleiloes.com.br", baseUrl: "https://www.fernandafreireleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alftaleiloes_com", name: "DAVI BORGES  DE AQUINO", domain: "alftaleiloes.com", baseUrl: "https://www.alftaleiloes.com", genericScrape: true, enabled: true },
  { id: "alfaleiloes_com", name: "DAVI BORGES  DE AQUINO", domain: "alfaleiloes.com", baseUrl: "https://www.alfaleiloes.com", genericScrape: true, enabled: true },
  { id: "giordanoleiloes_com_br", name: "GIORDANO BRUNO COAN AMADOR", domain: "giordanoleiloes.com.br", baseUrl: "https://www.giordanoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "monizdearagao_com_br", name: "JOSE CLAUDIUS AUGUSTUS MONIZ DE ARAGAO AFFONSO FERREIRA", domain: "monizdearagao.com.br", baseUrl: "https://www.monizdearagao.com.br", genericScrape: true, enabled: true },
  { id: "monizdearagao_leilao_br", name: "JOSE CLAUDIUS AUGUSTUS MONIZ DE ARAGAO AFFONSO FERREIRA", domain: "monizdearagao.leilao.br", baseUrl: "https://www.monizdearagao.leilao.br", genericScrape: true, enabled: true },
  { id: "serranaleiloes_com_br", name: "RUAM CARLOS CHAVES GOTARDO", domain: "serranaleiloes.com.br", baseUrl: "https://www.serranaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "geilsonalmeidaleiloes_com_br", name: "GEILSON ALMEIDA DE ANDRADE", domain: "geilsonalmeidaleiloes.com.br", baseUrl: "https://www.geilsonalmeidaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "geilsonalmeidaleiloes_com", name: "GEILSON ALMEIDA DE ANDRADE", domain: "geilsonalmeidaleiloes.com", baseUrl: "https://www.geilsonalmeidaleiloes.com", genericScrape: true, enabled: true },
  { id: "gustavomorettoleiloeiro_com_br", name: "GUSTAVO MORETTO GUIMARAES DE OLIVEIRA", domain: "gustavomorettoleiloeiro.com.br", baseUrl: "https://www.gustavomorettoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "adrianayuangmail_com", name: "ADRIANA YUAN DA COSTA", domain: "adrianayuangmail.com", baseUrl: "https://www.adrianayuangmail.com", genericScrape: true, enabled: true },
  { id: "adrianayuanleiloeira_com_br", name: "ADRIANA YUAN DA COSTA", domain: "adrianayuanleiloeira.com.br", baseUrl: "https://www.adrianayuanleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "bastosleiloes_com_br", name: "BRENO RIBEIRO PENNA BASTOS", domain: "bastosleiloes.com.br", baseUrl: "https://www.bastosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "tamiriscarvalholeiloeira_com_br", name: "TAMIRIS FEITAL DA SILVA CARVALHO", domain: "tamiriscarvalholeiloeira.com.br", baseUrl: "https://www.tamiriscarvalholeiloeira.com.br", genericScrape: true, enabled: true },
  { id: "kronbergleiloes_com_br", name: "HELCIO KRONBERG", domain: "kronbergleiloes.com.br", baseUrl: "https://www.kronbergleiloes.com.br", genericScrape: true, enabled: true },
  { id: "kronleiloes_com_br", name: "HELCIO KRONBERG", domain: "kronleiloes.com.br", baseUrl: "https://www.kronleiloes.com.br", genericScrape: true, enabled: true },
  { id: "positivoleiloes_com_br", name: "ERICK SOARES TELES", domain: "positivoleiloes.com.br", baseUrl: "https://www.positivoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "sbleiloeiro302_com_br", name: "SEVERINO BARBOSA", domain: "sbleiloeiro302.com.br", baseUrl: "https://www.sbleiloeiro302.com.br", genericScrape: true, enabled: true },
  { id: "dgleiloes_com_br", name: "DANIEL ELIAS GARCIA", domain: "dgleiloes.com.br", baseUrl: "https://www.dgleiloes.com.br", genericScrape: true, enabled: true },
  { id: "danielleiloes_com_br", name: "DANIEL ELIAS GARCIA", domain: "danielleiloes.com.br", baseUrl: "https://www.danielleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lanceja_com_br", name: "CRISTIANE BORGUETTI MORAES LOPES", domain: "lanceja.com.br", baseUrl: "https://www.lanceja.com.br", genericScrape: true, enabled: true },
  { id: "leilaobrasil_com_br", name: "IRANI FLORES", domain: "leilaobrasil.com.br", baseUrl: "https://www.leilaobrasil.com.br", genericScrape: true, enabled: true },
  { id: "vicoleiloes_com_br", name: "VICTOR ALBERTO SEVERINO FRAZ&#195;O", domain: "vicoleiloes.com.br", baseUrl: "https://www.vicoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "vincoleiloes_com_br", name: "VICTOR ALBERTO SEVERINO FRAZ&#195;O", domain: "vincoleiloes.com.br", baseUrl: "https://www.vincoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "caloferrarileiloes_com_br", name: "CARLO FERRARI", domain: "caloferrarileiloes.com.br", baseUrl: "https://www.caloferrarileiloes.com.br", genericScrape: true, enabled: true },
  { id: "carloferrarileiloes_com_br", name: "CARLO FERRARI", domain: "carloferrarileiloes.com.br", baseUrl: "https://www.carloferrarileiloes.com.br", genericScrape: true, enabled: true },
  { id: "acostaleiloes_com_br", name: "ALEXANDER COSTA DOS SANTOS", domain: "acostaleiloes.com.br", baseUrl: "https://www.acostaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "hdleiloes_com_br", name: "HIDIRLENE DUSZEIKO", domain: "hdleiloes.com.br", baseUrl: "https://www.hdleiloes.com.br", genericScrape: true, enabled: true },
  { id: "jjleiloeiro_com_br", name: "JOSE ANTONIO DE SOUZA AMADOR JUNIOR", domain: "jjleiloeiro.com.br", baseUrl: "https://www.jjleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "destakleiloes_com_br", name: "MARCUS VINICIUS YOSHIMI UEBARA", domain: "destakleiloes.com.br", baseUrl: "https://www.destakleiloes.com.br", genericScrape: true, enabled: true },
  { id: "vipleiloes_com_br", name: "ADILBERTO BORGES DA SILVA", domain: "vipleiloes.com.br", baseUrl: "https://www.vipleiloes.com.br", genericScrape: true, enabled: true },
  { id: "focoleiloes_com_br", name: "ANNA KAROLINE SANTOS DO AMARAL", domain: "focoleiloes.com.br", baseUrl: "https://www.focoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiteleiloes_com_br", name: "MARTHA DE SOUZA LEITE", domain: "leiteleiloes.com.br", baseUrl: "https://www.leiteleiloes.com.br", genericScrape: true, enabled: true },
  { id: "mnadvogados_com_br", name: "JOS&#201; ROBERTO NEVES AMORIM", domain: "mnadvogados.com.br", baseUrl: "https://www.mnadvogados.com.br", genericScrape: true, enabled: true },
  { id: "brunofrancescoleiloeiro_com_br", name: "BRUNO ARAUJO FRANCESCO", domain: "brunofrancescoleiloeiro.com.br", baseUrl: "https://www.brunofrancescoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "brunofrancescoleiloeiro_com", name: "BRUNO ARAUJO FRANCESCO", domain: "brunofrancescoleiloeiro.com", baseUrl: "https://www.brunofrancescoleiloeiro.com", genericScrape: true, enabled: true },
  { id: "brunameloleiloeira_com_br", name: "BRUNA DE MELO DOS SANTOS", domain: "brunameloleiloeira.com.br", baseUrl: "https://www.brunameloleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "deonizialeiloes_com_br", name: "DEON&#205;ZIA KIRATCH", domain: "deonizialeiloes.com.br", baseUrl: "https://www.deonizialeiloes.com.br", genericScrape: true, enabled: true },
  { id: "burleleiloes_com", name: "PEDRO BURLE GOMES", domain: "burleleiloes.com", baseUrl: "https://www.burleleiloes.com", genericScrape: true, enabled: true },
  { id: "willianmachadoleiloeiro_com_br", name: "WILLIAN RAMOS MACHADO DE OLIVEIRA", domain: "willianmachadoleiloeiro.com.br", baseUrl: "https://www.willianmachadoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "willianmachado_leilao_br", name: "WILLIAN RAMOS MACHADO DE OLIVEIRA", domain: "willianmachado.leilao.br", baseUrl: "https://www.willianmachado.leilao.br", genericScrape: true, enabled: true },
  { id: "silvaleiloes_com_br", name: "RENAN SOUZA SILVA", domain: "silvaleiloes.com.br", baseUrl: "https://www.silvaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "rigolonleiloes_com_br", name: "RODRIGO APARECIDO RIGOLON DA SILVA", domain: "rigolonleiloes.com.br", baseUrl: "https://www.rigolonleiloes.com.br", genericScrape: true, enabled: true },
  { id: "mozartleiloeiro_com_br", name: "MOZART MELO", domain: "mozartleiloeiro.com.br", baseUrl: "https://www.mozartleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "apaleiloes_com_br", name: "Adriana Pires Amancio", domain: "apaleiloes.com.br", baseUrl: "https://www.apaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "adrianoleiloeiro_com_br", name: "Adriana Pires Amancio", domain: "adrianoleiloeiro.com.br", baseUrl: "https://www.adrianoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "alessandroteixeiraleiloes_com_br", name: "Aécio Reis Pedrosa", domain: "alessandroteixeiraleiloes.com.br", baseUrl: "https://www.alessandroteixeiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ecoleiloes_com_br", name: "Alexandra Benedita de Sousa Casado", domain: "ecoleiloes.com.br", baseUrl: "https://www.ecoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "paivafrade_com_br", name: "Alexandre Paiva Frade", domain: "paivafrade.com.br", baseUrl: "https://www.paivafrade.com.br", genericScrape: true, enabled: true },
  { id: "anandaleiloes_com_br", name: "Ananda Portes Souza", domain: "anandaleiloes.com.br", baseUrl: "https://www.anandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "agilleiloes_com_br", name: "André Fonseca Dias", domain: "agilleiloes.com.br", baseUrl: "https://www.agilleiloes.com.br", genericScrape: true, enabled: true },
  { id: "yankous_com_br", name: "Andre Luiz Oliveira Yankous", domain: "yankous.com.br", baseUrl: "https://www.yankous.com.br", genericScrape: true, enabled: true },
  { id: "angelabecharaleiloes_com_br", name: "Ângela Assis Oliveira Bechara", domain: "angelabecharaleiloes.com.br", baseUrl: "https://www.angelabecharaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "contatosaraivaleiloes_com_br", name: "Angela Saraiva Portes Souza", domain: "contatosaraivaleiloes.com.br", baseUrl: "https://www.contatosaraivaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "arnaldoleiloes_com_br", name: "Arnaldo Emílio Colombarolli", domain: "arnaldoleiloes.com.br", baseUrl: "https://www.arnaldoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "bmleiloes_com_br", name: "Breno Augusto Magalhães da Anunciação", domain: "bmleiloes.com.br", baseUrl: "https://www.bmleiloes.com.br", genericScrape: true, enabled: true },
  { id: "brfleiloes_com_br", name: "Breno César Oliveira Farias", domain: "brfleiloes.com.br", baseUrl: "https://www.brfleiloes.com.br", genericScrape: true, enabled: true },
  { id: "iarremate_com", name: "Bruno Lopes Pereira dos Reis", domain: "iarremate.com", baseUrl: "https://www.iarremate.com", genericScrape: true, enabled: true },
  { id: "tratoforteleiloes_com_br", name: "Bruno Lopes Pereira dos Reis", domain: "tratoforteleiloes.com.br", baseUrl: "https://www.tratoforteleiloes.com.br", genericScrape: true, enabled: true },
  { id: "farialeiloes_com_br", name: "Camila Pires de Oliveira Faria (Licenciada até 23/10/2027)", domain: "farialeiloes.com.br", baseUrl: "https://www.farialeiloes.com.br", genericScrape: true, enabled: true },
  { id: "purcenaleiloes_com_br", name: "Camila Pires de Oliveira Faria (Licenciada até 23/10/2027)", domain: "purcenaleiloes.com.br", baseUrl: "https://www.purcenaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "davisonmoreira_com_br", name: "Davison Mauro Moreira", domain: "davisonmoreira.com.br", baseUrl: "https://www.davisonmoreira.com.br", genericScrape: true, enabled: true },
  { id: "leiloeirodenis_com_br", name: "Dênis de Oliveira Fernandes", domain: "leiloeirodenis.com.br", baseUrl: "https://www.leiloeirodenis.com.br", genericScrape: true, enabled: true },
  { id: "dilsonleiloeiro_com", name: "Dílson Marcos Moreira", domain: "dilsonleiloeiro.com", baseUrl: "https://www.dilsonleiloeiro.com", genericScrape: true, enabled: true },
  { id: "emidiomedeirosleiloesgmail_com", name: "Emidio José Correia de Medeiros", domain: "emidiomedeirosleiloesgmail.com", baseUrl: "https://www.emidiomedeirosleiloesgmail.com", genericScrape: true, enabled: true },
  { id: "contatoemidiomedeirosleiloes_com_br", name: "Emidio José Correia de Medeiros", domain: "contatoemidiomedeirosleiloes.com.br", baseUrl: "https://www.contatoemidiomedeirosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "emidiomedeirosleiloes_com_br", name: "Emidio José Correia de Medeiros", domain: "emidiomedeirosleiloes.com.br", baseUrl: "https://www.emidiomedeirosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alvesleiloes_com_br", name: "Érica Cristina Alves", domain: "alvesleiloes.com.br", baseUrl: "https://www.alvesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "fabioguimaraesleiloes_com_br", name: "Fábio Guimarães de Carvalho", domain: "fabioguimaraesleiloes.com.br", baseUrl: "https://www.fabioguimaraesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "nortedeminasleiloes_com_br", name: "Fábio Maciel Amarante", domain: "nortedeminasleiloes.com.br", baseUrl: "https://www.nortedeminasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "francoleiloes_com_br", name: "Fernanda de Mello Franco", domain: "francoleiloes.com.br", baseUrl: "https://www.francoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "messiasleiloes_com_br", name: "Flávia Figueira Messias", domain: "messiasleiloes.com.br", baseUrl: "https://www.messiasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloesceruli_com_br", name: "Flávio Duarte Ceruli", domain: "leiloesceruli.com.br", baseUrl: "https://www.leiloesceruli.com.br", genericScrape: true, enabled: true },
  { id: "franciscodavidleiloeiro_com_br", name: "Francisco David Batista de Souza", domain: "franciscodavidleiloeiro.com.br", baseUrl: "https://www.franciscodavidleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "marianoleiloes_com_br", name: "Gilson Aparecido Mariano", domain: "marianoleiloes.com.br", baseUrl: "https://www.marianoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloestefanelli_com_br", name: "Giselle Fernanda Stefanelli Campos Souza", domain: "leiloestefanelli.com.br", baseUrl: "https://www.leiloestefanelli.com.br", genericScrape: true, enabled: true },
  { id: "stefanellileiloes_com_br", name: "Giselle Fernanda Stefanelli Campos Souza", domain: "stefanellileiloes.com.br", baseUrl: "https://www.stefanellileiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloesbrasilcassiano_com_br", name: "Glener Brasil Cassiano", domain: "leiloesbrasilcassiano.com.br", baseUrl: "https://www.leiloesbrasilcassiano.com.br", genericScrape: true, enabled: true },
  { id: "milhaoleiloes_com_br", name: "Guilherme Caixeta Borges", domain: "milhaoleiloes.com.br", baseUrl: "https://www.milhaoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "pelesleiloes_com_br", name: "Guilherme Luiz Peles", domain: "pelesleiloes.com.br", baseUrl: "https://www.pelesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "pelesleiloeiro_com_br", name: "Guilherme Luiz Peles", domain: "pelesleiloeiro.com.br", baseUrl: "https://www.pelesleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "gpleiloes_com_br", name: "Gustavo Costa Aguiar Oliveira", domain: "gpleiloes.com.br", baseUrl: "https://www.gpleiloes.com.br", genericScrape: true, enabled: true },
  { id: "varginha_com_br", name: "Helen Pestile Pereira de Souza", domain: "varginha.com.br", baseUrl: "https://www.varginha.com.br", genericScrape: true, enabled: true },
  { id: "pestileleiloes_com_br", name: "Helen Pestile Pereira de Souza", domain: "pestileleiloes.com.br", baseUrl: "https://www.pestileleiloes.com.br", genericScrape: true, enabled: true },
  { id: "wermelingerleiloes_com_br", name: "Horany Wermelinger Costa do Nascimento", domain: "wermelingerleiloes.com.br", baseUrl: "https://www.wermelingerleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lilianportugal_com_br", name: "Humberto Amaro Batista Filho", domain: "lilianportugal.com.br", baseUrl: "https://www.lilianportugal.com.br", genericScrape: true, enabled: true },
  { id: "ourodoleilao_com_br", name: "Ivan Silveira Amorim", domain: "ourodoleilao.com.br", baseUrl: "https://www.ourodoleilao.com.br", genericScrape: true, enabled: true },
  { id: "versallesleiloes_com_br", name: "Janete Marques Roland", domain: "versallesleiloes.com.br", baseUrl: "https://www.versallesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "simoesleiloes_com_br", name: "João Simões de Almeida Júnior", domain: "simoesleiloes.com.br", baseUrl: "https://www.simoesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "jotafilho87gmail_com", name: "Jorge José João Filho", domain: "jotafilho87gmail.com", baseUrl: "https://www.jotafilho87gmail.com", genericScrape: true, enabled: true },
  { id: "tradicaoleiloes_com_br", name: "Jorge José João Filho", domain: "tradicaoleiloes.com.br", baseUrl: "https://www.tradicaoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "joserodovalholeiloes_com_br", name: "José Antônio Rodovalho Júnior", domain: "joserodovalholeiloes.com.br", baseUrl: "https://www.joserodovalholeiloes.com.br", genericScrape: true, enabled: true },
  { id: "arquimedesleiloes_com_br", name: "José Arquimedes Câmara", domain: "arquimedesleiloes.com.br", baseUrl: "https://www.arquimedesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "goldenlance_com_br", name: "Juliana Leles Gripp Amantea", domain: "goldenlance.com.br", baseUrl: "https://www.goldenlance.com.br", genericScrape: true, enabled: true },
  { id: "kanandaleiloes_com_br", name: "Kananda Sofia Silva Macedo", domain: "kanandaleiloes.com.br", baseUrl: "https://www.kanandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leonardoveigaleiloes_com_br", name: "Leonardo Veiga de Jesus Chaves", domain: "leonardoveigaleiloes.com.br", baseUrl: "https://www.leonardoveigaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lincolnleiloes_com_br", name: "Lincoln de Azevedo Fernandes", domain: "lincolnleiloes.com.br", baseUrl: "https://www.lincolnleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lorranaleiloes_com_br", name: "Lorrana Ramos Mendes Gotardo", domain: "lorranaleiloes.com.br", baseUrl: "https://www.lorranaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "du_ze_com", name: "Lucas de Oliveira Mangualde", domain: "du-ze.com", baseUrl: "https://www.du-ze.com", genericScrape: true, enabled: true },
  { id: "londinaleiloes_com_br", name: "Luciana Londina da Silva", domain: "londinaleiloes.com.br", baseUrl: "https://www.londinaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "luisleiloeiro_com_br", name: "Luis Otavio Marcolino Shinkawa", domain: "luisleiloeiro.com.br", baseUrl: "https://www.luisleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "luizlobatoleiloeiro_com_br", name: "Luiz Felipe Perpétuo Lobato", domain: "luizlobatoleiloeiro.com.br", baseUrl: "https://www.luizlobatoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "luizfernandoborgesrocha1gmail_com", name: "Luiz Fernando Borges Rocha", domain: "luizfernandoborgesrocha1gmail.com", baseUrl: "https://www.luizfernandoborgesrocha1gmail.com", genericScrape: true, enabled: true },
  { id: "luizcampolina_com_br", name: "Luiz Washington Campolina Santos", domain: "luizcampolina.com.br", baseUrl: "https://www.luizcampolina.com.br", genericScrape: true, enabled: true },
  { id: "luizacardosoleiloeira_com_br", name: "Luiza Lima e Silva Mesquita Cardoso", domain: "luizacardosoleiloeira.com.br", baseUrl: "https://www.luizacardosoleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "marcoantonioleiloeiro_com_br", name: "Marco Antônio Barbosa de Oliveira Junior", domain: "marcoantonioleiloeiro.com.br", baseUrl: "https://www.marcoantonioleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "mpbmoraisgmail_com", name: "Marcos Paulo Branco de Morais", domain: "mpbmoraisgmail.com", baseUrl: "https://www.mpbmoraisgmail.com", genericScrape: true, enabled: true },
  { id: "saladeleiloes_com_br", name: "Marcos Paulo Branco de Morais", domain: "saladeleiloes.com.br", baseUrl: "https://www.saladeleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloarialoucoporleiloes_com_br", name: "Matheus Werneck de Oliveira Santos", domain: "leiloarialoucoporleiloes.com.br", baseUrl: "https://www.leiloarialoucoporleiloes.com.br", genericScrape: true, enabled: true },
  { id: "mozarmirandaleiloes_com_br", name: "Mozar Miranda Almeida", domain: "mozarmirandaleiloes.com.br", baseUrl: "https://www.mozarmirandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "guilhermeliohotmail_com", name: "Nilson Guilherme Silva Lio", domain: "guilhermeliohotmail.com", baseUrl: "https://www.guilhermeliohotmail.com", genericScrape: true, enabled: true },
  { id: "patricialeiloeira_com_br", name: "Patricia Graciele de Andrade Sousa", domain: "patricialeiloeira.com.br", baseUrl: "https://www.patricialeiloeira.com.br", genericScrape: true, enabled: true },
  { id: "agostinholeiloes_com_br", name: "Paulo César Agostinho", domain: "agostinholeiloes.com.br", baseUrl: "https://www.agostinholeiloes.com.br", genericScrape: true, enabled: true },
  { id: "pauloramosleiloeiro_com_br", name: "Paulo José da Costa Ramos", domain: "pauloramosleiloeiro.com.br", baseUrl: "https://www.pauloramosleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "jinkingsleiloes_com_br", name: "Pedro Miranda Jinkings", domain: "jinkingsleiloes.com.br", baseUrl: "https://www.jinkingsleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ferreiraleiloes_com_br", name: "Priscilla Lopes Ribeiro Ferreira", domain: "ferreiraleiloes.com.br", baseUrl: "https://www.ferreiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "priscillaferreiraleiloes_com_br", name: "Priscilla Lopes Ribeiro Ferreira", domain: "priscillaferreiraleiloes.com.br", baseUrl: "https://www.priscillaferreiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "rafaelleiloeiro_com_br", name: "Rafael Araújo Gomes", domain: "rafaelleiloeiro.com.br", baseUrl: "https://www.rafaelleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rvleiloes_com_br", name: "Renata Fátima Veloso", domain: "rvleiloes.com.br", baseUrl: "https://www.rvleiloes.com.br", genericScrape: true, enabled: true },
  { id: "rezendeguimaraes_com_br", name: "Renato Rezende Guimarães", domain: "rezendeguimaraes.com.br", baseUrl: "https://www.rezendeguimaraes.com.br", genericScrape: true, enabled: true },
  { id: "rodrigoleiloeiro_com_br", name: "Rodrigo Collyer Santos de Oliveira", domain: "rodrigoleiloeiro.com.br", baseUrl: "https://www.rodrigoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "leiloesuberlandia_com_br", name: "Rodrigo de Oliveira Lopes", domain: "leiloesuberlandia.com.br", baseUrl: "https://www.leiloesuberlandia.com.br", genericScrape: true, enabled: true },
  { id: "rofremleiloes_com_br", name: "Ronald de Freitas Moreira", domain: "rofremleiloes.com.br", baseUrl: "https://www.rofremleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ileiloes_com_br", name: "Rosimeire das Dores Garcia de Castro", domain: "ileiloes.com.br", baseUrl: "https://www.ileiloes.com.br", genericScrape: true, enabled: true },
  { id: "sandrasantosleiloes_com_br", name: "Sandra de Fátima Santos", domain: "sandrasantosleiloes.com.br", baseUrl: "https://www.sandrasantosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "saulojulioleiloeiro_com_br", name: "Saulo Júlio Ribeiro", domain: "saulojulioleiloeiro.com.br", baseUrl: "https://www.saulojulioleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "bhleiloaria_com_br", name: "Sérgio Sousa Rodrigues", domain: "bhleiloaria.com.br", baseUrl: "https://www.bhleiloaria.com.br", genericScrape: true, enabled: true },
  { id: "sonia_amarallhotmail_com", name: "Sonia Maria do Amaral", domain: "sonia.amarallhotmail.com", baseUrl: "https://www.sonia.amarallhotmail.com", genericScrape: true, enabled: true },
  { id: "ssleiloes_com", name: "Suellen Soares Ribeiro", domain: "ssleiloes.com", baseUrl: "https://www.ssleiloes.com", genericScrape: true, enabled: true },
  { id: "globoleiloes_com_br", name: "Vanderlia de Assis Carvalho Freitas", domain: "globoleiloes.com.br", baseUrl: "https://www.globoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "viniciusbiihrer_leiloesoutlook_com", name: "Vinicius Biihrer", domain: "viniciusbiihrer.leiloesoutlook.com", baseUrl: "https://www.viniciusbiihrer.leiloesoutlook.com", genericScrape: true, enabled: true },
  { id: "vitorcalableiloeiro_com_br", name: "Vítor Calab Nunes", domain: "vitorcalableiloeiro.com.br", baseUrl: "https://www.vitorcalableiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "bolsadeleiloes_com_br", name: "Viviane Garzon Corrêa", domain: "bolsadeleiloes.com.br", baseUrl: "https://www.bolsadeleiloes.com.br", genericScrape: true, enabled: true },
  { id: "wsleiloes_com_br", name: "Wanderson Belmiro dos Reis", domain: "wsleiloes.com.br", baseUrl: "https://www.wsleiloes.com.br", genericScrape: true, enabled: true },
  { id: "validator_w3_org", name: "10 Atualização da Política de Privacidade", domain: "validator.w3.org", baseUrl: "https://www.validator.w3.org", genericScrape: true, enabled: true },
  { id: "jigsaw_w3_org", name: "10 Atualização da Política de Privacidade", domain: "jigsaw.w3.org", baseUrl: "https://www.jigsaw.w3.org", genericScrape: true, enabled: true },
  { id: "acesso_umic_pt", name: "10 Atualização da Política de Privacidade", domain: "acesso.umic.pt", baseUrl: "https://www.acesso.umic.pt", genericScrape: true, enabled: true },
  { id: "submitexpress_com", name: "10 Atualização da Política de Privacidade", domain: "submitexpress.com", baseUrl: "https://www.submitexpress.com", genericScrape: true, enabled: true },
  { id: "sebraemg_com_br", name: "Ordem de Tabulação (Tab)", domain: "sebraemg.com.br", baseUrl: "https://www.sebraemg.com.br", genericScrape: true, enabled: true },
  { id: "instagram_com", name: "Ordem de Tabulação (Tab)", domain: "instagram.com", baseUrl: "https://www.instagram.com", genericScrape: true, enabled: true },
  { id: "youtube_com", name: "Ordem de Tabulação (Tab)", domain: "youtube.com", baseUrl: "https://www.youtube.com", genericScrape: true, enabled: true },
  { id: "btcw_maxbot_com_br", name: "Ordem de Tabulação (Tab)", domain: "btcw.maxbot.com.br", baseUrl: "https://www.btcw.maxbot.com.br", genericScrape: true, enabled: true },
  { id: "wa_me", name: "Ordem de Tabulação (Tab)", domain: "wa.me", baseUrl: "https://www.wa.me", genericScrape: true, enabled: true }
];

export interface ScrapedAuctionDraft {
  portalId: string;
  auctioneerName: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  propertyType: PropertyType;
  sizeSqm: number;
  auctionPrice: number;
  estimatedValue?: number;
  auctionDate: string;
  firstAuctionDate?: string;
  secondAuctionDate?: string;
  firstAuctionPrice?: number;
  secondAuctionPrice?: number;
  auctionLink: string;
  saleMode?: string;
  imageUrl?: string;
  description?: string;
  origin: 'extrajudicial' | 'judicial';
  occupied?: boolean;
  sellerBank?: string;
  matriculaText?: string;
  matriculaUrl?: string;
  allowsFinancing?: boolean;
  allowsInstallments?: boolean;
  paymentTerms?: string;
  maxInstallments?: number;
  minDownpaymentPercent?: number;
  pendingIptuCost?: number;
  pendingCondoCost?: number;
  addressVerified?: boolean;
  sizeVerified?: boolean;
  sizeApproximate?: boolean;
  areaAudit?: AreaAudit;
  priceVerified?: boolean;
  sourceVerified?: boolean;
  sourceClosed?: boolean;
  originVerified?: boolean;
  // True only when the portal itself applied the requested IBGE municipality
  // filter. It permits a detail page that spells the city without the UF.
  locationScopeVerified?: boolean;
}

function normalizeStr(str: string | undefined | null): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseType(text: string): PropertyType {
  const norm = normalizeStr(text);
  if (norm.includes('apartamento') || norm.includes('apto') || norm.includes('studio') || norm.includes('cobertura') || norm.includes('flat')) {
    return 'Apartamento';
  }
  if (norm.includes('casa') || norm.includes('sobrado') || norm.includes('vila')) {
    return 'Casa';
  }
  if (norm.includes('terreno') || norm.includes('lote') || norm.includes('gleba')) {
    return 'Terreno';
  }
  if (norm.includes('comercial') || norm.includes('sala') || norm.includes('loja') || norm.includes('galp') || norm.includes('predio') || norm.includes('prédio')) {
    return 'Comercial';
  }
  return 'Apartamento';
}

function isPropertyLotEvidence(text: string): boolean {
  const normalized = normalizeStr(text);
  // Furniture and cars mentioned inside a house inspection are not separate lots.
  const headline = normalized.split('\n')[0];
  if (/\b(imovel|imoveis|imobiliario|apartamento|apto|casa|terreno|gleba|fazenda|sitio|chacara|sala|loja|galpao|predio|cobertura)\b/.test(headline) && !/\b(veiculo|caminhao|automovel|motocicleta|trator|sucata|ferramenta)\b/.test(headline)) return true;
  const movableOnly = /\b(veiculo|caminhao|caminhonete|automovel|motocicleta|carro|onibus|trator|maquina|embarcacao|sucata|ferramenta|ferramentas|torno|armario|inversor|pecas\s+automotivas|notebook|computador|eletrodomestico)\b/.test(normalized);
  const property = /\b(imovel|apartamento|apto|casa|terreno|lote\s+(?:de\s+)?terreno|loteamento|gleba|fazenda|sitio|chacara|sala|loja|galpao|predio|cobertura|duplex)\b/.test(normalized);
  return property && !movableOnly;
}

function detectBankOrJudicial(text: string): { origin: 'extrajudicial' | 'judicial'; bank?: string } {
  const norm = normalizeStr(text);
  if (/(?:^|\n)\s*judicial\s*(?:\n|$)|\bprocesso\s*(?:n[ºo°.]*)?\s*:?\s*\d{7}-\d{2}/i.test(norm)) return { origin: 'judicial' };
  if (/\bextrajudicial\b|aliena[cç][aã]o fiduci[aá]ria/.test(norm)) return { origin: 'extrajudicial' };
  if (norm.includes('santander')) return { origin: 'extrajudicial', bank: 'Santander' };
  if (norm.includes('itau') || norm.includes('itaú')) return { origin: 'extrajudicial', bank: 'Itaú' };
  if (norm.includes('bradesco')) return { origin: 'extrajudicial', bank: 'Bradesco' };
  if (norm.includes('caixa')) return { origin: 'extrajudicial', bank: 'Caixa' };
  if (/\bbanco inter\b/.test(norm)) return { origin: 'extrajudicial', bank: 'Banco Inter' };
  if (/\bbanco pan\b/.test(norm)) return { origin: 'extrajudicial', bank: 'Banco Pan' };
  if (norm.includes('safra')) return { origin: 'extrajudicial', bank: 'Safra' };
  if (norm.includes('banco do brasil')) return { origin: 'extrajudicial', bank: 'Banco do Brasil' };
  if (/\b(?:comitente|vendedor|credor)\s*:?\s*banco\b/.test(norm)) {
    return { origin: 'extrajudicial', bank: 'Instituição Financeira' };
  }

  if (norm.includes('vara') || norm.includes('judicial') || norm.includes('falencia') || norm.includes('falência') || norm.includes('execucao') || norm.includes('execução') || norm.includes('civel') || norm.includes('cível') || norm.includes('trabalho') || norm.includes('trt') || norm.includes('tj')) {
    return { origin: 'judicial' };
  }

  return { origin: 'judicial' };
}

export function unsquishText(str: string): string {
  if (!str) return '';
  return str
    .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2')
    .replace(/([a-zA-ZÀ-ÿ0-9]),([a-zA-ZÀ-ÿ])/g, '$1, $2')
    .replace(/(\d{1,5})([A-ZÀ-Ý][a-zà-ÿ]+)/g, '$1 $2')
    .replace(/([a-zà-ÿ]+)(\d{1,5}\b)/g, '$1 $2');
}

export function formatCleanAddress(addr: string): string {
  if (!addr) return '';
  let cleaned = unsquishText(addr)
    .replace(/\s+/g, ' ')
    .replace(/\b([A-ZÀ-Ý][a-zà-ÿ]+)\s+(Rio\s+de\s+Janeiro|Niterói|São\s+Gonçalo|Duque\s+de\s+Caxias|Nova\s+Iguaçu|Juiz\s+de\s+Fora|Belo\s+Horizonte|São\s+Paulo)\b/gi, '$1, $2')
    .trim();
  return cleaned;
}

export function extractAddress(text: string, fallback: string): string {
  const cleanInput = unsquishText(text || '');
  const lines = cleanInput.split(/\r?\n|\s{2,}/).map(line => line.trim()).filter(Boolean);
  const labeledLine = lines.find(line =>
    /\bendere[cç]o\b/i.test(line) &&
    !/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b/i.test(line) &&
    /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(line)
  );
  if (labeledLine) {
    const labeledAddress = labeledLine
      .replace(/^.*?\bendere[cç]o(?:\s+cf\.?\s+auto\s+de\s+penhora)?\s*:?\s*/i, '')
      .split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0]
      .replace(/\s+/g, ' ')
      .trim();
    if (labeledAddress.length >= 8) return formatCleanAddress(labeledAddress.slice(0, 180));
  }
  const addressCandidates = lines
    .map((line, index) => {
      if (!/\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,}/i.test(line)) return null;
      const context = `${lines[index - 1] || ''} ${line}`;
      let score = 0;
      if (/im[oó]vel|\bbem\b|auto\s+de\s+avalia[cç][aã]o|auto\s+de\s+penhora|situad[oa]|localizad[oa]|objeto\s+do\s+leil[aã]o|matr[ií]cula/i.test(context)) score += 8;
      if (/n[ºo°]?\s*\d+|,\s*\d+/.test(line)) score += 3;
      if (/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b|sala\s+40[234]/i.test(context)) score -= 10;
      return { line, score, index };
    })
    .filter((candidate): candidate is { line: string; score: number; index: number } => !!candidate)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const addressLine = addressCandidates[0]?.line;
  if (addressLine) {
    const extracted = addressLine.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,180}/i)?.[0] || addressLine;
    const cleanExtracted = extracted
      .split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0]
      .replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, '')
      .trim();
    return formatCleanAddress(cleanExtracted);
  }
  const normalized = cleanInput.replace(/\s+/g, ' ').trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? formatCleanAddress(addressMatch[0].replace(/\s{2,}/g, ' ').trim()) : formatCleanAddress(fallback);
}

function extractDeclaredCity(text: string, state: string): string {
  return sourceAuctionLocation(text, state)?.city || '';
}

function hasRequestedLocationEvidence(text: string, state: string, city: string): boolean {
  if (!text || !state || !city) return false;
  const normalized = normalizeStr(text);
  const normalizedCity = normalizeStr(city);
  const stateNames: Record<string, string> = {
    MG: 'minas gerais', RJ: 'rio de janeiro', SP: 'sao paulo'
  };
  const fullStateName = stateNames[state];
  return normalized.includes(normalizedCity) && (
    new RegExp(`\\b${state.toLowerCase()}\\b`).test(normalized) ||
    Boolean(fullStateName && normalized.includes(fullStateName))
  );
}

function hasCityEvidence(text: string, city: string): boolean {
  const normalizedText = normalizeStr(text).replace(/\s+/g, ' ');
  const normalizedCity = normalizeStr(city).replace(/\s+/g, ' ');
  return Boolean(normalizedCity) && new RegExp(`(^|[^a-z])${normalizedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z])`).test(normalizedText);
}

export function extractAuctionDates(text: string): { first?: string; second?: string } {
  // Dates in registration documents, publication notices or unrelated lots are not auction dates.
  const matches = [...text.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/g)];
  const dates = matches.filter(match => {
    const context = text.slice(Math.max(0, match.index! - 100), match.index!);
    return /(?:leil[aã]o|pra[cç]a|encerramento|data\s*:|p\.\s*[uú]nica)[^\d]{0,80}$/i.test(context);
  }).map(match => `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`)
    .filter(date => { const parsed = new Date(date); return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date; });
  const unique = [...new Set(dates)].sort();
  return { first: unique[0], second: unique[1] };
}

function extractAuctionDate(text: string): string {
  return extractAuctionDates(text).first || '';
}

function normalizeDateStr(dStr: string): string | undefined {
  const m = dStr.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (!m) return undefined;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  const date = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const parsed = new Date(date);
  return (!isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) ? date : undefined;
}

export interface AuctionPriceAnalysis {
  firstAuctionPrice?: number;
  firstAuctionDate?: string;
  secondAuctionPrice?: number;
  secondAuctionDate?: string;
  activePrice: number;
  activeDate?: string;
  appraisal?: number;
  priceVerified: boolean;
}

export function extractAuctionRoundsAndPrices(text: string, todayParam?: string): AuctionPriceAnalysis {
  if (!text) return { activePrice: 0, priceVerified: false };
  const today = todayParam || new Date().toISOString().slice(0, 10);

  // 1. Look for 1º leilão / praça price and date
  let firstAuctionPrice: number | undefined;
  let firstAuctionDate: string | undefined;

  const m1Date = text.match(/(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,100}?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (m1Date) firstAuctionDate = normalizeDateStr(m1Date[1]);

  const m1Price = text.match(/(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,120}?R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)[\s\S]{0,80}?(?:1[ºªo°]|primeir[oa])\s*(?:leil[aã]o|pra[cç]a)/i);
  if (m1Price) {
    const p1 = parseBrazilianMoney(m1Price[1]);
    if (p1 > 1000) firstAuctionPrice = p1;
  }

  // 2. Look for 2º leilão / praça price and date
  let secondAuctionPrice: number | undefined;
  let secondAuctionDate: string | undefined;

  const m2Date = text.match(/(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,100}?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (m2Date) secondAuctionDate = normalizeDateStr(m2Date[1]);

  const m2Price = text.match(/(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)[\s\S]{0,120}?R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/ser[aá]\s+realizado\s+o\s+2[ºªo°]\s+leil[aã]o[\s\S]{0,120}?pelo\s+valor\s+de\s*R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)[\s\S]{0,80}?(?:2[ºªo°]|segund[oa])\s*(?:leil[aã]o|pra[cç]a)/i);
  if (m2Price) {
    const p2 = parseBrazilianMoney(m2Price[1]);
    if (p2 > 1000) secondAuctionPrice = p2;
  }

  // Look for general auction dates if not yet found
  const generalDates = extractAuctionDates(text);
  if (!firstAuctionDate && generalDates.first) firstAuctionDate = generalDates.first;
  if (!secondAuctionDate && generalDates.second) secondAuctionDate = generalDates.second;

  // 3. Look for explicit generic lance inicial / lance mínimo / valor mínimo
  const mGeneric = text.match(/(?:lance\s*(?:inicial|m[ií]nimo)|valor\s*m[ií]nimo(?:\s*para\s*proposta)?|valor\s*inicial|maior\s*lance\s*atual|lance\s*atual)\s*:?\s*(?:<[^>]+>)*\s*R\$\s*([\d.]+(?:,\d{2})?)/i)
    || text.match(/R\$\s*([\d.]+(?:,\d{2})?)\s*(?:<[^>]+>)*\s*(?:lance\s*(?:inicial|m[ií]nimo)|valor\s*m[ií]nimo)/i)
    || text.match(/(?:Em\s+leil[aã]o\s+pelo\s+valor\s+de|venda\s+direta)\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  let genericPrice = 0;
  if (mGeneric) {
    const pGen = parseBrazilianMoney(mGeneric[1]);
    if (pGen > 1000) genericPrice = pGen;
  }

  // 4. Determine Active Price
  let activePrice = 0;
  let activeDate = '';

  if (firstAuctionPrice && firstAuctionPrice > 0) {
    if (firstAuctionDate && firstAuctionDate >= today) {
      // 1st auction is in the future or today: it is the ACTIVE auction!
      activePrice = firstAuctionPrice;
      activeDate = firstAuctionDate;
    } else if (firstAuctionDate && firstAuctionDate < today && secondAuctionPrice && secondAuctionPrice > 0) {
      // 1st auction already happened: now 2nd auction is active!
      activePrice = secondAuctionPrice;
      activeDate = secondAuctionDate || firstAuctionDate;
    } else {
      activePrice = firstAuctionPrice;
      activeDate = firstAuctionDate || secondAuctionDate || '';
    }
  } else if (secondAuctionPrice && secondAuctionPrice > 0) {
    activePrice = secondAuctionPrice;
    activeDate = secondAuctionDate || '';
  } else if (genericPrice > 0) {
    activePrice = genericPrice;
    activeDate = firstAuctionDate || '';
  }

  // 5. Appraisal
  const appraisal = extractAppraisal(text);

  return {
    firstAuctionPrice,
    firstAuctionDate,
    secondAuctionPrice,
    secondAuctionDate,
    activePrice,
    activeDate,
    appraisal,
    priceVerified: activePrice > 0
  };
}

export function extractMinimumBid(text: string): number {
  if (!text) return 0;
  return extractAuctionRoundsAndPrices(text).activePrice;
}

export function extractAppraisal(text: string): number | undefined {
  if (!text) return undefined;

  // 1. Portella / standard R$ ... Avaliação
  const m1 = text.match(/R\$\s*([\d.]+(?:,\d{2})?)\s*(?:[\n\r\s]*)(?:valor\s+(?:de\s+)?)?avalia[cç][aã]o/i);
  if (m1) {
    const val = parseBrazilianMoney(m1[1]);
    if (val >= 10000 && val <= 150000000) return val;
  }

  // 2. Standard valor de avaliação with explicit R$
  const m4 = text.match(/(?:valor\s+(?:de\s+)?|laudo\s+de\s+)avalia[cç][aã]o\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (m4) {
    const val = parseBrazilianMoney(m4[1]);
    if (val >= 10000 && val <= 150000000) return val;
  }

  // 3. Valor avaliado with explicit R$
  const mValAv = text.match(/valor\s+avaliado\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (mValAv) {
    const val = parseBrazilianMoney(mValAv[1]);
    if (val >= 10000 && val <= 150000000) return val;
  }

  // 4. Avaliação: R$ ...
  const m2 = text.match(/avalia[cç][aã]o\s*(?:judicial|do\s+im[oó]vel|original\s*caixa)?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (m2) {
    const val = parseBrazilianMoney(m2[1]);
    if (val >= 10000 && val <= 150000000) return val;
  }

  // 5. Laudo com atribuo valor
  const m3 = text.match(/laudo\s+de\s+avalia[cç][aã]o[^\d]{0,100}?(?:valor\s+(?:de\s+)?R\$\s*|atribuo[^\d]{0,80}?valor\s+de\s*R\$\s*)([\d.]+(?:,\d{2})?)/i);
  if (m3) {
    const val = parseBrazilianMoney(m3[1]);
    if (val >= 10000 && val <= 150000000) return val;
  }

  return undefined;
}

function extractSaleMode(text: string): string {
  const normalized = normalizeStr(text);
  if (normalized.includes('aceita proposta') || normalized.includes('recebe proposta')) return 'Aceita Propostas';
  if (normalized.includes('venda direta')) return 'Venda Direta';
  if (normalized.includes('licitacao aberta') || normalized.includes('licitação aberta')) return 'Licitação Aberta';
  if (normalized.includes('leilao sfi') || normalized.includes('leilão sfi')) return 'Leilão SFI';
  return 'Leilão Online';
}

function parseBrazilianMoney(value: string): number {
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function extractFinancialTerms(text: string) {
  const normalized = normalizeStr(text).replace(/\s+/g, ' ');
  const deniesFinancing = /(?:nao\s+(?:aceita|admite|permite)|sem)\s+financiamento|pagamento\s+exclusivamente\s+a\s+vista/.test(normalized);
  const allowsFinancing = !deniesFinancing && /(?:aceita|admite|permite|possibilidade\s+de|podera\s+ser)\s+(?:o\s+)?financiamento|financiamento\s+(?:bancario|imobiliario|habitacional)/.test(normalized);
  const allowsInstallments = /(?:parcelamento|parcelado|pagamento\s+em\s+ate\s+\d+\s+parcelas|\d+\s+parcelas)/.test(normalized)
    && !/(?:nao\s+(?:aceita|admite|permite)|sem)\s+parcelamento/.test(normalized);
  const installmentMatch = normalized.match(/(?:ate\s+)?(\d{1,3})\s+parcelas/);
  const entryMatch = normalized.match(/(?:entrada|sinal)[^%]{0,50}(\d{1,3}(?:[.,]\d+)?)\s*%/)
    || normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%[^.]{0,40}(?:entrada|sinal)/);
  const sellerClearsDebts = /(?:debitos?|dividas?|condominio|iptu)[^.]{0,160}(?:quitad[oa]s?|por\s+conta|responsabilidade)[^.]{0,80}(?:vendedor|credor|banco|alienante)|(?:vendedor|credor|banco|alienante)[^.]{0,100}(?:quitara|assumira|responsavel)[^.]{0,80}(?:debitos?|dividas?|condominio|iptu)/.test(normalized);
  const iptuMatch = text.match(/(?:IPTU|tributos?\s+municipais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  const condoMatch = text.match(/(?:condom[ií]nio|cotas?\s+condominiais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);

  let paymentTerms = 'Condição de pagamento não confirmada na fonte';
  if (allowsFinancing) paymentTerms = 'Financiamento permitido conforme fonte do lote';
  else if (allowsInstallments) paymentTerms = installmentMatch ? `Parcelamento em até ${installmentMatch[1]} parcelas` : 'Parcelamento permitido conforme fonte do lote';
  else if (deniesFinancing || /(?:somente|apenas|exclusivamente)\s+a\s+vista/.test(normalized)) paymentTerms = 'Somente à vista';

  return {
    allowsFinancing,
    allowsInstallments,
    paymentTerms,
    maxInstallments: allowsInstallments && installmentMatch ? Number(installmentMatch[1]) : undefined,
    minDownpaymentPercent: entryMatch ? Number(entryMatch[1].replace(',', '.')) : undefined,
    pendingIptuCost: sellerClearsDebts ? 0 : (iptuMatch ? parseBrazilianMoney(iptuMatch[1]) : undefined),
    pendingCondoCost: sellerClearsDebts ? 0 : (condoMatch ? parseBrazilianMoney(condoMatch[1]) : undefined)
  };
}

export function canonicalAuctionLink(link: string): string {
  try {
    const url = new URL(link);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(?:fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.href;
  } catch { return link; }
}

function isConfiguredAuctionLink(link: string): boolean {
  try {
    const host = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
    if (AUCTIONEER_PORTALS.some(portal => host === portal.domain || host.endsWith(`.${portal.domain}`))) return true;

    return false;
  } catch {
    return false;
  }
}

function hasAuditableAddress(address: string | undefined): boolean {
  return /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(address || '') && /\d/.test(address || '');
}

async function extractOfficialDocumentText(page: any, documentUrl: string): Promise<string> {
  try {
    if (Date.now() < documentOcrPausedUntil) return '';
    if (!/^https?:\/\//i.test(documentUrl)) return '';
    let base64 = await page.evaluate(async (url: string) => {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) return '';
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024) return '';
      if (String.fromCharCode(...bytes.subarray(0, 4)) !== '%PDF') return '';
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }, documentUrl).catch(() => '');
    if (!base64) {
      const response = await fetch(documentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          Referer: page.url()
        },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return '';
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 15 * 1024 * 1024 || buffer.subarray(0, 4).toString('ascii') !== '%PDF') return '';
      base64 = buffer.toString('base64');
    }
    if (!base64) return '';

    const text = await readRegistryPdf(new Uint8Array(Buffer.from(base64, 'base64')));
    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    return text.length >= 50 && letters / text.length >= 0.35 ? text : '';
  } catch (error: any) {
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(String(error?.message || ''))) {
      documentOcrPausedUntil = Date.now() + 60 * 60 * 1000;
      console.warn('[Auctioneer Docs] OCR pausado por 1 hora após limite do provedor; a varredura dos portais continuará sem novas chamadas de OCR.');
      return '';
    }
    console.warn(`[Auctioneer Docs] Documento não pôde ser lido (${documentUrl}): ${error.message}`);
    return '';
  }
}

async function createAuctionPage(browser: any) {
  const page = await browser.newPage();
  // tsx preserves function names with this helper inside serialized callbacks.
  // Define it in each new document so dev and the production bundle extract identically.
  if (page.evaluateOnNewDocument) await page.evaluateOnNewDocument('globalThis.__name = (fn) => fn;');
  return page;
}

export async function enrichLotDetails(browser: any, draft: ScrapedAuctionDraft): Promise<ScrapedAuctionDraft> {
  let detailPage: any = null;
  try {
    detailPage = await createAuctionPage(browser);
    await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    const detailResponse = await detailPage.goto(draft.auctionLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (detailResponse && detailResponse.status() >= 400) throw new Error(`HTTP ${detailResponse.status()}`);
    await detailPage.waitForNetworkIdle({ idleTime: 500, timeout: 6000 }).catch(() => undefined);
    const detailData = await detailPage.evaluate(() => {
      const links = new Set<string>();
      document.querySelectorAll('a, iframe, embed').forEach(element => {
        const href = element.getAttribute('href') || element.getAttribute('src') || '';
        const onclick = element.getAttribute('onclick') || '';
        const candidates = [href, ...(onclick.match(/https?:\/\/[^'"\s)]+|[^'"\s)]+\.pdf(?:\?[^'"\s)]*)?/gi) || [])];
        for (const candidate of candidates) {
          if (!candidate || !/(?:matr[ií]cula|certid[aã]o|\.pdf(?:\?|$))/i.test(candidate)) continue;
          try {
            const resolved = new URL(candidate, location.href);
            if (/^https?:$/i.test(resolved.protocol)) links.add(resolved.href);
          } catch { /* URL inválida */ }
        }
      });
      const normalizeValue = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
      const addresses: string[] = [];
      const sizes: number[] = [];
      const visitJson = (value: any) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(visitJson);
        if (typeof value !== 'object') return;
        const address = value.address;
        if (typeof address === 'string') addresses.push(normalizeValue(address));
        else if (address && typeof address === 'object') {
          const formatted = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode]
            .map(normalizeValue).filter(Boolean).join(', ');
          if (formatted) addresses.push(formatted);
        }
        const floorValue = value.floorSize?.value ?? value.area?.value ?? value.floorSize;
        const numericFloor = Number(String(floorValue ?? '').replace(',', '.'));
        if (Number.isFinite(numericFloor) && numericFloor > 0) sizes.push(numericFloor);
        Object.values(value).forEach(visitJson);
      };
      document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try { visitJson(JSON.parse(script.textContent || 'null')); } catch { /* JSON-LD inválido */ }
      });

      const addressSelectors = '[itemprop="streetAddress"], [itemprop="address"], [data-testid*="address" i], [class*="endereco" i], [class*="address" i]';
      document.querySelectorAll(addressSelectors).forEach(element => {
        const value = normalizeValue((element as HTMLElement).innerText || element.getAttribute('content'));
        if (value) addresses.push(value);
      });
      document.querySelectorAll('a[href*="google.com/maps"], a[href*="maps.google"], iframe[src*="maps"]')
        .forEach(element => {
          const raw = element.getAttribute('href') || element.getAttribute('src') || '';
          try {
            const url = new URL(raw, location.href);
            const mapAddress = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('destination');
            if (mapAddress && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(mapAddress)) addresses.push(normalizeValue(mapAddress));
          } catch { /* mapa sem URL válida */ }
        });
      document.querySelectorAll('header, footer, nav, aside, [class*="related"], [class*="recommend"]').forEach(el => el.remove());
      return { text: (document.querySelector('main') as HTMLElement)?.innerText || document.body?.innerText || '', title: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(el => el.textContent?.trim() || '').find(text => /im[oó]vel|apartamento|casa|terreno|galp[aã]o|sala comercial|loja|cobertura/i.test(text)) || document.querySelector('h1')?.textContent || '', image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '', documentLinks: Array.from(links), structuredAddresses: addresses, structuredSizes: sizes };
    });

    let officialDocumentText = '';
    let matriculaText = draft.matriculaText || '';
    let matriculaUrl = draft.matriculaUrl;
    if (detailData.documentLinks.length > 0) {
      const orderedLinks = detailData.documentLinks.sort((a: string, b: string) => {
        const priority = (url: string) => /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url) ? 0 : 1;
        return priority(a) - priority(b);
      });
      const needsDocumentAddress = !hasAuditableAddress(extractAddress(detailData.text, ''));
      const usefulLinks = orderedLinks.filter((url: string) =>
        needsDocumentAddress || /matr[ií]cula|certid[aã]o|\brgi\b|edital|anexo|documento|\.pdf/i.test(url)
      );
      for (const documentUrl of usefulLinks.slice(0, 4)) {
        const extracted = await extractOfficialDocumentText(detailPage, documentUrl);
        if (extracted) {
          officialDocumentText += `\n${extracted}`;
          const isMatricula = /matr[ií]cula|certid[aã]o|\brgi\b/i.test(documentUrl) ||
            /\b(?:matr[ií]cula\s+n[ºo°.]*|\bcart[oó]rio\s+do\s+\d+.*im[oó]veis|\bof[ií]cio\s+de\s+registro\s+de\s+im[oó]veis|\blivro\s+(?:n[ºo°.]*\s*)?2\b|\brgi\b)/i.test(extracted);
          if (isMatricula && !matriculaText) {
            matriculaText = extracted;
            matriculaUrl = documentUrl;
          }
        }
      }
    }

    const officialFinancials = officialLotFinancials(await detailPage.content(), detailPage.url());
    return parseOfficialLotDetail(draft, { ...detailData, officialFinancials }, detailPage.url(), matriculaText, matriculaUrl);
  } catch (err: any) {
    recordSourceAudit({source:draft.portalId,url:draft.auctionLink,complete:false,error:`Falha no detalhe: ${err.message}`});
    console.warn(`[Auctioneer Sync] Não foi possível abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => undefined);
  }
}

export function parseOfficialArea(value: string): number {
  const raw=value.trim();
  return Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):/^\d{1,3}(?:\.\d{3})+$/.test(raw)?raw.replace(/\./g,''):raw);
}

export function parseOfficialLotDetail(draft: ScrapedAuctionDraft, detailData: any, detailUrl: string, matriculaText = '', matriculaUrl?: string): ScrapedAuctionDraft {
    // Collective notices and recommended lots are not the property description.
    const lotText = detailData.text.split(/(?:EDITAL DE LEILÃO CONDICIONAL|Outros lotes|Lotes relacionados|Você também pode|Veja também)/i)[0];
    const combinedText = lotText;
    const financialTerms = extractFinancialTerms(combinedText);
    const sellerSection = combinedText.match(/comitente\s*:?\s*([^\n]+(?:\n[^\n]+)?)/i)?.[1] || '';
    const classification = detectBankOrJudicial(combinedText);
    const dates = extractAuctionDates(combinedText);
    const headlineArea = detailData.title.match(/(\d+(?:[.,]\d+)*)\s*m[²2]/i);
    const headlineSize = headlineArea ? parseOfficialArea(headlineArea[1]) : 0;
    const landArea = parseType(detailData.title || draft.title) === 'Terreno' ? combinedText.match(/[aá]rea\s+(?:(?:total|do\s+terreno)\s*)?(?:de\s*)?[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]/i) : null;
    const landSize = landArea ? parseOfficialArea(landArea[1]) : 0;
    const sizeMatch = combinedText.match(/[aá]rea\s+(?:privativa(?:\s*\/\s*edificada)?|edificada|[uú]til|constru[ií]da)(?:\s*\([^)]*\))?\s*(?:de\s+)?[:=]?\s*(\d+(?:[.,]\d+)*)\s*m[²2]/i)
      || combinedText.match(/(\d+(?:[.,]\d+)*)\s*m[²2]\s*(?:de\s+)?[aá]rea\s+privativa/i)
      || combinedText.match(/(?:metragem(?:\s+constru[ií]da)?|[aá]rea\s+do\s+im[oó]vel|[aá]rea\s+total)\s*:?\s*(\d+(?:[.,]\d+)*)\s*m[²2]/i)
      || combinedText.match(/(?:com\s+)?[aá]rea\s+de\s*(\d+(?:[.,]\d+)*)\s*m[²2]/i);
    const textMatchedSize = sizeMatch ? parseOfficialArea(sizeMatch[1]) : 0;
    const structuredSize = detailData.structuredSizes.length === 1 ? detailData.structuredSizes[0] : 0;

    // Headline area in title (e.g. "TERRENO COM 6.086M²") is authoritative and prevents picking up random numbers in edital text
    const extractedSize = headlineSize || landSize || textMatchedSize || structuredSize;
    const areaAudit = auditOfficialArea({text:combinedText,title:detailData.title,propertyType:parseType(detailData.title || draft.title),url:detailUrl,structuredSizes:detailData.structuredSizes,extractedValue:extractedSize});
    const detailedSize = areaAudit.selected?.value || 0;
    const structuredAddress = detailData.structuredAddresses
      .map((value: string) => extractAddress(value, ''))
      .find((value: string) => hasAuditableAddress(value) && !/leiloeir|escrit[oó]rio|telefone|contato/i.test(value));
    const textAddress = extractAddress(combinedText, '') || extractAddress(matriculaText, '');
    const verifiedAddress = (hasAuditableAddress(textAddress) ? textAddress : '') || structuredAddress;
    const today = new Date().toISOString().slice(0, 10);
    const roundAnalysis = extractAuctionRoundsAndPrices(combinedText, today);
    const officialFin = detailData.officialFinancials;

    const firstAuctionPrice = officialFin?.firstAuctionPrice || roundAnalysis.firstAuctionPrice || draft.firstAuctionPrice;
    const secondAuctionPrice = officialFin?.secondAuctionPrice || roundAnalysis.secondAuctionPrice || draft.secondAuctionPrice;
    const firstAuctionDate = officialFin?.firstAuctionDate || roundAnalysis.firstAuctionDate || dates.first || draft.firstAuctionDate;
    const secondAuctionDate = officialFin?.secondAuctionDate || roundAnalysis.secondAuctionDate || dates.second || draft.secondAuctionDate;

    // Determine active bid: if 1st auction is open/future, it is the active price on site
    let finalBid = officialFin?.auctionPrice || roundAnalysis.activePrice || draft.auctionPrice || 0;
    if (firstAuctionDate && firstAuctionDate >= today && firstAuctionPrice && firstAuctionPrice > 0) {
      finalBid = firstAuctionPrice;
    } else if (firstAuctionDate && firstAuctionDate < today && secondAuctionPrice && secondAuctionPrice > 0) {
      finalBid = secondAuctionPrice;
    }

    const extractedAppraisal = roundAnalysis.appraisal || extractAppraisal(combinedText) || draft.estimatedValue;
    const finalAppraisal = officialFin?.estimatedValue || extractedAppraisal;
    const enrichedDescription = combinedText.trim().slice(0, 30000);
    const detectedLocation = sourceAuctionLocation(detailData.title)
      || sourceAuctionLocation(verifiedAddress || '')
      || sourceAuctionLocation(lotText)
      || ((draft.locationScopeVerified && hasCityEvidence(combinedText, draft.city)) || hasRequestedLocationEvidence(combinedText, draft.state, draft.city)
        ? { city: draft.city, state: draft.state }
        : null);

    return {
      ...draft,
      sourceClosed: /leiloes-realizados/.test(detailUrl) || /(?:leil[aã]o|lote)\s+(?:encerrado|cancelado|suspenso|arrematado)/i.test(lotText.slice(0, 1500)),
      originVerified: /(?:^|\n)\s*(?:leil[aã]o\s+)?(?:extrajudicial|judicial)\s*(?:\n|$)/i.test(lotText) || /\baliena[cç][aã]o\s+(?:judicial|fiduci[aá]ria)\b/i.test(lotText) || /\bprocesso\s*(?:n[ºo°.]*)?\s*:?\s*\d{7}-\d{2}/i.test(lotText) || Boolean(classification.bank),
      sourceVerified: true,
      // Never erase the requested location with empty fields. The source may
      // use "Juiz de Fora, Minas Gerais" instead of the compact JF/MG form.
      ...(detectedLocation || {city: '', state: ''}),
      title: detailData.title.trim() || draft.title,
      imageUrl: detailData.image || draft.imageUrl,
      propertyType: parseType(detailData.title || draft.title),
      origin: classification.origin,
      sellerBank: classification.bank,
      address: verifiedAddress || draft.address,
      addressVerified: Boolean(verifiedAddress),
      matriculaText,
      matriculaUrl,
      sizeSqm: detailedSize,
      areaAudit,
      sizeApproximate: areaAudit.status === 'approximate',
      sizeVerified: areaAudit.status === 'confirmed',
      auctionPrice: finalBid,
      priceVerified: finalBid > 0,
      estimatedValue: finalAppraisal,
      firstAuctionPrice,
      secondAuctionPrice,
      firstAuctionDate,
      secondAuctionDate,
      auctionDate: officialFin?.auctionDate || roundAnalysis.activeDate || [firstAuctionDate, secondAuctionDate].filter((date): date is string => Boolean(date) && date! >= today).sort()[0] || firstAuctionDate || dates.first || draft.auctionDate || '',
      ...detailData.officialFinancials,
      saleMode: extractSaleMode(combinedText || draft.description || ''),
      ...financialTerms,
      description: enrichedDescription || draft.description
    };
}

// Some official auctioneers publish a valid lot-detail URL without exposing a
// searchable catalogue. Keep those URLs in the first-party ingestion path so
// an active official lot is not lost merely because its index page changed.
const OFFICIAL_DETAIL_SEEDS: Array<Pick<ScrapedAuctionDraft,
  'portalId' | 'auctioneerName' | 'title' | 'city' | 'state' | 'auctionLink' | 'origin'
>> = [
  {
    portalId: 'pamela',
    auctioneerName: 'Pamela Leiloeira',
    title: 'Apartamento nº 301 do Edifício Residencial Vera Joppert',
    city: 'Juiz de Fora',
    state: 'MG',
    origin: 'judicial',
    auctionLink: 'https://www.pamelaleiloeira.com.br/eventos/leilao/tjmg-apartamento-n%C2%BA-301-do-edificio-residencial-vera-joppert-situado-na-rua-professor-clovis-jaguaribe-n%C2%BA-50-bairro-sao-vicente-juiz-de-fora-mg/lote/902/apartamento-n%C2%BA-301-do-edificio-residencial-vera-joppert-situado-na-rua-professor-clovis-jaguaribe-n%C2%BA-50-bairro-sao-vicente-juiz-de-fora-mg'
  }
];

export async function scrapeOfficialDetailSeeds(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string
): Promise<ScrapedAuctionDraft[]> {
  const seeds = OFFICIAL_DETAIL_SEEDS.filter(seed =>
    seed.origin === targetType && seed.state === state && normalizeStr(seed.city) === normalizeStr(city)
  );
  if (!seeds.length) return [];

  let browser: any = null;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const results: ScrapedAuctionDraft[] = [];
    for (const seed of seeds) {
      const detailed = await enrichLotDetails(browser, {
        ...seed,
        address: '',
        neighborhood: '',
        propertyType: parseType(seed.title),
        sizeSqm: 0,
        auctionPrice: 0,
        auctionDate: '',
        description: '',
        locationScopeVerified: true,
        sourceVerified: true,
        originVerified: false,
        addressVerified: false,
        sizeVerified: false,
        priceVerified: false
      });
      results.push(detailed);
    }
    return results;
  } catch (error) {
    recordSourceAudit({ source: 'Pamela Leiloeira', complete: false, error: String(error) });
    return [];
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

// Isaías exposes active lots on its official home page, but its listing tiles
// contain only the bid and municipality. This adapter deliberately opens every
// matching official lot before deciding its type or importing any field.
export async function scrapeIsaiasAuctioneer(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  let page: any = null;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto('https://www.isaiasleiloes.com.br/', { waitUntil: 'networkidle2', timeout: 30000 });
    const normalizedCity = normalizeStr(city);
    const rows = await page.evaluate((requestedCity: string) => Array.from(document.querySelectorAll('a[href*="/item/"]'))
      .map((anchor: any) => ({
        link: anchor.href,
        text: (anchor.innerText || '').replace(/\s+/g, ' ').trim(),
        image: anchor.querySelector('img')?.src || ''
      }))
      .filter((row: any) => /lance\s+(?:inicial|m[ií]nimo).*R\$\s*[\d.]+(?:,\d{2})?/i.test(row.text) && row.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(requestedCity)), normalizedCity);

    for (const row of rows) {
      const price = extractMinimumBid(row.text);
      const enriched = await enrichLotDetails(browser, {
        portalId: 'isaias', auctioneerName: 'Isaías Leilões', title: row.text || 'Lote em leilão', address: '', neighborhood: '', city, state,
        propertyType: 'Apartamento', sizeSqm: 0, auctionPrice: price, auctionDate: '', auctionLink: row.link, imageUrl: row.image,
        description: row.text, origin: targetType, locationScopeVerified: false
      });
      if (enriched.origin === targetType && /\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i.test(enriched.description || '')) results.push(enriched);
    }
  } catch (error: any) {
    recordSourceAudit({ source: 'Isaías Leilões', complete: false, error: error.message });
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
  return results;
}

// Santander publishes its complete inventory as structured data on the
// official outlet page. Reading that payload prevents the generic card parser
// from mixing a price, address or area from neighbouring cards.
export async function scrapeSantanderOfficial(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string
): Promise<ScrapedAuctionDraft[]> {
  if (targetType !== 'extrajudicial') return [];
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  let page: any = null;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    const catalogueUrl = new URL('https://www.santanderimoveis.com.br/');
    catalogueUrl.searchParams.set('cidade', city);
    catalogueUrl.searchParams.set('uf', state);
    catalogueUrl.searchParams.set('pag', '1');
    const listingResponse = await fetch(catalogueUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    if (!listingResponse.ok) throw new Error(`Catálogo Santander retornou HTTP ${listingResponse.status}`);
    const listingHtml = await listingResponse.text();
    const payload = listingHtml.match(/var\s+allImoveis\s*=\s*(\[[\s\S]*?\]);\s*var\s+allFiltros\s*=/i)?.[1];
    if (!payload) throw new Error('Inventário estruturado não encontrado na página oficial do Santander.');
    const sourceItems: any[] = JSON.parse(payload);
    const totalRecords = Number(listingHtml.match(/var\s+totalReg\s*=\s*["']?(\d+)/i)?.[1] || sourceItems.length);
    const pageSize = Math.max(sourceItems.length, 1);
    const totalPages = Math.min(Math.max(1, Math.ceil(totalRecords / pageSize)), 250);
    // `pag` is the official portal pagination. Continue until the declared
    // total is covered, while deduplicating source URLs below.
    for (let pageNumber = 2; pageNumber <= totalPages; pageNumber++) {
      const pageUrl = new URL(catalogueUrl);
      pageUrl.searchParams.set('pag', String(pageNumber));
      const response = await fetch(pageUrl, { headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none', 'Upgrade-Insecure-Requests': '1'
      }});
      if (!response.ok) throw new Error(`Página ${pageNumber} do Santander retornou HTTP ${response.status}`);
      const html = await response.text();
      const nextPayload = html.match(/var\s+allImoveis\s*=\s*(\[[\s\S]*?\]);\s*var\s+allFiltros\s*=/i)?.[1];
      if (!nextPayload) throw new Error(`Inventário ausente na página ${pageNumber} do Santander.`);
      const nextItems = JSON.parse(nextPayload);
      if (!Array.isArray(nextItems) || nextItems.length === 0) break;
      sourceItems.push(...nextItems);
    }
    const items = Array.isArray(sourceItems) ? sourceItems.map((item: any) => ({
        title: String(item.seoH1 || item.descTipoImovel || 'Imóvel Santander'),
        address: [item.logradrouro, item.numeroResidencia].filter(Boolean).join(', '),
        neighborhood: String(item.bairroDeclarado || ''),
        city: String(item.descCidade || ''),
        state: String(item.uf || '').toUpperCase(),
        type: String(item.descTipoImovel || item.usoPrimario || ''),
        size: Number(item.areaPrivativa || item.areaUtil || item.areaTotal || item.area || 0),
        price: Number(item.valorVenda || 0),
        appraisal: Number(item.valorAvaliado || 0),
        date: String(item.dataLeilao || ''),
        link: String(item.urlLink || ''),
        image: String(item.thumbnail || '')
      })) : [] as Array<{ title:string; address:string; neighborhood:string; city:string; state:string; type:string; size:number; price:number; appraisal:number; date:string; link:string; image:string }>;
    const cityNorm = normalizeStr(city);
    for (const item of items) {
      if (item.state !== state || normalizeStr(item.city) !== cityNorm || !item.link || item.price <= 0) continue;
      const enriched = await enrichLotDetails(browser, {
        portalId: 'santander', auctioneerName: 'Santander Imóveis', title: item.title,
        address: item.address, neighborhood: item.neighborhood, city: item.city, state: item.state,
        propertyType: parseType(item.type || item.title), sizeSqm: item.size, auctionPrice: Math.round(item.price),
        estimatedValue: item.appraisal || undefined, auctionDate: item.date.slice(0, 10), auctionLink: item.link,
        imageUrl: item.image, description: `${item.title}\n${item.address}\n${item.neighborhood}\n${item.city} - ${item.state}`,
        saleMode: 'Venda Direta', origin: 'extrajudicial', sellerBank: 'Santander', locationScopeVerified: true
      });
      if (enriched.origin === 'extrajudicial') results.push({
        ...enriched,
        // The detail can expose the condominium/enterprise land area. Keep it
        // out of the unit card unless the detail identified a private area.
        sizeSqm: enriched.sizeVerified ? enriched.sizeSqm : item.size,
        priceVerified: item.price > 0 || enriched.priceVerified
      });
    }
    recordSourceAudit({ source: 'Santander Imóveis', url: catalogueUrl.href, pages: totalPages, found: items.filter(item => item.state === state && normalizeStr(item.city) === cityNorm).length, complete: true });
  } catch (error: any) {
    recordSourceAudit({ source: 'Santander Imóveis', url: 'https://www.santanderimoveis.com.br/', complete: false, error: error.message });
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
  return results;
}

// 1. Scraper Mega Leilões
export async function collectListingPages<T extends { link: string }>(page: any, read: () => Promise<T[]>): Promise<T[]> {
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
        const children = links.filter(a => available(a) && (a.closest('.pagination, [class*="pagin"]') || /\/(?:leilao|eventos\/leilao)\/[^?#]+|\/(?:agenda|busca|leiloes)(?:\?|$)/i.test(a.href)) && !/realizados|encerrados|finalizados/.test(a.href)).map(a => a.href);
        return {next:next?.href || '',children};
      });
      pending.push(...navigation.children.filter((url:string) => !visited.has(url) && !pending.includes(url) && new URL(url).origin === new URL(page.url()).origin));
      let next = navigation.next && !visited.has(navigation.next) ? navigation.next : '';
      if (!next) {
        const clicked = await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => !el.closest('.disabled, [aria-disabled="true"]') && !(el as HTMLButtonElement).disabled && /^(carregar mais|mostrar mais|ver mais|load more|pr[oó]xim[ao]|seguinte|next)(?:\s+(?:im[oó]veis|lotes|an[uú]ncios|resultados))?$/i.test((el.textContent || el.getAttribute('aria-label') || '').trim()));
          if (!button) return false;
          (button as HTMLElement).click(); return true;
        });
        if (clicked) { await page.waitForNetworkIdle({idleTime:750,timeout:15000}).catch(() => undefined); continue; }
        next = pending.find(url => !visited.has(url)) || '';
      }
      if (!next) { report.navigationExhausted = true; break; }
      if (new URL(next).origin !== new URL(startUrl).origin) { report.error = 'Paginação mudou de domínio.'; break; }
      const response = await page.goto(next, {waitUntil:'domcontentloaded',timeout:25000});
      if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()}`);
      await page.waitForNetworkIdle({idleTime:500,timeout:6000}).catch(() => undefined);
    }
  } catch (error:any) { report.error = error.message; }
  finally {
    report.found = lots.size;
    recordSourceAudit({source: new URL(startUrl).hostname, url: startUrl, pages: report.pages, found: lots.size, complete: report.navigationExhausted && lots.size > 0, error: report.error || (!lots.size ? 'Nenhum lote identificado; cobertura não confirmada.' : undefined)});
    fs.mkdirSync('sync-audits/pages', {recursive:true});
    const name = new URL(startUrl).hostname.replace(/[^a-z0-9.-]/gi,'_');
    fs.writeFileSync('sync-audits/pages/' + name + '-' + Date.now() + '.json',JSON.stringify(report,null,2));
  }
  return [...lots.values()];
}

// Homepages frequently contain only navigation. Resolve the portal's own
// property catalogue before reading cards; official lot details still decide
// whether a record can be imported.
async function openPropertyCatalogue(page: any, config: AuctioneerPortalConfig): Promise<void> {
  const configured = new URL(config.searchUrl || config.baseUrl);
  if (/(?:lotes?\/(?:imoveis?|search)|buscador|imoveis?|imovel|properties)/i.test(configured.pathname + configured.search)) return;
  const candidate = await page.evaluate(() => {
    const ignored = /(?:login|entrar|cadastro|contato|politica|termos|privacidade|institucional|quem-somos)/i;
    const links = (Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]).map(anchor => {
      const href = anchor.href;
      const label = `${anchor.innerText || ''} ${anchor.getAttribute('aria-label') || ''} ${href}`.replace(/\s+/g, ' ').trim();
      if (!href || new URL(href).origin !== location.origin || ignored.test(label)) return null;
      let score = 0;
      if (/\/lotes?\/imoveis?(?:[/?]|$)/i.test(href)) score += 12;
      if (/\/(?:imoveis?|properties)(?:[/?]|$)/i.test(href)) score += 10;
      if (/buscador|busca|pesquisa|catalogo|ofertas?/i.test(href)) score += 6;
      if (/\b(imoveis?|lotes?|bens)\b/i.test(label)) score += 5;
      if (/\bleil(?:ao|oes)\b/i.test(label)) score += 2;
      return score ? { href, score } : null;
    }).filter(Boolean) as Array<{ href: string; score: number }>;
    links.sort((a, b) => b.score - a.score || a.href.length - b.href.length);
    return links[0]?.href || '';
  });
  if (!candidate || candidate === page.url()) return;
  const response = await page.goto(candidate, { waitUntil: 'domcontentloaded', timeout: 18000 });
  if (response && response.status() >= 400) throw new Error(`Catálogo de imóveis retornou HTTP ${response.status()}`);
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 6000 }).catch(() => undefined);
}

export async function scrapeMegaLeiloes(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const url = `https://www.megaleiloes.com.br/imoveis${ufSlug ? "/" + ufSlug : ""}${citySlug ? '/' + citySlug : ''}`;

    console.log(`[Mega Leilões Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await collectListingPages(page, () => page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card.open, .card'));
      return cards.map(c => {
        const link = (c.querySelector('a') as HTMLAnchorElement | null)?.href || '';
        const text = (c as HTMLElement).innerText || '';
        const img = c.querySelector('img')?.src || '';

        const cardPriceEl = c.querySelector('.card-price, .card-instance-value, [class*="price"], [class*="valor"]');
        const cardPriceText = (cardPriceEl as HTMLElement)?.innerText || '';
        const priceMatches = [...(cardPriceText + ' ' + text).matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/gi)];
        const validPrices = priceMatches.map(m => Math.round(Number(m[1].replace(/\./g, '').replace(',', '.')))).filter(p => p > 1000);
        const price = validPrices[0] || 0;

        const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
        const size = sizeMatch ? Math.round(parseOfficialArea(sizeMatch[1])) : 0;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial') || l.includes('Unid')) || lines[0] || 'Imóvel Mega Leilões';

        return { title, text, price, size, link, img };
      });
    })) as any[];

    for (const raw of rawLots) {
      if (!raw.link) continue;
      const propType = parseType(raw.title + ' ' + raw.text);
      const detection = detectBankOrJudicial(raw.text);


      // Extract neighborhood from " - Bairro - Cidade - UF"
      let neigh = '';
      const parts = raw.title.split('-').map(p => p.trim());
      if (parts.length >= 3) {
        neigh = parts[parts.length - 3] || parts[parts.length - 2];
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'megaleiloes',
        auctioneerName: 'Mega Leilões',
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || '',
        city,
        state,
        propertyType: propType,
        sizeSqm: raw.size > 0 ? raw.size : 0,
        auctionPrice: raw.price,
        estimatedValue: undefined,
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text.slice(0, 300),
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      const enriched = await enrichLotDetails(browser, draft);
      if (enriched.origin === targetType) results.push(enriched);
    }
  } catch (err: any) {
    recordSourceAudit({source:'Mega Leilões',complete:false,error:err.message});
    console.error('[Mega Leilões Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// 2. Scraper Frazão Leilões
export async function scrapeFrazao(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const url = `https://www.frazaoleiloes.com.br/sale/searchLot?estado=${state}&cidade=${encodeURIComponent(city)}&pesquisaSimples=false`;
    console.log(`[Frazão Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await collectListingPages(page, () => page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('/lote/'));
      const unique = [];
      const seen = new Set();
      for (const a of anchors) {
        if (!seen.has(a.href)) {
          seen.add(a.href);
          const card = a.closest('.card') || a.parentElement;
          const text = card ? (card as HTMLElement).innerText : (a as HTMLElement).innerText;
          const img = card ? card.querySelector('img')?.src : null;

          const priceMatches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/gi)];
          const validPrices = priceMatches.map(m => Math.round(Number(m[1].replace(/\./g, '').replace(',', '.')))).filter(p => p > 1000);
          const price = validPrices[0] || 0;

          const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
          const size = sizeMatch ? Math.round(parseOfficialArea(sizeMatch[1])) : 0;

          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const title = lines.find(l => l.includes('Apartamento') || l.includes('Casa') || l.includes('Terreno') || l.includes('Comercial')) || lines[0] || 'Imóvel Frazão';

          unique.push({ title, text, price, size, link: a.href, img });
        }
      }
      return unique;
    })) as any[];

    for (const raw of rawLots) {
      if (!raw.link) continue;
      const propType = parseType(raw.title + ' ' + raw.text);
      const detection = detectBankOrJudicial(raw.text);


      let neigh = '';
      const mNeigh = raw.title.match(/(?:em|no|na)\s+([A-Za-zÀ-ÿ\s]+),\s*(?:Rio de Janeiro|RJ)/i);
      if (mNeigh) {
        neigh = mNeigh[1].trim();
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'frazao',
        auctioneerName: 'Frazão Leilões',
        title: raw.title,
        address: extractAddress(raw.text, raw.title),
        neighborhood: neigh || '',
        city,
        state,
        propertyType: propType,
        sizeSqm: raw.size > 0 ? raw.size : 0,
        auctionPrice: raw.price,
        estimatedValue: undefined,
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text.slice(0, 300),
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      const enriched = await enrichLotDetails(browser, draft);
      if (enriched.origin === targetType) results.push(enriched);
    }
  } catch (err: any) {
    recordSourceAudit({source:'Frazão',complete:false,error:err.message});
    console.error('[Frazão Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// 3. Scraper Biasi Leilões
export async function scrapeBiasi(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const url = state ? `https://www.biasileiloes.com.br/imoveis/${ufSlug}/${citySlug || 'todas-as-cidades'}/todos-os-bairros/todos-os-segmentos?pagina=1` : 'https://www.biasileiloes.com.br/imoveis';

    console.log(`[Biasi Scraper] Acessando ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));

    const rawLots = await collectListingPages(page, () => page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a.leilao-lote'));
      return cards.map(a => {
        const link = (a as HTMLAnchorElement).href || '';
        const text = (a as HTMLElement).innerText || '';

        const imgEl = a.querySelector('.card-img-cover');
        let img = '';
        if (imgEl && (imgEl as HTMLElement).style.backgroundImage) {
          const m = (imgEl as HTMLElement).style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (m) img = m[1];
        }
        if (!img) img = a.querySelector('img')?.src || '';

        const priceMatches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/gi)];
        const validPrices = priceMatches.map(m => Math.round(Number(m[1].replace(/\./g, '').replace(',', '.')))).filter(p => p > 1000);
        const price = validPrices[0] || 0;

        const descEl = a.querySelector('.text-descricao');
        const descText = descEl ? (descEl as HTMLElement).innerText : text;

        return { text: descText, price, link, img };
      });
    })) as any[];

    for (const raw of rawLots) {
      if (!raw.link) continue;
      const propType = parseType(raw.text);
      const detection = detectBankOrJudicial(raw.text);


      let neigh = '';
      const parts = raw.text.split('-').map(p => p.trim());
      if (parts.length >= 2) {
        neigh = parts[1];
      }

      const draft: ScrapedAuctionDraft = {
        portalId: 'biasi',
        auctioneerName: 'Biasi Leilões',
        title: raw.text.split('\n')[0] || 'Imóvel Biasi',
        address: extractAddress(raw.text, raw.text.split('\n')[0] || ''),
        neighborhood: neigh || '',
        city,
        state,
        propertyType: propType,
        sizeSqm: 0,
        auctionPrice: raw.price,
        estimatedValue: undefined,
        auctionDate: extractAuctionDate(raw.text),
        auctionLink: raw.link,
        imageUrl: raw.img,
        description: raw.text,
        saleMode: extractSaleMode(raw.text),
        origin: targetType,
        sellerBank: detection.bank
      };
      const enriched = await enrichLotDetails(browser, draft);
      if (enriched.origin === targetType) results.push(enriched);
    }
  } catch (err: any) {
    recordSourceAudit({source:'Biasi',complete:false,error:err.message});
    console.error('[Biasi Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close();
  }
  return results;
}

// 4. Scraper Portal Zuk (Zukerman)
export async function scrapePortalZuk(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await createAuctionPage(browser);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    const ufSlug = state.toLowerCase();
    const citySlug = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const url = `https://www.portalzuk.com.br/leilao-de-imoveis/c/todos-imoveis/${ufSlug}/regiao/${citySlug}`;

    console.log(`[Portal Zuk Scraper] Acessando ${url}...`);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => null);
    if (!resp || resp.status() >= 400) {
      console.warn(`[Portal Zuk Scraper] HTTP ${resp?.status() || 'falha'} para ${url}`);
      return results;
    }
    await new Promise(r => setTimeout(r, 3000));

    const lotLinks = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/imovel/"]')) as HTMLAnchorElement[];
      return Array.from(new Set(anchors.map(a => a.href))).filter(h => !h.includes('/leilao-de-imoveis/'));
    });

    console.log(`[Portal Zuk Scraper] ${city}/${state}: encontrados ${lotLinks.length} lotes.`);

    for (const link of lotLinks) {
      let lotPage: any = null;
      try {
        lotPage = await createAuctionPage(browser);
        await lotPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        const detailResp = await lotPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
        if (!detailResp || detailResp.status() >= 400) continue;
        await new Promise(r => setTimeout(r, 1200));

        const lotData = await lotPage.evaluate(() => {
          const dl = (window as any).dataLayer || [];
          const prod = dl.find((d: any) => d && (d.pageType === 'Product' || d.productId)) || {};
          const title = (document.querySelector('h1') as HTMLElement)?.innerText || document.title || '';
          const bodyText = document.body?.innerText || '';
          const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                      (document.querySelector('.slide-imovel img, .galeria img, img[src*="imagens.portalzuk"]') as HTMLImageElement)?.src || '';

          const editalAnchor = Array.from(document.querySelectorAll('a')).find(a => /edital/i.test(a.innerText || a.href));
          const editalUrl = editalAnchor ? editalAnchor.href : '';

          return {
            title,
            bodyText: bodyText.slice(0, 4000),
            prod,
            img,
            editalUrl
          };
        });

        const prod = lotData.prod || {};
        const bText = lotData.bodyText || '';
        const propType = parseType(prod.tipoImovel || lotData.title || bText);

        const todayStr = new Date().toISOString().slice(0, 10);
        const roundInfo = extractAuctionRoundsAndPrices(bText, todayStr);
        let price = roundInfo.activePrice;
        if (!price || price < 1000) {
          price = prod.price ? parseFloat(String(prod.price)) : 0;
        }
        if (!price || price < 1000) {
          price = roundInfo.firstAuctionPrice || roundInfo.secondAuctionPrice || 0;
        }

        let size = 0;
        const sizeMatch = bText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
        if (sizeMatch) {
          const parsedSize = parseFloat(sizeMatch[1].replace(',', '.'));
          if (!isNaN(parsedSize) && parsedSize > 5 && parsedSize < 100000) size = Math.round(parsedSize);
        }

        const bankOrJud = detectBankOrJudicial((prod.comitente || '') + ' ' + bText);
        const effectiveOrigin = /judici[aá]rio|vara|comarca|processo|fal[eê]ncia/i.test(prod.comitente || '') ? 'judicial' : (bankOrJud.origin || 'extrajudicial');
        if (effectiveOrigin !== targetType && targetType === 'judicial') {
          continue;
        }

        const neighborhood = prod.bairro || '';
        const address = extractAddress(bText, `${neighborhood}, ${city} - ${state}`);
        const rawTitle = prod.tipoImovel ? `${prod.tipoImovel} em Leilão - ${neighborhood || city}` : lotData.title;

        const draft: ScrapedAuctionDraft = {
          portalId: 'portalzuk',
          auctioneerName: 'Portal Zuk',
          title: rawTitle,
          address: address || `${neighborhood}, ${city} - ${state}`,
          neighborhood: neighborhood,
          city: prod.cidade || city,
          state: prod.uf || state,
          propertyType: propType,
          sizeSqm: size,
          auctionPrice: price,
          firstAuctionPrice: roundInfo.firstAuctionPrice,
          secondAuctionPrice: roundInfo.secondAuctionPrice,
          firstAuctionDate: roundInfo.firstAuctionDate,
          secondAuctionDate: roundInfo.secondAuctionDate,
          estimatedValue: roundInfo.appraisal || roundInfo.firstAuctionPrice,
          auctionDate: roundInfo.activeDate || extractAuctionDate(bText),
          auctionLink: link,
          imageUrl: lotData.img,
          description: bText.slice(0, 800).replace(/\s+/g, ' '),
          saleMode: 'Leilão Extrajudicial Online',
          origin: effectiveOrigin,
          sellerBank: prod.comitente ? prod.comitente.trim() : (bankOrJud.bank || 'Banco')
        };

        const enriched = await enrichLotDetails(browser, draft);
        if (enriched.origin === targetType || targetType === 'extrajudicial') {
          results.push(enriched);
        }
      } catch (err: any) {
        console.warn(`[Portal Zuk Scraper] Erro ao extrair lote ${link}:`, err.message);
      } finally {
        if (lotPage) await lotPage.close().catch(() => undefined);
      }
    }
  } catch (err: any) {
    recordSourceAudit({ source: 'Portal Zuk', complete: false, error: err.message });
    console.error('[Portal Zuk Scraper] Erro:', err.message);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
  return results;
}

// Coletor conservador para portais heterogêneos. Só admite cards que exponham
// link direto, preço e linguagem inequívoca de imóvel; o detalhe é aberto antes
// da importação para confirmar endereço, metragem, datas e natureza do leilão.
// This list is deliberately first-party and reviewed. The historical catalogue
// accidentally accumulated unrelated registry, social and validation domains;
// those must never enter an auction crawl or be reported as auctioneers.
const OFFICIAL_GENERIC_PORTAL_IDS = new Set([
  'alexandrecosta', 'ayupp', 'rioleiloes', 'emgea', 'bb', 'ricart', 'pamela',
  'gustavo', 'onildo', 'schulmann', 'saraiva', 'rymer', 'depaula', 'jv',
  'paulobotelho', 'alexandro', 'portella', 'silas', 'joaoemilio', 'facanha',
  'sold', 'pestana', 'mgl', 'leilaoimovel', 'leiloei', 'vitrinebradesco', 'comprei'
]);

export async function scrapeConfiguredAuctioneers(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;
  const cityCode = municipalityId(city, state);
  // Dedicated scrapers stay out to avoid duplicate hits. The generic queue is
  // restricted to the official portals supplied for this product, rather than
  // every historical domain ever present in the catalogue.
  const configs = AUCTIONEER_PORTALS.filter(portal => {
    if (!portal.enabled || ['megaleiloes', 'frazao', 'biasi', 'isaias', 'santander', 'portalzuk'].includes(portal.id)) return false;
    return portal.genericScrape === true && OFFICIAL_GENERIC_PORTAL_IDS.has(portal.id);
  });
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    let cursor = 0;
    const worker = async () => {
      while (cursor < configs.length) {
        const config = configs[cursor++];
        let page: any = null;
        try {
          page = await createAuctionPage(browser);
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
          await page.setRequestInterception(true);
          page.on('request', (request: any) => {
            const type = request.resourceType();
            if (type === 'media' || type === 'font') request.abort();
            else request.continue();
          });

          const searchUrl = new URL(config.searchUrl || config.baseUrl);
          const isLelPortal = config.domain.endsWith('.lel.br');
          if (isLelPortal && state && cityCode) {
            searchUrl.pathname = '/lotes/imovel';
            searchUrl.search = '';
            searchUrl.searchParams.set('tipo', 'imovel');
            searchUrl.searchParams.set('address_uf', state);
            searchUrl.searchParams.set('address_cidade_ibge', cityCode);
          } else if (searchUrl.searchParams.has('address_uf')) {
            if (state) searchUrl.searchParams.set('address_uf', state);
            else searchUrl.searchParams.delete('address_uf');
            if (cityCode) searchUrl.searchParams.set('address_cidade_ibge', cityCode);
            else searchUrl.searchParams.delete('address_cidade_ibge');
          }
          const portalFilteredByMunicipality = Boolean(cityCode) && searchUrl.searchParams.get('address_cidade_ibge') === cityCode;
          const url = searchUrl.href;
          console.log(`[Auctioneer Generic] Acessando ${config.name}: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 18000 });
          await new Promise(resolve => setTimeout(resolve, 1200));
          if (!isLelPortal) await openPropertyCatalogue(page, config);

          const rawLots = await collectListingPages(page, () => page.evaluate((requestedCity: string) => {
            const propertyWords = /\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i;
            const priceWords = /R\$\s*[\d.]+(?:,\d{2})?/i;
            const ignored = /(?:login|entrar|cadastro|contato|quem somos|pol[ií]tica|termos)/i;
            const seen = new Set<string>();
            const lots: Array<{ text: string; link: string; img: string; price: number; size: number }> = [];

            for (const anchor of Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]) {
              const link = anchor.href || '';
              if (!link || seen.has(link) || ignored.test(link) || new URL(link).origin !== location.origin || /\/(?:leilao|eventos\/leilao)\//.test(new URL(link).pathname) && !/\/(?:lote|item)\//.test(new URL(link).pathname)) continue;
              const container = anchor.closest('article, [class*="card"], [class*="lote"], [class*="lot"], [class*="item"], li') || anchor;
              const text = ((container as HTMLElement).innerText || anchor.innerText || '').replace(/\s+/g, ' ').trim();
              const path = new URL(link).pathname;
              const directLot = /\/(?:item|lote)\//i.test(path);
              // Some official portals (notably Isaías) show only the bid and
              // city on the listing card. Keep a priced direct lot for the
              // requested municipality and classify it only after reading the
              // official detail page below.
              const cityOnListing = new URL(location.href).searchParams.get('address_cidade_ibge')
                ? true
                : new RegExp(`(^|[^a-z])${requestedCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z])`, 'i').test(text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
              if (text.length < 20 || (!propertyWords.test(text) && !(directLot && priceWords.test(text) && cityOnListing))) continue;

              const bidMatches = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)];
              const fallbackPrice = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
              const sizeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
              const bidValues = bidMatches.map(match => Number(match[1].replace(/\./g, '').replace(',', '.'))).filter(value => Number.isFinite(value) && value > 0);
              const price = bidValues.length > 0 ? Math.round(Math.min(...bidValues)) : fallbackPrice ? Math.round(Number(fallbackPrice[1].replace(/\./g, '').replace(',', '.'))) : 0;
              const size = sizeMatch ? Math.round(parseOfficialArea(sizeMatch[1])) : 0;
              if (!/\/(?:item|lote|leilao|imoveis|imovel|eventos|anuncio|auction)/i.test(path)) continue;

              const image = container.querySelector('img') as HTMLImageElement | null;
              seen.add(link);
              lots.push({ text, link, img: image?.src || '', price, size });
            }
            return lots;
          }, city)) as any[];

          for (const raw of rawLots) {
            const listingLocation = sourceAuctionLocation(raw.text);
            if (listingLocation && ((state && listingLocation.state !== state) || (city && normalizeStr(listingLocation.city) !== normalizeStr(city)))) continue;
            const cityNorm = normalizeStr(city);
            const detection = detectBankOrJudicial(raw.text);
            const lines = raw.text.split(/\s{2,}|\n/).map(line => line.trim()).filter(Boolean);
            const title = lines.find(line => /im[oó]vel|apartamento|casa|terreno|sala|loja|galp[aã]o|pr[eé]dio|cobertura/i.test(line)) || raw.text.slice(0, 140);
            const dates = extractAuctionDates(raw.text);
            const neighborhoodMatch = raw.text.match(/(?:bairro|em|no|na)\s+([A-Za-zÀ-ÿ\s]{3,35})(?:\s*[-,/]\s*(?:RJ|MG|SP|Rio de Janeiro|Juiz de Fora|Belo Horizonte|Niter[oó]i)|\s+-)/i);

            const draft: ScrapedAuctionDraft = {
              portalId: config.id,
              auctioneerName: config.name,
              title,
              address: extractAddress(raw.text, ''),
              neighborhood: neighborhoodMatch?.[1]?.trim() || '',
              city,
              state,
              propertyType: parseType(raw.text),
              sizeSqm: raw.size,
              auctionPrice: raw.price,
              auctionDate: dates.first || '',
              firstAuctionDate: dates.first,
              secondAuctionDate: dates.second,
              auctionLink: raw.link,
              imageUrl: raw.img,
              description: raw.text.slice(0, 500),
              saleMode: extractSaleMode(raw.text),
              origin: targetType,
              sellerBank: detection.bank,
              locationScopeVerified: portalFilteredByMunicipality
            };

            const enriched = await enrichLotDetails(browser, draft);
            const combinedEvidence = `${enriched.description || ''}\n${raw.text}`;
            if (!isPropertyLotEvidence(`${enriched.title}\n${combinedEvidence}`)) continue;
            const finalDetection = {origin:enriched.origin, bank:enriched.sellerBank};
            if (finalDetection.origin !== targetType) continue;
            const declaredCity = enriched.city || ((enriched.locationScopeVerified && hasCityEvidence(combinedEvidence, city)) || hasRequestedLocationEvidence(combinedEvidence, state, city) ? city : '');
            // A city-specific collection must be proven by the lot itself.
            // Unknown locality goes to the audit queue, never to the wrong city.
            if (state && city && !declaredCity) continue;
            if (declaredCity && ((state && enriched.state !== state) || (city && normalizeStr(declaredCity) !== cityNorm))) continue;
            results.push({
              ...enriched,
              city: declaredCity || enriched.city,
              state: enriched.state || state,
              sellerBank: finalDetection.bank || detection.bank,
              address: hasAuditableAddress(enriched.address)
                ? enriched.address
                : 'Endereço em extração documental - matrícula ou edital não disponibilizado pelo portal'
            });
          }
        } catch (err: any) {
          recordSourceAudit({source:config.name, url:config.baseUrl, complete:false, error:err.message});
          console.warn(`[Auctioneer Generic] ${config.name} indisponível: ${err.message}`);
        } finally {
          if (page) await page.close().catch(() => undefined);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(4, configs.length) }, () => worker()));
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  return results;
}

// Grounded search complements the deterministic scrapers and is still subject
// to link, date and value validation before entering the store.
export async function scrapeGroundedAuctioneers(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const results: ScrapedAuctionDraft[] = [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Auctioneer Miner] GEMINI_API_KEY não configurada. Pulando varredura Grounded.');
    return results;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const targetLabel = targetType === 'extrajudicial' ? 'LEILÕES DE BANCOS E EXTRAJUDICIAIS (Alienação Fiduciária)' : 'LEILÕES JUDICIAIS (Varas Cíveis e Trabalhistas)';
  const domains = AUCTIONEER_PORTALS.map(p => p.domain).join(', ');

  const prompt = `
Você é um auditor e robô de varredura pericial de leilões imobiliários no Brasil. Hoje é ${todayStr}.
Realize uma pesquisa ativa no Google (Google Search Grounding) focando estritamente nos portais de leiloeiros oficiais configurados:
${domains}.

Objetivo:
Encontre entre 4 e 8 ${targetLabel} de imóveis ATIVOS (com data de leilão futura a ${todayStr}) localizados no estado do ${state} (especialmente em ${city} ou Região Metropolitana).

${targetType === 'extrajudicial' 
  ? 'Foque em imóveis retomados por bancos (Santander, Itaú, Bradesco, Banco do Brasil, Inter, Pan, Safra, etc.) ou alienação fiduciária.' 
  : 'Foque em imóveis com processo judicial, penhora, falência ou execução judicial das varas cíveis/trabalhistas.'}

Gere links REAIS que apontem diretamente para o lote do imóvel dentro de um dos portais citados.

Retorne EXCLUSIVAMENTE um array JSON puro (sem explicações, sem markdown fora do bloco json):
[
  {
    "portalId": "identificador do portal configurado",
    "auctioneerName": "Nome do leiloeiro (ex: Portal Zuk, Mega Leilões, Sold Leilões, Pestana Leilões)",
    "title": "Apartamento / Casa no Bairro X",
    "address": "Endereço com rua e número se disponível",
    "neighborhood": "Nome do Bairro oficial",
    "city": "${city}",
    "state": "${state}",
    "propertyType": "Apartamento" | "Casa" | "Terreno" | "Comercial",
    "sizeSqm": número da metragem em m² (ex: 65),
    "auctionPrice": valor do lance mínimo em reais (número inteiro sem vírgulas),
    "estimatedValue": valor de avaliação do leilão em reais,
    "auctionDate": "AAAA-MM-DD",
    "firstAuctionDate": "AAAA-MM-DD da primeira praça, se houver",
    "secondAuctionDate": "AAAA-MM-DD da segunda praça, se houver",
    "saleMode": "Venda Direta" | "Licitação Aberta" | "Leilão Online" | "Aceita Propostas",
    "auctionLink": "URL direta do lote no site do leiloeiro",
    "imageUrl": "URL da foto se disponível",
    "description": "Detalhes do lote e comitente/banco",
    "sellerBank": "Nome do banco se houver (ex: Santander, Itaú)"
  }
]
`;

  try {
    console.log(`[Auctioneer Grounded Miner] Iniciando busca no Google para leilões ${targetType} em ${city}-${state}...`);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '';
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/) || [null, responseText];
    let jsonStr = (jsonMatch[1] || responseText).trim();
    jsonStr = jsonStr.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!item.auctionLink || !isConfiguredAuctionLink(item.auctionLink) || !item.auctionPrice || item.auctionPrice <= 0) continue;
        results.push({
          portalId: item.portalId || 'portal',
          auctioneerName: item.auctioneerName || 'Leiloeiro Oficial',
          title: item.title || 'Imóvel em Leilão',
          address: item.address || '',
          neighborhood: item.neighborhood || '',
          city: item.city || city,
          state: item.state || state,
          propertyType: parseType(item.propertyType || item.title),
          sizeSqm: Number(item.sizeSqm) || 0,
          auctionPrice: Math.round(Number(item.auctionPrice)),
          estimatedValue: undefined,
          auctionDate: item.auctionDate || item.firstAuctionDate || '',
          firstAuctionDate: item.firstAuctionDate || item.auctionDate || undefined,
          secondAuctionDate: item.secondAuctionDate || undefined,
          auctionLink: item.auctionLink,
          imageUrl: item.imageUrl,
          description: item.description || '',
          saleMode: item.saleMode || extractSaleMode(item.description || item.title || ''),
          origin: targetType,
          sellerBank: item.sellerBank
        });
      }
    }
  } catch (err: any) {
    console.error('[Auctioneer Grounded Miner] Erro:', err.message);
  }

  return results;
}

// Master Pipeline: Runs all scrapers in parallel, deduplicates, and enriches
async function runAuctioneersPipeline(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro',
  existingAuctions: AuctionProperty[],
  recalculateFn: (auc: AuctionProperty) => AuctionProperty
): Promise<{ newAuctions: AuctionProperty[]; totalScraped: number; updated: number; pending: number }> {
  if (state.includes(',')) {
    const newAuctions: AuctionProperty[] = [];
    let totalScraped = 0;
    let updated = 0;
    let pending = 0;
    for (const uf of [...new Set(state.split(',').map(s => s.trim()))]) {
      if (!AUCTION_STATES.includes(uf)) throw new Error(`UF inválida: ${uf}`);
      const result = await runAuctioneersPipeline(targetType, uf, city, [...existingAuctions, ...newAuctions], recalculateFn);
      newAuctions.push(...result.newAuctions);
      totalScraped += result.totalScraped;
      updated += result.updated;
      pending += result.pending;
    }
    return { newAuctions, totalScraped, updated, pending };
  }
  if (state && !AUCTION_STATES.includes(state)) throw new Error(`UF inválida: ${state}`);
  if (city && state && !municipalityId(city, state)) throw new Error(`Município inválido: ${city}/${state}`);
  console.log(`\n======================================================`);
  console.log(`[Auctioneer Master Sync] Sincronizando Leilões ${targetType.toUpperCase()} para ${city}-${state}...`);
  console.log(`Portais configurados: ${AUCTIONEER_PORTALS.map(p => p.name).join(', ')}`);
  console.log(`======================================================\n`);

  const [seedList, isaiasList, santanderList, megaList, frazaoList, biasiList, zukList, configuredList, groundedList] = await Promise.all([
    scrapeOfficialDetailSeeds(targetType, state, city).catch(error => { recordSourceAudit({source:'Lotes oficiais priorizados',complete:false,error:String(error)}); return []; }),
    scrapeIsaiasAuctioneer(targetType, state, city).catch(error => { recordSourceAudit({source:'Isaías Leilões',complete:false,error:String(error)}); return []; }),
    scrapeSantanderOfficial(targetType, state, city).catch(error => { recordSourceAudit({source:'Santander Imóveis',complete:false,error:String(error)}); return []; }),
    scrapeMegaLeiloes(targetType, state, city).catch(error => { recordSourceAudit({source:'Mega Leilões',complete:false,error:String(error)}); return []; }),
    scrapeFrazao(targetType, state, city).catch(error => { recordSourceAudit({source:'Frazão',complete:false,error:String(error)}); return []; }),
    scrapeBiasi(targetType, state, city).catch(error => { recordSourceAudit({source:'Biasi',complete:false,error:String(error)}); return []; }),
    scrapePortalZuk(targetType, state, city).catch(error => { recordSourceAudit({source:'Portal Zuk',complete:false,error:String(error)}); return []; }),
    scrapeConfiguredAuctioneers(targetType, state, city).catch(error => { recordSourceAudit({source:'Portais configurados',complete:false,error:String(error)}); return []; }),
    Promise.resolve([] as ScrapedAuctionDraft[]) // AI-generated fields are not source evidence.
  ]);

  const allDrafts = [...seedList, ...isaiasList, ...santanderList, ...megaList, ...frazaoList, ...biasiList, ...zukList, ...configuredList, ...groundedList];
  console.log(`[Auctioneer Master Sync] Total bruto capturado nos portais: ${allDrafts.length}`);

  return reconcileAuctionDrafts(allDrafts, targetType, state, city, existingAuctions, recalculateFn);
}

// Runs sources with dedicated official collectors before the broad portal
// queue. This gives the requested comarca real, persisted lots immediately;
// the heterogeneous crawler can then continue without holding them hostage.
export async function syncPriorityOfficialAuctioneers(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string,
  existingAuctions: AuctionProperty[], recalculateFn: (auc: AuctionProperty) => AuctionProperty
) {
  return auctionSyncAudit.run([], async () => {
    const [seeds, isaias, santander, mega, frazao, biasi, zuk] = await Promise.all([
      scrapeOfficialDetailSeeds(targetType, state, city),
      scrapeIsaiasAuctioneer(targetType, state, city),
      scrapeSantanderOfficial(targetType, state, city),
      scrapeMegaLeiloes(targetType, state, city),
      scrapeFrazao(targetType, state, city),
      scrapeBiasi(targetType, state, city),
      scrapePortalZuk(targetType, state, city).catch(error => { recordSourceAudit({source:'Portal Zuk',complete:false,error:String(error)}); return []; })
    ]);
    return reconcileAuctionDrafts([...seeds, ...isaias, ...santander, ...mega, ...frazao, ...biasi, ...zuk], targetType, state, city, existingAuctions, recalculateFn);
  });
}

export function extractUnitComplement(address?: string): string {
  if (!address) return '';
  const norm = normalizeStr(address).replace(/(\d)\.(?=\d{3}\b)/g,'$1');
  const apto = norm.match(/\b(?:apto|apartamento|ap|und|unidade)\s*(?:n[ºo°.]*\s*)?([0-9]+(?:\.[0-9]{3})*[a-z]?)\b/i);
  const bloco = norm.match(/\b(?:bloco|bl)\s*([0-9a-z]+)\b/i);
  const lote = norm.match(/\b(?:lote|lt)\s*([0-9a-z]+)\b/i);
  const quadra = norm.match(/\b(?:quadra|qd)\s*([0-9a-z]+)\b/i);
  const casa = norm.match(/\b(?:casa)\s*(?:n[ºo°.]*\s*)?([0-9]+(?:\.[0-9]{3})*[a-z]?)\b/i);
  const sala = norm.match(/\b(?:sala|loja)\s*(?:n[ºo°.]*\s*)?([0-9]+(?:\.[0-9]{3})*[a-z]?)\b/i);
  
  const parts: string[] = [];
  if (apto) parts.push(`ap-${apto[1]}`);
  if (bloco) parts.push(`bl-${bloco[1]}`);
  if (lote) parts.push(`lt-${lote[1]}`);
  if (quadra) parts.push(`qd-${quadra[1]}`);
  if (casa) parts.push(`cs-${casa[1]}`);
  if (sala) parts.push(`sl-${sala[1]}`);
  return parts.join('-');
}

export function getPropertyDedupeKey(address?: string, city?: string, state?: string, processNumber?: string, auctionId?: string, propertyType?: PropertyType): string | null {
  // Caixa lots are unique official contracts and must NEVER collide with other lots or each other
  if (auctionId && auctionId.startsWith('auc-caixa-')) {
    return `caixa:${auctionId}`;
  }

  if (!address || !city) return null;

  const normCity = normalizeStr(city);
  const normState = normalizeStr(state || '');
  
  const cleanAddr = normalizeStr(address)
    .replace(/\b(rua|r\.|avenida|av\.|alameda|al\.|estrada|estr\.|praca|pr\.|travessa|trav\.|rodovia|rod\.)\b/g, '')
    .trim();
  
  const numMatch = [address.match(/\b(?:n[º°.]*|numero|num)\s*(\d+(?:\.\d{3})*)/i), address.match(/,\s*(\d+(?:\.\d{3})*)/)]
    .filter((match): match is RegExpMatchArray => Boolean(match)).sort((a,b)=>(a.index||0)-(b.index||0))[0];
  if (!numMatch) return null;
  const num = numMatch[1].replace(/\./g,'');
  
  const beforeNumber = cleanAddr.split(/,|\bn[º°.]*\s*\d|\bnumero\s*\d|\bnum\s*\d/i)[0];
  const streetCore = beforeNumber.replace(/[^a-z0-9]+/g, ' ').trim();
  if (!streetCore) return null;
  const unit = extractUnitComplement(address);
  if (unit) {
    return `${normCity}-${normState}:${streetCore}:${num}:${unit}`;
  }

  if (propertyType === 'Apartamento' || propertyType === 'Comercial') return null;
  return `${normCity}-${normState}:${streetCore}:${num}`;
}

export function deduplicateAuctions(auctions: AuctionProperty[]): AuctionProperty[] {
  const seenLinks = new Set<string>();
  const seenKeys = new Map<string, AuctionProperty>();
  const deduplicated: AuctionProperty[] = [];

  for (const auc of auctions) {
    const link = canonicalAuctionLink(auc.auctionLink || '');
    if (link && seenLinks.has(link)) {
      continue;
    }
    if (link) seenLinks.add(link);

    const dedupeKey = getPropertyDedupeKey(auc.address, auc.city, auc.state, auc.processNumber, auc.id, auc.propertyType);
    if (dedupeKey) {
      if (seenKeys.has(dedupeKey)) {
        const existing = seenKeys.get(dedupeKey)!;
        if (!existing.imageUrl && auc.imageUrl) existing.imageUrl = auc.imageUrl;
        if (!existing.secondAuctionDate && auc.secondAuctionDate) existing.secondAuctionDate = auc.secondAuctionDate;
        continue;
      }
      seenKeys.set(dedupeKey, auc);
    }

    deduplicated.push(auc);
  }

  return deduplicated;
}

export function reconcileAuctionDrafts(
  allDrafts: ScrapedAuctionDraft[], targetType: 'extrajudicial' | 'judicial', state: string, city: string,
  existingAuctions: AuctionProperty[], recalculateFn: (auc: AuctionProperty) => AuctionProperty,
  writeAudit = true
) {
  const linkIndex = new Map(existingAuctions.flatMap(a => [a.auctionLink,...(a.sourceLinks||[])].filter(Boolean).map(link => [canonicalAuctionLink(link!),a] as const)));
  const existingLinks = new Set(linkIndex.keys());
  const existingKeys = new Map<string, AuctionProperty>();
  for (const a of existingAuctions) {
    const k = getPropertyDedupeKey(a.address, a.city, a.state, a.processNumber, a.id, a.propertyType);
    if (k) existingKeys.set(k, a);
  }

  const newAuctions: AuctionProperty[] = [];
  let updated = 0;
  const today = new Date().toISOString().slice(0, 10);
  const pendingReview: Array<{draft: ScrapedAuctionDraft; reason: string}> = [];

  for (const draft of allDrafts) {
    draft.auctionLink = canonicalAuctionLink(draft.auctionLink);
    const declared = declaredAuctionLocation(draft);
    if (declared && ((state && declared.state !== state) || (city && normalizeStr(declared.city) !== normalizeStr(city)))) {
      pendingReview.push({draft,reason:'outside_requested_location'});
      continue;
    }
    if (declared) Object.assign(draft, declared);

    if (!isPropertyLotEvidence(`${draft.title}\n${draft.description || ''}`)) { pendingReview.push({draft, reason:'not_a_property_lot'}); continue; }
    if (draft.origin !== targetType) { pendingReview.push({draft, reason:'different_origin'}); continue; }
    if (draft.sourceClosed) { pendingReview.push({draft, reason:'closed_at_source'}); continue; }
    if (!draft.originVerified) { pendingReview.push({draft, reason:'unconfirmed_origin'}); continue; }
    if (!draft.sourceVerified) { pendingReview.push({draft, reason:'detail_unavailable'}); continue; }
    if (!draft.city || !draft.state || (state && draft.state !== state) || (city && normalizeStr(draft.city) !== normalizeStr(city))) { pendingReview.push({draft, reason:'unconfirmed_location'}); continue; }
    let lastKnownDate = draft.secondAuctionDate || draft.firstAuctionDate || draft.auctionDate;
    if (!isConfiguredAuctionLink(draft.auctionLink)) { pendingReview.push({draft,reason:'unverified_link'}); continue; }
    if (lastKnownDate && lastKnownDate < today) { pendingReview.push({draft,reason:'past_date'}); continue; }
    // A confirmed official lot is never lost because a complementary field is
    // absent. It enters as pending, but cannot receive calculated ROI,
    // liquidity or recommendation until price, area and date are verified.
    const calculationReady = Boolean(draft.sizeVerified && draft.priceVerified && draft.sizeSqm > 0 && draft.auctionPrice > 0 && lastKnownDate);
    if (!calculationReady) pendingReview.push({draft,reason: !draft.priceVerified || draft.auctionPrice <= 0 ? 'unconfirmed_price' : !draft.sizeVerified || draft.sizeSqm <= 0 ? 'unconfirmed_area' : 'missing_date'});

    const addressCity = extractDeclaredCity(draft.address, draft.state);
    if (addressCity && normalizeStr(addressCity) !== normalizeStr(draft.city)) { pendingReview.push({draft,reason:'outside_requested_city'}); continue; }
    const completeAddress = draft.address || '';

    const draftKey = getPropertyDedupeKey(completeAddress, draft.city, draft.state, undefined, undefined, draft.propertyType);
    const existing = (existingLinks.has(draft.auctionLink)
      ? linkIndex.get(draft.auctionLink)
      : (draftKey ? existingKeys.get(draftKey) : null));

    if (existing) {
      updated++;
      Object.assign(existing, recalculateFn({ ...existing, auctionLink:draft.auctionLink, auctioneerName:draft.auctioneerName, sourceLinks:[...new Set([...(existing.sourceLinks||[]),existing.auctionLink,draft.auctionLink].filter(Boolean))], lastSyncedAt:new Date().toISOString(), state: draft.state, city: draft.city, neighborhood: draft.neighborhood || existing.neighborhood, origin: targetType, title: draft.title, imageUrl: draft.imageUrl || existing.imageUrl, propertyType: draft.propertyType, address: completeAddress || existing.address, sizeSqm: draft.sizeSqm, areaAudit: draft.areaAudit, sizeApproximate: draft.sizeApproximate, auctionPrice: draft.priceVerified ? draft.auctionPrice : 0,
        evaluationPrice: draft.estimatedValue ?? existing.evaluationPrice,
        auctionDate: draft.auctionDate, firstAuctionDate: draft.firstAuctionDate, secondAuctionDate: draft.secondAuctionDate,
        firstAuctionPrice: draft.firstAuctionPrice ?? existing.firstAuctionPrice, secondAuctionPrice: draft.secondAuctionPrice ?? existing.secondAuctionPrice,
        saleMode: draft.saleMode,
        addressVerified: draft.addressVerified, sizeVerified: draft.sizeVerified, priceVerified: draft.priceVerified,
        description: draft.description, matriculaText: draft.matriculaText || existing.matriculaText,
        matriculaUrl: draft.matriculaUrl || existing.matriculaUrl,
        allowsFinancing: draft.allowsFinancing ?? existing.allowsFinancing ?? false,
        allowsInstallments: draft.allowsInstallments ?? existing.allowsInstallments ?? false,
        paymentTerms: draft.paymentTerms || existing.paymentTerms,
        maxInstallments: draft.maxInstallments ?? existing.maxInstallments,
        minDownpaymentPercent: draft.minDownpaymentPercent ?? existing.minDownpaymentPercent,
        pendingIptuCost: draft.pendingIptuCost ?? existing.pendingIptuCost,
        pendingCondoCost: draft.pendingCondoCost ?? existing.pendingCondoCost }));
      if (!calculationReady || existing.precisa_revisao) Object.assign(existing, {
        precisa_revisao: true,
        valuationConfidence: 'unavailable',
        liquidityScore: 1,
        riskLevel: 'Alto',
        calculatedRoi: undefined,
        calculatedProfit: undefined
      });
      linkIndex.set(draft.auctionLink,existing);existingLinks.add(draft.auctionLink);
      if(draftKey)existingKeys.set(draftKey,existing);
      continue;
    }
    existingLinks.add(draft.auctionLink);

    const baseId = `auc-${draft.portalId}-${createHash('sha256').update(draft.auctionLink).digest('hex').slice(0, 20)}`;
    const isAuditable = hasAuditableAddress(draft.address);

    const rawAuc: AuctionProperty = {
      id: baseId,
      title: draft.title,
      address: completeAddress,
      neighborhood: draft.neighborhood,
      city: draft.city,
      state: draft.state,
      propertyType: draft.propertyType,
      sizeSqm: draft.sizeSqm,
      auctionPrice: draft.auctionPrice,
      estimatedRepair: Math.round(draft.auctionPrice * 0.05),
      pendingDebts: 0,
      otherCosts: 0,
      estimatedValue: draft.estimatedValue,
      evaluationPrice: draft.estimatedValue,
      auctionDate: draft.auctionDate,
      firstAuctionDate: draft.firstAuctionDate,
      secondAuctionDate: draft.secondAuctionDate,
      firstAuctionPrice: draft.firstAuctionPrice,
      secondAuctionPrice: draft.secondAuctionPrice,
      auctionLink: draft.auctionLink,
      sourceLinks: [draft.auctionLink],
      lastSyncedAt: new Date().toISOString(),
      auctioneerName: draft.auctioneerName,
      matriculaText: draft.matriculaText,
      matriculaUrl: draft.matriculaUrl,
      saleMode: draft.saleMode,
      imageUrl: draft.imageUrl,
      description: draft.description || `${draft.title} - Leiloeiro: ${draft.auctioneerName}`,
      status: 'Pendente',
      precisa_revisao: !calculationReady,
      valuationConfidence: calculationReady ? undefined : 'unavailable',
      liquidityScore: calculationReady ? undefined : 1,
      riskLevel: calculationReady ? undefined : 'Alto',
      occupied: true,
      origin: targetType,
      allowsFinancing: draft.allowsFinancing ?? false,
      allowsInstallments: draft.allowsInstallments ?? false,
      paymentTerms: draft.paymentTerms || 'Condição de pagamento não confirmada na fonte',
      maxInstallments: draft.maxInstallments,
      minDownpaymentPercent: draft.minDownpaymentPercent,
      pendingIptuCost: draft.pendingIptuCost,
      pendingCondoCost: draft.pendingCondoCost,
      downpaymentPercent: draft.minDownpaymentPercent,
      addressVerified: draft.addressVerified ?? isAuditable,
      sizeVerified: draft.sizeVerified === true,
      areaAudit: draft.areaAudit,
      sizeApproximate: draft.sizeApproximate,
      priceVerified: draft.priceVerified === true
    };

    // Never let incomplete official lots inherit a speculative valuation.
    const finalAuc = calculationReady ? recalculateFn(rawAuc) : rawAuc;
    newAuctions.push(finalAuc);
    linkIndex.set(draft.auctionLink, finalAuc);
    if (draftKey) existingKeys.set(draftKey, finalAuc);
  }

  if (writeAudit) {
  fs.mkdirSync('sync-audits', { recursive: true });
  fs.writeFileSync(`sync-audits/${targetType}-${state}-${normalizeStr(city).replace(/[^a-z0-9-]/g, '-') || 'todas'}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), city, state, totalScraped: allDrafts.length, imported: newAuctions.length, updated, sources: auctionSyncAudit.getStore() || [], pendingReview }, null, 2));
  }
  console.log(`[Auctioneer Master Sync] Novos leilões ${targetType} adicionados e auditados com sucesso: ${newAuctions.length}`);
  return {
    newAuctions,
    totalScraped: allDrafts.length, updated, pending: pendingReview.length, pendingReview
  };
}

// Server startup and the maintenance endpoint use this to re-run the single
// calculation path without inventing missing source facts. It only replaces an
// item when the supplied calculation actually changes persisted fields.
export function auditAndRepairAuctions(
  auctions: AuctionProperty[],
  recalculateFn: (auction: AuctionProperty) => AuctionProperty
): { total: number; repaired: number } {
  let repaired = 0;
  for (let index = 0; index < auctions.length; index++) {
    const current = auctions[index];
    const recalculated = recalculateFn({ ...current });
    if (current.precisa_revisao) Object.assign(recalculated, {
      precisa_revisao: true,
      valuationConfidence: 'unavailable',
      liquidityScore: 1,
      riskLevel: 'Alto',
      calculatedRoi: undefined,
      calculatedProfit: undefined
    });
    if (JSON.stringify(current) === JSON.stringify(recalculated)) continue;
    auctions[index] = recalculated;
    repaired++;
  }
  return { total: auctions.length, repaired };
}

export async function syncAuctioneersPipeline(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string,
  existingAuctions: AuctionProperty[], recalculateFn: (auc: AuctionProperty) => AuctionProperty
) {
  return auctionSyncAudit.run([], async () => {
    const result = await runAuctioneersPipeline(targetType, state, city, existingAuctions, recalculateFn);
    const sources = auctionSyncAudit.getStore() || [];
    return { ...result, sources, partial: sources.length === 0 || sources.some(source => !source.complete) };
  });
}

// Fast, source-specific import used at startup so an official city lot is not
// held hostage by slower or unavailable portals in the broad audit sweep.
export async function syncIsaiasOfficialLots(
  targetType: 'extrajudicial' | 'judicial', state: string, city: string,
  existingAuctions: AuctionProperty[], recalculateFn: (auc: AuctionProperty) => AuctionProperty
) {
  const drafts = await scrapeIsaiasAuctioneer(targetType, state, city);
  return reconcileAuctionDrafts(drafts, targetType, state, city, existingAuctions, recalculateFn, false);
}
