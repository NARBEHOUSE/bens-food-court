/** Voices and sounds (build spec 6.6; docs/api/audio.md).
 *
 *  Voices: how a character's text-to-speech voice is chosen (js/audio.js pickVoice and
 *  voiceFor), that people who can meet at one restaurant never sound the same, and how a
 *  line is spoken (BB.audio.say over fake hub speech engines and a fake clock).
 *  Sounds: every sound in the index exists and stays short, soft and below about 2.5 kHz;
 *  the 12 original sounds are unchanged; names resolve in the restaurant, then shared; and
 *  every sound a pack's stations name exists.
 *  BB_PACKS=<id,...> limits the pack loops. BB_CAST=<file> checks another cast file in place
 *  of packs/cast/cast.js (to try out tts recipes before writing them).
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const G = path.join(__dirname, '..');
const A = require(path.join(G, 'js', 'audio.js'));
const MS = require(path.join(G, 'tools', 'make-sounds.cjs'));
const SOUNDS = require(MS.INDEX);

/** A pack-area file if it exists (a missing file is null; a broken one throws). */
const optional = rel => (fs.existsSync(path.join(G, rel)) ? require(path.join(G, rel)) : null);
const COURT = optional('packs/court/court.js');
const CAST = process.env.BB_CAST ? require(path.resolve(process.env.BB_CAST)) : optional('packs/cast/cast.js');
const ONLY = process.env.BB_PACKS ? process.env.BB_PACKS.split(',').map(s => s.trim()).filter(Boolean) : null;
const RESTAURANTS = (COURT && Array.isArray(COURT.restaurants) ? COURT.restaurants.map(r => r.pack || r.id) : ['smoothie', 'burrito', 'pizza', 'diner', 'cafe', 'icecream', 'sushi'])
  .filter(id => !ONLY || ONLY.includes(id));

const V = n => ({ name: 'Microsoft ' + n + ' - English (United States)', lang: 'en-US' });
const THREE = ['David', 'Zira', 'Mark'].map(V);
const SIX = ['David', 'Zira', 'Mark', 'Hazel', 'George', 'Susan'].map(V);
const short = v => (v ? v.name.split(' ')[1] : null);

/* ══ choosing voices ════════════════════════════════════════════════════════ */

test('voiceFor is deterministic: the same person gets the same voice in any list order, and the hash is pinned', () => {
  const orders = [SIX, SIX.slice().reverse(), [SIX[3], SIX[0], SIX[5], SIX[1], SIX[4], SIX[2]]];
  for (const id of ['mitch', 'marge', 'tony', 'shopper3', '']) {
    for (const scan of [null, SIX[1].name]) {
      const names = orders.map(list => A.pickVoice({ id, tts: {} }, list, scan).name);
      assert.equal(new Set(names).size, 1, id + ': ' + names.join(' / '));
    }
  }
  // Duplicated names count once.
  assert.equal(A.pickVoice({ id: 'gus' }, SIX.concat(SIX), null).name, A.pickVoice({ id: 'gus' }, SIX, null).name);
  // A changed hash would quietly give every character a new voice.
  assert.equal(A.hashId('marge'), 2550962567);
  assert.equal(A.hashId('mitch'), 3880132072);
});

test('voiceFor honours preferred fragments: the first that matches wins, any case, at a word start', () => {
  const marge = { id: 'marge', tts: { voices: ['Hazel', 'zira', 'David'] } };
  assert.equal(short(A.pickVoice(marge, THREE, null)), 'Zira', 'Hazel is not installed, so the next one');
  assert.equal(short(A.pickVoice(marge, SIX, null)), 'Hazel');
  // A preferred voice is used even when it is the player's scan voice.
  assert.equal(short(A.pickVoice({ id: 'x', tts: { voices: ['David'] } }, THREE, THREE[0].name)), 'David');
  // Fragments match at a word start only.
  assert.equal(A.matches('Microsoft Mark - English', 'mark'), true);
  assert.equal(A.matches('Microsoft Mark - English', 'ark'), false);
  assert.equal(A.matches('Google Diana', 'ana'), false);
  assert.equal(A.matches('Google UK English Female', 'uk english'), true);
  assert.equal(A.matches('Anything', ''), false);
  // No fragment matches: the hash pick, as if there were none.
  assert.equal(A.pickVoice({ id: 'marge', tts: { voices: ['Nobody'] } }, THREE, null).name, A.pickVoice({ id: 'marge' }, THREE, null).name);
});

