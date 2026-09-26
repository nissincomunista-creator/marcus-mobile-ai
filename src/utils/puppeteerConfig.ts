import fs from 'fs';
import path from 'path';
import type { LaunchOptions, Browser } from 'puppeteer';

export function findSystemChromium(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const linuxPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium'
  ];

  const windowsPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];

  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];

  const candidates = process.platform === 'win32' 
    ? windowsPaths 
    : (process.platform === 'darwin' ? macPaths : linuxPaths);

  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      // ignore access check error
    }
  }

  return undefined;
}

export function getPuppeteerLaunchOptions(extraArgs: string[] = []): LaunchOptions {
  const systemChrome = findSystemChromium();
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--no-zygote'
  ];

  const combinedArgs = Array.from(new Set([...baseArgs, ...extraArgs]));

  const options: LaunchOptions = {
    headless: true,
    args: combinedArgs
  };

  if (systemChrome) {
    options.executablePath = systemChrome;
  }

  return options;
}

export async function launchPuppeteer(puppeteerInstance: any, customOptions: Partial<LaunchOptions> = {}): Promise<Browser> {
  const defaultOpts = getPuppeteerLaunchOptions();
  const mergedOpts: LaunchOptions = {
    ...defaultOpts,
    ...customOptions,
    args: Array.from(new Set([...(defaultOpts.args || []), ...(customOptions.args || [])]))
  };

  try {
    return await puppeteerInstance.launch(mergedOpts);
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('Could not find Chrome') || msg.includes('browser was not found')) {
      const fallbackPath = findSystemChromium();
      if (fallbackPath && fallbackPath !== mergedOpts.executablePath) {
        console.warn(`[Puppeteer] Tentando fallback para executável do sistema: ${fallbackPath}`);
        return await puppeteerInstance.launch({
          ...mergedOpts,
          executablePath: fallbackPath
        });
      }
      try {
        console.warn('[Puppeteer] Tentando inicialização via canal chrome...');
        return await puppeteerInstance.launch({
          ...mergedOpts,
          channel: 'chrome' as any
        });
      } catch {
        // Fallback to msedge on windows
        if (process.platform === 'win32') {
          console.warn('[Puppeteer] Tentando inicialização via canal msedge...');
          return await puppeteerInstance.launch({
            ...mergedOpts,
            channel: 'msedge' as any
          });
        }
      }
    }
    throw err;
  }
}
