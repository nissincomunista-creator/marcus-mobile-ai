const cheerio = require('cheerio');

async function test() {
  const resp = await fetch('https://moradavirtual.com.br/rj/rio-de-janeiro/pavuna/avenida-pastor-martin-luther-king-jr', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await resp.text();
  const $ = cheerio.load(html);
  console.log('h1:', $('h1').text().substring(0, 100));
  console.log('.mvm-card count:', $('.mvm-card').length);
  $('.mvm-card').each((_, el) => {
    console.log('Card:', $(el).text().replace(/\s+/g, ' ').substring(0, 150));
  });
}

test().catch(console.error);
