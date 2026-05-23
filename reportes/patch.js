(function () {
  var originalLoadAnalyticsInBackground = loadAnalyticsInBackground;
  var originalSetTemporalMode = setTemporalMode;
  var originalOpenAiConfigPanel = openAiConfigPanel;
  var originalRenderLocalReport = renderLocalReport;
  var analyticsWanted = false;

  loadAnalyticsInBackground = function () {
    if (!analyticsWanted) return null;
    return originalLoadAnalyticsInBackground();
  };

  setTemporalMode = function (mode, shouldRender) {
    var result = originalSetTemporalMode(mode, shouldRender);
    if (mode === 'periodic') {
      analyticsWanted = true;
      originalLoadAnalyticsInBackground();
    }
    return result;
  };

  openAiConfigPanel = function () {
    analyticsWanted = true;
    originalLoadAnalyticsInBackground();
    return originalOpenAiConfigPanel();
  };

  renderLocalReport = function () {
    originalRenderLocalReport();
    sanitizeControlsCopy();
    sanitizeReportOutput();
    collapseOptionalSections();
  };

  function sanitizeControlsCopy() {
    var root = document.querySelector('.controls-panel');
    if (!root) return;

    root.querySelectorAll('.hint, .panel-head p').forEach(function (node) {
      node.remove();
    });

    var headerCopy = document.querySelector('.report-header');
    if (headerCopy) {
      headerCopy.querySelectorAll('.eyebrow, .subtitle').forEach(function (node) {
        node.remove();
      });
    }

    var aiPanel = document.getElementById('ai-config-panel');
    if (aiPanel) {
      aiPanel.querySelectorAll('.notice, .hint').forEach(function (node) {
        node.remove();
      });
    }
  }

  function sanitizeReportOutput() {
    var output = document.getElementById('output');
    if (!output) return;

    var replacePairs = [
      ['Este dato debe leerse como volumen reportado, no como carga fisiológica completa.', ''],
      ['Sección pendiente de diseño. Por ahora, los pesos y referencias máximas se trabajan por fuera del sistema hasta definir una carga más intuitiva y específica.', ''],
      ['No hay cargas informadas en la semana seleccionada, así que no conviene leer tendencias de volumen hasta completar registros.', 'No hay cargas informadas en la semana seleccionada.'],
      ['No está pensada para una semana puntual.', ''],
      ['La semana muestra', 'La semana muestra']
    ];

    var html = output.innerHTML;
    replacePairs.forEach(function (pair) {
      html = html.split(pair[0]).join(pair[1]);
    });
    output.innerHTML = html;
  }

  function collapseOptionalSections() {
    var output = document.getElementById('output');
    if (!output) return;

    var sections = Array.prototype.slice.call(output.querySelectorAll('.section'));
    sections.forEach(function (section) {
      if (section.closest('details')) return;
      var heading = section.querySelector('h2');
      if (!heading) return;
      var title = heading.textContent.trim();
      if (title !== 'Pesos / referencias de fuerza') return;

      var details = document.createElement('details');
      details.className = 'section';
      var summary = document.createElement('summary');
      summary.className = 'details-summary';
      summary.textContent = title;
      details.appendChild(summary);

      var body = document.createElement('div');
      body.className = 'section-body';
      while (section.firstChild) {
        var node = section.firstChild;
        if (node === heading) {
          section.removeChild(node);
          continue;
        }
        body.appendChild(node);
      }

      details.appendChild(body);
      section.replaceWith(details);
    });
  }
})();