/** Ben's Food Court - boot: sounds, the stage, the switch input, the 3D food, then the main menu over the court, out of
 *  focus (js/court.js menu()). */
(function () {
  'use strict';
  async function boot() {
    BB.audio.init();
    BB.stage.init();
    BB.ui.init();
    try { await BB.world.init(); } catch (e) { console.error('The 3D food could not start', e); }
    // The one-time hand-off of the old Graphics Quality setting to the hub's manager (settings v2 -> v3).
    const h = BB.save.takeHandoff();
    if (h && h.graphics && BB.world.graphics) { try { BB.world.graphics.setChoice(h.graphics); } catch (e) { /* an unknown value */ } }
    BB.stage.usePack(null);
    await BB.court.menu();
    document.getElementById('loading').classList.add('gone');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
