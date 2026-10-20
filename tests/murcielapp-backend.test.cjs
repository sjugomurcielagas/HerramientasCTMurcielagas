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

test('códigos personales reutilizables, registros propios y reintento idempotente', () => {
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
  assert.equal(context.murcielapp_activar({ code }).nombre, 'Ana');
  assert.equal(context.murcielapp_sesion({ token: session.token }).nombre, 'Ana');
  const date = new Date().toISOString().slice(0, 10);
  const payload = { token: session.token, requestId: crypto.randomUUID(), fecha: date, tipo: 'fisico', subtipo: '', duracionMin: 90, sRPE: 5 };
  assert.equal(context.murcielapp_registrarEstimulo(payload).yaRegistrado, false);
  assert.equal(context.murcielapp_registrarEstimulo(payload).yaRegistrado, true);
  assert.throws(() => context.murcielapp_registrarEstimulo({ ...payload, duracionMin: 120 }), /otros datos/);
  assert.equal(context.murcielapp_miSemana({ token: session.token }).length, 1);
  const secondCode = sent[1].body.match(/\d{4} \d{4}/)[0];
  const second = context.murcielapp_activar({ code: secondCode });
  assert.equal(context.murcielapp_miSemana({ token: second.token }).length, 0);
  players[0].Estado_Convocatoria = 'Baja';
  assert.throws(() => context.murcielapp_sesion({ token: session.token }), /no está disponible/);
  players[0].Estado_Convocatoria = '';
  players[0].Activo = 'No';
  assert.throws(() => context.murcielapp_sesion({ token: session.token }), /no está disponible/);
});

