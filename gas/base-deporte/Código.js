// ============================================================
// Murciélagas Analytics · Módulo Base de Datos
// Versión: 4.0 — Depurado + Log + Becas + Dropdown expandido
// ============================================================

var CONFIG = {
  SPREADSHEET_ID: '1x2RypyWJ2PDHlTjWuTLKIw8_GqCCrFE-U5QYIUpoFEg',
  SHEET_NAME: 'Las_Murcielagas_Base_Personal',
  LOG_SHEET_NAME: 'Log_Cambios',
  DRIVE_RAIZ_ID: '1HtxDxNOxjm3xKs6N5t2SzDlp3TlXf8P1',
  PASSWORD: '1',
};

// Compatibilidad con módulos nuevos
var SPREADSHEET_ID = CONFIG.SPREADSHEET_ID;

var CONFIG_DOC = {
  PLANTILLA_CONVOCATORIA: '1foA1M0ftQz7KAOWRgBHCRcewgdCJFdUPynpMYdyEmZM',
  CARPETA_PLANTILLAS:     '14LB7lSbuRq8cr1Zwbz6DilwE9EIllLNn',
  CARPETA_GENERADOS:      '1HtxDxNOxjm3xKs6N5t2SzDlp3TlXf8P1',
};

var SHEETS = {
  plantel:           'Las_Murcielagas_Base_Personal',
  sesionesPenales:   'SesionesPenales',
  penales:           'Penales',
  partidos:          'Partidos',
  concentraciones:   'Concentraciones',
  concentracionDias: 'ConcentracionDias',
  configDocumentos:  'Config_Documentos',
  configDocPlaceholders: 'Config_Doc_Placeholders',
  configDocPersonas: 'Config_Doc_Personas',
  configPlantillas:  'Config_Plantillas',
  configCarpetas:    'Config_Carpetas',
  documentosGenerados: 'Documentos_Generados',
  testeos:           'Testeos',
  testeosMediciones: 'TesteosMediciones',
  columnasDinamicas: 'ColumnasDinamicas',
  antidopingCatalogo: 'Antidoping_Catalogo',
  antidopingHistorial: 'Antidoping_Historial',
  antidopingCache: 'Antidoping_Cache',
  wadaSustancias: 'WADA_Sustancias',
};

var ANTIDOPING_CACHE_TTL_DAYS = 180;
var ANTIDOPING_CACHE_MAX_ROWS = 150;
var ANTIDOPING_BACKEND_VERSION = '2026-05-17.3';
var TUE_DEFAULT_DURATION_DAYS = 365;
var TUE_FIELDS_ = [
  'TUE_Estado',
  'TUE_Medicamento',
  'TUE_Sustancia',
  'TUE_Diagnostico',
  'TUE_Justificacion',
  'TUE_Fecha_Emision',
  'TUE_Fecha_Vencimiento',
  'TUE_IBSA_Enviado',
  'TUE_IBSA_Fecha_Envio',
  'TUE_Observaciones',
  'TUE_Archivo'
];
var DOCUMENT_LINK_FIELDS_ = [
  'Foto_Link',
  'DNI_Scan_Link',
  'Pasaporte_Scan_Link',
  'CUD_Link',
  'Apto_Medico_Link',
  'Anti_Doping_Link',
  'TUE_Archivo',
  'IBSA_Elegibilidad_Archivo'
];

// Campos críticos para calcular completitud y alertas.
// Nota: Titulo_Educativo se agrega cuando se cree la columna en Sheets.
var CAMPOS_CRITICOS = [
  'DNI', 'Fecha_Nac', 'Telefono', 'Email',
  'Emergencia_Nombre', 'Emergencia_Tel',
  'Pasaporte_Nro', 'Pasaporte_Vto',
  'Apto_Medico_Vto', 'Clasif_Visual_IBSA',
];

// ── ENTRADA WEB APP ───────────────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Murciélagas Analytics · Base de Datos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // Nota: el viewport va en el <head> del Index.html, no acá.
}

// ── AUTENTICACIÓN ─────────────────────────────────────────────────────────────
function verificarPassword(pwd) {
  return pwd === CONFIG.PASSWORD;
}

// ── ACCESO A SHEETS ───────────────────────────────────────────────────────────
function getSheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.SHEET_NAME);
}

function getLogSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var log = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  // Si la hoja de log no existe, la crea automáticamente
  if (!log) {
    log = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
    log.appendRow(['Fecha', 'DNI', 'Nombre', 'Campo', 'Valor_Anterior', 'Valor_Nuevo', 'Usuario']);
    log.setFrozenRows(1);
  }
  return log;
}

// ── UTILIDADES ────────────────────────────────────────────────────────────────
function normalizarDNI_(dni) {
  return String(dni).replace(/\./g, '').replace(/,/g, '').trim();
}

function formatearFecha_(date) {
  if (!(date instanceof Date)) return date;
  return Utilities.formatDate(date, 'GMT-3', 'dd/MM/yyyy');
}

// ── LECTURA DE DATOS ──────────────────────────────────────────────────────────
function getAllRows_() {
  var ws = getSheet_();
  base_ensureTUEColumns_(ws);
  base_ensureDocumentColumns_(ws);
  var data = ws.getDataRange().getValues();
  var headers = data[0];
  var filas = [];

  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // fila vacía
    var obj = {};
    headers.forEach(function(h, idx) {
      var val = data[i][idx];
      obj[h] = (val instanceof Date)
        ? formatearFecha_(val)
        : (val === null || val === undefined ? '' : String(val));
    });
    obj['DNI'] = normalizarDNI_(obj['DNI']);
    obj.__row = i + 1;
    filas.push(obj);
  }
  return filas;
}

function getRowByDNI_(dni) {
  var dniLimpio = normalizarDNI_(dni);
  var filas = getAllRows_();
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].DNI === dniLimpio) return filas[i];
  }
  return null;
}

function base_ensureTUEColumns_(sheet) {
  var ws = sheet || getSheet_();
  TUE_FIELDS_.forEach(function(col) { ensureColumn_(ws, col); });
  return ws;
}

function base_ensureDocumentColumns_(sheet) {
  var ws = sheet || getSheet_();
  DOCUMENT_LINK_FIELDS_.forEach(function(col) { ensureColumn_(ws, col); });
  return ws;
}

function tryGetSheet(name) {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
  } catch (err) {
    return null;
  }
}

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function antidoping_getOrCreateSheet_(sheetName, headers) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
  }
  var currentHeaders = [];
  if (sh.getLastRow() >= 1 && sh.getLastColumn() > 0) {
    currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  }
  if (!currentHeaders.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  headers.forEach(function(h) {
    if (currentHeaders.indexOf(h) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
      currentHeaders.push(h);
    }
  });
  return sh;
}

function antidoping_seedCatalogo_(sheet) {
  if (sheet.getLastRow() > 1) return;
  var ahora = Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
  var base = [
    ['Paracetamol', 'Paracetamol', '', 'Uso habitual. Confirmar composición combinada si aplica.', 'Catálogo interno', 'WADA_Sustancias', '', ahora, 'SI'],
    ['Ibuprofeno', 'Ibuprofeno', '', 'Revisar formulaciones combinadas con descongestivos.', 'Catálogo interno', 'WADA_Sustancias', '', ahora, 'SI'],
    ['Salbutamol', 'Salbutamol', '', 'Controlar dosis, vía y concentración urinaria si aplica.', 'Catálogo interno', 'WADA_Sustancias', '', ahora, 'SI'],
    ['Pseudoefedrina', 'Pseudoefedrina', '', 'Controlar ventana de uso y umbral urinario.', 'Catálogo interno', 'WADA_Sustancias', '', ahora, 'SI'],
    ['Budesonida', 'Budesonida', '', 'Revisar la vía de administración y el contexto competitivo.', 'Catálogo interno', 'WADA_Sustancias', '', ahora, 'SI']
  ];
  sheet.getRange(2, 1, base.length, base[0].length).setValues(base);
}

function antidoping_readCatalogo_() {
  var headers = [
    'medicamento',
    'principio_activo',
    'estado',
    'observaciones',
    'fuente_argentina',
    'fuente_wada',
    'fuente_secundaria',
    'fecha_revision',
    'frecuente'
  ];
  var sheet = antidoping_getOrCreateSheet_(SHEETS.antidopingCatalogo, headers);
  antidoping_seedCatalogo_(sheet);
  return sheetToObjects(sheet).map(function(row) {
    return {
      medicamento: String(row.medicamento || ''),
      principio_activo: String(row.principio_activo || ''),
      estado: String(row.estado || ''),
      observaciones: String(row.observaciones || ''),
      fuente_argentina: String(row.fuente_argentina || ''),
      fuente_wada: String(row.fuente_wada || ''),
      fuente_secundaria: String(row.fuente_secundaria || ''),
      fecha_revision: String(row.fecha_revision || ''),
      frecuente: String(row.frecuente || '')
    };
  });
}

function antidoping_scoreMatch_(consultaNorm, item) {
  var medicamento = normalizeText(item.medicamento);
  var activo = normalizeText(item.principio_activo);
  if (!consultaNorm) return 0;
  if (consultaNorm === medicamento || consultaNorm === activo) return 100;
  if (medicamento.indexOf(consultaNorm) !== -1 || activo.indexOf(consultaNorm) !== -1) return 75;
  if (consultaNorm.indexOf(medicamento) !== -1 || consultaNorm.indexOf(activo) !== -1) return 60;
  return 0;
}

function antidoping_nowIso_() {
  return Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd HH:mm:ss');
}

