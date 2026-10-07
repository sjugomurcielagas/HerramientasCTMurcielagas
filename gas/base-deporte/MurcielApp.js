// MurcielApp: accesos y registros personales. Las rutinas siguen en su propia fuente.
var MURCI_ACCESS_HEADERS_ = ['Persona_ID', 'Email', 'CodigoHash', 'CodigoVence', 'CodigoUsado', 'Enviado', 'Estado'];
var MURCI_SESSION_HEADERS_ = ['TokenHash', 'Persona_ID', 'Vence', 'Creado'];
var MURCI_ADMIN_SESSION_HEADERS_ = ['TokenHash', 'Vence', 'Creado', 'Revocado'];
var MURCI_STIMULUS_HEADERS_ = ['ID', 'Persona_ID', 'Fecha', 'Tipo', 'Subtipo', 'DuracionMin', 'sRPE', 'Creado'];
var MURCI_APP_URL_ = 'https://sjugomurcielagas.github.io/HerramientasCTMurcielagas/murcielapp/';

function murcielapp_verificarPermisoCorreo() {
  return MailApp.getRemainingDailyQuota();
}

function murcielapp_sheet_(name, headers) {
  var book = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else {
    var current = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
    if (current.join('|') !== headers.join('|')) throw new Error('Columnas inesperadas en ' + name);
  }
  return sheet;
}

function murcielapp_rows_(sheet, headers) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function(values, index) {
    var row = { _row: index + 2 };
    headers.forEach(function(header, column) { row[header] = values[column]; });
    return row;
  });
}

function murcielapp_hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value))
    .map(function(byte) { return ('0' + (byte & 255).toString(16)).slice(-2); }).join('');
}

function murcielapp_code_() {
  var digits = '';
  while (digits.length < 8) {
    var uuid = Utilities.getUuid().replace(/-/g, '').toUpperCase();
    for (var i = 0; i < uuid.length && digits.length < 8; i++) {
      if (i !== 12 && i !== 16 && uuid.charAt(i) <= '9') digits += uuid.charAt(i);
    }
  }
  return digits;
}

function murcielapp_unusedCode_(rows) {
  for (var attempt = 0; attempt < 10; attempt++) {
    var code = murcielapp_code_();
    var hash = murcielapp_hash_(code);
    if (!rows.some(function(row) {
      return String(row.CodigoHash) === hash;
    })) return code;
  }
  throw new Error('No se pudo generar el código. Intentá nuevamente.');
}

function murcielapp_admin_(payload) {
  var token = String(payload && payload.adminToken || '');
  if (token) {
    if (!/^[a-fA-F0-9]{64}$/.test(token)) throw new Error('Acceso administrativo vencido. Ingresá la clave nuevamente.');
    var sessions = murcielapp_rows_(murcielapp_sheet_('MurcielApp_AdminSesiones', MURCI_ADMIN_SESSION_HEADERS_), MURCI_ADMIN_SESSION_HEADERS_);
    var hash = murcielapp_hash_(token);
    if (!sessions.some(function(row) {
      return String(row.TokenHash) === hash && !String(row.Revocado) && new Date(row.Vence).getTime() > Date.now();
    })) throw new Error('Acceso administrativo vencido. Ingresá la clave nuevamente.');
    return;
  }
  var expected = PropertiesService.getScriptProperties().getProperty('MURCIELAPP_ADMIN_KEY');
  if (!expected || expected.length < 32) throw new Error('Falta configurar el acceso administrativo de MurcielApp.');
  if (!payload || murcielapp_hash_(payload.adminKey || '') !== murcielapp_hash_(expected)) {
    throw new Error('Acceso administrativo inválido.');
  }
}

function murcielapp_adminSesion(payload) {
  murcielapp_admin_({ adminKey: payload && payload.adminKey });
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  var now = Date.now();
  murcielapp_sheet_('MurcielApp_AdminSesiones', MURCI_ADMIN_SESSION_HEADERS_).appendRow([
    murcielapp_hash_(token), new Date(now + 30 * 86400000).toISOString(), new Date(now).toISOString(), ''
  ]);
  return { token: token, expiresInDays: 30 };
}

function murcielapp_adminCerrarSesion(payload) {
  if (!payload || !/^[a-fA-F0-9]{64}$/.test(String(payload.adminToken || ''))) throw new Error('Acceso administrativo vencido. Ingresá la clave nuevamente.');
  murcielapp_admin_(payload);
  var hash = murcielapp_hash_(payload.adminToken);
  var sheet = murcielapp_sheet_('MurcielApp_AdminSesiones', MURCI_ADMIN_SESSION_HEADERS_);
  var row = murcielapp_rows_(sheet, MURCI_ADMIN_SESSION_HEADERS_).find(function(item) { return String(item.TokenHash) === hash; });
  sheet.getRange(row._row, 4).setValue(new Date().toISOString());
  return { cerrado: true };
}

