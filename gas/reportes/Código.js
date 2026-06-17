// Apps Script · Puente de datos para Murciélagas Analytics
// Lee la planilla resumen, genera JSON para la web y llama a OpenAI con un prompt más útil.

const SPREADSHEET_ID = '1WNRpBKV3ZU1LEQr6aB_hqSfkcPOSbXaB1Ij3N48fewQ';
const SHEET_GID = 150412275;
const SHEET_NAME = '';
const MAX_HEADER_SCAN_ROWS = 10;
const EXCLUDED_NAMES = ['Gonzalo'];
const NAME_CORRECTIONS = {
  'Medina Agustina': 'Medina Paez, Agustina'
};
const COLUMN_ALIASES = {
  fecha: ['fecha', 'date', 'día', 'dia', 'marca temporal', 'timestamp', 'semana', 'fecha de carga', 'fecha entrenamiento', 'fecha del reporte'],
  jugadora: ['jugadora', 'nombre', 'nombre y apellido', 'deportista', 'apellido', 'jugadora nombre', 'nombre jugadora', 'atleta', 'player', 'nombre completo'],
  total: ['total', 'estímulos', 'estimulos', 'total estímulos', 'total estimulos', 'estímulos totales', 'estimulos totales', 'volumen total', 'cantidad total', 'total semanal', 'total entrenamientos', 'total de estímulos', 'total de estimulos', 'total estímulos semanales', 'total estimulos semanales', 'estimulos realizados por semana', 'estímulos realizados por semana'],
  fisico: ['físico', 'fisico', 'trabajo físico', 'trabajo fisico', 'estímulos físicos', 'estimulos fisicos', 'volumen físico', 'volumen fisico', 'físico semanal', 'fisico semanal', 'total físico', 'total fisico', 'cantidad físico', 'cantidad fisico', 'preparación física', 'preparacion fisica', 'estimulos fisicos de 1 hora o mas', 'estímulos físicos de 1 hora o más'],
  tecnico: ['técnico', 'tecnico', 'táctico', 'tactico', 'técnico táctico', 'tecnico tactico', 'técnico-táctico', 'tecnico-tactico', 'trabajo técnico', 'trabajo tecnico', 'trabajo técnico táctico', 'trabajo tecnico tactico', 'volumen técnico', 'volumen tecnico', 'total técnico', 'total tecnico', 'total técnico táctico', 'total tecnico tactico', 'estimulos tecnicos o tacticos', 'estímulos técnicos o tácticos'],
  comentario: ['comentario', 'comentarios', 'observación', 'observacion', 'observaciones', 'novedades', 'detalle', 'observaciones generales', 'comentario semanal', 'registro', 'notas']
};
const AUDIT_SHEET_NAME = 'Auditoría de datos';
const MAX_WEEKLY_STIMULI = 20;

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    const callback = e && e.parameter ? e.parameter.callback : '';

    if (!action) {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Reportes de entrenamiento · Las Murciélagas')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return jsonResponse_(dispatchAction_(action, e && e.parameter ? e.parameter : {}), callback);
  } catch (error) {
    return jsonResponse_({ ok: false, error: error && error.message ? error.message : String(error) }, e && e.parameter ? e.parameter.callback : '');
  }
}

function doPost(e) {
  try {
    const body = parsePostPayload_(e);
    return jsonResponse_(dispatchAction_(String(body.action || ''), body));
  } catch (error) {
    return jsonResponse_({ ok: false, error: error && error.message ? error.message : String(error) });
  }
}

function dispatchAction_(action, payload) {
  if (action === 'getClientData') {
    return {
      ok: true,
      source: 'google_sheets',
      updatedAt: new Date().toISOString(),
      rows: getReportRows_()
    };
  }

  if (action === 'generateClientReport') {
    const prompt = buildReportPrompt_(payload);
    const report = callOpenAI_(prompt);
    return {
      ok: true,
      source: 'openai',
      updatedAt: new Date().toISOString(),
      report
    };
  }

  if (action === 'generarAuditoriaDatos') {
    return generarAuditoriaDatos();
  }

  return { ok: false, error: 'Acción no reconocida: ' + action };
}

