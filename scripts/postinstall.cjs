const { execSync } = require('child_process');

const renderVal = (process.env.RENDER || '').trim().toLowerCase();
const isRender = renderVal === 'true' || renderVal === '1';
const skipPuppeteer = (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD || '').trim().toLowerCase() === 'true';

if (isRender || skipPuppeteer) {
  console.log('[Postinstall] Pulando download pesado do Chromium no Render/CI (economia de banda e RAM).');
  process.exit(0);
}

try {
  console.log('[Postinstall] Verificando navegador para ambiente local...');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
} catch (err) {
  console.warn('[Postinstall] Aviso: nao foi possivel instalar Chromium automaticamente (ignorado):', err.message);
  process.exit(0);
}
