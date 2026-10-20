const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test } = require('node:test');
function setup() {
  const stored = { 'murcielapp.adminSession.v1': 'a'.repeat(64), 'murci_api_cache:viejo': '{"data":"privado"}' };
  const localStorage = { getItem: key => stored[key] || null, setItem: (key, value) => { stored[key] = value; }, removeItem: key => { delete stored[key]; } };
  Object.defineProperty(localStorage, 'murci_api_cache:viejo', { enumerable: true, get: () => stored['murci_api_cache:viejo'] });
  const calls = [];
  let handler = () => Response.json({ ok: true, data: { plantel: [] } });
  const window = { localStorage };
  const context = vm.createContext({ window, localStorage, URL, Response, console, fetch: async (url, options) => { calls.push({ url, options }); return handler(); } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/config.js'), 'utf8'), context);
  return { client: context.Murci, calls, stored, handler: value => { handler = value; } };
}
test('cliente compartido usa POST privado y solo guarda respuestas en memoria', async () => {
  const { client, calls, stored } = setup();
  assert.equal(stored['murci_api_cache:viejo'], undefined);
  await client.apiGetCached('site_getPlantel', {}, { ttlMs: 10000 });
  await client.apiGetCached('site_getPlantel', {}, { ttlMs: 10000 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(JSON.parse(calls[0].options.body).adminToken, 'a'.repeat(64));
  assert.ok(!calls[0].url.includes('adminToken'));
  assert.equal(Object.keys(stored).filter(key => key.startsWith('murci_api_cache:')).length, 0);
  client.useAdminSession('b'.repeat(64));
  assert.equal(client.cacheGet('anything'), null);
  await client.apiGetCached('site_getPlantel');
  assert.equal(calls.length, 2);
});
test('revocar la sesión elimina credenciales y no conserva datos por staleOnError', async () => {
  const { client, handler, stored } = setup();
  await client.loadPlantel();
  client.cacheSet('key', ['dato']);
  handler(() => Response.json({ ok: false, error: 'Acceso administrativo vencido. Ingresá la clave nuevamente.' }));
  await assert.rejects(client.apiGetCached('site_getPlantel', {}, { cacheKey: 'key', forceRefresh: true, staleOnError: true }), /administrativo vencido/);
  assert.equal(stored['murcielapp.adminSession.v1'], undefined);
  assert.equal(client.cacheGet('key'), null);
  await assert.rejects(client.loadPlantel(), /administrativo vencido/);
});
test('una respuesta pendiente no pasa a la caché de otra sesión', async () => {
  const { client, handler } = setup();
  let resolve;
  handler(() => new Promise(done => { resolve = done; }));
  const pending = client.apiGetCached('site_getPlantel', {}, { cacheKey: 'key' });
  client.useAdminSession('b'.repeat(64));
  resolve(Response.json({ ok: true, data: ['anterior'] }));
  await assert.rejects(pending, /sesión cambió/);
  assert.equal(client.cacheGet('key'), null);
});
