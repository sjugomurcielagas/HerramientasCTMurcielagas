(function () {
  var originalLoadAnalyticsInBackground = loadAnalyticsInBackground;
  var originalSetTemporalMode = setTemporalMode;
  var originalOpenAiConfigPanel = openAiConfigPanel;
  var originalRenderLocalReport = renderLocalReport;
  var analyticsWanted = false;

  loadAnalyticsInBackground = async function () {
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
    collapseOptionalSections();
  };

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
