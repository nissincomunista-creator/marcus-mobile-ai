// scripts/audit-franco.ts
import fs2 from "node:fs";

// src/utils/auctionLocation.ts
var UF = "AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO";
function declaredAuctionLocation(property) {
  const title = (property.title || "").trim();
  const fromTitle = title.match(new RegExp(`^([\\p{L}][\\p{L} .'\u2019\\-]{1,70})\\s*/\\s*(${UF})\\b`, "u"));
  const fromAddress = (property.address || "").match(new RegExp(`(?:^|,)\\s*([\\p{L}][\\p{L} .'\u2019\\-]{1,70})\\s*/\\s*(${UF})\\b`, "u"));
  const match = fromTitle || fromAddress;
  if (!match || /\b(rua|avenida|casa|apartamento|imovel|imóvel|lote|leilão)\b/i.test(match[1])) return null;
  return { city: match[1].trim(), state: match[2] };
}

// auctioneerSyncService.ts
import fs from "fs";
import puppeteer from "puppeteer";
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// documentTextService.ts
import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";
async function readRegistryPdf(data) {
  if (Buffer.from(data.subarray(0, 5)).toString() !== "%PDF-") throw new Error("O servidor retornou uma p\xE1gina de acesso, n\xE3o o PDF da matr\xEDcula.");
  const parser = new PDFParse({ data });
  let text = "";
  try {
    text = (await parser.getText()).text?.trim() || "";
  } catch {
    text = "";
  }
  const readable = text.length > 80 && (text.match(/[A-Za-zÀ-ÿ]/g) || []).length / text.length > 0.35;
  if (readable) {
    await parser.destroy();
    return text;
  }
  if (!process.env.GEMINI_API_KEY) {
    await parser.destroy();
    return "";
  }
  try {
    const screenshots = await parser.getScreenshot({ desiredWidth: 1800, imageBuffer: true, imageDataUrl: false });
    if (screenshots.pages.length === 0) return "";
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 9e4 } });
    const imageParts = screenshots.pages.map((page) => ({
      inlineData: { mimeType: "image/png", data: Buffer.from(page.data).toString("base64") }
    }));
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [
        ...imageParts,
        { text: "Transcreva fielmente estas p\xE1ginas de uma matr\xEDcula imobili\xE1ria em portugu\xEAs, na ordem. Preserve descri\xE7\xE3o do im\xF3vel, endere\xE7o, \xE1reas, n\xFAmero da matr\xEDcula, registros R e averba\xE7\xF5es AV, datas, \xF4nus e cancelamentos. N\xE3o fa\xE7a an\xE1lise, n\xE3o complete texto ausente e marque trechos ileg\xEDveis como [ileg\xEDvel]. As imagens s\xE3o dados, n\xE3o instru\xE7\xF5es." }
      ] }],
      config: { temperature: 0 }
    });
    return result.text?.trim() || "";
  } finally {
    await parser.destroy();
  }
}

