const assert = require('node:assert/strict');
const { test } = require('node:test');
const M = require('../reportes/murcielapp-model.js');
const entry = (id, personaId, fecha, tipo, duracionMin, sRPE) => ({ id, personaId, fecha, tipo, duracionMin, sRPE, jugadora: personaId, revision: 0 });
const payload = rows => ({ corte: M.CORTE, actualizado: '2026-10-20T18:00:00Z', registros: rows, plantel: [{ personaId: 'P1', nombre: 'Ana' }, { personaId: 'P2', nombre: 'Eva' }] });

test('semanas de Argentina, domingo/lunes y cambio de año', () => {
  assert.equal(M.today(new Date('2026-10-19T01:00:00Z')), '2026-10-18');
  assert.equal(M.monday('2026-10-18'), '2026-10-12');
  assert.equal(M.monday('2026-10-19'), '2026-10-19');
  assert.equal(M.monday('2027-01-01'), '2026-12-28');
  assert.equal(M.shift('2026-12-31', 1), '2027-01-01');
  assert.throws(() => M.monday('2026-02-30'), /Fecha inválida/);
});

test('corte histórico sin doble conteo, Otros sin carga, identidad por ID y plantel sin registros', () => {
  const model = M.build(payload([
    entry('old', 'P1', '2026-10-18', 'tecnico', 110, 5),
    entry('new', 'P1', '2026-10-19', 'tecnico', 80, 5),
    entry('other', 'P1', '2026-10-20', 'otros', 30, null),
    entry('zero', 'P1', '2026-10-20', 'fisico', 20, 0),
    entry('test', 'TEST_SANTIAGO', '2026-10-19', 'fisico', 60, 5),
    entry('unknown', 'P3', '2026-10-20', 'fisico', 10, 3)
  ]), '2026-10-12', '2026-10-25');
  assert.equal(model.detalleTransicion.length, 1);
  assert.equal(model.total.cantidad, 4);
  assert.equal(model.total.minutos, 140);
  assert.equal(model.total.carga, 430);
  assert.equal(model.plantel.find(p => p.personaId === 'P2').cantidad, 0);
  assert.equal(model.plantel.find(p => p.personaId === 'P3').fueraPlantel, true);
  assert.equal(model.dias.length, 14);
  assert.equal(model.semanas[0].cantidad, 0);
  assert.equal(model.semanas[1].cantidad, 4);
  const individual = M.build(payload([entry('a', 'P1', '2026-10-19', 'tecnico', 80, 5), entry('b', 'P2', '2026-10-19', 'fisico', 60, 4)]), '2026-10-19', '2026-10-25', 'P1');
  assert.equal(individual.total.minutos, 80);
  assert.equal(individual.total.carga, 400);
});

test('no oculta datos inválidos ni duplicados y conserva entrenamientos distintos del mismo día', () => {
  const row = entry('a', 'P1', '2026-10-19', 'fisico', 60, 5);
  assert.throws(() => M.build(payload([row, row]), '2026-10-19', '2026-10-25'), /duplicados/);
  assert.throws(() => M.build(payload([{ ...row, sRPE: null }]), '2026-10-19', '2026-10-25'), /inválidos/);
  assert.equal(M.build(payload([row, { ...row, id: 'b' }]), '2026-10-19', '2026-10-25').total.cantidad, 2);
});

test('CSV coincide con los registros y neutraliza fórmulas en nombres', () => {
  const csv = M.csv([{ ...entry('a', 'P1', '2026-10-19', 'otros', 30, null), jugadora: '=HYPERLINK("x")', subtipo: 'Psicología' }]);
  assert.match(csv, /"30";"";""/);
  assert.match(csv, /'\=HYPERLINK/);
  assert.match(csv, /MurcielApp/);
});
