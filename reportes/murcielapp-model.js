(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MurciReportes = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CORTE = '2026-10-19';
  const ZONA = 'America/Argentina/Buenos_Aires';
  function date(value) {
    const d = new Date(String(value) + 'T12:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(d) || d.toISOString().slice(0, 10) !== value) throw new Error('Fecha inválida.');
    return d;
  }
  function today(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function shift(value, days) { const d = date(value); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
  function monday(value) { const d = date(value); return shift(value, -((d.getUTCDay() + 6) % 7)); }
  function periodRange(value, unit) {
    date(value);
    if (unit === 'day') return { desde: value, hasta: value };
    if (unit === 'week') { const desde = monday(value); return { desde, hasta: shift(desde, 6) }; }
    const desde = value.slice(0, 7) + '-01', d = date(desde);
    d.setUTCMonth(d.getUTCMonth() + 1);
    return { desde, hasta: shift(d.toISOString().slice(0, 10), -1) };
  }
  function advance(value, unit, direction) {
    if (unit !== 'month') return shift(value, direction * (unit === 'week' ? 7 : 1));
    const d = date(value), day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + direction);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10);
  }
  function readRanges(desde, hasta) {
    const ranges = [], end = shift(monday(hasta), 6);
    for (let start = monday(desde); start <= end;) {
      const limit = shift(start, 366), finish = limit < end ? limit : end;
      ranges.push({ desde: start, hasta: finish }); start = shift(finish, 1);
    }
    return ranges;
  }
  function empty() { return { cantidad: 0, minutos: 0, carga: 0, fisico: 0, tecnico: 0, otros: 0 }; }
  function sum(rows) {
    const totals = rows.reduce((s, r) => {
      if (r.historico) { s.cantidad += r.total; s.fisico += r.fisico; s.tecnico += r.tecnico; s.otros += r.otros || 0; return s; }
      s.cantidad++; s.minutos += r.duracionMin; s[r.tipo]++;
      if (r.tipo !== 'otros') s.carga += r.duracionMin * r.sRPE;
      return s;
    }, empty());
    return { ...totals, fisicoTecnico: totals.fisico + totals.tecnico, sinClasificar: Math.max(0, totals.cantidad - totals.fisico - totals.tecnico - totals.otros) };
  }
  function validate(row) {
    date(row.fecha);
    if (!row.id || !row.personaId || !['fisico', 'tecnico', 'otros'].includes(row.tipo) ||
      !Number.isInteger(row.duracionMin) || row.duracionMin < 1 || row.duracionMin > 1440 ||
      (row.tipo !== 'otros' && (!Number.isInteger(row.sRPE) || row.sRPE < 0 || row.sRPE > 10))) {
      throw new Error('Hay un estímulo con datos inválidos. Revisá la fuente antes de analizar.');
    }
    return { ...row, sRPE: row.tipo === 'otros' ? null : row.sRPE };
  }
  function build(payload, desde, hasta, personaId = '', tipo = '') {
    date(desde); date(hasta);
    if (desde > hasta) throw new Error('El inicio debe ser anterior al fin.');
    if (!payload || !Array.isArray(payload.registros) || !Array.isArray(payload.plantel)) throw new Error('Respuesta de Reportes inválida.');
    if (payload.corte !== CORTE) throw new Error('El corte de transición no coincide con el servidor.');
    const unique = new Set();
    const all = payload.registros.filter(r => r.personaId !== 'TEST_SANTIAGO').map(validate);
    all.forEach(r => {
      const key = `${r.personaId}:${r.id}`;
      if (unique.has(key)) throw new Error('La fuente devolvió registros duplicados. Actualizá los datos.');
      unique.add(key);
    });
    const roster = new Map(payload.plantel.filter(p => p.personaId && p.personaId !== 'TEST_SANTIAGO').map(p => [p.personaId, { ...p, fueraPlantel: false }]));
    all.forEach(r => { if (!roster.has(r.personaId)) roster.set(r.personaId, { personaId: r.personaId, nombre: r.jugadora || r.personaId, fueraPlantel: true }); });
    const historicos = (payload.historicos || []).filter(r => r.personaId !== 'TEST_SANTIAGO' && r.fecha >= monday(desde) && r.fecha <= hasta).map(r => {
      date(r.fecha);
      for (const key of ['total', 'fisico', 'tecnico']) if (!Number.isFinite(r[key]) || r[key] < 0) throw new Error('Reporte semanal inválido.');
      if (!r.personaId || !Number.isFinite(r.otros || 0) || (r.otros || 0) < 0) throw new Error('Reporte semanal inválido.');
      return { ...r, historico: true, otros: r.otros || 0 };
    });
    historicos.forEach(r => { if (!roster.has(r.personaId)) roster.set(r.personaId, { personaId: r.personaId, nombre: r.jugadora }); });
    const groups = new Map(), conciliaciones = [], dailyByWeek = new Map();
    all.forEach(r => { const key = r.personaId + ':' + monday(r.fecha); if (!dailyByWeek.has(key)) dailyByWeek.set(key, []); dailyByWeek.get(key).push(r); });
    historicos.forEach(r => {
      const key = r.personaId + ':' + monday(r.fecha);
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r);
    });
    const complementos = [];
    groups.forEach(group => {
      const first = group[0], week = monday(first.fecha);
      const dailyRows = dailyByWeek.get(first.personaId + ':' + week) || [];
      const daily = sum(dailyRows);
      // The weekly form has no per-session dates: retain the greatest count per type,
      // adding only the weekly excess to the daily records, never both full totals.
      const weekly = Object.fromEntries(['total', 'fisico', 'tecnico', 'otros'].map(k => [k, Math.max(...group.map(r => Number(r[k]) || 0))]));
      const delta = Object.fromEntries(['fisico', 'tecnico', 'otros'].map(k => [k, Math.max(0, weekly[k] - daily[k])]));
      const extra = Math.max(0, weekly.total - daily.cantidad, delta.fisico + delta.tecnico + delta.otros);
      if (extra) complementos.push({ ...first, id: 'semanal:' + first.personaId + ':' + week, fecha: week, total: extra, ...delta, conciliado: dailyRows.length > 0, totalFuente: weekly.total });
      if ((dailyRows.length && (weekly.total !== daily.cantidad || ['fisico','tecnico','otros'].some(k => weekly[k] !== daily[k]))) || weekly.total < weekly.fisico + weekly.tecnico + weekly.otros) conciliaciones.push({ personaId: first.personaId, jugadora: first.jugadora, semana: week, semanal: weekly, diario: daily, complemento: extra });
    });
    let rows = all.concat(complementos).filter(r => r.fecha >= desde && r.fecha <= hasta && (!personaId || r.personaId === personaId));
    const detalleTransicion = [];
    if (tipo) {
      if (!['fisico', 'tecnico', 'otros'].includes(tipo)) throw new Error('Tipo de estímulo inválido.');
      rows = rows.filter(r => r.historico || r.tipo === tipo).map(r => r.historico ? { ...r, total: r[tipo] || 0, fisico: tipo === 'fisico' ? r.fisico : 0, tecnico: tipo === 'tecnico' ? r.tecnico : 0, otros: tipo === 'otros' ? (r.otros || 0) : 0 } : r);
    }
    const players = [...roster.values()].filter(p => !personaId || personaId === p.personaId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => {
      const records = rows.filter(r => r.personaId === p.personaId);
      return { ...p, registros: records, ...sum(records) };
    });
    const dias = [];
    for (let day = desde; day <= hasta; day = shift(day, 1)) {
      const records = rows.filter(r => !r.historico && r.fecha === day);
      dias.push({ fecha: day, registros: records, ...sum(records) });
    }
    const semanas = [];
    for (let week = monday(desde); week <= hasta; week = shift(week, 7)) {
      semanas.push({ desde: week, hasta: shift(week, 6), ...sum(rows.filter(r => monday(r.fecha) === week)) });
    }
    const meses = [];
    for (let month = desde.slice(0, 7); month <= hasta.slice(0, 7);) {
      meses.push({ mes: month, ...sum(rows.filter(r => r.fecha.startsWith(month))) });
      const d = date(month + '-01'); d.setUTCMonth(d.getUTCMonth() + 1); month = d.toISOString().slice(0, 7);
    }
    return { conciliaciones: conciliaciones.filter(r => r.semana >= monday(desde) && r.semana <= hasta && (!personaId || r.personaId === personaId)), historicos: historicos.filter(r => r.fecha >= desde && r.fecha <= hasta && (!personaId || r.personaId === personaId)), promedios: averages(sum(rows), semanas.length, meses.length), meses, desde, hasta, registros: rows, detalleTransicion, plantel: players, dias, semanas, total: sum(rows), actualizado: payload.actualizado };
  }
  // Calendar buckets intersecting the selected range, including buckets without records.
  // Partial first/last weeks and months count as one; no extrapolation of missing days.
  function averages(total, weeks, months) {
    return Object.fromEntries(['cantidad', 'fisico', 'tecnico', 'otros', 'fisicoTecnico', 'sinClasificar'].map(key => [key, { semanal: total[key] / weeks, mensual: total[key] / months }]));
  }
  function csv(rows) {
    const quote = value => {
      let text = String(value ?? '');
      if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    return '\uFEFF' + [['Fecha', 'Jugadora', 'Persona_ID', 'Tipo', 'Subtipo', 'Minutos', 'sRPE', 'Carga interna', 'ID', 'Revisión', 'Fuente', 'Estímulos', 'Físico', 'Técnico-táctico', 'Otros', 'Total original semanal'],
      ...rows.map(r => [r.fecha, r.jugadora, r.personaId, r.tipo, r.subtipo, r.duracionMin, r.sRPE ?? '', r.historico || r.tipo === 'otros' ? '' : r.duracionMin * r.sRPE, r.id, r.revision, r.historico ? (r.conciliado ? 'Complemento semanal conciliado' : 'Histórico semanal') : 'MurcielApp', r.historico ? r.total : 1, r.historico ? r.fisico : (r.tipo === 'fisico' ? 1 : 0), r.historico ? r.tecnico : (r.tipo === 'tecnico' ? 1 : 0), r.historico ? r.otros : (r.tipo === 'otros' ? 1 : 0), r.historico ? r.totalFuente : ''])]
      .map(line => line.map(quote).join(';')).join('\r\n');
  }
  return { CORTE, ZONA, today, shift, monday, periodRange, advance, readRanges, sum, build, averages, csv };
});
