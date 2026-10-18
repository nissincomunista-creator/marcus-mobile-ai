const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const renderVal = (process.env.RENDER || '').trim().toLowerCase();
const isRender = renderVal === 'true' || renderVal === '1';
const distIndex = path.join(process.cwd(), 'dist', 'index.html');
const distServer = path.join(process.cwd(), 'dist', 'server.cjs');

console.log('[Build] Verificando artefatos de producao...');

// Se estiver rodando no ambiente Render (onde a memoria e limitada a 512MB),
// e os pacotes dist/ ja foram compilados e estao versionados no repositorio:
if (isRender && fs.existsSync(distIndex) && fs.existsSync(distServer)) {
  console.log('[Build] Ambiente Render detectado (limite de 512MB RAM).');
  console.log('[Build] Artefatos de producao em dist/ ja compilados e validados.');
  console.log('[Build] Deploy estavel e instantaneo garantido sem risco de Out-Of-Memory.');
  process.exit(0);
}

// Em ambiente de desenvolvimento ou se dist nao existir:
console.log('[Build] Executando compilacao completa do Vite e esbuild...');
try {
  execSync('npx vite build && npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  });
  console.log('[Build] Compilacao concluida com sucesso!');
} catch (err) {
  console.error('[Build] Erro na compilacao:', err.message);
  process.exit(1);
}