function jsonResponse_(data, callback) {
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function getReportRows_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheet_(ss);
  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) throw new Error('La hoja no tiene datos suficientes.');

  const detected = detectHeaderRow_(values);
  const headers = detected.headers;
  const headerRowIndex = detected.headerRowIndex;
  const headerMap = buildHeaderMap_(headers);
  validateRequiredColumns_(headerMap, headers, headerRowIndex);

  const rows = [];
  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    const rawName = getCell_(row, headerMap.jugadora);
    const normalizedName = normalizePlayerName_(rawName);
    const rawItem = {
      total: getCell_(row, headerMap.total),
      fisico: getCell_(row, headerMap.fisico),
      tecnico: getCell_(row, headerMap.tecnico)
    };

    const item = {
      rowNumber: i + 1,
      fecha: getCell_(row, headerMap.fecha),
      jugadora: normalizedName,
      jugadoraKey: buildPlayerKey_(normalizedName),
      total: normalizeTrainingNumber_(rawItem.total),
      fisico: normalizeTrainingNumber_(rawItem.fisico),
      tecnico: normalizeTrainingNumber_(rawItem.tecnico),
      comentario: headerMap.comentario !== undefined ? getCell_(row, headerMap.comentario) : ''
    };

    item.issues = detectDataIssues_(item, rawItem);
    if (!item.fecha || !item.jugadora) continue;
    if (isExcludedName_(item.jugadora)) continue;
    rows.push(item);
  }

  return applyTemporalRules_(rows);
}

function applyTemporalRules_(rows) {
  const sorted = rows.slice().sort((a, b) => {
    const da = parseReportDate_(a.fecha);
    const db = parseReportDate_(b.fecha);
    const ta = da ? da.getTime() : 0;
    const tb = db ? db.getTime() : 0;
    if (ta !== tb) return ta - tb;
    return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
  });
  const seenByPlayerWeek = {};

  sorted.forEach(row => {
    const date = parseReportDate_(row.fecha);
    if (!date) return;
    const originalStart = getTrainingPeriodStart_(date);
    let analysisStart = new Date(originalStart);
    const playerKey = row.jugadoraKey || buildPlayerKey_(row.jugadora);
    const originalKey = isoWeekKey_(originalStart);
    const isWeekendLoad = date.getDay() === 0 || date.getDay() === 6;

    if (isWeekendLoad && playerKey && seenByPlayerWeek[playerKey] && seenByPlayerWeek[playerKey][originalKey]) {
      analysisStart.setDate(analysisStart.getDate() + 7);
      row.cargaAnticipada = true;
      row.issues = row.issues || [];
      row.issues.push('CARGA ANTICIPADA: se interpreta como registro de la semana siguiente porque ya existia una carga previa para la semana trabajada.');
    } else {
      row.cargaAnticipada = false;
    }

    row.periodoOriginal = originalKey;
    row.periodoAnalisis = isoWeekKey_(analysisStart);
    row.periodoAnalisisLabel = formatPeriodLabel_(analysisStart);
    row.excluirAnalisis = false;

    if (playerKey) {
      seenByPlayerWeek[playerKey] = seenByPlayerWeek[playerKey] || {};
      seenByPlayerWeek[playerKey][row.periodoAnalisis] = true;
    }
  });

  const grouped = {};
  sorted.forEach(row => {
    const key = (row.jugadoraKey || buildPlayerKey_(row.jugadora)) + '|' + (row.periodoAnalisis || '');
    if (!row.periodoAnalisis || key === '|') return;
    grouped[key] = grouped[key] || [];
    grouped[key].push(row);
  });

  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    if (group.length < 2) return;
    group.sort((a, b) => {
      const da = parseReportDate_(a.fecha);
      const db = parseReportDate_(b.fecha);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (ta !== tb) return ta - tb;
      return Number(a.rowNumber || 0) - Number(b.rowNumber || 0);
    });
    const keep = group[group.length - 1];
    group.forEach(row => {
      row.issues = row.issues || [];
      if (row === keep) {
        row.issues.push('ADVERTENCIA DOBLE CARGA: existe mas de un registro para esta jugadora y semana; para calculos se usa esta carga por ser la mas nueva.');
      } else {
        row.excluirAnalisis = true;
        row.issues.push('DOBLE CARGA: registro anterior para la misma jugadora y semana. Se excluye de calculos y se conserva la carga mas nueva.');
      }
    });
  });

  return rows;
}

function detectHeaderRow_(values) {
  let best = { headerRowIndex: 0, headers: values[0].map(h => String(h || '').trim()), score: -1 };
  const limit = Math.min(MAX_HEADER_SCAN_ROWS, values.length);
  for (let i = 0; i < limit; i++) {
    const candidateHeaders = values[i].map(h => String(h || '').trim());
    const map = buildHeaderMap_(candidateHeaders);
    const score = Object.keys(map).length;
    if (score > best.score) best = { headerRowIndex: i, headers: candidateHeaders, score };
  }
  return best;
}

