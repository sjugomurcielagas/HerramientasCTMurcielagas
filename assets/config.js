const API_BASE_URL = 'https://murcielagas-reportes-api.sjugomurcielagas.workers.dev';

(function initMurciSharedApi(global) {
  const Murci = global.Murci || (global.Murci = {});
  const pendingGets = {};
  const CACHE_PREFIX = 'murci_api_cache:';

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

  Murci.cacheGet = function cacheGet(key, ttlMs = 0) {
    if (!key || !global.localStorage) return null;
    try {
      const raw = global.localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!entry || typeof entry !== 'object' || !Object.prototype.hasOwnProperty.call(entry, 'data')) return null;
      if (ttlMs > 0 && entry.ts && (Date.now() - entry.ts) > ttlMs) return null;
      return entry.data;
    } catch {
      return null;
    }
  };

  Murci.cacheSet = function cacheSet(key, data) {
    if (!key || !global.localStorage) return data;
    try {
      global.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        ts: Date.now(),
        data
      }));
    } catch {
      // Cache best-effort.
    }
    return data;
  };

  Murci.cacheRemove = function cacheRemove(key) {
    if (!key || !global.localStorage) return;
    try {
      global.localStorage.removeItem(CACHE_PREFIX + key);
    } catch {
      // noop
    }
  };

  Murci.apiGetCached = async function apiGetCached(action, params = {}, options = {}, apiUrl = API_BASE_URL) {
    const ttlMs = Number(options.ttlMs || 0);
    const forceRefresh = !!options.forceRefresh;
    const cacheKey = options.cacheKey || `${apiUrl}|${action}|${JSON.stringify(params || {})}`;

    if (!forceRefresh) {
      const cached = Murci.cacheGet(cacheKey, ttlMs);
      if (cached !== null) return cached;
      if (pendingGets[cacheKey]) return pendingGets[cacheKey];
    }

    const promise = Murci.apiGet(action, params, apiUrl)
      .then(data => Murci.cacheSet(cacheKey, data))
      .finally(() => {
        delete pendingGets[cacheKey];
      });

    pendingGets[cacheKey] = promise;
    return promise;
  };

  Murci.loadPlantel = async function loadPlantel(apiGetFn = Murci.apiGet, apiUrl = API_BASE_URL) {
    const data = apiGetFn === Murci.apiGet
      ? await Murci.apiGetCached('site_getPlantel', {}, { ttlMs: 10 * 60 * 1000 }, apiUrl)
      : await apiGetFn('site_getPlantel', {}, apiUrl);
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
