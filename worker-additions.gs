// ================================================================
// CÓDIGO PARA AGREGAR AL GOOGLE APPS SCRIPT / CLOUDFLARE WORKER
// Herramientas CT Las Murciélagas
// ================================================================
//
// CÓMO USAR ESTE ARCHIVO
// ─────────────────────
// Este archivo contiene TODO el código nuevo a agregar. Está dividido
// en 4 bloques con instrucciones claras sobre dónde pega cada parte.
//
// PASO 1 → Agregar entradas a SHEETS (la constante que ya existe)
// PASO 2 → Agregar cases al switch dentro de handle()
// PASO 3 → Pegar las funciones nuevas al final del archivo .gs
// PASO 4 → Ejecutar inicializarHojas() UNA SOLA VEZ desde el editor
// ================================================================


// ================================================================
// PASO 1 — AGREGAR ESTAS ENTRADAS AL OBJETO SHEETS YA EXISTENTE
// ================================================================
//
// Buscá en tu script la constante SHEETS = { ... } y agregá
// las líneas marcadas con ← NUEVO dentro del objeto.
//
// const SHEETS = {
//   password:            'Password',       // ya existe
//   plantel:             'Plantel',        // ya existe
//   sesionesPenales:     'SesionesPenales',   // ← NUEVO
//   penales:             'Penales',           // ← NUEVO
//   partidos:            'Partidos',          // ← NUEVO
//   concentraciones:     'Concentraciones',   // ← NUEVO
//   concentracionDias:   'ConcentracionDias', // ← NUEVO
//   testeos:             'Testeos',           // ← NUEVO
//   testeosMediciones:   'TesteosMediciones', // ← NUEVO
//   columnasDinamicas:   'ColumnasDinamicas', // ← NUEVO
//   configPlantillas:    'Config_Plantillas', // ← NUEVO
//   configCarpetas:      'Config_Carpetas',   // ← NUEVO
//   documentosGenerados: 'Documentos_Generados', // ← NUEVO
//   antidopingFrecuentes:'Antidoping_Frecuentes', // ← NUEVO
//   antidopingHistorial: 'Antidoping_Historial',  // ← NUEVO
// };


// ================================================================
// PASO 2 — AGREGAR ESTOS CASES DENTRO DEL switch EN handle()
// ================================================================
//
// Buscá la función handle(action, get, post) y dentro del switch(action)
// pegá todos los casos nuevos junto a los que ya existen.
//
// switch (action) {
//   // ── casos existentes ──────────────────────────────────────
//   case 'base_verificarPassword':     ...
//   case 'base_getPlantel':            ...
//
//   // ── BASE (nuevo) ──────────────────────────────────────────
//   case 'base_agregarColumna':        return base_agregarColumna(p);
//
//   // ── PENALES ───────────────────────────────────────────────
//   case 'penales_getSesiones':        return penales_getSesiones();
//   case 'penales_crearSesion':        return penales_crearSesion(p);
//   case 'penales_editarSesion':       return penales_editarSesion(p);
//   case 'penales_getPenales':         return penales_getPenales(p);
//   case 'penales_registrarPenal':     return penales_registrarPenal(p);
//   case 'penales_eliminarPenal':      return penales_eliminarPenal(p);
//   case 'concentraciones_generarConvocatoria': return concentraciones_generarConvocatoria(p);
//   case 'concentraciones_getTiposDocumento':   return concentraciones_getTiposDocumento();
//   case 'concentraciones_validarDatosDocumentos': return concentraciones_validarDatosDocumentos(p);
//   case 'concentraciones_generarDocumentos':    return concentraciones_generarDocumentos(p);
//   case 'concentraciones_getDocumentosGenerados': return concentraciones_getDocumentosGenerados(p);
//
//   // ── PARTIDOS ──────────────────────────────────────────────
//   case 'partidos_getPartidos':       return partidos_getPartidos();
//   case 'partidos_getDetalle':        return partidos_getDetalle(p);
//   case 'partidos_crearPartido':      return partidos_crearPartido(p);
//   case 'partidos_actualizarPartido': return partidos_actualizarPartido(p);
//   case 'partidos_eliminarPartido':   return partidos_eliminarPartido(p);
//   case 'partidos_guardarDetalle':    return partidos_guardarDetalle(p);
//   case 'partidos_guardarConvocatoria': return partidos_guardarConvocatoria(p);
//   case 'partidos_guardarRatings':    return partidos_guardarRatings(p);
//   case 'partidos_agregarMomento':    return partidos_agregarMomento(p);
//   case 'partidos_eliminarMomento':   return partidos_eliminarMomento(p);
//
//   // ── CONCENTRACIONES ───────────────────────────────────────
//   case 'concentraciones_getConcentraciones':  return concentraciones_getConcentraciones();
//   case 'concentraciones_crearConcentracion':  return concentraciones_crearConcentracion(p);
//   case 'concentraciones_editarConcentracion': return concentraciones_editarConcentracion(p);
//   case 'concentraciones_eliminarConcentracion': return concentraciones_eliminarConcentracion(p);
//   case 'concentraciones_getDias':             return concentraciones_getDias(p);
//   case 'concentraciones_agregarActividad':    return concentraciones_agregarActividad(p);
//   case 'concentraciones_editarActividad':     return concentraciones_editarActividad(p);
//   case 'concentraciones_eliminarActividad':   return concentraciones_eliminarActividad(p);

