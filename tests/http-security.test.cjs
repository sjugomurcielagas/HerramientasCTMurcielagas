const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ContentService = { MimeType: { JSON: 'json' }, createTextOutput(text) { return { text, setMimeType() { return this; } }; } };
const post = (context, payload) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(payload) } }).text);

test('Apps Script de Base bloquea accesos directos que no pasan por el Worker', () => {
  const context = vm.createContext({ ContentService });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/base-deporte/Código.js'), 'utf8'), context);
  let reads = 0;
  context.murcielapp_admin_ = payload => { if (payload.adminToken !== 'valid') throw new Error('Acceso administrativo vencido'); };
  context.getPlantel = () => { reads++; return []; };
  for (const action of ['getPlantel', 'getFicha', 'guardarCambios', 'darDeBaja', 'subirArchivo', 'partidos_eliminarPartido']) {
    assert.equal(post(context, { action }).ok, false);
  }
  assert.equal(reads, 0);
  assert.equal(post(context, { action: 'getPlantel', adminToken: 'valid' }).ok, true);
  assert.equal(reads, 1);
  assert.equal(context.verificarPassword('1'), false);
  assert.match(context.doGet().text, /HerramientasCT/);
});

test('Apps Script de Reportes valida la sesión compartida y limita llamadas de IA', () => {
  const token = 'a'.repeat(64);
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  let revoked = '', reads = 0, iaCalls = 0;
  const cache = new Map();
  const context = vm.createContext({ ContentService,
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ getLastRow: () => 2, getRange: () => ({ getValues: () => [[hash, '2099-01-01', '', revoked]] }) }) }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, text) => [...crypto.createHash('sha256').update(text).digest()] },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k), put: (k, v) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/reportes/Código.js'), 'utf8'), context);
  context.getReportRows_ = () => { reads++; return []; };
  context.buildReportPrompt_ = () => 'fixture';
  context.callOpenAI_ = () => { iaCalls++; return 'Informe'; };
  assert.equal(post(context, { action: 'getClientData' }).ok, false);
  assert.equal(post(context, { action: 'generateClientReport' }).ok, false);
  assert.equal(context.generateClientReport({}).ok, false);
  assert.equal(context.getClientData().ok, false);
  assert.equal(reads, 0); assert.equal(iaCalls, 0);
  assert.equal(post(context, { action: 'getClientData', adminToken: token }).ok, true);
  for (let i = 0; i < 5; i++) assert.equal(post(context, { action: 'generateClientReport', adminToken: token }).ok, true);
  assert.match(post(context, { action: 'generateClientReport', adminToken: token }).error, /límite/);
  assert.equal(iaCalls, 5);
  revoked = '2026-10-20';
  assert.equal(post(context, { action: 'getClientData', adminToken: token }).ok, false);
});

test('guardar cambios conserva el valor cuando Numero_Camiseta usa la columna Dorsal', () => {
  const context = vm.createContext({ ContentService, Utilities: { formatDate: () => '20/10/2026' } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../gas/base-deporte/Código.js'), 'utf8'), context);
  let saved;
  const sheet = { getDataRange: () => ({ getValues: () => [['Dorsal']] }), getRange: () => ({ getValue: () => '7', setValue: value => { saved = value; } }) };
  context.getSheet_ = () => sheet;
  context.base_ensureSportsColumns_ = context.base_ensureProvinciaColumn_ = context.base_ensureTUEColumns_ = x => x;
  context.getRowByPersona_ = () => ({ __row: 2, Persona_ID: 'P1' });
  context.getLogSheet_ = () => ({ appendRow() {} });
  context.guardarCambios('P1', { Numero_Camiseta: '10' }, 'CT');
  assert.equal(saved, '10');
});