test("voiceFor skips the player's scan voice whenever another voice exists", () => {
  for (const list of [THREE, SIX]) {
    for (const scan of list) {
      for (let i = 0; i < 150; i++) assert.notEqual(A.pickVoice({ id: 'p' + i }, list, scan.name).name, scan.name);
    }
  }
  assert.equal(A.pickVoice({ id: 'p' }, [THREE[0]], THREE[0].name).name, THREE[0].name, 'the only voice there is');
  assert.equal(A.pickVoice({ id: 'p' }, [], null), null);
});

test('voiceFor spreads characters over the voices there are, and only the people on a voice move when it comes or goes', () => {
  const ids = Array.from({ length: 60 }, (_, i) => 'person' + i);
  for (const scan of [null, SIX[0].name]) {
    const pool = SIX.filter(v => v.name !== scan), fair = ids.length / pool.length, count = new Map(pool.map(v => [v.name, 0]));
    ids.forEach(id => { const v = A.pickVoice({ id }, SIX, scan); count.set(v.name, count.get(v.name) + 1); });
    for (const [name, n] of count) {
      assert.ok(n >= 1, name + ' is never used');
      assert.ok(n <= 2 * fair, name + ' has ' + n + ' of ' + ids.length);
    }
  }
  // The court's real ids, with no preferences, still use every voice.
  const people = CAST ? Object.keys(CAST.people) : ['mitch', 'marge', 'gus', 'bev', 'vernon', 'sal', 'dale', 'priya', 'oakes', 'reginald', 'kai', 'tasha',
    'tony', 'pam', 'breeze', 'brock', 'jitters', 'hiro', 'dennis', 'inferno', 'rita', 'lulu', 'walt', 'pa'];
  assert.equal(new Set(people.map(id => A.pickVoice({ id }, SIX, null).name)).size, SIX.length);
  // A sixth voice arrives: only the people who now get it move.
  for (const id of ids) {
    const before = A.pickVoice({ id }, SIX.slice(0, 5), null), after = A.pickVoice({ id }, SIX, null);
    if (before.name !== after.name) assert.equal(short(after), 'Susan', id);
  }
});

test('voiceFor in the page is cached, and chosen again when the voice list or the scan voice changes', () => {
  const f = fakeEnv({ voices: THREE, scan: THREE[0].name });
  const audio = A.create(f.env);
  const first = audio.voiceFor({ id: 'marge' });
  assert.equal(first.name, A.pickVoice({ id: 'marge' }, THREE, THREE[0].name).name);
  assert.equal(audio.voiceFor({ id: 'marge' }), first);
  f.setVoices(SIX);
  assert.equal(audio.voiceFor({ id: 'marge' }).name, A.pickVoice({ id: 'marge' }, SIX, THREE[0].name).name);
  f.setScan(SIX[3].name);
  assert.equal(audio.voiceFor({ id: 'marge' }).name, A.pickVoice({ id: 'marge' }, SIX, SIX[3].name).name);
  f.setVoices([]);
  assert.equal(audio.voiceFor({ id: 'marge' }), null, 'no English voices yet');
  // An id is looked up: the cast's tts (persona) wins over a pack's own.
  const g = fakeEnv({ voices: SIX, cast: { people: { marge: { tts: { voices: ['George'] } } } },
    packs: { only: { id: 'only', regulars: [{ id: 'marge', tts: { voices: ['Zira'] } }, { id: 'local', tts: { voices: ['Susan'] } }] } } });
  const b = A.create(g.env);
  assert.equal(short(b.voiceFor('marge')), 'George');
  assert.equal(short(b.voiceFor('local')), 'Susan', 'a pack-only person keeps their own');
});

/* Who can meet at each restaurant: spec 2.2 and 5.4, plus everyone the pack itself lists. */
const EVERYWHERE = ['mitch', 'marge', 'gus', 'bev', 'vernon', 'sal', 'reginald', 'kai'];
const OWN = {
  diner: ['dale', 'oakes'], pizza: ['oakes', 'tony', 'pam'], smoothie: ['tasha', 'breeze', 'brock'], cafe: ['priya', 'jitters'],
  sushi: ['hiro', 'dennis'], burrito: ['oakes', 'inferno', 'rita'], icecream: ['tasha', 'lulu', 'walt'],
};
function speakersAt(packId) {
  const ids = new Set(EVERYWHERE.concat(OWN[packId] || []));
  const pack = optional('packs/' + packId + '/pack.js');
  if (pack) {
    if (pack.manager && pack.manager.id) ids.add(pack.manager.id);
    (pack.regulars || []).forEach(r => r && r.id && ids.add(r.id));
  }
  return [...ids];
}
const NARRATOR = '(the game\'s own voice)';

