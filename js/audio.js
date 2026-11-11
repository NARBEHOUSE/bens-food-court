/** Ben's Food Court - sound effects and the characters' voices (build spec 6.6; docs/api/audio.md).
 *
 *  Lines. A character's line is spoken in that character's own text-to-speech voice:
 *  NarbeVoiceManager.cancel(), then NarbePlatform.speech.speak(words, { voice, pitch, rate,
 *  volume }), and the wait is capped by NarbeVoiceManager.getSpeechTimeout. speechSynthesis
 *  is never touched here, and nothing in shared/ is changed. With the hub's Text to Speech
 *  off, a line is a silent pause for its reading time (the caption stays up). The scanner
 *  always wins: its next label cancels a character line (the line then ends; it is never
 *  restarted), and a character line never holds the scanner's speech ticket.
 *  Character Voices: Voices and Captions / Captions Only (reading time, no voice) / Off (no
 *  line at all, except an `essential` line, which is said in the game's own voice).
 *
 *  Voices. voiceFor(person) takes the device's English voices: the first of the person's
 *  tts.voices name fragments that matches wins; otherwise a stable hash of their id picks
 *  one, skipping the player's scan voice when another exists. The choice is cached and made
 *  again when the voice list (or the scan voice) changes. Pitch is the character's; rate is
 *  the player's rate times the character's.
 *
 *  Recordings. Recorded clips play only when BBCourt.recordedVoices === true (a missing
 *  BBCourt counts as false): until the final voice pass every line is text to speech.
 *
 *  Sounds. WAV files played through the hub's SafeAudio, never Web Audio. BBSounds (the index
 *  tools/make-sounds.cjs writes to packs/shared/sound/sounds.js) lists what exists, so a
 *  missing file is never preloaded. A name resolves in the restaurant in use, then in
 *  shared; 'court:chime' or 'shared:plop' names the folder. SafeAudio ids are
 *  bb-<folder>-<name>.
 *
 *  In Node, require() gives the pure helpers and create(env); the page gets BB.audio.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.BB = root.BB || {}).audio = api.create(root);
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  /* ── pure helpers (tests/voices.test.cjs) ──────────────────────────────── */

  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** A stable 32-bit hash of an id: FNV-1a, then a murmur3 finish so every bit mixes
   *  (plain FNV-1a's low bits barely change between similar short ids). */
  function hashId(id) {
    let h = 0x811c9dc5;
    const s = String(id);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /** Does a voice's name contain this fragment, starting at a word start? Case does not
   *  matter: 'zira' matches "Microsoft Zira - English (United States)"; 'ana' does not
   *  match "Diana". */
  function matches(voiceName, fragment) {
    const f = String(fragment || '').trim().toLowerCase();
    if (!f) return false;
    const n = String(voiceName || '').toLowerCase();
    for (let i = n.indexOf(f); i >= 0; i = n.indexOf(f, i + 1)) {
      if (i === 0 || !/[a-z0-9]/.test(n[i - 1])) return true;
    }
    return false;
  }

  /** One voice per name, in name order, so a pick never depends on the engine's order. */
  function voiceList(voices) {
    const seen = new Set(), out = [];
    for (const v of voices || []) {
      if (!v || typeof v.name !== 'string' || seen.has(v.name)) continue;
      seen.add(v.name);
      out.push(v);
    }
    return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  /** The voice for a person { id, tts: { voices: [fragments] } } from a list of English
   *  voices: the first fragment that matches; else a stable hash pick, skipping the scan
   *  voice (by name) when another voice exists. -> a voice from the list, or null.
   *  The hash pick is rendezvous hashing: each voice gets a score from hash(id + voice
   *  name) and the highest wins. It spreads people evenly, and when a voice comes or goes
   *  (or becomes the scan voice) only the people on that voice move. */
  function pickVoice(person, voices, scanVoiceName) {
    const list = voiceList(voices);
    if (!list.length) return null;
    const P = person || {};
    const frags = (P.tts && Array.isArray(P.tts.voices)) ? P.tts.voices : [];
    for (const f of frags) {
      const v = list.find(x => matches(x.name, f));
      if (v) return v;
    }
    const others = scanVoiceName ? list.filter(v => v.name !== scanVoiceName) : list;
    const pool = others.length ? others : list;
    const id = P.id === undefined || P.id === null ? '' : String(P.id);
    let best = null, top = -1;
    for (const v of pool) {
      const w = hashId(id + '\u0000' + v.name);
      if (w > top) { best = v; top = w; }
    }
    return best;
  }

  /** How text to speech says a person's lines: their pitch (it replaces the player's), the
   *  player's rate times theirs, and the player's volume. */
  function recipe(person, player) {
    const t = (person && person.tts) || {};
    const p = player || {};
    return {
      pitch: clamp(num(t.pitch, 1), 0, 2),
      rate: clamp(num(p.rate, 1) * num(t.rate, 1), 0.5, 2),
      volume: clamp(num(p.volume, 1), 0, 1),
    };
  }

  /** How long a caption stays up when nothing is spoken. */
  const readingTime = text => Math.max(1300, String(text).length * 62);

  /** The words without sound tags ("[sigh]"): what captions show and text to speech says. */
  const cleanWords = text => String(text).replace(/\[[^\]]*\]/g, ' ').replace(/\s{2,}/g, ' ').trim();

  /** FNV-1a as 8 hex digits: the fingerprint a voice manifest keeps for a clip's words. */
  function textHash(text) {
    let h = 0x811c9dc5;
    const s = String(text);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /** What a station plays when its sounds don't say. */
  const HOOK_DEFAULTS = { add: 'plop', stage: 'tick' };

  /* ── the live module ───────────────────────────────────────────────────── */

  /** BB.audio over a set of globals (the window in the page; fakes in the Node tests). */
  function create(env) {
    env = env || {};
    const T = env.timers || {
      setTimeout: (f, ms) => setTimeout(f, ms),
      clearTimeout: id => clearTimeout(id),
      now: () => Date.now(),
    };
    const vm = () => env.NarbeVoiceManager || null;
    const speech = () => (env.NarbePlatform && env.NarbePlatform.speech) || null;
    const SC = () => (env.BB && env.BB.script) || null;
    const setting = k => (env.BB && env.BB.save && env.BB.save.get ? env.BB.save.get(k) : undefined);
    const clean = text => { const s = SC(); return s && s.clean ? s.clean(text) : cleanWords(text); };

    /* ── the restaurant in use, and its people ── */
    let bound = null;
    /** The pack in use: the one given to use(); on a page that has loaded exactly one
     *  pack and never called use(), that one. */
    function currentPack() {
      if (bound) return bound;
      const P = env.BBPacks, ids = P ? Object.keys(P) : [];
      return ids.length === 1 ? P[ids[0]] : null;
    }
    function use(pack) {
      bound = pack || null;
      if (bound && bound.id) preloadFolder(bound.id);
      return bound;
    }
    /** Who someone is, for their voice: the pack's manager or regular entry, with the
     *  persona (tts) from BBCast when the cast has them. -> { id, tts, ... } or null */
    function person(who) {
      if (who && typeof who === 'object') {
        if (who.tts || who.id === undefined || who.id === null) return who;
        const found = person(who.id);
        return found ? Object.assign({}, who, { tts: found.tts }) : who;
      }
      const p = currentPack();
      let P = null;
      if (p && p.manager && p.manager.id === who) P = p.manager;
      else if (p && Array.isArray(p.regulars)) P = p.regulars.find(c => c && c.id === who) || null;
      const people = env.BBCast && env.BBCast.people;
      const C = people && Object.prototype.hasOwnProperty.call(people, who) ? people[who] : null;
      if (!P && !C) return null;
      return Object.assign({ id: who }, C || {}, P || {}, { tts: (C && C.tts) || (P && P.tts) || {} });
    }

    /* ── voices ── */
    let ready = null;
    /** Waits (once, bounded) for the hub's voice list. Resolves true when voices loaded. */
    function voicesReady() {
      if (!ready) {
        const v = vm();
        ready = v && v.waitForVoices
          ? Promise.resolve().then(() => v.waitForVoices(2500)).then(Boolean, () => false)
          : Promise.resolve(false);
      }
      return ready;
    }
    const englishVoices = () => { const v = vm(); return v && v.getEnglishVoices ? v.getEnglishVoices() || [] : []; };
    const scanVoiceName = () => { const v = vm(); const c = v && v.getCurrentVoice ? v.getCurrentVoice() : null; return c ? c.name : null; };
    const cache = { sig: null, map: new Map() };
    /** The voice a person speaks in (a person object or an id), or null when the device
     *  has no English voices yet. Cached until the voice list or the scan voice changes. */
    function voiceFor(who) {
      const P = person(who) || { id: who === undefined || who === null ? '' : String(who) };
      const list = englishVoices();
      if (!list.length) return null;
      const scan = scanVoiceName();
      const sig = list.map(v => v.name).join('\n') + '\n#' + scan;
      if (sig !== cache.sig) { cache.sig = sig; cache.map.clear(); }
      const key = P.id + '\n' + JSON.stringify((P.tts && P.tts.voices) || []);
      if (!cache.map.has(key)) { const v = pickVoice(P, list, scan); cache.map.set(key, v ? v.name : null); }
      const name = cache.map.get(key);
      return name === null ? null : list.find(v => v.name === name) || null;
    }

    /* ── recordings (off until the voice pass) ── */
    const recordingsOn = () => !!(env.BBCourt && env.BBCourt.recordedVoices === true);
    function manifests() {
      if (!recordingsOn()) return [];
      const V = env.BBVoice || {}, p = currentPack(), out = [];
      if (p && p.id && V[p.id]) out.push({ data: V[p.id], base: 'packs/' + p.id + '/voice/' });
      if (V.cast) out.push({ data: V.cast, base: 'packs/cast/voice/' });
      if (V.court) out.push({ data: V.court, base: 'packs/court/voice/' });
      return out;
    }
    function fileFor(clip, text) {
      if (!clip) return null;
      for (const m of manifests()) {
        const s = SC();
        const f = s && s.recording ? s.recording(m.data, clip, text)
          : (m.data[clip] && m.data[clip].hash === textHash(text) ? m.data[clip].file : null);
        if (f) return m.base + f;
      }
      return null;
    }
    /** Is this clip recorded with these exact words, and are recordings on? */
    const recorded = (clip, text) => !!fileFor(clip, text);

    /* ── saying a line ── */
    let current = null;               // { resolve, ticket?, audio?, timer?, cap? }
    let tail = null;                  // a capped line's speech that may still be going
    function stop() {
      const c = current;
      current = null;
      const t = tail;
      tail = null;
      try { if (t && t !== (c && c.ticket)) t.cancel(); } catch (e) { /* gone */ }
      if (!c) return;
      try { if (c.audio) { c.audio.pause(); c.audio.src = ''; } } catch (e) { /* gone */ }
      try { if (c.ticket) c.ticket.cancel(); } catch (e) { /* gone */ }
      T.clearTimeout(c.timer);
      T.clearTimeout(c.cap);
      c.resolve({ stopped: true });
    }

    /** Say something as a character. line = { who, text, clip?, parts?: [{ clip, text }],
     *  essential? }. Resolves (never rejects) once it has been said, or shown for reading
     *  time, or was stopped: { tts | silent | captions | recorded | skipped | stopped }. */
    function say(line) {
      stop();
      if (!line || !line.text) return Promise.resolve({ skipped: true });
      const mode = setting('characterVoices') || 'voices';
      if (mode === 'off' && !line.essential) return Promise.resolve({ skipped: true });
      const words = clean(line.text);
      return new Promise(resolve => {
        const slot = { resolve };
        current = slot;
        const done = r => {
          if (current === slot) current = null;
          T.clearTimeout(slot.timer);
          T.clearTimeout(slot.cap);
          resolve(r || {});
        };
        if (mode === 'captions') { slot.timer = T.setTimeout(() => done({ captions: true }), readingTime(words)); return; }
        const gameVoice = mode === 'off';
        let files = null;
        if (!gameVoice && Array.isArray(line.parts) && line.parts.length) {
          const each = line.parts.map(p => fileFor(p.clip, p.text));
          files = each.every(Boolean) ? each : null;
        } else if (!gameVoice && line.clip) {
          const f = fileFor(line.clip, line.text);
          files = f ? [f] : null;
        }
        const tts = () => { if (current === slot) speakTTS(line.who, words, slot, done, gameVoice); };
        if (files) playFiles(files, slot, done, tts);
        else tts();
      });
    }

    function speakTTS(who, words, slot, done, gameVoice) {
      const v = vm(), S = speech();
      const st = v && v.getSettings ? v.getSettings() : null;
      const pause = (reason) => { slot.timer = T.setTimeout(() => done({ silent: true, reason }), readingTime(words)); };
      if (!v || !S || !st || !st.ttsEnabled) { pause('tts off'); return; }
      voicesReady().then(() => {
        if (current !== slot) return;             // stopped while the voices loaded
        const P = person(who) || { id: who === undefined || who === null ? '' : String(who) };
        let opts;
        if (gameVoice) {
          const r = recipe(null, st);
          opts = { voice: v.getCurrentVoice ? v.getCurrentVoice() : null, pitch: clamp(num(st.pitch, 1), 0, 2), rate: clamp(num(st.rate, 1), 0.1, 10), volume: r.volume };
        } else opts = Object.assign({ voice: voiceFor(P) }, recipe(P, st));
        if (!opts.voice) delete opts.voice;
        const began = T.now();
        try { v.cancel(); } catch (e) { /* nothing was speaking */ }
        let ticket = null;
        try { ticket = S.speak(words, opts); } catch (e) { ticket = null; }
        if (!ticket || !ticket.finished) { pause('no engine'); return; }
        slot.ticket = ticket;
        const limit = v.getSpeechTimeout ? v.getSpeechTimeout(words, opts.rate) : 10000;
        // The cap settles the wait without cutting the words off; the next line, the
        // scanner's next label or stop() still ends them. A long line (a tutorial station,
        // a long order) can outlast the cap: while the engine says it is still speaking,
        // the wait goes on (250 ms looks, two minutes at most), so the next line never
        // cuts its tail off.
        const capped = () => {
          if (current !== slot) return;
          const engine = env.speechSynthesis;     // read only: is it still talking? (speech itself goes through NarbePlatform)
          if (engine && engine.speaking && T.now() - began < 120000) { slot.cap = T.setTimeout(capped, 250); return; }
          tail = ticket; done({ tts: true, capped: true });
        };
        slot.cap = T.setTimeout(capped, limit);
        ticket.finished.then(r => {
          if (tail === ticket) tail = null;
          if (current !== slot) return;
          const reason = r && r.reason;
          if (reason === 'end' || reason === 'cancelled' || (r && r.started)) { done({ tts: true, reason }); return; }
          // The engine could not say it: keep the caption up for its reading time.
          const left = readingTime(words) - (T.now() - began);
          T.clearTimeout(slot.cap);
          if (left > 0) slot.timer = T.setTimeout(() => done({ silent: true, reason }), left);
          else done({ silent: true, reason });
        }, () => { if (current === slot) done({ silent: true, reason: 'error' }); });
      });
    }

    /** Recorded files one after another (an order said in parts), then done. */
    function playFiles(files, slot, done, fail) {
      let k = 0;
      const next = () => {
        if (current !== slot) return;
        if (k >= files.length) { done({ recorded: true }); return; }
        let a;
        try { a = new env.Audio(files[k++]); } catch (e) { fail(); return; }
        slot.audio = a;
        const guard = T.setTimeout(() => { try { a.pause(); } catch (e) { /* gone */ } slot.audio = null; fail(); }, 15000);
        a.onended = () => { T.clearTimeout(guard); T.setTimeout(next, k < files.length ? 90 : 0); };
        a.onerror = () => { T.clearTimeout(guard); slot.audio = null; fail(); };
        let p;
        try { p = a.play(); } catch (e) { T.clearTimeout(guard); slot.audio = null; fail(); return; }
        if (p && p.catch) p.catch(() => { T.clearTimeout(guard); slot.audio = null; fail(); });
      };
      next();
    }

    /* ── sound effects ── */
    const index = () => env.BBSounds || null;
    const loaded = new Set(), warned = new Set();
    /** Where a sound name leads: 'folder:name', or a bare name (the pack in use, then
     *  shared). -> { id, url, folder, name, dur, vol } or null */
    function sound(name) {
      const I = index();
      if (!I || !name) return null;
      let n = String(name), list;
      const k = n.indexOf(':');
      if (k > 0) { list = [n.slice(0, k)]; n = n.slice(k + 1); }
      else { const p = currentPack(); list = p && p.id ? [p.id, 'shared'] : ['shared']; }
      for (const f of list) {
        const e = I[f] && typeof I[f] === 'object' && Object.prototype.hasOwnProperty.call(I[f], n) ? I[f][n] : null;
        if (e) return { id: 'bb-' + f + '-' + n, url: 'packs/' + f + '/sound/' + n + '.wav', folder: f, name: n, dur: num(e.dur, 0), vol: num(e.vol, 0.5) };
      }
      return null;
    }
    function preload(r) {
      if (!r || loaded.has(r.id) || !env.SafeAudio) return;
      loaded.add(r.id);
      try { env.SafeAudio.preload(r.id, r.url); } catch (e) { /* sound is optional */ }
    }
    function preloadFolder(folder) {
      const I = index();
      if (I && I[folder] && typeof I[folder] === 'object') Object.keys(I[folder]).forEach(n => preload(sound(folder + ':' + n)));
    }
    const sfxOn = () => setting('sfx') !== false;
    /** Play a sound. vol: 0-1 (default: the volume the sound was made for). Returns its
     *  length in ms (0 when nothing played), so a playout can wait for it. */
    function sfx(name, vol) {
      const r = sound(name);
      if (!r) {
        if (index() && !warned.has(String(name))) { warned.add(String(name)); try { console.warn('BB.audio: no sound "' + name + '"'); } catch (e) { /* quiet */ } }
        return 0;
      }
      if (!sfxOn() || !env.SafeAudio) return 0;
      preload(r);
      try { env.SafeAudio.play(r.id, vol === undefined || vol === null ? r.vol : vol); } catch (e) { return 0; }
      return Math.round(r.dur * 1000);
    }
    /** A station's sound for a moment (hook: add, cook, stage, done, auto). The station's
     *  own `sounds` name it (null there means silence); add defaults to plop, stage to
     *  tick. station: a station object or its id in the pack in use. Returns ms, as sfx. */
    function station(st, hook, vol) {
      const p = currentPack();
      const S = typeof st === 'string' ? (p && p.stations && p.stations[st]) || null : st;
      const own = S && S.sounds && Object.prototype.hasOwnProperty.call(S.sounds, hook);
      const name = own ? S.sounds[hook] : HOOK_DEFAULTS[hook];
      return name ? sfx(name, vol) : 0;
    }

    /** Load the sound index when the page did not (it is a plain script). */
    function withIndex(then) {
      if (index() || !env.document || !env.document.createElement) { then(); return; }
      try {
        const s = env.document.createElement('script');
        s.src = 'packs/shared/sound/sounds.js';
        s.onload = then;
        s.onerror = () => { try { console.warn('BB.audio: no sound index (run node tools/make-sounds.cjs)'); } catch (e) { /* quiet */ } };
        (env.document.head || env.document.body || env.document.documentElement).appendChild(s);
      } catch (e) { /* no sounds */ }
    }
    function init() {
      withIndex(() => {
        preloadFolder('shared');
        preloadFolder('court');
        const p = currentPack();
        if (p && p.id) preloadFolder(p.id);
      });
      voicesReady();
    }

    return {
      init, use, pack: currentPack,
      sfx, station, sound,
      say, stop, busy: () => !!current,
      recorded, recordings: recordingsOn,
      voiceFor, person, ready: voicesReady, readingTime,
    };
  }

  return { create, hashId, matches, voiceList, pickVoice, recipe, readingTime, cleanWords, textHash, HOOK_DEFAULTS };
});
