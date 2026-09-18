import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('/api/itbi/search-online') || line.includes('search-online') || line.includes('searchOnline')) {
    console.log(`${index + 1}: ${line}`);
  }
});