test('with only David, Zira and Mark, no two people who can meet at one restaurant share voice, pitch and rate', t => {
  if (!CAST) { t.skip('packs/cast/cast.js is not written yet (the cast lane): this case runs once it exists'); return; }
  const people = CAST.people || {};
  const missing = new Set(), clashes = [], near = [];
  for (const scan of [null].concat(THREE)) {
    for (const where of RESTAURANTS) {
      const sounds = [];
      for (const id of speakersAt(where)) {
        const P = people[id];
        if (!P) { missing.add(id + ' (' + where + ')'); continue; }
        const person = Object.assign({ id }, P);
        sounds.push(Object.assign({ who: id, voice: A.pickVoice(person, THREE, scan ? scan.name : null).name }, A.recipe(person, { rate: 1 })));
      }
      // The game's own voice reads the ticket at every restaurant: the scan voice at the hub's default pitch and rate.
      if (scan) sounds.push({ who: NARRATOR, voice: scan.name, pitch: 1, rate: 1 });
      for (let i = 0; i < sounds.length; i++) {
        for (let j = i + 1; j < sounds.length; j++) {
          const a = sounds[i], b = sounds[j];
          if (a.voice !== b.voice) continue;
          const say = where + (scan ? ' (scan voice ' + short(scan) + ')' : '') + ': ' + a.who + ' and ' + b.who + ' are both ' + short({ name: a.voice }) + ' at pitch ' + a.pitch + ', rate ' + a.rate;
          if (a.pitch === b.pitch && a.rate === b.rate) clashes.push(say);
          else if (Math.abs(a.pitch - b.pitch) < 0.05 && Math.abs(a.rate - b.rate) < 0.05) near.push(say.replace(/ at pitch.*/, '') + ' within 0.05 of each other');
        }
      }
    }
  }
  [...new Set(near)].forEach(n => t.diagnostic('close: ' + n));
  assert.deepEqual([...missing], [], 'packs/cast/cast.js has no entry for these speakers');
  assert.deepEqual([...new Set(clashes)], [], 'these people would sound exactly alike');
});

test('people who meet at the court (Mitch, the announcer, the cheering regulars) are told apart too (reported, not required)', t => {
  if (!CAST) { t.skip('packs/cast/cast.js is not written yet (the cast lane)'); return; }
  const people = CAST.people || {};
  const ids = Object.keys(people).filter(id => ['manager', 'voice', 'regular'].includes(people[id].role));
  for (const scan of [null].concat(THREE)) {
    const seen = new Map();
    for (const id of ids) {
      const person = Object.assign({ id }, people[id]);
      const r = A.recipe(person, { rate: 1 }), key = A.pickVoice(person, THREE, scan ? scan.name : null).name + '|' + r.pitch + '|' + r.rate;
      if (seen.has(key)) t.diagnostic('court' + (scan ? ' (scan voice ' + short(scan) + ')' : '') + ': ' + seen.get(key) + ' and ' + id + ' sound alike');
      else seen.set(key, id);
    }
  }
});

/* ══ saying a line ══════════════════════════════════════════════════════════ */

/** Fake hub speech: NarbeVoiceManager and NarbePlatform.speech as the real ones behave
 *  (shared/voice-manager.js, shared/platform.js), a fake clock, SafeAudio and settings. */