function antidoping_parseDate_(v) {
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function antidoping_hasExpired_(fetchedAt) {
  var d = antidoping_parseDate_(fetchedAt);
  if (!d) return true;
  var ageMs = new Date().getTime() - d.getTime();
  var ttlMs = ANTIDOPING_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

function antidoping_getCacheSheet_() {
  var headers = ['query_norm', 'query_raw', 'source', 'result_json', 'fetched_at', 'expires_at', 'hit_count', 'last_hit_at'];
  return antidoping_getOrCreateSheet_(SHEETS.antidopingCache, headers);
}

function antidoping_readCache_(queryNorm) {
  var sh = antidoping_getCacheSheet_();
  var rows = sheetToObjects(sh);
  for (var i = 0; i < rows.length; i++) {
    if (normalizeText(rows[i].query_norm) === queryNorm) {
      var result = parseJson(rows[i].result_json);
      if (!result || antidoping_hasExpired_(rows[i].fetched_at)) return null;
      var rowNum = i + 2;
      var hits = Number(rows[i].hit_count || 0) + 1;
      setCell(sh, rowNum, 'hit_count', hits);
      setCell(sh, rowNum, 'last_hit_at', antidoping_nowIso_());
      return result;
    }
  }
  return null;
}

function antidoping_trimCache_() {
  var sh = antidoping_getCacheSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow <= ANTIDOPING_CACHE_MAX_ROWS + 1) return;
  var rows = sheetToObjects(sh);
  rows.sort(function(a, b) {
    var ad = antidoping_parseDate_(a.last_hit_at) || antidoping_parseDate_(a.fetched_at) || new Date(0);
    var bd = antidoping_parseDate_(b.last_hit_at) || antidoping_parseDate_(b.fetched_at) || new Date(0);
    return bd.getTime() - ad.getTime();
  });
  var keep = rows.slice(0, ANTIDOPING_CACHE_MAX_ROWS);
  sh.getRange(2, 1, Math.max(0, sh.getLastRow() - 1), sh.getLastColumn()).clearContent();
  if (!keep.length) return;
  var values = keep.map(function(r) {
    return [
      r.query_norm || '',
      r.query_raw || '',
      r.source || '',
      r.result_json || '',
      r.fetched_at || '',
      r.expires_at || '',
      r.hit_count || 0,
      r.last_hit_at || ''
    ];
  });
  sh.getRange(2, 1, values.length, values[0].length).setValues(values);
}

function antidoping_writeCache_(queryNorm, queryRaw, source, resultObj) {
  var sh = antidoping_getCacheSheet_();
  var rows = sheetToObjects(sh);
  var idx = -1;
  for (var i = 0; i < rows.length; i++) {
    if (normalizeText(rows[i].query_norm) === queryNorm) {
      idx = i + 2;
      break;
    }
  }
  var fetched = antidoping_nowIso_();
  var expires = Utilities.formatDate(new Date(new Date().getTime() + (ANTIDOPING_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000)), 'GMT-3', 'yyyy-MM-dd HH:mm:ss');
  var data = [
    queryNorm,
    queryRaw,
    source,
    JSON.stringify(resultObj || []),
    fetched,
    expires,
    1,
    fetched
  ];
  if (idx > 0) {
    sh.getRange(idx, 1, 1, data.length).setValues([data]);
  } else {
    sh.appendRow(data);
  }
  antidoping_trimCache_();
}

function antidoping_loadWadaRules_() {
  var headers = ['sustancia', 'estado', 'categoria', 'en_competencia', 'fuera_competencia', 'umbral', 'nota', 'version'];
  var sh = antidoping_getOrCreateSheet_(SHEETS.wadaSustancias, headers);
  var rows = sheetToObjects(sh);
  return rows.map(function(r) {
    return {
      sustancia: normalizeText(r.sustancia || ''),
      estado: String(r.estado || 'REQUIERE REVISIÓN').trim(),
      categoria: String(r.categoria || '').trim(),
      en_competencia: String(r.en_competencia || '').trim(),
      fuera_competencia: String(r.fuera_competencia || '').trim(),
      umbral: String(r.umbral || '').trim(),
      nota: String(r.nota || '').trim(),
      version: String(r.version || '').trim()
    };
  }).filter(function(r) { return !!r.sustancia; });
}

function antidoping_evalWada_(principioActivo) {
  var rules = antidoping_loadWadaRules_();
  if (!rules.length) {
    return {
      estado: 'REQUIERE REVISIÓN',
      fuente_wada: 'WADA_Sustancias sin datos',
      observaciones_wada: 'Cargar reglas WADA para dictamen automático.',
      criterio_wada: 'Sin reglas WADA cargadas en la base interna.',
      en_competencia: 'N/D',
      fuera_competencia: 'N/D'
    };
  }
  var activos = String(principioActivo || '')
    .split(/,|\/|\+|;| y /i)
    .map(function(x) { return normalizeText(x); })
    .filter(Boolean);
  if (!activos.length) activos = [normalizeText(principioActivo)];

  var exactHits = [];
  var boundaryHits = [];
  activos.forEach(function(a) {
    rules.forEach(function(r) {
      if (!a || !r.sustancia) return;
      if (a === r.sustancia) exactHits.push(r);
      else if (antidoping_phraseMatch_(a, r.sustancia) || antidoping_phraseMatch_(r.sustancia, a)) boundaryHits.push(r);
    });
  });
  var hits = exactHits.length ? exactHits : boundaryHits;
  if (!hits.length) {
    return {
      estado: 'PERMITIDO',
      fuente_wada: 'WADA_Sustancias',
      observaciones_wada: 'Sin coincidencia exacta en reglas cargadas.',
      criterio_wada: 'No figura como prohibido ni advertido en la base WADA cargada; bajo este criterio operativo se trata como permitido.',
      en_competencia: 'NO',
      fuera_competencia: 'NO'
    };
  }
  var h = hits[0];
  var hasProhibido = hits.some(function(x) { return normalizeText(x.estado).indexOf('prohibido') !== -1; });
  var warningDetails = antidoping_collectWarnings_(hits);
  var enCompetenciaResumen = hits.map(function(x) { return x.en_competencia; }).filter(Boolean).join(' / ') || 'N/D';
  var fueraCompetenciaResumen = hits.map(function(x) { return x.fuera_competencia; }).filter(Boolean).join(' / ') || 'N/D';
  var estadoFinal = hasProhibido
    ? antidoping_resolveExplicitState_(enCompetenciaResumen, fueraCompetenciaResumen)
    : (warningDetails.length ? 'PERMITIDO CON ADVERTENCIA' : 'PERMITIDO');
  var criterio = hasProhibido
    ? 'Figura como prohibido de forma explícita en la base WADA cargada.'
    : (warningDetails.length
      ? 'No está prohibido de forma absoluta, pero la base WADA cargada sí marca una condición concreta de uso.'
      : 'No tiene prohibición ni advertencia explícita en la base WADA cargada; bajo este criterio operativo se trata como permitido.');
  return {
    estado: estadoFinal,
    fuente_wada: 'WADA_Sustancias' + (h.version ? (' v' + h.version) : ''),
    observaciones_wada: hits.slice(0, 3).map(function(x) {
      return [x.sustancia, x.categoria, x.umbral, x.nota].filter(Boolean).join(' | ');
    }).join(' || '),
    advertencia_detalle: warningDetails.join(' || '),
    criterio_wada: criterio,
    en_competencia: enCompetenciaResumen,
    fuera_competencia: fueraCompetenciaResumen
  };
}

function antidoping_resolveDirectActiveQuery_(consulta) {
  var consultaNorm = normalizeText(consulta);
  if (!consultaNorm) return '';

  var rules = antidoping_loadWadaRules_();
  for (var i = 0; i < rules.length; i++) {
    var sustancia = normalizeText(rules[i].sustancia || '');
    if (!sustancia) continue;
    if (consultaNorm === sustancia) return rules[i].sustancia || consulta;
  }

  var catalogo = antidoping_readCatalogo_();
  for (var j = 0; j < catalogo.length; j++) {
    var activo = normalizeText(catalogo[j].principio_activo || '');
    if (!activo) continue;
    if (consultaNorm === activo) return catalogo[j].principio_activo || consulta;
  }

  return '';
}

function antidoping_phraseMatch_(text, phrase) {
  var haystack = normalizeText(text || '');
  var needle = normalizeText(phrase || '');
  if (!haystack || !needle) return false;
  var escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp('(^|[\\s,;\\/()+-])' + escaped + '($|[\\s,;\\/()+-])');
  return re.test(haystack);
}

function antidoping_resolveExplicitState_(enCompetencia, fueraCompetencia) {
  var en = normalizeText(enCompetencia || '');
  var fuera = normalizeText(fueraCompetencia || '');
  if (en.indexOf('si') !== -1 && fuera.indexOf('no') !== -1) return 'PROHIBIDO EN COMPETENCIA';
  if (en.indexOf('si') !== -1 && fuera.indexOf('si') !== -1) return 'PROHIBIDO';
  return 'PROHIBIDO / REVISAR CONTEXTO';
}

function antidoping_collectWarnings_(hits) {
  var details = [];
  hits.forEach(function(rule) {
    var warnings = antidoping_ruleWarnings_(rule);
    warnings.forEach(function(msg) {
      if (details.indexOf(msg) === -1) details.push(msg);
    });
  });
  return details.slice(0, 4);
}

function antidoping_ruleWarnings_(rule) {
  var r = rule || {};
  var estado = normalizeText(r.estado || '');
  var nota = String(r.nota || '').trim();
  var notaNorm = normalizeText(nota);
  var umbral = String(r.umbral || '').trim();
  var umbralNorm = normalizeText(umbral);
  var enCompetencia = String(r.en_competencia || '').trim();
  var fueraCompetencia = String(r.fuera_competencia || '').trim();
  var enNorm = normalizeText(enCompetencia);
  var fueraNorm = normalizeText(fueraCompetencia);
  var sustancia = String(r.sustancia || '').trim() || 'Sustancia';
  var out = [];

  var isWarningState = estado.indexOf('condicionado') !== -1 ||
    estado.indexOf('revision') !== -1 ||
    estado.indexOf('advert') !== -1 ||
    estado.indexOf('tue') !== -1;

  if (umbral && umbralNorm !== 'n/a') {
    out.push(sustancia + ': respetar el umbral o límite informado (' + umbral + ').');
  }
  if (estado.indexOf('tue') !== -1 || notaNorm.indexOf('tue') !== -1) {
    out.push(sustancia + ': puede requerir TUE o validación médica previa.');
  }
  if (notaNorm.indexOf('via') !== -1 || enNorm.indexOf('segun via') !== -1 || fueraNorm.indexOf('segun via') !== -1) {
    out.push(sustancia + ': la autorización depende de la vía de administración' + (nota ? ' (' + nota + ').' : '.'));
  }
  if (enNorm.indexOf('condicionado') !== -1 || fueraNorm.indexOf('condicionado') !== -1) {
    out.push(sustancia + ': revisar si la condición cambia según dosis, vía o contexto de competencia.');
  }
  if (!out.length && isWarningState) {
    out.push(sustancia + ': requiere revisión médica o validación operativa antes de habilitar su uso.');
  }
  return out;
}

function antidoping_knownCommercialActive_(nombre) {
  var n = normalizeText(nombre);
  var map = {
    'tafirol': 'paracetamol',
    'anaflex': 'paracetamol',
    'ibupirac': 'ibuprofeno',
    'actron': 'ibuprofeno',
    'buscapina': 'butilhioscina',
    'refrianex': 'pseudoefedrina'
  };
  return map[n] || '';
}

function antidoping_scrapePrVademecum_(queryRaw) {
  var q = encodeURIComponent(queryRaw);
  var url = 'https://ar.prvademecum.com/busquedas.php?pattern=' + q;
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('PR Vademecum HTTP ' + code);
  var html = res.getContentText();

  var matches = [];
  var re = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  var m;
  while ((m = re.exec(html)) && matches.length < 10) {
    var href = String(m[1] || '');
    var text = String(m[2] || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (href.indexOf('http') !== 0) href = 'https://ar.prvademecum.com/' + href.replace(/^\//, '');
    if (normalizeText(text).indexOf(normalizeText(queryRaw)) === -1 && normalizeText(queryRaw).indexOf(normalizeText(text)) === -1) continue;
    matches.push({
      medicamento: text,
      principio_activo: text,
      presentacion: '',
      fuente_argentina: 'PR Vademecum',
      fuente_url: href,
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    });
  }
  var unique = {};
  return matches.filter(function(x) {
    var k = (x.fuente_url || '') + '|' + normalizeText(x.medicamento || '');
    if (unique[k]) return false;
    unique[k] = true;
    return true;
  });
}

function antidoping_extractText_(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function antidoping_parseDetailFromHtml_(html) {
  var text = antidoping_extractText_(html);
  var principio = '';
  var presentacion = '';
  var laboratorio = '';

  var m1 = text.match(/principio\s*activo\s*[:\-]\s*([^|.]{3,180})/i);
  if (m1 && m1[1]) principio = m1[1].trim();

  var m2 = text.match(/presentaci[oó]n\s*[:\-]\s*([^|.]{3,180})/i);
  if (m2 && m2[1]) presentacion = m2[1].trim();

  var m3 = text.match(/laboratorio\s*[:\-]\s*([^|.]{3,140})/i);
  if (m3 && m3[1]) laboratorio = m3[1].trim();

  if (!principio) {
    var fallback = text.match(/([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,3}\s+\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml))/i);
    if (fallback && fallback[1]) principio = fallback[1].trim();
  }

  return {
    principio_activo: principio,
    presentacion: presentacion,
    laboratorio: laboratorio
  };
}

function antidoping_enrichPrItem_(item) {
  if (!item || !item.fuente_url) return item;
  try {
    var res = UrlFetchApp.fetch(item.fuente_url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) return item;
    var parsed = antidoping_parseDetailFromHtml_(res.getContentText());
    return {
      medicamento: item.medicamento || '',
      principio_activo: parsed.principio_activo || item.principio_activo || '',
      presentacion: parsed.presentacion || item.presentacion || '',
      laboratorio: parsed.laboratorio || item.laboratorio || '',
      fuente_argentina: item.fuente_argentina || 'PR Vademecum',
      fuente_url: item.fuente_url || '',
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    };
  } catch (e) {
    return item;
  }
}

function antidoping_appendHistorial_(query, result) {
  var headers = [
    'fecha_revision',
    'consulta',
    'medicamento',
    'principio_activo',
    'estado',
    'fuente_argentina',
    'fuente_wada',
    'fuente_secundaria',
    'observaciones'
  ];
  var sheet = antidoping_getOrCreateSheet_(SHEETS.antidopingHistorial, headers);
  var fecha = Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd HH:mm');
  sheet.appendRow([
    fecha,
    query,
    result.medicamento || '',
    result.principio_activo || '',
    result.estado || '',
    result.fuente_argentina || '',
    result.fuente_wada || '',
    result.fuente_secundaria || '',
    result.observaciones || ''
  ]);
}

function antidoping_buscarMedicamento(payload) {
  var consulta = String((payload && payload.consulta) || '').trim();
  if (!consulta) throw new Error('consulta es requerida');
  var consultaNorm = normalizeText(consulta);
  var forceRefresh = !!(payload && payload.forceRefresh);
  var directActiveQuery = antidoping_resolveDirectActiveQuery_(consulta);
  var knownActiveFromQuery = antidoping_knownCommercialActive_(consulta);
  var shouldBypassCache = !!knownActiveFromQuery || !!directActiveQuery;
  if (!forceRefresh && !shouldBypassCache) {
    var cached = antidoping_readCache_(consultaNorm);
    if (cached && cached.length) {
      antidoping_appendHistorial_(consulta, cached[0]);
      return ok(true, cached);
    }
  }

  var matches = [];
  var source = '';

  if (directActiveQuery) {
    matches = [{
      medicamento: consulta,
      principio_activo: directActiveQuery,
      presentacion: '',
      laboratorio: '',
      observaciones: '',
      fuente_argentina: 'Consulta directa por principio activo',
      fuente_secundaria: '',
      fuente_url: '',
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    }];
    source = 'direct_active';
  }

  if (!matches.length) {
    try {
      matches = antidoping_scrapePrVademecum_(consulta).slice(0, 6).map(antidoping_enrichPrItem_);
      source = 'prvademecum_live';
    } catch (e) {
      matches = [];
    }
  }

  if (!matches.length) {
    var catalogo = antidoping_readCatalogo_();
    matches = catalogo
      .map(function(item) {
        return {
          item: item,
          score: antidoping_scoreMatch_(consultaNorm, item)
        };
      })
      .filter(function(x) { return x.score > 0; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 5)
      .map(function(x) { return x.item; });
    source = 'catalogo_local';
  }

  if (!matches.length) {
    matches = [{
      medicamento: consulta,
      principio_activo: knownActiveFromQuery || consulta,
      presentacion: '',
      laboratorio: '',
      observaciones: '',
      fuente_argentina: knownActiveFromQuery ? 'Marca comercial normalizada' : 'Consulta directa pendiente de identificar',
      fuente_secundaria: '',
      fuente_url: '',
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    }];
    source = knownActiveFromQuery ? 'known_commercial_active' : 'direct_unresolved';
  }

  var enriquecidos = matches.map(function(item) {
    var mappedActive = antidoping_knownCommercialActive_(item.medicamento || '');
    var rawActive = String(item.principio_activo || '').trim();
    var principio = rawActive;
    if (!principio) {
      principio = mappedActive || item.medicamento || '';
    } else {
      var nPrincipio = normalizeText(principio);
      var nMedicamento = normalizeText(item.medicamento || '');
      if (mappedActive && (nPrincipio === nMedicamento || nPrincipio === normalizeText(mappedActive))) {
        principio = mappedActive;
      }
    }
    var evalWada = antidoping_evalWada_(principio);
    return {
      medicamento: item.medicamento || consulta,
      principio_activo: principio || '',
      presentacion: item.presentacion || '',
      laboratorio: item.laboratorio || '',
      estado: evalWada.estado || item.estado || 'REQUIERE REVISIÓN',
      observaciones: item.observaciones || evalWada.advertencia_detalle || evalWada.criterio_wada || evalWada.observaciones_wada || '',
      advertencia_detalle: evalWada.advertencia_detalle || '',
      criterio_wada: evalWada.criterio_wada || '',
      fuente_argentina: item.fuente_argentina || 'PR Vademecum',
      fuente_wada: item.fuente_wada || evalWada.fuente_wada || 'Pendiente de revisión',
      fuente_secundaria: item.fuente_secundaria || '',
      en_competencia: evalWada.en_competencia || '',
      fuera_competencia: evalWada.fuera_competencia || '',
      fuente_url: item.fuente_url || '',
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    };
  });

  if (!enriquecidos.length) {
    enriquecidos = [{
      medicamento: consulta,
      principio_activo: '',
      presentacion: '',
      estado: 'NO ENCONTRADO / REQUIERE VERIFICACIÓN',
      observaciones: 'Sin coincidencia en fuentes configuradas. Requiere validación manual.',
      advertencia_detalle: '',
      criterio_wada: '',
      fuente_argentina: 'PR Vademecum / Catálogo local',
      fuente_wada: 'WADA_Sustancias',
      fuente_secundaria: '',
      fuente_url: '',
      fecha_revision: Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')
    }];
  }

  antidoping_writeCache_(consultaNorm, consulta, source, enriquecidos);
  antidoping_appendHistorial_(consulta, enriquecidos[0]);
  return ok(true, enriquecidos);
}

function antidoping_getFrecuentes() {
  var frecuentes = antidoping_readCatalogo_()
    .filter(function(item) { return normalizeText(item.frecuente) === 'si'; })
    .slice(0, 40);
  return ok(true, frecuentes);
}

function antidoping_getHistorial() {
  var headers = [
    'fecha_revision',
    'consulta',
    'medicamento',
    'principio_activo',
    'estado',
    'fuente_argentina',
    'fuente_wada',
    'fuente_secundaria',
    'observaciones'
  ];
  var sheet = antidoping_getOrCreateSheet_(SHEETS.antidopingHistorial, headers);
  var data = sheetToObjects(sheet);
  data.sort(function(a, b) {
    return String(b.fecha_revision || '').localeCompare(String(a.fecha_revision || ''));
  });
  return ok(true, data.slice(0, 50).map(function(r) {
    return {
      fecha_revision: String(r.fecha_revision || ''),
      consulta: String(r.consulta || ''),
      medicamento: String(r.medicamento || ''),
      principio_activo: String(r.principio_activo || ''),
      estado: String(r.estado || ''),
      fuente_argentina: String(r.fuente_argentina || ''),
      fuente_wada: String(r.fuente_wada || ''),
      fuente_secundaria: String(r.fuente_secundaria || ''),
      observaciones: String(r.observaciones || '')
    };
  }));
}

function antidoping_importarCatalogo(payload) {
  var items = (payload && payload.items) || [];
  var modo = String((payload && payload.modo) || 'replace').toLowerCase();
  if (!Array.isArray(items) || !items.length) throw new Error('items es requerido y debe tener al menos 1 registro');
  if (modo !== 'replace' && modo !== 'append') throw new Error("modo inválido. Usar 'replace' o 'append'");

  var headers = [
    'medicamento',
    'principio_activo',
    'estado',
    'observaciones',
    'fuente_argentina',
    'fuente_wada',
    'fuente_secundaria',
    'fecha_revision',
    'frecuente'
  ];
  var sheet = antidoping_getOrCreateSheet_(SHEETS.antidopingCatalogo, headers);

  var invalidos = [];
  var rows = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i] || {};
    var medicamento = String(it.medicamento || '').trim();
    if (!medicamento) {
      invalidos.push({ index: i, error: 'medicamento es obligatorio' });
      continue;
    }
    rows.push([
      medicamento,
      String(it.principio_activo || '').trim(),
      String(it.estado || 'REQUIERE REVISIÓN').trim(),
      String(it.observaciones || '').trim(),
      String(it.fuente_argentina || '').trim(),
      String(it.fuente_wada || '').trim(),
      String(it.fuente_secundaria || '').trim(),
      String(it.fecha_revision || Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd')).trim(),
      String(it.frecuente || '').trim().toUpperCase() === 'SI' ? 'SI' : 'NO'
    ]);
  }

  if (!rows.length) {
    return ok(false, null, 'No hay registros válidos para importar');
  }

  if (modo === 'replace' && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);

  return ok(true, {
    modo: modo,
    importados: rows.length,
    rechazados: invalidos.length,
    invalidos: invalidos.slice(0, 30)
  });
}

function antidoping_importarWada(payload) {
  var modo = String((payload && payload.modo) || 'replace').toLowerCase();
  var rowsInput = (payload && payload.rows) || [];
  var csv = String((payload && payload.csv) || '').trim();
  var version = String((payload && payload.version) || '').trim();
  if (modo !== 'replace' && modo !== 'append') throw new Error("modo inválido. Usar 'replace' o 'append'");

  if ((!Array.isArray(rowsInput) || !rowsInput.length) && !csv) {
    throw new Error('Debes enviar rows (array) o csv (texto)');
  }

  var headers = ['sustancia', 'estado', 'categoria', 'en_competencia', 'fuera_competencia', 'umbral', 'nota', 'version'];
  var sh = antidoping_getOrCreateSheet_(SHEETS.wadaSustancias, headers);

  var items = [];
  if (Array.isArray(rowsInput) && rowsInput.length) {
    items = rowsInput;
  } else {
    var lines = csv.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
    var start = 0;
    if (lines.length && normalizeText(lines[0]).indexOf('sustancia') !== -1) start = 1;
    for (var i = start; i < lines.length; i++) {
      var cols = lines[i].split(';');
      if (cols.length < 2) cols = lines[i].split(',');
      items.push({
        sustancia: cols[0] || '',
        estado: cols[1] || '',
        categoria: cols[2] || '',
        en_competencia: cols[3] || '',
        fuera_competencia: cols[4] || '',
        umbral: cols[5] || '',
        nota: cols[6] || '',
        version: cols[7] || version
      });
    }
  }

  var invalidos = [];
  var rows = [];
  for (var j = 0; j < items.length; j++) {
    var it = items[j] || {};
    var sustancia = String(it.sustancia || '').trim();
    if (!sustancia) {
      invalidos.push({ index: j, error: 'sustancia es obligatoria' });
      continue;
    }
    rows.push([
      sustancia,
      String(it.estado || 'REQUIERE REVISIÓN').trim(),
      String(it.categoria || '').trim(),
      String(it.en_competencia || '').trim(),
      String(it.fuera_competencia || '').trim(),
      String(it.umbral || '').trim(),
      String(it.nota || '').trim(),
      String(it.version || version || '').trim()
    ]);
  }

  if (!rows.length) return ok(false, null, 'No hay filas WADA válidas para importar');

  if (modo === 'replace' && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }

  var startRow = sh.getLastRow() + 1;
  sh.getRange(startRow, 1, rows.length, headers.length).setValues(rows);

  return ok(true, {
    modo: modo,
    importados: rows.length,
    rechazados: invalidos.length,
    invalidos: invalidos.slice(0, 30)
  });
}

function antidoping_getBackendStatus() {
  var cacheSheet = antidoping_getCacheSheet_();
  var wadaSheet = antidoping_getOrCreateSheet_(SHEETS.wadaSustancias, ['sustancia', 'estado', 'categoria', 'en_competencia', 'fuera_competencia', 'umbral', 'nota', 'version']);
  var histSheet = antidoping_getOrCreateSheet_(SHEETS.antidopingHistorial, ['fecha_revision', 'consulta', 'medicamento', 'principio_activo', 'estado', 'fuente_argentina', 'fuente_wada', 'fuente_secundaria', 'observaciones']);

  var wadaRows = Math.max(0, wadaSheet.getLastRow() - 1);
  var cacheRows = Math.max(0, cacheSheet.getLastRow() - 1);
  var histRows = Math.max(0, histSheet.getLastRow() - 1);

  var latestWadaVersion = '';
  if (wadaRows > 0) {
    var versionCol = getColIndex(wadaSheet, 'version');
    if (versionCol > 0) {
      var vals = wadaSheet.getRange(2, versionCol, wadaRows, 1).getValues().map(function(r) { return String(r[0] || '').trim(); }).filter(Boolean);
      if (vals.length) latestWadaVersion = vals[vals.length - 1];
    }
  }

  return ok(true, {
    backend_version: ANTIDOPING_BACKEND_VERSION,
    generated_at: antidoping_nowIso_(),
    cache_ttl_days: ANTIDOPING_CACHE_TTL_DAYS,
    cache_rows: cacheRows,
    historial_rows: histRows,
    wada_rows: wadaRows,
    wada_loaded: wadaRows > 0,
    wada_version: latestWadaVersion || 'N/D'
  });
}

function tue_todayIso_() {
  return Utilities.formatDate(new Date(), 'GMT-3', 'yyyy-MM-dd');
}

function tue_addDaysIso_(iso, days) {
  var base = parseFechaHoja_(iso);
  if (!base) return '';
  base.setDate(base.getDate() + days);
  return Utilities.formatDate(base, 'GMT-3', 'yyyy-MM-dd');
}

function tue_normalizeEstado_(estado, vencimiento) {
  var s = String(estado || '').trim();
  if (!s) return '';
  if (/vigente/i.test(s) && tue_isExpired_(vencimiento)) return 'Vencido';
  return s;
}

function tue_isExpired_(vencimiento) {
  var fecha = parseFechaHoja_(vencimiento);
  if (!fecha) return false;
  return fecha.getTime() < fechaHoyArgentina_().getTime();
}

function tue_shouldRequire_(item) {
  var estado = normalizeText(item && item.estado);
  var detalle = normalizeText(item && item.advertencia_detalle);
  return estado.indexOf('prohibido') !== -1 ||
    estado.indexOf('advertencia') !== -1 ||
    detalle.indexOf('tue') !== -1;
}

function antidoping_guardarTUE(payload) {
  var dni = normalizarDNI_(payload && payload.dni);
  if (!dni) throw new Error('dni es requerido');
  var row = getRowByDNI_(dni);
  if (!row) throw new Error('Jugadora no encontrada');

  base_ensureTUEColumns_();

  var fechaEmision = String((payload && payload.fecha_emision) || '').trim() || tue_todayIso_();
  var fechaVencimiento = String((payload && payload.fecha_vencimiento) || '').trim();
  if (!fechaVencimiento) fechaVencimiento = tue_addDaysIso_(fechaEmision, TUE_DEFAULT_DURATION_DAYS);

  var cambios = {
    TUE_Estado: String((payload && payload.estado) || '').trim() || 'En preparación',
    TUE_Medicamento: String((payload && payload.medicamento) || '').trim(),
    TUE_Sustancia: String((payload && payload.sustancia) || '').trim(),
    TUE_Diagnostico: String((payload && payload.diagnostico) || '').trim(),
    TUE_Justificacion: String((payload && payload.justificacion) || '').trim(),
    TUE_Fecha_Emision: fechaEmision,
    TUE_Fecha_Vencimiento: fechaVencimiento,
    TUE_IBSA_Enviado: String((payload && payload.ibsa_enviado) || '').trim() || 'NO',
    TUE_IBSA_Fecha_Envio: String((payload && payload.ibsa_fecha_envio) || '').trim(),
    TUE_Observaciones: String((payload && payload.observaciones) || '').trim()
  };

  guardarCambios(dni, cambios, payload && payload.usuario ? payload.usuario : 'Sistema — TUE');
  return getFicha(dni);
}

function antidoping_listarTUEs() {
  base_ensureTUEColumns_();
  var filas = getAllRows_();
  var casos = filas
    .map(function(r) {
      var estado = tue_normalizeEstado_(r.TUE_Estado, r.TUE_Fecha_Vencimiento);
      var hasData = [
        estado,
        r.TUE_Sustancia,
        r.TUE_Medicamento,
        r.TUE_Archivo,
        r.TUE_Fecha_Emision,
        r.TUE_Fecha_Vencimiento
      ].some(function(v) { return String(v || '').trim() !== ''; });
      if (!hasData) return null;
      return {
        dni: r.DNI || '',
        nombre: (r.Apellido || '') ? ((r.Apellido || '') + ', ' + (r.Nombre || '')) : (r.Nombre || ''),
        estado: estado || 'En preparación',
        medicamento: String(r.TUE_Medicamento || '').trim(),
        sustancia: String(r.TUE_Sustancia || '').trim(),
        diagnostico: String(r.TUE_Diagnostico || '').trim(),
        justificacion: String(r.TUE_Justificacion || '').trim(),
        fecha_emision: String(r.TUE_Fecha_Emision || '').trim(),
        fecha_vencimiento: String(r.TUE_Fecha_Vencimiento || '').trim(),
        ibsa_enviado: String(r.TUE_IBSA_Enviado || '').trim() || 'NO',
        ibsa_fecha_envio: String(r.TUE_IBSA_Fecha_Envio || '').trim(),
        observaciones: String(r.TUE_Observaciones || '').trim(),
        archivo: String(r.TUE_Archivo || '').trim(),
        vigente: !tue_isExpired_(r.TUE_Fecha_Vencimiento) && /vigente/i.test(estado || ''),
        vencido: tue_isExpired_(r.TUE_Fecha_Vencimiento)
      };
    })
    .filter(Boolean)
    .sort(function(a, b) {
      return (a.nombre || '').localeCompare(b.nombre || '');
    });

  var resumen = {
    total: casos.length,
    vigentes: casos.filter(function(x) { return x.vigente; }).length,
    pendientes_ibsa: casos.filter(function(x) {
      return (x.vigente || /subido|preparacion|preparación|revision/i.test(x.estado)) && String(x.ibsa_enviado || '').toUpperCase() !== 'SI';
    }).length,
    vencidos: casos.filter(function(x) { return x.vencido; }).length
  };

  return { resumen: resumen, casos: casos };
}

function base_crearHojaWADA_() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName('WADA_Sustancias');
  var headers = ['sustancia', 'estado', 'categoria', 'en_competencia', 'fuera_competencia', 'umbral', 'nota', 'version'];
  if (!sh) {
    sh = ss.insertSheet('WADA_Sustancias');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    return sh;
  }
  var currentHeaders = [];
  if (sh.getLastRow() >= 1 && sh.getLastColumn() > 0) {
    currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  }
  if (!currentHeaders.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers.forEach(function(h) {
      if (currentHeaders.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
        currentHeaders.push(h);
      }
    });
  }
  sh.setFrozenRows(1);
  return sh;
}

function base_importarWADA(rows, modo) {
  var items = Array.isArray(rows) ? rows : [];
  var importMode = String(modo || 'replace').toLowerCase();
  if (importMode !== 'replace' && importMode !== 'append') importMode = 'replace';
  var sh = base_crearHojaWADA_();
  var headers = ['sustancia', 'estado', 'categoria', 'en_competencia', 'fuera_competencia', 'umbral', 'nota', 'version'];

  if (importMode === 'replace' && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  }

  var rejected = 0;
  var values = [];
  items.forEach(function(it) {
    var r = it || {};
    var sustancia = String(r.sustancia || '').trim();
    if (!sustancia) {
      rejected++;
      return;
    }
    values.push([
      sustancia,
      String(r.estado || 'REQUIERE REVISIÓN').trim(),
      String(r.categoria || '').trim(),
      String(r.en_competencia || '').trim(),
      String(r.fuera_competencia || '').trim(),
      String(r.umbral || '').trim(),
      String(r.nota || '').trim(),
      String(r.version || '').trim()
    ]);
  });

  if (values.length) {
    var startRow = sh.getLastRow() + 1;
    sh.getRange(startRow, 1, values.length, headers.length).setValues(values);
  }

  return {
    importados: values.length,
    rechazados: rejected
  };
}

function base_getWADAStatus() {
  var sh = base_crearHojaWADA_();
  var rows = Math.max(0, sh.getLastRow() - 1);
  var version = '';
  if (rows > 0) {
    var colVersion = getColIndex(sh, 'version');
    if (colVersion > 0) {
      var vals = sh.getRange(2, colVersion, rows, 1).getValues()
        .map(function(r) { return String(r[0] || '').trim(); })
        .filter(Boolean);
      if (vals.length) version = vals[vals.length - 1];
    }
  }
  return {
    wada_loaded: rows > 0,
    wada_rows: rows,
    version: version
  };
}

// ── FUNCIONES PÚBLICAS ────────────────────────────────────────────────────────

/**
 * getPlantel — devuelve el listado para el dropdown expandido del frontend.
 * Incluye beca_actual (Beca_SSDN_2025 = ciclo 2026) y beca_anterior (Beca_SDN_2024 = ciclo 2025).
 * NOTA AÑO A AÑO: los campos de Sheets no cambian; solo las etiquetas en el Index.html.
 */
function getPlantel() {
  return getAllRows_().map(function(r) {
    return {
      dni:           r.DNI,
      nombre:        r.Apellido + ', ' + r.Nombre,
      rol:           r.Rol,
      estado:        r.Estado_Convocatoria,
      beca_actual:   r.Beca_SSDN_2025   || '',   // categoría vigente (postulación 2026)
      beca_anterior: r.Beca_SDN_2024    || '',   // categoría anterior (ciclo 2025)
    };
  });
}

/**
 * getFicha — devuelve todos los campos de una persona por DNI.
 * getAllRows_() ya mapea dinámicamente todos los headers,
 * por lo que Titulo_Educativo aparecerá automáticamente
 * en cuanto se agregue la columna en la hoja de Sheets.
 */
function getFicha(dni) {
  return getRowByDNI_(dni);
}

/**
 * getFaltantes — devuelve solo las personas con campos críticos incompletos,
 * excluyendo bajas. Ordenado de menor a mayor completitud.
 */
function getFaltantes() {
  return getAllRows_()
    .filter(function(r) { return r.Estado_Convocatoria !== 'Baja'; })
    .map(function(r) {
      var faltantes = CAMPOS_CRITICOS.filter(function(c) {
        var val = r[c];
        return !val || val.toString().trim() === '' || val.toString().trim() === 'PENDIENTE';
      });
      return {
        dni:         r.DNI,
        nombre:      r.Apellido + ', ' + r.Nombre,
        rol:         r.Rol,
        faltantes:   faltantes,
        completitud: Math.round(((CAMPOS_CRITICOS.length - faltantes.length) / CAMPOS_CRITICOS.length) * 100)
      };
    })
    .filter(function(r) { return r.faltantes.length > 0; }) // solo los que tienen algo pendiente
    .sort(function(a, b) { return a.completitud - b.completitud; });
}

/**
 * guardarCambios — escribe los cambios en la hoja y registra cada uno en Log_Cambios.
 */
function guardarCambios(dni, cambios, usuario) {
  var ws      = base_ensureTUEColumns_(getSheet_());
  var headers = ws.getDataRange().getValues()[0];
  var row     = getRowByDNI_(dni);
  if (!row) return { ok: false, msg: 'DNI no encontrado' };

  var rowNum   = row.__row;
  var logSheet = getLogSheet_();
  var ahora    = Utilities.formatDate(new Date(), 'GMT-3', 'dd/MM/yyyy HH:mm');
  var nombre   = (row.Apellido || '') + ', ' + (row.Nombre || '');

  for (var campo in cambios) {
    var colIdx = headers.indexOf(campo);
    if (colIdx === -1) {
      ensureColumn_(ws, campo);
      headers = ws.getDataRange().getValues()[0].map(String);
      colIdx = headers.indexOf(campo);
    }
    if (colIdx === -1) continue;

    var valorAnterior = ws.getRange(rowNum, colIdx + 1).getValue();
    var valorNuevo    = cambios[campo];

    ws.getRange(rowNum, colIdx + 1).setValue(valorNuevo);

    // Registrar en log solo si el valor realmente cambió
    if (String(valorAnterior) !== String(valorNuevo)) {
      logSheet.appendRow([ahora, dni, nombre, campo, valorAnterior, valorNuevo, usuario || 'Sin usuario']);
    }
  }

  // Actualizar fecha de última modificación si la columna existe
  var idxFecha = headers.indexOf('Ultima_Actualizacion');
  if (idxFecha > -1) ws.getRange(rowNum, idxFecha + 1).setValue(ahora);

  var idxMod = headers.indexOf('Modificado_Por');
  if (idxMod > -1) ws.getRange(rowNum, idxMod + 1).setValue(usuario || 'Sin usuario');

  return { ok: true };
}

/**
 * darDeBaja — cambia Estado_Convocatoria a 'Baja'.
 */
function darDeBaja(dni) {
  return guardarCambios(dni, { 'Estado_Convocatoria': 'Baja' }, 'Sistema — Baja');
}

// ── ALERTAS ───────────────────────────────────────────────────────────────────

var DIAS_PREAVISO_VTO_ = 60;

var LABELS_CAMPO_ALERTAS_ = {
  DNI_Vto:                'Vencimiento DNI',
  Pasaporte_Vto:          'Vencimiento pasaporte',
  CUD_Vto:                'Vencimiento CUD',
  Apto_Medico_Vto:        'Vencimiento apto médico',
  Clasif_Visual_Revision: 'Revisión clasificación visual',
  Apto_Medico_Vigente:    'Apto médico vigente',
  Clasif_Visual_Estado:   'Clasificación visual IBSA',
  Telefono:               'Teléfono',
  Email:                  'Email',
  Emergencia_Nombre:      'Contacto de emergencia',
  Emergencia_Tel:         'Teléfono de emergencia',
  Foto_Link:              'Foto',
  TUE_Fecha_Vencimiento:  'Vencimiento TUE',
  TUE_IBSA_Enviado:       'Envío TUE a IBSA',
};

/**
 * base_getAlertas — devuelve { faltantes, vencimientos } para el dashboard.
 * Solo evalúa integrantes con Activo = "SI".
 */
function base_getAlertas() {
  var filas = getAllRows_();
  var hoy   = fechaHoyArgentina_();
  var alertas = [];

  filas.forEach(function(r) {
    if (String(r.Activo || '').toUpperCase() !== 'SI') return;

    var apellido = String(r.Apellido || '').trim();
    var nombre   = String(r.Nombre   || '').trim();
    var nombreCompleto = apellido ? apellido + ', ' + nombre : nombre;
    var dni = r.DNI || '';

    // Regla 1: documentos con fecha de vencimiento
    ['DNI_Vto', 'Pasaporte_Vto', 'CUD_Vto', 'Apto_Medico_Vto', 'TUE_Fecha_Vencimiento'].forEach(function(campo) {
      var alerta = evaluarVencimientoCampo_(r[campo], campo, nombreCompleto, dni, hoy);
      if (alerta) alertas.push(alerta);
    });

    // Regla 1b: Clasif_Visual_Revision tratada como documento si tiene fecha parseable
    var alertaRev = evaluarVencimientoCampo_(
      r.Clasif_Visual_Revision, 'Clasif_Visual_Revision', nombreCompleto, dni, hoy
    );
    if (alertaRev) alertas.push(alertaRev);

    // Regla 2: apto médico sin vigencia
    if (String(r.Apto_Medico_Vigente || '').toUpperCase() !== 'SI') {
      alertas.push({
        tipo:           'ROJA',
        categoria:      'medico',
        jugadora:       nombreCompleto,
        dni:            dni,
        campo:          'Apto_Medico_Vigente',
        mensaje:        'Apto médico no vigente.',
        dias_restantes: null,
        fecha:          null,
      });
    }

    // Regla 3: clasificación IBSA por estado
    var estadoClasif = String(r.Clasif_Visual_Estado || '').trim();
    if (!estadoClasif) {
      alertas.push({
        tipo:           'ROJA',
        categoria:      'clasificacion',
        jugadora:       nombreCompleto,
        dni:            dni,
        campo:          'Clasif_Visual_Estado',
        mensaje:        'Clasificación visual IBSA sin completar.',
        dias_restantes: null,
        fecha:          null,
      });
    } else if (estadoClasif.toLowerCase().indexOf('proximo torneo') !== -1 ||
               estadoClasif.toLowerCase().indexOf('próximo torneo') !== -1) {
      alertas.push({
        tipo:           'AMARILLA',
        categoria:      'clasificacion',
        jugadora:       nombreCompleto,
        dni:            dni,
        campo:          'Clasif_Visual_Estado',
        mensaje:        'Clasificación visual pendiente para el próximo torneo.',
        dias_restantes: null,
        fecha:          null,
      });
    }
    // "Confirmada" → sin alerta; otros valores no especificados → sin alerta

    // Regla 4: datos críticos faltantes
    ['Telefono', 'Email', 'Emergencia_Nombre', 'Emergencia_Tel', 'Foto_Link'].forEach(function(campo) {
      var val = String(r[campo] || '').trim();
      if (!val || val === 'PENDIENTE') {
        alertas.push({
          tipo:           'AMARILLA',
          categoria:      'datos',
          jugadora:       nombreCompleto,
          dni:            dni,
          campo:          campo,
          mensaje:        (LABELS_CAMPO_ALERTAS_[campo] || campo) + ' sin completar.',
          dias_restantes: null,
          fecha:          null,
        });
      }
    });

    var tueEstado = tue_normalizeEstado_(r.TUE_Estado, r.TUE_Fecha_Vencimiento);
    if (tueEstado && !tue_isExpired_(r.TUE_Fecha_Vencimiento) && /vigente|subido|revision|preparacion|preparación/i.test(tueEstado)) {
      if (String(r.TUE_IBSA_Enviado || '').toUpperCase() !== 'SI') {
        alertas.push({
          tipo: 'AMARILLA',
          categoria: 'documento',
          jugadora: nombreCompleto,
          dni: dni,
          campo: 'TUE_IBSA_Enviado',
          mensaje: 'TUE cargada sin confirmar envío a IBSA.',
          dias_restantes: null,
          fecha: null
        });
      }
    }
  });

  return agruparAlertas_(alertas);
}

// Evalúa un campo de fecha y devuelve una alerta si está vencido o próximo a vencer.
// Retorna null si el valor está vacío, no es una fecha, o no genera alerta.
function evaluarVencimientoCampo_(valor, campo, jugadora, dni, hoy) {
  var str = String(valor || '').trim();
  if (!str || str === 'PENDIENTE') return null;

  var fecha = parseFechaHoja_(str);
  if (!fecha) return null;

  var diasRestantes = Math.floor((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes > DIAS_PREAVISO_VTO_) return null;

  var tipo = diasRestantes < 0 ? 'ROJA' : 'AMARILLA';
  var abs  = Math.abs(diasRestantes);
  var sufijo = abs === 1 ? ' día.' : ' días.';
  var mensaje = (LABELS_CAMPO_ALERTAS_[campo] || campo) + (diasRestantes < 0
    ? ' vencido hace '  + abs + sufijo
    : ' vence en '      + diasRestantes + sufijo);

  return {
    tipo:           tipo,
    categoria:      'documento',
    jugadora:       jugadora,
    dni:            dni,
    campo:          campo,
    mensaje:        mensaje,
    dias_restantes: diasRestantes,
    fecha:          str,
  };
}

// Parsea "dd/MM/yyyy" (formato de formatearFecha_) o "yyyy-MM-dd" (ISO).
// Retorna un objeto Date sin componente horario, o null si no puede parsear.
function parseFechaHoja_(str) {
  if (!str) return null;

  var pp = str.split('/');
  if (pp.length === 3) {
    var d = parseInt(pp[0], 10), m = parseInt(pp[1], 10) - 1, y = parseInt(pp[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 1900) return new Date(y, m, d);
  }

  var pi = str.split('-');
  if (pi.length === 3) {
    var y2 = parseInt(pi[0], 10), m2 = parseInt(pi[1], 10) - 1, d2 = parseInt(pi[2], 10);
    if (!isNaN(d2) && !isNaN(m2) && !isNaN(y2) && y2 > 1900) return new Date(y2, m2, d2);
  }

  return null;
}

// Devuelve la fecha local en Argentina (UTC-3 fijo, sin horario de verano).
function fechaHoyArgentina_() {
  var ahora = new Date();
  var local = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
  return new Date(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

// Agrupa el array plano de alertas en { faltantes, vencimientos } para el frontend.
function agruparAlertas_(alertas) {
  var faltantesMap = {};
  var vencimientos = [];

  alertas.forEach(function(a) {
    if (a.categoria === 'datos') {
      var key = a.dni || a.jugadora;
      if (!faltantesMap[key]) {
        faltantesMap[key] = { nombre: a.jugadora, dni: a.dni, faltantes: [] };
      }
      faltantesMap[key].faltantes.push(a.campo);
    } else {
      vencimientos.push({
        nombre:    a.jugadora,
        dni:       a.dni,
        tipo:      LABELS_CAMPO_ALERTAS_[a.campo] || a.campo,
        nivel:     a.tipo,
        fecha:     a.fecha  || null,
        dias:      a.dias_restantes,
        detalle:   a.mensaje,
        categoria: a.categoria,
      });
    }
  });

  // Ordenar: ROJA primero, luego por días_restantes ascendente
  vencimientos.sort(function(a, b) {
    if (a.nivel === 'ROJA' && b.nivel !== 'ROJA') return -1;
    if (a.nivel !== 'ROJA' && b.nivel === 'ROJA') return  1;
    var da = (typeof a.dias === 'number') ? a.dias : 9999;
    var db = (typeof b.dias === 'number') ? b.dias : 9999;
    return da - db;
  });

  return {
    faltantes:    Object.values(faltantesMap),
    vencimientos: vencimientos,
  };
}

// ── GESTIÓN DE ARCHIVOS EN DRIVE ──────────────────────────────────────────────
var CATEGORIAS_DRIVE_ = {
  'foto':        '01_Fotos',
  'dni':         '01b_DNI',
  'apto_medico': '02_Aptos_Medicos',
  'pasaporte':   '03_Pasaportes',
  'cud':         '03b_CUD',
  'antidoping':  '04_Anti_Doping',
  'tue':         '05_TUE',
  'ibsa_elegibilidad': '06_IBSA_Elegibilidad'
};

var CAMPOS_LINK_ = {
  'foto':        'Foto_Link',
  'dni':         'DNI_Scan_Link',
  'pasaporte':   'Pasaporte_Scan_Link',
  'cud':         'CUD_Link',
  'apto_medico': 'Apto_Medico_Link',
  'antidoping':  'Anti_Doping_Link',
  'tue':         'TUE_Archivo',
  'ibsa_elegibilidad': 'IBSA_Elegibilidad_Archivo'
};

function subirArchivo(dni, tipo, base64Data, mimeType, extension) {
  try {
    base_ensureDocumentColumns_();
    var row = getRowByDNI_(dni);
    if (!row) return { ok: false, msg: 'Persona no encontrada' };

    var apellido    = (row.Apellido || 'SIN_APELLIDO').replace(/\s+/g, '_');
    var nombreCorto = (row.Nombre   || 'SIN_NOMBRE').split(' ')[0];
    var fechaStr    = Utilities.formatDate(new Date(), 'GMT-3', 'yyyyMMdd');
    var nombreArchivo = tipo.toUpperCase() + '_' + apellido + '_' + nombreCorto + '_' + fechaStr + '.' + extension;

    var carpetaRaiz  = DriveApp.getFolderById(CONFIG.DRIVE_RAIZ_ID);
    var nombreMadre  = CATEGORIAS_DRIVE_[tipo] || '00_Otros';

    // Obtener o crear carpeta del tipo
    var folders     = carpetaRaiz.getFoldersByName(nombreMadre);
    var carpetaMadre = folders.hasNext() ? folders.next() : carpetaRaiz.createFolder(nombreMadre);

    // Mover versiones anteriores a HISTORICO
    var prefijo = tipo.toUpperCase() + '_' + apellido + '_' + nombreCorto;
    var existentes = carpetaMadre.getFiles();
    while (existentes.hasNext()) {
      var viejo = existentes.next();
      if (viejo.getName().indexOf(prefijo) === 0) {
        var histFolders = carpetaMadre.getFoldersByName('HISTORICO');
        var hist = histFolders.hasNext() ? histFolders.next() : carpetaMadre.createFolder('HISTORICO');
        viejo.moveTo(hist);
      }
    }

    // Crear nuevo archivo
    var bytes      = Utilities.base64Decode(base64Data);
    var blob       = Utilities.newBlob(bytes, mimeType, nombreArchivo);
    var archivoNuevo = carpetaMadre.createFile(blob);
    archivoNuevo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var link = archivoNuevo.getUrl();

    // Guardar link en Sheets
    var cambios = {};
    if (CAMPOS_LINK_[tipo]) cambios[CAMPOS_LINK_[tipo]] = link;
    if (tipo === 'apto_medico') cambios['Apto_Medico_Vigente'] = 'SI';
    if (tipo === 'tue') {
      if (!String(row.TUE_Estado || '').trim()) cambios['TUE_Estado'] = 'Subido';
      if (!String(row.TUE_Fecha_Emision || '').trim()) cambios['TUE_Fecha_Emision'] = tue_todayIso_();
      if (!String(row.TUE_Fecha_Vencimiento || '').trim()) cambios['TUE_Fecha_Vencimiento'] = tue_addDaysIso_(tue_todayIso_(), TUE_DEFAULT_DURATION_DAYS);
      if (!String(row.TUE_IBSA_Enviado || '').trim()) cambios['TUE_IBSA_Enviado'] = 'NO';
    }

    guardarCambios(dni, cambios, 'Sistema — Upload');

    return { ok: true, link: link };

  } catch (e) {
    return { ok: false, msg: e.toString() };
  }
}

/**
 * getDriveFolderLink — devuelve el link de la carpeta Drive de un tipo de archivo.
 * Útil para referencias externas o auditorías.
 */
function getDriveFolderLink(tipo) {
  var carpetaRaiz = DriveApp.getFolderById(CONFIG.DRIVE_RAIZ_ID);
  var nombre      = CATEGORIAS_DRIVE_[tipo] || '00_Otros';
  var folders     = carpetaRaiz.getFoldersByName(nombre);
  return folders.hasNext() ? folders.next().getUrl() : carpetaRaiz.getUrl();
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = payload.action || '';
    var result;

    switch (action) {
     
  // ── BASE ──
  case 'verificarPassword':
  case 'base_verificarPassword':
    result = ok(true, verificarPassword(payload.pwd || payload.password || ''));
    break;

  case 'getPlantel':
    result = ok(true, getPlantel());
    break;

  case 'getFicha':
    result = ok(true, getFicha(payload.dni));
    break;

  case 'getFaltantes':
    result = ok(true, getFaltantes());
    break;

  case 'guardarCambios':
    result = guardarCambios(payload.dni, payload.cambios, payload.usuario);
    break;

  case 'darDeBaja':
    result = darDeBaja(payload.dni);
    break;

  case 'subirArchivo':
    result = subirArchivo(
      payload.dni,
      payload.tipo,
      payload.base64Data,
      payload.mimeType,
      payload.extension
    );
    break;

  case 'base_agregarColumna':
    result = base_agregarColumna(payload);
    break;

  case 'getAlertas':
    result = ok(true, base_getAlertas());
    break;

        // ── PENALES ──
      case 'penales_getSesiones':        result = penales_getSesiones(); break;
      case 'penales_crearSesion':        result = penales_crearSesion(payload); break;
      case 'penales_editarSesion':       result = penales_editarSesion(payload); break;
      case 'penales_getPenales':         result = penales_getPenales(payload); break;
      case 'penales_registrarPenal':     result = penales_registrarPenal(payload); break;
      case 'penales_eliminarPenal':      result = penales_eliminarPenal(payload); break;

      // ── PARTIDOS ──
      case 'partidos_getPartidos':       result = partidos_getPartidos(); break;
      case 'partidos_getDetalle':        result = partidos_getDetalle(payload); break;
      case 'partidos_crearPartido':      result = partidos_crearPartido(payload); break;
      case 'partidos_actualizarPartido': result = partidos_actualizarPartido(payload); break;
      case 'partidos_eliminarPartido':   result = partidos_eliminarPartido(payload); break;
      case 'partidos_guardarDetalle':    result = partidos_guardarDetalle(payload); break;
      case 'partidos_guardarConvocatoria': result = partidos_guardarConvocatoria(payload); break;
      case 'partidos_guardarRatings':    result = partidos_guardarRatings(payload); break;
      case 'partidos_agregarMomento':    result = partidos_agregarMomento(payload); break;
      case 'partidos_eliminarMomento':   result = partidos_eliminarMomento(payload); break;

      case 'partidos_getMetricas':
  result = partidos_getMetricas(payload);
  break;

      // ── CONCENTRACIONES ──
      case 'concentraciones_getConcentraciones':    result = concentraciones_getConcentraciones(); break;
      case 'concentraciones_crearConcentracion':    result = concentraciones_crearConcentracion(payload); break;
      case 'concentraciones_editarConcentracion':   result = concentraciones_editarConcentracion(payload); break;
      case 'concentraciones_eliminarConcentracion': result = concentraciones_eliminarConcentracion(payload); break;
      case 'concentraciones_getDias':               result = concentraciones_getDias(payload); break;
      case 'concentraciones_agregarActividad':      result = concentraciones_agregarActividad(payload); break;
      case 'concentraciones_editarActividad':       result = concentraciones_editarActividad(payload); break;
      case 'concentraciones_eliminarActividad':      result = concentraciones_eliminarActividad(payload); break;
      case 'concentraciones_generarConvocatoria':   result = concentraciones_generarConvocatoria(payload); break;
      case 'concentraciones_getTiposDocumento':     result = concentraciones_getTiposDocumento(); break;
      case 'concentraciones_validarDatosDocumentos':result = concentraciones_validarDatosDocumentos(payload); break;
      case 'concentraciones_generarDocumentos':     result = concentraciones_generarDocumentos(payload); break;
      case 'concentraciones_getDocumentosGenerados':result = concentraciones_getDocumentosGenerados(payload); break;

      // ── TESTEOS ──
      case 'testeos_getTesteos':         result = testeos_getTesteos(); break;
      case 'testeos_crearTesteo':        result = testeos_crearTesteo(payload); break;
      case 'testeos_agregarMedicion':    result = testeos_agregarMedicion(payload); break;
      case 'testeos_editarMedicion':     result = testeos_editarMedicion(payload); break;
      case 'testeos_eliminarMedicion':   result = testeos_eliminarMedicion(payload); break;

      // ── ANTIDOPING ──
      case 'antidoping_buscarMedicamento': result = antidoping_buscarMedicamento(payload); break;
      case 'antidoping_getFrecuentes':     result = antidoping_getFrecuentes(); break;
      case 'antidoping_getHistorial':      result = antidoping_getHistorial(); break;
      case 'antidoping_importarCatalogo':  result = antidoping_importarCatalogo(payload); break;
      case 'antidoping_importarWada':      result = antidoping_importarWada(payload); break;
      case 'antidoping_getBackendStatus':  result = antidoping_getBackendStatus(); break;
      case 'antidoping_guardarTUE':        result = ok(true, antidoping_guardarTUE(payload)); break;
      case 'antidoping_listarTUEs':        result = ok(true, antidoping_listarTUEs()); break;
      case 'importarWADA':
        result = ok(true, base_importarWADA(payload.rows || [], payload.modo || 'replace'));
        break;
      case 'getWADAStatus':
        result = ok(true, base_getWADAStatus());
        break;

      default:
        result = ok(false, null, 'Acción no reconocida: ' + action);
    }

    if (!result) {
      result = ok(false, null, 'Acción no reconocida: ' + action);
    }

    return result;

  } catch(err) {
    return ok(false, null, err.toString());
  }
}

function getColIndex(sheet, colName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  return headers.indexOf(colName) + 1; // 1-indexed; 0 si no existe
}

function parseJson(val) {
  if (!val) return null;
  try { return JSON.parse(val); } catch (_) { return null; }
}

// Devuelve el número de fila (1-indexed) donde idColName === idValue, o -1
function findRowIndex(sheet, idColName, idValue) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const col = data[0].map(String).indexOf(idColName);
  if (col === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col]) === String(idValue)) return i + 1;
  }
  return -1;
}

// Escribe un valor en la celda (fila, colName) de la hoja dada
function setCell(sheet, row, colName, value) {
  const col = getColIndex(sheet, colName);
  if (col === 0) return;
  sheet.getRange(row, col).setValue(value);
}

// Si la columna no existe en la hoja, la agrega al final con ese nombre como header
function ensureColumn_(sheet, colName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (headers.indexOf(colName) !== -1) return;
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue(colName);
}

// Obtiene o crea una subcarpeta por nombre dentro de una carpeta padre
function getOrCreateFolder_(parentId, nombre) {
  var parent = DriveApp.getFolderById(parentId);
  var iter = parent.getFoldersByName(nombre);
  return iter.hasNext() ? iter.next() : parent.createFolder(nombre);
}

// Convierte el rango de datos de una hoja en array de objetos usando la fila 1 como headers
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(String);
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// Devuelve la hoja por nombre; lanza si no existe
function getSheet(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Hoja no encontrada: ' + name);
  return sheet;
}

// Genera un UUID v4
function newId() {
  return Utilities.getUuid();
}

// ────────────────────────────────────────────────────────────────
// BASE — EXTENSIÓN
// ────────────────────────────────────────────────────────────────
//
// base_agregarColumna
// Agrega una columna nueva a la hoja Plantel sin tocar el código
// existente. Registra el schema en ColumnasDinamicas.
//
// Parámetros: { nombre, tipo, grupo }
// Tipos: texto | numero | fecha | boolean | lista
//
function base_agregarColumna(p) {
  if (!p.nombre) throw new Error('nombre es requerido');

  const plantelSheet = getSheet(SHEETS.plantel);
  const lastCol = plantelSheet.getLastColumn();
  const headers = plantelSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  if (headers.includes(p.nombre))
    throw new Error('Ya existe una columna con ese nombre: ' + p.nombre);

  // Agrega el header en Plantel; las filas existentes quedan con celda vacía
  plantelSheet.getRange(1, lastCol + 1).setValue(p.nombre);

  // Registra el schema en ColumnasDinamicas para que el frontend pueda
  // conocer los campos dinámicos y renderizarlos correctamente
  const schemaSheet = getSheet(SHEETS.columnasDinamicas);
  schemaSheet.appendRow([
    newId(),
    p.nombre,
    p.tipo  || 'texto',
    p.grupo || '',
    new Date().toISOString()
  ]);

  return ok(true, { nombre: p.nombre, tipo: p.tipo || 'texto', grupo: p.grupo || '' });
}


// ────────────────────────────────────────────────────────────────
// PENALES
// ────────────────────────────────────────────────────────────────
//
// Hoja SesionesPenales:
//   id | nombre | fecha | arquera | notas | timestamp
//
// Hoja Penales:
//   id | sesionId | jugadora | zona | potencia | resultado | timestamp
//   potencia: 'fuerte' | 'medio' | 'debil'
//   resultado: 'gol' | 'atajado' | 'afuera' | 'palo'
//   zona: '1'-'9' | 'palo-izq' | 'palo-der' | 'travesano' |
//         'fuera-izq' | 'fuera-arr' | 'fuera-der'
//

function penales_getSesiones() {
  return ok(true, sheetToObjects(getSheet(SHEETS.sesionesPenales)));
}

function penales_crearSesion(p) {
  if (!p.nombre || !p.fecha) throw new Error('nombre y fecha son requeridos');
  const id = newId();
  getSheet(SHEETS.sesionesPenales).appendRow([
    id, p.nombre, p.fecha, p.arquera || '', p.notas || '', new Date().toISOString()
  ]);
  return ok(true, { id });
}

function penales_editarSesion(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.sesionesPenales);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Sesión no encontrada');
  ['nombre', 'fecha', 'arquera', 'notas'].forEach(f => {
    if (p[f] !== undefined) setCell(sheet, row, f, p[f]);
  });
  return ok(true, { id: p.id });
}

