// ============================================================
// Murciélagas · Cloudflare Worker
// Versión: 2.2 — Reportes + Base/Deportes unificados
// ============================================================

const REPORTES_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIdqciZ_o_YVS_EYV2xYCMyrRLhEXCyd9s0gxeuiGX9YwvwHtiPYPO3hUUKc7Y-kBe/exec';

const BASE_DEPORTE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxQO-sm8R29-fLFQ0tSHCGkZSFCLUKH5lvqp6sInQcc7S1WbA5VIKsuFxkt5odS_igX/exec';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sjugomurcielagas.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const REPORTES_ACTIONS = [
  'getClientData',
  'generateClientReport',
  'generarAuditoriaDatos'
];

const BASE_ACTION_MAP = {
  base_verificarPassword: 'verificarPassword',
  base_getPlantel: 'getPlantel',
  base_getFicha: 'getFicha',
  base_getFaltantes: 'getFaltantes',
  base_getAlertas: 'getAlertas',
  base_guardarCambios: 'guardarCambios',
  base_darDeBaja: 'darDeBaja',
  base_subirArchivo: 'subirArchivo',
  base_actualizarProvinciasFaltantes: 'base_actualizarProvinciasFaltantes',

  // En tu Apps Script la función se llama base_agregarColumna
  base_agregarColumna: 'base_agregarColumna',

  // WADA helpers
  importarWADA: 'importarWADA',
  getWADAStatus: 'getWADAStatus'
};

const DEPORTES_PREFIXES = [
  'penales_',
  'partidos_',
  'concentraciones_',
  'testeos_'
];

const ANTIDOPING_PREFIXES = [
  'antidoping_'
];

const SITE_ACTIONS = [
  'site_getPlantel',
  'site_getContext',
  'site_getPersonaContext',
  'site_lookupPersona'
];

// El Worker decide el destino por acción:
// - REPORTES_ACTIONS -> gas/reportes
// - BASE_ACTION_MAP   -> gas/base-deporte (alias base_* hacia funciones legacy)
// - DEPORTES_PREFIXES -> gas/base-deporte (módulos deportivos)
// - ANTIDOPING_PREFIXES -> gas/base-deporte (módulo antidoping)

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      let action = '';
      let payload = {};

      if (request.method === 'GET') {
        const url = new URL(request.url);
        action = url.searchParams.get('action') || '';
        payload = Object.fromEntries(url.searchParams.entries());
      }

      if (request.method === 'POST') {
        const text = await request.text();

        try {
          payload = text ? JSON.parse(text) : {};
        } catch (error) {
          return jsonResponse({
            ok: false,
            error: 'El cuerpo del POST no es JSON válido.'
          }, 400);
        }

        action = payload.action || '';
      }

      if (!action) {
        return jsonResponse({
          ok: false,
          error: 'Falta action.'
        }, 400);
      }

      let targetResponse;

      if (REPORTES_ACTIONS.includes(action)) {
        targetResponse = await handleReportesAction(action, payload);
      } else if (SITE_ACTIONS.includes(action)) {
        targetResponse = await handleSiteAction(action, payload);
      } else if (action in BASE_ACTION_MAP) {
        targetResponse = await handleBaseAction(action, payload);
      } else if (DEPORTES_PREFIXES.some(prefix => action.startsWith(prefix))) {
        targetResponse = await handleDeportesAction(action, payload);
      } else if (ANTIDOPING_PREFIXES.some(prefix => action.startsWith(prefix))) {
        targetResponse = await handleAntidopingAction(action, payload);
      } else {
        return jsonResponse({
          ok: false,
          error: 'Acción no reconocida: ' + action
        }, 400);
      }

      const text = await targetResponse.text();

      return new Response(text, {
        status: targetResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json;charset=utf-8'
        }
      });

    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error && error.message ? error.message : String(error)
      }, 500);
    }
  }
};

// ============================================================
// HANDLERS
// ============================================================