function fakeEnv(o) {
  o = o || {};
  const clock = { t: 0, q: [], id: 0 };
  const flush = () => new Promise(r => setImmediate(r));
  const timers = {
    setTimeout(f, ms) { const id = ++clock.id; clock.q.push({ id, at: clock.t + Math.max(0, ms || 0), f }); return id; },
    clearTimeout(id) { clock.q = clock.q.filter(e => e.id !== id); },
    now: () => clock.t,
  };
  async function tick(ms) {
    const end = clock.t + (ms || 0);
    for (;;) {
      await flush();
      clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
      const e = clock.q[0];
      if (!e || e.at > end) break;
      clock.q.shift();
      clock.t = e.at;
      e.f();
    }
    clock.t = end;
    await flush();
  }
  const log = [], spoken = [], played = [], preloaded = [], audios = [];
  let voices = o.voices || THREE, scan = o.scan === undefined ? THREE[0].name : o.scan, live = null;
  const settings = Object.assign({ ttsEnabled: true, voiceIndex: 0, rate: 1, pitch: 1, volume: 1 }, o.settings);
  const speech = {
    speak(text, opts) {
      if (live) live.cancel();
      let res;
      const t = {
        text, opts, done: false, finished: new Promise(r => { res = r; }), started: Promise.resolve(true),
        end(reason) { if (t.done) return; t.done = true; if (live === t) live = null; res({ reason: reason || 'end', started: reason !== 'failed-to-start' && reason !== 'unavailable' }); },
        cancel() { if (t.done) return; log.push('cancel:' + text); t.end('cancelled'); },
      };
      live = t;
      log.push('speak:' + text);
      spoken.push(t);
      return t;
    },
    cancel() { log.push('platform.cancel'); if (live) live.cancel(); },
    getVoices: () => voices,
    onVoicesChanged: () => () => {},
  };
  const vm = {
    getSettings: () => Object.assign({}, settings),
    getEnglishVoices: () => voices.slice(),
    getCurrentVoice: () => voices.find(v => v.name === scan) || null,
    cancel() { log.push('vm.cancel'); speech.cancel(); },
    waitForVoices: () => Promise.resolve(true),
    getSpeechTimeout: (text, rate) => Math.min(10000, Math.ceil(String(text).length / (15 * Math.max(0.1, rate || settings.rate)) * 1000) + 2000),
    /** The scanner speaking a label. */
    speak(text) { log.push('scanner:' + text); vm.cancel(); return speech.speak(text, {}); },
  };
  function FakeAudio(src) { this.src = src; audios.push(this); }
  FakeAudio.prototype.play = function () { log.push('audio:' + this.src); return Promise.resolve(); };
  FakeAudio.prototype.pause = function () {};
  const saved = Object.assign({ characterVoices: 'voices', sfx: true }, o.save);
  const env = {
    timers, NarbeVoiceManager: vm, NarbePlatform: { speech },
    SafeAudio: { preload: (id, url) => preloaded.push([id, url]), play: (id, vol) => played.push([id, vol]) },
    BB: { save: { get: k => saved[k] } },
    BBSounds: o.sounds === undefined ? SOUNDS : o.sounds,
    BBCast: o.cast, BBCourt: o.court, BBVoice: o.voice, BBPacks: o.packs, Audio: FakeAudio,
  };
  return {
    env, tick, log, spoken, played, preloaded, audios, settings, saved, vm,
    live: () => live, setVoices(v) { voices = v; }, setScan(n) { scan = n; },
  };
}
const PENDING = Symbol('pending');
async function peek(p) { let v = PENDING; p.then(r => { v = r; }); await new Promise(r => setImmediate(r)); return v; }

const MARGE = { people: { marge: { name: 'Marge', tts: { voices: ['Zira'], pitch: 1.25, rate: 0.9 } } } };

test('a line is spoken through NarbeVoiceManager.cancel(), then NarbePlatform.speech.speak with the character\'s voice', async () => {
  const f = fakeEnv({ cast: MARGE, settings: { rate: 1.2, volume: 0.8 } });
  const audio = A.create(f.env);
  const p = audio.say({ who: 'marge', text: 'The usual, hon. [sigh]' });
  await f.tick(0);
  assert.equal(audio.busy(), true);
  const at = f.log.indexOf('vm.cancel'), spoke = f.log.indexOf('speak:The usual, hon.');
  assert.ok(at >= 0 && spoke > at, f.log.join(', '));
  const o = f.spoken[0].opts;
  assert.equal(short(o.voice), 'Zira');
  assert.equal(o.pitch, 1.25);
  assert.ok(Math.abs(o.rate - 1.08) < 1e-9, 'the player\'s rate times hers: ' + o.rate);
  assert.equal(o.volume, 0.8);
  assert.equal(await peek(p), PENDING, 'it waits for the words to end');
  f.spoken[0].end();
  assert.deepEqual(await p, { tts: true, reason: 'end' });
  assert.equal(audio.busy(), false);
});

test("with the hub's Text to Speech off, a line is a silent pause for its reading time", async () => {
  const f = fakeEnv({ cast: MARGE, settings: { ttsEnabled: false } });
  const audio = A.create(f.env);
  const text = 'The usual, hon.';
  const p = audio.say({ who: 'marge', text });
  await f.tick(A.readingTime(text) - 1);
  assert.equal(await peek(p), PENDING);
  await f.tick(1);
  assert.equal((await p).silent, true);
  assert.equal(f.spoken.length, 0, 'nothing was spoken');
});