// Si se omite sesionId devuelve todos los penales (útil para stats globales)
function penales_getPenales(p) {
  const all = sheetToObjects(getSheet(SHEETS.penales));
  const data = p.sesionId
    ? all.filter(r => String(r.sesionId) === String(p.sesionId))
    : all;
  return ok(true, data);
}

function penales_registrarPenal(p) {
  if (!p.sesionId || !p.jugadora) throw new Error('sesionId y jugadora son requeridos');
  const id = newId();
  getSheet(SHEETS.penales).appendRow([
    id, p.sesionId, p.jugadora,
    p.zona || '', p.potencia || '', p.resultado || '',
    new Date().toISOString()
  ]);
  return ok(true, { id });
}

function penales_eliminarPenal(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.penales);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Penal no encontrado');
  sheet.deleteRow(row);
  return ok(true, { id: p.id });
}


// ────────────────────────────────────────────────────────────────
// ================================================================
// HELPERS PARTIDOS
// ================================================================

function toNumber(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function safeJsonParse(val, fallback) {
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

// ================================================================
// PARTIDOS
// ================================================================

function partidos_getPartidos() {
  const rows = sheetToObjects(getSheet(SHEETS.partidos)).map(_parsePartido);
  return ok(true, rows);
}

function partidos_getDetalle(p) {
  if (!p.id) throw new Error('id es requerido');

  const row = sheetToObjects(getSheet(SHEETS.partidos))
    .find(r => String(r.id) === String(p.id));

  if (!row) throw new Error('Partido no encontrado');

  return ok(true, _parsePartido(row));
}

function _parsePartido(r) {
  return {
    ...r,
    goles_propios: toNumber(r.goles_propios),
    goles_rival: toNumber(r.goles_rival),
    tiros_propios: toNumber(r.tiros_propios),
    tiros_rival: toNumber(r.tiros_rival),
    corners_propios: toNumber(r.corners_propios),
    corners_rival: toNumber(r.corners_rival),
    faltas_propias: toNumber(r.faltas_propias),
    faltas_rival: toNumber(r.faltas_rival),
    goles_primer_tiempo: r.goles_primer_tiempo !== '' ? toNumber(r.goles_primer_tiempo) : null,

    convocadas: safeJsonParse(r.convocadas, []),
    ratings: safeJsonParse(r.ratings, {}),
    momentos: safeJsonParse(r.momentos, [])
  };
}

function partidos_crearPartido(p) {
  if (!p.rival || !p.fecha) {
    throw new Error('rival y fecha son requeridos');
  }

  const id = newId();

  getSheet(SHEETS.partidos).appendRow([
    id,
    p.rival,
    p.fecha,
    p.tipo || 'amistoso',
    p.nombre || '',
    toNumber(p.goles_propios),
    toNumber(p.goles_rival),
    toNumber(p.tiros_propios),
    toNumber(p.tiros_rival),
    toNumber(p.corners_propios),
    toNumber(p.corners_rival),
    toNumber(p.faltas_propias),
    toNumber(p.faltas_rival),
    p.goles_primer_tiempo !== undefined ? toNumber(p.goles_primer_tiempo) : '',
    p.formacion || '',
    p.sistema || '',
    p.notas || '',
    JSON.stringify([]),
    JSON.stringify({}),
    JSON.stringify([]),
    new Date().toISOString()
  ]);

  return ok(true, { id });
}

function partidos_actualizarPartido(p) {
  if (!p.id) throw new Error('id es requerido');

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  const campos = [
    'rival', 'fecha', 'tipo', 'nombre',
    'goles_propios', 'goles_rival',
    'tiros_propios', 'tiros_rival',
    'corners_propios', 'corners_rival',
    'faltas_propias', 'faltas_rival',
    'goles_primer_tiempo', 'notas'
  ];

  campos.forEach(f => {
    if (p[f] !== undefined) {
      const val = [
        'goles_propios','goles_rival','tiros_propios','tiros_rival',
        'corners_propios','corners_rival','faltas_propias','faltas_rival',
        'goles_primer_tiempo'
      ].includes(f)
        ? toNumber(p[f])
        : p[f];

      setCell(sheet, row, f, val);
    }
  });

  return ok(true, { id: p.id });
}

function partidos_eliminarPartido(p) {
  if (!p.id) throw new Error('id es requerido');

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  sheet.deleteRow(row);

  return ok(true, { id: p.id });
}

// ─────────────────────────────────────────
// CONVOCATORIA Y RATINGS
// ─────────────────────────────────────────

function partidos_guardarConvocatoria(p) {
  if (!p.id) throw new Error('id es requerido');

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  setCell(sheet, row, 'convocadas', JSON.stringify(p.convocadas || []));

  return ok(true, { id: p.id });
}

function partidos_guardarRatings(p) {
  if (!p.id) throw new Error('id es requerido');

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  setCell(sheet, row, 'ratings', JSON.stringify(p.ratings || {}));

  return ok(true, { id: p.id });
}

// ─────────────────────────────────────────
// MOMENTOS (CLAVE)
// ─────────────────────────────────────────

function partidos_agregarMomento(p) {
  if (!p.id || !p.tipo) {
    throw new Error('id y tipo son requeridos');
  }

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  const col = getColIndex(sheet, 'momentos');

  const lista = safeJsonParse(sheet.getRange(row, col).getValue(), []);

  const momento = {
    id: newId(),
    tipo: p.tipo,
    minuto: Number.isFinite(Number(p.minuto)) ? Number(p.minuto) : null,
    descripcion: p.descripcion || '',
    jugadora: p.jugadora || '',
    timestamp: new Date().toISOString()
  };

  lista.push(momento);

  lista.sort((a, b) => {
    const m1 = Number.isFinite(a.minuto) ? a.minuto : 999;
    const m2 = Number.isFinite(b.minuto) ? b.minuto : 999;
    return m1 - m2;
  });

  sheet.getRange(row, col).setValue(JSON.stringify(lista));

  return ok(true, momento);
}

function partidos_eliminarMomento(p) {
  if (!p.id || !p.momentoId) {
    throw new Error('id y momentoId son requeridos');
  }

  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);

  if (row === -1) throw new Error('Partido no encontrado');

  const col = getColIndex(sheet, 'momentos');

  const lista = safeJsonParse(sheet.getRange(row, col).getValue(), [])
    .filter(m => String(m.id) !== String(p.momentoId));

  sheet.getRange(row, col).setValue(JSON.stringify(lista));

  return ok(true, { momentoId: p.momentoId });
}

// ================================================================
// MÉTRICAS AUTOMÁTICAS DE PARTIDOS
// ================================================================

function partidos_getMetricas(p) {
  if (!p.id) throw new Error('id es requerido');

  const partido = sheetToObjects(getSheet(SHEETS.partidos))
    .find(r => String(r.id) === String(p.id));

  if (!partido) throw new Error('Partido no encontrado');

  const parsed = _parsePartido(partido);

  const metricas = {
    resumen: calcularResumenGeneral_(parsed),
    ofensivas: calcularMetricasOfensivas_(parsed),
    momentos: calcularDistribucionMomentos_(parsed),
    jugadoras: calcularImpactoJugadoras_(parsed)
  };

  return ok(true, metricas);
}

// ================================================================
// 1. RESUMEN GENERAL
// ================================================================

function calcularResumenGeneral_(p) {
  return {
    resultado: `${p.goles_propios} - ${p.goles_rival}`,
    diferencia_gol: p.goles_propios - p.goles_rival,
    total_tiros: p.tiros_propios,
    total_faltas: p.faltas_propias
  };
}

// ================================================================
// 2. MÉTRICAS OFENSIVAS
// ================================================================

function calcularMetricasOfensivas_(p) {
  const tiros = p.tiros_propios || 0;
  const goles = p.goles_propios || 0;

  const efectividad = tiros > 0
    ? (goles / tiros)
    : 0;

  return {
    goles: goles,
    tiros: tiros,
    efectividad_tiro: Number(efectividad.toFixed(2)),
    tiros_por_gol: goles > 0 ? Number((tiros / goles).toFixed(2)) : null
  };
}

// ================================================================
// 3. DISTRIBUCIÓN DE MOMENTOS
// ================================================================

function calcularDistribucionMomentos_(p) {
  const momentos = p.momentos || [];

  const franjas = {
    '0-10': 0,
    '11-20': 0,
    '21-30': 0,
    '31+': 0
  };

  momentos.forEach(m => {
    if (!Number.isFinite(m.minuto)) return;

    if (m.minuto <= 10) franjas['0-10']++;
    else if (m.minuto <= 20) franjas['11-20']++;
    else if (m.minuto <= 30) franjas['21-30']++;
    else franjas['31+']++;
  });

  return {
    total_momentos: momentos.length,
    distribucion: franjas
  };
}

// ================================================================
// 4. IMPACTO POR JUGADORA
// ================================================================

function calcularImpactoJugadoras_(p) {
  const momentos = p.momentos || [];
  const impacto = {};

  momentos.forEach(m => {
    if (!m.jugadora) return;

    if (!impacto[m.jugadora]) {
      impacto[m.jugadora] = {
        intervenciones: 0,
        goles: 0,
        acciones_clave: 0
      };
    }

    impacto[m.jugadora].intervenciones++;

    if (m.tipo === 'gol-propio') {
      impacto[m.jugadora].goles++;
    }

    if (['gol-propio', 'jugada', 'pelota-parada'].includes(m.tipo)) {
      impacto[m.jugadora].acciones_clave++;
    }
  });

  return impacto;
}

// ────────────────────────────────────────────────────────────────
// CONCENTRACIONES
// ────────────────────────────────────────────────────────────────
//
// Hoja Concentraciones:
//   id | nombre | fechaInicio | fechaFin | lugar | notas | timestamp
//
// Hoja ConcentracionDias:
//   id | concentracionId | fecha | notas | actividades | timestamp
//
//   actividades → JSON: [{ id, tipo, hora, descripcion, duracion, notas }, ...]
//   tipo actividad: 'entrenamiento' | 'charla_tactica' | 'partido' |
//                   'recuperacion' | 'medica' | 'libre' | 'otro'
//   hora: 'HH:MM' — se usa para ordenar las actividades del día
//

function concentraciones_getConcentraciones() {
  return ok(true, sheetToObjects(getSheet(SHEETS.concentraciones)));
}

function concentraciones_crearConcentracion(p) {
  if (!p.nombre || !p.fechaInicio) throw new Error('nombre y fechaInicio son requeridos');
  const id = newId();
  const sheet = getSheet(SHEETS.concentraciones);
  sheet.appendRow([id, p.nombre, p.fechaInicio, p.fechaFin || '', p.lugar || '', p.notas || '', new Date().toISOString()]);
  const row = findRowIndex(sheet, 'id', id);
  if (row !== -1) {
    ['direccion', 'ciudad', 'convocadas_json'].forEach(f => {
      if (p[f] !== undefined && p[f] !== '') { ensureColumn_(sheet, f); setCell(sheet, row, f, p[f]); }
    });
  }
  return ok(true, { id });
}

function concentraciones_editarConcentracion(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.concentraciones);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Concentración no encontrada');
  ['convocadas_json', 'direccion', 'ciudad'].forEach(f => {
    if (p[f] !== undefined) ensureColumn_(sheet, f);
  });
  ['nombre', 'fechaInicio', 'fechaFin', 'lugar', 'direccion', 'ciudad', 'notas', 'convocadas_json'].forEach(f => {
    if (p[f] !== undefined) setCell(sheet, row, f, p[f]);
  });
  return ok(true, { id: p.id });
}

