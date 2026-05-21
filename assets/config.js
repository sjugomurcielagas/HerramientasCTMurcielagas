const API_BASE_URL = 'https://murcielagas-reportes-api.sjugomurcielagas.workers.dev';

(function initMurciSharedApi(global) {
  const Murci = global.Murci || (global.Murci = {});

  Murci.apiBaseUrl = API_BASE_URL;

  Murci.buildApiUrl = function buildApiUrl(action, params = {}, apiUrl = API_BASE_URL) {
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  };

  Murci.parseApiResponse = async function parseApiResponse(response) {
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Respuesta inesperada del servidor');
    }
    if (!data || !data.ok) {
      throw new Error(data?.error || 'Error de API');
    }
    return Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
  };

  Murci.apiGet = async function apiGet(action, params = {}, apiUrl = API_BASE_URL) {
    const response = await fetch(Murci.buildApiUrl(action, params, apiUrl), {
      headers: { Accept: 'application/json' }
    });
    return Murci.parseApiResponse(response);
  };

  Murci.apiPost = async function apiPost(payload, apiUrl = API_BASE_URL) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    return Murci.parseApiResponse(response);
  };

  Murci.loadPlantel = async function loadPlantel(apiGetFn = Murci.apiGet, apiUrl = API_BASE_URL) {
    const data = await apiGetFn('site_getPlantel', {}, apiUrl);
    return Array.isArray(data?.plantel) ? data.plantel : Array.isArray(data) ? data : [];
  };

  Murci.normalizeText = function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  };

  Murci.normalizeDni = function normalizeDni(value) {
    return String(value || '').replace(/\D+/g, '').trim();
  };

  Murci.personName = function personName(persona) {
    if (!persona) return '';
    if (persona.nombre) return String(persona.nombre).trim();
    return [persona.Apellido || persona.apellido || '', persona.Nombre || persona.nombre || '']
      .filter(Boolean)
      .join(', ')
      .trim();
  };
})(globalThis);
