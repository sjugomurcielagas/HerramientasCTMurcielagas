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
  function empty() { return { cantidad: 0, minutos: 0, carga: 0, fisico: 0, tecnico: 0, otros: 0 }; }
  function sum(rows) {
    return rows.reduce((s, r) => {
      s.cantidad++; s.minutos += r.duracionMin; s[r.tipo]++;
      if (r.tipo !== 'otros') s.carga += r.duracionMin * r.sRPE;
      return s;
    }, empty());
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
  function build(payload, desde, hasta, personaId = '') {
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
    const rows = all.filter(r => r.fecha >= desde && r.fecha <= hasta && r.fecha >= CORTE && (!personaId || r.personaId === personaId));
    const detalleTransicion = all.filter(r => r.fecha >= desde && r.fecha <= hasta && r.fecha < CORTE && (!personaId || r.personaId === personaId));
    const players = [...roster.values()].filter(p => !personaId || personaId === p.personaId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => {
      const records = rows.filter(r => r.personaId === p.personaId);
      return { ...p, registros: records, ...sum(records) };
    });
    const dias = [];
    for (let day = desde; day <= hasta; day = shift(day, 1)) {
      const records = rows.filter(r => r.fecha === day);
      dias.push({ fecha: day, registros: records, ...sum(records) });
    }
    const semanas = [];
    for (let week = monday(desde); week <= hasta; week = shift(week, 7)) {
      semanas.push({ desde: week, hasta: shift(week, 6), ...sum(rows.filter(r => monday(r.fecha) === week)) });
    }
    return { desde, hasta, registros: rows, detalleTransicion, plantel: players, dias, semanas, total: sum(rows), actualizado: payload.actualizado };
  }
  function csv(rows) {
    const quote = value => {
      let text = String(value ?? '');
      if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    return '\uFEFF' + [['Fecha', 'Jugadora', 'Persona_ID', 'Tipo', 'Subtipo', 'Minutos', 'sRPE', 'Carga interna', 'ID', 'Revisión', 'Fuente'],
      ...rows.map(r => [r.fecha, r.jugadora, r.personaId, r.tipo, r.subtipo, r.duracionMin, r.sRPE ?? '', r.tipo === 'otros' ? '' : r.duracionMin * r.sRPE, r.id, r.revision, 'MurcielApp'])]
      .map(line => line.map(quote).join(';')).join('\r\n');
  }
  return { CORTE, ZONA, today, shift, monday, sum, build, csv };
});