// Elimina la concentración y todos sus días en cascada
function concentraciones_eliminarConcentracion(p) {
  if (!p.id) throw new Error('id es requerido');

  const concSheet = getSheet(SHEETS.concentraciones);
  const concRow = findRowIndex(concSheet, 'id', p.id);
  if (concRow === -1) throw new Error('Concentración no encontrada');
  concSheet.deleteRow(concRow);

  const diasSheet = getSheet(SHEETS.concentracionDias);
  const dias = sheetToObjects(diasSheet);
  // Eliminar en orden inverso para no correr los índices de fila
  dias
    .map((d, i) => ({ d, rowNum: i + 2 }))
    .filter(x => String(x.d.concentracionId) === String(p.id))
    .reverse()
    .forEach(x => diasSheet.deleteRow(x.rowNum));

  return ok(true, { id: p.id });
}

// Devuelve los días de una concentración con actividades parseadas
// Parámetros: { id }  (id de la concentración)
function concentraciones_getDias(p) {
  if (!p.id) throw new Error('id es requerido');
  const dias = sheetToObjects(getSheet(SHEETS.concentracionDias))
    .filter(r => String(r.concentracionId) === String(p.id))
    .map(r => ({ ...r, actividades: parseJson(r.actividades) || [] }));
  dias.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return ok(true, dias);
}

