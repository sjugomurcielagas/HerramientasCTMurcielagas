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

var SHEETS = {
  plantel:           'Las_Murcielagas_Base_Personal',
  sesionesPenales:   'SesionesPenales',
  penales:           'Penales',
  partidos:          'Partidos',
  concentraciones:   'Concentraciones',
  concentracionDias: 'ConcentracionDias',
  testeos:           'Testeos',
  testeosMediciones: 'TesteosMediciones',
  columnasDinamicas: 'ColumnasDinamicas',
};

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
  'antidoping':  '04_Anti_Doping'
};

var CAMPOS_LINK_ = {
  'foto':        'Foto_Link',
  'pasaporte':   'Pasaporte_Scan_Link',
  'apto_medico': 'Apto_Medico_Link',
  'antidoping':  'Anti_Doping_Link'
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
    result = verificarPassword(payload.pwd || payload.password || '');
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

  case 'base_getAlertas':
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
      case 'concentraciones_eliminarActividad':     result = concentraciones_eliminarActividad(payload); break;

      // ── TESTEOS ──
      case 'testeos_getTesteos':         result = testeos_getTesteos(); break;
      case 'testeos_crearTesteo':        result = testeos_crearTesteo(payload); break;
      case 'testeos_agregarMedicion':    result = testeos_agregarMedicion(payload); break;
      case 'testeos_editarMedicion':     result = testeos_editarMedicion(payload); break;
      case 'testeos_eliminarMedicion':   result = testeos_eliminarMedicion(payload); break;

      default:
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
//   tipo actividad: 'entrenamiento' | 'charla-tactica' | 'partido' |
//                   'recuperacion' | 'medica' | 'libre' | 'otro'
//   hora: 'HH:MM' — se usa para ordenar las actividades del día
//

function concentraciones_getConcentraciones() {
  return ok(true, sheetToObjects(getSheet(SHEETS.concentraciones)));
}

function concentraciones_crearConcentracion(p) {
  if (!p.nombre || !p.fechaInicio) throw new Error('nombre y fechaInicio son requeridos');
  const id = newId();
  getSheet(SHEETS.concentraciones).appendRow([
    id, p.nombre, p.fechaInicio, p.fechaFin || '', p.lugar || '', p.notas || '',
    new Date().toISOString()
  ]);
  return ok(true, { id });
}

function concentraciones_editarConcentracion(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.concentraciones);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Concentración no encontrada');
  ['nombre', 'fechaInicio', 'fechaFin', 'lugar', 'notas'].forEach(f => {
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

// Parámetros: { concentracionId, fecha, tipo, hora?, descripcion?, duracion?, notas? }
function concentraciones_agregarActividad(p) {
  if (!p.concentracionId || !p.fecha || !p.tipo)
    throw new Error('concentracionId, fecha y tipo son requeridos');

  const { sheet, diaId } = _getOrCreateDia(p.concentracionId, p.fecha);
  const diaRow = findRowIndex(sheet, 'id', diaId);
  const col = getColIndex(sheet, 'actividades');
  const lista = parseJson(sheet.getRange(diaRow, col).getValue()) || [];

  const actividad = {
    id:          newId(),
    tipo:        p.tipo,
    hora:        p.hora        || '',
    descripcion: p.descripcion || '',
    duracion:    p.duracion    || '',
    notas:       p.notas       || '',
  };
  lista.push(actividad);
  lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  sheet.getRange(diaRow, col).setValue(JSON.stringify(lista));
  return ok(true, { ...actividad, diaId });
}

// Parámetros: { concentracionId, fecha, actividadId, tipo?, hora?, descripcion?, duracion?, notas? }
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

  ['tipo', 'hora', 'descripcion', 'duracion', 'notas'].forEach(f => {
    if (p[f] !== undefined) lista[idx][f] = p[f];
  });
  lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  sheet.getRange(rowIndex, col).setValue(JSON.stringify(lista));
  return ok(true, { actividadId: p.actividadId });
}

// Parámetros: { concentracionId, fecha, actividadId }
function concentraciones_eliminarActividad(p) {
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
  const lista = (parseJson(sheet.getRange(rowIndex, col).getValue()) || [])
    .filter(a => String(a.id) !== String(p.actividadId));
  sheet.getRange(rowIndex, col).setValue(JSON.stringify(lista));
  return ok(true, { actividadId: p.actividadId });
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
  var hoja    = getSheet_();
  Logger.log('Drive OK: ' + carpeta.getName());
  Logger.log('Sheets OK: ' + hoja.getName());
}