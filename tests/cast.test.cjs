/** The cast (packs/cast/cast.js, build spec 2.2 and 8) and its art (tools/build_art.py, spec 3 and 5.2; docs/api/cast.md).
 *
 *  Every character has spec 8's fields, the right role, its art folder, its size and the Burger Bar's traits. Everyone
 *  who can be heard at a restaurant (spec 5.4, plus whoever a pack lists) or at the court sounds different from everyone
 *  they can meet there: on the hub's six Windows voices and on a PC with only David, Zira and Mark, measured in the
 *  whole SAPI steps Chromium on Windows actually sends. The art manifests list only pictures that exist.
 *  BB_PACKS=<id,...> limits the restaurant loops.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const G = path.join(__dirname, '..');
const at = (...p) => path.join(G, ...p);
const CAST = require(at('packs', 'cast', 'cast.js'));
const P = CAST.people;
const ONLY = process.env.BB_PACKS ? process.env.BB_PACKS.split(',').map(s => s.trim()).filter(Boolean) : null;
const ALL_PACKS = ['smoothie', 'burrito', 'pizza', 'diner', 'cafe', 'icecream', 'sushi'];     // spec 2.1, scan order
const PACKS = ALL_PACKS.filter(id => !ONLY || ONLY.includes(id));
const optional = rel => (fs.existsSync(at(rel)) ? require(at(rel)) : null);

/* ── who is who (spec 2.2) ─────────────────────────────────────────────────────────────────────────────────────── */
const ROLES = {
  manager: ['mitch'],
  regular: ['marge', 'gus', 'bev', 'vernon', 'sal', 'dale', 'priya', 'oakes', 'tasha'],
  visitor: ['reginald', 'kai'],
  local: ['tony', 'pam', 'breeze', 'brock', 'jitters', 'hiro', 'dennis', 'inferno', 'rita', 'lulu', 'walt'],
  voice: ['pa'],
  // (extra, the court's six shoppers, left with crowd-cast, 2026-11-10: the court's crowd is the game's own customers)
};
const LOCALS = { pizza: ['tony', 'pam'], smoothie: ['breeze', 'brock'], cafe: ['jitters'], sushi: ['hiro', 'dennis'],
  burrito: ['inferno', 'rita'], icecream: ['lulu', 'walt'], diner: [] };
// Spec 5.4: everywhere, plus each restaurant's recurring regulars and locals; reginald and kai visit everywhere.
const EVERYWHERE = ['mitch', 'marge', 'gus', 'bev', 'vernon', 'sal', 'reginald', 'kai'];
const RECURRING = { diner: ['dale', 'oakes'], pizza: ['oakes'], smoothie: ['tasha'], cafe: ['priya'], sushi: [],
  burrito: ['oakes'], icecream: ['tasha'] };
const UNIFORM = id => 'mitch-' + (id === 'diner' ? 'burger' : id);

/* ── voices, as the hub's engines name them ────────────────────────────────────────────────────────────────────── */
const win = (n, where) => ({ name: 'Microsoft ' + n + ' - English (' + where + ')', lang: 'en' });
const US = 'United States', UK = 'United Kingdom';
const ENVS = {
  // This PC's Electron: the hub's six (register_onecore_voices.py), as SAPI describes them.
  hub6: [win('David Desktop', US), win('Hazel Desktop', 'Great Britain'), win('Susan', UK), win('George', UK), win('Mark', US),
    win('Zira Desktop', US)],
  dzm: [win('David', US), win('Zira', US), win('Mark', US)],
  dz: [win('David Desktop', US), win('Zira Desktop', US)],
  edge: [win('David', US), win('Zira', US), win('Mark', US)].concat(
    ['Aria', 'Ana', 'Andrew', 'Ava', 'Brian', 'Christopher', 'Emma', 'Eric', 'Guy', 'Jenny', 'Michelle', 'Roger', 'Steffan']
      .map(n => ({ name: 'Microsoft ' + n + ' Online (Natural) - English (United States)', lang: 'en-US' })),
    ['Libby', 'Ryan', 'Sonia', 'Thomas'].map(n => ({ name: 'Microsoft ' + n + ' Online (Natural) - English (United Kingdom)', lang: 'en-GB' })),
    [{ name: 'Microsoft Natasha Online (Natural) - English (Australia)', lang: 'en-AU' }]),
  one: [win('Zira Desktop', US)],
};
const STRICT = ['hub6', 'dzm'];                      // where every pair must be well apart (the task's floor and this PC)