async function handleReportesAction(action, payload) {
  if (action === 'getClientData') {
    const [reportesResponse, plantelResponse] = await Promise.all([
      fetch(REPORTES_SCRIPT_URL + '?action=getClientData'),
      postToAppsScript(BASE_DEPORTE_SCRIPT_URL, { action: 'getPlantel' })
    ]);

    const reportesData = await parseJsonResponse(reportesResponse);
    const plantelData = await parseJsonResponse(plantelResponse);

    if (!reportesData || reportesData.ok === false) {
      return jsonResponse(reportesData || { ok: false, error: 'No se pudo leer Reportes.' }, reportesResponse.status || 500);
    }

    const plantel = Array.isArray(plantelData && plantelData.data) ? plantelData.data : [];
    const rows = Array.isArray(reportesData.rows) ? reportesData.rows : [];
    const linked = linkReportesWithPlantel(rows, plantel);
    const linkStats = {
      totalRows: rows.length,
      linkedRows: linked.filter(row => row.persona).length,
      unmatchedRows: linked.filter(row => !row.persona).length,
      plantelRows: plantel.length
    };

    return jsonResponse({
      ...reportesData,
      source: reportesData.source || 'google_sheets',
      sourceMerged: 'worker',
      updatedAt: new Date().toISOString(),
      plantel,
      rows,
      linkedRows: linked,
      linkStats
    }, reportesResponse.status || 200);
  }

  if (action === 'generateClientReport') {
    return postToAppsScript(REPORTES_SCRIPT_URL, {
      action: 'generateClientReport',
      prompt: payload.prompt || ''
    });
  }

  if (action === 'generarAuditoriaDatos') {
    return postToAppsScript(REPORTES_SCRIPT_URL, {
      action: 'generarAuditoriaDatos'
    });
  }

  return jsonResponse({
    ok: false,
    error: 'Acción de Reportes no reconocida: ' + action
  }, 400);
}

async function handleBaseAction(action, payload) {
  const mappedAction = BASE_ACTION_MAP[action];

  const cleanPayload = {
    ...payload,
    action: mappedAction
  };

  return postToAppsScript(BASE_DEPORTE_SCRIPT_URL, cleanPayload);
}

async function handleDeportesAction(action, payload) {
  const cleanPayload = {
    ...payload,
    action
  };

  return postToAppsScript(BASE_DEPORTE_SCRIPT_URL, cleanPayload);
}

async function handleAntidopingAction(action, payload) {
  const cleanPayload = {
    ...payload,
    action
  };

  return postToAppsScript(BASE_DEPORTE_SCRIPT_URL, cleanPayload);
}

async function handleSiteAction(action, payload) {
  if (action === 'site_getContext') {
    return jsonResponse(await loadSiteContext_());
  }

  if (action === 'site_getPlantel') {
    return jsonResponse({
      ok: true,
      plantel: await loadCanonicalPlantel_()
    });
  }

  if (action === 'site_getPersonaContext') {
    const result = await lookupPersonaContextFromPayload_(payload);
    if (result && result.ok === false) {
      return jsonResponse(result, 400);
    }

    return jsonResponse(result);
  }

  if (action === 'site_lookupPersona') {
    const result = await lookupPersonaContextFromPayload_(payload);
    if (result && result.ok === false) {
      return jsonResponse({
        ok: false,
        error: result.error || 'No se pudo resolver la persona.'
      }, 400);
    }

    return jsonResponse(result);
  }

  return jsonResponse({
    ok: false,
    error: 'Acción de sitio no reconocida: ' + action
  }, 400);
}

// ============================================================
// UTILIDADES
// ============================================================

function postToAppsScript(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data)
  });
}

async function parseJsonResponse(response) {
  if (!response) return null;
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: 'Respuesta JSON inválida: ' + String(error && error.message ? error.message : error),
      raw: text.slice(0, 1000)
    };
  }
}

function extractResponseData(parsed) {
  if (!parsed) return null;
  if (Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    return parsed.data;
  }
  return parsed;
}

function normalizeDni(value) {
  return String(value || '').replace(/\D+/g, '').trim();
}

async function loadSiteContext_() {
  const [plantel, reportesResponse] = await Promise.all([
    loadCanonicalPlantel_(),
    handleReportesAction('getClientData', {})
  ]);

  const reportesParsed = await parseJsonResponse(reportesResponse);

  if (reportesParsed && reportesParsed.ok === false) {
    return reportesParsed;
  }

  const reportes = extractResponseData(reportesParsed);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    plantel: Array.isArray(plantel) ? plantel : [],
    reportes: reportes && typeof reportes === 'object'
      ? reportes
      : { rows: [], linkedRows: [], linkStats: {} }
  };
}