function getSheet_(ss) {
  if (SHEET_NAME) {
    const byName = ss.getSheetByName(SHEET_NAME);
    if (!byName) throw new Error('No se encontró la pestaña con nombre: ' + SHEET_NAME);
    return byName;
  }
  const sheets = ss.getSheets();
  const match = sheets.find(sheet => sheet.getSheetId() === SHEET_GID);
  if (!match) throw new Error('No se encontró ninguna pestaña con gid: ' + SHEET_GID);
  return match;
}

function buildHeaderMap_(headers) {
  const normalizedHeaders = headers.map(normalizeText_);
  const map = {};
  Object.keys(COLUMN_ALIASES).forEach(key => {
    const aliases = COLUMN_ALIASES[key].map(normalizeText_);
    let index = normalizedHeaders.findIndex(h => aliases.includes(h));
    if (index === -1) {
      index = normalizedHeaders.findIndex(h => h && aliases.some(alias => alias && (h === alias || h.includes(alias) || alias.includes(h))));
    }
    if (index !== -1) map[key] = index;
  });
  return map;
}

function validateRequiredColumns_(headerMap, headers, headerRowIndex) {
  const required = ['fecha', 'jugadora', 'total', 'fisico', 'tecnico'];
  const missing = required.filter(key => headerMap[key] === undefined);
  if (missing.length) {
    throw new Error('Faltan columnas obligatorias o no se reconocieron sus encabezados: ' + missing.join(', ') + '. Encabezados detectados en fila ' + (headerRowIndex + 1) + ': [' + headers.join(' | ') + ']. Usá la función inspeccionarHoja() para ver las primeras filas y ajustar los nombres.');
  }
}

function getCell_(row, index) {
  return String(row[index] || '').trim();
}

function parseReportDate_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.substring(0, 10) + 'T12:00:00');
  const firstPart = s.split(' ')[0];
  const parts = firstPart.split(/[\/.-]/).map(Number);
  if (parts.length >= 3) {
    const d = parts[0];
    const m = parts[1];
    const y = parts[2];
    if (y > 1900) return new Date(y, m - 1, d, 12);
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTrainingPeriodStart_(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  d.setDate(d.getDate() - 7);
  return d;
}

function isoWeekKey_(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-S' + String(weekNo).padStart(2, '0');
}

function formatPeriodLabel_(start) {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatShortDate_(start) + ' al ' + formatShortDate_(end);
}

function formatShortDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM');
}

function normalizeNumber_(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizePlayerName_(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const correctionKey = Object.keys(NAME_CORRECTIONS).find(key => normalizeText_(key) === normalizeText_(clean));
  if (correctionKey) return NAME_CORRECTIONS[correctionKey];
  return clean;
}

function isExcludedName_(name) {
  const normalized = normalizeText_(name);
  return EXCLUDED_NAMES.some(excluded => normalizeText_(excluded) === normalized);
}

function normalizeText_(text) {
  return String(text || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function parsePostPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) throw new Error('No se recibió contenido en el POST.');
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('El contenido recibido no es JSON válido.');
  }
}

function buildPromptFromPayload_(payload) {
  return [
    'Generá un reporte deportivo claro, humano y operativo a partir de estos datos.',
    'No inventes información. Priorizá tendencias, continuidad, alertas y pendientes de seguimiento.',
    'Si faltan datos, decilo con claridad y no cierres con frases genéricas.',
    '',
    JSON.stringify(payload, null, 2)
  ].join('\n');
}

function buildReportPrompt_(payload) {
  const rawPrompt = String(payload && payload.prompt ? payload.prompt : buildPromptFromPayload_(payload)).trim();
  return [
    'Actuá como asistente de análisis deportivo especializado en seguimiento de entrenamiento.',
    'Necesito un informe breve, humano y operativo, escrito en español argentino.',
    'Reglas:',
    '- No inventes datos.',
    '- Usá párrafos cortos y 3 a 5 subtítulos útiles.',
    '- Priorizá cobertura de carga, continuidad, tendencias, alertas y pendientes concretos.',
    '- Evitá cierres institucionales o frases decorativas.',
    '- Si hay observaciones de salud, diferenciálas de diagnósticos.',
    '- Si faltan registros, explicá cómo limita la lectura.',
    '',
    rawPrompt
  ].join('\n');
}

