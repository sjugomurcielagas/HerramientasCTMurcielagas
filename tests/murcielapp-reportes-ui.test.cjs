const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, before, after } = require('node:test');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
let browser, server, base;
before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });

async function fixture() {
  const context = await browser.newContext({ timezoneId: 'America/Argentina/Buenos_Aires' });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-10-20T18:00:00Z') });
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const rows = [{ id: 'original-1', personaId: 'P1', jugadora: 'Pérez, Ana', fecha: '2026-10-20', tipo: 'tecnico', subtipo: '', duracionMin: 110, sRPE: 5, revision: 0 }];
  const calls = [];
  let failLoad = false;
  await page.route('https://murcielagas-reportes-api.sjugomurcielagas.workers.dev/**', async route => {
    assert.equal(route.request().method(), 'POST');
    const p = JSON.parse(route.request().postData()); calls.push(p);
    let data;
    if (p.action === 'murcielapp_adminSesion') data = { token: 'a'.repeat(64) };
    else if (p.action === 'murcielapp_activar') data = { token: 'b'.repeat(64), nombre: 'Ana' };
    else if (p.action === 'murcielapp_sesion') data = { nombre: 'Ana' };
    else if (p.action === 'murcielapp_miSemana') data = rows.map(r => ({ ...r }));
    else if (p.action === 'murcielapp_editarEstimulo') {
      assert.equal(p.id, 'original-1'); assert.equal(p.revision, rows[0].revision);
      Object.assign(rows[0], { fecha: p.fecha, tipo: p.tipo, subtipo: p.subtipo, duracionMin: p.duracionMin, sRPE: p.sRPE, revision: rows[0].revision + 1 });
      data = { id: p.id, revision: rows[0].revision };
    } else if (p.action === 'murcielapp_eliminarEstimulo') {
      assert.equal(p.revision, rows[0].revision); rows.splice(0); data = { id: p.id };
    } else if (p.action === 'murcielapp_reporteSemanal') {
      assert.equal(p.adminToken, 'a'.repeat(64));
      if (failLoad) { await route.fulfill({ json: { ok: false, error: 'Servicio no disponible.' } }); return; }
      data = { corte: '2026-10-19', actualizado: '2026-10-20T18:00:00Z', registros: rows.filter(r => r.fecha >= p.desde && r.fecha <= p.hasta), plantel: [{ personaId: 'P1', nombre: 'Pérez, Ana' }, { personaId: 'P2', nombre: 'Luna, Eva' }] };
    } else if (p.action === 'site_getContext') data = { ok: true, plantel: [], reportes: { rows: [] } };
    else data = {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
  });
  return { context, page, rows, calls, errors, fail: () => { failLoad = true; } };
}

test('Ana corrige 110 a 80 minutos, ve el cambio y elimina sin crear otro estímulo', async () => {
  const { context, page, rows, calls, errors } = await fixture();
  try {
    await page.goto(base + '/murcielapp/');
    await page.getByRole('button', { name: 'Registrar estímulo', exact: true }).first().click();
    await page.getByLabel('Código personal', { exact: true }).fill('1234 5678');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Ver Mi semana', exact: true }).click();
    await page.getByRole('button', { name: /Editar Técnico-táctico/ }).click();
    assert.equal(await page.getByLabel('Horas', { exact: true }).inputValue(), '1');
    assert.equal(await page.getByLabel('Minutos', { exact: true }).inputValue(), '50');
    await page.getByLabel('Minutos', { exact: true }).fill('20');
    await page.getByRole('button', { name: 'Siguiente', exact: true }).last().click();
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('heading', { name: 'Estímulo actualizado', exact: true }).waitFor();
    assert.equal(rows.length, 1); assert.equal(rows[0].duracionMin, 80);
    assert.equal(calls.filter(p => p.action === 'murcielapp_registrarEstimulo').length, 0);
    await page.getByRole('button', { name: 'Ver Mi semana', exact: true }).click();
    await page.getByRole('button', { name: /Eliminar Técnico-táctico/ }).waitFor();
    assert.match(await page.locator('#my-week-list').innerText(), /1 hora 20 minutos/);
    await page.getByRole('button', { name: /Eliminar Técnico-táctico/ }).click();
    await page.getByRole('button', { name: 'Conservar estímulo', exact: true }).click();
    assert.equal(rows.length, 1);
    await page.getByRole('button', { name: /Eliminar Técnico-táctico/ }).click();
    await page.getByRole('button', { name: 'Eliminar estímulo', exact: true }).click();
    await page.getByText('No hay estímulos registrados en esta semana.', { exact: true }).waitFor();
    assert.equal(rows.length, 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('CT ve equipo, jugadora, CSV, móvil, transición y error sin dejar cifras anteriores', async () => {
  const { context, page, calls, errors, fail } = await fixture();
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + '/reportes/');
    assert.equal(calls.length, 0);
    await page.getByLabel('Clave administrativa de MurcielApp', { exact: true }).fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Entrar a Reportes', exact: true }).click();
    await page.getByText('Datos actualizados. Los totales reflejan las correcciones y eliminaciones guardadas.', { exact: true }).waitFor();
    assert.match(await page.locator('#daily-output').innerText(), /Sin datos registrados/);
    const cards = await page.locator('.daily-kpi strong').allTextContents();
    assert.deepEqual(cards, ['1', '110', '550', '0']);
    fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
    await page.screenshot({ path: path.join(root, '.tmp', 'reportes-equipo.png'), fullPage: true });
    await page.getByRole('button', { name: 'Pérez, Ana', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Semana de Pérez, Ana', exact: true }).isVisible(), true);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
    const file = await download;
    assert.match(file.suggestedFilename(), /jugadora.csv$/);
    const stream = await file.createReadStream(); let csv = '';
    for await (const chunk of stream) csv += chunk.toString();
    assert.match(csv, /"110";"5";"550"/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(root, '.tmp', 'reportes-jugadora-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: /Semana anterior/ }).click();
    await page.getByText(/El período incluye fechas anteriores/).waitFor();
    assert.equal(await page.locator('.daily-kpis').count(), 0);
    fail();
    await page.getByRole('button', { name: 'Actualizar datos', exact: true }).first().click();
    await page.getByText('Servicio no disponible.', { exact: true }).waitFor();
    assert.equal(await page.locator('#daily-output').isHidden(), true);
    assert.equal(await page.getByRole('button', { name: 'Exportar CSV', exact: true }).isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});
