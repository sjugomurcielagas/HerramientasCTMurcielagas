const API_BASE_URL = 'https://murcielagas-reportes-api.sjugomurcielagas.workers.dev';
const UI_VERSION = '2026.05.22 · c759857';

(function initMurciSharedApi(global) {
  const Murci = global.Murci || (global.Murci = {});
  const pendingGets = {};
  const CACHE_PREFIX = 'murci_api_cache:';
  Murci.uiVersion = UI_VERSION;

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
        console.error('[Murci] No se pudo obtener el plantel can\u00f3nico desde site_getPlantel.', error);
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

  // Alertas de portada: combina documentos, TUE y carga reciente sin exponer
  // al frontend detalles de parsing o tolerancia a fallos.
  function normalizeAlertKey_(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseAlertDate_(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    const text = String(value).trim();
    if (!text) return null;

    const parseParts = (year, month, day, hour = 0, minute = 0, second = 0) => {
      const d = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
      return Number.isNaN(d.getTime()) ? null : d;
    };

    const ddmmyyyy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyy) {
      return parseParts(ddmmyyyy[3], ddmmyyyy[2], ddmmyyyy[1]);
    }

    const ddmmyyyyTime = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+|T)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (ddmmyyyyTime) {
      return parseParts(ddmmyyyyTime[3], ddmmyyyyTime[2], ddmmyyyyTime[1], ddmmyyyyTime[4], ddmmyyyyTime[5], ddmmyyyyTime[6] || 0);
    }

    const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
      return parseParts(ymd[1], ymd[2], ymd[3]);
    }

    const ymdTime = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s])(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (ymdTime) {
      return parseParts(ymdTime[1], ymdTime[2], ymdTime[3], ymdTime[4], ymdTime[5], ymdTime[6] || 0);
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatAlertDays_(days) {
    if (days < 0) return 'vencido';
    if (days === 0) return 'vence hoy';
    return `en ${days} d\u00edas`;
  }

  function startOfCurrentWeek_(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = domingo, 1 = lunes, ...
    const diff = day === 0 ? -6 : 1 - day; // arrancar en lunes
    d.setDate(d.getDate() + diff);
    return d;
  }

  function getTrainingPeriodStart_(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    const daysSinceMonday = (day + 6) % 7;
    d.setDate(d.getDate() - daysSinceMonday);
    d.setDate(d.getDate() - 7);
    return d;
  }

  function isoWeekKey_(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
  }

  function trainingPeriodKey_(date) {
    return isoWeekKey_(getTrainingPeriodStart_(date));
  }

  function getHomeExpectedPlayers_(activePlayers) {
    let stored = [];
    try {
      stored = JSON.parse(global.localStorage?.getItem('murcielagasIncludedPlayers') || '[]');
    } catch (_) {
      stored = [];
    }

    if (Array.isArray(stored) && stored.filter(Boolean).length) {
      return stored
        .map(name => ({ name: String(name || '').trim(), key: normalizeAlertKey_(name) }))
        .filter(p => p.name && p.key);
    }

    return [];
  }

  function shortAlertLabel_(label) {
    const text = String(label || '');
    if (/pasaporte/i.test(text)) return 'Pasaporte';
    if (/cud/i.test(text)) return 'CUD';
    if (/apto/i.test(text)) return 'Apto m\u00e9dico';
    if (/tue/i.test(text)) return 'TUE';
    return text.replace(/^Vencimiento\s+/i, '');
  }

  function isCuerpoTecnico_(persona) {
    const fields = [
      persona?.Tipo_Integrante,
      persona?.tipoIntegrante,
      persona?.tipo_integrante,
      persona?.tipo,
      persona?.Rol,
      persona?.rol,
      persona?.Puesto,
      persona?.puesto,
      persona?.Funci\u00f3n,
      persona?.Funcion,
      persona?.funcion
    ];
    const text = normalizeAlertKey_(fields.filter(Boolean).join(' '));
    if (!text) return false;
    return [
      'cuerpo tecnico',
      'cuerpo tecnico auxiliar',
      'tecnico',
      'tecnica',
      'entrenador',
      'entrenadora',
      'profe',
      'profesora',
      'pf',
      'preparador fisico',
      'preparadora fisica',
      'medico',
      'medica',
      'kinesio',
      'kinesiologa',
      'nutricionista',
      'psicologa',
      'psicologo',
      'ayudante tecnico',
      'analista'
    ].some(term => text.includes(term));
  }

  function isHomeReportablePlayer_(persona) {
    if (!persona) return false;
    if (persona.activo === false || persona.inactivo === true) return false;
    if (isCuerpoTecnico_(persona)) return false;

    const tipo = normalizeAlertKey_(persona?.Tipo_Integrante || persona?.tipoIntegrante || persona?.tipo_integrante || persona?.tipo || '');
    if (tipo) {
      if (/arquera|jugadora|deportista|atleta|jugador/.test(tipo)) return true;
      return false;
    }

    const nombre = normalizeAlertKey_(Murci.personName(persona));
    if (!nombre) return false;
    if (isCuerpoTecnico_(persona)) return false;
    return true;
  }

  function buildHomeAlertsSummary_(plantel, alertas, reportes) {
    const sections = [];
    const totalBase = alertas && Array.isArray(alertas.vencimientos) ? alertas.vencimientos : [];

    const documentAlerts = totalBase.filter(item => {
      const campo = String(item?.categoria || '').toLowerCase() === 'documento' ? String(item?.tipo || '') : '';
      return ['Vencimiento pasaporte', 'Vencimiento CUD', 'Vencimiento apto m\u00e9dico'].includes(campo);
    }).map(item => ({
      name: String(item.nombre || '').trim(),
      kind: shortAlertLabel_(item.tipo),
      days: Number(item.dias),
      detail: formatAlertDays_(Number(item.dias)),
      href: './base-datos/',
      label: 'Abrir base de datos'
    }));

    const tueAlerts = totalBase.filter(item => String(item?.tipo || '').trim() === 'Vencimiento TUE').map(item => ({
      name: String(item.nombre || '').trim(),
      kind: 'TUE',
      days: Number(item.dias),
      detail: formatAlertDays_(Number(item.dias)),
      href: './antidoping/',
      label: 'Abrir antidoping'
    }));

    const activePlayers = Array.isArray(plantel)
      ? plantel.filter(isHomeReportablePlayer_)
      : [];

    const reportRows = reportes && Array.isArray(reportes.rows) ? reportes.rows : Array.isArray(reportes) ? reportes : [];
    let cargaAlerts = [];
    if (reportRows.length) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const currentTrainingPeriod = trainingPeriodKey_(today);
      const latestByPlayer = new Map();

      reportRows.forEach(row => {
        const rowDate = parseAlertDate_(row?.fecha);
        if (!rowDate || rowDate > today || trainingPeriodKey_(rowDate) !== currentTrainingPeriod) return;
        const key = normalizeAlertKey_(row?.jugadora);
        if (!key) return;
        const prev = latestByPlayer.get(key);
        if (!prev || rowDate > prev.date) {
          latestByPlayer.set(key, { date: rowDate, source: row });
        }
      });

      const expectedPlayers = getHomeExpectedPlayers_(activePlayers);
      const expectedCount = expectedPlayers.length;
      const reportedCount = expectedPlayers.filter(persona => latestByPlayer.has(persona.key)).length;

      cargaAlerts = expectedCount && reportedCount >= expectedCount
        ? []
        : expectedPlayers
        .filter(persona => !latestByPlayer.has(persona.key))
        .map(persona => ({
          name: persona.name,
          detail: `Sin registro de sRPE del per\u00edodo vencido (${reportedCount}/${expectedCount || activePlayers.length})`,
          href: './reportes/',
          label: 'Abrir reportes'
        }));
    }

    if (documentAlerts.length) sections.push({ key: 'documentos', title: 'Documentos', items: documentAlerts });
    if (tueAlerts.length) sections.push({ key: 'tues', title: 'TUEs', items: tueAlerts });
    if (cargaAlerts.length) sections.push({ key: 'carga', title: 'Carga sin registrar', items: cargaAlerts });

    return {
      sections,
      total: sections.reduce((sum, section) => sum + section.items.length, 0)
    };
  }

  Murci.loadHomeAlerts = async function loadHomeAlerts(apiUrl = API_BASE_URL) {
    const [plantelResult, alertasResult, reportesResult] = await Promise.allSettled([
      Murci.loadPlantel(),
      Murci.apiGetCached('base_getAlertas', {}, { ttlMs: 2 * 60 * 1000 }, apiUrl),
      Murci.apiGetCached('getClientData', {}, { ttlMs: 2 * 60 * 1000 }, apiUrl)
    ]);

    const plantel = plantelResult.status === 'fulfilled' && Array.isArray(plantelResult.value) ? plantelResult.value : [];
    const alertas = alertasResult.status === 'fulfilled' ? alertasResult.value : null;
    const reportes = reportesResult.status === 'fulfilled' ? reportesResult.value : null;

    return buildHomeAlertsSummary_(plantel, alertas, reportes);
  };

  Murci.toInputDate = function toInputDate(value) {
    if (value === null || value === undefined || value === '') return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (!text) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const dmY = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return text;
  };
  global.toInputDate = Murci.toInputDate;

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

  Murci.personaId = function personaId(personaOrValue) {
    if (personaOrValue && typeof personaOrValue === 'object') {
      return String(
        personaOrValue.persona_id ||
        personaOrValue.Persona_ID ||
        personaOrValue.personaId ||
        ''
      ).trim();
    }
    return String(personaOrValue || '').trim();
  };

  Murci.personaRef = function personaRef(personaOrValue) {
    if (personaOrValue && typeof personaOrValue === 'object') {
      return Murci.personaId(personaOrValue) || Murci.normalizeDni(personaOrValue.DNI || personaOrValue.dni || '');
    }
    return String(personaOrValue || '').trim();
  };

  Murci.samePersona = function samePersona(a, b) {
    const aId = Murci.personaId(a);
    const bId = Murci.personaId(b);
    if (aId && bId) return aId === bId;
    const aRef = Murci.personaRef(a);
    const bRef = Murci.personaRef(b);
    return !!aRef && !!bRef && aRef === bRef;
  };

  Murci.personName = function personName(persona) {
    if (!persona) return '';
    if (persona.nombre) return String(persona.nombre).trim();
    return [persona.Apellido || persona.apellido || '', persona.Nombre || persona.nombre || '']
      .filter(Boolean)
      .join(', ')
      .trim();
  };

  function syncUiVersionTags() {
    const tags = global.document ? global.document.querySelectorAll('.page-version-tag') : [];
    tags.forEach(tag => {
      tag.textContent = `Versi\u00f3n UI ${UI_VERSION}`;
    });
  }

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', syncUiVersionTags, { once: true });
    } else {
      syncUiVersionTags();
    }
  }

  function initAntidopingEnhancements_() {
    const doc = global.document;
    if (!doc) return;

    const applyPatch = () => {
      if (typeof global.searchVariants !== 'function' || typeof global.buscarConAliases !== 'function' || typeof global.renderResultados !== 'function') {
        global.setTimeout(applyPatch, 50);
        return;
      }
      if (global.__murciAntidopingPatched) return;
      global.__murciAntidopingPatched = true;

      if (typeof SEARCH_ALIASES !== 'undefined' && SEARCH_ALIASES) {
        const current = Array.isArray(SEARCH_ALIASES.anaflex) ? SEARCH_ALIASES.anaflex : [];
        SEARCH_ALIASES.anaflex = Array.from(new Set([...current, 'anaflex', 'paracetamol', 'diclofenac']));
      } else if (global.SEARCH_ALIASES) {
        const current = Array.isArray(global.SEARCH_ALIASES.anaflex) ? global.SEARCH_ALIASES.anaflex : [];
        global.SEARCH_ALIASES.anaflex = Array.from(new Set([...current, 'anaflex', 'paracetamol', 'diclofenac']));
      }

      if (!doc.getElementById('murci-antidoping-patch-style')) {
        const style = doc.createElement('style');
        style.id = 'murci-antidoping-patch-style';
        style.textContent = '.result-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.result-card.focused{border-color:var(--celeste);box-shadow:0 0 0 4px rgba(34,168,232,.15)}.result-source-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.result-source-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;background:var(--celeste-100);color:var(--azul-800);font-size:.76rem;font-weight:800}.result-variant{margin-top:6px;color:var(--muted);font-size:.88rem}.result-variant strong{color:var(--texto)}';
        doc.head.appendChild(style);
      }

      const normalizeKey = value => String(value ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const commercialFallbackMap = {
        anaflex: ['paracetamol', 'paracetamol + diclofenac'],
        novalgina: ['metamizol'],
        tafirol: ['paracetamol'],
        ibupirac: ['ibuprofeno'],
        actron: ['ibuprofeno']
      };

      const firstText = (...values) => {
        for (const value of values) {
          if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
        }
        return '';
      };

      const resultKey = item => normalizeKey([
        firstText(item?.medicamento, item?.nombre_comercial, item?.nombre, item?.consulta),
        firstText(item?.principio_activo, item?.principioActivo),
        firstText(item?.estado, item?.resultado),
        firstText(item?.presentacion, item?.laboratorio)
      ].join('|'));

      const severityScore = item => {
        const estado = estadoNormalizado(firstText(item?.estado, item?.resultado));
        if (!estado) return 0;
        if (estado.includes('PROHIBIDO')) return 100;
        if (estado.includes('ADVERTENCIA') || estado.includes('CONDICIONADO') || estado.includes('UMBRAL')) return 70;
        if (estado.includes('NO FIGURA') || estado.includes('PERMITIDO')) return 50;
        if (estado.includes('REQUIERE') || estado.includes('VERIFICACI')) return 20;
        return 10;
      };

      const titleFor = (item, index) => firstText(item?.medicamento, item?.nombre_comercial, item?.consulta, `Versión ${index + 1}`);
      const sourcesFor = item => Array.from(new Set([
        ...(Array.isArray(item?.consultas) ? item.consultas : []),
        item?.consulta_usada,
        item?.consulta,
        item?._consulta
      ].filter(Boolean).map(value => String(value).trim())));

      global.searchVariants = function searchVariantsPatched(query) {
        const normalized = normalizeKey(query);
        const direct = String(query || '').trim();
        const extras = Array.isArray(SEARCH_ALIASES?.[normalized]) ? SEARCH_ALIASES[normalized] : [];
        const singular = normalized.length > 3 && normalized.endsWith('s') ? normalized.slice(0, -1) : '';
        const hints = normalized === 'anaflex' ? ['paracetamol', 'diclofenac'] : [];
        return Array.from(new Set([direct, normalized, singular, ...extras, ...hints].filter(Boolean)));
      };

      global.buscarConAliases = async function buscarConAliasesPatched(query) {
        const variantes = global.searchVariants(query);
        const seen = new Map();
        const collected = [];

        for (const variante of variantes) {
          try {
            const data = await apiPost({ action: 'antidoping_buscarMedicamento', consulta: variante });
            const items = (Array.isArray(data) ? data : (Array.isArray(data?.resultados) ? data.resultados : [data])).filter(Boolean);
            for (const raw of items) {
              const item = {
                ...raw,
                medicamento: firstText(raw?.medicamento, raw?.nombre_comercial, raw?.nombre, raw?.consulta, variante, query),
                principio_activo: firstText(raw?.principio_activo, raw?.principioActivo, raw?.sustancia, raw?.principio, ''),
                estado: firstText(raw?.estado, raw?.resultado, 'NO ENCONTRADO / REQUIERE VERIFICACIÓN'),
                consultas: Array.from(new Set([...(Array.isArray(raw?.consultas) ? raw.consultas : []), variante].filter(Boolean).map(v => String(v).trim())))
              };
              const key = resultKey(item);
              if (!key) continue;
              if (seen.has(key)) {
                const existing = seen.get(key);
                existing.consultas = Array.from(new Set([...(existing.consultas || []), ...item.consultas]));
                existing._score = Math.max(existing._score || 0, severityScore(item));
                continue;
              }
              item._score = severityScore(item);
              seen.set(key, item);
              collected.push(item);
            }
          } catch (err) {
            // seguimos con las demás variantes
          }
        }

        if (!collected.length) {
          const normalizedQuery = normalizeKey(query);
          const fallbackActives = commercialFallbackMap[normalizedQuery] || [];
          if (fallbackActives.length) {
            const fallbackItems = fallbackActives.map(active => ({
              medicamento: query,
              principio_activo: active,
              estado: 'REQUIERE REVISIÓN',
              observaciones: 'Sin respuesta del servicio en este momento. Confirmar presentación exacta antes de habilitar uso.',
              fuente_argentina: 'Marca comercial normalizada (fallback local)',
              fuente_wada: 'Pendiente de validación',
              fuente_secundaria: '',
              consultas: [query]
            }));
            return { items: fallbackItems, usedAlias: '' };
          }
          return { items: [fallbackResultado(query)], usedAlias: '' };
        }

        collected.sort((a, b) => (b._score || 0) - (a._score || 0) || titleFor(a, 0).localeCompare(titleFor(b, 0)));
        const used = variantes.filter(v => normalizeKey(v) !== normalizeKey(query));
        return {
          items: collected,
          usedAlias: used.length ? used.join(' · ') : ''
        };
      };

      global.resultCard = function resultCardPatched(r, index) {
        const estado = estadoNormalizado(r.estado || r.resultado || 'NO ENCONTRADO / REQUIERE VERIFICACIÓN');
        const fuentes = fuentesHtml(r);
        const title = titleFor(r, index);
        const subtitle = firstText(r.principio_activo, r.principioActivo, 'Principio activo no identificado');
        const consultas = sourcesFor(r);
        const consultadas = consultas.length ? `<div class="result-variant"><strong>Consultas:</strong> ${esc(consultas.join(' · '))}</div>` : '';
        const presentacion = r.presentacion ? `<div class="meta">Presentación: ${esc(r.presentacion)}</div>` : '';
        const laboratorio = r.laboratorio ? `<div class="meta">Laboratorio: ${esc(r.laboratorio)}</div>` : '';
        const contexto = (r.en_competencia || r.fuera_competencia) ? `<div class="meta">En competencia: ${esc(r.en_competencia || 'N/D')} · Fuera de competencia: ${esc(r.fuera_competencia || 'N/D')}</div>` : '';
        const decision = decisionBlock(r, estado, index);
        const criterio = r.criterio_wada ? `<p><strong>Criterio:</strong> ${esc(r.criterio_wada)}</p>` : '';
        const criterioPlano = (r.criterio_wada || '').trim().toLowerCase();
        const observacionesPlano = (r.observaciones || '').trim().toLowerCase();
        const observaciones = r.observaciones && observacionesPlano !== criterioPlano ? `<p>${esc(r.observaciones)}</p>` : '';
        return `<article id="resultado-${index}" class="result-card"><div class="actions" style="justify-content:space-between"><div><div class="result-title">${esc(title)}</div><div class="meta">${esc(subtitle)}</div>${presentacion}${laboratorio}${contexto}${consultadas}</div>${estadoBadge(estado)}</div>${decision}${criterio}${observaciones}${fuentes}</article>`;
      };

      global.renderResultados = function renderResultadosPatched(items) {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        try { state.lastResults = list; } catch { global.state = global.state || {}; global.state.lastResults = list; }
        const cont = doc.getElementById('resultados');
        if (!cont) return;
        if (!list.length) {
          cont.innerHTML = '<div class="empty">No encontrado / requiere verificación.</div>';
          return;
        }
        const nav = list.length > 1 ? `<div class="notice">Se encontraron ${list.length} versiones. Revisalas una por una: cada tarjeta muestra el estado de esa fórmula.</div><div class="actions result-nav">${list.map((item, index) => `<button class="btn secondary tiny" type="button" data-result-jump="${index}">${esc(titleFor(item, index))}</button>`).join('')}</div>` : '';
        cont.innerHTML = nav + list.map((item, index) => global.resultCard(item, index)).join('');
      };

      const resultados = doc.getElementById('resultados');
      if (resultados && !resultados.dataset.murciPatchBound) {
        resultados.addEventListener('click', event => {
          const jump = event.target.closest('[data-result-jump]');
          if (!jump) return;
          const idx = Number(jump.dataset.resultJump);
          const card = doc.getElementById(`resultado-${idx}`);
          if (!card) return;
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          card.classList.add('focused');
          global.setTimeout(() => card.classList.remove('focused'), 1400);
        });
        resultados.dataset.murciPatchBound = '1';
      }
    };

    global.setTimeout(applyPatch, 0);
  }

  if (global.document) {
    const path = String(global.location?.pathname || '');
    if (/\/antidoping\/?(?:index\.html)?$/i.test(path) || /\/antidoping\/$/i.test(path)) {
      initAntidopingEnhancements_();
    }
  }
})(globalThis);
