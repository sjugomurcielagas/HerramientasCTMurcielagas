const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const wadaHost = /^https:\/\/www\.wada-ama\.org\//;

function setupBackend(now = '2026-11-05T14:00:00Z') {
  const history = [];
  const writes = [];
  const context = vm.createContext({
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [now]));
      }
      static now() { return Date.parse(now); }
    },
    Utilities: {
      formatDate(date, timeZone, format) {
        if (format === 'yyyy') {
          return new Intl.DateTimeFormat('es-AR', { timeZone, year: 'numeric' }).format(date);
        }
        return date.toISOString().slice(0, 10);
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: content => ({ setMimeType: () => JSON.parse(content) }),
    },
  });
  for (const file of ['Código.js', 'AntidopingEvidencia.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'gas', 'base-deporte', file), 'utf8'), context, { filename: file });
  }
  context.antidoping_appendHistorial_ = (query, result) => history.push({ query, result });
  context.antidoping_readCache_ = () => [];
  context.antidoping_writeCache_ = (...args) => writes.push(args);
  context.antidoping_readCatalogo_ = () => [];
  context.antidoping_readVnmCatalogo_ = () => [];
  context.antidoping_lookupVnmCandidates_ = () => [];
  context.antidoping_lookupMarcaAlias_ = () => [];
  context.antidoping_loadWadaRules_ = () => [];
  context.antidoping_scrapePrVademecum_ = () => [];
  context.antidoping_secondaryEvidenceLookup_ = () => null;
  return {
    context,
    history,
    writes,
    search(consulta) {
      const response = context.antidoping_buscarMedicamento({ consulta });
      assert.equal(response.ok, true);
      assert.ok(Array.isArray(response.data) && response.data.length > 0, consulta);
      return response.data;
    },
  };
}

function only(results) {
  assert.equal(results.length, 1);
  return results[0];
}