test('the wait is capped by getSpeechTimeout, without cutting the words off; stop() still ends them', async () => {
  const f = fakeEnv({ cast: MARGE });
  const audio = A.create(f.env);
  const text = 'Hello there.';
  const p = audio.say({ who: 'marge', text });
  await f.tick(0);
  const limit = f.vm.getSpeechTimeout(text, f.spoken[0].opts.rate);
  await f.tick(limit - 1);
  assert.equal(await peek(p), PENDING);
  await f.tick(1);
  assert.equal((await p).capped, true);
  assert.equal(f.spoken[0].done, false, 'the engine is still talking');
  audio.stop();
  assert.equal(f.spoken[0].done, true);
});

test('past the cap, a line the engine is still speaking is waited for (phase 3 fix): the next line never cuts its tail', async () => {
  const f = fakeEnv({ cast: MARGE });
  const ss = { speaking: true };
  f.env.speechSynthesis = ss;
  const audio = A.create(f.env);
  const text = 'The prep table. Pick the crust, then the sauce, then the cheese, then the toppings, one at a time.';
  const p = audio.say({ who: 'marge', text, essential: true });
  await f.tick(0);
  const limit = f.vm.getSpeechTimeout(text, f.spoken[0].opts.rate);
  await f.tick(limit + 3000);
  assert.equal(await peek(p), PENDING, 'still speaking past the cap: still waiting');
  assert.equal(f.spoken[0].done, false);
  ss.speaking = false;
  await f.tick(250);
  assert.equal((await p).capped, true, 'the engine went quiet: done');
  // An engine stuck "speaking" is let go after two minutes.
  ss.speaking = true;
  const q = audio.say({ who: 'marge', text });
  await f.tick(120000 + 500);
  assert.equal((await q).capped, true);
});

test('BB.audio.stop() ends the line at once', async () => {
  const f = fakeEnv({ cast: MARGE });
  const audio = A.create(f.env);
  const p = audio.say({ who: 'marge', text: 'Hi, hon.' });
  await f.tick(0);
  audio.stop();
  assert.deepEqual(await p, { stopped: true });
  assert.ok(f.log.includes('cancel:Hi, hon.'));
  assert.equal(audio.busy(), false);
  // Stopped before the voices were even chosen: nothing is said later.
  const q = audio.say({ who: 'marge', text: 'Second.' });
  audio.stop();
  await f.tick(50);
  assert.deepEqual(await q, { stopped: true });
  assert.equal(f.spoken.length, 1);
});

test("scanner speech wins: the scanner's label cancels a character's line, and the line is never said again", async () => {
  const f = fakeEnv({ cast: MARGE });
  const audio = A.create(f.env);
  const p = audio.say({ who: 'marge', text: 'Hi, hon.' });
  await f.tick(0);
  f.vm.speak('Add');                       // the scan comes back and reads a label
  assert.equal((await p).reason, 'cancelled');
  await f.tick(20000);
  assert.equal(f.spoken.filter(t => t.text === 'Hi, hon.').length, 1);
  assert.equal(f.live().text, 'Add', 'the label is still being read');
});

test('Character Voices: Off says nothing (an essential line is said in the game\'s own voice); Captions Only waits its reading time', async () => {
  const off = fakeEnv({ cast: MARGE, save: { characterVoices: 'off' }, settings: { pitch: 0.9, rate: 1.3 } });
  let audio = A.create(off.env);
  assert.deepEqual(await audio.say({ who: 'marge', text: 'Hi.' }), { skipped: true });
  const p = audio.say({ who: 'marge', text: 'Hold on, that is not the right one.', essential: true });
  await off.tick(0);
  const o = off.spoken[0].opts;
  assert.equal(o.voice.name, THREE[0].name, 'the scan voice');
  assert.equal(o.pitch, 0.9);
  assert.equal(o.rate, 1.3);
  off.spoken[0].end();
  assert.equal((await p).tts, true);

  const cap = fakeEnv({ cast: MARGE, save: { characterVoices: 'captions' } });
  audio = A.create(cap.env);
  const q = audio.say({ who: 'marge', text: 'Hi, hon.' });
  await cap.tick(A.readingTime('Hi, hon.') - 1);
  assert.equal(await peek(q), PENDING);
  await cap.tick(1);
  assert.equal((await q).captions, true);
  assert.equal(cap.spoken.length, 0);
});

