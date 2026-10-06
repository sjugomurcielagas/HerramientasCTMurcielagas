const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

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
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  let saved = null;
  await page.route('https://murcielagas-reportes-api.sjugomurcielagas.workers.dev/**', async route => {
    const payload = JSON.parse(route.request().postData() || '{}');
    const data = payload.action === 'murcielapp_activar' ? { token: 'a'.repeat(64), nombre: 'Santiago' }
      : payload.action === 'murcielapp_registrarEstimulo' ? (saved = payload, { id: payload.requestId })
      : payload.action === 'murcielapp_miSemana' ? [{ id: saved.requestId, fecha: saved.fecha, tipo: saved.tipo, subtipo: saved.subtipo, duracionMin: saved.duracionMin, sRPE: saved.sRPE }]
      : { nombre: 'Santiago' };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/murcielapp/`);
    await page.getByRole('button', { name: 'Registrar estímulo', exact: true }).first().click();
    assert.equal(await page.getByRole('heading', { name: 'Activar mi acceso' }).isVisible(), true);
    await page.getByLabel('Código de activación').fill('AAAAA-BBBBB-CCCCC-DDDDD');
    await page.getByRole('button', { name: 'Activar', exact: true }).click();
    await page.getByLabel('Minutos').fill('90');
    await page.getByRole('radio', { name: /5 de 10/ }).check();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).last().click();
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    try { await page.getByRole('heading', { name: 'Estímulo registrado' }).waitFor({ state: 'visible', timeout: 3000 }); }
    catch (error) { console.error('save status:', await page.locator('#register-save-status').innerText(), 'payload:', saved); throw error; }
    assert.equal(await page.getByRole('heading', { name: 'Estímulo registrado' }).isVisible(), true);
    assert.equal(saved.duracionMin, 90);
    assert.equal(saved.sRPE, 5);
    await page.getByRole('button', { name: 'Ver Mi semana' }).click();
    await page.locator('#my-week-list li').waitFor({ state: 'visible' });
    assert.match(await page.locator('#my-week-list').innerText(), /1 hora 30 minutos/);
    console.log('MurcielApp UI smoke OK');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
