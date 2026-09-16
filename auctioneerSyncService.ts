import { createHash } from 'node:crypto';
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
  { id: "isaias", name: "Isaías Leilões", domain: "isaiasleiloes.com.br", baseUrl: "https://www.isaiasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alexandrecosta", name: "Alexandre Costa Leilões", domain: "alexandrecostaleiloes.com.br", baseUrl: "https://www.alexandrecostaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ayupp", name: "Fabiano Ayupp Leiloeiro", domain: "fabianoayuppleiloeiro.com.br", baseUrl: "https://fabianoayuppleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rioleiloes", name: "Rio Leilões", domain: "rioleiloes.com.br", baseUrl: "https://www.rioleiloes.com.br", genericScrape: true, enabled: true },
  { id: "frazao", name: "Frazão Leilões", domain: "frazaoleiloes.com.br", baseUrl: "https://www.frazaoleiloes.com.br", enabled: true },
  { id: "biasi", name: "Biasi Leilões", domain: "biasileiloes.com.br", baseUrl: "https://www.biasileiloes.com.br", enabled: true },
  { id: "megaleiloes", name: "Mega Leilões", domain: "megaleiloes.com.br", baseUrl: "https://www.megaleiloes.com.br", enabled: true },
  { id: "portalzuk", name: "Portal Zuk", domain: "portalzuk.com.br", baseUrl: "https://www.portalzuk.com.br", enabled: true },
  { id: "sold", name: "Sold Leilões", domain: "sold.com.br", baseUrl: "https://www.sold.com.br", enabled: true },
  { id: "pestana", name: "Pestana Leilões", domain: "pestanaleiloes.com.br", baseUrl: "https://www.pestanaleiloes.com.br", enabled: true },
  { id: "mgl", name: "MGL Leilões", domain: "mgl.com.br", baseUrl: "https://www.mgl.com.br", enabled: true },
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

export function extractAddress(text: string, fallback: string): string {
  const lines = text.split(/\r?\n|\s{2,}/).map(line => line.trim()).filter(Boolean);
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
    if (labeledAddress.length >= 8) return labeledAddress.slice(0, 180);
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
    return extracted
      .split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0]
      .replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, '')
      .trim();
  }
  const normalized = text.replace(/\s+/g, ' ').trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, ' ').trim() : fallback;
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

export function extractMinimumBid(text: string): number {
  const initials = [...text.matchAll(/valor\s+inicial\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)].map(match => parseBrazilianMoney(match[1]));
  if (initials.length) return new Set(initials).size === 1 ? initials[0] : 0;
  const values = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)]
    .map(match => Number(match[1].replace(/\./g, '').replace(',', '.')))
    .filter(value => Number.isFinite(value) && value > 0);
  return values.length > 0 && new Set(values).size === 1 ? values[0] : 0;
}

