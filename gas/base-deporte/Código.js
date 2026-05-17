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
var ANTIDOPING_BACKEND_VERSION = '2026-05-17.2';

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
    ['Paracetamol', 'Paracetamol', 'NO FIGURA COMO PROHIBIDO (REVISAR DOSIS)', 'Uso habitual. Confirmar composición combinada si aplica.', 'Vademecum Argentina', 'Lista Prohibida WADA 2026', 'N/A', ahora, 'SI'],
    ['Ibuprofeno', 'Ibuprofeno', 'NO FIGURA COMO PROHIBIDO', 'Revisar formulaciones combinadas con descongestivos.', 'Vademecum Argentina', 'Lista Prohibida WADA 2026', 'N/A', ahora, 'SI'],
    ['Salbutamol', 'Salbutamol', 'CONDICIONADO / REQUIERE REVISIÓN MÉDICA', 'Puede requerir TUE o control de dosis según vía y concentración.', 'Vademecum Argentina', 'Lista Prohibida WADA 2026 (S3)', 'Global DRO / NADAmed', ahora, 'SI'],
    ['Pseudoefedrina', 'Pseudoefedrina', 'PROHIBIDO EN COMPETENCIA (UMBRAL)', 'Controlar ventana de uso y concentración.', 'Vademecum Argentina', 'Lista Prohibida WADA 2026 (S6)', 'Global DRO / NADAmed', ahora, 'SI'],
    ['Budesonida', 'Budesonida', 'CONDICIONADO / REQUIERE REVISIÓN MÉDICA', 'Vía sistémica e indicación pueden requerir TUE.', 'Vademecum Argentina', 'Lista Prohibida WADA 2026 (S9)', 'Global DRO / NADAmed', ahora, 'SI']
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
      en_competencia: 'N/D',
      fuera_competencia: 'N/D'
    };
  }
  var activos = String(principioActivo || '')
    .split(/,|\/|\+|;| y /i)
    .map(function(x) { return normalizeText(x); })
    .filter(Boolean);
  if (!activos.length) activos = [normalizeText(principioActivo)];

  var hits = [];
  activos.forEach(function(a) {
    rules.forEach(function(r) {
      if (!a || !r.sustancia) return;
      if (a === r.sustancia || a.indexOf(r.sustancia) !== -1 || r.sustancia.indexOf(a) !== -1) {
        hits.push(r);
      }
    });
  });
  if (!hits.length) {
    return {
      estado: 'NO FIGURA COMO PROHIBIDO (REVISAR CONTEXTO)',
      fuente_wada: 'WADA_Sustancias',
      observaciones_wada: 'Sin coincidencia exacta en reglas cargadas.',
      en_competencia: 'NO',
      fuera_competencia: 'NO'
    };
  }
  var h = hits[0];
  var hasProhibido = hits.some(function(x) { return normalizeText(x.estado).indexOf('prohibido') !== -1; });
  var hasCondicionado = hits.some(function(x) {
    var s = normalizeText(x.estado);
    return s.indexOf('condicionado') !== -1 || s.indexOf('revision') !== -1;
  });
  var estadoFinal = hasProhibido
    ? 'PROHIBIDO / REQUIERE VERIFICACIÓN MÉDICA'
    : (hasCondicionado ? 'CONDICIONADO / REQUIERE REVISIÓN MÉDICA' : (h.estado || 'REQUIERE REVISIÓN'));
  return {
    estado: estadoFinal,
    fuente_wada: 'WADA_Sustancias' + (h.version ? (' v' + h.version) : ''),
    observaciones_wada: hits.slice(0, 3).map(function(x) {
      return [x.sustancia, x.categoria, x.umbral, x.nota].filter(Boolean).join(' | ');
    }).join(' || '),
    en_competencia: hits.map(function(x) { return x.en_competencia; }).filter(Boolean).join(' / ') || 'N/D',
    fuera_competencia: hits.map(function(x) { return x.fuera_competencia; }).filter(Boolean).join(' / ') || 'N/D'
  };
}

