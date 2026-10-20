const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8').replace('export default {', 'globalThis.worker = {');

function setup(valid = true) {
  const calls = [];
  const context = vm.createContext({ Request, Response, URL, console, fetch: async (url, options) => {
    const payload = JSON.parse(options.body); calls.push({ url, payload });
    if (payload.action === 'murcielapp_validarAdmin') return Response.json(valid === 'outage' ? { ok: false, error: 'Cuota excedida' } : valid ? { ok: true, data: { autorizado: true } } : { ok: false, error: 'Acceso administrativo vencido' });
    if (payload.action === 'getClientData') return Response.json({ ok: true, rows: [] });
    if (payload.action === 'getPlantel') return Response.json({ ok: true, data: [] });
    return Response.json({ ok: true, data: {} });
  } });
  vm.runInContext(source, context);
  return { worker: context.worker, calls };
}
const token = 'a'.repeat(64);
const post = payload => new Request('https://test.local/', { method: 'POST', body: JSON.stringify(payload) });

test('bloquea lecturas y escrituras del CT sin sesión, también por GET', async () => {
  const { worker, calls } = setup();
  for (const action of ['base_getPlantel', 'base_getFicha', 'base_guardarCambios', 'site_getContext', 'generateClientReport']) {
    assert.equal((await worker.fetch(post({ action }))).status, 401);
    assert.equal((await worker.fetch(new Request('https://test.local/?action=' + action))).status, 405);
  }
  assert.equal(calls.length, 0);
});

test('rechaza sesión revocada y propaga la sesión en todas las lecturas combinadas', async () => {
  const outage = setup('outage');
  assert.equal((await outage.worker.fetch(post({ action: 'base_getPlantel', adminToken: token }))).status, 502);
  const denied = setup(false);
  assert.equal((await denied.worker.fetch(post({ action: 'base_getPlantel', adminToken: token }))).status, 401);
  assert.equal(denied.calls.length, 1);
  const { worker, calls } = setup();
  const result = await worker.fetch(post({ action: 'site_getContext', adminToken: token }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).ok, true);
  assert.ok(calls.length >= 4);
  assert.ok(calls.every(c => c.payload.adminToken === token));
  assert.match(result.headers.get('cache-control'), /no-store/);
});

test('rutea correcciones y reportes privados solo por POST al backend de identidad', async () => {
  const { worker, calls } = setup();
  for (const action of ['murcielapp_editarEstimulo', 'murcielapp_eliminarEstimulo', 'murcielapp_reporteSemanal']) {
    assert.equal((await worker.fetch(new Request('https://test.local/?action=' + action))).status, 405);
    assert.equal((await worker.fetch(post({ action, token: 'session', adminToken: token }))).status, 200);
    assert.equal(calls.at(-1).payload.action, action);
  }
});
