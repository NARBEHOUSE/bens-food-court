/** Ben's Food Court - the restaurants loaded on the page, as the whole page uses them (docs/api/page.md).
 *
 *  A restaurant is loaded by index.html: packs/<id>/pack.js sets BBPacks.<id>, packs/<id>/script.js sets
 *  BBScripts.<id>, packs/<id>/art/manifest.js sets BBArt.<id>. BB.packs.get(id) gives the merged view the rest
 *  of the page reads and never the raw files:
 *    pack     BB.cast.merge(BBCast, BBPacks[id]): the pack with its people filled in from the cast
 *    script   BB.script.merge(pack, BBScripts[id], BBScripts.cast): the pack's lines plus the cast's
 *    art      BBArt[id] ({ backdrops, props }), or an empty manifest
 *    problems what BB.schema found (warned once; the page still runs)
 *  A restaurant BBCourt lists whose pack is not loaded is "not built yet" (a development state): the court
 *  shows it and never enters it. `active` is the restaurant the player is in, or null at the court and menus.
 */
(function () {
  'use strict';
  const views = {};
  let activeId = null;

  const loaded = () => (window.BBPacks ? Object.keys(BBPacks) : []);
  const has = id => !!(id && window.BBPacks && Object.prototype.hasOwnProperty.call(BBPacks, id));

  function build(id) {
    const raw = BBPacks[id];
    const cast = window.BBCast || { people: {} };
    const pack = BB.cast.merge(cast, raw);
    const scripts = window.BBScripts || {};
    const script = BB.script.merge(pack, scripts[id] || { lines: [] }, scripts.cast || { lines: [] });
    const art = (window.BBArt && BBArt[id]) || { backdrops: [], props: [] };
    let problems = [];
    try { problems = BB.schema && BB.schema.validate ? BB.schema.validate(pack) : []; }
    catch (e) { problems = [String((e && e.message) || e)]; }
    if (problems.length) console.warn("Ben's Food Court: the pack " + id + ' has problems', problems);
    return { id, raw, pack, script, art, problems };
  }
  /** The merged view of a loaded restaurant, or null. Built once, on first use. */
  function get(id) {
    if (!has(id)) return null;
    return views[id] || (views[id] = build(id));
  }
  /** The restaurant the player is in (null: the court or the menus). */
  function use(id) {
    const v = id ? get(id) : null;
    activeId = v ? id : null;
    return v;
  }
  /** Customers whose pictures are all there (spec 4.5): what S.create gets as `drawn`. */
  const drawn = () => (window.BBCast && BBCast.drawn ? BBCast.drawn(window.BBArt && BBArt.cast) : []);
  /** The court's restaurants whose pack is loaded, in the court's scan order. */
  const built = () => (window.BBCourt ? BBCourt.restaurants.map(r => r.pack).filter(has) : loaded());

  BB.packs = {
    ids: loaded, has, get, use, drawn, built,
    get active() { return activeId ? views[activeId] : null; },
    get activeId() { return activeId; },
  };
})();
