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

  // Fuente unica del plantel: una sola lectura por pagina y normalizacion basica
  // para no romper a los modulos que esperan aliases historicos.
  let plantelCache = null;
  let plantelPromise = null;

  function normalizePlantelActivo_(persona) {
    const normalizar = value => String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const activoRaw = normalizar(persona?.Activo ?? persona?.activo ?? '');
    const estadoPlantel = normalizar(persona?.Estado_Plantel ?? persona?.estadoPlantel ?? '');
    const estadoConvocatoria = normalizar(persona?.Estado_Convocatoria ?? persona?.estado ?? '');
    const estadoCompuesto = `${activoRaw} ${estadoPlantel} ${estadoConvocatoria}`.trim();

    if (!estadoCompuesto) return true;
    if (/(^|[^a-z])(no|inactivo|inactiva|baja|bajas)([^a-z]|$)/.test(estadoCompuesto)) return false;
    if (/(^|[^a-z])(si|activo|activa|vigente|alta)([^a-z]|$)/.test(estadoCompuesto)) return true;
    return !estadoCompuesto.includes('baja') && !estadoCompuesto.includes('inactiv');
  }

  function normalizarPlantelItem_(persona) {
    const apellido = String(persona?.Apellido || persona?.apellido || '').trim();
    const nombre = String(persona?.Nombre || persona?.nombre || '').trim();
    const nombreCompleto = String(persona?.nombre || '').trim() || [apellido, nombre].filter(Boolean).join(', ');
    const tipoIntegrante = String(
      persona?.Tipo_Integrante ||
      persona?.tipoIntegrante ||
      persona?.tipo_integrante ||
      persona?.tipo ||
      ''
    ).trim();
    const dni = String(persona?.DNI ?? persona?.dni ?? '').trim();
    const personaId = String(persona?.Persona_ID ?? persona?.persona_id ?? persona?.personaId ?? '').trim();
    const activo = normalizePlantelActivo_(persona);
    const estadoPlantel = String(persona?.Estado_Plantel ?? persona?.estadoPlantel ?? '').trim();
    const estadoConvocatoria = String(persona?.Estado_Convocatoria ?? persona?.estado ?? '').trim();

    return {
      ...persona,
      Persona_ID: personaId || persona?.Persona_ID || '',
      persona_id: personaId || persona?.persona_id || '',
      personaId: personaId || persona?.personaId || '',
      DNI: dni || persona?.DNI || '',
      dni: dni || persona?.dni || '',
      Apellido: apellido || persona?.Apellido || '',
      Nombre: nombre || persona?.Nombre || '',
      nombre: nombreCompleto || persona?.nombre || '',
      tipo: tipoIntegrante || persona?.tipo || '',
      Tipo_Integrante: tipoIntegrante || persona?.Tipo_Integrante || '',
      tipoIntegrante: tipoIntegrante || persona?.tipoIntegrante || '',
      tipo_integrante: tipoIntegrante || persona?.tipo_integrante || '',
      estado: estadoConvocatoria || estadoPlantel || (activo ? 'Activo' : 'Inactivo'),
      estadoNormalizado: activo ? 'Activo' : 'Inactivo',
      activo,
      inactivo: !activo
    };
  }

  async function obtenerPlantel() {
    if (Array.isArray(plantelCache)) return plantelCache;
    if (plantelPromise) return plantelPromise;

    plantelPromise = (async () => {
      try {
        const data = await Murci.apiGet('site_getPlantel', {}, API_BASE_URL);
        const rawList = Array.isArray(data?.plantel) ? data.plantel : Array.isArray(data) ? data : [];
        plantelCache = rawList.map(normalizarPlantelItem_);
      } catch (error) {
        console.error('[Murci] No se pudo obtener el plantel canónico desde site_getPlantel.', error);
        plantelCache = [];
      } finally {
        plantelPromise = null;
      }

      return plantelCache;
    })();

    return plantelPromise;
  }

  obtenerPlantel.invalidate = function invalidatePlantelCache() {
    plantelCache = null;
    plantelPromise = null;
  };

  global.obtenerPlantel = obtenerPlantel;
  Murci.obtenerPlantel = obtenerPlantel;
  Murci.invalidatePlantelCache = obtenerPlantel.invalidate;
  Murci.loadPlantel = async function loadPlantel() {
    return obtenerPlantel();
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