// The page's own picker when js/audio.js loads (one rule for game and test); otherwise the spec 6.6 rule.
let A = null;
try { A = require(at('js', 'audio.js')); if (typeof A.pickVoice !== 'function') A = null; } catch (e) { A = null; }
const wordStart = (name, frag) => { const n = name.toLowerCase(), f = String(frag).toLowerCase();
  for (let i = n.indexOf(f); f && i >= 0; i = n.indexOf(f, i + 1)) if (i === 0 || !/[a-z0-9]/.test(n[i - 1])) return true; return false; };
const fragmentHit = (id, voices) => { for (const f of P[id].tts.voices) { const v = voices.find(x => wordStart(x.name, f)); if (v) return v; } return null; };
const voiceOf = (id, voices) => (A ? A.pickVoice(Object.assign({ id }, P[id]), voices, null) : fragmentHit(id, voices));
const recipeOf = (id, playerRate) => (A ? A.recipe(Object.assign({ id }, P[id]), { rate: playerRate })
  : { pitch: P[id].tts.pitch, rate: Math.max(0.5, Math.min(2, playerRate * P[id].tts.rate)) });

// Chromium on Windows (content/browser/speech/tts_win.cc) gives SAPI whole steps: <pitch absmiddle="trunc(pitch*10-10)">
// and SetRate(trunc(10*log10(rate))), from the utterance's float values. A pitch step is about half a semitone (measured
// on all six voices, 2026-11-08); a rate step about 11% in length.
const f32 = Math.fround;
const pitchStep = p => Math.trunc(Math.max(-10, Math.min(10, f32(p) * 10 - 10)));
const rateStep = r => Math.trunc(10 * Math.log10(f32(r)));
const steps = (id, playerRate) => { const r = recipeOf(id, playerRate); return { n: pitchStep(r.pitch), k: rateStep(r.rate), r }; };
/** How far apart two speakers on one voice are: 1 = three pitch steps, or two and a rate step, or two rate steps. */
const apart = (a, b, playerRate) => { const x = steps(a, playerRate), y = steps(b, playerRate);
  return Math.abs(x.n - y.n) / 3 + Math.abs(x.k - y.k) / 2; };

/* ── who can meet where ────────────────────────────────────────────────────────────────────────────────────────── */
const packOf = {};
for (const id of ALL_PACKS) {
  try { packOf[id] = optional('packs/' + id + '/pack.js'); } catch (e) { packOf[id] = { loadError: e.message }; }
}
function groups() {
  const out = {};
  for (const id of PACKS) {
    const ids = new Set(EVERYWHERE.concat(RECURRING[id], LOCALS[id]));
    const pack = packOf[id];
    if (pack && !pack.loadError) {
      if (pack.manager && P[pack.manager.id]) ids.add(pack.manager.id);
      (pack.regulars || []).forEach(r => r && P[r.id] && ids.add(r.id));     // a cameo or anyone else the pack lists
    }
    out[id] = [...ids].filter(x => P[x]);
  }
  // The court: Mitch, the announcer and every regular and visitor cheering at the grand celebration (spec 6.2).
  out.court = ['mitch', 'pa'].concat(Object.keys(P).filter(id => ['regular', 'visitor'].includes(P[id].role)));
  return out;
}
/** Any restaurant's own customer may visit another at level 4 (spec 2.2, a cameo). */
function cameos() {
  const out = {}, base = groups();
  for (const id of PACKS) for (const home of ALL_PACKS) if (home !== id) for (const L of LOCALS[home]) {
    if (!base[id].includes(L)) out[id + ' + ' + L] = base[id].concat([L]);
  }
  return out;
}
const pairs = ids => { const o = []; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) o.push([ids[i], ids[j]]); return o; };
const short = v => (v ? v.name.replace(/^Microsoft /, '').replace(/ - English.*$/, '') : 'none');

