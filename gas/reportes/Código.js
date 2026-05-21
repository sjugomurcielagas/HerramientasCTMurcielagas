// Apps Script · Puente de datos para Murciélagas Analytics
// Lee la planilla resumen y devuelve JSON para que la web pueda generar reportes.

const SPREADSHEET_ID = '1WNRpBKV3ZU1LEQr6aB_hqSfkcPOSbXaB1Ij3N48fewQ';
const SHEET_GID = 150412275;

// Si conocés el nombre exacto de la pestaña resumen, podés ponerlo acá.
// Si queda vacío, el script busca la hoja por GID.
const SHEET_NAME = '';

// El script busca encabezados dentro de las primeras filas, no sólo en la fila 1.
const MAX_HEADER_SCAN_ROWS = 10;

// Registros que no deben entrar al análisis.
// Acá van pruebas, miembros del CT o cargas claramente erróneas.
const EXCLUDED_NAMES = [
  'Gonzalo'
];

// Correcciones simples de nombres mal escritos o incompletos.
// La clave es como aparece en el formulario; el valor es como debe quedar en el reporte.
const NAME_CORRECTIONS = {
  'Medina Agustina': 'Medina Paez, Agustina'
};

// Encabezados esperados por la web.
// Se pueden agregar variantes según los títulos reales de tu hoja resumen.
const COLUMN_ALIASES = {
  fecha: [
    'fecha', 'date', 'día', 'dia', 'marca temporal', 'timestamp',
    'semana', 'fecha de carga', 'fecha entrenamiento', 'fecha del reporte'
  ],
  jugadora: [
    'jugadora', 'nombre', 'nombre y apellido', 'deportista', 'apellido',
    'jugadora nombre', 'nombre jugadora', 'atleta', 'player', 'nombre completo'
  ],
  total: [
    'total', 'estímulos', 'estimulos', 'total estímulos', 'total estimulos',
    'estímulos totales', 'estimulos totales', 'volumen total',
    'cantidad total', 'total semanal', 'total entrenamientos',
    'total de estímulos', 'total de estimulos', 'total estímulos semanales',
    'total estimulos semanales', 'estimulos realizados por semana',
    'estímulos realizados por semana'
  ],
  fisico: [
    'físico', 'fisico', 'trabajo físico', 'trabajo fisico',
    'estímulos físicos', 'estimulos fisicos', 'volumen físico', 'volumen fisico',
    'físico semanal', 'fisico semanal', 'total físico', 'total fisico',
    'cantidad físico', 'cantidad fisico', 'preparación física', 'preparacion fisica',
    'estimulos fisicos de 1 hora o mas', 'estímulos físicos de 1 hora o más'
  ],
  tecnico: [
    'técnico', 'tecnico', 'táctico', 'tactico',
    'técnico táctico', 'tecnico tactico', 'técnico-táctico', 'tecnico-tactico',
    'trabajo técnico', 'trabajo tecnico', 'trabajo técnico táctico',
    'trabajo tecnico tactico', 'volumen técnico', 'volumen tecnico',
    'total técnico', 'total tecnico', 'total técnico táctico', 'total tecnico tactico',
    'estimulos tecnicos o tacticos', 'estímulos técnicos o tácticos'
  ],
  comentario: [
    'comentario', 'comentarios', 'observación', 'observacion',
    'observaciones', 'novedades', 'detalle', 'observaciones generales',
    'comentario semanal', 'registro', 'notas'
  ]
};

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

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';
    const callback = e && e.parameter ? e.parameter.callback : '';

    // Si no viene ninguna acción, abre la interfaz normal del sistema.
    if (!action) {
      return HtmlService
        .createHtmlOutputFromFile('Index')
        .setTitle('Reportes de entrenamiento · Las Murciélagas')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // API para GitHub u otros accesos externos.
    let result;

    if (action === 'getClientData') {
      result = {
        ok: true,
        rows: getReportRows_()
      };
    } else {
      result = {
        ok: true,
        message: 'API de reportes activa'
      };
    }

    return jsonResponse_(result, callback);

  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    }, e && e.parameter ? e.parameter.callback : '');
  }
}