function callOpenAI_(prompt) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-4.1-mini';
  if (!apiKey) throw new Error('No se encontró OPENAI_API_KEY en Script Properties.');

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + apiKey },
    payload: JSON.stringify({ model, input: prompt, temperature: 0.35, max_output_tokens: 1400 }),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();
  if (status < 200 || status >= 300) throw new Error('OpenAI devolvió error ' + status + ': ' + text.slice(0, 800));

  const data = JSON.parse(text);
  const output = extractOpenAIText_(data);
  if (!output) throw new Error('OpenAI respondió, pero no se pudo extraer texto del reporte.');
  return output;
}

function extractOpenAIText_(data) {
  if (data.output_text) return data.output_text;
  if (Array.isArray(data.output)) {
    const parts = [];
    data.output.forEach(item => {
      if (Array.isArray(item.content)) {
        item.content.forEach(content => {
          if (content.text) parts.push(content.text);
        });
      }
    });
    return parts.join('\n').trim();
  }
  return '';
}

function getClientData() {
  try {
    return { ok: true, source: 'google_sheets', updatedAt: new Date().toISOString(), rows: getReportRows_() };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}

function generateClientReport(payload) {
  try {
    const report = callOpenAI_(buildReportPrompt_(payload || {}));
    return { ok: true, source: 'openai', updatedAt: new Date().toISOString(), report };
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) };
  }
}

function generarAuditoriaDatosLegacy_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getSheet_(ss);
  let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!auditSheet) auditSheet = ss.insertSheet(AUDIT_SHEET_NAME);
  auditSheet.clear();

  const headers = ['Abrir', 'Fila original', 'Fecha', 'Jugadora', 'Total', 'Físico', 'Técnico-táctico', 'Total sugerido', 'Problema detectado', 'Comentario', 'Estado'];
  auditSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const rows = getReportRows_();
  const conIssues = rows.filter(r => r.issues && r.issues.length);

  if (!conIssues.length) {
    auditSheet.getRange(2, 1).setValue('No se detectaron inconsistencias pendientes.');
    return { ok: true, totalIssues: 0, auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(), message: 'No se detectaron inconsistencias pendientes.' };
  }

  const values = conIssues.map(r => [
    'Abrir fila ' + r.rowNumber,
    r.rowNumber,
    r.fecha,
    r.jugadora,
    r.total,
    r.fisico,
    r.tecnico,
    r.fisico + r.tecnico,
    r.issues.join(' | '),
    r.comentario,
    'Pendiente'
  ]);

  auditSheet.getRange(2, 1, values.length, headers.length).setValues(values);
  conIssues.forEach((r, index) => {
    const url = ss.getUrl() + '#gid=' + dataSheet.getSheetId() + '&range=A' + r.rowNumber;
    const richText = SpreadsheetApp.newRichTextValue().setText('Abrir fila ' + r.rowNumber).setLinkUrl(url).build();
    auditSheet.getRange(index + 2, 1).setRichTextValue(richText);
  });

  auditSheet.setFrozenRows(1);
  auditSheet.autoResizeColumns(1, headers.length);
  auditSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
  auditSheet.getRange(2, 11, values.length, 1).setBackground('#fff2cc');

  return { ok: true, totalIssues: conIssues.length, auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(), message: 'Auditoría generada correctamente.' };
}

