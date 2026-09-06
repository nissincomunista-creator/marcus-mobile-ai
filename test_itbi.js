import http from 'http';

http.get('http://localhost:3000/api/itbi', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const j = JSON.parse(data);
      if (Array.isArray(j)) {
        console.log('BUG: API returning raw array, length:', j.length);
      } else {
        console.log('OK: stats count:', j.stats ? j.stats.length : 0, '| totalCount:', j.totalCount);
      }
    } catch(e) {
      console.log('Parse error, raw:', data.substring(0, 200));
    }
  });
}).on('error', e => console.log('Server offline:', e.message));
