(function () {
  var originalShowView = window.showView;
  var originalLoadFrecuentes = window.loadFrecuentes;
  var originalBuscar = window.buscar;
  var originalBuscarConAliases = window.buscarConAliases;
  var originalRenderResultados = window.renderResultados;
  var originalResultCard = window.resultCard;
  var originalSearchVariants = window.searchVariants;

  window.__frecuentesCanLoad = false;

  function norm(v) {
    return String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function resultKey(item) {
    return norm([
      item && (item.medicamento || item.nombre_comercial || item.nombre || item.consulta || ''),
      item && (item.principio_activo || item.principioActivo || ''),
      item && (item.presentacion || ''),
      item && (item.laboratorio || '')
    ].join(' | '));
  }

  function resultSeverity(item) {
    var estado = String(item && (item.estado || item.resultado || '')).toUpperCase();
    if (estado.indexOf('PROHIBIDO') !== -1 || estado.indexOf('NO HABILITAR') !== -1 || estado.indexOf('NO RECONOCE') !== -1) return 0;
    if (estado.indexOf('ADVERTENCIA') !== -1 || estado.indexOf('CONDICIONADO') !== -1 || estado.indexOf('REQUIERE') !== -1) return 1;
    if (estado.indexOf('PERMITIDO') !== -1 || estado.indexOf('NO FIGURA') !== -1 || estado.indexOf('VIGENTE') !== -1) return 2;
    return 3;
  }

  function isReliableResult(item) {
    if (!item) return false;
    var estado = String(item.estado || item.resultado || '').toUpperCase();
    var principal = String(item.principio_activo || item.principioActivo || '').trim();
    var fuentes = [item.fuente_argentina, item.fuente_wada, item.fuente_secundaria, item.fuenteMedicamento, item.fuente_medicamento]
      .some(function(v) { return String(v || '').trim() !== ''; });
    if (!principal && !fuentes && /NO ENCONTRADO|REQUIERE VERIFICACI|SIN ESTADO/.test(estado)) return false;
    return !!(principal || fuentes || /PROHIBIDO|ADVERTENCIA|CONDICIONADO|PERMITIDO|NO FIGURA|VIGENTE/.test(estado));
  }

  window.searchVariants = function (query) {
    var normalized = norm(query);
    var extras = [];
    if (normalized === 'anaflex') extras = ['anaflex', 'paracetamol', 'diclofenac', 'paracetamol diclofenac'];
    else if (normalized === 'paracetamol') extras = ['paracetamol', 'anaflex'];
    else if (normalized === 'diclofenac') extras = ['diclofenac', 'anaflex'];
    else if (normalized === 'novalgina') extras = ['novalgina', 'dipirona', 'metamizol'];
    else if (normalized === 'dipirona' || normalized === 'metamizol') extras = [normalized, 'novalgina'];

    var base = typeof originalSearchVariants === 'function' ? originalSearchVariants(query) : [String(query || '').trim()];
    return Array.from(new Set(base.concat(extras).filter(Boolean)));
  };

  window.buscarConAliases = async function (query) {
    var variantes = window.searchVariants(query);
    var collected = [];
    var seen = new Set();
    var usedVariant = '';

    for (var i = 0; i < variantes.length; i++) {
      var variante = variantes[i];
      try {
        var data = await window.apiPost({ action: 'antidoping_buscarMedicamento', consulta: variante });
        var items = Array.isArray(data)
          ? data
          : (Array.isArray(data && data.resultados) ? data.resultados : [data]);

        items.filter(Boolean).forEach(function (item) {
          if (!isReliableResult(item)) return;
          var key = resultKey(item);
          if (seen.has(key)) return;
          seen.add(key);
          collected.push(Object.assign({}, item, {
            __consulta: variante,
            __severidad: resultSeverity(item)
          }));
        });

        if (!usedVariant && items.some(isReliableResult)) usedVariant = variante;
      } catch (err) {
        // Se sigue con la siguiente variante.
      }
    }

    if (!collected.length) {
      return {
        items: [window.fallbackResultado(query)],
        usedAlias: ''
      };
    }

    collected.sort(function (a, b) {
      if ((a.__severidad || 3) !== (b.__severidad || 3)) return (a.__severidad || 3) - (b.__severidad || 3);
      return String(a.__consulta || '').localeCompare(String(b.__consulta || ''), 'es');
    });

    return {
      items: collected,
      usedAlias: usedVariant
    };
  };

  window.resultCard = function (r, index) {
    var estado = window.estadoNormalizado(r.estado || r.resultado || 'NO ENCONTRADO / REQUIERE VERIFICACIÓN');
    var fuentes = window.fuentesHtml(r);
    var presentacion = r.presentacion ? '<div class="meta">Presentación: ' + window.esc(r.presentacion) + '</div>' : '';
    var laboratorio = r.laboratorio ? '<div class="meta">Laboratorio: ' + window.esc(r.laboratorio) + '</div>' : '';
    var contexto = (r.en_competencia || r.fuera_competencia)
      ? '<div class="meta">En competencia: ' + window.esc(r.en_competencia || 'N/D') + ' · Fuera de competencia: ' + window.esc(r.fuera_competencia || 'N/D') + '</div>'
      : '';
    var decision = window.decisionBlock(r, estado, index);
    var criterio = r.criterio_wada ? '<p><strong>Criterio:</strong> ' + window.esc(r.criterio_wada) + '</p>' : '';
    var criterioPlano = String(r.criterio_wada || '').trim().toLowerCase();
    var observacionesPlano = String(r.observaciones || '').trim().toLowerCase();
    var observaciones = r.observaciones && observacionesPlano !== criterioPlano ? '<p>' + window.esc(r.observaciones) + '</p>' : '';
    var consulta = r.__consulta ? '<div class="meta"><strong>Consulta usada:</strong> ' + window.esc(r.__consulta) + '</div>' : '';
    return '<article class="result-card"><div class="actions" style="justify-content:space-between"><div><div class="result-title">' + window.esc(r.medicamento || r.nombre_comercial || r.consulta || 'Consulta') + '</div><div class="meta">' + window.esc(r.principio_activo || r.principioActivo || 'Principio activo no identificado') + '</div>' + consulta + presentacion + laboratorio + contexto + '</div>' + window.estadoBadge(estado) + '</div>' + decision + criterio + observaciones + fuentes + '</article>';
  };

  window.renderResultados = function (items) {
    window.state.lastResults = Array.isArray(items) ? items : [];
    var cont = document.getElementById('resultados');
    if (!window.state.lastResults.length) {
      cont.innerHTML = '<div class="empty">No encontrado / requiere verificación.</div>';
      return;
    }
    cont.innerHTML = window.state.lastResults.map(function (item, index) { return window.resultCard(item, index); }).join('');
  };

  window.buscar = async function () {
    var q = document.getElementById('queryInput').value.trim();
    var status = document.getElementById('buscarStatus');
    if (!q) {
      status.textContent = 'Ingresá un medicamento o principio activo.';
      status.className = 'status-line error';
      return;
    }
    status.textContent = 'Consultando base interna...';
    status.className = 'status-line';
    document.getElementById('resultados').innerHTML = '<div class="empty">Buscando coincidencias...</div>';
    try {
      var resolved = await window.buscarConAliases(q);
      window.renderResultados(resolved.items.filter(Boolean));
      var count = window.state.lastResults.length;
      status.textContent = resolved.usedAlias
        ? 'Consulta completada usando alias: ' + resolved.usedAlias + '.'
        : (count > 1 ? 'Consulta completada. Se encontraron ' + count + ' versiones.' : 'Consulta completada.');
      status.className = 'status-line ok';
      if (typeof window.loadHistorial === 'function') window.loadHistorial();
    } catch (err) {
      status.textContent = 'No se pudo consultar la API interna: ' + err.message;
      status.className = 'status-line error';
      window.renderResultados([]);
    }
  };

  window.loadFrecuentes = async function (force) {
    if (!window.__frecuentesCanLoad && !force) {
      var cont = document.getElementById('frecuentesList');
      if (cont) cont.innerHTML = '<div class="empty">Abrí esta pestaña para cargar los medicamentos frecuentes.</div>';
      return;
    }
    if (typeof originalLoadFrecuentes === 'function') return originalLoadFrecuentes();
  };

  window.showView = function (id) {
    if (typeof originalShowView === 'function') originalShowView(id);
    if (id === 'frecuentesView') {
      window.__frecuentesCanLoad = true;
      if (!window.state.loaded.frecuentes) window.loadFrecuentes(true);
    }
  };

  if (typeof window.originalBuscar === 'undefined') window.originalBuscar = originalBuscar;
})();