// Obtiene o crea la fila de día para (concentracionId, fecha)
function _getOrCreateDia(concentracionId, fecha) {
  const sheet = getSheet(SHEETS.concentracionDias);
  const all = sheetToObjects(sheet);
  const existing = all.find(
    r => String(r.concentracionId) === String(concentracionId)
      && String(r.fecha) === String(fecha)
  );
  if (existing) return { sheet, diaId: existing.id };

  const id = newId();
  sheet.appendRow([id, concentracionId, fecha, '', JSON.stringify([]), new Date().toISOString()]);
  return { sheet, diaId: id };
}

// Parámetros: { concentracionId, fecha, tipo, titulo?, hora?, detalle?, duracion?, notas? }
// titulo y descripcion son sinónimos; detalle y notas son sinónimos.
function concentraciones_agregarActividad(p) {
  if (!p.concentracionId || !p.fecha || !p.tipo)
    throw new Error('concentracionId, fecha y tipo son requeridos');

  const { sheet, diaId } = _getOrCreateDia(p.concentracionId, p.fecha);
  const diaRow = findRowIndex(sheet, 'id', diaId);
  const col = getColIndex(sheet, 'actividades');
  const lista = parseJson(sheet.getRange(diaRow, col).getValue()) || [];

  const actividad = {
    id:      newId(),
    tipo:    p.tipo,
    hora:    p.hora    || '',
    titulo:  p.titulo  || p.descripcion || '',
    notas:   p.detalle || p.notas       || '',
    duracion: p.duracion || '',
  };
  lista.push(actividad);
  lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  sheet.getRange(diaRow, col).setValue(JSON.stringify(lista));
  return ok(true, { ...actividad, diaId });
}

// Parámetros: { concentracionId, fecha, actividadId, tipo?, hora?, titulo?, detalle?, duracion?, notas? }
function concentraciones_editarActividad(p) {
  if (!p.concentracionId || !p.fecha || !p.actividadId)
    throw new Error('concentracionId, fecha y actividadId son requeridos');

  const sheet = getSheet(SHEETS.concentracionDias);
  const diaRow = sheetToObjects(sheet).find(
    r => String(r.concentracionId) === String(p.concentracionId)
      && String(r.fecha) === String(p.fecha)
  );
  if (!diaRow) throw new Error('Día no encontrado');

  const rowIndex = findRowIndex(sheet, 'id', diaRow.id);
  const col = getColIndex(sheet, 'actividades');
  const lista = parseJson(sheet.getRange(rowIndex, col).getValue()) || [];
  const idx = lista.findIndex(a => String(a.id) === String(p.actividadId));
  if (idx === -1) throw new Error('Actividad no encontrada');

  ['tipo', 'hora', 'duracion', 'notas'].forEach(f => {
    if (p[f] !== undefined) lista[idx][f] = p[f];
  });
  if (p.titulo !== undefined)    lista[idx].titulo = p.titulo;
  else if (p.descripcion !== undefined) lista[idx].titulo = p.descripcion;
  if (p.detalle !== undefined)   lista[idx].notas  = p.detalle;
  lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  sheet.getRange(rowIndex, col).setValue(JSON.stringify(lista));
  return ok(true, { actividadId: p.actividadId });
}

// Parámetros: { actividadId, concentracionId? }
// No requiere fecha: escanea todos los días de la concentración para localizar la actividad.
function concentraciones_eliminarActividad(p) {
  const actId  = p.actividadId || p.id;
  const concId = p.concentracionId || p.concentracion_id;
  if (!actId) throw new Error('actividadId es requerido');

  const sheet = getSheet(SHEETS.concentracionDias);
  const dias   = sheetToObjects(sheet);
  const col    = getColIndex(sheet, 'actividades');

  for (var i = 0; i < dias.length; i++) {
    if (concId && String(dias[i].concentracionId) !== String(concId)) continue;
    const lista = parseJson(dias[i].actividades) || [];
    const idx   = lista.findIndex(function(a) { return String(a.id) === String(actId); });
    if (idx === -1) continue;
    lista.splice(idx, 1);
    sheet.getRange(i + 2, col).setValue(JSON.stringify(lista));
    return ok(true, { actividadId: actId });
  }
  throw new Error('Actividad no encontrada');
}


// Genera una copia de la plantilla de convocatoria con los datos reales
// Parámetros: { concentracionId }
// Placeholders en el template:
//   {{FECHA_EMISION}} {{LUGAR}} {{DIRECCION_LUGAR}} {{CIUDAD}}
//   {{FECHA_INICIO_TEXTO}} {{FECHA_FIN_TEXTO}} {{TABLA_CONVOCADAS}}
function concentraciones_generarConvocatoria(p) {
  return concentraciones_generarDocumentos({
    ...p,
    tiposDocumento: ['convocatoria_fadec']
  });
}

function concentraciones_getTiposDocumento() {
  return ok(true, _tiposDocumentoConcentraciones());
}

function concentraciones_validarDatosDocumentos(p) {
  return ok(true, _validarDatosDocumentosConcentracion(p));
}

function concentraciones_getDocumentosGenerados(p) {
  var sheet = _ensureHojaDocumentosGenerados();
  var all = sheetToObjects(sheet);
  var concId = p && (p.concentracionId || p.id);
  var data = concId ? all.filter(function(d) { return String(d.concentracionId) === String(concId); }) : all;
  return ok(true, data);
}