async function loadPersonaContext_(dni) {
  const context = await loadSiteContext_();
  if (!context || context.ok === false) {
    return context;
  }

  const selector = normalizePersonaId(dni) || normalizeDni(dni);
  const plantel = Array.isArray(context.plantel) ? context.plantel : [];
  const reportes = context.reportes && typeof context.reportes === 'object' ? context.reportes : {};
  const linkedRows = Array.isArray(reportes.linkedRows) ? reportes.linkedRows : [];
  const persona = resolvePersonaFromPlantel_(plantel, { selector }) || null;
  const personaId = normalizePersonaId(persona && (persona.persona_id || persona.Persona_ID || persona.personaId));
  const dniNorm = normalizeDni(persona && (persona.DNI || persona.dni)) || normalizeDni(selector);
  const reportesRows = linkedRows.filter(row => {
    const rowPersonaId = normalizePersonaId(row && row.persona_id);
    if (personaId && rowPersonaId) return rowPersonaId === personaId;
    return normalizeDni(row && row.persona && (row.persona.DNI || row.persona.dni)) === dniNorm;
  });

  return {
    ok: true,
    generatedAt: context.generatedAt,
    persona_id: personaId,
    personaId,
    dni: dniNorm,
    persona,
    reportesRows: reportesRows.sort((a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0)),
    reportesCount: reportesRows.length,
    reportesLinkStats: reportes.linkStats || {},
    plantelCount: plantel.length
  };
}

async function lookupPersonaContextFromPayload_(payload) {
  const context = await loadSiteContext_();
  if (!context || context.ok === false) return context;

  const plantel = Array.isArray(context.plantel) ? context.plantel : [];
  const personaId = normalizePersonaId(payload && (payload.personaId || payload.persona_id || payload.id || ''));
  const dni = normalizeDni(payload && (payload.dni || payload.dniValue || ''));
  const nombre = normalizeText(payload && (payload.nombre || payload.name || payload.persona || ''));
  const query = normalizeText(payload && (payload.query || payload.search || ''));
  const key = normalizeText(payload && (payload.personaKey || payload.key || ''));

  const persona = resolvePersonaFromPlantel_(plantel, {
    personaId,
    dni,
    nombre,
    query,
    key
  });

  if (!persona) {
    return {
      ok: false,
      error: 'No se encontró la persona en el plantel canónico.'
    };
  }

  const dniNorm = normalizeDni(persona.DNI || persona.dni || '');
  const resolvedPersonaId = normalizePersonaId(persona.persona_id || persona.Persona_ID || persona.personaId);
  const reportes = context.reportes && typeof context.reportes === 'object' ? context.reportes : {};
  const linkedRows = Array.isArray(reportes.linkedRows) ? reportes.linkedRows : [];
  const reportesRows = linkedRows.filter(row => {
    const rowPersonaId = normalizePersonaId(row && row.persona_id);
    if (resolvedPersonaId && rowPersonaId) return rowPersonaId === resolvedPersonaId;
    return normalizeDni(row && row.persona && (row.persona.DNI || row.persona.dni)) === dniNorm;
  });

  return {
    ok: true,
    generatedAt: context.generatedAt,
    persona_id: resolvedPersonaId,
    personaId: resolvedPersonaId,
    dni: dniNorm,
    persona,
    reportesRows: reportesRows.sort((a, b) => Number(b.rowNumber || 0) - Number(a.rowNumber || 0)),
    reportesCount: reportesRows.length,
    reportesLinkStats: reportes.linkStats || {},
    plantelCount: plantel.length
  };
}

async function loadCanonicalPlantel_() {
  const response = await handleBaseAction('base_getPlantel', {});
  const parsed = await parseJsonResponse(response);
  if (parsed && parsed.ok === false) return [];
  const plantel = extractResponseData(parsed);
  return Array.isArray(plantel) ? plantel : [];
}

function linkReportesWithPlantel(rows, plantel) {
  const index = buildPlantelIndex(plantel);
  return (rows || []).map(row => {
    const key = buildReportRowKey(row);
    const linkedPersona =
      (key && index.get('key:' + key)) ||
      (row && row.persona_id && index.get('id:' + normalizePersonaId(row.persona_id))) ||
      (row && row.dni && index.get('dni:' + normalizeDni(row.dni))) ||
      null;
    const personaId = normalizePersonaId(linkedPersona && (linkedPersona.persona_id || linkedPersona.Persona_ID || linkedPersona.personaId));
    return {
      ...row,
      personaKey: key,
      persona_id: personaId,
      personaId: personaId,
      persona: linkedPersona
    };
  });
}