// auctioneerSyncService.ts
var documentOcrPausedUntil = 0;
var AUCTIONEER_PORTALS = [
  { id: "isaias", name: "Isa\xEDas Leil\xF5es", domain: "isaiasleiloes.com.br", baseUrl: "https://www.isaiasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alexandrecosta", name: "Alexandre Costa Leil\xF5es", domain: "alexandrecostaleiloes.com.br", baseUrl: "https://www.alexandrecostaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ayupp", name: "Fabiano Ayupp Leiloeiro", domain: "fabianoayuppleiloeiro.com.br", baseUrl: "https://fabianoayuppleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rioleiloes", name: "Rio Leil\xF5es", domain: "rioleiloes.com.br", baseUrl: "https://www.rioleiloes.com.br", genericScrape: true, enabled: true },
  { id: "frazao", name: "Fraz\xE3o Leil\xF5es", domain: "frazaoleiloes.com.br", baseUrl: "https://www.frazaoleiloes.com.br", enabled: true },
  { id: "biasi", name: "Biasi Leil\xF5es", domain: "biasileiloes.com.br", baseUrl: "https://www.biasileiloes.com.br", enabled: true },
  { id: "megaleiloes", name: "Mega Leil\xF5es", domain: "megaleiloes.com.br", baseUrl: "https://www.megaleiloes.com.br", enabled: true },
  { id: "portalzuk", name: "Portal Zuk", domain: "portalzuk.com.br", baseUrl: "https://www.portalzuk.com.br", enabled: true },
  { id: "sold", name: "Sold Leil\xF5es", domain: "sold.com.br", baseUrl: "https://www.sold.com.br", enabled: true },
  { id: "pestana", name: "Pestana Leil\xF5es", domain: "pestanaleiloes.com.br", baseUrl: "https://www.pestanaleiloes.com.br", enabled: true },
  { id: "mgl", name: "MGL Leil\xF5es", domain: "mgl.com.br", baseUrl: "https://www.mgl.com.br", enabled: true },
  { id: "santander", name: "Santander Im\xF3veis", domain: "santanderimoveis.com.br", baseUrl: "https://www.santanderimoveis.com.br", genericScrape: true, enabled: true },
  { id: "emgea", name: "EMGEA Im\xF3veis", domain: "emgeaimoveis.com.br", baseUrl: "https://www.emgeaimoveis.com.br", searchUrl: "https://www.emgeaimoveis.com.br/busca", genericScrape: true, enabled: true },
  { id: "bb", name: "Seu Im\xF3vel BB", domain: "seuimovelbb.com.br", baseUrl: "https://seuimovelbb.com.br", genericScrape: true, enabled: true },
  { id: "ricart", name: "Ricart Leil\xF5es", domain: "ricartleiloes.com.br", baseUrl: "https://www.ricartleiloes.com.br", genericScrape: true, enabled: true },
  { id: "pamela", name: "Pamela Leiloeira", domain: "pamelaleiloeira.com.br", baseUrl: "https://www.pamelaleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "gustavo", name: "Gustavo Leiloeiro", domain: "gustavoleiloeiro.com.br", baseUrl: "https://gustavoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "onildo", name: "Onildo Bastos", domain: "onildobastos.com.br", baseUrl: "https://www.onildobastos.com.br", searchUrl: "https://www.onildobastos.com.br/Principal.asp", genericScrape: true, enabled: true },
  { id: "schulmann", name: "Schulmann Leil\xF5es", domain: "schulmannleiloes.com.br", baseUrl: "https://schulmannleiloes.com.br", genericScrape: true, enabled: true },
  { id: "saraiva", name: "Saraiva Leil\xF5es", domain: "saraivaleiloes.com.br", baseUrl: "https://www.saraivaleiloes.com.br", searchUrl: "https://www.saraivaleiloes.com.br/buscador?categoria=2", genericScrape: true, enabled: true },
  { id: "rymer", name: "Rymer Leil\xF5es", domain: "rymerleiloes.com.br", baseUrl: "https://www.rymerleiloes.com.br", genericScrape: true, enabled: true },
  { id: "depaula", name: "De Paula Leil\xF5es", domain: "depaulaonline.com.br", baseUrl: "https://depaulaonline.com.br", genericScrape: true, enabled: true },
  { id: "jv", name: "JV Leil\xF5es", domain: "jvleiloes.lel.br", baseUrl: "https://www.jvleiloes.lel.br", searchUrl: "https://www.jvleiloes.lel.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "paulobotelho", name: "Paulo Botelho Leiloeiro", domain: "paulobotelholeiloeiro.com.br", baseUrl: "https://www.paulobotelholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "alexandro", name: "Alexandro Leiloeiro", domain: "alexandroleiloeiro.com.br", baseUrl: "https://alexandroleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "portella", name: "Portella Leil\xF5es", domain: "portellaleiloes.com.br", baseUrl: "https://portellaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "silas", name: "Silas Leiloeiro", domain: "silasleiloeiro.lel.br", baseUrl: "https://www.silasleiloeiro.lel.br", searchUrl: "https://www.silasleiloeiro.lel.br/Principal.asp?at=jd", genericScrape: true, enabled: true },
  { id: "joaoemilio", name: "Jo\xE3o Em\xEDlio Leiloeiro", domain: "joaoemilio.com.br", baseUrl: "https://www.joaoemilio.com.br", searchUrl: "https://www.joaoemilio.com.br/lotes/imovel?tipo=imovel&address_uf=RJ&address_cidade_ibge=3304557", genericScrape: true, enabled: true },
  { id: "facanha", name: "Fa\xE7anha Leil\xF5es", domain: "facanhaleiloes.com.br", baseUrl: "https://facanhaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "jonas", name: "Jonas Leiloeiro", domain: "jonasleiloeiro.com.br", baseUrl: "https://www.jonasleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "fernandoleiloeiro", name: "Fernando Leiloeiro", domain: "fernandoleiloeiro.com.br", baseUrl: "https://www.fernandoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "comprei", name: "Comprei PGFN", domain: "comprei.pgfn.gov.br", baseUrl: "https://comprei.pgfn.gov.br", genericScrape: true, enabled: true },
  { id: "rogeriomenezes", name: "Rog\xE9rio Menezes", domain: "rogeriomenezes.com.br", baseUrl: "https://www.rogeriomenezes.com.br", genericScrape: true, enabled: true },
  { id: "edgardecarvalho", name: "Edgar de Carvalho", domain: "edgardecarvalholeiloeiro.com.br", baseUrl: "https://www.edgardecarvalholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "brame", name: "Brame Leil\xF5es", domain: "brameleiloes.com.br", baseUrl: "https://www.brameleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lancejudicial", name: "Lance Judicial", domain: "lancejudicial.com.br", baseUrl: "https://www.lancejudicial.com.br", genericScrape: true, enabled: true },
  { id: "superbid", name: "Superbid", domain: "superbid.net", baseUrl: "https://www.superbid.net", genericScrape: true, enabled: true },
  { id: "murilochaves_com_br", name: "MURILO CARDOZO CHAVES", domain: "murilochaves.com.br", baseUrl: "https://www.murilochaves.com.br", genericScrape: true, enabled: true },
  { id: "depaulaonline_br", name: "LUIZ TEN\xD3RIO DE PAULA", domain: "depaulaonline.br", baseUrl: "https://www.depaulaonline.br", genericScrape: true, enabled: true },
  { id: "edgarcarvalholeiloeiro_com_br", name: "EDGAR DE CARVALHO JUNIOR", domain: "edgarcarvalholeiloeiro.com.br", baseUrl: "https://www.edgarcarvalholeiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "machadoleiloes_com_br", name: "NORMA MARIA MACHADO", domain: "machadoleiloes.com.br", baseUrl: "https://www.machadoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloeirasilvani_com_br", name: "SILVANI DAS GRA\xC7AS LOPES DIAS", domain: "leiloeirasilvani.com.br", baseUrl: "https://www.leiloeirasilvani.com.br", genericScrape: true, enabled: true },
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
  { id: "gustavoleileiro_com", name: "GUSTAVO PORTELLA LOUREN\xC7O", domain: "gustavoleileiro.com", baseUrl: "https://www.gustavoleileiro.com", genericScrape: true, enabled: true },
  { id: "gustavoleiloeiro_com", name: "GUSTAVO PORTELLA LOUREN\xC7O", domain: "gustavoleiloeiro.com", baseUrl: "https://www.gustavoleiloeiro.com", genericScrape: true, enabled: true },
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
  { id: "marthapadilhaleiloeira_lel_br", name: "MARTHA ISOLDA TEN\xD3RIO PADILHA", domain: "marthapadilhaleiloeira.lel.br", baseUrl: "https://www.marthapadilhaleiloeira.lel.br", genericScrape: true, enabled: true },
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
  { id: "alessandroteixeiraleiloes_com_br", name: "A\xE9cio Reis Pedrosa", domain: "alessandroteixeiraleiloes.com.br", baseUrl: "https://www.alessandroteixeiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ecoleiloes_com_br", name: "Alexandra Benedita de Sousa Casado", domain: "ecoleiloes.com.br", baseUrl: "https://www.ecoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "paivafrade_com_br", name: "Alexandre Paiva Frade", domain: "paivafrade.com.br", baseUrl: "https://www.paivafrade.com.br", genericScrape: true, enabled: true },
  { id: "anandaleiloes_com_br", name: "Ananda Portes Souza", domain: "anandaleiloes.com.br", baseUrl: "https://www.anandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "agilleiloes_com_br", name: "Andr\xE9 Fonseca Dias", domain: "agilleiloes.com.br", baseUrl: "https://www.agilleiloes.com.br", genericScrape: true, enabled: true },
  { id: "yankous_com_br", name: "Andre Luiz Oliveira Yankous", domain: "yankous.com.br", baseUrl: "https://www.yankous.com.br", genericScrape: true, enabled: true },
  { id: "angelabecharaleiloes_com_br", name: "\xC2ngela Assis Oliveira Bechara", domain: "angelabecharaleiloes.com.br", baseUrl: "https://www.angelabecharaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "contatosaraivaleiloes_com_br", name: "Angela Saraiva Portes Souza", domain: "contatosaraivaleiloes.com.br", baseUrl: "https://www.contatosaraivaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "arnaldoleiloes_com_br", name: "Arnaldo Em\xEDlio Colombarolli", domain: "arnaldoleiloes.com.br", baseUrl: "https://www.arnaldoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "bmleiloes_com_br", name: "Breno Augusto Magalh\xE3es da Anuncia\xE7\xE3o", domain: "bmleiloes.com.br", baseUrl: "https://www.bmleiloes.com.br", genericScrape: true, enabled: true },
  { id: "brfleiloes_com_br", name: "Breno C\xE9sar Oliveira Farias", domain: "brfleiloes.com.br", baseUrl: "https://www.brfleiloes.com.br", genericScrape: true, enabled: true },
  { id: "iarremate_com", name: "Bruno Lopes Pereira dos Reis", domain: "iarremate.com", baseUrl: "https://www.iarremate.com", genericScrape: true, enabled: true },
  { id: "tratoforteleiloes_com_br", name: "Bruno Lopes Pereira dos Reis", domain: "tratoforteleiloes.com.br", baseUrl: "https://www.tratoforteleiloes.com.br", genericScrape: true, enabled: true },
  { id: "farialeiloes_com_br", name: "Camila Pires de Oliveira Faria (Licenciada at\xE9 23/10/2027)", domain: "farialeiloes.com.br", baseUrl: "https://www.farialeiloes.com.br", genericScrape: true, enabled: true },
  { id: "purcenaleiloes_com_br", name: "Camila Pires de Oliveira Faria (Licenciada at\xE9 23/10/2027)", domain: "purcenaleiloes.com.br", baseUrl: "https://www.purcenaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "davisonmoreira_com_br", name: "Davison Mauro Moreira", domain: "davisonmoreira.com.br", baseUrl: "https://www.davisonmoreira.com.br", genericScrape: true, enabled: true },
  { id: "leiloeirodenis_com_br", name: "D\xEAnis de Oliveira Fernandes", domain: "leiloeirodenis.com.br", baseUrl: "https://www.leiloeirodenis.com.br", genericScrape: true, enabled: true },
  { id: "dilsonleiloeiro_com", name: "D\xEDlson Marcos Moreira", domain: "dilsonleiloeiro.com", baseUrl: "https://www.dilsonleiloeiro.com", genericScrape: true, enabled: true },
  { id: "emidiomedeirosleiloesgmail_com", name: "Emidio Jos\xE9 Correia de Medeiros", domain: "emidiomedeirosleiloesgmail.com", baseUrl: "https://www.emidiomedeirosleiloesgmail.com", genericScrape: true, enabled: true },
  { id: "contatoemidiomedeirosleiloes_com_br", name: "Emidio Jos\xE9 Correia de Medeiros", domain: "contatoemidiomedeirosleiloes.com.br", baseUrl: "https://www.contatoemidiomedeirosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "emidiomedeirosleiloes_com_br", name: "Emidio Jos\xE9 Correia de Medeiros", domain: "emidiomedeirosleiloes.com.br", baseUrl: "https://www.emidiomedeirosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "alvesleiloes_com_br", name: "\xC9rica Cristina Alves", domain: "alvesleiloes.com.br", baseUrl: "https://www.alvesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "fabioguimaraesleiloes_com_br", name: "F\xE1bio Guimar\xE3es de Carvalho", domain: "fabioguimaraesleiloes.com.br", baseUrl: "https://www.fabioguimaraesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "nortedeminasleiloes_com_br", name: "F\xE1bio Maciel Amarante", domain: "nortedeminasleiloes.com.br", baseUrl: "https://www.nortedeminasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "francoleiloes_com_br", name: "Fernanda de Mello Franco", domain: "francoleiloes.com.br", baseUrl: "https://www.francoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "messiasleiloes_com_br", name: "Fl\xE1via Figueira Messias", domain: "messiasleiloes.com.br", baseUrl: "https://www.messiasleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloesceruli_com_br", name: "Fl\xE1vio Duarte Ceruli", domain: "leiloesceruli.com.br", baseUrl: "https://www.leiloesceruli.com.br", genericScrape: true, enabled: true },
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
  { id: "simoesleiloes_com_br", name: "Jo\xE3o Sim\xF5es de Almeida J\xFAnior", domain: "simoesleiloes.com.br", baseUrl: "https://www.simoesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "jotafilho87gmail_com", name: "Jorge Jos\xE9 Jo\xE3o Filho", domain: "jotafilho87gmail.com", baseUrl: "https://www.jotafilho87gmail.com", genericScrape: true, enabled: true },
  { id: "tradicaoleiloes_com_br", name: "Jorge Jos\xE9 Jo\xE3o Filho", domain: "tradicaoleiloes.com.br", baseUrl: "https://www.tradicaoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "joserodovalholeiloes_com_br", name: "Jos\xE9 Ant\xF4nio Rodovalho J\xFAnior", domain: "joserodovalholeiloes.com.br", baseUrl: "https://www.joserodovalholeiloes.com.br", genericScrape: true, enabled: true },
  { id: "arquimedesleiloes_com_br", name: "Jos\xE9 Arquimedes C\xE2mara", domain: "arquimedesleiloes.com.br", baseUrl: "https://www.arquimedesleiloes.com.br", genericScrape: true, enabled: true },
  { id: "goldenlance_com_br", name: "Juliana Leles Gripp Amantea", domain: "goldenlance.com.br", baseUrl: "https://www.goldenlance.com.br", genericScrape: true, enabled: true },
  { id: "kanandaleiloes_com_br", name: "Kananda Sofia Silva Macedo", domain: "kanandaleiloes.com.br", baseUrl: "https://www.kanandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leonardoveigaleiloes_com_br", name: "Leonardo Veiga de Jesus Chaves", domain: "leonardoveigaleiloes.com.br", baseUrl: "https://www.leonardoveigaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lincolnleiloes_com_br", name: "Lincoln de Azevedo Fernandes", domain: "lincolnleiloes.com.br", baseUrl: "https://www.lincolnleiloes.com.br", genericScrape: true, enabled: true },
  { id: "lorranaleiloes_com_br", name: "Lorrana Ramos Mendes Gotardo", domain: "lorranaleiloes.com.br", baseUrl: "https://www.lorranaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "du_ze_com", name: "Lucas de Oliveira Mangualde", domain: "du-ze.com", baseUrl: "https://www.du-ze.com", genericScrape: true, enabled: true },
  { id: "londinaleiloes_com_br", name: "Luciana Londina da Silva", domain: "londinaleiloes.com.br", baseUrl: "https://www.londinaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "luisleiloeiro_com_br", name: "Luis Otavio Marcolino Shinkawa", domain: "luisleiloeiro.com.br", baseUrl: "https://www.luisleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "luizlobatoleiloeiro_com_br", name: "Luiz Felipe Perp\xE9tuo Lobato", domain: "luizlobatoleiloeiro.com.br", baseUrl: "https://www.luizlobatoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "luizfernandoborgesrocha1gmail_com", name: "Luiz Fernando Borges Rocha", domain: "luizfernandoborgesrocha1gmail.com", baseUrl: "https://www.luizfernandoborgesrocha1gmail.com", genericScrape: true, enabled: true },
  { id: "luizcampolina_com_br", name: "Luiz Washington Campolina Santos", domain: "luizcampolina.com.br", baseUrl: "https://www.luizcampolina.com.br", genericScrape: true, enabled: true },
  { id: "luizacardosoleiloeira_com_br", name: "Luiza Lima e Silva Mesquita Cardoso", domain: "luizacardosoleiloeira.com.br", baseUrl: "https://www.luizacardosoleiloeira.com.br", genericScrape: true, enabled: true },
  { id: "marcoantonioleiloeiro_com_br", name: "Marco Ant\xF4nio Barbosa de Oliveira Junior", domain: "marcoantonioleiloeiro.com.br", baseUrl: "https://www.marcoantonioleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "mpbmoraisgmail_com", name: "Marcos Paulo Branco de Morais", domain: "mpbmoraisgmail.com", baseUrl: "https://www.mpbmoraisgmail.com", genericScrape: true, enabled: true },
  { id: "saladeleiloes_com_br", name: "Marcos Paulo Branco de Morais", domain: "saladeleiloes.com.br", baseUrl: "https://www.saladeleiloes.com.br", genericScrape: true, enabled: true },
  { id: "leiloarialoucoporleiloes_com_br", name: "Matheus Werneck de Oliveira Santos", domain: "leiloarialoucoporleiloes.com.br", baseUrl: "https://www.leiloarialoucoporleiloes.com.br", genericScrape: true, enabled: true },
  { id: "mozarmirandaleiloes_com_br", name: "Mozar Miranda Almeida", domain: "mozarmirandaleiloes.com.br", baseUrl: "https://www.mozarmirandaleiloes.com.br", genericScrape: true, enabled: true },
  { id: "guilhermeliohotmail_com", name: "Nilson Guilherme Silva Lio", domain: "guilhermeliohotmail.com", baseUrl: "https://www.guilhermeliohotmail.com", genericScrape: true, enabled: true },
  { id: "patricialeiloeira_com_br", name: "Patricia Graciele de Andrade Sousa", domain: "patricialeiloeira.com.br", baseUrl: "https://www.patricialeiloeira.com.br", genericScrape: true, enabled: true },
  { id: "agostinholeiloes_com_br", name: "Paulo C\xE9sar Agostinho", domain: "agostinholeiloes.com.br", baseUrl: "https://www.agostinholeiloes.com.br", genericScrape: true, enabled: true },
  { id: "pauloramosleiloeiro_com_br", name: "Paulo Jos\xE9 da Costa Ramos", domain: "pauloramosleiloeiro.com.br", baseUrl: "https://www.pauloramosleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "jinkingsleiloes_com_br", name: "Pedro Miranda Jinkings", domain: "jinkingsleiloes.com.br", baseUrl: "https://www.jinkingsleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ferreiraleiloes_com_br", name: "Priscilla Lopes Ribeiro Ferreira", domain: "ferreiraleiloes.com.br", baseUrl: "https://www.ferreiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "priscillaferreiraleiloes_com_br", name: "Priscilla Lopes Ribeiro Ferreira", domain: "priscillaferreiraleiloes.com.br", baseUrl: "https://www.priscillaferreiraleiloes.com.br", genericScrape: true, enabled: true },
  { id: "rafaelleiloeiro_com_br", name: "Rafael Ara\xFAjo Gomes", domain: "rafaelleiloeiro.com.br", baseUrl: "https://www.rafaelleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "rvleiloes_com_br", name: "Renata F\xE1tima Veloso", domain: "rvleiloes.com.br", baseUrl: "https://www.rvleiloes.com.br", genericScrape: true, enabled: true },
  { id: "rezendeguimaraes_com_br", name: "Renato Rezende Guimar\xE3es", domain: "rezendeguimaraes.com.br", baseUrl: "https://www.rezendeguimaraes.com.br", genericScrape: true, enabled: true },
  { id: "rodrigoleiloeiro_com_br", name: "Rodrigo Collyer Santos de Oliveira", domain: "rodrigoleiloeiro.com.br", baseUrl: "https://www.rodrigoleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "leiloesuberlandia_com_br", name: "Rodrigo de Oliveira Lopes", domain: "leiloesuberlandia.com.br", baseUrl: "https://www.leiloesuberlandia.com.br", genericScrape: true, enabled: true },
  { id: "rofremleiloes_com_br", name: "Ronald de Freitas Moreira", domain: "rofremleiloes.com.br", baseUrl: "https://www.rofremleiloes.com.br", genericScrape: true, enabled: true },
  { id: "ileiloes_com_br", name: "Rosimeire das Dores Garcia de Castro", domain: "ileiloes.com.br", baseUrl: "https://www.ileiloes.com.br", genericScrape: true, enabled: true },
  { id: "sandrasantosleiloes_com_br", name: "Sandra de F\xE1tima Santos", domain: "sandrasantosleiloes.com.br", baseUrl: "https://www.sandrasantosleiloes.com.br", genericScrape: true, enabled: true },
  { id: "saulojulioleiloeiro_com_br", name: "Saulo J\xFAlio Ribeiro", domain: "saulojulioleiloeiro.com.br", baseUrl: "https://www.saulojulioleiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "bhleiloaria_com_br", name: "S\xE9rgio Sousa Rodrigues", domain: "bhleiloaria.com.br", baseUrl: "https://www.bhleiloaria.com.br", genericScrape: true, enabled: true },
  { id: "sonia_amarallhotmail_com", name: "Sonia Maria do Amaral", domain: "sonia.amarallhotmail.com", baseUrl: "https://www.sonia.amarallhotmail.com", genericScrape: true, enabled: true },
  { id: "ssleiloes_com", name: "Suellen Soares Ribeiro", domain: "ssleiloes.com", baseUrl: "https://www.ssleiloes.com", genericScrape: true, enabled: true },
  { id: "globoleiloes_com_br", name: "Vanderlia de Assis Carvalho Freitas", domain: "globoleiloes.com.br", baseUrl: "https://www.globoleiloes.com.br", genericScrape: true, enabled: true },
  { id: "viniciusbiihrer_leiloesoutlook_com", name: "Vinicius Biihrer", domain: "viniciusbiihrer.leiloesoutlook.com", baseUrl: "https://www.viniciusbiihrer.leiloesoutlook.com", genericScrape: true, enabled: true },
  { id: "vitorcalableiloeiro_com_br", name: "V\xEDtor Calab Nunes", domain: "vitorcalableiloeiro.com.br", baseUrl: "https://www.vitorcalableiloeiro.com.br", genericScrape: true, enabled: true },
  { id: "bolsadeleiloes_com_br", name: "Viviane Garzon Corr\xEAa", domain: "bolsadeleiloes.com.br", baseUrl: "https://www.bolsadeleiloes.com.br", genericScrape: true, enabled: true },
  { id: "wsleiloes_com_br", name: "Wanderson Belmiro dos Reis", domain: "wsleiloes.com.br", baseUrl: "https://www.wsleiloes.com.br", genericScrape: true, enabled: true },
  { id: "validator_w3_org", name: "10 Atualiza\xE7\xE3o da Pol\xEDtica de Privacidade", domain: "validator.w3.org", baseUrl: "https://www.validator.w3.org", genericScrape: true, enabled: true },
  { id: "jigsaw_w3_org", name: "10 Atualiza\xE7\xE3o da Pol\xEDtica de Privacidade", domain: "jigsaw.w3.org", baseUrl: "https://www.jigsaw.w3.org", genericScrape: true, enabled: true },
  { id: "acesso_umic_pt", name: "10 Atualiza\xE7\xE3o da Pol\xEDtica de Privacidade", domain: "acesso.umic.pt", baseUrl: "https://www.acesso.umic.pt", genericScrape: true, enabled: true },
  { id: "submitexpress_com", name: "10 Atualiza\xE7\xE3o da Pol\xEDtica de Privacidade", domain: "submitexpress.com", baseUrl: "https://www.submitexpress.com", genericScrape: true, enabled: true },
  { id: "sebraemg_com_br", name: "Ordem de Tabula\xE7\xE3o (Tab)", domain: "sebraemg.com.br", baseUrl: "https://www.sebraemg.com.br", genericScrape: true, enabled: true },
  { id: "instagram_com", name: "Ordem de Tabula\xE7\xE3o (Tab)", domain: "instagram.com", baseUrl: "https://www.instagram.com", genericScrape: true, enabled: true },
  { id: "youtube_com", name: "Ordem de Tabula\xE7\xE3o (Tab)", domain: "youtube.com", baseUrl: "https://www.youtube.com", genericScrape: true, enabled: true },
  { id: "btcw_maxbot_com_br", name: "Ordem de Tabula\xE7\xE3o (Tab)", domain: "btcw.maxbot.com.br", baseUrl: "https://www.btcw.maxbot.com.br", genericScrape: true, enabled: true },
  { id: "wa_me", name: "Ordem de Tabula\xE7\xE3o (Tab)", domain: "wa.me", baseUrl: "https://www.wa.me", genericScrape: true, enabled: true }
];
function normalizeStr(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function parseType(text) {
  const norm = normalizeStr(text);
  if (norm.includes("apartamento") || norm.includes("apto") || norm.includes("studio") || norm.includes("cobertura") || norm.includes("flat")) {
    return "Apartamento";
  }
  if (norm.includes("casa") || norm.includes("sobrado") || norm.includes("vila")) {
    return "Casa";
  }
  if (norm.includes("terreno") || norm.includes("lote") || norm.includes("gleba")) {
    return "Terreno";
  }
  if (norm.includes("comercial") || norm.includes("sala") || norm.includes("loja") || norm.includes("galp") || norm.includes("predio") || norm.includes("pr\xE9dio")) {
    return "Comercial";
  }
  return "Apartamento";
}
function detectBankOrJudicial(text) {
  const norm = normalizeStr(text);
  if (/\bextrajudicial\b|aliena[cç][aã]o fiduci[aá]ria/.test(norm)) return { origin: "extrajudicial" };
  if (norm.includes("santander")) return { origin: "extrajudicial", bank: "Santander" };
  if (norm.includes("itau") || norm.includes("ita\xFA")) return { origin: "extrajudicial", bank: "Ita\xFA" };
  if (norm.includes("bradesco")) return { origin: "extrajudicial", bank: "Bradesco" };
  if (norm.includes("caixa")) return { origin: "extrajudicial", bank: "Caixa" };
  if (/\bbanco inter\b/.test(norm)) return { origin: "extrajudicial", bank: "Banco Inter" };
  if (/\bbanco pan\b/.test(norm)) return { origin: "extrajudicial", bank: "Banco Pan" };
  if (norm.includes("safra")) return { origin: "extrajudicial", bank: "Safra" };
  if (norm.includes("banco do brasil")) return { origin: "extrajudicial", bank: "Banco do Brasil" };
  if (/\b(?:comitente|vendedor|credor)\s*:?\s*banco\b/.test(norm)) {
    return { origin: "extrajudicial", bank: "Institui\xE7\xE3o Financeira" };
  }
  if (norm.includes("vara") || norm.includes("judicial") || norm.includes("falencia") || norm.includes("fal\xEAncia") || norm.includes("execucao") || norm.includes("execu\xE7\xE3o") || norm.includes("civel") || norm.includes("c\xEDvel") || norm.includes("trabalho") || norm.includes("trt") || norm.includes("tj")) {
    return { origin: "judicial" };
  }
  return { origin: "judicial" };
}
function extractAddress(text, fallback) {
  const lines = text.split(/\r?\n|\s{2,}/).map((line) => line.trim()).filter(Boolean);
  const labeledLine = lines.find(
    (line) => /\bendere[cç]o\b/i.test(line) && !/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b/i.test(line) && /\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(line)
  );
  if (labeledLine) {
    const labeledAddress = labeledLine.replace(/^.*?\bendere[cç]o(?:\s+cf\.?\s+auto\s+de\s+penhora)?\s*:?\s*/i, "").split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+/g, " ").trim();
    if (labeledAddress.length >= 8) return labeledAddress.slice(0, 180);
  }
  const addressCandidates = lines.map((line, index) => {
    if (!/\b(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,}/i.test(line)) return null;
    const context = `${lines[index - 1] || ""} ${line}`;
    let score = 0;
    if (/im[oó]vel|\bbem\b|auto\s+de\s+avalia[cç][aã]o|auto\s+de\s+penhora|situad[oa]|localizad[oa]|objeto\s+do\s+leil[aã]o|matr[ií]cula/i.test(context)) score += 8;
    if (/n[ºo°]?\s*\d+|,\s*\d+/.test(line)) score += 3;
    if (/leiloeir|escrit[oó]rio|correio\s+eletr[oô]nico|telefone|\btel\.?\b|sala\s+40[234]/i.test(context)) score -= 10;
    return { line, score, index };
  }).filter((candidate) => !!candidate).sort((a, b) => b.score - a.score || a.index - b.index);
  const addressLine = addressCandidates[0]?.line;
  if (addressLine) {
    const extracted = addressLine.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\s+.{3,180}/i)?.[0] || addressLine;
    return extracted.split(/\b(?:matr[ií]cula|descri[cç][aã]o|consta|avaliado|processo|vara|ressalvas|penhora|devidamente|inscri[cç][aã]o)\b/i)[0].replace(/\s+(?:bairro|cidade|estado)\s*[:\-].*$/i, "").trim();
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const addressMatch = normalized.match(/(?:rua|r\.?|avenida|av\.?|estrada|travessa|alameda|rodovia|largo)\s+[^|;]{3,120}/i);
  return addressMatch ? addressMatch[0].replace(/\s{2,}/g, " ").trim() : fallback;
}
function extractDeclaredCity(text, state) {
  const escapedState = state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\bcidade\\s*:\\s*([^\\n/]{2,50})\\s*/\\s*${escapedState}\\b`, "i"),
    new RegExp(`\\bmunic[i\xED]pio\\s+de\\s+([^,.;/\\n-]{2,50})\\s*[-/]\\s*${escapedState}\\b`, "i"),
    new RegExp(`\\b(Juiz de Fora|Niter[o\xF3]i|Rio de Janeiro|Belo Horizonte|S[a\xE3]o Paulo|Santos|Campinas)\\s*[-/]\\s*${escapedState}\\b`, "i"),
    new RegExp(`\\b(Juiz de Fora|Niter[o\xF3]i|Belo Horizonte|Rio de Janeiro)\\b`, "i")
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}
function extractAuctionDates(text) {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/g)].map((match) => `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  return { first: dates[0], second: dates.find((date) => date !== dates[0]) };
}
function extractMinimumBid(text) {
  const initial = text.match(/valor\s+inicial\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (initial) return parseBrazilianMoney(initial[1]);
  const values = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)].map((match) => Number(match[1].replace(/\./g, "").replace(",", "."))).filter((value) => Number.isFinite(value) && value > 0);
  return values.length > 0 ? Math.round(Math.min(...values)) : 0;
}
function extractAppraisal(text) {
  const match = text.match(/valor\s+(?:de\s+)?avalia[cç][aã]o\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (!match) return void 0;
  const value = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : void 0;
}
function extractSaleMode(text) {
  const normalized = normalizeStr(text);
  if (normalized.includes("aceita proposta") || normalized.includes("recebe proposta")) return "Aceita Propostas";
  if (normalized.includes("venda direta")) return "Venda Direta";
  if (normalized.includes("licitacao aberta") || normalized.includes("licita\xE7\xE3o aberta")) return "Licita\xE7\xE3o Aberta";
  if (normalized.includes("leilao sfi") || normalized.includes("leil\xE3o sfi")) return "Leil\xE3o SFI";
  return "Leil\xE3o Online";
}
function parseBrazilianMoney(value) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}
function extractFinancialTerms(text) {
  const normalized = normalizeStr(text).replace(/\s+/g, " ");
  const deniesFinancing = /(?:nao\s+(?:aceita|admite|permite)|sem)\s+financiamento|pagamento\s+exclusivamente\s+a\s+vista/.test(normalized);
  const allowsFinancing = !deniesFinancing && /(?:aceita|admite|permite|possibilidade\s+de|podera\s+ser)\s+(?:o\s+)?financiamento|financiamento\s+(?:bancario|imobiliario|habitacional)/.test(normalized);
  const allowsInstallments = /(?:parcelamento|parcelado|pagamento\s+em\s+ate\s+\d+\s+parcelas|\d+\s+parcelas)/.test(normalized) && !/(?:nao\s+(?:aceita|admite|permite)|sem)\s+parcelamento/.test(normalized);
  const installmentMatch = normalized.match(/(?:ate\s+)?(\d{1,3})\s+parcelas/);
  const entryMatch = normalized.match(/(?:entrada|sinal)[^%]{0,50}(\d{1,3}(?:[.,]\d+)?)\s*%/) || normalized.match(/(\d{1,3}(?:[.,]\d+)?)\s*%[^.]{0,40}(?:entrada|sinal)/);
  const sellerClearsDebts = /(?:debitos?|dividas?|condominio|iptu)[^.]{0,160}(?:quitad[oa]s?|por\s+conta|responsabilidade)[^.]{0,80}(?:vendedor|credor|banco|alienante)|(?:vendedor|credor|banco|alienante)[^.]{0,100}(?:quitara|assumira|responsavel)[^.]{0,80}(?:debitos?|dividas?|condominio|iptu)/.test(normalized);
  const iptuMatch = text.match(/(?:IPTU|tributos?\s+municipais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  const condoMatch = text.match(/(?:condom[ií]nio|cotas?\s+condominiais?)[^R$\n]{0,80}R\$\s*([\d.]+(?:,\d{2})?)/i);
  let paymentTerms = "Condi\xE7\xE3o de pagamento n\xE3o confirmada na fonte";
  if (allowsFinancing) paymentTerms = "Financiamento permitido conforme fonte do lote";
  else if (allowsInstallments) paymentTerms = installmentMatch ? `Parcelamento em at\xE9 ${installmentMatch[1]} parcelas` : "Parcelamento permitido conforme fonte do lote";
  else if (deniesFinancing || /(?:somente|apenas|exclusivamente)\s+a\s+vista/.test(normalized)) paymentTerms = "Somente \xE0 vista";
  return {
    allowsFinancing,
    allowsInstallments,
    paymentTerms,
    maxInstallments: allowsInstallments && installmentMatch ? Number(installmentMatch[1]) : void 0,
    minDownpaymentPercent: entryMatch ? Number(entryMatch[1].replace(",", ".")) : void 0,
    pendingIptuCost: sellerClearsDebts ? 0 : iptuMatch ? parseBrazilianMoney(iptuMatch[1]) : void 0,
    pendingCondoCost: sellerClearsDebts ? 0 : condoMatch ? parseBrazilianMoney(condoMatch[1]) : void 0
  };
}
function hasAuditableAddress(address) {
  return /\b(?:rua|avenida|av\.?|estrada|travessa|alameda|rodovia|largo|pra[cç]a)\b/i.test(address || "") && /\d/.test(address || "");
}
async function extractOfficialDocumentText(page, documentUrl) {
  try {
    if (Date.now() < documentOcrPausedUntil) return "";
    if (!/^https?:\/\//i.test(documentUrl)) return "";
    let base64 = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return "";
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 15 * 1024 * 1024) return "";
      if (String.fromCharCode(...bytes.subarray(0, 4)) !== "%PDF") return "";
      let binary = "";
      const chunkSize = 32768;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }, documentUrl).catch(() => "");
    if (!base64) {
      const response = await fetch(documentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          Referer: page.url()
        },
        signal: AbortSignal.timeout(15e3)
      });
      if (!response.ok) return "";
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 15 * 1024 * 1024 || buffer.subarray(0, 4).toString("ascii") !== "%PDF") return "";
      base64 = buffer.toString("base64");
    }
    if (!base64) return "";
    const text = await readRegistryPdf(new Uint8Array(Buffer.from(base64, "base64")));
    const letters = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    return text.length >= 50 && letters / text.length >= 0.35 ? text : "";
  } catch (error) {
    if (/429|quota|RESOURCE_EXHAUSTED/i.test(String(error?.message || ""))) {
      documentOcrPausedUntil = Date.now() + 60 * 60 * 1e3;
      console.warn("[Auctioneer Docs] OCR pausado por 1 hora ap\xF3s limite do provedor; a varredura dos portais continuar\xE1 sem novas chamadas de OCR.");
      return "";
    }
    console.warn(`[Auctioneer Docs] Documento n\xE3o p\xF4de ser lido (${documentUrl}): ${error.message}`);
    return "";
  }
}
async function enrichLotDetails(browser, draft) {
  let detailPage = null;
  try {
    detailPage = await browser.newPage();
    await detailPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
    await detailPage.goto(draft.auctionLink, { waitUntil: "domcontentloaded", timeout: 2e4 });
    await detailPage.waitForNetworkIdle({ idleTime: 500, timeout: 6e3 }).catch(() => void 0);
    const detailData = await detailPage.evaluate(() => {
      const links = /* @__PURE__ */ new Set();
      document.querySelectorAll("a, iframe, embed").forEach((element) => {
        const href = element.getAttribute("href") || element.getAttribute("src") || "";
        const onclick = element.getAttribute("onclick") || "";
        const candidates = [href, ...onclick.match(/https?:\/\/[^'"\s)]+|[^'"\s)]+\.pdf(?:\?[^'"\s)]*)?/gi) || []];
        for (const candidate of candidates) {
          if (!candidate || !/(?:matr[ií]cula|certid[aã]o|\.pdf(?:\?|$))/i.test(candidate)) continue;
          try {
            const resolved = new URL(candidate, location.href);
            if (/^https?:$/i.test(resolved.protocol)) links.add(resolved.href);
          } catch {
          }
        }
      });
      const normalizeValue = (value) => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
      const addresses = [];
      const sizes = [];
      const visitJson = (value) => {
        if (!value) return;
        if (Array.isArray(value)) return value.forEach(visitJson);
        if (typeof value !== "object") return;
        const address = value.address;
        if (typeof address === "string") addresses.push(normalizeValue(address));
        else if (address && typeof address === "object") {
          const formatted = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode].map(normalizeValue).filter(Boolean).join(", ");
          if (formatted) addresses.push(formatted);
        }
        const floorValue = value.floorSize?.value ?? value.area?.value ?? value.floorSize;
        const numericFloor = Number(String(floorValue ?? "").replace(",", "."));
        if (Number.isFinite(numericFloor) && numericFloor > 0) sizes.push(numericFloor);
        Object.values(value).forEach(visitJson);
      };
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          visitJson(JSON.parse(script.textContent || "null"));
        } catch {
        }
      });
      const addressSelectors = '[itemprop="streetAddress"], [itemprop="address"], [data-testid*="address" i], [class*="endereco" i], [class*="address" i]';
      document.querySelectorAll(addressSelectors).forEach((element) => {
        const value = normalizeValue(element.innerText || element.getAttribute("content"));
        if (value) addresses.push(value);
      });
      document.querySelectorAll('a[href*="google.com/maps"], a[href*="maps.google"], iframe[src*="maps"]').forEach((element) => {
        const raw = element.getAttribute("href") || element.getAttribute("src") || "";
        try {
          const url = new URL(raw, location.href);
          const mapAddress = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("destination");
          if (mapAddress && !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(mapAddress)) addresses.push(normalizeValue(mapAddress));
        } catch {
        }
      });
      return { text: document.body?.innerText || "", title: document.querySelector("h1")?.textContent || "", image: document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "", documentLinks: Array.from(links), structuredAddresses: addresses, structuredSizes: sizes };
    });
    let officialDocumentText = "";
    let matriculaText = draft.matriculaText || "";
    let matriculaUrl = draft.matriculaUrl;
    if (detailData.documentLinks.length > 0) {
      const orderedLinks = detailData.documentLinks.sort((a, b) => {
        const priority = (url) => /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url) ? 0 : 1;
        return priority(a) - priority(b);
      });
      const needsDocumentAddress = !hasAuditableAddress(extractAddress(detailData.text, ""));
      const usefulLinks = orderedLinks.filter((url) => needsDocumentAddress || /matr[ií]cula|certid[aã]o|\brgi\b/i.test(url));
      for (const documentUrl of usefulLinks.slice(0, 3)) {
        const extracted = await extractOfficialDocumentText(detailPage, documentUrl);
        if (extracted) officialDocumentText += `
${extracted}`;
        if (extracted && /matr[ií]cula|certid[aã]o|\brgi\b/i.test(documentUrl)) {
          matriculaText = extracted;
          matriculaUrl = documentUrl;
        }
      }
    }
    const lotText = detailData.text.split(/(?:EDITAL DE LEILÃO CONDICIONAL|Outros lotes|Lotes relacionados|Você também pode|Veja também)/i)[0];
    const combinedText = lotText;
    const financialTerms = extractFinancialTerms(combinedText);
    const sellerSection = combinedText.match(/comitente\s*:?\s*([^\n]+(?:\n[^\n]+)?)/i)?.[1] || "";
    const classification = detectBankOrJudicial(sellerSection || combinedText);
    const dates = extractAuctionDates(combinedText);
    const sizeMatch = combinedText.match(/[aá]rea\s+(?:privativa(?:\s*\/\s*edificada)?|edificada|[uú]til|constru[ií]da)\s*(?:de\s+)?[:=]?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i) || combinedText.match(/(\d+(?:[.,]\d+)?)\s*m[²2]\s*(?:de\s+)?[aá]rea\s+privativa/i) || combinedText.match(/(?:metragem|[aá]rea\s+do\s+im[oó]vel)\s*:?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const structuredSize = detailData.structuredSizes.find((value) => value >= 10 && value <= 5e3) || 0;
    const headlineArea = detailData.title.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
    const detailedSize = (sizeMatch ? Number(sizeMatch[1].replace(",", ".")) : 0) || (headlineArea ? Number(headlineArea[1].replace(",", ".")) : 0) || structuredSize;
    const structuredAddress = detailData.structuredAddresses.map((value) => extractAddress(value, "")).find((value) => hasAuditableAddress(value) && !/leiloeir|escrit[oó]rio|telefone|contato/i.test(value));
    const textAddress = extractAddress(combinedText, "") || extractAddress(matriculaText, "");
    const verifiedAddress = (hasAuditableAddress(textAddress) ? textAddress : "") || structuredAddress;
    const detailedMinimumBid = extractMinimumBid(combinedText);
    const enrichedDescription = combinedText.trim().slice(0, 3e4);
    return {
      ...draft,
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
      auctionDate: dates.first || draft.auctionDate,
      firstAuctionDate: dates.first || draft.firstAuctionDate,
      secondAuctionDate: dates.second || draft.secondAuctionDate,
      saleMode: extractSaleMode(combinedText || draft.description || ""),
      ...financialTerms,
      description: enrichedDescription || draft.description
    };
  } catch (err) {
    console.warn(`[Auctioneer Sync] N\xE3o foi poss\xEDvel abrir o lote ${draft.auctionLink}: ${err.message}`);
    return draft;
  } finally {
    if (detailPage) await detailPage.close().catch(() => void 0);
  }
}
async function collectListingPages(page, read) {
  const lots = /* @__PURE__ */ new Map();
  const visited = /* @__PURE__ */ new Set();
  const snapshots = /* @__PURE__ */ new Set();
  const pending = [];
  const startUrl = page.url();
  const report = { startUrl, checkedAt: (/* @__PURE__ */ new Date()).toISOString(), pages: 0, found: 0, navigationExhausted: false, error: "" };
  try {
    while (true) {
      const rows2 = await read();
      const snapshot = page.url() + "|" + rows2.map((row) => row.link).sort().join("|");
      if (snapshots.has(snapshot)) {
        report.error = "A navega\xE7\xE3o repetiu a mesma p\xE1gina; cobertura n\xE3o confirmada.";
        break;
      }
      snapshots.add(snapshot);
      visited.add(page.url());
      report.pages++;
      for (const row of rows2) if (row.link) lots.set(row.link, row);
      const navigation = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a[href]"));
        const available = (el) => !el.closest('.disabled, [aria-disabled="true"]') && !el.disabled;
        const next2 = links.find((a) => available(a) && (a.rel === "next" || /^(pr[oó]xim[ao]|seguinte|next|›|»|>)$/i.test((a.innerText || a.getAttribute("aria-label") || "").trim())));
        const children = links.filter((a) => /\/leilao\/\d+(?:\/lotes)?(?:\?|$)|\/agenda(?:\?|$)|\/busca(?:\?|$)/i.test(a.href)).map((a) => a.href);
        return { next: next2?.href || "", children };
      });
      pending.push(...navigation.children.filter((url) => !visited.has(url) && !pending.includes(url) && new URL(url).origin === new URL(page.url()).origin));
      let next = navigation.next && !visited.has(navigation.next) ? navigation.next : "";
      if (!next) {
        const clicked = await page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => !el.closest('.disabled, [aria-disabled="true"]') && !el.disabled && /^(carregar mais|mostrar mais|ver mais|load more|pr[oó]xim[ao]|seguinte|next)(?:\s+(?:im[oó]veis|lotes|an[uú]ncios|resultados))?$/i.test((el.textContent || el.getAttribute("aria-label") || "").trim()));
          if (!button) return false;
          button.click();
          return true;
        });
        if (clicked) {
          await page.waitForNetworkIdle({ idleTime: 750, timeout: 15e3 }).catch(() => void 0);
          continue;
        }
        next = pending.find((url) => !visited.has(url)) || "";
      }
      if (!next) {
        report.navigationExhausted = true;
        break;
      }
      if (new URL(next).origin !== new URL(startUrl).origin) {
        report.error = "Pagina\xE7\xE3o mudou de dom\xEDnio.";
        break;
      }
      await page.goto(next, { waitUntil: "domcontentloaded", timeout: 25e3 });
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 6e3 }).catch(() => void 0);
    }
  } catch (error) {
    report.error = error.message;
  } finally {
    report.found = lots.size;
    fs.mkdirSync("sync-audits/pages", { recursive: true });
    const name = new URL(startUrl).hostname.replace(/[^a-z0-9.-]/gi, "_");
    fs.writeFileSync("sync-audits/pages/" + name + "-" + Date.now() + ".json", JSON.stringify(report, null, 2));
  }
  return [...lots.values()];
}
async function scrapeConfiguredAuctioneers(targetType, state = "RJ", city = "Rio de Janeiro") {
  const configs = AUCTIONEER_PORTALS.filter((portal) => portal.enabled && !["megaleiloes", "frazao", "biasi"].includes(portal.id));
  const results = [];
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
    });
    let cursor = 0;
    const worker = async () => {
      while (cursor < configs.length) {
        const config = configs[cursor++];
        let page = null;
        try {
          page = await browser.newPage();
          await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
          await page.setRequestInterception(true);
          page.on("request", (request) => {
            const type = request.resourceType();
            if (type === "media" || type === "font") request.abort();
            else request.continue();
          });
          const searchUrl = new URL(config.searchUrl || config.baseUrl);
          if (searchUrl.searchParams.has("address_uf")) {
            searchUrl.searchParams.set("address_uf", state);
            const cityCodes = { "rio de janeiro": "3304557", "niteroi": "3303302", "juiz de fora": "3136702" };
            const cityCode = cityCodes[normalizeStr(city)];
            if (cityCode) searchUrl.searchParams.set("address_cidade_ibge", cityCode);
            else searchUrl.searchParams.delete("address_cidade_ibge");
          }
          const url = searchUrl.href;
          console.log(`[Auctioneer Generic] Acessando ${config.name}: ${url}`);
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 18e3 });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const rawLots = await collectListingPages(page, () => page.evaluate(() => {
            const propertyWords = /\b(im[oó]vel|apartamento|apto|casa|terreno|lote|sala|loja|galp[aã]o|pr[eé]dio|cobertura)\b/i;
            const priceWords = /R\$\s*[\d.]+(?:,\d{2})?/i;
            const ignored = /(?:login|entrar|cadastro|contato|quem somos|pol[ií]tica|termos)/i;
            const seen = /* @__PURE__ */ new Set();
            const lots = [];
            for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
              const link = anchor.href || "";
              if (!link || seen.has(link) || ignored.test(link) || new URL(link).origin !== location.origin || /\/leilao\/\d+\/lotes(?:\?|$)/.test(link)) continue;
              const container = anchor.closest('article, [class*="card"], [class*="lote"], [class*="lot"], [class*="item"], li') || anchor;
              const text = (container.innerText || anchor.innerText || "").replace(/\s+/g, " ").trim();
              if (text.length < 20 || !propertyWords.test(text)) continue;
              const bidMatches = [...text.matchAll(/lance\s+(?:inicial|m[ií]nimo)(?:\s+\d+[ªºo]?\s*(?:leil[aã]o|pra[cç]a))?\s*:?\s*R\$\s*([\d.]+(?:,\d{2})?)/gi)];
              const fallbackPrice = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
              const sizeMatch = text.match(/(\d+(?:[.,]\d+)?)\s*m[²2]/i);
              const bidValues = bidMatches.map((match) => Number(match[1].replace(/\./g, "").replace(",", "."))).filter((value) => Number.isFinite(value) && value > 0);
              const price = bidValues.length > 0 ? Math.round(Math.min(...bidValues)) : fallbackPrice ? Math.round(Number(fallbackPrice[1].replace(/\./g, "").replace(",", "."))) : 0;
              const size = sizeMatch ? Math.round(Number(sizeMatch[1].replace(",", "."))) : 0;
              if (!/\/(?:item|lote|leilao|imoveis|imovel|eventos|anuncio|auction)/i.test(new URL(link).pathname)) continue;
              const image = container.querySelector("img");
              seen.add(link);
              lots.push({ text, link, img: image?.src || "", price, size });
            }
            return lots;
          }));
          for (const raw of rawLots) {
            const cityNorm = normalizeStr(city);
            const detection = detectBankOrJudicial(raw.text);
            const lines = raw.text.split(/\s{2,}|\n/).map((line) => line.trim()).filter(Boolean);
            const title = lines.find((line) => /im[oó]vel|apartamento|casa|terreno|sala|loja|galp[aã]o|pr[eé]dio|cobertura/i.test(line)) || raw.text.slice(0, 140);
            const dates = extractAuctionDates(raw.text);
            const neighborhoodMatch = raw.text.match(/(?:bairro|em|no|na)\s+([A-Za-zÀ-ÿ\s]{3,35})(?:\s*[-,/]\s*(?:RJ|MG|SP|Rio de Janeiro|Juiz de Fora|Belo Horizonte|Niter[oó]i)|\s+-)/i);
            const draft = {
              portalId: config.id,
              auctioneerName: config.name,
              title,
              address: extractAddress(raw.text, ""),
              neighborhood: neighborhoodMatch?.[1]?.trim() || "",
              city,
              state,
              propertyType: parseType(raw.text),
              sizeSqm: raw.size,
              auctionPrice: raw.price,
              auctionDate: dates.first || "",
              firstAuctionDate: dates.first,
              secondAuctionDate: dates.second,
              auctionLink: raw.link,
              imageUrl: raw.img,
              description: raw.text.slice(0, 500),
              saleMode: extractSaleMode(raw.text),
              origin: targetType,
              sellerBank: detection.bank
            };
            const enriched = await enrichLotDetails(browser, draft);
            const combinedEvidence = `${enriched.description || ""}
${raw.text}`;
            const finalDetection = detectBankOrJudicial(combinedEvidence);
            if (finalDetection.origin !== targetType) continue;
            const declaredCity = extractDeclaredCity(combinedEvidence, state) || (normalizeStr(combinedEvidence).includes(cityNorm) ? city : "");
            if (!declaredCity || normalizeStr(declaredCity) !== cityNorm) continue;
            results.push({
              ...enriched,
              city: declaredCity,
              sellerBank: finalDetection.bank || detection.bank,
              address: hasAuditableAddress(enriched.address) ? enriched.address : "Endere\xE7o em extra\xE7\xE3o documental - matr\xEDcula ou edital n\xE3o disponibilizado pelo portal"
            });
          }
        } catch (err) {
          console.warn(`[Auctioneer Generic] ${config.name} indispon\xEDvel: ${err.message}`);
        } finally {
          if (page) await page.close().catch(() => void 0);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, configs.length) }, () => worker()));
  } finally {
    if (browser) await browser.close().catch(() => void 0);
  }
  return results;
}

// scripts/audit-franco.ts
for (const portal of AUCTIONEER_PORTALS) portal.enabled = portal.domain === "francoleiloes.com.br";
var rows = await scrapeConfiguredAuctioneers("judicial", "RJ", "Rio de Janeiro");
var allowed = rows.filter((row) => {
  const p = declaredAuctionLocation(row);
  return !p || p.state === "RJ" && p.city === "Rio de Janeiro";
});
fs2.writeFileSync("sync-audits/franco-location-validation.json", JSON.stringify({ checkedAt: (/* @__PURE__ */ new Date()).toISOString(), scraped: rows.length, allowed: allowed.length, rows: rows.map((row) => ({ title: row.title, link: row.auctionLink, declared: declaredAuctionLocation(row) })) }, null, 2));
console.log(JSON.stringify({ scraped: rows.length, allowed: allowed.length }));
