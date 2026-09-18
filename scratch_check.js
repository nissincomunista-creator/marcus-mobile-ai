import * as cheerio from 'cheerio';

async function testFetch() {
  try {
    const res = await fetch('https://www.leilaoimovel.com.br/imoveis/sp/sao-paulo');
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('HTML Length:', html.length);
    
    const $ = cheerio.load(html);
    console.log('Title:', $('title').text());
    
    // Let's print some elements to find the class names of cards
    // Usually they use standard elements or JSON-LD!
    // Let's look for script tags with type="application/ld+json" or class names
    $('script[type="application/ld+json"]').each((i, el) => {
      console.log(`JSON-LD ${i}:`, $(el).html()?.substring(0, 300));
    });

    const cards = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && (href.includes('/imovel/') || href.includes('/lote/') || href.includes('leilao'))) {
        cards.push({ text: $(el).text().trim().replace(/\s+/g, ' '), href });
      }
    });
    console.log('Detected potential links:', cards.slice(0, 10));
  } catch(e) {
    console.error('Error fetching:', e);
  }
}

testFetch();