function jsonResponse_(data, callback) {
  const json = JSON.stringify(data);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getReportRows_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheet_(ss);
  const values = sheet.getDataRange().getDisplayValues();

  if (!values || values.length < 2) {
    throw new Error('La hoja no tiene datos suficientes.');
  }

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

    // Evita filas vacías, incompletas, pruebas o personas que no deben entrar al análisis.
    if (!item.fecha || !item.jugadora) continue;
    if (isExcludedName_(item.jugadora)) continue;

    rows.push(item);
  }

  return rows;
}

function detectHeaderRow_(values) {
  let best = {
    headerRowIndex: 0,
    headers: values[0].map(h => String(h || '').trim()),
    score: -1,
    map: {}
  };

  const limit = Math.min(MAX_HEADER_SCAN_ROWS, values.length);

  for (let i = 0; i < limit; i++) {
    const candidateHeaders = values[i].map(h => String(h || '').trim());
    const map = buildHeaderMap_(candidateHeaders);
    const score = Object.keys(map).length;

    if (score > best.score) {
      best = {
        headerRowIndex: i,
        headers: candidateHeaders,
        score,
        map
      };
    }
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

    // Coincidencia exacta.
    let index = normalizedHeaders.findIndex(h => aliases.includes(h));

    // Coincidencia parcial: sirve para encabezados largos como
    // "Cantidad de estímulos físicos realizados esta semana".
    if (index === -1) {
      index = normalizedHeaders.findIndex(h => {
        if (!h) return false;
        return aliases.some(alias => {
          if (!alias) return false;
          return h === alias || h.includes(alias) || alias.includes(h);
        });
      });
    }

    if (index !== -1) map[key] = index;
  });

  return map;
}

function validateRequiredColumns_(headerMap, headers, headerRowIndex) {
  const required = ['fecha', 'jugadora', 'total', 'fisico', 'tecnico'];
  const missing = required.filter(key => headerMap[key] === undefined);

  if (missing.length) {
    throw new Error(
      'Faltan columnas obligatorias o no se reconocieron sus encabezados: ' + missing.join(', ') +
      '. Encabezados detectados en fila ' + (headerRowIndex + 1) + ': [' + headers.join(' | ') + ']. ' +
      'Usá la función inspeccionarHoja() para ver las primeras filas y ajustar los nombres.'
    );
  }
}

function getCell_(row, index) {
  return String(row[index] || '').trim();
}

function normalizeNumber_(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value)
    .replace(',', '.')
    .replace(/[^0-9.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizePlayerName_(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const correctionKey = Object.keys(NAME_CORRECTIONS).find(
    key => normalizeText_(key) === normalizeText_(clean)
  );

  if (correctionKey) return NAME_CORRECTIONS[correctionKey];

  return clean;
}

function isExcludedName_(name) {
  const normalized = normalizeText_(name);
  return EXCLUDED_NAMES.some(
    excluded => normalizeText_(excluded) === normalized
  );
}

function normalizeText_(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function parsePostPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No se recibió contenido en el POST.');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('El contenido recibido no es JSON válido.');
  }
}

function buildPromptFromPayload_(payload) {
  return [
    'Generá un reporte deportivo claro y humano con estos datos:',
    '',
    JSON.stringify(payload, null, 2)
  ].join('\n');
}

function callOpenAI_(prompt) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-4.1-mini';

  if (!apiKey) {
    throw new Error('No se encontró OPENAI_API_KEY en Script Properties.');
  }

  const body = {
    model,
    input: prompt,
    temperature: 0.35,
    max_output_tokens: 1400
  };

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + apiKey
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const text = response.getContentText();

  if (status < 200 || status >= 300) {
    throw new Error('OpenAI devolvió error ' + status + ': ' + text.slice(0, 800));
  }

  const data = JSON.parse(text);
  const output = extractOpenAIText_(data);

  if (!output) {
    throw new Error('OpenAI respondió, pero no se pudo extraer texto del reporte.');
  }

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

// Ejecutá esta función una vez desde el editor para autorizar acceso externo y probar la API Key.
function autorizarServicios() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('OPENAI_API_KEY');

  Logger.log(apiKey ? 'API Key encontrada en Script Properties.' : 'No se encontró OPENAI_API_KEY.');

  const report = callOpenAI_('Escribí una respuesta breve que diga: Conexión de IA funcionando correctamente.');
  Logger.log(report);
}

