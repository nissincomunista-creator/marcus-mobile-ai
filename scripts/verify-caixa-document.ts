import puppeteer from 'puppeteer';
import 'dotenv/config';
import { readRegistryPdf } from '../documentTextService.ts';
import { auditRegistryText } from '../src/utils/registryAudit.ts';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.goto('https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnimovel=1555528060621', { waitUntil: 'domcontentloaded', timeout: 20000 });
  const encoded = await page.evaluate(async () => {
    const response = await fetch('/editais/matricula/RJ/1555528060621.pdf');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  const text = await readRegistryPdf(new Uint8Array(Buffer.from(encoded, 'base64')));
  const audit = auditRegistryText(text);
  console.log(JSON.stringify({ characters: text.length, registry: audit.matriculaNumber, findings: audit.gravames.map(item => ({ code: item.code, type: item.type })), qualifications: audit.pontosApurados.slice(0, 3) }, null, 2));
} finally { await browser.close(); }