function concentraciones_generarDocumentos(p) {
  var conc = _getConcentracionParaDocumentos(p);
  if (!conc) throw new Error('Concentración no encontrada');

  var tipos = _normalizarTiposDocumento(p.tiposDocumento || p.tipoDocumento || p.tipos_documento || (p.tipoDocumento ? [p.tipoDocumento] : []));
  if (!tipos.length) tipos = ['convocatoria_fadec'];
  var tiposCfg = _tiposDocumentoConcentraciones();
  var tiposMap = {};
  tiposCfg.forEach(function(cfg) { tiposMap[cfg.clave] = cfg; });

  var validacion = _validarDatosDocumentosConcentracion({
    ...p,
    concentracionId: conc.id,
    tiposDocumento: tipos
  });

  var plantel = sheetToObjects(getSheet(SHEETS.plantel));
  var convocadas = _convocadasConcentracion(conc, p);
  var fechaEmision = formatFechaTextoGas_(new Date());
  var fechaInicio = formatFechaTextoGas_(conc.fechaInicio);
  var fechaFin = conc.fechaFin ? formatFechaTextoGas_(conc.fechaFin) : fechaInicio;
  var lugar = String(conc.lugar || conc.nombre || '').trim();
  var direccion = String(conc.direccion || '').trim();
  var ciudad = String(conc.ciudad || '').trim();
  var tipoActividad = String(p.tipoActividad || p.tipo || conc.tipoActividad || conc.tipo || 'la concentración').trim();
  var baseCtx = {
    fechaEmision: fechaEmision,
    fechaInicio: fechaInicio,
    fechaFin: fechaFin,
    lugar: lugar,
    direccion: direccion,
    ciudad: ciudad,
    tipoActividad: tipoActividad,
    conc: conc,
    convocadas: convocadas,
    plantel: plantel
  };

  var documentos = [];
  tipos.forEach(function(tipo) {
    var cfg = tiposMap[tipo];
    var faltantesGlobales = _faltantesGlobalesDocumento_(cfg, conc, convocadas);
    if (cfg && cfg.requierePersona) {
      var personas = _resolverPersonasDocumento_(tipo, plantel, convocadas);
      if (!personas.length) {
        documentos.push({
          concentracionId: conc.id,
          tipoDocumento: tipo,
          nombre: _nombreDocumentoConcentraciones(tipo, conc),
          url: '',
          estado: 'error',
          error: 'No hay personas configuradas para este documento',
          faltantes: validacion ? validacion.faltantes : [],
          convocadas: convocadas,
          plantillaId: cfg.plantillaId || '',
          carpetaId: cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS
        });
        return;
      }
      personas.forEach(function(persona) {
        var faltantesPersona = faltantesGlobales.concat(_filtrarFaltantesPorTipoPersona_(validacion, tipo, persona));
        if (faltantesPersona.length) {
          var nombrePendiente = _nombreDocumentoConcentraciones(tipo, conc, persona);
          documentos.push({
            concentracionId: conc.id,
            tipoDocumento: tipo,
            nombre: nombrePendiente,
            url: '',
            estado: 'error',
            error: 'Faltan datos obligatorios: ' + faltantesPersona.join(', '),
            faltantes: faltantesPersona,
            convocadas: convocadas,
            plantillaId: cfg.plantillaId || '',
            carpetaId: cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
            persona: {
              clave: persona.clave || '',
              nombre: persona.nombreCompleto || ''
            }
          });
          _registrarDocumentoGenerado_(conc.id, tipo, nombrePendiente, '', 'error', 'Faltan datos obligatorios: ' + faltantesPersona.join(', '));
          return;
        }
        documentos.push(_intentarGeneracionDocumentoConcentracion_({
          tipo: tipo,
          cfg: cfg,
          conc: conc,
          persona: persona,
          convocadas: convocadas,
          plantel: plantel,
          validacion: validacion,
          baseCtx: baseCtx
        }));
      });
      return;
    }
    var faltantesTipo = faltantesGlobales.concat(_filtrarFaltantesPorTipoPersona_(validacion, tipo, null));
    if (faltantesTipo.length) {
      var nombrePendienteTipo = _nombreDocumentoConcentraciones(tipo, conc);
      documentos.push({
        concentracionId: conc.id,
        tipoDocumento: tipo,
        nombre: nombrePendienteTipo,
        url: '',
        estado: 'error',
        error: 'Faltan datos obligatorios: ' + faltantesTipo.join(', '),
        faltantes: faltantesTipo,
        convocadas: convocadas,
        plantillaId: cfg && cfg.plantillaId ? cfg.plantillaId : '',
        carpetaId: cfg && cfg.carpetaId ? cfg.carpetaId : CONFIG_DOC.CARPETA_GENERADOS
      });
      _registrarDocumentoGenerado_(conc.id, tipo, nombrePendienteTipo, '', 'error', 'Faltan datos obligatorios: ' + faltantesTipo.join(', '));
      return;
    }
    documentos.push(_intentarGeneracionDocumentoConcentracion_({
      tipo: tipo,
      cfg: cfg,
      conc: conc,
      convocadas: convocadas,
      plantel: plantel,
      validacion: validacion,
      baseCtx: baseCtx
    }));
  });

  var primerDoc = documentos.find(function(d) { return d.url; });
  var primerUrl = primerDoc ? primerDoc.url : '';
  return ok(true, {
    concentracionId: conc.id,
    url: primerUrl,
    documentUrl: primerUrl,
    pdfUrl: primerUrl,
    documentos: documentos,
    validacion: validacion
  });
}

function _filtrarFaltantesPorTipoPersona_(validacion, tipo, persona) {
  if (!validacion || !Array.isArray(validacion.faltantes)) return [];
  var prefijo = String(tipo || '') + ':';
  var out = [];

  validacion.faltantes.forEach(function(f) {
    var item = String(f || '').trim();
    if (!item || item.indexOf(prefijo) !== 0) return;
    if (!persona && item.split(':').length > 2) return;
    var limpio = item.replace(prefijo, '');
    if (persona && limpio.indexOf(':') !== -1) limpio = limpio.split(':')[0];
    out.push(limpio);
  });

  return Array.from(new Set(out));
}

function _faltantesGlobalesDocumento_(cfg, conc, convocadas) {
  var out = [];
  if (!cfg) return ['tipo no configurado'];
  if (cfg.requiereNombre && !(conc && conc.nombre)) out.push('nombre');
  if (cfg.requiereFecha && !(conc && conc.fechaInicio)) out.push('fechaInicio');
  if (cfg.requiereConvocadas && (!Array.isArray(convocadas) || !convocadas.length)) out.push('convocadas');
  return out;
}

function _tiposDocumentoConcentraciones() {
  var rows = _leerConfigDocumentos_();
  return rows.map(function(row) {
    var clave = String(row.tipo_documento || row.clave || '').trim();
    var resolved = _resolverPlantillaDocumento_(clave, { searchDrive: false });
    return {
      clave: clave,
      nombre: String(row.nombre_visible || row.nombre || clave).trim() || clave,
      plantillaId: String(row.template_id || row.plantillaId || resolved.plantillaId || '').trim(),
      carpetaId: String(row.carpeta_id || row.carpetaId || resolved.carpetaId || CONFIG_DOC.CARPETA_GENERADOS).trim(),
      tipoSalida: String(row.tipo_salida || row.tipoSalida || 'colectivo').trim() || 'colectivo',
      descripcion: String(row.descripcion || '').trim(),
      requiereNombre: _boolDocConfig_(row.requiere_nombre, true),
      requiereFecha: _boolDocConfig_(row.requiere_fecha, true),
      requiereConvocadas: _boolDocConfig_(row.requiere_convocadas, clave === 'convocatoria_fadec' || clave === 'certificacion_participacion'),
      requiereTablaConvocadas: _boolDocConfig_(row.requiere_tabla_convocadas, clave === 'convocatoria_fadec' || clave === 'certificacion_participacion'),
      requierePersona: _boolDocConfig_(row.requiere_persona, false),
      activo: _boolDocConfig_(row.activo, true)
    };
  }).filter(function(cfg) { return cfg.clave && cfg.activo; });
}

function _normalizarTiposDocumento(v) {
  var arr = Array.isArray(v) ? v : (v ? [v] : []);
  return arr.map(function(x) { return String(x || '').trim(); }).filter(Boolean);
}

function _getConcentracionParaDocumentos(p) {
  var id = p && (p.concentracionId || p.id);
  if (!id) return null;
  var conc = sheetToObjects(getSheet(SHEETS.concentraciones)).find(function(r) { return String(r.id) === String(id); });
  if (!conc) return null;
  return {
    ...conc,
    id: conc.id,
    nombre: conc.nombre || '',
    fechaInicio: conc.fechaInicio || conc.fecha_inicio || '',
    fechaFin: conc.fechaFin || conc.fecha_fin || '',
    lugar: conc.lugar || '',
    direccion: conc.direccion || '',
    ciudad: conc.ciudad || '',
    notas: conc.notas || '',
    convocadas_json: conc.convocadas_json || conc.convocadasJson || conc.convocadas || '[]'
  };
}