function testGenerarReporteIA() {
  const sample = {
    prompt: 'Redactá un reporte breve para el cuerpo técnico. Datos: Jugadora Sandra Yanaje, últimas 6 semanas, volumen semanal reportado medio, alerta por dolor lumbar, sugerir seguimiento prudente sin diagnosticar.'
  };

  const report = callOpenAI_(sample.prompt);
  Logger.log(report);
}

// Función para probar desde el editor de Apps Script.
function testGetReportRows() {
  const rows = getReportRows_();
  Logger.log(JSON.stringify(rows.slice(0, 10), null, 2));
  Logger.log('Total filas: ' + rows.length);
}

// Ejecutá esta función si el script no reconoce encabezados.
// Te muestra las primeras filas de la pestaña para que podamos ajustar el mapeo.
function inspeccionarHoja() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getSheet_(ss);
  const values = sheet.getDataRange().getDisplayValues();
  const limit = Math.min(10, values.length);

  Logger.log('Nombre de la hoja: ' + sheet.getName());
  Logger.log('GID de la hoja: ' + sheet.getSheetId());

  for (let i = 0; i < limit; i++) {
    Logger.log('Fila ' + (i + 1) + ': ' + JSON.stringify(values[i]));
  }
}

// Función opcional para verificar exclusiones y correcciones.
function testNombresFiltrados() {
  const rows = getReportRows_();
  const nombres = [...new Set(rows.map(r => r.jugadora))].sort();
  Logger.log(JSON.stringify(nombres, null, 2));
  Logger.log('Cantidad de nombres incluidos: ' + nombres.length);
}

function getClientData() {
  try {
    return {
      ok: true,
      source: 'google_sheets',
      updatedAt: new Date().toISOString(),
      rows: getReportRows_()
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error && error.message ? error.message : error)
    };
  }
}

function generateClientReport(payload) {
  try {
    const prompt = payload.prompt || buildPromptFromPayload_(payload);
    const report = callOpenAI_(prompt);

    return {
      ok: true,
      source: 'openai',
      updatedAt: new Date().toISOString(),
      report
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error && error.message ? error.message : error)
    };
  }
}

function testModeloOpenAIActivo() {
  const props = PropertiesService.getScriptProperties();
  const model = props.getProperty('OPENAI_MODEL') || 'gpt-4.1-mini';
  Logger.log('Modelo OpenAI activo: ' + model);
}