function extractAppraisal(text: string): number | undefined {
  const match = text.match(/valor\s+(?:de\s+)?avalia[cç][aã]o\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (!match) return undefined;
  const value = Number(match[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
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
      const usefulLinks = orderedLinks.filter((url: string) => needsDocumentAddress || /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url));
      for (const documentUrl of usefulLinks.slice(0, 3)) {
        const extracted = await extractOfficialDocumentText(detailPage, documentUrl);
        if (extracted) officialDocumentText += `\n${extracted}`;
        if (extracted && /matr[ií]cula|certid[aã]o|\brgi\b/i.test(documentUrl)) {
          matriculaText = extracted;
          matriculaUrl = documentUrl;
        }
      }
    }

    // Collective notices and recommended lots are not the property description.
    const lotText = detailData.text.split(/(?:EDITAL DE LEILÃO CONDICIONAL|Outros lotes|Lotes relacionados|Você também pode|Veja também)/i)[0];
    const combinedText = lotText;
    const financialTerms = extractFinancialTerms(combinedText);
    const sellerSection = combinedText.match(/comitente\s*:?\s*([^\n]+(?:\n[^\n]+)?)/i)?.[1] || '';
    const classification = detectBankOrJudicial(combinedText);
    const dates = extractAuctionDates(combinedText);
    const sizeMatch = combinedText.match(/[aá]rea\s+(?:privativa(?:\s*\/\s*edificada)?|edificada|[uú]til|constru[ií]da)\s*(?:de\s+)?[:=]?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i)
      || combinedText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]\s*(?:de\s+)?[aá]rea\s+privativa/i)
      || combinedText.match(/(?:metragem|[aá]rea\s+do\s+im[oó]vel|[aá]rea\s+total)\s*:?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const structuredSize = detailData.structuredSizes.length === 1 ? detailData.structuredSizes[0] : 0;
    const headlineArea = detailData.title.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const landArea = parseType(detailData.title || draft.title) === 'Terreno' ? combinedText.match(/[aá]rea\s+(?:(?:total|do\s+terreno)\s*)?(?:de\s*)?[:=]?\s*([\d.]+(?:,\d+)?)\s*m[²2]/i) : null;
    const detailedSize = (landArea ? Number(landArea[1].replace(/\./g, '').replace(',', '.')) : 0) || (sizeMatch ? Number(sizeMatch[1].replace(',', '.')) : 0) ||
      (headlineArea ? Number(headlineArea[1].replace(',', '.')) : 0) || structuredSize;
    const structuredAddress = detailData.structuredAddresses
      .map((value: string) => extractAddress(value, ''))
      .find((value: string) => hasAuditableAddress(value) && !/leiloeir|escrit[oó]rio|telefone|contato/i.test(value));
    const textAddress = extractAddress(combinedText, '') || extractAddress(matriculaText, '');
    const verifiedAddress = (hasAuditableAddress(textAddress) ? textAddress : '') || structuredAddress;
    const today = new Date().toISOString().slice(0, 10);
    const roundBlocks = combinedText.split(/(?=(?:1[ºªo°]|2[ºªo°]|primeir[oa]|segund[oa])\s*(?:leil[aã]o|pra[cç]a))/i);
    const rounds = roundBlocks.map(block => ({ date: extractAuctionDates(block).first, price: extractMinimumBid(block) }))
      .filter(round => round.date && round.date >= today && round.price > 0).sort((a, b) => a.date!.localeCompare(b.date!));
    const detailedMinimumBid = rounds[0]?.price || extractMinimumBid(combinedText);
    const enrichedDescription = combinedText.trim().slice(0, 30000);
    const detectedLocation = sourceAuctionLocation(detailData.title)
      || sourceAuctionLocation(verifiedAddress || '')
      || sourceAuctionLocation(lotText)
      || ((draft.locationScopeVerified && hasCityEvidence(combinedText, draft.city)) || hasRequestedLocationEvidence(combinedText, draft.state, draft.city)
        ? { city: draft.city, state: draft.state }
        : null);

    return {
      ...draft,
      sourceClosed: /leiloes-realizados/.test(detailPage.url()) || /(?:leil[aã]o|lote)\s+(?:encerrado|cancelado|suspenso|arrematado)/i.test(lotText.slice(0, 1500)),
      originVerified: /(?:^|\n)\s*(?:leil[aã]o\s+)?(?:extrajudicial|judicial)\s*(?:\n|$)/i.test(lotText) || /\bprocesso\s*(?:n[ºo°.]*)?\s*:?\s*\d{7}-\d{2}/i.test(lotText) || Boolean(classification.bank),
      sourceVerified: true,
      // Never erase the requested location with empty fields. The source may
      // use "Juiz de Fora, Minas Gerais" instead of the compact JF/MG form.
      ...(detectedLocation || {}),
      title: detailData.title.trim() || draft.title,
      imageUrl: detailData.image || draft.imageUrl,
      propertyType: parseType(detailData.title || draft.title),
      origin: classification.origin,
      sellerBank: classification.bank,
      address: verifiedAddress || draft.address,
      addressVerified: Boolean(verifiedAddress),
      matriculaText,
      matriculaUrl,
      sizeSqm: detailedSize > 0 ? detailedSize : draft.sizeSqm,
      sizeVerified: detailedSize > 0,
      auctionPrice: detailedMinimumBid || draft.auctionPrice,
      priceVerified: detailedMinimumBid > 0,
      estimatedValue: extractAppraisal(combinedText) || draft.estimatedValue,
      auctionDate: [dates.first, dates.second].filter((date): date is string => Boolean(date) && date! >= today).sort()[0] || dates.first || '',
      firstAuctionDate: dates.first,
      secondAuctionDate: dates.second,
      saleMode: extractSaleMode(combinedText || draft.description || ''),
      ...financialTerms,
      description: enrichedDescription || draft.description
    };
  } catch (err: any) {
    recordSourceAudit({source:draft.portalId,url:draft.auctionLink,complete:false,error:`Falha no detalhe: ${err.message}`});
    console.warn(`[Auctioneer Sync] Não foi possível abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => undefined);
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

        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

        const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
        const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

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

          const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
          const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

          const sizeMatch = text.match(/(\d+(?:[\.,]\d+)?)\s*m²/i);
          const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;

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

        const priceMatch = text.match(/R\$\s*([\d\.,]+)/i);
        const price = priceMatch ? Math.round(Number(priceMatch[1].replace(/\./g, '').replace(',', '.'))) : 0;

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

// Coletor conservador para portais heterogêneos. Só admite cards que exponham
// link direto, preço e linguagem inequívoca de imóvel; o detalhe é aberto antes
// da importação para confirmar endereço, metragem, datas e natureza do leilão.
export async function scrapeConfiguredAuctioneers(
  targetType: 'extrajudicial' | 'judicial',
  state: string = 'RJ',
  city: string = 'Rio de Janeiro'
): Promise<ScrapedAuctionDraft[]> {
  const cityCode = municipalityId(city, state);
  const priorityPortals = new Set([
    'isaias', 'alexandrecosta', 'ayupp', 'rioleiloes',
    'portalzuk', 'sold', 'pestana', 'mgl', 'santander', 'emgea', 'bb',
    'ricart', 'pamela', 'gustavo', 'onildo', 'schulmann', 'saraiva',
    'rymer', 'depaula', 'jv', 'paulobotelho', 'alexandro', 'portella',
    'silas', 'joaoemilio', 'facanha'
  ]);
  // A broad homepage crawl of every registered auctioneer takes many minutes
  // and does not prove a municipality. Prefer portals with an IBGE-compatible
  // city endpoint, plus the explicitly configured official portals above.
  const configs = AUCTIONEER_PORTALS.filter(portal => {
    if (!portal.enabled || ['megaleiloes', 'frazao', 'biasi', 'isaias'].includes(portal.id)) return false;
    return portal.domain.endsWith('.lel.br') || priorityPortals.has(portal.id);
  });
  const results: ScrapedAuctionDraft[] = [];
  let browser: any = null;

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
              const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(',', '.'))) : 0;
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
            if (!/\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i.test(combinedEvidence)) continue;
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

  const [isaiasList, megaList, frazaoList, biasiList, configuredList, groundedList] = await Promise.all([
    scrapeIsaiasAuctioneer(targetType, state, city).catch(error => { recordSourceAudit({source:'Isaías Leilões',complete:false,error:String(error)}); return []; }),
    scrapeMegaLeiloes(targetType, state, city).catch(error => { recordSourceAudit({source:'Mega Leilões',complete:false,error:String(error)}); return []; }),
    scrapeFrazao(targetType, state, city).catch(error => { recordSourceAudit({source:'Frazão',complete:false,error:String(error)}); return []; }),
    scrapeBiasi(targetType, state, city).catch(error => { recordSourceAudit({source:'Biasi',complete:false,error:String(error)}); return []; }),
    scrapeConfiguredAuctioneers(targetType, state, city).catch(error => { recordSourceAudit({source:'Portais configurados',complete:false,error:String(error)}); return []; }),
    Promise.resolve([] as ScrapedAuctionDraft[]) // AI-generated fields are not source evidence.
  ]);

  const allDrafts = [...isaiasList, ...megaList, ...frazaoList, ...biasiList, ...configuredList, ...groundedList];
  console.log(`[Auctioneer Master Sync] Total bruto capturado nos portais: ${allDrafts.length}`);

  return reconcileAuctionDrafts(allDrafts, targetType, state, city, existingAuctions, recalculateFn);
}

export function reconcileAuctionDrafts(
  allDrafts: ScrapedAuctionDraft[], targetType: 'extrajudicial' | 'judicial', state: string, city: string,
  existingAuctions: AuctionProperty[], recalculateFn: (auc: AuctionProperty) => AuctionProperty,
  writeAudit = true
) {
  const existingLinks = new Set(existingAuctions.map(a => canonicalAuctionLink(a.auctionLink || '')).filter(Boolean));
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

    if (draft.origin !== targetType) { pendingReview.push({draft, reason:'different_origin'}); continue; }
    if (draft.sourceClosed) { pendingReview.push({draft, reason:'closed_at_source'}); continue; }
    if (!draft.originVerified) { pendingReview.push({draft, reason:'unconfirmed_origin'}); continue; }
    if (!draft.sourceVerified) { pendingReview.push({draft, reason:'detail_unavailable'}); continue; }
    if (!draft.city || !draft.state || (state && draft.state !== state) || (city && normalizeStr(draft.city) !== normalizeStr(city))) { pendingReview.push({draft, reason:'unconfirmed_location'}); continue; }
    if (!draft.sizeVerified) { pendingReview.push({draft, reason:'unconfirmed_area'}); continue; }
    if (!draft.priceVerified) { pendingReview.push({draft, reason:'unconfirmed_price'}); continue; }
    let lastKnownDate = draft.secondAuctionDate || draft.firstAuctionDate || draft.auctionDate;
    if (!isConfiguredAuctionLink(draft.auctionLink)) { pendingReview.push({draft,reason:'unverified_link'}); continue; }
    if (lastKnownDate && lastKnownDate < today) { pendingReview.push({draft,reason:'past_date'}); continue; }

    if (draft.sizeSqm <= 0 || draft.auctionPrice <= 0 || !lastKnownDate) {
      pendingReview.push({draft,reason: draft.auctionPrice <= 0 ? 'missing_price' : draft.sizeSqm <= 0 ? 'missing_area' : 'missing_date'});
      continue;
    }

    const addressCity = extractDeclaredCity(draft.address, draft.state);
    if (addressCity && normalizeStr(addressCity) !== normalizeStr(draft.city)) { pendingReview.push({draft,reason:'outside_requested_city'}); continue; }
    const completeAddress = draft.address || '';

    if (existingLinks.has(draft.auctionLink)) {
      const existing = existingAuctions.find(item => canonicalAuctionLink(item.auctionLink || '') === draft.auctionLink);
      if (existing) {
        updated++;
        Object.assign(existing, recalculateFn({ ...existing, state: draft.state, city: draft.city, neighborhood: draft.neighborhood, origin: targetType, title: draft.title, imageUrl: draft.imageUrl || existing.imageUrl, propertyType: draft.propertyType, address: completeAddress, sizeSqm: draft.sizeSqm, auctionPrice: draft.auctionPrice,
          evaluationPrice: draft.estimatedValue ?? existing.evaluationPrice,
          auctionDate: draft.auctionDate, firstAuctionDate: draft.firstAuctionDate, secondAuctionDate: draft.secondAuctionDate, saleMode: draft.saleMode,
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
      }
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
      auctionLink: draft.auctionLink,
      auctioneerName: draft.auctioneerName,
      matriculaText: draft.matriculaText,
      matriculaUrl: draft.matriculaUrl,
      saleMode: draft.saleMode,
      imageUrl: draft.imageUrl,
      description: draft.description || `${draft.title} - Leiloeiro: ${draft.auctioneerName}`,
      status: 'Pendente',
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
      sizeVerified: draft.sizeVerified ?? (draft.sizeSqm > 0),
      priceVerified: draft.priceVerified ?? (draft.auctionPrice > 0)
    };

    // Calculate official ITBI benchmarks, Flip Rápido, Gabarito, Lucro, ROI, etc.
    const calculated = recalculateFn(rawAuc);
    newAuctions.push(calculated);
  }

  if (writeAudit) {
  fs.mkdirSync('sync-audits', { recursive: true });
  fs.writeFileSync(`sync-audits/${targetType}-${state}-${normalizeStr(city).replace(/[^a-z0-9-]/g, '-') || 'todas'}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), city, state, totalScraped: allDrafts.length, imported: newAuctions.length, updated, sources: auctionSyncAudit.getStore() || [], pendingReview }, null, 2));
  }
  console.log(`[Auctioneer Master Sync] Novos leilões ${targetType} adicionados e auditados com sucesso: ${newAuctions.length}`);
  return {
    newAuctions,
    totalScraped: allDrafts.length, updated, pending: pendingReview.length
  };
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
