const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html');
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
  const page = await browser.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/murcielapp/`);
    await page.getByRole('button', { name: 'Ver rutina' }).click();
    await page.getByRole('button', { name: 'Día 1' }).click();
    const dayOne = page.locator('#routine-list');
    assert.match(await dayOne.innerText(), /Trote a 11 km\/h\s+Tiempo\s+10 minutos/);
    assert.match(await dayOne.innerText(), /Entrada en calor a 8,5 km\/h\s+Tiempo\s+5 minutos/);
    await page.locator('#full-other-day').click();
    await page.getByRole('button', { name: 'Día 4' }).click();
    const hipBlock = page.locator('.block-card').filter({ has: page.getByRole('heading', { name: 'Elevaciones de cadera con barra' }) });
    assert.match(await hipBlock.innerText(), /Se combina con Remo serrucho/);
    assert.match(await hipBlock.innerText(), /16 kg/);
    await page.locator('#full-other-day').click();
    await page.locator('#back-to-choice').click();
    await page.getByRole('button', { name: 'Paso a paso' }).click();
    await page.getByRole('button', { name: 'Día 2' }).click();
    await page.locator('#next-step').click();
    assert.match(await page.locator('#step-heading').innerText(), /Bloque 1/);
    await page.locator('#next-step').click();
    assert.match(await page.locator('#step-heading').innerText(), /Bloque 2/);
    await page.locator('#next-step').click();
    assert.match(await page.locator('#step-heading').innerText(), /Bloque 3/);
    await page.locator('#next-step').click();
    assert.match(await page.locator('#step-heading').innerText(), /Bloque 1/);
    assert.match(await page.locator('#round-label').innerText(), /vuelta 2/);
    console.log('MurcielApp routine UI smoke OK');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
