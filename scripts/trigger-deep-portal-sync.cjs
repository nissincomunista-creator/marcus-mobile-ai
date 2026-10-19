const http = require('http');

async function callGarimpar(city, state, neighborhoods) {
  return new Promise((resolve) => {
    console.log(`\n[Deep Sync] Disparando garimpagem profunda para ${city}/${state} (${neighborhoods.join(', ')})...`);
    const payload = JSON.stringify({
      city,
      state,
      neighborhoods,
      transactionType: 'venda'
    });

    const req = http.request('http://localhost:3000/api/garimpar/portais', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin',
        'x-license-key': 'admin',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`[Deep Sync] ${city}: Extraídos ${parsed.count} anúncios (${parsed.newCount || 0} novos inseridos).`);
          resolve(parsed);
        } catch (e) {
          console.log(`[Deep Sync] ${city}: Resposta recebida (HTTP ${res.statusCode}).`);
          resolve({ success: false, raw: data.slice(0, 200) });
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[Deep Sync] ${city} Erro na requisição:`, err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('=== INICIANDO VARREDURA PROFUNDA NOS PORTAIS IMOBILIÁRIOS ===');
  
  // 1. Juiz de Fora
  await callGarimpar('Juiz de Fora', 'MG', ['Centro', 'São Mateus', 'Alto dos Passos']);

  // 2. Niterói
  await callGarimpar('Niterói', 'RJ', ['Icaraí', 'Santa Rosa', 'Centro']);

  // 3. Rio de Janeiro
  await callGarimpar('Rio de Janeiro', 'RJ', ['Barra da Tijuca', 'Recreio dos Bandeirantes', 'Copacabana']);

  console.log('\n=== VARREDURA PROFUNDA CONCLUÍDA COM SUCESSO! ===');
}

run();
