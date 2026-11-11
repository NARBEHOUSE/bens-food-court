/** Ben's Food Court - save format, settings defaults and migrations (FOODCOURT-BUILD.md 7;
 *  docs/api/shift.md "Saves").
 *
 *  Keys: bb-settings (one set for the whole court), and per restaurant bb-progress:<pack>
 *  (coins) and bb-shift:<pack> (the shift in progress). Each holds { v, kind, pack,
 *  packVersion, data }. Older saves are upgraded one version at a time. A save from a newer
 *  version is never overwritten. If the pack changed since the save, only the shift in
 *  progress is dropped; coins are kept. The court's own record (bb-court) belongs to
 *  js/core/court.js (BB.courtRules), not here.
 *
 *  Settings version 3: `orders` is Order Size, 'stars' (Follow the Stars) or 'one' (One Item);
 *  `music` is gone (there is none); `graphics` is gone, after read() hands the old value back
 *  once as `handoff.graphics` for the page to give NarbeGraphics.setChoice.
 *
 *  Pure: this builds and reads the records. js/save.js does the localStorage calls.
 *  Auto Scan, Scan Speed, Parking, the voice and Text to Speech belong to the Hub's shared
 *  managers and follow the player into every game, so they are not saved here.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.BB = root.BB || {}).savefmt = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const VERSIONS = { settings: 3, progress: 2, shift: 2 };
  const packId = pack => (pack && typeof pack === 'object' ? pack.id : pack);
  /** 'bb-settings', 'bb-progress:<pack>', 'bb-shift:<pack>' (pack: a pack or its id). */
  const key = (kind, pack) => (kind === 'settings' ? 'bb-settings' : 'bb-' + kind + ':' + packId(pack));
  /** What Reset Progress clears (spec 6.4): bb-court and every restaurant's progress and shift. */
  const isProgressKey = k => k === 'bb-court' || /^bb-(progress|shift):/.test(String(k));
  const resetKeys = keys => (keys || []).filter(isProgressKey);

  /** Settings, in the order of the Settings card (spec 6.4; Hub-owned ones left out). */
  const DEFAULT_SETTINGS = {
    cooking: 'simple',           // simple | timed
    speed: 'verySlow',           // verySlow | slow | normal (Timed only)
    shiftLength: 5,              // 5 | 3 | 8
    orders: 'stars',             // Order Size: stars (Follow the Stars) | one (One Item)
    manager: 'hintsJokes',       // the Assistant Manager: hintsJokes | hints | off
    characterVoices: 'voices',   // voices | captions | off
    theme: 'standard',           // standard | contrast
    motion: 'full',              // full | reduced
    textSize: 'normal',          // normal | large | xlarge
    sfx: true,
  };
  /** The values each setting can take (anything else reads as the default). */
  const SETTING_VALUES = {
    cooking: ['simple', 'timed'],
    speed: ['verySlow', 'slow', 'normal'],
    shiftLength: [5, 3, 8],
    orders: ['stars', 'one'],
    manager: ['hintsJokes', 'hints', 'off'],
    characterVoices: ['voices', 'captions', 'off'],
    theme: ['standard', 'contrast'],
    motion: ['full', 'reduced'],
    textSize: ['normal', 'large', 'xlarge'],
    sfx: [true, false],
  };
  /** The old Orders setting as Order Size: Simple asked for one-item orders. */
  const ORDER_SIZE = { simple: 'one', usual: 'stars', fancy: 'stars' };

  /** Every setting known, each a value it can take. */
  function cleanSettings(data) {
    const out = Object.assign({}, DEFAULT_SETTINGS);
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      let v = data[k];
      if (k === 'orders' && ORDER_SIZE[v]) v = ORDER_SIZE[v];
      if (k === 'shiftLength' && v !== undefined) v = +v;
      if (SETTING_VALUES[k].includes(v)) out[k] = v;
    }
    return out;
  }

  /** v -> v + 1 steps, per kind. handoff collects values a migration takes out of the save that
   *  the page must pass on once (settings 2 -> 3: graphics, to NarbeGraphics). */
  const MIGRATIONS = {
    settings: {
      // The Burger Bar's redesign renamed the cooking modes and dropped five settings.
      1: d => {
        const out = Object.assign({}, d);
        out.cooking = d.cooking === 'timed' ? 'timed' : 'simple';
        if (d.mitch !== undefined) { out.manager = d.mitch; delete out.mitch; }
        ['tts', 'burning', 'pouring', 'customersAtOnce', 'mistakeWarnings', 'star'].forEach(k => { delete out[k]; });
        return out;
      },
      // The Food Court: Orders becomes Order Size; no Music; Graphics Quality goes to NarbeGraphics.
      2: (d, handoff) => {
        const out = Object.assign({}, d);
        if (out.orders !== undefined) out.orders = ORDER_SIZE[out.orders] || (out.orders === 'one' ? 'one' : 'stars');
        if (typeof out.graphics === 'string' && out.graphics) handoff.graphics = out.graphics;
        delete out.graphics;
        delete out.music;
        return out;
      },
    },
    progress: {
      // Coins and how many shifts; the old shop (unlocks, decor) and visitors' book are gone. The
      // tutorial flags stay for BB.courtRules.migrate to read.
      1: d => {
        const out = { coins: Math.max(0, +d.coins || 0), shifts: Math.max(0, +d.shifts || 0) };
        ['tutorialOffered', 'tutorialDone'].forEach(k => { if (d[k] !== undefined) out[k] = d[k]; });
        return out;
      },
    },
    shift: {
      // The ladder: a shift made before it was off the ladder (no level).
      1: d => {
        const out = Object.assign({}, d);
        if (out.settings && ORDER_SIZE[out.settings.orders]) out.settings = Object.assign({}, out.settings, { orders: ORDER_SIZE[out.settings.orders] });
        if (out.level === undefined) out.level = null;
        if (out.event === undefined) out.event = null;
        if (out.drawn === undefined) out.drawn = null;
        if (!Array.isArray(out.plan)) out.plan = (out.queue || []).map(() => ({}));
        if (out.counted === undefined) out.counted = false;
        out.v = 2;
        return out;
      },
    },
  };

  /** A record to store. pack: the pack (or null for settings). */
  function wrap(kind, pack, data) {
    return { v: VERSIONS[kind], kind, pack: pack ? packId(pack) : null, packVersion: pack && typeof pack === 'object' ? pack.version : null, data };
  }

  /** Read a stored record. -> { ok: true, data, upgraded?, handoff? } or { ok: false, reason, keep }.
   *  keep: true means leave the stored record alone (it is from a newer game, or not this one's).
   *  handoff (settings only): values the page passes on once, e.g. { graphics: 'low' }. */
  function read(kind, raw, pack) {
    let rec = raw;
    if (typeof raw === 'string') { try { rec = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'corrupt', keep: false }; } }
    if (!rec || typeof rec !== 'object' || rec.data === undefined || rec.data === null) return { ok: false, reason: 'missing', keep: false };
    if (rec.kind && rec.kind !== kind) return { ok: false, reason: 'kind', keep: true };
    if (rec.v > VERSIONS[kind]) return { ok: false, reason: 'newer', keep: true };
    let data = JSON.parse(JSON.stringify(rec.data));
    const handoff = {};
    for (let v = rec.v || 1; v < VERSIONS[kind]; v++) data = MIGRATIONS[kind][v](data, handoff);
    if (kind === 'settings') {
      const out = { ok: true, data: cleanSettings(data) };
      if (Object.keys(handoff).length) out.handoff = handoff;
      return out;
    }
    if (rec.pack !== packId(pack)) return { ok: false, reason: 'pack', keep: true };
    if (pack && typeof pack === 'object' && rec.packVersion !== pack.version) {
      if (kind === 'shift') return { ok: false, reason: 'packVersion', keep: false };
      return { ok: true, data, upgraded: true };        // coins survive a pack change
    }
    return { ok: true, data };
  }

  /** May this record be written over what is stored? Never over a newer save. */
  function canWrite(kind, stored) {
    let rec = stored;
    if (typeof stored === 'string') { try { rec = JSON.parse(stored); } catch (e) { return true; } }
    return !rec || !(rec.v > VERSIONS[kind]);
  }

  return { VERSIONS, key, isProgressKey, resetKeys, DEFAULT_SETTINGS, SETTING_VALUES, MIGRATIONS, cleanSettings, wrap, read, canWrite };
});
