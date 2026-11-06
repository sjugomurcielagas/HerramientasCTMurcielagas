const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function setup() {
  const players = [
    { Persona_ID: 'A', DNI: '12345678', Nombre: 'Ana', Tipo_Integrante: 'Jugadora', Activo: 'Sí' },
    { Persona_ID: 'B', DNI: '23456789', Nombre: 'Bea', Tipo_Integrante: 'Arquera', Activo: 'Sí' },
    { Persona_ID: 'C', DNI: '34567890', Nombre: 'Carla', Tipo_Integrante: 'Jugadora', Activo: 'Sí' },
  ];
  const penalties = [
    { id: 'p1', sesionId: 's1', jugadora_persona_id: 'A', arquera_persona_id: 'B', zona: '3', resultado: 'gol', potencia: 'fuerte' },
    { id: 'p2', sesionId: 's1', jugadora: '34567890', arquera: '23456789', zona: '4', resultado: 'atajado', potencia: 'medio' },
    { id: 'p3', sesionId: 's2', jugadora_persona_id: 'A', arquera_persona_id: 'A', zona: '1', resultado: 'afuera', potencia: 'debil' },
    { id: 'p4', sesionId: 's2', jugadora_persona_id: 'C', arquera_persona_id: 'C', zona: '2', resultado: 'palo', potencia: 'fuerte' },
  ];
  const sessionRows = [
    { TokenHash: crypto.createHash('sha256').update('a'.repeat(64)).digest('hex'), Persona_ID: 'A', Vence: '2099-01-01' },
    { TokenHash: crypto.createHash('sha256').update('b'.repeat(64)).digest('hex'), Persona_ID: 'B', Vence: '2099-01-01' },
    { TokenHash: crypto.createHash('sha256').update('c'.repeat(64)).digest('hex'), Persona_ID: 'C', Vence: '2099-01-01' },
  ];
  const context = vm.createContext({
    PERSONA_ID_COLUMN: 'Persona_ID',
    SHEETS: { penales: 'Penales' },
    getAllRows_: () => players,
    getSheet: () => penalties,
    sheetToObjects: rows => rows,
    _normalizarPenalBackend_: row => ({
      ...row,
      jugadora_persona_id: row.jugadora_persona_id || row.jugadora,
      arquera_persona_id: row.arquera_persona_id || row.arquera,
    }),
    penales_getSesiones: () => ({ data: [
      { id: 's1', fecha: '2026-11-01', nombre: 'Sesión 1', contexto: 'Entrenamiento' },
      { id: 's2', fecha: '2026-11-02', nombre: 'Sesión 2', contexto: 'Competencia' },
      { id: 's3', fecha: '2026-11-03', nombre: 'Ajena' },
    ] }),
    normalizarDNI_: value => String(value || '').replace(/\D/g, ''),
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest: (_, value) => [...crypto.createHash('sha256').update(value).digest()].map(x => x > 127 ? x - 256 : x),
      formatDate: value => String(value).slice(0, 10),
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'gas', 'base-deporte', 'MurcielApp.js'), 'utf8'), context);
  context.murcielapp_sheet_ = () => 'sessions';
  context.murcielapp_rows_ = () => sessionRows;
  return { context, players };
}

test('cada jugadora ve sus penales como ejecutante o arquera, sin sesiones ajenas', () => {
  const { context } = setup();
  const ana = context.murcielapp_misPenales({ token: 'a'.repeat(64) });
  const bea = context.murcielapp_misPenales({ token: 'b'.repeat(64) });
  const carla = context.murcielapp_misPenales({ token: 'c'.repeat(64) });
  assert.deepEqual([...ana.penales.map(p => p.id)], ['p1', 'p3']);
  assert.deepEqual([...bea.penales.map(p => p.id)], ['p1', 'p2']);
  assert.deepEqual([...carla.penales.map(p => p.id)], ['p2', 'p4']);
  assert.deepEqual([...bea.sesiones.map(s => s.id)], ['s1']);
  assert.equal(ana.sesiones.some(s => s.id === 's3'), false);
  assert.deepEqual([...ana.penales.find(p => p.id === 'p3').roles].sort(), ['Arquera', 'Ejecutante']);
  assert.throws(() => context.murcielapp_misPenales({ token: 'd'.repeat(64) }), /acceso/i);
});

test('un acceso dado de baja no consulta los penales', () => {
  const { context, players } = setup();
  players[1].Activo = 'No';
  assert.throws(() => context.murcielapp_misPenales({ token: 'b'.repeat(64) }), /acceso/i);
});

test('Penales ofrece título, estado anunciado y resultados en lista semántica', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'murcielapp', 'index.html'), 'utf8');
  assert.match(html, /id="penales-section"[^>]*aria-labelledby="penales-title"/);
  assert.match(html, /id="penales-title"[^>]*tabindex="-1"/);
  assert.match(html, /id="penales-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /createElement\('ul'\)/);
  assert.match(html, /renderPenaltyHeatmap/);
  assert.match(html, /Cada círculo representa un resultado diferente/);
  assert.match(html, /penalty-ball/);
  assert.match(html, /gol: 'gol'/);
  assert.match(html, /atajado: 'ataja'/);
  assert.match(html, /penales-title'\)\.focus\(\)/);
});