function _convocadasConcentracion(conc, p) {
  var raw = (p && (p.convocadas_json || p.convocadasJson || p.convocadas)) || (conc && (conc.convocadas_json || conc.convocadasJson || conc.convocadas)) || '[]';
  var parsed = parseJson(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function _validarDatosDocumentosConcentracion(p) {
  var conc = _getConcentracionParaDocumentos(p);
  var tipos = _normalizarTiposDocumento(p.tiposDocumento || p.tipoDocumento || p.tipos_documento || []);
  var convocadas = _convocadasConcentracion(conc, p);
  var plantel = sheetToObjects(getSheet(SHEETS.plantel));
  var faltantes = [];
  if (!conc) faltantes.push('concentracion');
  if (tipos.indexOf('convocatoria_fadec') > -1 && !convocadas.length) faltantes.push('convocadas');

  tipos.forEach(function(tipo) {
    var cfg = _tiposDocumentoConcentraciones().find(function(t) { return t.clave === tipo; });
    if (!cfg) faltantes.push('tipo:' + tipo);
    if (cfg && cfg.requiereNombre && !(conc && conc.nombre)) faltantes.push('nombre');
    if (cfg && cfg.requiereFecha && !(conc && conc.fechaInicio)) faltantes.push('fechaInicio');
    if (cfg && cfg.requiereConvocadas && !convocadas.length) faltantes.push('convocadas');
    if (!cfg) return;

    var personas = cfg.requierePersona ? _resolverPersonasDocumento_(tipo, plantel, convocadas) : [null];
    if (cfg.requierePersona && !personas.length) faltantes.push('personas:' + tipo);

    personas.forEach(function(persona) {
      var obligatorios = _placeholdersDocumentoPorTipo_(tipo).filter(function(ph) { return _boolDocConfig_(ph.obligatorio, false); });
      obligatorios.forEach(function(ph) {
        var valor = _resolverValorPlaceholderDocumento_(ph, {
          tipo: tipo,
          conc: conc,
          plantel: plantel,
          convocadas: convocadas,
          persona: persona
        });
        if (String(valor || '').trim() !== '') return;
        var sufijoPersona = persona ? ':' + (persona.nombreCompleto || persona.clave || 'persona') : '';
        faltantes.push(tipo + ':' + ph.placeholder + sufijoPersona);
      });
    });
  });

  return {
    concentracionId: conc ? conc.id : (p.concentracionId || p.id || ''),
    tiposDocumento: tipos,
    convocadas: convocadas,
    faltantes: Array.from(new Set(faltantes)),
    valido: faltantes.length === 0
  };
}

function _generarDocumentoConcentracion_(ctx) {
  var cfg = ctx.cfg || _tiposDocumentoConcentraciones().find(function(t) { return t.clave === ctx.tipo; });
  if (!cfg) throw new Error('Tipo de documento no reconocido: ' + ctx.tipo);
  if (!cfg.plantillaId) {
    var resolved = _resolverPlantillaDocumento_(ctx.tipo, { searchDrive: true });
    cfg = {
      ...cfg,
      plantillaId: resolved.plantillaId || cfg.plantillaId || '',
      carpetaId: resolved.carpetaId || cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS
    };
  }
  if (!cfg.plantillaId) throw new Error('No hay plantilla configurada para ' + cfg.nombre);

  var nombre = _nombreDocumentoConcentraciones(ctx.tipo, ctx.conc, ctx.persona);
  var plantilla = DriveApp.getFileById(cfg.plantillaId);
  var carpeta = getOrCreateFolder_(cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS, 'Documentos Generados');
  var copia = plantilla.makeCopy(nombre, carpeta);
  var doc = DocumentApp.openById(copia.getId());
  var body = doc.getBody();
  var urlDoc = copia.getUrl ? copia.getUrl() : '';
  if (!urlDoc) urlDoc = 'https://docs.google.com/document/d/' + copia.getId() + '/edit';

  var reemplazos = _reemplazosDocumentoConcentracion_({
    tipo: ctx.tipo,
    conc: ctx.conc,
    persona: ctx.persona || null,
    plantel: ctx.plantel || [],
    convocadas: ctx.convocadas || [],
    baseCtx: ctx.baseCtx || {}
  });

  _aplicarReemplazosDocumentoConcentracion_(body, reemplazos, ctx.tipo, ctx.convocadas, ctx.plantel);
  doc.saveAndClose();

  var estado = 'generado';
  if (ctx.validacion && !ctx.validacion.valido) estado = 'pendiente';

  _registrarDocumentoGenerado_(ctx.conc.id, ctx.tipo, nombre, urlDoc, estado, ctx.validacion ? ctx.validacion.faltantes.join(', ') : '');

  return {
    concentracionId: ctx.conc.id,
    tipoDocumento: ctx.tipo,
    nombre: nombre,
    url: urlDoc,
    documentUrl: urlDoc,
    pdfUrl: urlDoc,
    estado: estado,
    faltantes: ctx.validacion ? ctx.validacion.faltantes : [],
    convocadas: ctx.convocadas,
    plantillaId: cfg.plantillaId || '',
    carpetaId: cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
    persona: ctx.persona ? {
      clave: ctx.persona.clave || '',
      nombre: ctx.persona.nombreCompleto || ''
    } : null
  };
}

function _reemplazosDocumentoConcentracion_(data) {
  var placeholders = _placeholdersDocumentoPorTipo_(data.tipo);
  var reemplazos = {};
  placeholders.forEach(function(ph) {
    reemplazos[ph.placeholder] = _resolverValorPlaceholderDocumento_(ph, data);
  });
  return reemplazos;
}

function _aplicarReemplazosDocumentoConcentracion_(body, reemplazos, tipo, convocadas, plantel) {
  Object.keys(reemplazos).forEach(function(clave) {
    if ((tipo === 'convocatoria_fadec' || tipo === 'certificacion_participacion') && clave === '{{TABLA_CONVOCADAS}}') return;
    body.replaceText(_escapeRegexDocumento_(clave), reemplazos[clave]);
  });
  if (tipo === 'convocatoria_fadec' || tipo === 'certificacion_participacion') {
    _insertarTablaConvocatoria_(body, _armarConvocatoriaParticipantes_(plantel || [], convocadas || []));
  } else {
    body.replaceText(_escapeRegexDocumento_('{{TABLA_CONVOCADAS}}'), '');
  }
}

function _escapeRegexDocumento_(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _tablaConvocadasTexto_(participantes) {
  if (!participantes.length) return '(Sin convocadas)';
  return participantes.map(function(p) {
    return [p.nombre, p.dni, p.provincia].filter(function(v) { return String(v || '').trim() !== ''; }).join(' | ');
  }).join('\n');
}

function _registrarDocumentoGenerado_(concentracionId, tipoDocumento, nombre, url, estado, error) {
  var sheet = _ensureHojaDocumentosGenerados();
  sheet.appendRow([newId(), concentracionId, tipoDocumento, nombre, url, estado, error || '', new Date().toISOString()]);
}

function _intentarGeneracionDocumentoConcentracion_(ctx) {
  try {
    return _generarDocumentoConcentracion_(ctx);
  } catch (err) {
    var errorMsg = err && err.message ? err.message : String(err);
    var nombre = _nombreDocumentoConcentraciones(ctx.tipo, ctx.conc, ctx.persona);
    _registrarDocumentoGenerado_(ctx.conc.id, ctx.tipo, nombre, '', 'error', errorMsg);
    return {
      concentracionId: ctx.conc.id,
      tipoDocumento: ctx.tipo,
      nombre: nombre,
      url: '',
      estado: 'error',
      error: errorMsg,
      faltantes: ctx.validacion ? ctx.validacion.faltantes : [],
      convocadas: ctx.convocadas || [],
      plantillaId: ctx.cfg && ctx.cfg.plantillaId ? ctx.cfg.plantillaId : '',
      carpetaId: ctx.cfg && ctx.cfg.carpetaId ? ctx.cfg.carpetaId : '',
      persona: ctx.persona ? {
        clave: ctx.persona.clave || '',
        nombre: ctx.persona.nombreCompleto || ''
      } : null
    };
  }
}

function _ensureHojaDocumentosGenerados() {
  var sheet = tryGetSheet(SHEETS.documentosGenerados);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(SHEETS.documentosGenerados);
    sheet.appendRow(['id', 'concentracionId', 'tipoDocumento', 'nombre', 'url', 'estado', 'error', 'timestamp']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _ensureConfiguracionDocumentos_() {
  _ensureHojaConfigDocumentos_();
  _ensureHojaConfigDocPlaceholders_();
  _ensureHojaConfigDocPersonas_();
}

function _ensureHojaConfigDocumentos_() {
  var sheet = tryGetSheet(SHEETS.configDocumentos);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(SHEETS.configDocumentos);
  }
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(['tipo_documento', 'nombre_visible', 'template_id', 'carpeta_id', 'tipo_salida', 'activo', 'requiere_persona', 'requiere_nombre', 'requiere_fecha', 'requiere_convocadas', 'requiere_tabla_convocadas', 'descripcion']);
    _defaultDocumentDefinitions_().forEach(function(row) {
      sheet.appendRow([row.tipo_documento, row.nombre_visible, row.template_id, row.carpeta_id, row.tipo_salida, row.activo, row.requiere_persona, row.requiere_nombre, row.requiere_fecha, row.requiere_convocadas, row.requiere_tabla_convocadas, row.descripcion]);
    });
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _ensureHojaConfigDocPlaceholders_() {
  var sheet = tryGetSheet(SHEETS.configDocPlaceholders);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(SHEETS.configDocPlaceholders);
  }
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(['tipo_documento', 'placeholder', 'fuente', 'campo', 'formato', 'obligatorio', 'valor_fijo', 'notas']);
    _defaultDocumentPlaceholders_().forEach(function(row) {
      sheet.appendRow([row.tipo_documento, row.placeholder, row.fuente, row.campo, row.formato, row.obligatorio, row.valor_fijo, row.notas]);
    });
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _ensureHojaConfigDocPersonas_() {
  var sheet = tryGetSheet(SHEETS.configDocPersonas);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(SHEETS.configDocPersonas);
  }
  if (sheet.getLastRow() < 1) {
    sheet.appendRow(['clave_persona', 'activo', 'orden', 'nombres_match', 'apellidos_match', 'dni', 'nombre_completo', 'autoridad_institucion', 'destinatario_nombre', 'rol_evento', 'cargo_administrativo', 'notas']);
    _defaultDocumentPeople_().forEach(function(row) {
      sheet.appendRow([row.clave_persona, row.activo, row.orden, row.nombres_match, row.apellidos_match, row.dni, row.nombre_completo, row.autoridad_institucion, row.destinatario_nombre, row.rol_evento, row.cargo_administrativo, row.notas]);
    });
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _leerConfigDocumentos_() {
  _ensureConfiguracionDocumentos_();
  return sheetToObjects(getSheet(SHEETS.configDocumentos));
}

function _leerConfigDocPlaceholders_() {
  _ensureConfiguracionDocumentos_();
  return sheetToObjects(getSheet(SHEETS.configDocPlaceholders));
}

function _leerConfigDocPersonas_() {
  _ensureConfiguracionDocumentos_();
  return sheetToObjects(getSheet(SHEETS.configDocPersonas));
}

function _defaultDocumentDefinitions_() {
  return [
    {
      tipo_documento: 'convocatoria_fadec',
      nombre_visible: 'Convocatoria oficial FADeC',
      template_id: CONFIG_DOC.PLANTILLA_CONVOCATORIA,
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'colectivo',
      activo: true,
      requiere_persona: false,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: true,
      requiere_tabla_convocadas: true,
      descripcion: 'Documento colectivo para toda la convocatoria'
    },
    {
      tipo_documento: 'certificacion_participacion',
      nombre_visible: 'Certificación de participación',
      template_id: '',
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'colectivo',
      activo: true,
      requiere_persona: false,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: true,
      requiere_tabla_convocadas: true,
      descripcion: 'Documento colectivo para toda la convocatoria'
    },
    {
      tipo_documento: 'licencia_agencia_cordoba',
      nombre_visible: 'Licencia deportiva — Agencia Córdoba Deportes',
      template_id: '',
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'individual',
      activo: true,
      requiere_persona: true,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: false,
      requiere_tabla_convocadas: false,
      descripcion: 'Formulario individual para solicitud ante Agencia Córdoba Deportes'
    },
    {
      tipo_documento: 'licencia_municipalidad_cordoba',
      nombre_visible: 'Solicitud de licencia — Municipalidad de Córdoba',
      template_id: '',
      carpeta_id: CONFIG_DOC.CARPETA_GENERADOS,
      tipo_salida: 'individual_compuesto',
      activo: true,
      requiere_persona: true,
      requiere_nombre: true,
      requiere_fecha: true,
      requiere_convocadas: false,
      requiere_tabla_convocadas: false,
      descripcion: 'Paquete individual con nota del agente y nota de elevación'
    }
  ];
}

function _defaultDocumentPlaceholders_() {
  return [
    ['convocatoria_fadec','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['convocatoria_fadec','{{LUGAR}}','concentracion','lugar','texto',true,'',''],
    ['convocatoria_fadec','{{DIRECCION_LUGAR}}','concentracion','direccion','texto',false,'',''],
    ['convocatoria_fadec','{{CIUDAD}}','concentracion','ciudad','texto',false,'',''],
    ['convocatoria_fadec','{{FECHA_INICIO_TEXTO}}','concentracion','fecha_inicio','texto',true,'',''],
    ['convocatoria_fadec','{{FECHA_FIN_TEXTO}}','concentracion','fecha_fin','texto',true,'',''],
    ['convocatoria_fadec','{{TIPO_ACTIVIDAD}}','concentracion','tipo_actividad','texto',false,'',''],
    ['convocatoria_fadec','{{NOMBRE_CONCENTRACION}}','concentracion','nombre','texto',true,'',''],
    ['convocatoria_fadec','{{CONCENTRACION_NOMBRE}}','concentracion','nombre','texto',true,'',''],
    ['convocatoria_fadec','{{TABLA_CONVOCADAS}}','concentracion','tabla_convocadas','tabla',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_TEXTO}}','concentracion','tabla_convocadas','texto',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_CANTIDAD}}','concentracion','convocadas_cantidad','numero',true,'',''],
    ['convocatoria_fadec','{{CONVOCADAS_NOMBRES}}','concentracion','convocadas_nombres','texto',true,'',''],
    ['certificacion_participacion','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['certificacion_participacion','{{LUGAR}}','concentracion','lugar','texto',true,'',''],
    ['certificacion_participacion','{{DIRECCION_LUGAR}}','concentracion','direccion','texto',false,'',''],
    ['certificacion_participacion','{{CIUDAD}}','concentracion','ciudad','texto',false,'',''],
    ['certificacion_participacion','{{FECHA_INICIO_TEXTO}}','concentracion','fecha_inicio','texto',true,'',''],
    ['certificacion_participacion','{{FECHA_FIN_TEXTO}}','concentracion','fecha_fin','texto',true,'',''],
    ['certificacion_participacion','{{TIPO_ACTIVIDAD}}','concentracion','tipo_actividad','texto',false,'',''],
    ['certificacion_participacion','{{NOMBRE_CONCENTRACION}}','concentracion','nombre','texto',true,'',''],
    ['certificacion_participacion','{{CONCENTRACION_NOMBRE}}','concentracion','nombre','texto',true,'',''],
    ['certificacion_participacion','{{TABLA_CONVOCADAS}}','concentracion','tabla_convocadas','tabla',true,'',''],
    ['certificacion_participacion','{{CONVOCADAS_TEXTO}}','concentracion','tabla_convocadas','texto',true,'',''],
    ['certificacion_participacion','{{CONVOCADAS_CANTIDAD}}','concentracion','convocadas_cantidad','numero',true,'',''],
    ['certificacion_participacion','{{CONVOCADAS_NOMBRES}}','concentracion','convocadas_nombres','texto',true,'',''],
    ['licencia_agencia_cordoba','{{AUTORIDAD_INSTITUCION}}','persona','autoridad_institucion','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_agencia_cordoba','{{NOMBRE_COMPLETO}}','persona','nombre_completo','texto',true,'',''],
    ['licencia_agencia_cordoba','{{DNI}}','persona','dni','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_NACIMIENTO}}','persona','fecha_nacimiento','fecha_corta_anio',true,'',''],
    ['licencia_agencia_cordoba','{{FEDERACION_CONVOCANTE}}','fijo','federacion_convocante','texto',true,'FADeC','Editable si cambia la entidad convocante'],
    ['licencia_agencia_cordoba','{{NOMBRE_EVENTO}}','concentracion','nombre','texto',true,'',''],
    ['licencia_agencia_cordoba','{{ROL_EVENTO}}','persona','rol_evento','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_agencia_cordoba','{{LUGAR_EVENTO}}','concentracion','lugar_evento','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_SALIDA}}','concentracion','fecha_inicio','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_REGRESO}}','concentracion','fecha_fin','texto',true,'',''],
    ['licencia_agencia_cordoba','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_EMISION}}','sistema','fecha_emision','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{DESTINATARIO_NOMBRE}}','persona','destinatario_nombre','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{NOMBRE_EVENTO}}','concentracion','nombre','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_INICIO_CORTA}}','concentracion','fecha_inicio','fecha_corta',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_FIN_CORTA}}','concentracion','fecha_fin','fecha_corta',true,'',''],
    ['licencia_municipalidad_cordoba','{{LUGAR_EVENTO}}','concentracion','lugar_evento','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{CIUDAD_EVENTO}}','concentracion','ciudad','texto',false,'',''],
    ['licencia_municipalidad_cordoba','{{FEDERACION_CONVOCANTE}}','fijo','federacion_convocante','texto',true,'FADeC','Editable si cambia la entidad convocante'],
    ['licencia_municipalidad_cordoba','{{ROL_EVENTO}}','persona','rol_evento','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{AGENTE_APELLIDO_NOMBRE_MAYUS}}','persona','apellido_nombre_mayus','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{DNI}}','persona','dni','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{CARGO_ADMINISTRATIVO}}','persona','cargo_administrativo','texto',true,'','Completar en Config_Doc_Personas'],
    ['licencia_municipalidad_cordoba','{{FECHA_INICIO_CORTA_ANIO}}','concentracion','fecha_inicio','fecha_corta_anio',true,'',''],
    ['licencia_municipalidad_cordoba','{{FECHA_FIN_CORTA_ANIO}}','concentracion','fecha_fin','fecha_corta_anio',true,'',''],
    ['licencia_municipalidad_cordoba','{{AGENTE_NOMBRE_COMPLETO}}','persona','nombre_completo','texto',true,'',''],
    ['licencia_municipalidad_cordoba','{{AGENTE_APELLIDO_NOMBRE}}','persona','apellido_nombre','texto',true,'','']
  ].map(function(r) {
    return {
      tipo_documento: r[0],
      placeholder: r[1],
      fuente: r[2],
      campo: r[3],
      formato: r[4],
      obligatorio: r[5],
      valor_fijo: r[6],
      notas: r[7]
    };
  });
}

function _defaultDocumentPeople_() {
  return [
    {
      clave_persona: 'santiago_jugo',
      activo: true,
      orden: 1,
      nombres_match: 'Santiago',
      apellidos_match: 'Jugo',
      dni: '',
      nombre_completo: '',
      autoridad_institucion: '',
      destinatario_nombre: '',
      rol_evento: '',
      cargo_administrativo: '',
      notas: 'Completar campos administrativos para documentos personales'
    },
    {
      clave_persona: 'gonzalo_abbas_hachache',
      activo: true,
      orden: 2,
      nombres_match: 'Gonzalo',
      apellidos_match: 'Abbas Hachache',
      dni: '',
      nombre_completo: '',
      autoridad_institucion: '',
      destinatario_nombre: '',
      rol_evento: '',
      cargo_administrativo: '',
      notas: 'Completar campos administrativos para documentos personales'
    }
  ];
}

function _boolDocConfig_(value, fallback) {
  if (value === true || value === false) return value;
  if (value === '' || value === null || value === undefined) return !!fallback;
  var txt = String(value).trim().toLowerCase();
  if (!txt) return !!fallback;
  if (txt === 'true' || txt === 'verdadero' || txt === 'si' || txt === 'sí' || txt === '1') return true;
  if (txt === 'false' || txt === 'falso' || txt === 'no' || txt === '0') return false;
  return !!fallback;
}

function _placeholdersDocumentoPorTipo_(tipo) {
  return _leerConfigDocPlaceholders_().filter(function(row) {
    return String(row.tipo_documento || '').trim() === String(tipo || '').trim();
  }).map(function(row) {
    return {
      tipo_documento: String(row.tipo_documento || '').trim(),
      placeholder: String(row.placeholder || '').trim(),
      fuente: String(row.fuente || '').trim().toLowerCase(),
      campo: String(row.campo || '').trim(),
      formato: String(row.formato || '').trim().toLowerCase(),
      obligatorio: _boolDocConfig_(row.obligatorio, false),
      valor_fijo: row.valor_fijo === undefined || row.valor_fijo === null ? '' : String(row.valor_fijo),
      notas: String(row.notas || '').trim()
    };
  }).filter(function(row) { return row.placeholder; });
}

function _resolverPersonasDocumento_(tipo, plantel, convDnis) {
  var configs = _leerConfigDocPersonas_().filter(function(row) { return _boolDocConfig_(row.activo, true); });
  var permitidos = Array.isArray(convDnis) ? convDnis.map(normalizarDNI_) : [];
  return configs.map(function(row) {
    var persona = _resolverPersonaDocumentoDesdePlantel_(row, plantel || []);
    if (!persona && permitidos.length && row.dni && permitidos.indexOf(normalizarDNI_(row.dni)) === -1) return null;
    return persona || _normalizarPersonaDocumento_(row, null);
  }).filter(Boolean).sort(function(a, b) {
    return (a.orden || 999) - (b.orden || 999);
  });
}

function _resolverPersonaDocumentoDesdePlantel_(row, plantel) {
  var dniCfg = normalizarDNI_(row.dni || '');
  var nombresNeedle = _normalizarTextoSinAcentos_(row.nombres_match || row.nombre_completo || '');
  var apellidosNeedle = _normalizarTextoSinAcentos_(row.apellidos_match || '');
  var match = (plantel || []).find(function(persona) {
    var dni = normalizarDNI_(persona.DNI || persona.dni || '');
    if (dniCfg && dni && dni === dniCfg) return true;
    var nombre = _normalizarTextoSinAcentos_(persona.Nombre || '');
    var apellido = _normalizarTextoSinAcentos_(persona.Apellido || '');
    if (nombresNeedle && nombre.indexOf(nombresNeedle) === -1) return false;
    if (apellidosNeedle && apellido.indexOf(apellidosNeedle) === -1 && _normalizarTextoSinAcentos_(_nombreCompletoPersona_(persona)).indexOf(apellidosNeedle) === -1) return false;
    return !!(nombresNeedle || apellidosNeedle);
  });
  return match ? _normalizarPersonaDocumento_(row, match) : null;
}

function _normalizarPersonaDocumento_(cfg, plantelPersona) {
  var nombreCompleto = String(cfg.nombre_completo || '').trim() || (plantelPersona ? _nombreCompletoPersona_(plantelPersona) : '');
  var dni = String(cfg.dni || '').trim() || (plantelPersona ? String(plantelPersona.DNI || plantelPersona.dni || '').trim() : '');
  var apellidoNombre = plantelPersona ? _apellidoNombrePersona_(plantelPersona) : _apellidoNombreDesdeNombreCompleto_(nombreCompleto);
  return {
    clave: String(cfg.clave_persona || '').trim(),
    orden: parseInt(cfg.orden || '999', 10),
    activo: _boolDocConfig_(cfg.activo, true),
    nombreCompleto: nombreCompleto,
    apellidoNombre: apellidoNombre,
    apellidoNombreMayus: apellidoNombre.toUpperCase(),
    dni: dni,
    fechaNacimiento: plantelPersona ? _leerFechaPersonaDocumento_(plantelPersona) : '',
    autoridadInstitucion: String(cfg.autoridad_institucion || '').trim(),
    destinatarioNombre: String(cfg.destinatario_nombre || '').trim(),
    rolEvento: String(cfg.rol_evento || (plantelPersona && plantelPersona.Rol) || '').trim(),
    cargoAdministrativo: String(cfg.cargo_administrativo || '').trim(),
    plantelPersona: plantelPersona || null
  };
}

function _leerFechaPersonaDocumento_(persona) {
  var claves = ['Fecha_Nac', 'FechaNac', 'Fecha de Nacimiento', 'fecha_nac', 'fechaNacimiento'];
  for (var i = 0; i < claves.length; i++) {
    var valor = persona[claves[i]];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
  }
  return '';
}

function _resolverValorPlaceholderDocumento_(ph, data) {
  if (!ph || !ph.placeholder) return '';
  var nombres = _armarConvocatoriaParticipantes_(data.plantel || [], data.convocadas || []);
  var tablaTexto = _tablaConvocadasTexto_(nombres);
  var valor = '';

  switch (ph.fuente) {
    case 'concentracion':
      valor = _resolverCampoDocumentoConcentracion_(ph.campo, data, nombres, tablaTexto);
      break;
    case 'persona':
      valor = _resolverCampoDocumentoPersona_(ph.campo, data.persona || null);
      break;
    case 'sistema':
      valor = _resolverCampoDocumentoSistema_(ph.campo, data);
      break;
    case 'fijo':
      valor = ph.valor_fijo || '';
      break;
    default:
      valor = ph.valor_fijo || '';
      break;
  }

  return _aplicarFormatoDocumento_(valor, ph.formato);
}

function _resolverCampoDocumentoConcentracion_(campo, data, nombres, tablaTexto) {
  var conc = data.conc || {};
  var baseCtx = data.baseCtx || {};
  var fechaInicioRaw = conc.fechaInicio || conc.fecha_inicio || '';
  var fechaFinRaw = conc.fechaFin || conc.fecha_fin || fechaInicioRaw;
  switch (String(campo || '').trim()) {
    case 'nombre':
    case 'nombre_evento':
      return conc.nombre || '';
    case 'lugar':
    case 'lugar_evento':
      return conc.lugar || conc.nombre || '';
    case 'direccion':
      return conc.direccion || '';
    case 'ciudad':
    case 'ciudad_evento':
      return conc.ciudad || '';
    case 'fecha_inicio':
      return formatFechaTextoGas_(fechaInicioRaw);
    case 'fecha_fin':
      return formatFechaTextoGas_(fechaFinRaw);
    case 'fecha_inicio_raw':
      return fechaInicioRaw;
    case 'fecha_fin_raw':
      return fechaFinRaw;
    case 'tipo_actividad':
      return baseCtx.tipoActividad || '';
    case 'tabla_convocadas':
      return tablaTexto;
    case 'convocadas_cantidad':
      return String((nombres || []).length);
    case 'convocadas_nombres':
      return (nombres || []).map(function(p) { return p.nombre; }).join(', ');
    case 'federacion_convocante':
      return 'FADeC';
    default:
      return conc[campo] || '';
  }
}

function _resolverCampoDocumentoPersona_(campo, persona) {
  if (!persona) return '';
  switch (String(campo || '').trim()) {
    case 'nombre_completo':
    case 'agente_nombre_completo':
      return persona.nombreCompleto || '';
    case 'dni':
      return persona.dni || '';
    case 'fecha_nacimiento':
      return persona.fechaNacimiento || '';
    case 'rol_evento':
      return persona.rolEvento || '';
    case 'cargo_administrativo':
      return persona.cargoAdministrativo || '';
    case 'autoridad_institucion':
      return persona.autoridadInstitucion || '';
    case 'destinatario_nombre':
      return persona.destinatarioNombre || '';
    case 'apellido_nombre':
    case 'agente_apellido_nombre':
      return persona.apellidoNombre || '';
    case 'apellido_nombre_mayus':
    case 'agente_apellido_nombre_mayus':
      return persona.apellidoNombreMayus || '';
    default:
      return persona[campo] || '';
  }
}

function _resolverCampoDocumentoSistema_(campo, data) {
  switch (String(campo || '').trim()) {
    case 'fecha_emision':
      return data.baseCtx && data.baseCtx.fechaEmision ? data.baseCtx.fechaEmision : formatFechaTextoGas_(new Date());
    default:
      return '';
  }
}

function _aplicarFormatoDocumento_(valor, formato) {
  if (valor === null || valor === undefined) return '';
  var fmt = String(formato || '').trim().toLowerCase();
  if (!fmt || fmt === 'texto' || fmt === 'tabla' || fmt === 'numero') return String(valor);
  if (fmt.indexOf('fecha') !== 0) return String(valor);
  return _formatFechaDocumentoSegunFormato_(valor, fmt);
}

function _formatFechaDocumentoSegunFormato_(valor, formato) {
  if (!valor) return '';
  if (formato === 'texto') return formatFechaTextoGas_(valor);
  var fecha = _parseFechaDocumento_(valor);
  if (!fecha) return String(valor);
  if (formato === 'fecha_corta') return Utilities.formatDate(fecha, 'GMT-3', 'dd/MM');
  if (formato === 'fecha_corta_anio') return Utilities.formatDate(fecha, 'GMT-3', 'dd/MM/yyyy');
  return formatFechaTextoGas_(fecha);
}

function _parseFechaDocumento_(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  var txt = String(valor).trim();
  if (!txt) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(txt)) {
    var parts = txt.slice(0, 10).split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(txt)) {
    var a = txt.split('/');
    return new Date(parseInt(a[2], 10), parseInt(a[1], 10) - 1, parseInt(a[0], 10));
  }
  var parsed = new Date(txt);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function _apellidoNombrePersona_(persona) {
  var apellido = String(persona.Apellido || '').trim();
  var nombre = String(persona.Nombre || '').trim();
  return [apellido, nombre].filter(function(v) { return v; }).join(', ');
}

function _apellidoNombreDesdeNombreCompleto_(nombreCompleto) {
  var partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return String(nombreCompleto || '').trim();
  var nombre = partes.shift();
  return partes.join(' ') + ', ' + nombre;
}

function _leerPlantillaDoc(clave) {
  var sheet = tryGetSheet(SHEETS.configPlantillas);
  if (!sheet) return {};
  var match = sheetToObjects(sheet).find(function(r) { return normalizeText(r.clave) === normalizeText(clave); });
  return match || {};
}

function _leerCarpetaDoc(clave) {
  var sheet = tryGetSheet(SHEETS.configCarpetas);
  if (!sheet) return {};
  var match = sheetToObjects(sheet).find(function(r) { return normalizeText(r.clave) === normalizeText(clave); });
  return match || {};
}

function _resolverPlantillaDocumento_(clave, options) {
  options = options || {};
  var cfg = _leerPlantillaDoc(clave);
  if (cfg && cfg.plantillaId) return cfg;

  var candidatos = _candidatosPlantillaDocumento_(clave);
  if (cfg && cfg.nombreArchivo) candidatos.unshift(cfg.nombreArchivo);
  var folderId = (cfg && (cfg.folderId || cfg.carpetaId)) || CONFIG_DOC.CARPETA_PLANTILLAS;
  var encontrado;
  if (options.searchDrive === false) {
    encontrado = _buscarArchivoEnCarpeta_(folderId, candidatos);
  } else {
    encontrado = _buscarArchivoEnCarpeta_(folderId, candidatos) || _buscarArchivoEnDrive_(candidatos);
  }
  if (encontrado) {
    return {
      plantillaId: encontrado.id,
      carpetaId: folderId
    };
  }

  return cfg || {};
}

function _candidatosPlantillaDocumento_(clave) {
  var mapa = {
    convocatoria_fadec: [
      'Plantilla - Convocatoria oficial FADeC.docx',
      'Convocatoria oficial FADeC',
      'convocatoria fadec'
    ],
    licencia_agencia_cordoba: [
      'Plantilla - Licencia deportiva Agencia Córdoba Deportes.docx',
      'Licencia deportiva Agencia Córdoba Deportes',
      'licencia agencia cordoba deportes'
    ],
    licencia_municipalidad_cordoba: [
      'Plantilla - Solicitud licencia Municipalidad Córdoba.docx',
      'Solicitud licencia Municipalidad Córdoba',
      'licencia municipalidad cordoba'
    ],
    certificacion_participacion: [
      'Certificación de participación',
      'Certificacion de participacion',
      'certificacion participacion'
    ]
  };
  return mapa[clave] || [clave];
}

function _buscarArchivoEnCarpeta_(folderId, candidatos) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var archivos = folder.getFiles();
    while (archivos.hasNext()) {
      var file = archivos.next();
      var nombre = normalizeText(file.getName());
      for (var i = 0; i < candidatos.length; i++) {
        var cand = normalizeText(candidatos[i]);
        if (cand && (nombre === cand || nombre.indexOf(cand) !== -1 || cand.indexOf(nombre) !== -1)) {
          return file;
        }
      }
      if (candidatos.some(function(c) { return normalizeText(c).split(' ').every(function(token) { return token && nombre.indexOf(token) !== -1; }); })) {
        return file;
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

function _buscarArchivoEnDrive_(candidatos) {
  try {
    for (var i = 0; i < candidatos.length; i++) {
      var cand = String(candidatos[i] || '').trim();
      if (!cand) continue;

      var exactos = DriveApp.getFilesByName(cand);
      if (exactos.hasNext()) return exactos.next();

      var normalizado = normalizeText(cand);
      var archivos = DriveApp.getFiles();
      while (archivos.hasNext()) {
        var file = archivos.next();
        var nombre = normalizeText(file.getName());
        if (nombre === normalizado || nombre.indexOf(normalizado) !== -1 || normalizado.indexOf(nombre) !== -1) {
          return file;
        }
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

function _nombreDocumentoConcentraciones(tipo, conc, persona) {
  var base = conc && conc.nombre ? conc.nombre : 'Concentración';
  var mapa = {
    convocatoria_fadec: 'Convocatoria FADEC',
    licencia_agencia_cordoba: 'Licencia Agencia Córdoba',
    licencia_municipalidad_cordoba: 'Licencia Municipalidad Córdoba',
    certificacion_participacion: 'Certificación de participación'
  };
  var nombre = (mapa[tipo] || tipo) + ' · ' + base;
  if (persona && persona.nombreCompleto) nombre += ' · ' + persona.nombreCompleto;
  return nombre;
}

function _armarConvocatoriaParticipantes_(plantel, convDnis) {
  var mapa = {};

  convDnis.forEach(function(dni) {
    var dniLimpio = normalizarDNI_(dni);
    if (!dniLimpio) return;
    var persona = plantel.find(function(r) { return normalizarDNI_(r.DNI) === dniLimpio; });
    if (!persona) {
      mapa[dniLimpio] = {
        dni: dniLimpio,
        nombre: 'DNI ' + dniLimpio,
        provincia: '',
        rol: 'Convocada'
      };
      return;
    }

    mapa[dniLimpio] = {
      dni: dniLimpio,
      nombre: _nombreCompletoPersona_(persona),
      provincia: _provinciaProcedenciaPersona_(persona),
      rol: String(persona.Rol || 'Convocada').trim() || 'Convocada'
    };
  });

  plantel.forEach(function(persona) {
    if (!_esCuerpoTecnico_(persona.Rol)) return;
    var dniLimpio = normalizarDNI_(persona.DNI);
    if (!dniLimpio || mapa[dniLimpio]) return;
    mapa[dniLimpio] = {
      dni: dniLimpio,
      nombre: _nombreCompletoPersona_(persona),
      provincia: _provinciaProcedenciaPersona_(persona),
      rol: String(persona.Rol || 'Cuerpo técnico').trim() || 'Cuerpo técnico'
    };
  });

  return Object.keys(mapa).map(function(k) { return mapa[k]; }).sort(function(a, b) {
    var pesoA = _pesoRolConvocatoria_(a.rol);
    var pesoB = _pesoRolConvocatoria_(b.rol);
    if (pesoA !== pesoB) return pesoA - pesoB;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

function _nombreCompletoPersona_(persona) {
  var apellido = String(persona.Apellido || '').trim();
  var nombre   = String(persona.Nombre || '').trim();
  return [nombre, apellido].filter(function(v) { return v; }).join(' ');
}

function _provinciaProcedenciaPersona_(persona) {
  var claves = [
    'Provincia', 'Provincia_Procedencia', 'ProvinciaProcedencia',
    'Provincia_Origen', 'ProvinciaOrigen', 'Provincia_de_Procedencia',
    'Provincia de procedencia', 'Provincia de origen'
  ];
  for (var i = 0; i < claves.length; i++) {
    var val = persona[claves[i]];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}

function _esCuerpoTecnico_(rol) {
  var texto = _normalizarTextoSinAcentos_(rol);
  return texto.indexOf('cuerpo tecnico') !== -1 || texto === 'ct' || texto.indexOf('tecnico') !== -1 && texto.indexOf('cuerpo') !== -1;
}

function _pesoRolConvocatoria_(rol) {
  var texto = _normalizarTextoSinAcentos_(rol);
  if (texto.indexOf('cuerpo tecnico') !== -1 || texto === 'ct' || texto.indexOf('cuerpo') !== -1 && texto.indexOf('tecnico') !== -1) return 2;
  if (texto.indexOf('arquera') !== -1) return 0;
  if (texto.indexOf('jugadora') !== -1) return 1;
  return 3;
}

function _normalizarTextoSinAcentos_(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function _insertarTablaConvocatoria_(body, participantes) {
  var pattern = '\\{\\{TABLA_CONVOCADAS\\}\\}';
  var found = body.findText(pattern);
  if (!found) throw new Error('No se encontró el placeholder {{TABLA_CONVOCADAS}} en la plantilla');

  var text = found.getElement().asText();
  var paragraph = text.getParent().asParagraph();
  var parent = paragraph.getParent();
  var index = parent.getChildIndex(paragraph);
  var rows = [['Nombre y apellido', 'DNI', 'Provincia de procedencia']];

  if (participantes.length) {
    participantes.forEach(function(p) {
      rows.push([p.nombre, p.dni, p.provincia || '']);
    });
  } else {
    rows.push(['(Sin convocadas)', '', '']);
  }

  parent.insertTable(index, rows);
  parent.removeChild(paragraph);
}

function formatFechaTextoGas_(valor) {
  if (!valor) return '';
  var d;
  if (valor instanceof Date) {
    d = valor;
  } else {
    var parts = String(valor).slice(0, 10).split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      return String(valor);
    }
  }
  var meses = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
}

// ────────────────────────────────────────────────────────────────
// TESTEOS FÍSICOS
// ────────────────────────────────────────────────────────────────
//
// Hoja Testeos:
//   id | nombre | fecha | tipo | notas | timestamp
//   tipo: 'antropometria' | 'yoyo' | 'saltos'
//
// Hoja TesteosMediciones:
//   id | testeoId | jugadora | datos | timestamp
//
//   datos (JSON) según tipo del testeo padre:
//
//   antropometria → { peso, talla, grasa, envergadura }
//     peso:        kg  (ej: 62.5)
//     talla:       cm  (ej: 168)
//     grasa:       %   (ej: 18.3)
//     envergadura: cm  (ej: 172)
//
//   yoyo → { nivel, distancia }
//     nivel:    número de nivel alcanzado (ej: 16.1)
//     distancia: metros totales recorridos (ej: 1560)
//
//   saltos → { sj, cmj, abk }
//     sj:  Squat Jump en cm
//     cmj: Counter Movement Jump en cm
//     abk: Abalakov en cm
//

function testeos_getTesteos() {
  const testeos = sheetToObjects(getSheet(SHEETS.testeos));
  const mediciones = sheetToObjects(getSheet(SHEETS.testeosMediciones));
  return ok(true, testeos.map(t => ({
    ...t,
    mediciones: mediciones
      .filter(m => String(m.testeoId) === String(t.id))
      .map(m => ({ ...m, datos: parseJson(m.datos) || {} }))
  })));
}

function testeos_crearTesteo(p) {
  if (!p.nombre || !p.fecha || !p.tipo) throw new Error('nombre, fecha y tipo son requeridos');
  const tipos = ['antropometria', 'yoyo', 'saltos'];
  if (!tipos.includes(p.tipo)) throw new Error('tipo inválido. Opciones: ' + tipos.join(', '));

  const id = newId();
  getSheet(SHEETS.testeos).appendRow([
    id, p.nombre, p.fecha, p.tipo, p.notas || '', new Date().toISOString()
  ]);
  return ok(true, { id });
}

// Parámetros: { testeoId, jugadora, datos: {...} }
// datos debe contener los campos correspondientes al tipo del testeo
function testeos_agregarMedicion(p) {
  if (!p.testeoId || !p.jugadora) throw new Error('testeoId y jugadora son requeridos');
  if (!p.datos || typeof p.datos !== 'object') throw new Error('datos es requerido y debe ser un objeto');

  // Validar que la jugadora no tenga ya una medición en este testeo
  const hoja = getSheet(SHEETS.testeosMediciones);
  const existente = sheetToObjects(hoja).find(
    m => String(m.testeoId) === String(p.testeoId) && String(m.jugadora) === String(p.jugadora)
  );
  if (existente) throw new Error('Ya existe una medición para ' + p.jugadora + ' en este testeo. Usá testeos_editarMedicion.');

  const id = newId();
  hoja.appendRow([
    id, p.testeoId, p.jugadora, JSON.stringify(p.datos), new Date().toISOString()
  ]);
  return ok(true, { id });
}

// Parámetros: { id, datos?: {...}, jugadora?: string }
function testeos_editarMedicion(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.testeosMediciones);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Medición no encontrada');
  if (p.datos    !== undefined) setCell(sheet, row, 'datos',    JSON.stringify(p.datos));
  if (p.jugadora !== undefined) setCell(sheet, row, 'jugadora', p.jugadora);
  return ok(true, { id: p.id });
}

function testeos_eliminarMedicion(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.testeosMediciones);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Medición no encontrada');
  sheet.deleteRow(row);
  return ok(true, { id: p.id });
}


// ================================================================
// PASO 4 — INICIALIZAR HOJAS (ejecutar UNA SOLA VEZ desde el editor)
// ================================================================
//
// Abrí el editor de Apps Script → seleccioná esta función →
// hacé clic en "Ejecutar". Crea todas las hojas con sus headers
// si no existen todavía. No sobreescribe datos existentes.
//
function inicializarHojas() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  const hojas = [
    {
      nombre: 'SesionesPenales',
      headers: ['id', 'nombre', 'fecha', 'arquera', 'notas', 'timestamp']
    },
    {
      nombre: 'Penales',
      headers: ['id', 'sesionId', 'jugadora', 'zona', 'potencia', 'resultado', 'timestamp']
    },
    {
      nombre: 'Partidos',
      headers: [
        'id', 'rival', 'fecha', 'tipo', 'nombre',
        'goles_propios', 'goles_rival',
        'tiros_propios', 'tiros_rival',
        'corners_propios', 'corners_rival',
        'faltas_propias', 'faltas_rival',
        'goles_primer_tiempo',
        'formacion', 'sistema', 'notas',
        'convocadas', 'ratings', 'momentos',
        'timestamp'
      ]
    },
    {
      nombre: 'Concentraciones',
      headers: ['id', 'nombre', 'fechaInicio', 'fechaFin', 'lugar', 'notas', 'timestamp']
    },
    {
      nombre: 'ConcentracionDias',
      headers: ['id', 'concentracionId', 'fecha', 'notas', 'actividades', 'timestamp']
    },
    {
      nombre: 'Testeos',
      headers: ['id', 'nombre', 'fecha', 'tipo', 'notas', 'timestamp']
    },
    {
      nombre: 'TesteosMediciones',
      headers: ['id', 'testeoId', 'jugadora', 'datos', 'timestamp']
    },
    {
      nombre: 'ColumnasDinamicas',
      headers: ['id', 'nombre', 'tipo', 'grupo', 'timestamp']
    },
  ];

  hojas.forEach(({ nombre, headers }) => {
    let sheet = spreadsheet.getSheetByName(nombre);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(nombre);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Congelar la fila de headers
      sheet.setFrozenRows(1);
      Logger.log('✓ Hoja creada: ' + nombre);
    } else {
      Logger.log('— Hoja ya existe (sin cambios): ' + nombre);
    }
  });

  Logger.log('Inicialización completa.');
}

function ok(success, data, error) {
  const payload = success
    ? { ok: true, data: data }
    : { ok: false, error: error || 'Error desconocido' };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── AUTORIZACIÓN MANUAL ───────────────────────────────────────────────────────
/**
 * FORZAR_AUTORIZACION — ejecutar manualmente desde el editor UNA SOLA VEZ
 * para autorizar el acceso a Drive y Sheets antes de publicar la Web App.
 */
function FORZAR_AUTORIZACION() {
  var carpeta = DriveApp.getFolderById(CONFIG.DRIVE_RAIZ_ID);
  var hoja    = getSheet(SHEETS.plantel);
  var doc      = DocumentApp.openById(CONFIG_DOC.PLANTILLA_CONVOCATORIA);
  Logger.log('Drive OK: ' + carpeta.getName());
  Logger.log('Sheets OK: ' + hoja.getName());
  Logger.log('Docs OK: ' + doc.getName());
}
