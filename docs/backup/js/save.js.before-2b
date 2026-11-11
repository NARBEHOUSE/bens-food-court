/** Ben's Food Court - what is kept in localStorage (FOODCOURT-BUILD.md 7; docs/api/page.md).
 *
 *    bb-settings          one set for the whole court, version 3, through js/core/savefmt.js
 *    bb-court             stars, popularity, unlocks, tutorial flags, through js/core/court.js (BB.courtRules)
 *    bb-progress:<pack>   a restaurant's coins (js/core/progress.js)
 *    bb-shift:<pack>      the shift in progress there, saved as it is after every answer; a finished shift stays
 *                         saved until it has been counted (S.claim), so leaving from the receipt never loses it
 *  Auto Scan, Scan Speed, the voice and Text to Speech belong to the Hub's shared managers and follow the player
 *  into every game, so they are not kept here. Storage can be missing or full; every call copes. A record from a
 *  newer game is read as defaults and never written over.
 */
(function () {
  'use strict';
  const F = BB.savefmt, R = BB.courtRules, PR = BB.progress, S = BB.shift;

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  function remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage blocked */ } }
  function keys() { try { return Object.keys(localStorage); } catch (e) { return []; } }
  const packId = p => (p && typeof p === 'object' ? p.id : p);

  /* ── settings ── */
  const SKEY = F.key('settings', null);
  const got = F.read('settings', read(SKEY), null);
  const locked = !got.ok && got.keep;          // a save from a newer game: read as defaults, never written over
  let settings = got.ok ? got.data : Object.assign({}, F.DEFAULT_SETTINGS);
  // Values a migration took out of the save for the page to pass on once (settings 2 -> 3: graphics).
  let handoff = got.ok && got.handoff ? got.handoff : null;
  const listeners = [];
  function storeSettings() {
    if (locked || !F.canWrite('settings', read(SKEY))) return;
    write(SKEY, JSON.stringify(F.wrap('settings', null, settings)));
  }
  // An upgraded record is stored at once in the new version, so the hand-off never comes back.
  if (got.ok && handoff) storeSettings();

  /* ── the court ── */
  const CKEY = R.KEY;
  /** Every restaurant's old bb-progress data (the tutorial flags carry into the court's record). */
  function oldProgress() {
    const out = {};
    for (const k of keys()) {
      const m = /^bb-progress:(\w+)$/.exec(k);
      if (!m) continue;
      const r = F.read('progress', read(k), m[1]);
      if (r.ok) out[m[1]] = r.data;
    }
    return out;
  }
  let court = R.migrate(BBCourt, read(CKEY), { progress: oldProgress() });
  function storeCourt() {
    if (!R.canWrite(read(CKEY))) return;
    write(CKEY, JSON.stringify(R.record(court)));
  }

  /* ── a restaurant's progress: coins ── */
  const progress = {};
  function progressOf(pack) {
    const id = packId(pack);
    if (!progress[id]) {
      const r = F.read('progress', read(F.key('progress', pack)), pack);
      progress[id] = r.ok ? Object.assign(PR.create(pack), r.data) : PR.create(pack);
    }
    return progress[id];
  }
  function storeProgress(pack) {
    const key = F.key('progress', pack);
    if (!F.canWrite('progress', read(key))) return;
    write(key, JSON.stringify(F.wrap('progress', pack, progressOf(pack))));
  }

  /* ── the shift in progress, per restaurant ── */
  const shift = {
    /** The saved shift of a restaurant (this pack and version), or null. Pass the merged pack. */
    load(pack) {
      const r = F.read('shift', read(F.key('shift', pack)), pack);
      return r.ok ? r.data : null;
    },
    save(pack, s) {
      if (!s || s.tutorial) return;
      const key = F.key('shift', pack);
      if (!F.canWrite('shift', read(key))) return;
      write(key, JSON.stringify(F.wrap('shift', pack, s)));
    },
    clear(pack) { remove(F.key('shift', pack)); },
    /** Which loaded restaurants have a shift that can be carried on (the court's "shift in progress"). */
    savedIds() {
      const out = [];
      for (const id of BB.packs.ids()) {
        const v = BB.packs.get(id);
        if (!v) continue;
        const s = shift.load(v.pack);
        if (s && S.resumable(v.pack, s)) out.push(id);
      }
      return out;
    },
  };

  BB.save = {
    get: k => (settings[k] === undefined ? F.DEFAULT_SETTINGS[k] : settings[k]),
    set(k, v) {
      settings[k] = v; storeSettings();
      listeners.forEach(fn => { try { fn(k, v); } catch (e) { console.error(e); } });
    },
    all: () => Object.assign({}, settings),
    onChange(fn) { listeners.push(fn); },
    /** The one-time hand-off of a migrated settings value ({ graphics }), then nothing. */
    takeHandoff() { const h = handoff; handoff = null; return h; },
    /** The court's state (live: BB.courtRules changes it in place); saveCourt stores it. */
    court: () => court,
    saveCourt: storeCourt,
    progress: progressOf,
    saveProgress: storeProgress,
    shift,
    /** Reset Progress (spec 6.4): bb-court, every bb-progress:* and every bb-shift:*. Settings stay. */
    resetProgress() {
      F.resetKeys(keys()).forEach(remove);
      Object.keys(progress).forEach(k => { delete progress[k]; });
      court = R.create(BBCourt);
      storeCourt();
    },
  };
})();
