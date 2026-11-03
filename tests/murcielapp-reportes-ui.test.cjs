const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, before, after } = require('node:test');
const { chromium } = require('@playwright/test');
const M = require('../reportes/murcielapp-model.js');
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
  const historical = [{ fecha: '2026-09-14', jugadora: 'Pérez, Ana', persona_id: 'P1', periodoAnalisis: '2026-S37', total: 5, fisico: 3, tecnico: 2 }, { fecha: '2026-10-26', jugadora: 'Pérez, Ana', persona_id: 'P1', periodoAnalisis: '2026-S43', total: 1, fisico: 0, tecnico: 1 }];
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
    } else if (p.action === 'site_getContext') data = {ok:true,plantel:[],reportes:{rows:historical}};
    else data = {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data }) });
  });
  return { context, page, rows, historical, calls, errors, fail: () => { failLoad = true; } };
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
    assert.equal(await page.locator('#legacy-report, #show-legacy, #btn-audit-toggle, #daily-print, #daily-week, #btn-open-ai').count(), 0);
    await page.getByLabel('Clave del cuerpo técnico', { exact: true }).fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Entrar a Reportes', exact: true }).click();
    await page.getByText('Datos actualizados. Los totales reflejan las correcciones y eliminaciones guardadas.', { exact: true }).waitFor();
    assert.equal(await page.locator('#daily-view').inputValue(), 'week');
    assert.match(await page.locator('#daily-output').innerText(), /Evolución semanal/);
    const cards = await page.locator('.daily-kpi strong').allTextContents();
    assert.deepEqual(cards, ['1', '1', '1']);
    fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
    await page.screenshot({ path: path.join(root, '.tmp', 'reportes-equipo.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({path:path.join(root, '.tmp', 'reportes-equipo-mobile.png'),fullPage:true});
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Pérez, Ana', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Entrenamientos de Pérez, Ana', exact: true }).isVisible(), true);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar datos', exact: true }).click();
    const file = await download;
    assert.match(file.suggestedFilename(), /jugadora.csv$/);
    const stream = await file.createReadStream(); let csv = '';
    for await (const chunk of stream) csv += chunk.toString();
    assert.match(csv, /"110";"5";"550"/);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(root, '.tmp', 'reportes-jugadora-mobile.png'), fullPage: true });
    await page.locator('#daily-period').selectOption('custom');
    await page.locator('#daily-from').fill('2026-10-12');
    await page.locator('#daily-to').fill('2026-10-18');
    await page.getByRole('button', { name: 'Ver reporte', exact: true }).click();
    await page.getByText(/Se incluyen ambos sistemas/).waitFor();
    assert.equal(await page.locator('.daily-kpis').count(), 1);
    fail();
    await page.getByRole('button', { name: 'Ver reporte', exact: true }).first().click();
    await page.getByText('Servicio no disponible.', { exact: true }).waitFor();
    assert.equal(await page.locator('#daily-output').isHidden(), true);
    assert.equal(await page.locator('#daily-export').isDisabled(), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Gestión administra accesos y dirige todo el análisis a Reportes de entrenamiento', async () => {
  const { context, page, calls, errors } = await fixture();
  try {
    await page.goto(base + '/gestion-murcielapp/');
    await page.getByRole('heading', { name: 'Gestión de MurcielApp', exact: true }).waitFor();
    assert.equal(await page.locator('#load-records, #records-result, #export-records').count(), 0);
    assert.equal(calls.filter(p => /Estimulos|reporteSemanal/.test(p.action)).length, 0);
    await page.getByRole('link', { name: 'Abrir Reportes de entrenamiento →', exact: true }).click();
    await page.getByRole('heading', { name: 'Reportes de entrenamiento', exact: true }).waitFor();
    assert.match(page.url(), /\/reportes\/$/);
    assert.equal(await page.getByRole('button', { name: 'Entrar a Reportes', exact: true }).isVisible(), true);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

 test('consulta desde septiembre integra histórico y diario por jugadora, mes y CSV sin duplicar', async () => {
  const { context, page, errors } = await fixture();
  try {
    await page.goto(base + '/reportes/');
    await page.getByLabel('Clave del cuerpo técnico', { exact: true }).fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Entrar a Reportes', exact: true }).click();
    await page.getByText('Datos actualizados. Los totales reflejan las correcciones y eliminaciones guardadas.', { exact: true }).waitFor();
    await page.locator('#daily-period').selectOption('custom');
    await page.locator('#daily-from').fill('2026-09-01');
    await page.locator('#daily-to').fill('2026-10-20');
    await page.getByRole('button', { name: 'Ver reporte', exact: true }).click();
    await page.locator('#daily-output').getByText('Detalle histórico semanal', { exact: true }).waitFor({state: 'attached'});
    await page.locator('#daily-player').selectOption('P1');
    assert.deepEqual(await page.locator('.daily-kpi strong').allTextContents(), ['6', '0,75', '3']);
    const teamTable = page.locator('#daily-output .report-table-group').filter({has: page.locator('caption', {hasText: 'Cantidades y promedios por tipo'})});
    await teamTable.getByRole('button', {name: 'Cantidad del período ↕', exact:true}).click();
    await teamTable.getByRole('button', {name: 'Cantidad del período ↕', exact:true}).click();
    assert.equal(await teamTable.locator('th[aria-sort="descending"]').count(), 1);
    await teamTable.getByRole('searchbox').fill('fisico');
    assert.equal(await teamTable.locator('tbody tr:visible').count(), 2);
    await page.locator('#daily-type').selectOption('fisico');
    assert.equal(await page.locator('.daily-kpi strong').first().innerText(), '3');
    await page.locator('#daily-type').selectOption('');
    await page.locator('#daily-view').selectOption('month');
    const months = page.locator('#daily-output table').filter({has: page.locator('caption', {hasText: 'Mes a mes'})});
    assert.match(await months.innerText(), /2026-09\s+5\s+3\s+2/);
    assert.match(await months.innerText(), /2026-10\s+1\s+0\s+1/);
    await page.locator('#daily-view').selectOption('week');
    assert.equal(await page.locator('#daily-output table').filter({has: page.locator('caption', {hasText: 'Evolución semanal'})}).count(), 1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test('Ver por inicia en semana, navega día/semana/mes y Ver reporte no descarga', async () => {
  const {context, page, calls, errors} = await fixture();
  const downloads = []; page.on('download', d => downloads.push(d));
  try {
    await page.goto(base + '/reportes/');
    await page.getByLabel('Clave del cuerpo técnico', {exact:true}).fill('clave-de-prueba');
    await page.getByRole('button', {name:'Entrar a Reportes',exact:true}).click();
    await page.locator('#daily-output:not([hidden])').waitFor();
    assert.equal(await page.locator('#daily-range select').first().getAttribute('id'), 'daily-view');
    assert.equal(await page.locator('#daily-view').inputValue(), 'week');
    assert.equal(await page.locator('#daily-anchor').count(), 0);
    assert.match(await page.locator('#daily-period option:checked').innerText(), /19\/10\/2026 al 25\/10\/2026/);
    const navigate = async (button, from, to) => {
      const response = page.waitForResponse(r => { try { const p = r.request().postDataJSON(); return p.action === 'murcielapp_reporteSemanal' && p.desde === M.monday(from) && p.hasta === M.shift(M.monday(to), 6); } catch { return false; } });
      await page.getByRole('button', {name: new RegExp(button)}).click(); await response;
      await page.locator('#daily-output:not([hidden])').waitFor();
      assert.equal(await page.locator('#daily-from').inputValue(), from);
      assert.equal(await page.locator('#daily-to').inputValue(), to);
    };
    await navigate('Semana anterior', '2026-10-12', '2026-10-18');
    await navigate('Semana siguiente', '2026-10-19', '2026-10-25');
    await page.locator('#daily-view').selectOption('day');
    await navigate('Día anterior', '2026-10-19', '2026-10-19');
    await navigate('Día siguiente', '2026-10-20', '2026-10-20');
    await page.locator('#daily-view').selectOption('month');
    assert.deepEqual((await page.locator('#daily-period option').allTextContents()).slice(0, 3), ['Enero', 'Febrero', 'Marzo']);
    assert.equal(await page.locator('#daily-period option').last().innerText(), 'Personalizar fechas');
    await navigate('Mes anterior', '2026-09-01', '2026-09-30');
    await navigate('Mes siguiente', '2026-10-01', '2026-10-31');
    await navigate('Ver reporte', '2026-10-01', '2026-10-31');
    assert.equal(downloads.length, 0);
    assert.equal(await page.locator('#daily-download').isVisible(), true);
    assert.equal(await page.locator('#daily-export').getAttribute('type'), 'button');
    await page.locator('#daily-year').selectOption('2027');
    await page.locator('#daily-period').selectOption({label:'Febrero'});
    await navigate('Ver reporte', '2027-02-01', '2027-02-28');
    await page.locator('#daily-period').selectOption('custom');
    assert.equal(await page.locator('#daily-dates').isVisible(), true);
    assert.deepEqual(errors, []);
  } finally {await context.close();}
});

test('Físico más Técnico-táctico permite comparar jugadoras sin contar Otros', async () => {
  const { context, page, rows, errors } = await fixture();
  rows.push({id:'physical',personaId:'P1',jugadora:'Pérez, Ana',fecha:'2026-10-20',tipo:'fisico',duracionMin:40,sRPE:4,revision:0});
  for (let i=0; i<5; i++) rows.push({id:'other-'+i,personaId:'P1',jugadora:'Pérez, Ana',fecha:'2026-10-20',tipo:'otros',duracionMin:30,sRPE:null,revision:0});
  try {
    await page.goto(base + '/reportes/');
    await page.getByLabel('Clave del cuerpo técnico', {exact:true}).fill('clave-de-prueba');
    await page.getByRole('button', {name:'Entrar a Reportes',exact:true}).click();
    await page.locator('#daily-output:not([hidden])').waitFor();
    const table = page.locator('#daily-output table').filter({has:page.locator('caption', {hasText:'Totales por jugadora'})});
    const row = table.locator('tbody tr').filter({hasText:'Pérez, Ana'});
    assert.deepEqual((await row.locator('td').allTextContents()).slice(1), ['2','2','2','7','7','7','1','1','5']);
    await table.getByRole('button',{name:'F + T ↕',exact:true}).click();
    await table.getByRole('button',{name:'F + T ↕',exact:true}).click();
    assert.match(await table.locator('tbody tr').first().innerText(), /Pérez, Ana/);
    await page.getByRole('button', {name:'Pérez, Ana',exact:true}).click();
    const summary = page.locator('#daily-output table').filter({has:page.locator('caption',{hasText:'Cantidades y promedios por tipo'})});
    const combined = summary.locator('tbody tr').filter({hasText:'sin Otros'});
    assert.deepEqual((await combined.locator('td').allTextContents()).slice(1), ['2','2','2']);
    assert.deepEqual(errors, []);
  } finally {await context.close();}
});

test('muestra conciliación, detalle diario anterior al corte y CSV con complemento', async () => {
 const {context,page,rows,historical,errors}=await fixture();
 rows[0].fecha='2026-10-14';
 historical.push({fecha:'2026-10-19',jugadora:'Pérez, Ana',persona_id:'P1',periodoAnalisis:'2026-S42',total:3,fisico:2,tecnico:1});
 try {
  await page.goto(base+'/reportes/');
  await page.getByLabel('Clave del cuerpo técnico',{exact:true}).fill('clave-de-prueba');
  await page.getByRole('button',{name:'Entrar a Reportes',exact:true}).click();
  await page.locator('#daily-output:not([hidden])').waitFor();
  await page.locator('#daily-period').selectOption('2026-10-12');
  await page.getByRole('button',{name:'Ver reporte',exact:true}).click();
  await page.getByText('Hay diferencias entre fuentes.',{exact:false}).waitFor();
  assert.equal(await page.locator('.daily-kpi strong').first().innerText(),'3');
  await page.getByText('Ver conciliación entre sistemas',{exact:true}).click();
  assert.match(await page.locator('#daily-output').innerText(),/Total semanal informado/);
  await page.getByText('Ver estímulos registrados',{exact:true}).click();
  assert.match(await page.locator('#daily-output').innerText(),/14\/10\/2026/);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Descargar datos',exact:true}).click();
  const stream=await (await download).createReadStream();let csv='';for await(const chunk of stream)csv+=chunk.toString();
  assert.match(csv,/Complemento semanal conciliado/);assert.match(csv,/Total original semanal/);
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
});