/* ══ the entries ══════════════════════════════════════════════════════════════════════════════════════════════════ */

test('every cast entry has the fields of spec 8, and nothing else', () => {
  const allowed = new Set(['name', 'art', 'role', 'scale', 'who', 'voice', 'tts', 'twin', 'short', 'exact', 'newest',
    'tipScale', 'threeStarScale']);
  const nonEmpty = s => typeof s === 'string' && s.trim().length > 0;
  for (const [id, C] of Object.entries(P)) {
    assert.match(id, /^\w+$/, id);
    for (const k of Object.keys(C)) assert.ok(allowed.has(k), id + ': unknown field ' + k);
    assert.ok(nonEmpty(C.name), id + ': name');
    assert.ok(C.art === null || nonEmpty(C.art), id + ': art is a folder name or null');
    assert.ok(Object.keys(ROLES).includes(C.role), id + ': role ' + C.role);
    assert.ok(nonEmpty(C.who) && nonEmpty(C.voice), id + ': who and voice');
    assert.ok(C.tts && Array.isArray(C.tts.voices) && C.tts.voices.length && C.tts.voices.every(nonEmpty), id + ': tts.voices');
    assert.deepEqual(Object.keys(C.tts).sort(), ['pitch', 'rate', 'voices'], id + ': tts has voices, pitch and rate');
    assert.ok(C.tts.pitch >= 0.45 && C.tts.pitch <= 1.75, id + ': pitch ' + C.tts.pitch + ' stays where every engine sounds human');
    assert.ok(C.tts.rate >= 0.75 && C.tts.rate <= 1.5, id + ': rate ' + C.tts.rate);
    for (const k of ['twin', 'short', 'exact', 'newest']) if (k in C) assert.equal(C[k], true, id + ': ' + k + ' is true or absent');
    for (const k of ['tipScale', 'threeStarScale', 'scale']) if (k in C) assert.ok(typeof C[k] === 'number' && C[k] > 0, id + ': ' + k);
  }
  assert.equal(CAST.poses.customer.length, 10);
  assert.equal(CAST.poses.manager.length, 10);
});

test('everyone in spec 2.2 is here, in their role, and nobody else', () => {
  for (const [role, ids] of Object.entries(ROLES)) {
    assert.deepEqual(Object.keys(P).filter(id => P[id].role === role).sort(), ids.slice().sort(), role);
  }
  assert.equal(P.bev.name, 'Coach Bev');
  assert.equal(P.oakes.name, 'Professor Oakes');
});

test('art names the folder: the id, except a voice nobody sees; every folder is drawn, uniforms included', () => {
  const src = id => fs.existsSync(at('art-source', 'cast', id, 'neutral.png'));
  const built = id => fs.existsSync(at('packs', 'cast', 'art', 'cast', id, 'neutral.webp'));
  for (const [id, C] of Object.entries(P)) {
    if (C.role === 'voice') { assert.equal(C.art, null, id + ' has no picture'); continue; }
    assert.equal(C.art, id, id + ': the cast id is the art folder (spec 2.2)');
    assert.ok(src(id) || built(id), id + ' has a neutral picture');
  }
  for (const pack of ALL_PACKS) assert.ok(src(UNIFORM(pack)) || built(UNIFORM(pack)), UNIFORM(pack) + ': the uniform has a neutral');
  // Every folder in art-source/cast is someone (a typo'd folder would never be used).
  if (fs.existsSync(at('art-source', 'cast'))) {
    const known = new Set(Object.keys(P).concat(ALL_PACKS.map(UNIFORM)));
    for (const d of fs.readdirSync(at('art-source', 'cast'))) {
      if (fs.statSync(at('art-source', 'cast', d)).isDirectory()) assert.ok(known.has(d), 'art-source/cast/' + d + ' is nobody in the cast');
    }
  }
});

