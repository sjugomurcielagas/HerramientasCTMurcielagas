function normalizeKey(str) {
      return String(str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    }

function parseDate(value) {
      if (!value) return null;
      if (value instanceof Date) return value;
      const s = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.substring(0,10) + 'T12:00:00');

      const firstPart = s.split(' ')[0];
      const parts = firstPart.split(/[\/.-]/).map(Number);
      if (parts.length >= 3) {
        const [d, m, y] = parts;
        if (y > 1900) return new Date(y, m - 1, d, 12);
      }

      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }

function isoWeekKey(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
    }

function getTrainingPeriodStart(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);

  const day = d.getDay(); // domingo 0, lunes 1...
  const daysSinceMonday = (day + 6) % 7;

  // lunes de la semana de carga
  d.setDate(d.getDate() - daysSinceMonday);

  // lunes de la semana trabajada anterior
  d.setDate(d.getDate() - 7);

  return d;
}

function trainingPeriodKey(date) {
  return isoWeekKey(getTrainingPeriodStart(date));
}

function trainingPeriodLabelFromDate(date) {
  const start = getTrainingPeriodStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return formatShortDate(start) + ' al ' + formatShortDate(end);
}

function trainingPeriodLabelFromKey(weekKey) {
  const start = getIsoWeekStartDate(weekKey);
  if (!start) return '';
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return formatShortDate(start) + ' al ' + formatShortDate(end);
}

function nextTrainingPeriodKey(weekKey) {
  const start = getIsoWeekStartDate(weekKey);
  if (!start) return weekKey;
  const next = new Date(start);
  next.setUTCDate(start.getUTCDate() + 7);
  return isoWeekKey(new Date(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 12));
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

function toNumber(v) {
      const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
      return Number.isFinite(n) ? n : 0;
    }

function mapIncomingRow(r) {
      const keys = Object.keys(r).reduce((acc, k) => {
        acc[normalizeKey(k)] = r[k];
        return acc;
      }, {});

      const fecha = keys.fecha || keys.date || keys.dia || keys['marca temporal'] || keys.timestamp;
      const jugadora = keys.jugadora || keys.nombre || keys.deportista || keys.apellido || keys['nombre y apellido'] || '';
      const total = keys.total || keys.estimulos || keys['total estimulos'] || keys['estimulos totales'] || keys['volumen total'];
      const fisico = keys.fisico || keys['estimulos fisicos'] || keys['trabajo fisico'] || keys['volumen fisico'];
      const tecnico = keys.tecnico || keys['tecnico tactico'] || keys['tecnico-tactico'] || keys['trabajo tecnico'] || keys['trabajo tecnico tactico'] || keys['volumen tecnico'];
      const comentario = keys.comentario || keys.observaciones || keys.observacion || keys.novedades || keys.comentarios || '';
      const periodoAnalisis = String(r.periodoAnalisis || r.periodo_analisis || r.week || '').trim();
      const periodoOriginal = String(r.periodoOriginal || r.periodo_original || '').trim();

      const d = parseDate(fecha);
      if (!d || !jugadora) return null;

      return {
  fecha: d,
  week: periodoAnalisis || trainingPeriodKey(d),
  originalWeek: periodoOriginal || trainingPeriodKey(d),
  weekLabel: String(r.periodoAnalisisLabel || r.periodo_analisis_label || '').trim() || (periodoAnalisis ? trainingPeriodLabelFromKey(periodoAnalisis) : trainingPeriodLabelFromDate(d)),
  jugadora: String(jugadora).trim(),
  persona_id: String(r.persona_id || r.personaId || r.persona?.persona_id || r.persona?.Persona_ID || '').trim(),
  persona: r.persona || null,
  rol: String(r.rol || r.Rol || r.persona?.Rol || r.persona?.rol || r.persona?.Tipo_Integrante || '').trim(),
  posiciones: parsePositions(r.Posicion || r['Posición'] || r.posicion || r.persona?.Posicion || r.persona?.['Posición'] || r.persona?.posicion || ''),
  total: toNumber(total),
  fisico: toNumber(fisico),
  tecnico: toNumber(tecnico),
  comentario: String(comentario || '').trim(),
  cargaAnticipada: r.cargaAnticipada === true || r.carga_anticipada === true || String(r.cargaAnticipada || r.carga_anticipada || '').toLowerCase() === 'true',
  excluirAnalisis: r.excluirAnalisis === true || r.excluir_analisis === true || String(r.excluirAnalisis || r.excluir_analisis || '').toLowerCase() === 'true',
  serverTemporalRules: !!periodoAnalisis,
  rowNumber: Number(r.rowNumber || r.fila || 0) || 0
};
    }

function parsePositions(value) {
  return String(value || '')
    .split(/[,;/|]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function applyClientTemporalRules(mappedRows) {
  const sorted = mappedRows.slice().sort((a, b) => {
    const diff = a.fecha - b.fecha;
    if (diff) return diff;
    return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
  });
  const seenByPlayerWeek = new Map();

  sorted.forEach(row => {
    if (row.serverTemporalRules) return;
    const playerKey = normalizeKey(row.jugadora);
    const originalWeek = row.originalWeek || trainingPeriodKey(row.fecha);
    const isWeekendLoad = row.fecha.getDay() === 0 || row.fecha.getDay() === 6;
    const seenKey = `${playerKey}|${originalWeek}`;

    if (isWeekendLoad && seenByPlayerWeek.has(seenKey)) {
      row.week = nextTrainingPeriodKey(originalWeek);
      row.weekLabel = trainingPeriodLabelFromKey(row.week);
      row.cargaAnticipada = true;
    }

    seenByPlayerWeek.set(`${playerKey}|${row.week}`, true);
  });

  const byPlayerWeek = new Map();
  sorted.forEach(row => {
    const key = `${normalizeKey(row.jugadora)}|${row.week}`;
    if (!byPlayerWeek.has(key)) byPlayerWeek.set(key, []);
    byPlayerWeek.get(key).push(row);
  });

  byPlayerWeek.forEach(group => {
    if (group.length < 2) return;
    group.sort((a, b) => {
      const diff = a.fecha - b.fecha;
      if (diff) return diff;
      return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
    });
    group.slice(0, -1).forEach(row => { row.excluirAnalisis = true; });
  });

  return mappedRows;
}

function getIsoWeekStartDate(weekKey) {
  const match = String(weekKey || '').match(/^(\d{4})-S(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const week = Number(match[2]);

  // ISO week: semana 1 es la que contiene el 4 de enero.
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayNum = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - dayNum + 1 + (week - 1) * 7);

  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 12);
}
