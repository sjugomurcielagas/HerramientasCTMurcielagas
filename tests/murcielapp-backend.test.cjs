const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function setup() {
  const sheets = new Map();
  const sent = [];
  const cache = new Map();
  const players = [
    { Persona_ID: 'P1', Nombre: 'Ana', Apellido: 'Pérez', Email: '\u2060ana@example.org', Tipo_Integrante: 'Jugadora', Activo: 'Sí', Estado_Plantel: 'Activa' },
    { Persona_ID: 'P2', Nombre: 'Eva', Apellido: 'Luna', Email: 'eva@example.org', Tipo_Integrante: 'Arquera', Activo: 'Sí', Estado_Plantel: 'Activa' },
  ];
  const workbook = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) {
      const cells = [];
      const sheet = {
        getLastRow: () => cells.length,
        appendRow: row => cells.push([...row]),
        setFrozenRows: () => {},
        getRange(row, col, height = 1, width = 1) {
          return {
            getValues: () => Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => cells[row - 1 + y]?.[col - 1 + x] ?? '')),
            setValues: values => values.forEach((line, y) => line.forEach((value, x) => { cells[row - 1 + y][col - 1 + x] = value; })),
            setValue: value => { cells[row - 1][col - 1] = value; },
          };
        },
      };
      sheets.set(name, sheet);
      return sheet;
    },
  };
  const context = vm.createContext({
    CONFIG: { SPREADSHEET_ID: 'fake' },
    PERSONA_ID_COLUMN: 'Persona_ID',
    SpreadsheetApp: { openById: () => workbook },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'a'.repeat(40) }) },
    getAllRows_: () => players,
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: mail => sent.push(mail) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: key => cache.get(key), put: (key, value) => cache.set(key, value) }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: (_, value) => [...crypto.createHash('sha256').update(value).digest()].map(x => x > 127 ? x - 256 : x),
      getUuid: () => crypto.randomUUID(),
      formatDate: (date) => new Date(date).toISOString().slice(0, 10),
    },
  });
  const code = fs.readFileSync(path.join(__dirname, '..', 'gas', 'base-deporte', 'MurcielApp.js'), 'utf8');
  vm.runInContext(code, context);
  return { context, sent, players, cache, sheets };
}

test('códigos individuales, activación única, registros propios y reintento idempotente', () => {
  const { context, sent, players } = setup();
  assert.throws(() => context.murcielapp_destinatarias({ adminKey: 'incorrecta' }), /administrativo/);
  const preview = context.murcielapp_destinatarias({ adminKey: 'a'.repeat(40) });
  assert.equal(preview.length, 2);
  assert.equal(preview[0].email, 'ana@example.org');
  assert.equal(preview[0].estado, 'Pendiente');
  context.murcielapp_enviarCodigos({ adminKey: 'a'.repeat(40), personaIds: ['P1', 'P2'] });
  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, 'ana@example.org');
  const code = sent[0].body.match(/\d{4} \d{4}/)[0];
  const session = context.murcielapp_activar({ code });
  assert.equal(session.nombre, 'Ana');
  assert.throws(() => context.murcielapp_activar({ code }), /inválido o vencido/);
  assert.equal(context.murcielapp_sesion({ token: session.token }).nombre, 'Ana');
  const date = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  const payload = { token: session.token, requestId: crypto.randomUUID(), fecha: date, tipo: 'fisico', subtipo: '', duracionMin: 90, sRPE: 5 };
  assert.equal(context.murcielapp_registrarEstimulo(payload).yaRegistrado, false);
  assert.equal(context.murcielapp_registrarEstimulo(payload).yaRegistrado, true);
  assert.equal(context.murcielapp_miSemana({ token: session.token }).length, 1);
  const secondCode = sent[1].body.match(/\d{4} \d{4}/)[0];
  const second = context.murcielapp_activar({ code: secondCode });
  assert.equal(context.murcielapp_miSemana({ token: second.token }).length, 0);
  players[0].Activo = 'No';
  assert.throws(() => context.murcielapp_sesion({ token: session.token }), /no está disponible/);
});

test('sesión administrativa temporal, sin guardar la clave y revocable', () => {
  const { context, sheets } = setup();
  assert.throws(() => context.murcielapp_adminSesion({ adminKey: 'incorrecta' }), /administrativo/);
  const { token, expiresInDays } = context.murcielapp_adminSesion({ adminKey: 'a'.repeat(40) });
  assert.match(token, /^[a-f0-9]{64}$/i);
  assert.equal(expiresInDays, 30);
  const stored = sheets.get('MurcielApp_AdminSesiones').getRange(2, 1, 1, 4).getValues()[0];
  assert.notEqual(stored[0], token);
  assert.equal(context.murcielapp_destinatarias({ adminToken: token }).length, 2);
  assert.deepEqual({ ...context.murcielapp_adminCerrarSesion({ adminToken: token }) }, { cerrado: true });
  assert.throws(() => context.murcielapp_destinatarias({ adminToken: token }), /vencido/);
  const next = context.murcielapp_adminSesion({ adminKey: 'a'.repeat(40) });
  sheets.get('MurcielApp_AdminSesiones').getRange(3, 2).setValue('2020-01-01T00:00:00.000Z');
  assert.throws(() => context.murcielapp_destinatarias({ adminToken: next.token }), /vencido/);
});

test('código de Santiago queda separado del plantel y sin correo', () => {
  const { context, sent } = setup();
  const result = context.murcielapp_codigoPrueba({ adminKey: 'a'.repeat(40) });
  assert.equal(sent.length, 0);
  const session = context.murcielapp_activar({ code: result.code });
  assert.equal(context.murcielapp_sesion({ token: session.token }).nombre, 'Santiago');
});

test('Otros se guarda sin intensidad y rechaza fechas futuras', () => {
  const { context } = setup();
  const code = context.murcielapp_codigoPrueba({ adminKey: 'a'.repeat(40) }).code;
  const token = context.murcielapp_activar({ code }).token;
  const today = new Date().toISOString().slice(0, 10);
  const entry = { token, requestId: crypto.randomUUID(), fecha: today, tipo: 'otros', subtipo: 'Psicología', duracionMin: 75, sRPE: null };
  context.murcielapp_registrarEstimulo(entry);
  const [saved] = context.murcielapp_miSemana({ token });
  assert.equal(saved.subtipo, 'Psicología');
  assert.equal(saved.sRPE, '');
  assert.throws(() => context.murcielapp_registrarEstimulo({ ...entry, requestId: crypto.randomUUID(), fecha: '2099-01-01' }), /Fecha inválida/);
});

test('acepta códigos largos vigentes y limita intentos fallidos de códigos cortos', () => {
  const { context, cache, sheets } = setup();
  const legacy = 'A'.repeat(20);
  context.murcielapp_codigoPrueba({ adminKey: 'a'.repeat(40) });
  sheets.get('MurcielApp_Accesos').appendRow([
    'TEST_SANTIAGO', '', context.murcielapp_hash_(legacy), new Date(Date.now() + 86400000).toISOString(), '', '', 'enviado',
  ]);
  assert.equal(context.murcielapp_activar({ code: legacy }).nombre, 'Santiago');
  cache.set('murcielapp_activation_failures', '39');
  assert.throws(() => context.murcielapp_activar({ code: '0000 0000' }), /inválido o vencido/);
  assert.throws(() => context.murcielapp_activar({ code: '0000 0001' }), /Demasiados intentos/);
});
