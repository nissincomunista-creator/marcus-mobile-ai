import puppeteer from 'puppeteer';
import { readRegistryPdf } from '../documentTextService.ts';
import { PDFParse } from 'pdf-parse';

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto('https://venda-imoveis.caixa.gov.br/sistema/detalhe-imovel.asp?hdnimovel=1555528060621', { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    // Fetch matrícula
    const matBase64 = await page.evaluate(async () => {
      try {
        const res = await fetch('/editais/matricula/RJ/1555528060621.pdf');
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      } catch (e: any) {
        return null;
      }
    });

    // Fetch edital
    const editalBase64 = await page.evaluate(async () => {
      try {
        const res = await fetch('/editais/EA00330326CPVERE.PDF');
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      } catch (e: any) {
        return null;
      }
    });

    console.log('Matrícula base64 length:', matBase64?.length);
    console.log('Edital base64 length:', editalBase64?.length);

    if (matBase64) {
      const matBuf = Buffer.from(matBase64, 'base64');
      const matText = await readRegistryPdf(new Uint8Array(matBuf));
      console.log('Matrícula text length:', matText.length, 'preview:', matText.slice(0, 200));
    }

    if (editalBase64) {
      const editalBuf = Buffer.from(editalBase64, 'base64');
      const parser = new PDFParse({ data: new Uint8Array(editalBuf) });
      const res = await parser.getText();
      console.log('Edital text length:', res.text.length, 'preview:', res.text.slice(0, 200));
      await parser.destroy();
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