function buildPlantelIndex(plantel) {
  const index = new Map();
  (plantel || []).forEach(persona => {
    const personaId = normalizePersonaId(persona && (persona.persona_id || persona.Persona_ID || persona.personaId));
    const dni = normalizeDni(persona && (persona.DNI || persona.dni));
    const key = buildPersonKey(persona);

    if (personaId && !index.has('id:' + personaId)) {
      index.set('id:' + personaId, persona);
    }
    if (dni && !index.has('dni:' + dni)) {
      index.set('dni:' + dni, persona);
    }
    if (key && !index.has('key:' + key)) {
      index.set('key:' + key, persona);
      return;
    }
    if (key) {
      const current = index.get('key:' + key);
      const currentId = normalizePersonaId(current && (current.persona_id || current.Persona_ID || current.personaId));
      if (!currentId && personaId) index.set('key:' + key, persona);
    }
  });
  return index;
}

function buildReportRowKey(row) {
  const source = String(row && (row.jugadoraKey || row.jugadora || row.jugadora_nombre || '')).trim();
  return buildPersonKeyFromName(source);
}

function buildPersonKey(persona) {
  if (!persona) return '';
  if (persona.personaKey) return buildPersonKeyFromName(persona.personaKey);
  return buildPersonKeyFromName([persona.Apellido || persona.apellido || '', persona.Nombre || persona.nombre || ''].filter(Boolean).join(', '));
}

function normalizePersonaId(value) {
  return String(value || '').trim();
}

function resolvePersonaFromPlantel_(plantel, selector) {
  const list = Array.isArray(plantel) ? plantel : [];
  const raw = typeof selector === 'string'
    ? selector
    : normalizePersonaId(selector && (selector.selector || selector.value || ''));
  const personaId = normalizePersonaId(selector && (selector.personaId || selector.persona_id || selector.id || raw));
  const dni = normalizeDni(selector && (selector.dni || selector.dniValue || selector.dniLimpio || raw || ''));
  const nombre = normalizeText(selector && (selector.nombre || selector.name || raw || ''));
  const query = normalizeText(selector && (selector.query || selector.search || raw || ''));
  const key = normalizeText(selector && (selector.key || selector.personaKey || ''));

  if (personaId) {
    const byId = list.find(item => normalizePersonaId(item && (item.persona_id || item.Persona_ID || item.personaId)) === personaId);
    if (byId) return byId;
  }

  if (dni) {
    const byDni = list.find(item => normalizeDni(item && (item.DNI || item.dni)) === dni);
    if (byDni) return byDni;
  }

  if (key) {
    const byKey = list.find(item => {
      const itemKey = normalizeText(item && (item.personaKey || buildPersonKeyFromName([item.Apellido || item.apellido || '', item.Nombre || item.nombre || ''].filter(Boolean).join(', '))));
      return itemKey === key;
    });
    if (byKey) return byKey;
  }

  if (nombre) {
    const byNombre = list.find(item => normalizeText([item.Apellido || item.apellido || '', item.Nombre || item.nombre || ''].filter(Boolean).join(', ')) === nombre);
    if (byNombre) return byNombre;
  }

  if (query) {
    const byQuery = list.find(item => {
      const haystack = normalizeText([
        item.Apellido || '',
        item.Nombre || '',
        item.DNI || '',
        item.dni || '',
        item.personaKey || '',
        item.persona_id || '',
        item.Persona_ID || ''
      ].join(' '));
      return haystack.includes(query);
    });
    if (byQuery) return byQuery;
  }

  return null;
}

function buildPersonKeyFromName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return '';
  const parts = normalized.split(',').map(part => part.trim()).filter(Boolean);
  if (!parts.length) return normalized;
  const apellido = parts[0];
  const nombre = parts[1] || '';
  const firstName = nombre.split(/\s+/).filter(Boolean)[0] || '';
  return firstName ? apellido + ' ' + firstName : apellido;
}

function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
}