test('when the engine cannot start, the caption still stays up for its reading time', async () => {
  const f = fakeEnv({ cast: MARGE });
  const audio = A.create(f.env);
  const text = 'This line is long enough to read for a while.';
  const p = audio.say({ who: 'marge', text });
  await f.tick(0);
  f.spoken[0].end('failed-to-start');
  await f.tick(A.readingTime(text) - 10);
  assert.equal(await peek(p), PENDING);
  await f.tick(10);
  assert.equal((await p).silent, true);
});

test('recorded clips stay off unless BBCourt.recordedVoices is true (a missing BBCourt counts as false)', async () => {
  const text = 'Hi, hon.';
  const voice = { only: { 'marge/greet.1': { file: 'marge/greet.1.mp3', hash: A.textHash(text) } } };
  const packs = { only: { id: 'only', manager: { id: 'mitch' }, regulars: [{ id: 'marge' }] } };
  for (const court of [undefined, { recordedVoices: false }, { recordedVoices: 'yes' }]) {
    const f = fakeEnv({ cast: MARGE, voice, packs, court });
    const audio = A.create(f.env);
    assert.equal(audio.recordings(), false);
    assert.equal(audio.recorded('marge/greet.1', text), false);
    audio.say({ who: 'marge', text, clip: 'marge/greet.1' });
    await f.tick(0);
    assert.equal(f.audios.length, 0, 'no recording played');
    assert.equal(f.spoken.length, 1, 'text to speech said it');
  }
  const f = fakeEnv({ cast: MARGE, voice, packs, court: { recordedVoices: true } });
  const audio = A.create(f.env);
  assert.equal(audio.recorded('marge/greet.1', text), true);
  assert.equal(audio.recorded('marge/greet.1', 'Different words.'), false, 'edited words are not the recording');
  const p = audio.say({ who: 'marge', text, clip: 'marge/greet.1' });
  await f.tick(0);
  assert.equal(f.audios[0].src, 'packs/only/voice/marge/greet.1.mp3');
  f.audios[0].onended();
  await f.tick(0);
  assert.equal((await p).recorded, true);
  // An order said in parts plays from recordings only when every part is recorded.
  const q = audio.say({ who: 'marge', text: 'Hi, hon. And fries.', parts: [{ clip: 'marge/greet.1', text }, { clip: 'marge/order.fries', text: 'And fries.' }] });
  await f.tick(0);
  assert.equal(f.audios.length, 1);
  assert.equal(f.spoken.at(-1).text, 'Hi, hon. And fries.');
  f.spoken.at(-1).end();
  await q;
});

/* No restaurant has recordings until the voice pass (2026-11-10: the diner's old takes, in rejected voices or for lines
 * that have since changed, were moved to archives/games/2026-11-10/BENSFOODCOURT-removed/packs/diner/voice), so every
 * line is text to speech. Whatever is recorded later, the page and the files must agree. */
test('voice manifests: index.html loads one exactly where packs/<id>/voice/manifest.js exists, and recordings are on only with one', t => {
  const html = fs.readFileSync(path.join(G, 'index.html'), 'utf8');
  const named = [...html.matchAll(/<script[^>]*src="packs\/([^/"]+)\/voice\/manifest\.js"/g)].map(m => m[1]).sort();
  const onDisk = fs.readdirSync(path.join(G, 'packs')).filter(id => fs.existsSync(path.join(G, 'packs', id, 'voice', 'manifest.js'))).sort();
  assert.deepEqual(named, onDisk, 'index.html names a voice manifest that is not there, or misses one that is (docs/api/pilot.md)');
  if (COURT && COURT.recordedVoices === true) assert.ok(onDisk.length, 'BBCourt.recordedVoices is true but nothing is recorded');
  t.diagnostic(onDisk.length ? 'recorded: ' + onDisk.join(', ') : 'no recordings yet (the voice pass makes them): every line uses text to speech');
});