function antidoping_knownCommercialActive_(nombre) {
  var n = normalizeText(nombre);
  var map = {
    'tafirol': 'paracetamol',
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
  var knownActiveFromQuery = antidoping_knownCommercialActive_(consulta);
  var shouldBypassCache = !!knownActiveFromQuery;
  if (!forceRefresh && !shouldBypassCache) {
    var cached = antidoping_readCache_(consultaNorm);
    if (cached && cached.length) {
      antidoping_appendHistorial_(consulta, cached[0]);
      return ok(true, cached);
    }
  }

  var matches = [];
  var source = '';

  try {
    matches = antidoping_scrapePrVademecum_(consulta).slice(0, 6).map(antidoping_enrichPrItem_);
    source = 'prvademecum_live';
  } catch (e) {
    matches = [];
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
      observaciones: item.observaciones || evalWada.observaciones_wada || '',
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
  var ws      = getSheet_();
  var headers = ws.getDataRange().getValues()[0];
  var row     = getRowByDNI_(dni);
  if (!row) return { ok: false, msg: 'DNI no encontrado' };

  var rowNum   = row.__row;
  var logSheet = getLogSheet_();
  var ahora    = Utilities.formatDate(new Date(), 'GMT-3', 'dd/MM/yyyy HH:mm');
  var nombre   = (row.Apellido || '') + ', ' + (row.Nombre || '');

  for (var campo in cambios) {
    var colIdx = headers.indexOf(campo);
    if (colIdx === -1) continue; // columna no existe, saltar

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
    ['DNI_Vto', 'Pasaporte_Vto', 'CUD_Vto', 'Apto_Medico_Vto'].forEach(function(campo) {
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
  'apto_medico': '02_Aptos_Medicos',
  'pasaporte':   '03_Pasaportes',
  'antidoping':  '04_Anti_Doping',
  'tue':         '05_TUE',
  'ibsa_elegibilidad': '06_IBSA_Elegibilidad'
};

var CAMPOS_LINK_ = {
  'foto':        'Foto_Link',
  'pasaporte':   'Pasaporte_Scan_Link',
  'apto_medico': 'Apto_Medico_Link',
  'antidoping':  'Anti_Doping_Link',
  'tue':         'TUE_Archivo',
  'ibsa_elegibilidad': 'IBSA_Elegibilidad_Archivo'
};

function subirArchivo(dni, tipo, base64Data, mimeType, extension) {
  try {
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
  var reemplazos = _reemplazosDocumentoConcentracion_({
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
  });

  var documentos = tipos.map(function(tipo) {
    try {
      return _generarDocumentoConcentracion_({
        tipo: tipo,
        conc: conc,
        reemplazos: reemplazos,
        convocadas: convocadas,
        plantel: plantel,
        validacion: validacion
      });
    } catch (err) {
      var errorMsg = err && err.message ? err.message : String(err);
      _registrarDocumentoGenerado_(conc.id, tipo, _nombreDocumentoConcentraciones(tipo, conc), '', 'error', errorMsg);
      return {
        concentracionId: conc.id,
        tipoDocumento: tipo,
        nombre: _nombreDocumentoConcentraciones(tipo, conc),
        url: '',
        estado: 'error',
        error: errorMsg,
        faltantes: validacion ? validacion.faltantes : [],
        convocadas: convocadas,
        plantillaId: '',
        carpetaId: ''
      };
    }
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

function _tiposDocumentoConcentraciones() {
  return [
    {
      clave: 'convocatoria_fadec',
      nombre: 'Convocatoria FADEC',
      plantillaId: _resolverPlantillaDocumento_('convocatoria_fadec').plantillaId || CONFIG_DOC.PLANTILLA_CONVOCATORIA,
      carpetaId: _resolverPlantillaDocumento_('convocatoria_fadec').carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: true,
      requiereTablaConvocadas: true
    },
    {
      clave: 'licencia_agencia_cordoba',
      nombre: 'Licencia Agencia Córdoba',
      plantillaId: _resolverPlantillaDocumento_('licencia_agencia_cordoba').plantillaId || '',
      carpetaId: _resolverPlantillaDocumento_('licencia_agencia_cordoba').carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: false,
      requiereTablaConvocadas: false
    },
    {
      clave: 'licencia_municipalidad_cordoba',
      nombre: 'Licencia Municipalidad Córdoba',
      plantillaId: _resolverPlantillaDocumento_('licencia_municipalidad_cordoba').plantillaId || '',
      carpetaId: _resolverPlantillaDocumento_('licencia_municipalidad_cordoba').carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: false,
      requiereTablaConvocadas: false
    },
    {
      clave: 'certificacion_participacion',
      nombre: 'Certificación de participación',
      plantillaId: _resolverPlantillaDocumento_('certificacion_participacion').plantillaId || '',
      carpetaId: _resolverPlantillaDocumento_('certificacion_participacion').carpetaId || CONFIG_DOC.CARPETA_GENERADOS,
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: true,
      requiereTablaConvocadas: true
    }
  ];
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
  var faltantes = [];
  if (!conc) faltantes.push('concentracion');
  if (tipos.indexOf('convocatoria_fadec') > -1 && !convocadas.length) faltantes.push('convocadas');

  tipos.forEach(function(tipo) {
    var cfg = _tiposDocumentoConcentraciones().find(function(t) { return t.clave === tipo; });
    if (!cfg) faltantes.push('tipo:' + tipo);
    if (cfg && cfg.requiereNombre && !(conc && conc.nombre)) faltantes.push('nombre');
    if (cfg && cfg.requiereFecha && !(conc && conc.fechaInicio)) faltantes.push('fechaInicio');
    if (cfg && cfg.requiereConvocadas && !convocadas.length) faltantes.push('convocadas');
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
  var cfg = _tiposDocumentoConcentraciones().find(function(t) { return t.clave === ctx.tipo; });
  if (!cfg) throw new Error('Tipo de documento no reconocido: ' + ctx.tipo);
  if (!cfg.plantillaId) throw new Error('No hay plantilla configurada para ' + cfg.nombre);

  var nombre = _nombreDocumentoConcentraciones(ctx.tipo, ctx.conc);
  var plantilla = DriveApp.getFileById(cfg.plantillaId);
  var carpeta = getOrCreateFolder_(cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS, 'Documentos Generados');
  var copia = plantilla.makeCopy(nombre, carpeta);
  var doc = DocumentApp.openById(copia.getId());
  var body = doc.getBody();
  var urlDoc = copia.getUrl ? copia.getUrl() : '';
  if (!urlDoc) urlDoc = 'https://docs.google.com/document/d/' + copia.getId() + '/edit';

  _aplicarReemplazosDocumentoConcentracion_(body, ctx.reemplazos, ctx.tipo, ctx.convocadas, ctx.plantel);
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
    carpetaId: cfg.carpetaId || CONFIG_DOC.CARPETA_GENERADOS
  };
}

function _reemplazosDocumentoConcentracion_(data) {
  var nombres = _armarConvocatoriaParticipantes_(data.plantel, data.convocadas);
  var tablaTexto = _tablaConvocadasTexto_(nombres);
  return {
    '{{FECHA_EMISION}}': data.fechaEmision,
    '{{LUGAR}}': data.lugar,
    '{{DIRECCION_LUGAR}}': data.direccion,
    '{{CIUDAD}}': data.ciudad,
    '{{FECHA_INICIO_TEXTO}}': data.fechaInicio,
    '{{FECHA_FIN_TEXTO}}': data.fechaFin,
    '{{TIPO_ACTIVIDAD}}': data.tipoActividad,
    '{{NOMBRE_CONCENTRACION}}': data.conc.nombre || '',
    '{{CONCENTRACION_NOMBRE}}': data.conc.nombre || '',
    '{{TABLA_CONVOCADAS}}': tablaTexto,
    '{{CONVOCADAS_TEXTO}}': tablaTexto,
    '{{CONVOCADAS_CANTIDAD}}': String(nombres.length),
    '{{CONVOCADAS_NOMBRES}}': nombres.map(function(p) { return p.nombre; }).join(', ')
  };
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

function _ensureHojaDocumentosGenerados() {
  var sheet = tryGetSheet(SHEETS.documentosGenerados);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(SHEETS.documentosGenerados);
    sheet.appendRow(['id', 'concentracionId', 'tipoDocumento', 'nombre', 'url', 'estado', 'error', 'timestamp']);
    sheet.setFrozenRows(1);
  }
  return sheet;
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

function _resolverPlantillaDocumento_(clave) {
  var cfg = _leerPlantillaDoc(clave);
  if (cfg && cfg.plantillaId) return cfg;

  var candidatos = _candidatosPlantillaDocumento_(clave);
  if (cfg && cfg.nombreArchivo) candidatos.unshift(cfg.nombreArchivo);
  var folderId = (cfg && (cfg.folderId || cfg.carpetaId)) || CONFIG_DOC.CARPETA_PLANTILLAS;
  var encontrado = _buscarArchivoEnCarpeta_(folderId, candidatos) || _buscarArchivoEnDrive_(candidatos);
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

function _nombreDocumentoConcentraciones(tipo, conc) {
  var base = conc && conc.nombre ? conc.nombre : 'Concentración';
  var mapa = {
    convocatoria_fadec: 'Convocatoria FADEC',
    licencia_agencia_cordoba: 'Licencia Agencia Córdoba',
    licencia_municipalidad_cordoba: 'Licencia Municipalidad Córdoba',
    certificacion_participacion: 'Certificación de participación'
  };
  return (mapa[tipo] || tipo) + ' · ' + base;
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