//   // ── ANTIDOPING ────────────────────────────────────────────
//   case 'antidoping_buscarMedicamento':        return antidoping_buscarMedicamento(p);
//   case 'antidoping_getFrecuentes':            return antidoping_getFrecuentes();
//   case 'antidoping_getHistorial':             return antidoping_getHistorial();
//
//   // ── TESTEOS FÍSICOS ───────────────────────────────────────
//   case 'testeos_getTesteos':         return testeos_getTesteos();
//   case 'testeos_crearTesteo':        return testeos_crearTesteo(p);
//   case 'testeos_agregarMedicion':    return testeos_agregarMedicion(p);
//   case 'testeos_editarMedicion':     return testeos_editarMedicion(p);
//   case 'testeos_eliminarMedicion':   return testeos_eliminarMedicion(p);
// }


// ================================================================
// PASO 3 — FUNCIONES NUEVAS (pegar al final del archivo .gs)
// ================================================================


// ────────────────────────────────────────────────────────────────
// HELPERS (agregar solo si no existen en tu script)
// ────────────────────────────────────────────────────────────────

function getColIndex(sheet, colName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  return headers.indexOf(colName) + 1; // 1-indexed; 0 si no existe
}

function parseJson(val) {
  if (!val) return null;
  try { return JSON.parse(val); } catch (_) { return null; }
}

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
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

function tryGetSheet(name) {
  try { return getSheet(name); } catch (_) { return null; }
}

// Genera un UUID v4
function newId() {
  return Utilities.getUuid();
}

// Construye la respuesta JSON estándar {ok, data/error}
function ok(success, data, error) {
  const payload = success
    ? { ok: true, data: data }
    : { ok: false, error: error || 'Error desconocido' };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
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
//   id | sesionId | jugadora | arquera | zona | potencia | resultado | timestamp
//   potencia: 'fuerte' | 'medio' | 'debil'
//   resultado: 'gol' | 'atajado' | 'afuera' | 'palo'
//   zona: '1'-'9' | 'palo-izq' | 'palo-der' | 'travesano' |
//         'fuera-izq' | 'fuera-arr' | 'fuera-der'
//

function penales_getSesiones() {
  return ok(true, sheetToObjects(getSheet(SHEETS.sesionesPenales)).map(_normalizeSesionPenales));
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
  const all = sheetToObjects(_ensurePenalesSheetSchema());
  const sesionId = p && (p.sesionId || p.sesion_id);
  const data = sesionId
    ? all.filter(r => String(r.sesionId) === String(sesionId))
    : all;
  return ok(true, data.map(_normalizePenalPenales));
}

function penales_registrarPenal(p) {
  const sesionId = p.sesionId || p.sesion_id;
  const jugadora = p.jugadora || p.jugadora_dni;
  const arquera = p.arquera || p.arquera_dni || '';
  if (!sesionId || !jugadora) throw new Error('sesionId y jugadora son requeridos');
  const id = newId();
  _ensurePenalesSheetSchema().appendRow([
    id, sesionId, jugadora, arquera,
    p.zona || '', p.potencia || '', p.resultado || '',
    new Date().toISOString()
  ]);
  return ok(true, { id, sesionId, jugadora, arquera });
}

function penales_eliminarPenal(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.penales);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Penal no encontrado');
  sheet.deleteRow(row);
  return ok(true, { id: p.id });
}

