(function () {
  function sanitizeChromeCopy() {
    var root = document.getElementById('appView');
    if (!root) return;

    root.querySelectorAll('.panel-head p, .hint, .footer-note').forEach(function (node) {
      node.remove();
    });

    root.querySelectorAll('#criteriosView .grid, .field-note').forEach(function (node) {
      if (node.classList && node.classList.contains('field-note')) {
        if (!/JSON|Sheets/i.test(node.textContent || '')) return;
      }
      if (node) node.remove();
    });

    root.querySelectorAll('#editarPlantelView .section-card > .muted').forEach(function (node) {
      node.remove();
    });
  }

  function sanitizeDynamicCopy() {
    document.querySelectorAll('.field-note').forEach(function (node) {
      if (/JSON|Sheets/i.test(node.textContent || '')) node.remove();
    });
  }

  sanitizeChromeCopy();
  sanitizeDynamicCopy();

  var observer = new MutationObserver(function () {
    sanitizeChromeCopy();
    sanitizeDynamicCopy();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();