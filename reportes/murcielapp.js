(function () {
  'use strict';
  const M = window.MurciReportes;
  const $ = id => document.getElementById(id);
  const storage = 'murcielapp.adminSession.v1';
  const state = { token: '', payload: null, model: null, request: 0, desde: '', hasta: '' };
  try { state.token = localStorage.getItem(storage) || ''; } catch (_) {}
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const type = row => ({ fisico: 'Físico', tecnico: 'Técnico-táctico', otros: 'Otros' }[row.tipo]);
  const fmt = value => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value + 'T12:00:00Z'));
  const num = value => Number(value).toLocaleString('es-AR');
  function session() {
    Murci.useAdminSession(state.token);
    $('daily-auth').hidden = !!state.token;
    $('daily-session').hidden = !state.token;
    $('daily-workspace').hidden = !state.token;
    if (state.token) $('daily-key').value = '';
    $('show-legacy').disabled = !state.token;
  }
  function forget() {
    state.token = ''; state.payload = null; state.model = null; state.request++;
    $('daily-output').replaceChildren(); $('daily-output').hidden = true;
    $('daily-export').disabled = true; $('daily-print').disabled = true;
    $('status-players').textContent = '—'; $('status-date').textContent = '—';
    $('daily-player').replaceChildren(new Option('Todo el equipo', ''));
    $('legacy-report').hidden = true;
    $('btn-audit-toggle').hidden = true;
    $('output').replaceChildren();
    $('show-legacy').setAttribute('aria-expanded', 'false');
    try { localStorage.removeItem(storage); localStorage.removeItem('mrcl_auth'); localStorage.removeItem('mrcl_auth_ts'); } catch (_) {}
    session();
  }
  function table(caption, headers, rows) {
    return `<div class="daily-table"><table><caption>${esc(caption)}</caption><thead><tr>${headers.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function cells(values) { return '<tr>' + values.map(v => `<td>${esc(v)}</td>`).join('') + '</tr>'; }
  function records(rows, caption) {
    if (!rows.length) return '<p class="daily-empty">Sin datos registrados en este período.</p>';
    return table(caption, ['Fecha', 'Jugadora', 'Tipo', 'Actividad', 'Minutos', 'sRPE', 'Carga interna'], rows
      .slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.jugadora.localeCompare(b.jugadora, 'es'))
      .map(r => cells([fmt(r.fecha), r.jugadora, type(r), r.subtipo || '—', num(r.duracionMin), r.sRPE ?? '—', r.tipo === 'otros' ? '—' : num(r.duracionMin * r.sRPE)])));
  }
  function render() {
    if (!state.payload) return;
    const playerId = $('daily-player').value;
    const model = M.build(state.payload, state.desde, state.hasta, playerId);
    state.model = model;
    const individual = playerId ? model.plantel[0]?.nombre || playerId : '';
    $('daily-title').textContent = individual ? `Semana de ${individual}` : 'Semana del equipo';
    const total = model.total;
    const pastOnly = state.hasta < M.CORTE;
    const kpis = [['Estímulos', total.cantidad], ['Minutos', total.minutos], ['Carga interna (UA)', total.carga], ['Otros (sin sRPE)', total.otros]];
    let html = `<h3>${esc(individual || 'Equipo')} · ${fmt(state.desde)} al ${fmt(state.hasta)}</h3>`;
    html += `<p class="daily-note">Fuente: MurcielApp · Actualización: ${esc(new Date(model.actualizado).toLocaleString('es-AR', { timeZone: M.ZONA }))} (Argentina).</p>`;
    if (state.desde < M.CORTE) html += '<div class="notice">El período incluye fechas anteriores al 19/10. Consultá el histórico para sus totales. Los registros diarios de transición se muestran separados al final.</div>';
    if (!pastOnly) {
      html += `<div class="daily-kpis">${kpis.map(([label, value]) => `<div class="daily-kpi"><strong>${num(value)}</strong>${esc(label)}</div>`).join('')}</div>`;
      html += '<p class="daily-note">Carga interna = minutos × sRPE, solo en Físico y Técnico-táctico. «Otros» suma registros y minutos. No se infiere cumplimiento a partir de la ausencia de registros.</p>';
      if (!playerId) {
        html += table('La semana de cada jugadora', ['Jugadora', 'Físico', 'Técnico-táctico', 'Otros', 'Minutos', 'Carga interna', 'Datos'], model.plantel.map(p =>
          `<tr><td><button type="button" data-daily-player="${esc(p.personaId)}">${esc(p.nombre)}</button>${p.fueraPlantel ? '<span class="daily-note"> · fuera del plantel activo</span>' : ''}</td>` +
          [p.fisico, p.tecnico, p.otros, p.minutos, p.carga, p.cantidad ? `${p.cantidad} ${p.cantidad === 1 ? 'registro' : 'registros'}` : 'Sin datos registrados'].map(v => `<td>${esc(v)}</td>`).join('') + '</tr>'));
      }
      html += table('Día por día', ['Día', 'Físico', 'Técnico-táctico', 'Otros', 'Minutos', 'Carga interna', 'Datos'], model.dias.filter(d => d.fecha >= M.CORTE).map(d =>
        cells([fmt(d.fecha), d.fisico, d.tecnico, d.otros, num(d.minutos), num(d.carga), d.cantidad ? `${d.cantidad} ${d.cantidad === 1 ? 'registro' : 'registros'}` : 'Sin datos registrados'])));
      if (model.semanas.length > 1) html += table('Evolución semanal en el rango seleccionado', ['Semana desde', 'Estímulos', 'Minutos', 'Carga interna'], model.semanas.filter(w => w.hasta >= M.CORTE).map(w => cells([fmt(w.desde), w.cantidad, num(w.minutos), num(w.carga)])));
      html += '<h3>Detalle de estímulos</h3>' + records(model.registros, 'Registros incluidos en los totales');
    }
    if (model.detalleTransicion.length) html += '<h3>Detalle de transición · sin sumar a los totales</h3>' + records(model.detalleTransicion, 'Registros diarios anteriores al 19/10/2026');
    else if (pastOnly) html += '<p class="daily-empty">Sin registros diarios para estas fechas. Los totales anteriores están en los reportes históricos.</p>';
    $('daily-output').innerHTML = html; $('daily-output').hidden = false;
    $('daily-export').disabled = !model.registros.length;
    $('daily-print').disabled = false;
    $('status-players').textContent = String(model.plantel.length);
    $('status-date').textContent = new Date(model.actualizado).toLocaleTimeString('es-AR', { timeZone: M.ZONA, hour: '2-digit', minute: '2-digit' });
  }
  function setWeek(value) {
    const start = M.monday(value);
    $('daily-week').value = start;
    $('daily-from').value = start; $('daily-to').value = M.shift(start, 6);
  }
  async function load() {
    if (!state.token) return;
    const request = ++state.request;
    const desde = $('daily-from').value, hasta = $('daily-to').value;
    state.payload = null; state.model = null;
    $('daily-output').hidden = true; $('daily-export').disabled = true; $('daily-print').disabled = true;
    $('daily-status').textContent = 'Consultando registros de MurcielApp…';
    $('daily-refresh').disabled = true;
    try {
      M.shift(desde, 0); M.shift(hasta, 0);
      if (desde > hasta || (new Date(hasta) - new Date(desde)) / 86400000 > 366) throw new Error('Elegí un período válido de hasta un año.');
      const payload = await Murci.apiPost({ action: 'murcielapp_reporteSemanal', adminToken: state.token, desde, hasta });
      if (request !== state.request) return;
      M.build(payload, desde, hasta);
      state.payload = payload; state.desde = desde; state.hasta = hasta;
      const previousPlayer = $('daily-player').value;
      const players = M.build(payload, desde, hasta).plantel;
      $('daily-player').replaceChildren(new Option('Todo el equipo', ''), ...players.map(p => new Option(p.nombre, p.personaId)));
      $('daily-player').value = players.some(p => p.personaId === previousPlayer) ? previousPlayer : '';
      render();
      $('daily-status').textContent = 'Datos actualizados. Los totales reflejan las correcciones y eliminaciones guardadas.';
    } catch (error) {
      if (request !== state.request) return;
      if (/Acceso administrativo (vencido|inválido)/.test(error.message || '')) forget();
      $('daily-status').textContent = error.message || 'No se pudieron consultar los registros. Intentá nuevamente.';
    } finally { if (request === state.request || !state.token) $('daily-refresh').disabled = false; }
  }
  $('daily-auth').addEventListener('submit', async event => {
    event.preventDefault(); const button = event.submitter; button.disabled = true;
    $('daily-status').textContent = 'Comprobando acceso…';
    try {
      const result = await Murci.apiPost({ action: 'murcielapp_adminSesion', adminKey: $('daily-key').value });
      state.token = result.token;
      if ($('daily-remember').checked) { try { localStorage.setItem(storage, state.token); } catch (_) {} }
      session(); await load();
    } catch (error) { $('daily-status').textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('daily-logout').addEventListener('click', async () => {
    const token = state.token; forget();
    $('daily-status').textContent = 'Sesión cerrada en este navegador.';
    try { await Murci.apiPost({ action: 'murcielapp_adminCerrarSesion', adminToken: token }); }
    catch (_) { $('daily-status').textContent = 'Acceso borrado de este navegador. No se pudo revocar la sesión en el servidor; volverá a vencer automáticamente.'; }
  });
  $('daily-refresh').addEventListener('click', load);
  $('daily-player').addEventListener('change', render);
  $('daily-output').addEventListener('click', event => {
    const button = event.target.closest('[data-daily-player]'); if (!button) return;
    $('daily-player').value = button.dataset.dailyPlayer; render(); $('daily-title').focus();
  });
  $('daily-week').addEventListener('change', () => { if ($('daily-week').value) { setWeek($('daily-week').value); load(); } });
  $('daily-prev').addEventListener('click', () => { setWeek(M.shift($('daily-week').value, -7)); load(); });
  $('daily-next').addEventListener('click', () => { setWeek(M.shift($('daily-week').value, 7)); load(); });
  $('daily-current').addEventListener('click', () => { setWeek(M.today()); load(); });
  $('daily-range').addEventListener('submit', event => { event.preventDefault(); load(); });
  $('daily-print').addEventListener('click', () => window.print());
  $('daily-export').addEventListener('click', () => {
    if (!state.model) return;
    const url = URL.createObjectURL(new Blob([M.csv(state.model.registros)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `murcielapp-${state.desde}-${state.hasta}${$('daily-player').value ? '-jugadora' : '-equipo'}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('show-legacy').addEventListener('click', () => {
    const visible = $('legacy-report').hidden;
    $('legacy-report').hidden = !visible;
    $('btn-audit-toggle').hidden = !visible;
    $('show-legacy').setAttribute('aria-expanded', String(visible));
    if (visible && typeof startApp === 'function') startApp();
  });
  window.addEventListener('storage', event => {
    if (event.key !== storage) return;
    if (event.newValue) { state.token = event.newValue; session(); load(); }
    else { forget(); $('daily-status').textContent = 'La sesión se cerró en otra pestaña. Volvé a entrar.'; }
  });
  setWeek(M.today()); session(); if (state.token) load();
})();