function _normalizeSesionPenales(r) {
  return {
    ...r,
    id: r.id,
    nombre: r.nombre || '',
    fecha: r.fecha || '',
    arquera: r.arquera || '',
    notas: r.notas || '',
    timestamp: r.timestamp || r.ts || '',
  };
}

function _normalizePenalPenales(r) {
  return {
    ...r,
    sesionId: r.sesionId || r.sesion_id || '',
    sesion_id: r.sesionId || r.sesion_id || '',
    jugadora_dni: r.jugadora || r.jugadora_dni || '',
    jugadora: r.jugadora || r.jugadora_dni || '',
    arquera_dni: r.arquera || r.arquera_dni || '',
    arquera: r.arquera || r.arquera_dni || '',
    zona: r.zona || '',
    potencia: r.potencia || '',
    resultado: r.resultado || '',
    timestamp: r.timestamp || r.ts || '',
  };
}

function _ensurePenalesSheetSchema() {
  const sheet = getSheet(SHEETS.penales);
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.appendRow(['id', 'sesionId', 'jugadora', 'arquera', 'zona', 'potencia', 'resultado', 'timestamp']);
    return sheet;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String);
  if (headers.includes('arquera')) return sheet;

  const zonaIdx = headers.indexOf('zona');
  if (zonaIdx === -1) {
    sheet.insertColumnAfter(3);
    sheet.getRange(1, 4).setValue('arquera');
    return sheet;
  }

  sheet.insertColumnBefore(zonaIdx + 1);
  sheet.getRange(1, zonaIdx + 1).setValue('arquera');
  return sheet;
}


// ────────────────────────────────────────────────────────────────
// PARTIDOS
// ────────────────────────────────────────────────────────────────
//
// Hoja Partidos (una fila por partido):
//   id | rival | fecha | tipo | nombre |
//   goles_propios | goles_rival |
//   tiros_propios | tiros_rival |
//   corners_propios | corners_rival |
//   faltas_propias | faltas_rival |
//   goles_primer_tiempo | formacion | sistema | notas |
//   convocadas | ratings | momentos | timestamp
//
//   convocadas → JSON: ["Nombre Apellido", ...]
//   ratings    → JSON: {"Nombre Apellido": 7, ...}
//   momentos   → JSON: [{id, tipo, minuto, descripcion, jugadora, timestamp}, ...]
//
//   tipo:    'oficial' | 'amistoso' | 'torneo'
//   momentos tipo: 'gol-propio' | 'gol-rival' | 'pelota-parada' |
//                  'jugada' | 'cambio' | 'tarjeta' | 'nota'
//

function partidos_getPartidos() {
  const rows = sheetToObjects(getSheet(SHEETS.partidos)).map(_parsePartido);
  return ok(true, rows);
}

function partidos_getDetalle(p) {
  if (!p.id) throw new Error('id es requerido');
  const row = sheetToObjects(getSheet(SHEETS.partidos)).find(r => String(r.id) === String(p.id));
  if (!row) throw new Error('Partido no encontrado');
  return ok(true, _parsePartido(row));
}

