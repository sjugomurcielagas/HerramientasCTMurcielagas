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

test('diarios sin corte, Otros sin carga, identidad por ID y plantel sin registros', () => {
  const model = M.build(payload([
    entry('old', 'P1', '2026-10-18', 'tecnico', 110, 5),
    entry('new', 'P1', '2026-10-19', 'tecnico', 80, 5),
    entry('other', 'P1', '2026-10-20', 'otros', 30, null),
    entry('zero', 'P1', '2026-10-20', 'fisico', 20, 0),
    entry('test', 'TEST_SANTIAGO', '2026-10-19', 'fisico', 60, 5),
    entry('unknown', 'P3', '2026-10-20', 'fisico', 10, 3)
  ]), '2026-10-12', '2026-10-25');
  assert.equal(model.detalleTransicion.length, 0);
  assert.equal(model.total.cantidad, 5);
  assert.equal(model.total.minutos, 250);
  assert.equal(model.total.carga, 980);
  assert.equal(model.plantel.find(p => p.personaId === 'P2').cantidad, 0);
  assert.equal(model.plantel.find(p => p.personaId === 'P3').fueraPlantel, true);
  assert.equal(model.dias.length, 14);
  assert.equal(model.semanas[0].cantidad, 1);
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

test('unifica ambas fuentes antes y después de la fecha de migración', () => {
  const data = payload([entry('transition', 'P1', '2026-10-18', 'fisico', 60, 5), entry('current', 'P1', '2026-10-20', 'tecnico', 80, 5)]);
  data.historicos = [
    { historico: true, fecha: '2026-09-07', personaId: 'P1', jugadora: 'Ana', total: 5, fisico: 3, tecnico: 2 },
    { historico: true, fecha: '2026-10-19', personaId: 'P1', jugadora: 'Ana', total: 99, fisico: 99, tecnico: 0 }
  ];
  const model = M.build(data, '2026-09-01', '2026-10-31', 'P1');
  assert.equal(model.total.cantidad, 106);
  assert.equal(model.total.minutos, 140);
  assert.deepEqual(model.meses.map(m => m.cantidad), [5, 101]);
  assert.equal(model.semanas.reduce((s, w) => s + w.cantidad, 0), 106);
  assert.equal(model.dias.reduce((s, d) => s + d.cantidad, 0), 2);
  assert.match(M.csv(model.registros), /Histórico semanal/);
  assert.doesNotMatch(M.csv(model.registros), /NaN|undefined/);
});

test('promedios usan todas las semanas y meses incluidos y respetan filtro por tipo', () => {
  const data = payload([entry('a', 'P1', '2026-10-20', 'fisico', 60, 5), entry('b', 'P1', '2026-11-02', 'tecnico', 80, 5)]);
  const model = M.build(data, '2026-10-19', '2026-11-08');
  assert.equal(model.promedios.cantidad.semanal, 2 / 3);
  assert.equal(model.promedios.cantidad.mensual, 1);
  assert.equal(model.promedios.fisico.semanal, 1 / 3);
  const filtered = M.build(data, '2026-10-19', '2026-11-08', '', 'fisico');
  assert.equal(filtered.total.cantidad, 1);
  assert.equal(filtered.total.tecnico, 0);
  assert.equal(filtered.registros.length, 1);
  const zero = M.build(payload([]), '2026-10-19', '2026-10-19');
  assert.equal(zero.promedios.cantidad.semanal, 0);
});

test('navegación por calendario respeta meses cortos, bisiestos y cambio de año', () => {
  assert.deepEqual(M.periodRange('2026-11-03','week'), {desde:'2026-11-02', hasta:'2026-11-08'});
  assert.deepEqual(M.periodRange('2028-02-15','month'), {desde:'2028-02-01', hasta:'2028-02-29'});
  assert.equal(M.advance('2026-01-31','month',1), '2026-02-28');
  assert.equal(M.advance('2026-12-15','month',1), '2027-01-15');
  assert.equal(M.advance('2026-12-31','day',1), '2027-01-01');
});

test('suma y promedios físico-técnicos excluyen Otros en histórico y diario', () => {
  const data = payload([
    entry('f','P1','2026-10-20','fisico',40,4),
    entry('t','P1','2026-10-20','tecnico',60,5),
    ...Array.from({length:8}, (_,i) => entry('o'+i,'P1','2026-10-20','otros',30,null))
  ]);
  data.historicos = [{historico:true,fecha:'2026-09-07',personaId:'P1',jugadora:'Ana',total:5,fisico:3,tecnico:2}];
  const model = M.build(data,'2026-09-01','2026-10-31','P1');
  assert.equal(model.total.cantidad,15);
  assert.equal(model.total.fisicoTecnico,7);
  assert.equal(model.plantel[0].fisicoTecnico,7);
  assert.equal(model.promedios.fisicoTecnico.semanal,7 / model.semanas.length);
  assert.equal(model.promedios.fisicoTecnico.mensual,3.5);
  assert.equal(M.build(data,'2026-09-01','2026-10-31','P1','otros').total.fisicoTecnico,0);
});

test('transición: conserva 63 diarios y no duplica los cuatro del formulario coincidente', () => {
  const counts = [[4,2,1],[5,1,5],[3,3,3],[4,2,0],[2,0,1],[5,2,0],[3,1,0],[3,2,0],[4,4,3]];
  let id=0; const rows=[];
  counts.forEach((types,i) => types.forEach((count,t) => { for(let n=0;n<count;n++) rows.push(entry(String(++id),'P'+i,'2026-10-14',['fisico','tecnico','otros'][t],60,t===2?null:5)); }));
  const data={...payload(rows),plantel:counts.map((_,i)=>({personaId:'P'+i,nombre:'Jugadora '+i})),historicos:[{historico:true,fecha:'2026-10-12',personaId:'P6',jugadora:'Jugadora 6',total:4,fisico:3,tecnico:1}]};
  const result=M.build(data,'2026-10-12','2026-10-18');
  assert.equal(result.total.cantidad,63); assert.equal(result.total.fisicoTecnico,50);
  assert.equal(result.plantel.filter(p=>p.cantidad).length,9);
  assert.equal(result.registros.filter(r=>r.historico).length,0);
  assert.equal(result.dias.reduce((n,d)=>n+d.cantidad,0),63);
});

test('el formulario viejo sigue contando en noviembre aunque no haya diarios', () => {
  const data={...payload([]),historicos:[{historico:true,fecha:'2026-11-02',personaId:'P1',jugadora:'Ana',total:7,fisico:3,tecnico:4}]};
  const result=M.build(data,'2026-11-02','2026-11-08');
  assert.equal(result.total.cantidad,7); assert.equal(result.total.fisicoTecnico,7);
  assert.equal(result.total.minutos,0); assert.equal(result.dias.reduce((s,d)=>s+d.cantidad,0),0);
  assert.match(M.csv(result.registros),/Histórico semanal/);
});

test('ante diferencias conserva el mayor número por tipo y explica el complemento', () => {
  let id=0; const rows=[];
  for(const [tipo,count] of [['fisico',2],['tecnico',4],['otros',1]]) for(let n=0;n<count;n++) rows.push(entry(String(++id),'P1','2026-10-14',tipo,60,tipo==='otros'?null:5));
  const data={...payload(rows),historicos:[{historico:true,fecha:'2026-10-12',personaId:'P1',jugadora:'Ana',total:8,fisico:5,tecnico:2}]};
  const result=M.build(data,'2026-10-12','2026-10-18');
  assert.equal(result.total.cantidad,10); assert.equal(result.total.fisico,5); assert.equal(result.total.tecnico,4); assert.equal(result.total.otros,1);
  assert.equal(result.conciliaciones[0].complemento,3);
  assert.match(M.csv(result.registros),/Complemento semanal conciliado/);
  assert.equal(M.build(data,'2026-10-12','2026-10-18','P1','fisico').total.cantidad,5);
  assert.equal(M.build(data,'2026-10-12','2026-10-18','P1','tecnico').total.cantidad,4);
});

test('el total semanal sin tipo se conserva sin inventar estímulos físicos ni Otros', () => {
  const data={...payload([entry('a','P1','2026-10-14','fisico',60,5)]),historicos:[{historico:true,fecha:'2026-10-12',personaId:'P1',jugadora:'Ana',total:5,fisico:2,tecnico:1}]};
  const result=M.build(data,'2026-10-12','2026-10-18');
  assert.equal(result.total.cantidad,5); assert.equal(result.total.fisico,2); assert.equal(result.total.tecnico,1); assert.equal(result.total.otros,0); assert.equal(result.total.sinClasificar,2);
});

test('las consultas diarias usan toda la semana para no duplicar el formulario en un rango parcial', () => {
  const data={...payload([entry('a','P1','2026-10-13','fisico',60,5),entry('b','P1','2026-10-14','fisico',60,5)]),historicos:[{historico:true,fecha:'2026-10-12',personaId:'P1',jugadora:'Ana',total:2,fisico:2,tecnico:0}]};
  assert.equal(M.build(data,'2026-10-12','2026-10-12').total.cantidad,0);
  const ranges=M.readRanges('2026-01-01','2026-12-31');
  assert.equal(ranges[0].desde,'2025-12-29'); assert.equal(ranges.at(-1).hasta,'2027-01-03');
  ranges.forEach(r=>assert.ok((new Date(r.hasta)-new Date(r.desde))/86400000<=366));
  assert.equal(M.shift(ranges[0].hasta,1),ranges[1].desde);
});

test('aliases auditados unen los nombres anteriores y no adivinan identidades', () => {
  const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../reportes/historico.js'),'utf8'),context);
  const roster=[{personaId:'C',nombre:'Camus Carricondo, Gianella María Jesús'},{personaId:'O',nombre:'Ortiz, Anahí Micaela'}];
  assert.equal(context.resolveWeeklyIdentity({jugadora:'Camus, Gianella'},roster).personaId,'C');
  assert.equal(context.resolveWeeklyIdentity({jugadora:'Ortiz, Micaela'},roster).personaId,'O');
  assert.match(context.resolveWeeklyIdentity({jugadora:'Ortiz, Otra'},roster).personaId,/^historico:/);
});