test('la familia Refrianex separa presentaciones y el resumen no declara una fórmula única', () => {
  const { search } = setupBackend();
  const choices = search(' Refrianex ');
  assert.ok(choices.length >= 3);
  assert.ok(choices.every(item => item.requiere_presentacion));
  assert.equal(new Set(choices.map(item => item.consulta_presentacion)).size, choices.length);

  const simple = only(search('Refrianex comprimidos'));
  assert.equal(simple.tipo_resultado, 'producto');
  assert.match(simple.fuente_url, /^https:\/\/www\.montpellier\.com\.ar\//);
  assert.match(simple.fuente_wada_url, wadaHost);
  assert.match(simple.principio_activo, /paracetamol/i);
  assert.match(simple.principio_activo, /pseudoefedrina/i);
  assert.match(simple.principio_activo, /bromhexina/i);
  assert.doesNotMatch(simple.principio_activo, /clorfeniramina/i);
  const pseudoefedrina = simple.componentes.find(item => /pseudoefedrina/i.test(item.nombre));
  assert.ok(pseudoefedrina);
  assert.match(pseudoefedrina.detalle, /150\s*(?:µ|μ|u)g\/mL/i);
  assert.match(pseudoefedrina.detalle, /competencia/i);

  const compuesto = only(search('Refrianex Compuesto comprimidos'));
  assert.match(compuesto.principio_activo, /clorfeniramina/i);
  const antigripal = only(search('Refrianex Antigripal comprimidos'));
  assert.match(antigripal.principio_activo, /fenilefrina/i);
  assert.doesNotMatch(antigripal.principio_activo, /pseudoefedrina/i);
});

test('Artelac Ultra 4S conserva sus cuatro activos y la vía del producto argentino', () => {
  const { search } = setupBackend();
  const artelac = only(search('Artelac Ultra 4S'));
  assert.equal(artelac.tipo_resultado, 'producto');
  assert.equal(artelac.componentes.length, 4);
  assert.match(artelac.principio_activo, /hialuronato de sodio/i);
  assert.match(artelac.principio_activo, /trehalosa/i);
  assert.match(artelac.principio_activo, /fucoidano|fucoidan/i);
  assert.match(artelac.principio_activo, /dexpantenol|d-pantenol/i);
  assert.doesNotMatch(artelac.principio_activo, /timolol/i);
  assert.match([artelac.via, artelac.presentacion, artelac.criterio_wada].join(' '), /oft[aá]lmic/i);
  assert.match(artelac.fuente_url, /^https:\/\//);
});

test('colirio combinado, inhalador y analgésicos mantienen su fórmula por presentación', () => {
  const { search } = setupBackend();
  const dorzoflax = only(search('Dorzoflax'));
  assert.match(dorzoflax.principio_activo, /dorzolamida.*timolol/i);
  assert.match(dorzoflax.presentacion, /oft[aá]lmic/i);
  assert.match(dorzoflax.componentes.find(item => item.nombre === 'Timolol').detalle, /P1/);
  const inhalador = only(search('Salbutral aerosol 250 dosis'));
  assert.match(inhalador.principio_activo, /salbutamol/i);
  assert.match(inhalador.estado, /CONDICIONADO/);
  const tafirol = only(search('Tafirol 500'));
  const duo = only(search('Tafirol Duo'));
  assert.match(tafirol.principio_activo, /^Paracetamol$/i);
  assert.match(duo.principio_activo, /paracetamol.*ibuprofeno|ibuprofeno.*paracetamol/i);
});

test('paracetamol como activo único no hereda marca, fórmula ni advertencias de un combinado', () => {
  const { search } = setupBackend();
  for (const query of ['paracetamol', 'PARACETAMOL']) {
    const result = only(search(query));
    assert.equal(result.tipo_resultado, 'principio_activo');
    assert.match(result.principio_activo, /^paracetamol$/i);
    assert.match(result.fuente_wada_url, wadaHost);
    assert.doesNotMatch(JSON.stringify(result), /anaflex|pseudoefedrina|refrianex/i);
  }
});

test('Anaflex lista presentaciones argentinas y reserva los activos para la fórmula seleccionada', () => {
  const { search } = setupBackend();
  const choices = search('Anaflex');
  assert.ok(choices.length >= 3);
  assert.ok(choices.every(item => item.tipo_resultado === 'producto' && item.requiere_presentacion));
  const simple = only(search('Anaflex Paracetamol 500'));
  assert.equal(simple.principio_activo, 'Paracetamol');
  const plus = only(search('Anaflex Plus Rápida Acción'));
  assert.equal(plus.requiere_presentacion, false);
  assert.equal(plus.principio_activo, 'Diclofenac + Paracetamol');
  assert.match(plus.fuente_url, /^https:\/\/consumomasivo\.bago\.com\.ar\//);
});

test('dorzolamida conserva la excepción por vía y timolol la restricción por deporte', () => {
  const { search } = setupBackend();
  for (const query of ['dorzolamida', 'dorzolamide']) {
    const dorzolamida = only(search(query));
    assert.match(dorzolamida.principio_activo, /^dorzolamida$/i);
    assert.match(dorzolamida.criterio_wada + dorzolamida.advertencia_detalle, /oft[aá]lmic/i);
    assert.match(dorzolamida.fuente_wada_url, wadaHost);
  }
  const timolol = only(search('timolol'));
  assert.match(timolol.principio_activo, /^timolol$/i);
  assert.match(timolol.criterio_wada + timolol.advertencia_detalle, /P1/);
  assert.match(timolol.criterio_wada + timolol.advertencia_detalle, /f[uú]tbol para ciegas/i);
  assert.doesNotMatch(timolol.estado, /^PROHIBIDO/i);
});

test('consulta desconocida o con evidencia incompleta no resulta en permiso ni prohibición', () => {
  const { context, search } = setupBackend();
  for (const query of ['Medicación inexistente ZZ98', 'fucoldan']) {
    const result = only(search(query));
    assert.match(result.estado, /REVISI[ÓO]N|VERIFICACI[ÓO]N|PENDIENTE/);
    assert.doesNotMatch(result.estado, /^PROHIBIDO|^PERMITIDO|^NO FIGURA/i);
  }
  context.antidoping_readVnmCatalogo_ = () => [{
    nombre_comercial: 'Marca fórmula incompleta',
    generico: 'paracetamol',
    laboratorio_titular: 'Laboratorio de prueba',
  }];
  const result = only(search('Marca fórmula incompleta'));
  assert.equal(result.tipo_resultado, 'candidato');
  assert.match(result.estado, /REVISI[ÓO]N|VERIFICACI[ÓO]N|PENDIENTE/);
});

test('el índice argentino y el caché histórico aportan candidatos sin convertirlos en un dictamen', () => {
  const { context, search, writes } = setupBackend();
  const requests = [];
  context.UrlFetchApp = {
    fetch(url) {
      requests.push(url);
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          data: {
            results: [{
              nombre: 'Marca fórmula incompleta',
              droga: 'Paracetamol',
              presentacion: 'Comprimidos',
              laboratorio: 'Laboratorio de prueba',
            }],
          },
        }),
      };
    },
  };
  const curated = only(search('paracetamol'));
  assert.equal(curated.tipo_resultado, 'principio_activo');
  assert.equal(requests.length, 0);

  const candidate = only(search('Marca fórmula incompleta'));
  assert.equal(new URL(requests[0]).searchParams.get('nombre'), 'Marca fórmula incompleta');
  assert.equal(candidate.tipo_resultado, 'candidato');
  assert.equal(candidate.presentacion, 'Comprimidos');
  assert.equal(candidate.estado, 'REQUIERE VERIFICACIÓN');
  assert.equal(candidate.principio_activo, 'Paracetamol');
  assert.equal(writes.length, 1);

  context.antidoping_readCache_ = () => [{ ...candidate, estado: 'PERMITIDO' }];
  const cached = only(search('Marca fórmula incompleta'));
  assert.equal(cached.tipo_resultado, 'candidato');
  assert.equal(cached.estado, 'REQUIERE VERIFICACIÓN');
  assert.equal(requests.length, 1);
});