function generarAuditoriaDatos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getSheet_(ss);
  let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!auditSheet) auditSheet = ss.insertSheet(AUDIT_SHEET_NAME);
  auditSheet.clear();

  const headers = ['Abrir', 'Fila original', 'Fecha', 'Periodo analisis', 'Jugadora', 'Total', 'Fisico', 'Tecnico-tactico', 'Total sugerido', 'Problema detectado', 'Comentario', 'Decision calculo', 'Estado'];
  auditSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const rows = getReportRows_();
  const conIssues = rows.filter(r => r.issues && r.issues.length);

  if (!conIssues.length) {
    auditSheet.getRange(2, 1).setValue('No se detectaron inconsistencias pendientes.');
    return { ok: true, totalIssues: 0, auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(), message: 'No se detectaron inconsistencias pendientes.' };
  }

  const values = conIssues.map(r => [
    'Abrir fila ' + r.rowNumber,
    r.rowNumber,
    r.fecha,
    r.periodoAnalisisLabel || r.periodoAnalisis || '',
    r.jugadora,
    r.total,
    r.fisico,
    r.tecnico,
    r.fisico + r.tecnico,
    r.issues.join(' | '),
    r.comentario,
    r.excluirAnalisis ? 'Excluida: doble carga anterior' : (r.cargaAnticipada ? 'Incluida: carga anticipada' : 'Incluida'),
    'Pendiente'
  ]);

  auditSheet.getRange(2, 1, values.length, headers.length).setValues(values);
  conIssues.forEach((r, index) => {
    const url = ss.getUrl() + '#gid=' + dataSheet.getSheetId() + '&range=A' + r.rowNumber;
    const richText = SpreadsheetApp.newRichTextValue().setText('Abrir fila ' + r.rowNumber).setLinkUrl(url).build();
    auditSheet.getRange(index + 2, 1).setRichTextValue(richText);
  });

  auditSheet.setFrozenRows(1);
  auditSheet.autoResizeColumns(1, headers.length);
  auditSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#d9ead3');
  auditSheet.getRange(2, 12, values.length, 1).setBackground('#fff2cc');

  return { ok: true, totalIssues: conIssues.length, auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(), message: 'Auditoria generada correctamente.' };
}

function detectDataIssues_(item, rawItem) {
  const issues = [];
  const total = Number(item.total) || 0;
  const fisico = Number(item.fisico) || 0;
  const tecnico = Number(item.tecnico) || 0;
  const subtotal = fisico + tecnico;
  if (total === 0 && subtotal > 0) issues.push('INCONSISTENCIA: el total figura en 0, pero hay estímulos físicos o técnico-tácticos cargados. Total sugerido: ' + subtotal + '.');
  if (total > 0 && subtotal === 0) issues.push('DATO INCOMPLETO: hay total cargado, pero no se discrimina entre físico y técnico-táctico.');
  if (total > 0 && subtotal > total) issues.push('INCONSISTENCIA: la suma de estímulos físicos y técnico-tácticos supera el total declarado. Total sugerido: ' + subtotal + '.');
  if (total > MAX_WEEKLY_STIMULI || fisico > MAX_WEEKLY_STIMULI || tecnico > MAX_WEEKLY_STIMULI) issues.push('VALOR ALTO: el valor cargado supera el máximo esperado de ' + MAX_WEEKLY_STIMULI + ' estímulos semanales.');
  return issues;
}

function buildPlayerKey_(name) {
  const clean = normalizeText_(name);
  if (!clean) return '';
  const parts = clean.split(',').map(part => part.trim()).filter(Boolean);
  if (!parts.length) return clean;
  const apellido = parts[0];
  const nombre = parts[1] || '';
  const primerNombre = nombre.split(/\s+/).filter(Boolean)[0] || '';
  if (!primerNombre) return apellido;
  return apellido + ' ' + primerNombre;
}

function normalizeTrainingNumber_(value) {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  const normalized = normalizeText_(raw);
  const zeroWords = ['no', 'ninguno', 'ninguna', 'nada', 'cero', 'no entrene', 'no entrené', 'no hice', 'sin entrenamiento'];
  if (zeroWords.some(w => normalized === normalizeText_(w))) return 0;
  const wordNumbers = { cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
  if (wordNumbers[normalized] !== undefined) return wordNumbers[normalized];
  const numericMatches = raw.match(/\d+(?:[,.]\d+)?/g);
  if (!numericMatches || !numericMatches.length) return 0;
  if (numericMatches.length === 1) {
    const n = Number(numericMatches[0].replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return numericMatches.reduce((acc, item) => {
    const n = Number(item.replace(',', '.'));
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);
}

function testModeloOpenAIActivo() {
  const props = PropertiesService.getScriptProperties();
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-4.1-mini';
  Logger.log('Modelo OpenAI activo: ' + model);
}

function testGetReportRows() {
  const rows = getReportRows_();
  Logger.log(JSON.stringify(rows.slice(0, 10), null, 2));
  Logger.log('Total filas: ' + rows.length);
}

function inspeccionarHoja() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheet_(ss);
  const values = sheet.getDataRange().getDisplayValues();
  const limit = Math.min(10, values.length);
  Logger.log('Nombre de la hoja: ' + sheet.getName());
  Logger.log('GID de la hoja: ' + sheet.getSheetId());
  for (let i = 0; i < limit; i++) Logger.log('Fila ' + (i + 1) + ': ' + JSON.stringify(values[i]));
}