function _parsePartido(r) {
  return {
    ...r,
    goles_propios:       Number(r.goles_propios       || 0),
    goles_rival:         Number(r.goles_rival         || 0),
    tiros_propios:       Number(r.tiros_propios       || 0),
    tiros_rival:         Number(r.tiros_rival         || 0),
    corners_propios:     Number(r.corners_propios     || 0),
    corners_rival:       Number(r.corners_rival       || 0),
    faltas_propias:      Number(r.faltas_propias      || 0),
    faltas_rival:        Number(r.faltas_rival        || 0),
    goles_primer_tiempo: r.goles_primer_tiempo !== '' ? Number(r.goles_primer_tiempo) : null,
    convocadas:          parseJson(r.convocadas) || [],
    ratings:             parseJson(r.ratings)    || {},
    momentos:            parseJson(r.momentos)   || [],
  };
}

function partidos_crearPartido(p) {
  if (!p.rival || !p.fecha) throw new Error('rival y fecha son requeridos');
  const id = newId();
  getSheet(SHEETS.partidos).appendRow([
    id,
    p.rival,
    p.fecha,
    p.tipo   || 'amistoso',
    p.nombre || '',
    Number(p.goles_propios       || 0),
    Number(p.goles_rival         || 0),
    Number(p.tiros_propios       || 0),
    Number(p.tiros_rival         || 0),
    Number(p.corners_propios     || 0),
    Number(p.corners_rival       || 0),
    Number(p.faltas_propias      || 0),
    Number(p.faltas_rival        || 0),
    p.goles_primer_tiempo !== undefined ? Number(p.goles_primer_tiempo) : '',
    p.formacion || '',
    p.sistema   || '',
    p.notas     || '',
    JSON.stringify([]),   // convocadas vacía
    JSON.stringify({}),   // ratings vacío
    JSON.stringify([]),   // momentos vacío
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
  campos.forEach(f => { if (p[f] !== undefined) setCell(sheet, row, f, p[f]); });
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

// Guarda táctica y notas de la ficha (no toca goles ni stats)
function partidos_guardarDetalle(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Partido no encontrado');
  if (p.formacion !== undefined) setCell(sheet, row, 'formacion', p.formacion);
  if (p.sistema   !== undefined) setCell(sheet, row, 'sistema',   p.sistema);
  if (p.notas     !== undefined) setCell(sheet, row, 'notas',     p.notas);
  return ok(true, { id: p.id });
}

// Parámetros: { id, convocadas: ["Nombre", ...] }
function partidos_guardarConvocatoria(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Partido no encontrado');
  setCell(sheet, row, 'convocadas', JSON.stringify(p.convocadas || []));
  return ok(true, { id: p.id });
}

// Parámetros: { id, ratings: {"Nombre": 7, ...} }
function partidos_guardarRatings(p) {
  if (!p.id) throw new Error('id es requerido');
  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Partido no encontrado');
  setCell(sheet, row, 'ratings', JSON.stringify(p.ratings || {}));
  return ok(true, { id: p.id });
}

// Parámetros: { id, tipo, minuto?, descripcion?, jugadora? }
// Los momentos se ordenan por minuto antes de guardar
function partidos_agregarMomento(p) {
  if (!p.id || !p.tipo) throw new Error('id y tipo son requeridos');
  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Partido no encontrado');

  const col = getColIndex(sheet, 'momentos');
  const lista = parseJson(sheet.getRange(row, col).getValue()) || [];
  const momento = {
    id:          newId(),
    tipo:        p.tipo,
    minuto:      p.minuto !== undefined && p.minuto !== '' ? Number(p.minuto) : null,
    descripcion: p.descripcion || '',
    jugadora:    p.jugadora   || '',
    timestamp:   new Date().toISOString()
  };
  lista.push(momento);
  lista.sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999));
  sheet.getRange(row, col).setValue(JSON.stringify(lista));
  return ok(true, momento);
}

// Parámetros: { id, momentoId }
function partidos_eliminarMomento(p) {
  if (!p.id || !p.momentoId) throw new Error('id y momentoId son requeridos');
  const sheet = getSheet(SHEETS.partidos);
  const row = findRowIndex(sheet, 'id', p.id);
  if (row === -1) throw new Error('Partido no encontrado');

  const col = getColIndex(sheet, 'momentos');
  const lista = (parseJson(sheet.getRange(row, col).getValue()) || [])
    .filter(m => String(m.id) !== String(p.momentoId));
  sheet.getRange(row, col).setValue(JSON.stringify(lista));
  return ok(true, { momentoId: p.momentoId });
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

// Parámetros: { concentracionId, id, nombre, lugar, fechaInicio, fechaFin, notas, convocadas_json }
// Mantiene el contrato del frontend actual, pero deja listo el punto único
// para el flujo documental de concentraciones.
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

function concentraciones_generarDocumentos(p) {
  const conc = _getConcentracionParaDocumentos(p);
  if (!conc) throw new Error('Concentración no encontrada');
  const tipos = _normalizarTiposDocumento(p.tiposDocumento || p.tipoDocumento || p.tipos_documento || (p.tipoDocumento ? [p.tipoDocumento] : []));
  const tiposFinales = tipos.length ? tipos : ['convocatoria_fadec'];
  const convocadas = _convocadasConcentracion(conc, p);
  const validacionData = _validarDatosDocumentosConcentracion({
    ...p,
    concentracionId: conc.id,
    tiposDocumento: tiposFinales
  });
  const documentosSheet = _ensureHojaDocumentosGenerados();
  const generados = tiposFinales.map(tipo => {
    const cfg = _tiposDocumentoConcentraciones().find(t => t.clave === tipo) || {};
    const id = newId();
    const url = '';
    const nombre = _nombreDocumentoConcentraciones(tipo, conc);
    const registro = [
      id,
      conc.id,
      tipo,
      nombre,
      url,
      validacionData.valido ? 'generado' : 'pendiente',
      validacionData.faltantes.join(', '),
      new Date().toISOString()
    ];
    documentosSheet.appendRow(registro);
    return {
      id,
      concentracionId: conc.id,
      tipoDocumento: tipo,
      nombre,
      url,
      estado: validacionData.valido ? 'generado' : 'pendiente',
      faltantes: validacionData.faltantes,
      convocadas,
      plantillaId: cfg.plantillaId || '',
      carpetaId: cfg.carpetaId || ''
    };
  });
  const primerUrl = generados.find(d => d.url)?.url || '';
  return ok(true, {
    concentracionId: conc.id,
    url: primerUrl,
    documentUrl: primerUrl,
    pdfUrl: primerUrl,
    documentos: generados,
    validacion: validacionData
  });
}

function _validarDatosDocumentosConcentracion(p) {
  const conc = _getConcentracionParaDocumentos(p);
  const tipos = _normalizarTiposDocumento(p.tiposDocumento || p.tipoDocumento || p.tipos_documento || []);
  const convocadas = _convocadasConcentracion(conc, p);
  const faltantes = [];
  if (!conc) faltantes.push('concentracion');
  if (tipos.includes('convocatoria_fadec') && !convocadas.length) faltantes.push('convocadas');
  tipos.forEach(tipo => {
    const cfg = _tiposDocumentoConcentraciones().find(t => t.clave === tipo);
    if (!cfg) faltantes.push(`tipo:${tipo}`);
    if (cfg && cfg.requiereNombre && !(conc && conc.nombre)) faltantes.push('nombre');
    if (cfg && cfg.requiereFecha && !(conc && conc.fechaInicio)) faltantes.push('fechaInicio');
    if (cfg && cfg.requiereConvocadas && !convocadas.length) faltantes.push('convocadas');
  });
  return {
    concentracionId: conc ? conc.id : (p.concentracionId || p.id || ''),
    tiposDocumento: tipos,
    convocadas,
    faltantes: Array.from(new Set(faltantes)),
    valido: faltantes.length === 0
  };
}

function concentraciones_getDocumentosGenerados(p) {
  const sheet = _ensureHojaDocumentosGenerados();
  const all = sheetToObjects(sheet).map(_normalizarDocumentoGenerado);
  const concId = p && (p.concentracionId || p.id);
  const data = concId ? all.filter(d => String(d.concentracionId) === String(concId)) : all;
  return ok(true, data);
}

function _tiposDocumentoConcentraciones() {
  return [
    {
      clave: 'convocatoria_fadec',
      nombre: 'Convocatoria FADEC',
      plantillaId: _leerPlantillaDoc('convocatoria_fadec').plantillaId || '',
      carpetaId: _leerCarpetaDoc('convocatoria_fadec').folderId || _leerPlantillaDoc('convocatoria_fadec').carpetaId || '',
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: true
    },
    {
      clave: 'licencia_agencia_cordoba',
      nombre: 'Licencia Agencia Córdoba',
      plantillaId: _leerPlantillaDoc('licencia_agencia_cordoba').plantillaId || '',
      carpetaId: _leerCarpetaDoc('licencia_agencia_cordoba').folderId || _leerPlantillaDoc('licencia_agencia_cordoba').carpetaId || '',
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: false
    },
    {
      clave: 'licencia_municipalidad_cordoba',
      nombre: 'Licencia Municipalidad Córdoba',
      plantillaId: _leerPlantillaDoc('licencia_municipalidad_cordoba').plantillaId || '',
      carpetaId: _leerCarpetaDoc('licencia_municipalidad_cordoba').folderId || _leerPlantillaDoc('licencia_municipalidad_cordoba').carpetaId || '',
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: false
    },
    {
      clave: 'certificacion_participacion',
      nombre: 'Certificación de participación',
      plantillaId: _leerPlantillaDoc('certificacion_participacion').plantillaId || '',
      carpetaId: _leerCarpetaDoc('certificacion_participacion').folderId || _leerPlantillaDoc('certificacion_participacion').carpetaId || '',
      requiereNombre: true,
      requiereFecha: true,
      requiereConvocadas: true
    }
  ];
}

function _normalizarTiposDocumento(v) {
  const arr = Array.isArray(v) ? v : (v ? [v] : []);
  return arr.map(x => String(x || '').trim()).filter(Boolean);
}

function _getConcentracionParaDocumentos(p) {
  const id = p && (p.concentracionId || p.id);
  if (!id) return null;
  const conc = sheetToObjects(getSheet(SHEETS.concentraciones)).find(r => String(r.id) === String(id));
  if (!conc) return null;
  return {
    ...conc,
    id: conc.id,
    nombre: conc.nombre || '',
    fechaInicio: conc.fechaInicio || conc.fecha_inicio || '',
    fechaFin: conc.fechaFin || conc.fecha_fin || '',
    lugar: conc.lugar || '',
    notas: conc.notas || '',
    convocadas_json: conc.convocadas_json || conc.convocadasJson || conc.convocadas || '[]'
  };
}

function _convocadasConcentracion(conc, p) {
  const raw = (p && (p.convocadas_json || p.convocadasJson || p.convocadas)) || (conc && (conc.convocadas_json || conc.convocadasJson || conc.convocadas)) || '[]';
  const parsed = parseJson(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function _nombreDocumentoConcentraciones(tipo, conc) {
  const base = conc && conc.nombre ? conc.nombre : 'Concentración';
  const mapa = {
    convocatoria_fadec: 'Convocatoria FADEC',
    licencia_agencia_cordoba: 'Licencia Agencia Córdoba',
    licencia_municipalidad_cordoba: 'Licencia Municipalidad Córdoba',
    certificacion_participacion: 'Certificación de participación'
  };
  return `${mapa[tipo] || tipo} · ${base}`;
}

function _normalizarDocumentoGenerado(r) {
  return {
    ...r,
    concentracionId: r.concentracionId || r.concentracion_id || '',
    tipoDocumento: r.tipoDocumento || r.tipo_documento || '',
    nombre: r.nombre || '',
    url: r.url || '',
    estado: r.estado || '',
    error: r.error || '',
    timestamp: r.timestamp || r.ts || '',
  };
}

function _ensureHojaDocumentosGenerados() {
  let sheet = tryGetSheet(SHEETS.documentosGenerados);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEETS.documentosGenerados);
    sheet.getRange(1, 1, 1, 8).setValues([['id', 'concentracionId', 'tipoDocumento', 'nombre', 'url', 'estado', 'error', 'timestamp']]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.appendRow(['id', 'concentracionId', 'tipoDocumento', 'nombre', 'url', 'estado', 'error', 'timestamp']);
    return sheet;
  }
  return sheet;
}

function _leerPlantillaDoc(clave) {
  const sheet = tryGetSheet(SHEETS.configPlantillas);
  if (!sheet) return {};
  const match = sheetToObjects(sheet).find(r => normalizeText(r.clave) === normalizeText(clave));
  return match || {};
}

function _leerCarpetaDoc(clave) {
  const sheet = tryGetSheet(SHEETS.configCarpetas);
  if (!sheet) return {};
  const match = sheetToObjects(sheet).find(r => normalizeText(r.clave) === normalizeText(clave));
  return match || {};
}

// ────────────────────────────────────────────────────────────────
// ANTIDOPING
// ────────────────────────────────────────────────────────────────
//
// Contrato de referencia para consultas internas. La lógica real puede
// apoyarse en una hoja de revisión o en una base externa.
//

const _ANTIDOPING_FALLBACK_FRECUENTES = [
  { medicamento: 'Paracetamol', principioActivo: 'Paracetamol', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Usar criterio clínico y revisar vía de administración.' },
  { medicamento: 'Ibuprofeno', principioActivo: 'Ibuprofeno', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Revisar contexto y dosis.' },
  { medicamento: 'Loratadina', principioActivo: 'Loratadina', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Confirmar principio activo y formulación.' },
  { medicamento: 'Cetirizina', principioActivo: 'Cetirizina', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Confirmar principio activo y formulación.' },
  { medicamento: 'Amoxicilina', principioActivo: 'Amoxicilina', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Antibiótico, revisar indicación médica.' },
  { medicamento: 'Omeprazol', principioActivo: 'Omeprazol', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Verificar presentación comercial.' }
];

function antidoping_buscarMedicamento(p) {
  const consulta = String(p.consulta || p.q || p.medicamento || '').trim();
  if (!consulta) throw new Error('consulta es requerida');

  const resultados = _buscarEnCatalogoAntidoping(consulta);
  _antidopingRegistrarHistorial({
    consulta,
    resultado: resultados[0] || null
  });

  return ok(true, resultados.length === 1 ? resultados[0] : resultados);
}

function antidoping_getFrecuentes() {
  const sheet = tryGetSheet(SHEETS.antidopingFrecuentes);
  if (!sheet) return ok(true, _ANTIDOPING_FALLBACK_FRECUENTES.map(_normalizarAntidoping));
  const data = sheetToObjects(sheet);
  if (data.length) return ok(true, data.map(_normalizarAntidoping));
  return ok(true, _ANTIDOPING_FALLBACK_FRECUENTES.map(_normalizarAntidoping));
}

function antidoping_getHistorial() {
  const sheet = tryGetSheet(SHEETS.antidopingHistorial);
  if (!sheet) return ok(true, []);
  return ok(true, sheetToObjects(sheet).map(_normalizarAntidopingHistorial));
}

function _buscarEnCatalogoAntidoping(consulta) {
  const q = normalizeText(consulta);
  const catalogo = [
    ..._ANTIDOPING_FALLBACK_FRECUENTES,
    { medicamento: 'Salbutamol', principioActivo: 'Salbutamol', estado: 'CONDICIONADO / REQUIERE REVISIÓN', observaciones: 'Verificar inhalador y dosis.' },
    { medicamento: 'Budesonida', principioActivo: 'Budesonida', estado: 'NO FIGURA COMO PROHIBIDO / REQUIERE VERIFICACIÓN', observaciones: 'Revisar contexto clínico.' },
    { medicamento: 'Dexametasona', principioActivo: 'Dexametasona', estado: 'CONDICIONADO / REQUIERE REVISIÓN', observaciones: 'Revisar vía, dosis y ventana de competencia.' }
  ];
  return catalogo.filter(item => {
    const hay = [item.medicamento, item.principioActivo, item.observaciones].map(normalizeText).join(' ');
    return hay.includes(q);
  }).map(_normalizarAntidoping);
}

function _antidopingRegistrarHistorial(entry) {
  const sheet = _ensureHojaAntidopingHistorial();
  const id = newId();
  const resultado = entry.resultado || {};
  sheet.appendRow([
    id,
    entry.consulta || '',
    resultado.medicamento || '',
    resultado.principioActivo || resultado.principio_activo || '',
    resultado.estado || '',
    resultado.observaciones || '',
    new Date().toISOString()
  ]);
}

function _ensureHojaAntidopingHistorial() {
  let sheet = tryGetSheet(SHEETS.antidopingHistorial);
  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet(SHEETS.antidopingHistorial);
    sheet.getRange(1, 1, 1, 7).setValues([['id', 'consulta', 'medicamento', 'principioActivo', 'estado', 'observaciones', 'timestamp']]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastColumn() === 0) {
    sheet.appendRow(['id', 'consulta', 'medicamento', 'principioActivo', 'estado', 'observaciones', 'timestamp']);
  }
  return sheet;
}

function _normalizarAntidoping(r) {
  return {
    ...r,
    medicamento: r.medicamento || r.nombre_comercial || '',
    principioActivo: r.principioActivo || r.principio_activo || '',
    estado: r.estado || r.resultado || '',
    observaciones: r.observaciones || '',
    fuente_argentina: r.fuente_argentina || r.fuenteArgentina || 'Referencia interna',
    fuente_wada: r.fuente_wada || r.fuenteWada || 'Referencia interna',
    fuente_secundaria: r.fuente_secundaria || r.fuenteSecundaria || 'Referencia interna',
    fecha_revision: r.fecha_revision || r.fechaRevision || new Date().toISOString().slice(0, 10)
  };
}

function _normalizarAntidopingHistorial(r) {
  return {
    ...r,
    consulta: r.consulta || '',
    medicamento: r.medicamento || '',
    principioActivo: r.principioActivo || r.principio_activo || '',
    estado: r.estado || '',
    observaciones: r.observaciones || '',
    timestamp: r.timestamp || r.ts || ''
  };
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
      headers: ['id', 'sesionId', 'jugadora', 'arquera', 'zona', 'potencia', 'resultado', 'timestamp']
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
    {
      nombre: 'Config_Plantillas',
      headers: ['id', 'clave', 'nombre', 'plantillaId', 'carpetaId', 'activo', 'notas', 'timestamp']
    },
    {
      nombre: 'Config_Carpetas',
      headers: ['id', 'clave', 'nombre', 'folderId', 'activo', 'notas', 'timestamp']
    },
    {
      nombre: 'Documentos_Generados',
      headers: ['id', 'concentracionId', 'tipoDocumento', 'nombre', 'url', 'estado', 'error', 'timestamp']
    },
    {
      nombre: 'Antidoping_Frecuentes',
      headers: ['id', 'medicamento', 'principioActivo', 'estado', 'observaciones', 'fuenteArg', 'fuenteWada', 'fuenteSecundaria', 'timestamp']
    },
    {
      nombre: 'Antidoping_Historial',
      headers: ['id', 'consulta', 'medicamento', 'principioActivo', 'estado', 'observaciones', 'timestamp']
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