test('children are drawn smaller, feet on the floor line; everyone else full size', () => {
  assert.equal(P.kai.scale, 0.74);
  assert.equal(P.lulu.scale, 0.66);
  for (const [id, C] of Object.entries(P)) if (!['kai', 'lulu'].includes(id)) assert.ok(C.scale === undefined || C.scale === 1, id);
});

test("persona traits are the Burger Bar's (twin, exact, short, newest, tipScale, threeStarScale)", () => {
  const golden = optional('tests/packs/diner-golden/pack.js') || require(at('packs', 'diner', 'pack.js'));
  const TRAITS = ['twin', 'short', 'exact', 'newest', 'tipScale', 'threeStarScale'];
  for (const r of golden.regulars) for (const k of TRAITS) {
    if (r[k] !== undefined) assert.equal(P[r.id][k], r[k], r.id + '.' + k + ' as in the Burger Bar');
  }
  assert.equal(P.gus.twin, true);
  assert.equal(P.vernon.exact, true);
  const withTrait = Object.keys(P).filter(id => TRAITS.some(k => P[id][k] !== undefined)).sort();
  assert.deepEqual(withTrait, ['gus', 'kai', 'reginald', 'vernon']);
});

test("Mitch keeps the feel of today's text to speech", () => {
  assert.equal(P.mitch.tts.pitch, 1.15);
  assert.equal(P.mitch.tts.rate, 1.12);
});

test('drawn() lets in only customers whose folder has every customer pose', () => {
  const all = CAST.poses.customer;
  const art = { people: { marge: all, gus: all.slice(1), mitch: all, shopper1: ['neutral'], tony: all.concat(['extra']) } };
  assert.deepEqual(CAST.drawn(art), ['marge', 'tony']);
  assert.deepEqual(CAST.drawn(null), []);
});

/* ══ voices ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

test('every speaker reaches a Windows voice by name: nobody is left to the hash on the hub, David-Zira-Mark or David-Zira', t => {
  if (!A) t.diagnostic('js/audio.js did not load: using the spec 6.6 rule (first fragment, any case, at a word start)');
  for (const id of Object.keys(P)) {
    for (const env of ['hub6', 'dzm', 'dz']) {
      const hit = fragmentHit(id, ENVS[env]);
      assert.ok(hit, id + ' matches no voice on ' + env);
      assert.equal(voiceOf(id, ENVS[env]).name, hit.name, id + ' on ' + env);
    }
  }
});

test('nobody shares a pitch and rate, and nobody sits on the game\'s own voice (step 0, 0)', () => {
  const seen = new Map();
  for (const id of Object.keys(P)) {
    const key = P[id].tts.pitch + '|' + P[id].tts.rate;
    assert.ok(!seen.has(key), id + ' and ' + seen.get(key) + ' share pitch and rate ' + key);
    seen.set(key, id);
    const s = steps(id, 1);
    assert.ok(s.n !== 0 || s.k !== 0, id + ' would sound like the scan voice reading the ticket');
  }
});

test('people who can meet at a restaurant or the court sound different (spec 5.4, 6.6)', t => {
  for (const [id, p] of Object.entries(packOf)) if (p && p.loadError && PACKS.includes(id)) t.diagnostic(id + "/pack.js did not load (its lane's work in progress): spec 5.4 only. " + p.loadError);
  const bad = [];
  for (const [where, ids] of Object.entries(groups())) {
    for (const [env, voices] of Object.entries(ENVS)) {
      for (const [a, b] of pairs(ids)) {
        const va = voiceOf(a, voices), vb = voiceOf(b, voices);
        if (!va || !vb || va.name !== vb.name) continue;
        const ra = recipeOf(a, 1), rb = recipeOf(b, 1);
        if (ra.pitch === rb.pitch && ra.rate === rb.rate) bad.push(`${where}, ${env}: ${a} and ${b} are both ${short(va)} at the same pitch and rate`);
        else if (STRICT.includes(env) && apart(a, b, 1) < 1) {
          bad.push(`${where}, ${env}: ${a} and ${b} are both ${short(va)}, only ${apart(a, b, 1).toFixed(2)} apart in SAPI steps`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('a cameo (another restaurant\'s own customer, level 4) is still told apart', t => {
  const bad = [];
  let close = 0;
  for (const [where, ids] of Object.entries(cameos())) {
    const L = ids[ids.length - 1];
    for (const env of STRICT) {
      for (const other of ids.slice(0, -1)) {
        const vl = voiceOf(L, ENVS[env]), vo = voiceOf(other, ENVS[env]);
        if (vl.name !== vo.name) continue;
        const d = apart(L, other, 1);
        if (d < 2 / 3) bad.push(`${where}, ${env}: ${L} and ${other} on ${short(vl)} are ${d.toFixed(2)} apart`);
        else if (d < 1) close++;
      }
    }
  }
  if (close) t.diagnostic(close + ' cameo pairs are 2 pitch steps (or a pitch and a rate step) apart rather than 3');
  assert.deepEqual([...new Set(bad)], []);
});

test("still told apart when the player's own voice is set faster or slower", () => {
  const bad = [];
  for (const playerRate of [0.8, 1.25]) {
    for (const [where, ids] of Object.entries(groups())) for (const env of STRICT) for (const [a, b] of pairs(ids)) {
      const va = voiceOf(a, ENVS[env]), vb = voiceOf(b, ENVS[env]);
      if (va.name === vb.name && apart(a, b, playerRate) < 2 / 3) bad.push(`${where}, ${env}, player rate ${playerRate}: ${a} and ${b}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

/* ══ the art (tools/build_art.py) ═════════════════════════════════════════════════════════════════════════════════ */

