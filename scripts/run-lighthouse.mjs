import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const DEFAULT_BASE_URL = process.env.LIGHTHOUSE_BASE_URL || 'http://127.0.0.1:8090/';
const DEFAULT_OUTPUT_DIR = process.env.LIGHTHOUSE_OUTPUT_DIR || 'auditorias';
const ONLY_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const EXCLUDED_DIRS = new Set([
  '.git',
  '.github',
  '.claude',
  '.codex',
  '.tmp',
  '.wrangler',
  'assets',
  'node_modules',
  'gas',
  'test-results',
  'auditorias',
]);

const modeOrTarget = process.argv[2] || 'all';
const outputArg = process.argv[3];
const baseUrl = ensureTrailingSlash(DEFAULT_BASE_URL);
const profileRoot = path.resolve(process.cwd(), '.tmp', 'lighthouse-profiles');
const profileDir = path.join(profileRoot, `profile-${Date.now()}-${process.pid}`);

let chrome;
let browser;
let completed = false;

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function routeToUrl(route) {
  if (/^https?:\/\//i.test(route)) return route;
  const normalized = route === '.' || route === './' ? '' : route.replace(/^\.?\//, '');
  return new URL(normalized, baseUrl).toString();
}

function routeToReportName(routeOrUrl) {
  const url = /^https?:\/\//i.test(routeOrUrl) ? new URL(routeOrUrl) : null;
  const rawPath = url ? url.pathname : routeOrUrl;
  const clean = rawPath
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/index\.html$/i, '')
    .replace(/^\/+|\/+$/g, '');
  return `lighthouse-${clean ? clean.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() : 'home'}.html`;
}

function resolveReportPath(target, outputDir) {
  if (!outputArg || modeOrTarget === 'all') {
    return path.resolve(outputDir, routeToReportName(target));
  }

  const outputName = path.basename(outputArg);
  return path.resolve(outputDir, outputName);
}

async function discoverSiteRoutes(dir = process.cwd(), prefix = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const routes = [];

  if (entries.some(entry => entry.isFile() && entry.name.toLowerCase() === 'index.html')) {
    routes.push(prefix || './');
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) continue;
    routes.push(...await discoverSiteRoutes(path.join(dir, entry.name), `${prefix}${entry.name}/`));
  }

  return routes;
}

async function getTargets() {
  if (modeOrTarget === 'all') {
    return (await discoverSiteRoutes()).sort((a, b) => {
      if (a === './') return -1;
      if (b === './') return 1;
      return a.localeCompare(b);
    });
  }

  return [modeOrTarget];
}

async function seedAuth(port, origin) {
  browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${port}`,
  });

  const page = await browser.newPage();
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('mrcl_auth', '1');
    localStorage.setItem('mrcl_auth_ts', String(Date.now()));
  });
  await page.close();
}

async function runAudit(target, outputDir) {
  const targetUrl = routeToUrl(target);
  const reportPath = resolveReportPath(target, outputDir);

  const runnerResult = await lighthouse(targetUrl, {
    port: chrome.port,
    output: 'html',
    onlyCategories: ONLY_CATEGORIES,
    disableStorageReset: true,
    logLevel: 'error',
    chromeFlags: [
      '--headless',
      '--ignore-certificate-errors',
      '--allow-insecure-localhost',
    ],
  });

  if (!runnerResult?.report) {
    throw new Error(`Lighthouse no devolvio un reporte HTML para ${targetUrl}.`);
  }

  const finalUrl = runnerResult.lhr.finalDisplayedUrl || runnerResult.lhr.finalUrl || '';
  if (new URL(finalUrl).pathname.replace(/index\.html$/i, '') !== new URL(targetUrl).pathname.replace(/index\.html$/i, '')) {
    throw new Error(`La auditoria fue redirigida: ${targetUrl} -> ${finalUrl}`);
  }

  const reportHtml = Array.isArray(runnerResult.report)
    ? runnerResult.report.join('\n')
    : runnerResult.report;

  await fs.writeFile(reportPath, reportHtml, 'utf8');

  const scores = Object.fromEntries(
    Object.entries(runnerResult.lhr.categories).map(([key, category]) => [
      key,
      Math.round(Number(category.score || 0) * 100),
    ]),
  );

  console.log(`OK ${targetUrl}`);
  console.log(`   ${reportPath}`);
  console.log(`   ${JSON.stringify(scores)}`);
}

try {
  const targets = await getTargets();
  const outputDir = path.resolve(process.cwd(), DEFAULT_OUTPUT_DIR);
  const authOrigin = new URL(baseUrl).origin;

  await fs.mkdir(profileRoot, { recursive: true });
  await fs.mkdir(profileDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  chrome = await chromeLauncher.launch({
    userDataDir: profileDir,
    chromeFlags: [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--allow-insecure-localhost',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
    ],
  });

  await seedAuth(chrome.port, authOrigin);

  console.log(`Lighthouse targets: ${targets.length}`);
  for (const target of targets) {
    await runAudit(target, outputDir);
  }

  completed = true;
} finally {
  if (browser) {
    await browser.disconnect().catch(() => {});
  }
  if (chrome) {
    try {
      await chrome.kill();
    } catch {
      // Windows a veces bloquea el borrado del perfil temporal; el reporte ya fue escrito.
    }
  }
  await fs.rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }).catch(() => {});
  if (completed) {
    process.exit(0);
  }
}