test('casos habituales distinguen salbutamol inhalado, glucocorticoides y tramadol', () => {
  const { search } = setupBackend();
  const salbutamol = only(search('albuterol'));
  assert.match(salbutamol.principio_activo, /^salbutamol$/i);
  assert.match(salbutamol.estado, /CONDICIONADO/);
  assert.match(salbutamol.criterio_wada, /inhalad[oa]/i);
  assert.match(salbutamol.criterio_wada, /dosis/i);
  assert.match(salbutamol.criterio_wada, /urinari[oa]/i);
  for (const query of ['prednisona', 'dexametasona']) {
    const glucocorticoide = only(search(query));
    assert.match(glucocorticoide.estado, /CONDICIONADO.*COMPETENCIA/);
    for (const via of [/oral/i, /rectal/i, /inyectable/i]) assert.match(glucocorticoide.criterio_wada, via);
    if (query === 'dexametasona') assert.match(glucocorticoide.criterio_wada, /oft[aá]lmic/i);
  }
  const tramadol = only(search('tramadol'));
  assert.equal(tramadol.estado, 'PROHIBIDO EN COMPETENCIA');
  assert.match(tramadol.criterio_wada, /S7/);
});

test('las revisiones de 2026 no quedan vigentes cuando cambia el año en Argentina', () => {
  const { search } = setupBackend('2027-01-01T03:01:00Z');
  for (const query of ['paracetamol', 'Artelac Ultra 4S', 'Refrianex comprimidos']) {
    const result = only(search(query));
    assert.match(result.estado, /REQUIERE REVISIÓN/);
    assert.equal(result.fuente_wada_url, 'https://www.wada-ama.org/en/prohibited-list');
  }
});