const manifest = rel => { try { return optional(rel); } catch (e) { return { loadError: e.message }; } };
const webp = (...p) => fs.existsSync(at(...p) + '.webp');

test('the cast manifest lists every built pose, and only those', t => {
  const M = manifest('packs/cast/art/manifest.js');
  if (!M) { t.skip('packs/cast/art/manifest.js not built yet: run tools/build_art.py'); return; }
  assert.ok(!M.loadError, M.loadError);
  assert.deepEqual(M.castSize, [768, 1152]);
  for (const [folder, poses] of Object.entries(M.people)) {
    for (const pose of poses) assert.ok(webp('packs', 'cast', 'art', 'cast', folder, pose), folder + '/' + pose);
    const onDisk = fs.readdirSync(at('packs', 'cast', 'art', 'cast', folder)).filter(f => /^[a-z][A-Za-z0-9]*\.webp$/.test(f)).map(f => f.slice(0, -5));
    assert.deepEqual(onDisk.sort(), poses.slice().sort(), folder + ': the manifest is up to date');
  }
  // Mitch himself has the celebration pose; every uniform has a neutral.
  if (M.people.mitch) assert.ok(M.people.mitch.includes('promoted') || !fs.existsSync(at('art-source', 'cast', 'mitch', 'promoted.png')), 'mitch/promoted');
  for (const pack of ALL_PACKS) if (M.people[UNIFORM(pack)]) assert.ok(M.people[UNIFORM(pack)].includes('neutral'), UNIFORM(pack));
  const ready = CAST.drawn(M);
  const waiting = Object.keys(P).filter(id => ['regular', 'local', 'visitor'].includes(P[id].role) && !ready.includes(id));
  t.diagnostic('drawn now: ' + ready.length + ' customers' + (waiting.length ? ' (not yet: ' + waiting.join(', ') + ')' : ', every one of them'));
});

