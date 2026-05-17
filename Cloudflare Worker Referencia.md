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
  base_ordenarColumnasBase: 'ordenarColumnasBase',

  // En tu Apps Script la función se llama base_agregarColumna
  base_agregarColumna: 'base_agregarColumna'
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

const ANTIDOPING_ACTIONS_REFERENCIA = [
  'antidoping_buscarMedicamento',
  'antidoping_getFrecuentes',
  'antidoping_getHistorial',
  'antidoping_importarCatalogo',
  'antidoping_importarWada',
  'antidoping_getBackendStatus'
];

// El Worker decide el destino por acción:
// - REPORTES_ACTIONS -> gas/reportes
// - BASE_ACTION_MAP   -> gas/base-deporte (alias base_* hacia funciones legacy)
// - DEPORTES_PREFIXES -> gas/base-deporte (módulos deportivos)
// - ANTIDOPING_PREFIXES -> gas/base-deporte (módulo antidoping)
// Nota: ANTIDOPING_ACTIONS_REFERENCIA es documental; el ruteo real se hace por prefijo.

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
    return fetch(REPORTES_SCRIPT_URL + '?action=getClientData');
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json;charset=utf-8'
    }
  });
}

// ============================================================
// VERIFICACIÓN POST-DEPLOY (manual)
// ============================================================
//
// 1) Confirmar GAS de base-deporte actualizado (ej. versión 66 o superior).
// 2) Publicar este Worker en Cloudflare.
// 3) Validar en producción:
//
// curl -s -X POST "https://murcielagas-reportes-api.sjugomurcielagas.workers.dev" \
//   -H "Content-Type: application/json" \
//   -d '{"action":"antidoping_getBackendStatus"}'
//
// Respuesta esperada:
// - ok: true
// - data.backend_version: string (ej. "2026-05-17.2")
// - data.wada_loaded: boolean