test('en la consulta para el CT se puede copiar una aclaración con sus fuentes', async () => {
  const { chromium } = require('@playwright/test');
  const { search } = setupBackend();
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    const queries = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('mrcl_auth', '1');
      localStorage.setItem('mrcl_auth_ts', String(Date.now()));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async value => { window.copiedForTest = value; } },
        configurable: true,
      });
    });
    await page.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname.endsWith('.workers.dev')) {
        const payload = request.method() === 'POST' ? request.postDataJSON() : Object.fromEntries(url.searchParams);
        let data = [];
        if (payload.action === 'antidoping_buscarMedicamento') {
          queries.push(payload.consulta);
          data = search(payload.consulta);
        }
        return route.fulfill({ json: { ok: true, data }, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      if (url.hostname === 'antidoping.test') {
        const files = {
          '/antidoping/': 'antidoping/index.html',
          '/assets/config.js': 'assets/config.js',
          '/assets/fadec-logo.webp': 'assets/fadec-logo.webp',
          '/assets/logo-murcielagas.webp': 'assets/logo-murcielagas.webp',
        };
        const file = files[url.pathname];
        if (file && fs.existsSync(path.join(root, file))) return route.fulfill({ path: path.join(root, file) });
      }
      return route.abort();
    });
    await page.goto('https://antidoping.test/antidoping/');
    await page.getByRole('link', { name: /lista vigente/i }).first().waitFor();
    await page.getByRole('link', { name: /2026.*pdf|pdf.*2026/i }).first().waitFor();
    await page.getByRole('button', { name: /gestionar tue/i }).first().waitFor();
    await page.getByLabel('Medicamento o principio activo').fill('Refrianex');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    const results = page.locator('#resultados');
    const presentation = results.getByRole('article', { name: /^Refrianex · Comprimidos/i });
    await presentation.getByRole('button', { name: /elegir esta presentación/i }).waitFor();
    assert.equal(await results.getByRole('button', { name: /copiar para whatsapp/i }).count(), 0);
    await presentation.getByRole('button', { name: /elegir esta presentación/i }).click();
    const result = results.getByRole('article', { name: /^Refrianex · Comprimidos/i });
    await result.getByRole('link', { name: /prospecto|ficha/i }).first().waitFor();
    await result.getByRole('link', { name: /fuente ama/i }).first().waitFor();
    await result.getByRole('button', { name: /copiar para whatsapp/i }).click();
    await page.waitForFunction(() => typeof window.copiedForTest === 'string');
    const copied = await page.evaluate(() => window.copiedForTest);
    assert.match(copied, /Refrianex/i);
    assert.match(copied, /pseudoefedrina/i);
    assert.match(copied, /competencia/i);
    assert.match(copied, /montpellier\.com\.ar/);
    assert.match(copied, /wada-ama\.org/);
    assert.deepEqual(queries, ['Refrianex', 'Refrianex comprimidos']);

    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => { throw new Error('Sin acceso al portapapeles'); };
    });
    await result.getByRole('button', { name: /copiar para whatsapp/i }).click();
    const preview = result.getByLabel('Texto para WhatsApp');
    await preview.waitFor();
    assert.equal(await preview.inputValue(), copied);
    assert.equal(await preview.evaluate(element => element.selectionEnd - element.selectionStart), copied.length);

    await page.getByLabel('Medicamento o principio activo').fill('Tramadol');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await results.getByRole('button', { name: /iniciar ficha TUE/i }).click();
    await page.getByRole('heading', { name: 'Ficha TUE' }).waitFor();
    assert.equal(await page.getByLabel('Medicamento', { exact: true }).inputValue(), 'Tramadol');
    assert.equal(await page.getByLabel('Estado TUE', { exact: true }).inputValue(), 'En preparación');
    assert.match(await page.getByRole('link', { name: /formulario TUE IBSA/i }).getAttribute('href'), /^https:\/\/ibsasport\.org\//);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('MurcielApp descarga la lista local en español desde Mi perfil sin mostrar el buscador', async () => {
  const { chromium } = require('@playwright/test');
  const channel = process.env.PLAYWRIGHT_CHANNEL || 'msedge';
  const browser = await chromium.launch({ ...(channel === 'chromium' ? {} : { channel }), headless: true });
  const pdfPath = path.join(root, 'assets', 'lista-ama-2026-es.pdf');
  const files = {
    '/murcielapp/': ['murcielapp/index.html', 'text/html; charset=utf-8'],
    '/murcielapp/rutina.json': ['murcielapp/rutina.json', 'application/json'],
    '/assets/config.js': ['assets/config.js', 'text/javascript'],
    '/assets/lista-ama-2026-es.pdf': ['assets/lista-ama-2026-es.pdf', 'application/pdf'],
  };
  const server = http.createServer((req, res) => {
    const file = files[new URL(req.url, 'http://localhost').pathname];
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Content-Type', file[1]);
    fs.createReadStream(path.join(root, file[0])).pipe(res);
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(5000);
    await page.goto(`http://127.0.0.1:${server.address().port}/murcielapp/`);
    const downloadLink = page.getByRole('link', { name: /descargar lista ama 2026 en español/i });
    assert.equal(await downloadLink.count(), 0);
    await page.getByRole('button', { name: 'Mi perfil' }).click();
    await downloadLink.waitFor();
    assert.equal(await page.getByRole('textbox', { name: /medicamento|principio activo/i }).count(), 0);
    assert.equal(await page.locator('a[href*="/antidoping"]').count(), 0);
    const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()]);
    assert.equal(download.suggestedFilename(), 'Lista-AMA-2026-es.pdf');
    const downloaded = fs.readFileSync(await download.path());
    assert.equal(downloaded.subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(downloaded, fs.readFileSync(pdfPath));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