test('the shared and court manifests list what exists: four court props, the court picture, no shoppers', t => {
  const S = manifest('packs/shared/art/manifest.js'), C = manifest('packs/court/art/manifest.js');
  if (!S || !C) { t.skip('shared/court manifests not built yet: run tools/build_art.py'); return; }
  assert.ok(!S.loadError && !C.loadError, S.loadError || C.loadError);
  // (no ticketWheel picture: stage.js draws the ticket wheel itself; the unused picture was moved out 2026-11-10)
  for (const p of ['register', 'bell', 'back5', 'spatula']) assert.ok(S.props.includes(p), 'shared ' + p);
  for (const p of S.props) assert.ok(webp('packs', 'shared', 'art', 'props', p), 'shared/' + p);
  assert.equal(C.picture, fs.existsSync(at('packs', 'court', 'art', 'court.webp')));
  assert.deepEqual(C.pictureSize, [1536, 1024]);
  for (const p of ['shutter', 'grandOpening', 'goldSign', 'progressBoard']) assert.ok(C.props.includes(p), 'court ' + p);
  for (const p of C.props) assert.ok(webp('packs', 'court', 'art', 'props', p), 'court/props/' + p);
  // The shoppers left the court with crowd-cast (2026-11-10): no pictures, no manifest fields.
  assert.ok(!('shoppers' in C) && !('shopperScale' in C), 'BBArt.court has no shoppers');
  assert.equal(fs.existsSync(at('packs', 'court', 'art', 'shoppers')), false, 'packs/court/art/shoppers is gone');
});

// Spec 5.2: the backdrops each restaurant's stations name.
const BACKDROPS = { diner: ['counter', 'grill', 'board', 'fryer', 'drinks'], pizza: ['counter', 'prep', 'oven'],
  smoothie: ['counter', 'prep', 'blender'], cafe: ['counter', 'coffee', 'donuts'], sushi: ['counter', 'prep', 'roll'],
  burrito: ['counter', 'prep', 'griddle'], icecream: ['counter', 'scoop', 'toppings'] };

test('every restaurant manifest lists its spec 5.2 backdrops, each built, and any backdrop its stations name', t => {
  for (const id of PACKS) {
    const M = manifest('packs/' + id + '/art/manifest.js');
    if (!M) { t.diagnostic(id + ': no art manifest yet'); continue; }
    assert.ok(!M.loadError, id + ': ' + M.loadError);
    assert.deepEqual(M.backdropSize, [1536, 1024]);
    for (const b of M.backdrops) assert.ok(webp('packs', id, 'art', 'backdrops', b), id + '/' + b);
    for (const p of M.props) assert.ok(webp('packs', id, 'art', 'props', p), id + '/props/' + p);
    const missing = BACKDROPS[id].filter(b => !M.backdrops.includes(b));
    assert.deepEqual(missing, [], id + ': spec 5.2 backdrops');
    const pack = packOf[id];
    if (pack && !pack.loadError && pack.stations) {
      for (const [sid, st] of Object.entries(pack.stations)) {
        if (st && st.backdrop) assert.ok(M.backdrops.includes(st.backdrop), id + '.' + sid + ' names backdrop ' + st.backdrop);
      }
    }
  }
});

test("the diner's manifest has every restaurant's shape, and its phase-1 copies are gone (phase 3, 2026-11-10)", t => {
  if (ONLY && !ONLY.includes('diner')) { t.skip('BB_PACKS leaves the diner out'); return; }
  const M = manifest('packs/diner/art/manifest.js');
  assert.ok(M && !M.loadError, 'packs/diner/art/manifest.js loads');
  // { backdrops, props, backdropSize, counter? }, like every pack: the cast is packs/cast/art, the props packs/shared/art.
  assert.deepEqual(Object.keys(M).filter(k => k !== 'counter'), ['backdrops', 'props', 'backdropSize']);
  assert.ok(!('counter' in M) || Object.keys(M).pop() === 'counter', 'the counter layout comes last');
  for (const old of ['cast', 'props']) assert.equal(fs.existsSync(at('packs', 'diner', 'art', old)), false, 'packs/diner/art/' + old + ' is an old copy');
  const pack = optional('packs/diner/pack.js');
  if (pack && pack.backdrops) for (const b of Object.values(pack.backdrops)) assert.ok(M.backdrops.includes(b), 'diner backdrop ' + b);
});
