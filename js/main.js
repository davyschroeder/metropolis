'use strict';
/* METROPOLIS – boot */
(function () {
  function boot() {
    const cv = document.getElementById('game');
    M.Save.loadSettings();
    M.UI.init(); M.Render.init(cv); M.Input.init(cv);
    M.Menu.applySettings();
    M.Save.init().then(function () { M.Menu.show(); });
    M.Menu.show(); M.Engine.start();
    window.addEventListener('beforeunload', function () { M.Save.saveSettings(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && M.mode === 'game' && M.settings.autosave && M.city && !M.city.gameOver) M.Save.save('auto', 'Autosave – ' + M.city.name); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('error', function (e) { const el = document.getElementById('fatal'); if (el) { el.textContent = 'Something went wrong: ' + (e.message || 'unknown error') + ' — your last autosave is intact.'; el.classList.remove('hidden'); setTimeout(function () { el.classList.add('hidden'); }, 8000); } });
})();