test('Mi semana permite consultar completa la semana anterior', () => {
  const { context, sent } = setup();
  context.murcielapp_enviarCodigos({ adminKey: 'a'.repeat(40), personaIds: ['P1'] });
  const session = context.murcielapp_activar({ code: sent[0].body.match(/\d{4} \d{4}/)[0] });
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const monday = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const dateAt = offset => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  for (const offset of [-7, -1, 0]) {
    context.murcielapp_registrarEstimulo({
      token: session.token, requestId: crypto.randomUUID(), fecha: dateAt(offset),
      tipo: 'fisico', subtipo: '', duracionMin: 60, sRPE: 4,
    });
  }
  assert.equal(context.murcielapp_miSemana({ token: session.token, periodo: 'anterior' }).length, 2);
  assert.equal(context.murcielapp_miSemana({ token: session.token, periodo: 'actual' }).length, 1);
  assert.throws(() => context.murcielapp_miSemana({ token: session.token, periodo: 'cualquiera' }), /Semana no válida/);
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

test('cambiar el código invalida el anterior sin perder la sesión ni los registros', () => {
  const { context, sheets, sent } = setup();
  const auth = { adminKey: 'a'.repeat(40) };
  context.murcielapp_enviarCodigos({ ...auth, personaIds: ['P1'] });
  const firstCode = sent[0].body.match(/\d{4} \d{4}/)[0];
  const firstSession = context.murcielapp_activar({ code: firstCode });
  assert.equal(context.murcielapp_destinatarias(auth)[0].estado, 'Activado');
  assert.throws(() => context.murcielapp_reenviarCodigo({ ...auth, personaId: 'P1' }), /10 minutos/);
  sheets.get('MurcielApp_Accesos').getRange(2, 6).setValue('2020-01-01T00:00:00.000Z');
  const result = context.murcielapp_reenviarCodigo({ ...auth, personaId: 'P1' });
  assert.equal(result.estado, 'enviado');
  assert.equal(sent.length, 2);
  assert.equal(sent[1].to, 'ana@example.org');
  assert.equal(context.murcielapp_destinatarias(auth)[0].estado, 'Código enviado');
  const secondCode = sent[1].body.match(/\d{4} \d{4}/)[0];
  assert.equal(context.murcielapp_activar({ code: secondCode }).nombre, 'Ana');
  assert.throws(() => context.murcielapp_activar({ code: firstCode }), /no válido/);
  assert.equal(context.murcielapp_sesion({ token: firstSession.token }).nombre, 'Ana');
  assert.equal(context.murcielapp_destinatarias(auth)[0].estado, 'Activado');
});

test('código de Santiago queda separado del plantel y sin correo', () => {
  const { context, sent } = setup();
  const result = context.murcielapp_codigoPrueba({ adminKey: 'a'.repeat(40) });
  assert.equal(sent.length, 0);
  const session = context.murcielapp_activar({ code: result.code });
  assert.equal(context.murcielapp_sesion({ token: session.token }).nombre, 'Santiago');
});

test('un código ya usado y vencido en la versión anterior permite volver a entrar', () => {
  const { context, sent, sheets } = setup();
  context.murcielapp_enviarCodigos({ adminKey: 'a'.repeat(40), personaIds: ['P1'] });
  const code = sent[0].body.match(/\d{4} \d{4}/)[0];
  context.murcielapp_activar({ code });
  sheets.get('MurcielApp_Accesos').getRange(2, 4).setValue('2020-01-01T00:00:00.000Z');
  assert.equal(context.murcielapp_activar({ code }).nombre, 'Ana');
});

test('la consulta administrativa devuelve registros identificados y excluye pruebas', () => {
  const { context, sent } = setup();
  const adminKey = 'a'.repeat(40);
  const code = context.murcielapp_codigoPrueba({ adminKey }).code;
  const testToken = context.murcielapp_activar({ code }).token;
  const today = new Date().toISOString().slice(0, 10);
  context.murcielapp_registrarEstimulo({ token: testToken, requestId: crypto.randomUUID(), fecha: today, tipo: 'fisico', subtipo: '', duracionMin: 20, sRPE: 4 });
  context.murcielapp_enviarCodigos({ adminKey, personaIds: ['P1'] });
  const playerToken = context.murcielapp_activar({ code: sent[0].body.match(/\d{4} \d{4}/)[0] }).token;
  context.murcielapp_registrarEstimulo({ token: playerToken, requestId: crypto.randomUUID(), fecha: today, tipo: 'tecnico', subtipo: '', duracionMin: 30, sRPE: 5 });
  assert.throws(() => context.murcielapp_adminEstimulos({ desde: today, hasta: today }), /administrativo/);
  const rows = context.murcielapp_adminEstimulos({ adminKey, desde: today, hasta: today });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].jugadora, 'Pérez, Ana');
  assert.equal(rows[0].duracionMin, 30);
  assert.equal(rows[0].sRPE, 5);
  assert.throws(() => context.murcielapp_adminEstimulos({ adminKey, desde: '2026-02-30', hasta: today }), /período válido/);
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

test('acepta códigos anteriores vencidos y limita intentos fallidos', () => {
  const { context, cache, sheets } = setup();
  const legacy = 'A'.repeat(20);
  context.murcielapp_codigoPrueba({ adminKey: 'a'.repeat(40) });
  sheets.get('MurcielApp_Accesos').appendRow([
    'TEST_SANTIAGO', '', context.murcielapp_hash_(legacy), '2020-01-01T00:00:00.000Z', '', '', 'enviado',
  ]);
  assert.equal(context.murcielapp_activar({ code: legacy }).nombre, 'Santiago');
  cache.set('murcielapp_activation_failures', '39');
  assert.throws(() => context.murcielapp_activar({ code: '0000 0000' }), /no válido/);
  assert.throws(() => context.murcielapp_activar({ code: '0000 0001' }), /Demasiados intentos/);
  assert.equal(context.murcielapp_activar({ code: legacy }).nombre, 'Santiago');
});

test('editar y eliminar corrigen los totales, conservan originales y son idempotentes', () => {
  const { context, sheets, sent } = setup();
  const admin = { adminKey: 'a'.repeat(40) };
  context.murcielapp_enviarCodigos({ ...admin, personaIds: ['P1', 'P2'] });
  const token = context.murcielapp_activar({ code: sent[0].body.match(/\d{4} \d{4}/)[0] }).token;
  const otherToken = context.murcielapp_activar({ code: sent[1].body.match(/\d{4} \d{4}/)[0] }).token;
  const date = new Date().toISOString().slice(0, 10);
  const entry = { token, requestId: crypto.randomUUID(), fecha: date, tipo: 'tecnico', subtipo: '', duracionMin: 110, sRPE: 5 };
  context.murcielapp_registrarEstimulo(entry);
  const edit = { ...entry, id: entry.requestId, revision: 0, requestId: crypto.randomUUID(), duracionMin: 80 };
  assert.throws(() => context.murcielapp_editarEstimulo({ ...edit, token: otherToken }), /no está disponible/);
  assert.throws(() => context.murcielapp_editarEstimulo({ ...edit, duracionMin: -1 }), /Duración inválida/);
  assert.equal(context.murcielapp_editarEstimulo(edit).revision, 1);
  assert.equal(context.murcielapp_editarEstimulo(edit).yaProcesado, true);
  assert.throws(() => context.murcielapp_editarEstimulo({ ...edit, duracionMin: 90 }), /otra corrección/);
  assert.throws(() => context.murcielapp_editarEstimulo({ ...edit, requestId: crypto.randomUUID() }), /cambió/);
  let rows = context.murcielapp_adminEstimulos({ ...admin, desde: date, hasta: date });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].duracionMin, 80);
  assert.equal(rows[0].revision, 1);
  assert.equal(sheets.get('MurcielApp_Estimulos').getRange(2, 6).getValues()[0][0], 110);
  const deletion = { token, id: entry.requestId, revision: 1, requestId: crypto.randomUUID() };
  assert.throws(() => context.murcielapp_eliminarEstimulo({ ...deletion, token: otherToken }), /no está disponible/);
  assert.equal(context.murcielapp_eliminarEstimulo(deletion).revision, 2);
  assert.equal(context.murcielapp_eliminarEstimulo(deletion).yaProcesado, true);
  assert.equal(context.murcielapp_adminEstimulos({ ...admin, desde: date, hasta: date }).length, 0);
  assert.equal(context.murcielapp_miSemana({ token }).length, 0);
  // Reintentar la creación original no resucita lo eliminado.
  assert.equal(context.murcielapp_registrarEstimulo(entry).yaRegistrado, true);
  assert.equal(context.murcielapp_adminEstimulos({ ...admin, desde: date, hasta: date }).length, 0);
});

test('reportes usa identidad privada, excluye pruebas e incluye plantel sin registros', () => {
  const { context } = setup();
  const date = new Date().toISOString().slice(0, 10);
  assert.throws(() => context.murcielapp_reporteSemanal({ desde: date, hasta: date }), /administrativo/);
  const report = context.murcielapp_reporteSemanal({ adminKey: 'a'.repeat(40), desde: date, hasta: date });
  assert.equal(report.plantel.length, 2);
  assert.equal(report.plantel[0].personaId, 'P1');
  assert.equal(report.plantel[0].email, undefined);
  assert.equal(report.registros.length, 0);
  assert.equal(report.corte, '2026-10-19');
});