function murcielapp_activePlayers_() {
  return getAllRows_().filter(function(person) {
    var type = String(person.Tipo_Integrante || '').toLowerCase();
    var active = String(person.Activo || '').toLowerCase();
    var state = String(person.Estado_Plantel || '').toLowerCase();
    return (type.indexOf('jugadora') >= 0 || type.indexOf('arquera') >= 0) &&
      active !== 'no' && state.indexOf('baja') < 0 && state.indexOf('inactiva') < 0;
  });
}

function murcielapp_email_(value) {
  return String(value || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').trim();
}

function murcielapp_date_(value) {
  return Object.prototype.toString.call(value) === '[object Date]' ? Utilities.formatDate(value, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd') : String(value || '').slice(0, 10);
}

function murcielapp_destinatarias(payload) {
  murcielapp_admin_(payload);
  var players = murcielapp_activePlayers_();
  var counts = {};
  players.forEach(function(person) {
    var email = murcielapp_email_(person.Email).toLowerCase();
    if (email) counts[email] = (counts[email] || 0) + 1;
  });
  var access = murcielapp_rows_(murcielapp_sheet_('MurcielApp_Accesos', MURCI_ACCESS_HEADERS_), MURCI_ACCESS_HEADERS_);
  return players.map(function(person) {
    var id = String(person[PERSONA_ID_COLUMN] || '').trim();
    var email = murcielapp_email_(person.Email);
    var personAccess = access.filter(function(row) { return String(row.Persona_ID) === id; });
    var latest = personAccess[personAccess.length - 1];
    var problem = !id ? 'Sin identificador' : !email ? 'Sin correo' :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Correo inválido' :
      counts[email.toLowerCase()] > 1 ? 'Correo repetido' : '';
    return {
      personaId: id,
      nombre: [person.Apellido, person.Nombre].filter(Boolean).join(', '),
      email: email,
      problema: problem,
      estado: latest && String(latest.Estado) === 'enviado' && !String(latest.CodigoUsado) ? 'Código enviado' :
        personAccess.some(function(row) { return !!String(row.CodigoUsado); }) ? 'Activado' : 'Pendiente'
    };
  });
}

function murcielapp_sendCode_(sheet, person, rows, recovery) {
  var raw = murcielapp_unusedCode_(rows);
  var code = raw.slice(0, 4) + ' ' + raw.slice(4);
  sheet.appendRow([person.personaId, person.email, murcielapp_hash_(raw), '', '', '', 'preparado']);
  var rowNo = sheet.getLastRow();
  try {
    MailApp.sendEmail({
      to: person.email,
      subject: recovery ? 'Nuevo código de acceso a MurcielApp' : 'Tu acceso personal a MurcielApp',
      body: 'Hola ' + person.nombre + ',\n\nTu ' + (recovery ? 'nuevo código personal' : 'código personal') + ' para entrar a MurcielApp es: ' + code +
        '\n\nSon 8 números. Podés ingresarlos juntos o con espacio. Abrí ' + MURCI_APP_URL_ +
        ' y guardá este correo: el mismo código te sirve cada vez que cambies de teléfono o navegador. No lo compartas.\n\nLas Murciélagas'
    });
    sheet.getRange(rowNo, 6, 1, 2).setValues([[new Date().toISOString(), 'enviado']]);
    return { personaId: person.personaId, estado: 'enviado' };
  } catch (error) {
    sheet.getRange(rowNo, 7).setValue('fallo_envio');
    return { personaId: person.personaId, estado: 'fallo_envio' };
  }
}

function murcielapp_enviarCodigos(payload) {
  murcielapp_admin_(payload);
  var ids = Array.isArray(payload.personaIds) ? payload.personaIds.map(String) : [];
  if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length) throw new Error('Elegí entre una y cinco destinatarias por envío.');
  var preview = murcielapp_destinatarias(payload);
  var selected = ids.map(function(id) {
    var person = preview.find(function(item) { return item.personaId === id; });
    if (!person || person.problema) throw new Error('Hay una destinataria sin correo válido. Volvé a revisar la lista.');
    return person;
  });
  if (MailApp.getRemainingDailyQuota() < selected.filter(function(person) { return person.estado === 'Pendiente'; }).length) {
    throw new Error('La cuota diaria de correo es insuficiente para este envío.');
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Hay otro envío en curso. Intentá nuevamente.');
  try {
    var sheet = murcielapp_sheet_('MurcielApp_Accesos', MURCI_ACCESS_HEADERS_);
    var result = [];
    selected.forEach(function(person) {
      var rows = murcielapp_rows_(sheet, MURCI_ACCESS_HEADERS_);
      var current = rows.filter(function(row) { return String(row.Persona_ID) === person.personaId; }).pop();
      if (current && String(current.CodigoUsado)) {
        result.push({ personaId: person.personaId, estado: 'ya_activado' });
        return;
      }
      if (current && String(current.Estado) === 'enviado') {
        result.push({ personaId: person.personaId, estado: 'ya_enviado' });
        return;
      }
      result.push(murcielapp_sendCode_(sheet, person, rows, false));
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function murcielapp_reenviarCodigo(payload) {
  murcielapp_admin_(payload);
  var id = String(payload && payload.personaId || '').trim();
  var person = murcielapp_destinatarias(payload).find(function(item) { return item.personaId === id; });
  if (!person || person.problema || person.estado === 'Pendiente') throw new Error('Esta destinataria no tiene un acceso recuperable. Revisá la lista.');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('La cuota diaria de correo es insuficiente.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Hay otro envío en curso. Intentá nuevamente.');
  try {
    var sheet = murcielapp_sheet_('MurcielApp_Accesos', MURCI_ACCESS_HEADERS_);
    var rows = murcielapp_rows_(sheet, MURCI_ACCESS_HEADERS_);
    var latest = rows.filter(function(row) { return String(row.Persona_ID) === id && String(row.Estado) === 'enviado'; }).pop();
    if (latest && new Date(latest.Enviado).getTime() > Date.now() - 10 * 60000) {
      throw new Error('Ya se envió un código hace menos de 10 minutos. Revisá el correo antes de pedir otro.');
    }
    return murcielapp_sendCode_(sheet, person, rows, true);
  } finally {
    lock.releaseLock();
  }
}

function murcielapp_codigoPrueba(payload) {
  murcielapp_admin_(payload);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Intentá nuevamente.');
  try {
    var sheet = murcielapp_sheet_('MurcielApp_Accesos', MURCI_ACCESS_HEADERS_);
    var raw = murcielapp_unusedCode_(murcielapp_rows_(sheet, MURCI_ACCESS_HEADERS_));
    sheet.appendRow([
      'TEST_SANTIAGO', '', murcielapp_hash_(raw), '', '', '', 'enviado'
    ]);
    return { code: raw.slice(0, 4) + ' ' + raw.slice(4) };
  } finally {
    lock.releaseLock();
  }
}

function murcielapp_activar(payload) {
  var code = String(payload.code || '').replace(/[\s-]/g, '').toUpperCase();
  if (!/^\d{8}$/.test(code) && !/^[A-F0-9]{20}$/.test(code)) throw new Error('Código no válido. Revisá el último correo que recibiste.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Intentá nuevamente.');
  try {
    var cache = CacheService.getScriptCache();
    var failures = Number(cache.get('murcielapp_activation_failures') || 0);
    if (failures >= 40) throw new Error('Demasiados intentos. Probá de nuevo en 10 minutos.');
    var sheet = murcielapp_sheet_('MurcielApp_Accesos', MURCI_ACCESS_HEADERS_);
    var hash = murcielapp_hash_(code);
    var rows = murcielapp_rows_(sheet, MURCI_ACCESS_HEADERS_);
    var row = rows.find(function(item) {
      return String(item.CodigoHash) === hash && String(item.Estado) === 'enviado' &&
        rows.filter(function(other) { return String(other.Persona_ID) === String(item.Persona_ID) && String(other.Estado) === 'enviado'; }).pop()._row === item._row;
    });
    if (!row) {
      cache.put('murcielapp_activation_failures', String(failures + 1), 600);
      throw new Error('Código no válido. Revisá el último correo que recibiste.');
    }
    var player = String(row.Persona_ID) === 'TEST_SANTIAGO' ? { Persona_ID: 'TEST_SANTIAGO', Nombre: 'Santiago' } : murcielapp_activePlayers_().find(function(person) {
      return String(person[PERSONA_ID_COLUMN]) === String(row.Persona_ID) &&
        murcielapp_email_(person.Email).toLowerCase() === murcielapp_email_(row.Email).toLowerCase();
    });
    if (!player) throw new Error('Este acceso ya no está disponible.');
    var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    murcielapp_sheet_('MurcielApp_Sesiones', MURCI_SESSION_HEADERS_).appendRow([
      murcielapp_hash_(token), row.Persona_ID, new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), new Date().toISOString()
    ]);
    if (!String(row.CodigoUsado)) sheet.getRange(row._row, 5).setValue(new Date().toISOString());
    return { token: token, nombre: String(player.Nombre || '').trim() };
  } finally {
    lock.releaseLock();
  }
}

function murcielapp_persona_(payload) {
  var token = String(payload.token || '');
  if (!/^[A-Fa-f0-9]{64}$/.test(token)) throw new Error('Ingresá tu código personal para continuar.');
  var hash = murcielapp_hash_(token);
  var session = murcielapp_rows_(murcielapp_sheet_('MurcielApp_Sesiones', MURCI_SESSION_HEADERS_), MURCI_SESSION_HEADERS_)
    .find(function(row) { return String(row.TokenHash) === hash && new Date(row.Vence).getTime() > Date.now(); });
  if (!session) throw new Error('Tu acceso venció. Volvé a ingresar tu código personal.');
  var person = String(session.Persona_ID) === 'TEST_SANTIAGO' ? { Persona_ID: 'TEST_SANTIAGO', Nombre: 'Santiago' } : murcielapp_activePlayers_().find(function(item) {
    return String(item[PERSONA_ID_COLUMN]) === String(session.Persona_ID);
  });
  if (!person) throw new Error('El acceso no está disponible.');
  return person;
}

function murcielapp_sesion(payload) {
  var person = murcielapp_persona_(payload);
  return { nombre: String(person.Nombre || '').trim() };
}

function murcielapp_registrarEstimulo(payload) {
  var person = murcielapp_persona_(payload);
  var date = String(payload.fecha || '');
  var type = String(payload.tipo || '');
  var subtype = String(payload.subtipo || '').trim();
  var duration = Number(payload.duracionMin);
  var srpe = payload.sRPE === null || payload.sRPE === undefined ? null : Number(payload.sRPE);
  var requestId = String(payload.requestId || '');
  var today = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  var parsed = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed.getTime()) ||
      Utilities.formatDate(parsed, 'GMT', 'yyyy-MM-dd') !== date || date > today) throw new Error('Fecha inválida.');
  if (['fisico', 'tecnico', 'otros'].indexOf(type) < 0) throw new Error('Tipo inválido.');
  if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error('Duración inválida.');
  if (type === 'otros') {
    if (!subtype || subtype.length > 80 || srpe !== null) throw new Error('Actividad inválida.');
  } else if (!Number.isInteger(srpe) || srpe < 0 || srpe > 10 || subtype) throw new Error('Intensidad inválida.');
  if (!/^[A-Za-z0-9-]{8,80}$/.test(requestId)) throw new Error('Solicitud inválida.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Intentá nuevamente.');
  try {
    var sheet = murcielapp_sheet_('MurcielApp_Estimulos', MURCI_STIMULUS_HEADERS_);
    var existing = murcielapp_rows_(sheet, MURCI_STIMULUS_HEADERS_).find(function(row) {
      return String(row.ID) === requestId && String(row.Persona_ID) === String(person[PERSONA_ID_COLUMN]);
    });
    if (existing) return { id: requestId, yaRegistrado: true };
    sheet.appendRow([requestId, person[PERSONA_ID_COLUMN], date, type, subtype, duration, srpe === null ? '' : srpe, new Date().toISOString()]);
    return { id: requestId, yaRegistrado: false };
  } finally {
    lock.releaseLock();
  }
}

function murcielapp_miSemana(payload) {
  var person = murcielapp_persona_(payload);
  var today = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  var sevenDaysAgo = Utilities.formatDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  return murcielapp_rows_(murcielapp_sheet_('MurcielApp_Estimulos', MURCI_STIMULUS_HEADERS_), MURCI_STIMULUS_HEADERS_)
    .filter(function(row) { return String(row.Persona_ID) === String(person[PERSONA_ID_COLUMN]) && murcielapp_date_(row.Fecha) >= sevenDaysAgo && murcielapp_date_(row.Fecha) <= today; })
    .map(function(row) { return { id: row.ID, fecha: murcielapp_date_(row.Fecha), tipo: row.Tipo, subtipo: row.Subtipo, duracionMin: row.DuracionMin, sRPE: row.sRPE }; })
    .sort(function(a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
}