test('js/audio.js never calls speechSynthesis and never names a restaurant', () => {
  const code = fs.readFileSync(path.join(G, 'js', 'audio.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  // The one use allowed: reading whether the engine is still talking past the cap (phase 3), never speaking with it.
  assert.deepEqual(code.match(/.*speechSynthesis.*/g).map(l => l.trim()), ['const engine = env.speechSynthesis;']);
  assert.equal(/engine\.(speak|cancel|pause|resume)\s*\(/.test(code), false);
  for (const id of ['diner', 'pizza', 'smoothie', 'cafe', 'sushi', 'burrito', 'icecream']) assert.equal(new RegExp("['\"`]" + id + "['\"`]").test(code), false, id);
});

/* ══ sounds ═════════════════════════════════════════════════════════════════ */

const GOLDEN = {   // the 12 original sounds, as Ben has heard them since the Burger Bar
  buzz: '5dd7e36da543cc9221dadd04f383ad58bca6036e149a0dcf930c520c7f046e96', ding: '0c4ddb33d1fbc17fd5faf0c104f735675bf8cc7cb0cf25495e258039f9227032',
  ew: 'af411d1ba4cd8935db023d0a92fa24d0a2bf5a6c4c1b29fe74a48d237c6a1c83', flip: '09fc06a55006b96852f5b894a32e1ebeca8011800a5147f35c8d0477afef1ae5',
  kaching: 'c2d728a7656c4ca888c1c77b3a7b62fd83aeef84da0676949094b0f1bf74c9da', plop: '1b0b731b8ee2c873004ad330d38f9a566ba0be29c23dddc2e730cb9f7ec0edc0',
  sizzle: '5285c4ee98df6ed1e0c48680ee402c61e50a8e2cf7d52876201a48feddec0e92', squirt: '2558ab9c560fe49f28249e3945a2fa92dca37647eeaa53caed0c21f061d4f036',
  stars: '72dc955310a403ce6bf3ffb16c1b49ad91d51f29193c8a6a8109c5aeabb72d98', swoosh: '38df7dd8710b29a5bf26aae9ebd92fc2eff10ce2b73d4c9dcee9916c190bd805',
  tick: '493aa2be0c73e435940bd01186ba8f28c440601f032be23572bb94e119bb5981', toss: '05942877ba68f7c9b4bacd0aceb39d4080f2a1fedbc5f7fd8d22584df0e1226a',
};
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const wavOf = (folder, name) => path.join(G, 'packs', folder, 'sound', name + '.wav');

test('the 12 original sounds are unchanged: shared ones are byte copies, and the diner keeps sizzle, flip and squirt', () => {
  for (const [name, hash] of Object.entries(GOLDEN)) {
    const home = ['sizzle', 'flip', 'squirt'].includes(name) ? 'diner' : 'shared';
    assert.equal(sha(wavOf(home, name)), hash, home + '/' + name);
    // The diner's old copies of the shared nine were moved out in phase 3 (2026-11-10): only the shared ones play.
    if (home === 'shared') assert.equal(fs.existsSync(wavOf('diner', name)), false, 'diner/' + name + ' is a stale copy of shared/' + name);
  }
});

test('the sound index lists exactly the catalogued sounds that exist, with their real lengths, and every one is on disk', () => {
  assert.deepEqual(SOUNDS, MS.indexData(), 'packs/shared/sound/sounds.js is stale: run node tools/make-sounds.cjs --index');
  for (const [folder, list] of Object.entries(SOUNDS)) {
    if (folder === 'version') continue;
    for (const [name, e] of Object.entries(list)) {
      assert.match(name, /^[a-z][A-Za-z0-9]*$/, folder + '/' + name);
      assert.ok(fs.existsSync(wavOf(folder, name)), folder + '/' + name + '.wav');
      assert.ok(e.vol > 0 && e.vol <= 0.6, folder + '/' + name + ' vol');
    }
  }
  for (const e of MS.CATALOG) assert.ok(SOUNDS[e.folder] && SOUNDS[e.folder][e.name], 'not made yet: ' + e.folder + '/' + e.name + ' (run node tools/make-sounds.cjs)');
  // The shared set and the diner's own are where the spec puts them.
  assert.deepEqual(Object.keys(SOUNDS.shared).sort(), ['buzz', 'ding', 'ew', 'kaching', 'plop', 'stars', 'swoosh', 'tick', 'toss']);
  for (const n of ['sizzle', 'flip', 'squirt']) assert.ok(SOUNDS.diner[n], 'diner/' + n);
});

test('every new sound is short, soft and below about 2.5 kHz, and audible on small speakers (LIMITS in tools/make-sounds.cjs)', () => {
  const problems = [];
  for (const e of MS.CATALOG.filter(x => !x.legacy)) {
    const w = MS.readWav(MS.fileOf(e));
    assert.equal(w.sr, MS.SR);
    assert.equal(w.channels, 1);
    MS.breaks(MS.analyse(w.x, w.sr), e.kind).forEach(b => problems.push(e.folder + '/' + e.name + ': ' + b));
  }
  assert.deepEqual(problems, []);
});

test('a sound resolves in the restaurant in use, then shared; SafeAudio ids are bb-<folder>-<name>; only indexed files are preloaded', () => {
  const f = fakeEnv();
  const audio = A.create(f.env);
  const warn = console.warn;
  const warned = [];
  console.warn = m => warned.push(m);
  try {
    audio.init();
    assert.ok(f.preloaded.some(([id, url]) => id === 'bb-shared-plop' && url === 'packs/shared/sound/plop.wav'));
    assert.ok(f.preloaded.some(([id, url]) => id === 'bb-court-chime' && url === 'packs/court/sound/chime.wav'));
    for (const [id, url] of f.preloaded) {
      const m = /^bb-(\w+)-(\w+)$/.exec(id);
      assert.ok(m && url === 'packs/' + m[1] + '/sound/' + m[2] + '.wav' && SOUNDS[m[1]][m[2]], id);
    }
    assert.equal(audio.sfx('sizzle'), 0, 'no restaurant in use: only shared names');
    assert.equal(warned.length, 1);
    const pack = { id: 'diner', stations: { grill: { sounds: { cook: 'sizzle', done: 'flip' } }, board: {}, quiet: { sounds: { add: null } } } };
    audio.use(pack);
    assert.ok(f.preloaded.some(([id]) => id === 'bb-diner-sizzle'));
    assert.equal(audio.sfx('sizzle'), 1300);
    assert.deepEqual(f.played.at(-1), ['bb-diner-sizzle', 0.35]);
    audio.sfx('plop');
    assert.deepEqual(f.played.at(-1), ['bb-shared-plop', 0.4]);
    audio.sfx('plop', 0.2);
    assert.deepEqual(f.played.at(-1), ['bb-shared-plop', 0.2]);
    assert.equal(audio.sfx('court:shutter'), 1700);
    assert.equal(f.played.at(-1)[0], 'bb-court-shutter');
    audio.sfx('shared:tick', 0.12);
    assert.deepEqual(f.played.at(-1), ['bb-shared-tick', 0.12]);
    // Station hooks: their own names; add defaults to plop and stage to tick; null is silence.
    audio.station('grill', 'cook');
    assert.equal(f.played.at(-1)[0], 'bb-diner-sizzle');
    audio.station(pack.stations.grill, 'done');
    assert.equal(f.played.at(-1)[0], 'bb-diner-flip');
    audio.station('board', 'add');
    assert.equal(f.played.at(-1)[0], 'bb-shared-plop');
    audio.station('board', 'stage');
    assert.equal(f.played.at(-1)[0], 'bb-shared-tick');
    const n = f.played.length;
    assert.equal(audio.station('board', 'auto'), 0);
    assert.equal(audio.station('quiet', 'add'), 0);
    assert.equal(f.played.length, n);
    // Sound Effects off: nothing plays.
    f.saved.sfx = false;
    assert.equal(audio.sfx('plop'), 0);
    assert.equal(f.played.length, n);
  } finally { console.warn = warn; }
  // No index at all: silent, and no file is ever guessed at.
  const g = fakeEnv({ sounds: null });
  const b = A.create(g.env);
  b.init();
  assert.equal(b.sfx('plop'), 0);
  assert.deepEqual(g.preloaded, []);
});

test('every sound a pack names in its stations exists, under a known hook', () => {
  const HOOKS = ['add', 'cook', 'stage', 'done', 'auto'];
  const ids = fs.readdirSync(path.join(G, 'packs')).filter(id => fs.existsSync(path.join(G, 'packs', id, 'pack.js')) && (!ONLY || ONLY.includes(id)));
  const problems = [];
  for (const id of ids) {
    const pack = require(path.join(G, 'packs', id, 'pack.js'));
    const audio = A.create({ BBSounds: SOUNDS });
    audio.use(pack);
    for (const [sid, st] of Object.entries(pack.stations || {})) {
      for (const [hook, name] of Object.entries((st && st.sounds) || {})) {
        if (!HOOKS.includes(hook)) problems.push(id + '.' + sid + ': unknown hook "' + hook + '" (' + HOOKS.join(', ') + ')');
        else if (name !== null && !audio.sound(name)) problems.push(id + '.' + sid + '.' + hook + ': no sound "' + name + '" in packs/' + id + '/sound or packs/shared/sound');
      }
      // An auto step's own sound (`sound`, played instead of the station's auto hook: the burrito's burst).
      for (const step of (st && st.steps) || []) {
        if (step && step.kind === 'auto' && step.sound !== undefined && !audio.sound(step.sound)) problems.push(id + '.' + sid + '.' + step.id + ': no sound "' + step.sound + '"');
      }
    }
  }
  assert.deepEqual(problems, []);
});