function normalizeTrainingNumber_(value) {
  if (value === null || value === undefined) return 0;

  const raw = String(value).trim();
  if (!raw) return 0;

  const normalized = normalizeText_(raw);

  const zeroWords = [
    'no', 'ninguno', 'ninguna', 'nada', 'cero',
    'no entrene', 'no entrené', 'no hice', 'sin entrenamiento'
  ];

  if (zeroWords.some(w => normalized === normalizeText_(w))) {
    return 0;
  }

  const wordNumbers = {
    'cero': 0,
    'uno': 1,
    'una': 1,
    'un': 1,
    'dos': 2,
    'tres': 3,
    'cuatro': 4,
    'cinco': 5,
    'seis': 6,
    'siete': 7,
    'ocho': 8,
    'nueve': 9,
    'diez': 10
  };

  if (wordNumbers[normalized] !== undefined) {
    return wordNumbers[normalized];
  }

  const numericMatches = raw.match(/\d+(?:[,.]\d+)?/g);

  if (!numericMatches || !numericMatches.length) {
    return 0;
  }

  if (numericMatches.length === 1) {
    const n = Number(numericMatches[0].replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  // Si hay varios números en el mismo campo, los suma.
  // Ejemplo: "1 físico + 1 técnico" → 2.
  const sum = numericMatches.reduce((acc, item) => {
    const n = Number(item.replace(',', '.'));
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);

  return sum;
}

function testRegistrosConIssues() {
  const rows = getReportRows_();
  const conIssues = rows.filter(r => r.issues && r.issues.length);

  Logger.log(JSON.stringify(conIssues.slice(0, 30), null, 2));
  Logger.log('Total registros con issues: ' + conIssues.length);
}

function testIssueManual() {
  const item = {
    fecha: '17/11/2025',
    jugadora: 'Prueba',
    total: 4,
    fisico: 2,
    tecnico: 3,
    comentario: ''
  };

  const rawItem = {
    total: '4',
    fisico: '2',
    tecnico: '3'
  };

  const issues = detectDataIssues_(item, rawItem);

  Logger.log(JSON.stringify(issues, null, 2));
}

const AUDIT_SHEET_NAME = 'Auditoría de datos';

function generarAuditoriaDatos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getSheet_(ss);

  let auditSheet = ss.getSheetByName(AUDIT_SHEET_NAME);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(AUDIT_SHEET_NAME);
  }

  auditSheet.clear();

  const headers = [
    'Abrir',
    'Fila original',
    'Fecha',
    'Jugadora',
    'Total',
    'Físico',
    'Técnico-táctico',
    'Total sugerido',
    'Problema detectado',
    'Comentario',
    'Estado'
  ];

  auditSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const rows = getReportRows_();
  const conIssues = rows.filter(r => r.issues && r.issues.length);

  if (!conIssues.length) {
  auditSheet.getRange(2, 1).setValue('No se detectaron inconsistencias pendientes.');

  Logger.log('No se detectaron inconsistencias pendientes.');
  Logger.log('Auditoría: ' + ss.getUrl() + '#gid=' + auditSheet.getSheetId());

  return {
    ok: true,
    totalIssues: 0,
    auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(),
    message: 'No se detectaron inconsistencias pendientes.'
  };
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
    const richText = SpreadsheetApp.newRichTextValue()
      .setText('Abrir fila ' + r.rowNumber)
      .setLinkUrl(url)
      .build();

    auditSheet.getRange(index + 2, 1).setRichTextValue(richText);
  });

  auditSheet.setFrozenRows(1);
  auditSheet.autoResizeColumns(1, headers.length);

  auditSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#d9ead3');

  auditSheet.getRange(2, 11, values.length, 1)
    .setBackground('#fff2cc');

  Logger.log('Auditoría generada correctamente.');
  Logger.log('Total registros con issues: ' + conIssues.length);
  Logger.log('Abrir auditoría: ' + ss.getUrl() + '#gid=' + auditSheet.getSheetId());

return {
  ok: true,
  totalIssues: conIssues.length,
  auditUrl: ss.getUrl() + '#gid=' + auditSheet.getSheetId(),
  message: 'Auditoría generada correctamente.'
};
  
}

const MAX_WEEKLY_STIMULI = 20;

function detectDataIssues_(item, rawItem) {
  const issues = [];

  const total = Number(item.total) || 0;
  const fisico = Number(item.fisico) || 0;
  const tecnico = Number(item.tecnico) || 0;
  const subtotal = fisico + tecnico;

  if (total === 0 && subtotal > 0) {
    issues.push('INCONSISTENCIA: el total figura en 0, pero hay estímulos físicos o técnico-tácticos cargados. Total sugerido: ' + subtotal + '.');
  }

  if (total > 0 && subtotal === 0) {
    issues.push('DATO INCOMPLETO: hay total cargado, pero no se discrimina entre físico y técnico-táctico.');
  }

  if (total > 0 && subtotal > total) {
    issues.push('INCONSISTENCIA: la suma de estímulos físicos y técnico-tácticos supera el total declarado. Total sugerido: ' + subtotal + '.');
  }

  if (total > MAX_WEEKLY_STIMULI || fisico > MAX_WEEKLY_STIMULI || tecnico > MAX_WEEKLY_STIMULI) {
    issues.push('VALOR ALTO: el valor cargado supera el máximo esperado de ' + MAX_WEEKLY_STIMULI + ' estímulos semanales.');
  }

  return issues;
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    const action = body.action;

    if (action === 'getClientData') {
      return jsonResponse_({
        ok: true,
        rows: getReportRows_()
      });
    }

    if (action === 'generateClientReport') {
      const result = generateClientReport({
        prompt: body.prompt || ''
      });

      return jsonResponse_(result);
    }

    if (action === 'generarAuditoriaDatos') {
      const result = generarAuditoriaDatos();
      return jsonResponse_(result);
    }

    return jsonResponse_({
      ok: false,
      error: 'Acción no reconocida: ' + action
    });

  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}
