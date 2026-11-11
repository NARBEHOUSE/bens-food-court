/** The 3D food (spec 6.5, docs/api/world.md), in Node with three r155 from js/vendor - no browser, no GPU.
 *
 *  For every restaurant pack (BB_PACKS=<id,...> limits the loops) whose food module exists (js/food/<pack>.js; a
 *  pack still waiting for its module is a TODO, not a failure):
 *    - every look a pack uses (ingredients and slot values) has a builder in its module chain;
 *    - every builder gives a group and a height >= 0 at every cooking stage, and every recipe assembles at every
 *      step of its line and on the counter;
 *    - no food body uses a ShaderMaterial (only the ink hulls may: the review renderer hides those);
 *    - builds are deterministic (the same part twice, even from a fresh kit, gives the same geometry);
 *    - every set its stations name exists, builds, and its lens puts the work surface on the backdrop's line;
 *    - the cooking visuals draw every stage; every gross-out fx it names exists and sits on the food.
 *  Then the kit itself: picks in line order, giant, Low thinning (never a cue), Motion Reduced, the shared builders.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const G = path.join(__dirname, '..');
const quiet = fn => { const w = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = w; } };
const THREE = quiet(() => require(path.join(G, 'js/vendor/three.min.js')));
const FOOD = require(path.join(G, 'js/food/kit.js'));
const L = require(path.join(G, 'js/core/line.js'));
const ONLY = process.env.BB_PACKS ? process.env.BB_PACKS.split(',').map(s => s.trim()).filter(Boolean) : null;

/** Every restaurant pack: packs/<id>/pack.js. */
const PACKS = fs.readdirSync(path.join(G, 'packs'))
  .filter(id => fs.existsSync(path.join(G, 'packs', id, 'pack.js')) && (!ONLY || ONLY.includes(id)))
  .map(id => ({ id, pack: require(path.join(G, 'packs', id, 'pack.js')) }));
const moduleOf = P => (P.world && P.world.module) || P.id;
const moduleFile = P => path.join(G, 'js', 'food', moduleOf(P) + '.js');
PACKS.forEach(({ pack }) => { if (fs.existsSync(moduleFile(pack))) require(moduleFile(pack)); });

/** A kit for a pack; env extras: { low, reduced }. Kits warn about missing builders: the tests catch those. */
function kitFor(P, extra) {
  const e = extra || {};
  return quiet(() => FOOD.kit(THREE, { pack: () => P, low: () => !!e.low, reduced: () => !!e.reduced }));
}
const run = (k, fn) => quiet(fn);

/** Every mesh with a ShaderMaterial must be an ink hull. */
function shaderBodies(g) {
  const bad = [];
  g.traverse(o => { if ((o.isMesh || o.isPoints) && o.material && [].concat(o.material).some(m => m.isShaderMaterial) && !o.userData.hull) bad.push(o.type + ' ' + (o.name || '')); });
  return bad;
}
const sum = a => { let x = 0; for (let i = 0; i < a.length; i++) x += a[i] * ((i % 7) + 1); return x.toFixed(4); };
/** What a build is, as text: every object's place, geometry, material and instances. */
function print(g) {
  g.updateMatrixWorld(true);
  const out = [];
  g.traverse(o => {
    let s = o.type + ' ' + o.matrixWorld.elements.map(v => v.toFixed(5)).join(',') + ' ' + o.visible;
    if (o.geometry) {
      const p = o.geometry.attributes.position;
      s += ' ' + o.geometry.type + ' ' + (p ? p.count + ':' + sum(p.array) : '') + ' ' + (o.geometry.index ? o.geometry.index.count : '-') + ' ' + JSON.stringify(o.geometry.drawRange);
    }
    if (o.material) [].concat(o.material).forEach(m => { s += ' ' + m.type + ':' + (m.color ? m.color.getHexString() : '') + ':' + m.opacity + ':' + m.side + ':' + !!m.transparent; });
    if (o.isInstancedMesh) s += ' x' + o.count + ':' + sum(o.instanceMatrix.array);
    out.push(s);
  });
  return out.join('\n');
}
/** Each look a pack uses: [{ where, part }], ingredients first, then slot values with a look. */
function looksOf(P) {
  const out = Object.keys(P.ingredients || {}).map(id => ({ where: 'ingredient ' + id, part: { ing: id }, shape: (P.ingredients[id].look || {}).shape, ing: id }));
  Object.keys(P.slots || {}).forEach(slot => (P.slots[slot].values || []).forEach(v => {
    if (v.look && v.look.shape) out.push({ where: 'slot ' + slot + ' value ' + v.id, part: { ing: v.id, slot, look: v.look, pick: true }, shape: v.look.shape });
  }));
  return out.filter(x => x.shape);
}
/** The stages an ingredient (or a cook step's own set) goes through: [undefined] when it does not cook. */
function stagesOf(P, ing) {
  const I = (P.ingredients || {})[ing];
  return I && I.stages && P.stageSets && P.stageSets[I.stages] ? P.stageSets[I.stages].stages.map((_, i) => i) : [undefined];
}
const setNames = P => ['counter'].concat(Object.keys(P.stations || {}).map(sid => P.stations[sid].backdrop || sid)).filter((x, i, a) => a.indexOf(x) === i);
/** A ticket-like order of one recipe as written (the first value of every pick), walked by the line's own answers. */
function specOf(P, rid) {
  const R = P.recipes[rid], it = R.item || {};
  const val = v => (v && typeof v === 'object' && v.pick ? ((P.picks || {})[v.pick] || {}).normal || ((P.picks || {})[v.pick] || { values: [] }).values[0] : v);
  const spec = { recipe: rid, ing: val(it.ing), parts: [], holds: [], adds: [] };
  if (it.size) spec.size = val(it.size);
  if (it.done) spec.done = val(it.done);
  (it.parts || []).filter(p => p.opt !== 'out').forEach(p => {
    const q = { ing: val(p.ing) };
    if (p.done) q.done = val(p.done);
    if (p.ing && typeof p.ing === 'object') q.flavour = true;
    if (q.ing) spec.parts.push(q);
  });
  if (it.slots) {
    spec.picks = {};
    Object.keys(it.slots).forEach(slot => {
      const v = it.slots[slot], S = (P.slots || {})[slot];
      const first = S && S.values && S.values[0] && S.values[0].id;
      if (typeof v === 'string' || Array.isArray(v)) spec.picks[slot] = v;
      else if (v && v.pick) spec.picks[slot] = v.count ? Array.from({ length: v.count[0] || 1 }, () => first) : first;
    });
  }
  return spec;
}
/** The line's right answer (bot.cjs's right(), kept local so this file depends on line.js alone). */
function answerFor(P, o, q) {
  const want = L.expected(P, o.items[q.item], q.station, q.step);
  const leaves = (function flat(opts) { return opts.flatMap(x => (x.row ? flat(x.row) : [x])); })(q.options || []);
  if (q.kind === 'add') return q.gross ? 'swap' : q.have < want ? 'add' : 'skip';
  if (q.kind === 'cook') return q.timed ? 'takeOff' : want === null ? q.options[0].id : 'cook:' + want;
  if (q.kind === 'pick') {
    if (q.gross) return 'swap';
    if (q.repeat) {
      const left = L.remaining ? L.remaining(want || [], q.picked || []) : [];
      if (!left.length) return q.have ? 'done' : leaves.find(x => x.value !== undefined).id;
      return leaves.find(x => x.value === left[0]).id;
    }
    const hit = leaves.find(x => x.value === want) || leaves.find(x => x.value !== undefined);
    return hit.id;
  }
  return null;
}
/** The highest point an object reaches, in world space (instances one by one). */
function topOf(obj) {
  let top = -Infinity;
  const box = new THREE.Box3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  obj.updateMatrixWorld(true);
  obj.traverse(o => {
    if (!o.isMesh || !o.geometry || o.userData.hull) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); top = Math.max(top, box.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(o.matrixWorld, im)).max.y); }
    else top = Math.max(top, box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).max.y);
  });
  return top;
}
/** A cook context as world.js makes one, on a freshly built set. */
function cookCtx(k, def, h) {
  const g = new THREE.Group(), anchors = def.build(g, k) || {}, F = new THREE.Group(), fx = new THREE.Group();
  g.add(F, fx);
  const state = { ing: null, n: 0, stage: 0 };
  const c = { k, F, fx, anchors, state, redraw(s) { if (s) Object.assign(state, s); while (F.children.length) F.remove(F.children[0]); h.show(c, state); return c; } };
  return { g, c };
}

/* ── per pack ──────────────────────────────────────────────────────────────── */
for (const { id, pack: P } of PACKS) {
  const ready = fs.existsSync(moduleFile(P));
  const todo = ready ? undefined : 'js/food/' + moduleOf(P) + '.js is not written yet (its food agent)';

  test(id + ': every look the pack uses has a builder in its food module', { todo }, () => {
    const k = kitFor(P);
    const missing = looksOf(P).filter(x => !k.find('shapes', x.shape)).map(x => x.where + ' (look.shape ' + x.shape + ')');
    assert.deepStrictEqual(missing, [], 'no builder for: ' + missing.join(', '));
  });

  test(id + ': every look builds at every cooking stage, height >= 0, ink only on hulls, the same every time', { todo }, () => {
    const k = kitFor(P), k2 = kitFor(P);
    for (const x of looksOf(P)) {
      for (const stage of x.ing ? stagesOf(P, x.ing) : [undefined]) {
        const o = stage === undefined ? {} : { stage };
        const a = run(k, () => k.food(Object.assign({}, x.part), o)), b = run(k2, () => k2.food(Object.assign({}, x.part), o));
        const where = x.where + (stage === undefined ? '' : ' at stage ' + stage);
        assert.ok(a && a.g && a.g.isObject3D, where + ': no group');
        assert.ok(Number.isFinite(a.h) && a.h >= 0, where + ': height ' + a.h);
        assert.deepStrictEqual(shaderBodies(a.g), [], where + ': a body uses a shader');
        assert.strictEqual(print(a.g), print(b.g), where + ': two builds differ');
      }
    }
  });

  test(id + ': every set its stations name builds, and each lens puts the surface on the backdrop line', { todo }, () => {
    const k = kitFor(P);
    for (const name of setNames(P)) {
      const def = k.find('sets', name);
      assert.ok(def, 'no 3D set for the backdrop "' + name + '"');
      const g = new THREE.Group();
      const anchors = run(k, () => def.build(g, k));
      assert.ok(anchors && typeof anchors === 'object', name + ': build() returns its anchors');
      assert.deepStrictEqual(shaderBodies(g), [], name + ': furniture uses a shader');
      assert.ok(def.cam && def.cam.pos && def.cam.at && def.cam.fov, name + ': a camera { pos, at, fov }');
      const stations = Object.keys(P.stations || {}).filter(sid => (P.stations[sid].backdrop || sid) === name);
      if (stations.some(sid => P.stations[sid].steps.some(s => s.kind === 'add' && stagesOf(P, s.ing)[0] === undefined)))
        assert.ok(anchors.stack && anchors.incoming, name + ': a line set needs stack and incoming anchors');
      if (stations.some(sid => P.stations[sid].steps.some(s => s.kind === 'cook'))) {
        assert.ok(def.cook && k.find('cooks', def.cook), name + ': a cooking station\'s set names its cook (cooks.' + def.cook + ')');
      }
      if (def.line === null || def.line === undefined) continue;
      assert.ok(def.surface && Number.isFinite(def.surface.y) && Number.isFinite(def.surface.back), name + ': a solved set names its surface { y, back }');
      for (const aspect of [16 / 9, 16 / 10, 4 / 3, 21 / 9]) {
        const cam = new THREE.PerspectiveCamera(def.cam.fov, aspect, 0.1, 60);
        cam.position.set(...def.cam.pos); cam.lookAt(...def.cam.at); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
        const back = new THREE.Vector3(def.cam.at[0], def.surface.y, def.surface.back), want = FOOD.lineOnScreen(def.line, aspect, def.picture);
        const dy = FOOD.lensShift(cam, back, want);
        cam.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: -dy, width: 1, height: 1 };
        cam.updateProjectionMatrix();
        const v = back.clone().project(cam);
        assert.ok(Math.abs((1 - v.y) / 2 - want) < 1e-6, name + ' at ' + aspect.toFixed(2) + ': the surface lands at ' + ((1 - v.y) / 2).toFixed(4) + ', not ' + want.toFixed(4));
      }
    }
  });

  test(id + ': every recipe assembles at every step of its line and on the counter', { todo }, () => {
    const k = kitFor(P), k2 = kitFor(P);
    for (const rid of Object.keys(P.recipes || {})) {
      const o = L.create(P, { customer: { id: 'x', name: 'X' }, items: [specOf(P, rid)] }, { settings: { cooking: 'simple' } });
      for (let guard = 0; o.phase === 'line' && guard < 200; guard++) {
        const q = L.question(P, o, { cooking: 'simple' });
        const made = L.made(P, o, q.item), st = P.stations[q.station];
        const hide = st && st.builds && st.builds.cap ? ['top'] : [];
        const a = run(k, () => k.item(made, { where: 'line', hide })), b = run(k2, () => k2.item(made, { where: 'line', hide }));
        assert.ok(a.g.isObject3D && Number.isFinite(a.h) && a.h >= 0, rid + ' at ' + q.key + ': height ' + a.h);
        assert.deepStrictEqual(shaderBodies(a.g), [], rid + ' at ' + q.key);
        assert.strictEqual(print(a.g), print(b.g), rid + ' at ' + q.key + ': two builds differ');
        const r = L.answer(P, o, answerFor(P, o, q), { cooking: 'simple' });
        assert.ok(!r.refused, rid + ': the line refused its own answer at ' + q.key);
      }
      const made = L.made(P, o, 0);
      const c = run(k, () => k.item(made, { where: 'counter' }));
      assert.ok(c.g.isObject3D && c.h >= 0, rid + ': on the counter');
      assert.deepStrictEqual(shaderBodies(c.g), [], rid + ': on the counter');
    }
  });

  test(id + ': the cooking visuals draw every stage (Simple, Timed, an Add, the flourish)', { todo }, async () => {
    const k = kitFor(P, { reduced: true });
    for (const name of setNames(P)) {
      const def = k.find('sets', name);
      if (!def || !def.cook) continue;
      const h = k.find('cooks', def.cook);
      const { g, c } = cookCtx(k, def, h);
      // What cooks here: Adds of something that cooks, picks of it, a cook step's own ingredient, or the whole item
      // (a cook step with no ingredient: the pizza in the oven), at every stage of its set.
      const cases = new Map();
      const add = (ing, set, made) => {
        const list = set && P.stageSets[set] ? P.stageSets[set].stages.map((_, i) => i) : stagesOf(P, ing);
        if (list[0] !== undefined) cases.set(ing + '|' + (set || ''), { ing, set, list, made });
      };
      Object.keys(P.stations).filter(sid => (P.stations[sid].backdrop || sid) === name).forEach(sid => {
        const steps = P.stations[sid].steps, from = steps.find(s => s.kind === 'pick' && s.from);
        steps.forEach(s => {
          if (s.kind === 'add') add(s.ing);
          if (s.kind === 'pick' && s.from) s.from.forEach(v => add(v));
          if (s.kind === 'cook' && s.ing) add(s.ing, s.stages);
          if (s.kind === 'cook' && !s.ing && !from) Object.keys(P.recipes).filter(rid => P.recipes[rid].stations.includes(sid)).forEach(rid => {
            const spec = specOf(P, rid);
            add(spec.ing, s.stages, { recipe: rid, ing: spec.ing, parts: spec.parts, picks: spec.picks || {}, counts: {}, auto: [], gross: [] });
          });
        });
      });
      for (const { ing, set, list, made } of cases.values()) {
        for (const stage of list) {
          for (const cooking of [false, true]) {
            run(k, () => { while (c.F.children.length) c.F.remove(c.F.children[0]); h.show(c, Object.assign(c.state, { ing, n: 1, stage, cooking, set, made: made || null })); });
            assert.ok(c.F.children.length > 0, name + ': nothing drawn for ' + ing + ' at stage ' + stage);
            assert.deepStrictEqual(shaderBodies(g), [], name + ': ' + ing + ' at stage ' + stage);
          }
          if (h.stage) run(k, () => h.stage(c, Object.assign({}, c.state, { stage })));
        }
        if (h.add) await run(k, () => h.add(c, { ing, n: 1 }));
        if (h.run) await run(k, () => h.run(c, { stage: list.length - 1, ms: 10 }));
        assert.ok(c.F.children.length > 0, name + ': the flourish left nothing for ' + ing);
      }
    }
  });

  test(id + ': every gross-out fx it names exists, and sits on the food it spoils', { todo }, () => {
    const k = kitFor(P);
    for (const E of P.gross || []) {
      for (const key of Object.keys(E.fx || {})) assert.ok(k.find('fx', key), E.id + ': no fx "' + key + '"');
      for (const ing of [].concat(E.on || [])) {
        if (!(P.ingredients || {})[ing]) continue;
        const clean = run(k, () => k.food({ ing })), bad = run(k, () => k.food({ ing, gross: E.id }));
        const food = k.boxOf(bad.g);                       // the spoiled food itself (a droop squashes it), fx left out
        assert.notStrictEqual(print(clean.g), print(bad.g), E.id + ' on ' + ing + ': looks no different');
        bad.g.traverse(o => {
          if (!o.userData.fx || (o.parent && o.parent.userData.fx)) return;
          const top = topOf(o);
          assert.ok(top >= food.max.y - 0.03, E.id + ' on ' + ing + ': an fx is buried in the food (reaches ' + top.toFixed(3) + ', the food ' + food.max.y.toFixed(3) + ')');
        });
        assert.deepStrictEqual(shaderBodies(bad.g), [], E.id + ' on ' + ing);
      }
    }
  });
}

/* ── the diner's looks are the ones docs/api/world.md promises (content-diner uses only those) ─────────────── */
test('docs/api/world.md lists exactly the looks the diner module provides', () => {
  const doc = fs.readFileSync(path.join(G, 'docs', 'api', 'world.md'), 'utf8');
  const part = doc.split('<!-- diner-looks -->')[1];
  assert.ok(part, 'docs/api/world.md has a <!-- diner-looks --> table');
  const listed = [...part.split('<!-- /diner-looks -->')[0].matchAll(/^\|\s*`(\w+)`/gm)].map(m => m[1]);
  const diner = PACKS.find(p => p.id === 'diner') || { pack: require(path.join(G, 'packs/diner/pack.js')) };
  require(path.join(G, 'js/food/diner.js'));
  const k = kitFor(diner.pack), mod = k.module('diner');
  const own = Object.keys(mod.shapes).filter(s => s !== 'boat');          // the boat is the fried layout's, not a look
  assert.deepStrictEqual(listed.slice().sort(), own.slice().sort());
});

/* ── the kit ───────────────────────────────────────────────────────────────── */
const SYN = {
  id: 'synthetic',
  stageSets: { bake: { stages: ['raw', 'golden', 'crispy'], choose: ['golden', 'crispy'] } },
  ingredients: { cheese: { name: 'Cheese', look: { shape: 'disc', colour: 0xffd75e, h: 0.02 } }, crust: { name: 'Crust', stages: 'bake', look: { shape: 'disc', colour: 0xe8c48a } } },
  slots: {
    crust: { name: 'Crust', values: [{ id: 'thin', name: 'Thin', look: { shape: 'disc', colour: 0xe8c48a, h: 0.02 } }, { id: 'heart', name: 'Heart', look: { shape: 'disc', colour: 0xe8c48a, giant: true } }] },
    sauce: { name: 'Sauce', values: [{ id: 'red', name: 'Red', look: { shape: 'bead', colour: 0xc8231a } }, { id: 'bare', name: 'None' }] },
    size: { name: 'Size', values: [{ id: 'small', name: 'Small' }] },
  },
  stations: { prep: { name: 'Prep', backdrop: 'prep', steps: [{ kind: 'pick', slot: 'size' }, { kind: 'pick', slot: 'crust' }, { kind: 'pick', slot: 'sauce' }, { kind: 'add', ing: 'cheese' }] } },
  recipes: { pie: { name: 'Pie', stations: ['prep'], item: { parts: [{ ing: 'cheese' }] } }, party: { name: 'Party Pie', stations: ['prep'], look: { giant: 1.4 }, item: { parts: [] } } },
  gross: [{ id: 'mould', on: ['cheese'], fx: { spots: 0x7fae3a } }],
};

test('made().picks go in among the parts where their step falls in the line; a bad pick keeps its gross-out', () => {
  const k = kitFor(SYN);
  const made = { recipe: 'pie', ing: null, parts: [{ ing: 'cheese' }], picks: { sauce: 'red', crust: 'thin', size: 'small' }, gross: [{ slot: 'sauce', value: 'red', event: 'mould', key: 'prep.2' }] };
  const seq = k.sequence(made);
  assert.deepStrictEqual(seq.parts.map(p => p.ing), ['thin', 'red', 'cheese'], 'crust, sauce (the size has no look), then the cheese');
  assert.strictEqual(seq.parts[1].gross, 'mould');
  const b = run(k, () => k.item(made));
  assert.ok(b.h > 0.02);
});

test('giant: a giant look is drawn bigger, by 1.6 or its own number', () => {
  const k = kitFor(SYN);
  assert.strictEqual(k.giant({ recipe: 'pie', parts: [] }), 1);
  assert.strictEqual(k.giant({ recipe: 'pie', parts: [], picks: { crust: 'heart' } }), FOOD.GIANT);
  assert.strictEqual(k.giant({ recipe: 'party', parts: [] }), 1.4);
  const small = run(k, () => k.item({ recipe: 'pie', parts: [{ ing: 'cheese' }], picks: { crust: 'thin' } }));
  const big = run(k, () => k.item({ recipe: 'pie', parts: [{ ing: 'cheese' }], picks: { crust: 'heart' } }));
  assert.ok(Math.abs(big.g.scale.x - FOOD.GIANT) < 1e-9 && Math.abs(big.h - small.h * FOOD.GIANT) < 0.03, 'scaled and as tall again');
});

test('Low thins decoration and never a cue: the bun loses seeds, a charred patty keeps its marks and flecks', () => {
  const diner = require(path.join(G, 'packs/diner/pack.js'));
  require(path.join(G, 'js/food/diner.js'));
  const count = g => { let n = 0; g.traverse(o => { if (o.isMesh && !o.userData.hull) n++; }); return n; };
  const hi = kitFor(diner), lo = kitFor(diner, { low: true });
  assert.ok(count(lo.food({ ing: 'bun', layer: 'top' }).g) < count(hi.food({ ing: 'bun', layer: 'top' }).g), 'fewer seeds');
  assert.strictEqual(count(lo.food({ ing: 'patty' }, { stage: 5 }).g), count(hi.food({ ing: 'patty' }, { stage: 5 }).g), 'the same marks and flecks');
});

test('Motion Reduced: every tween ends at once, so a module can never leave food mid-air', async () => {
  const k = kitFor(SYN, { reduced: true });
  let last = null;
  const p = k.tween(5000, t => { last = t; });
  assert.strictEqual(last, 1, 'the end state, at once');
  await p;
  await k.wait(5000);
  const q = k.pour({ F: new THREE.Group(), from: new THREE.Vector3(0, 1, 0), to: () => new THREE.Vector3(), colour: 0x4a2412, onLevel: t => { last = t; } });
  assert.strictEqual(last, 1);
  await q;
});

test('the shared builders (blender jar, fill, heap, scatter, squeeze bottle and bead, shaker, puff) build the same every time', () => {
  const k = kitFor(SYN), k2 = kitFor(SYN);
  const builds = [
    ['jar', kk => kk.blenderJar({ base: 0x2aa198 })],
    ['fill', kk => kk.fill([[0.1, 0.02], [0.14, 0.4]], 0.6, 0xff7f50)],
    ['heap', kk => kk.heap('chunk', 0xd9b37a, { n: 20, seed: 'rice' })],
    ['scatter', kk => ({ g: kk.scatter('sprinkle', 0xff4fa0, kk.sample({ kind: 'torus', R: 0.2, r: 0.07 }, 30, 'sprinkles')), h: 0 })],
    ['bottle', kk => kk.bottle({ ing: 'red', look: { colour: 0xc8231a, cap: 0xa51a13 } })],
    ['bead', kk => kk.bead({ ing: 'red', look: { colour: 0xc8231a, path: 'spiral' } }, {})],
    ['shaker', kk => kk.shaker({ ing: 'salt', look: { colour: 0xffffff } })],
    ['puff', kk => ({ g: kk.puff(0x8d8d8d, 0.8), h: 0 })],
    ['scatter shape', kk => kk.food({ ing: 'x', look: { shape: 'scatter', piece: 'seed', colour: 0xf5deb3, count: 30 } }, { below: () => new THREE.Box3(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.1, 0.2)), base: 0.1 })],
    ['heap shape', kk => kk.food({ ing: 'x', look: { shape: 'heap', piece: 'ball', colour: 0x5a3b22 } })],
    ['blob shape', kk => kk.food({ ing: 'x', look: { shape: 'blob', colour: 0xf3e5ab } })],
  ];
  for (const [name, fn] of builds) {
    const a = run(k, () => fn(k)), b = run(k2, () => fn(k2));
    assert.ok(a.g.isObject3D && Number.isFinite(a.h) && a.h >= 0, name);
    assert.deepStrictEqual(shaderBodies(a.g), [], name);
    assert.strictEqual(print(a.g), print(b.g), name + ': two builds differ');
  }
  const f = k.fill([[0.1, 0.02], [0.14, 0.4]], 1.5, 0xff7f50);
  assert.ok(Math.abs(f.h - 0.4) < 1e-9, 'a fill never overflows');
});

test('the default gross-out fx work on any food: placed from its box, marked as fx, still with nothing moving', () => {
  const k = kitFor(Object.assign({}, SYN, { gross: [{ id: 'all', on: ['cheese'], fx: { tint: 0x86b83c, droop: true, stink: true, smoke: true, hair: true, fly: true, spots: 0x7fae3a } }] }));
  for (const look of [{ shape: 'blob', colour: 0xf3e5ab, r: 0.3 }, { shape: 'disc', colour: 0xffd75e, r: 0.12, h: 0.4 }]) {
    const bad = k.food({ ing: 'cheese', look, gross: 'all' });
    const top = k.boxOf(bad.g).max.y;                     // squashed by the droop
    let fx = 0;
    bad.g.traverse(o => { if (o.userData.fx && !(o.parent && o.parent.userData.fx)) { fx += 1; assert.ok(topOf(o) >= top - 0.001, look.shape + ': an fx is buried in the food'); } });
    assert.ok(fx >= 9, look.shape + ': stink x3, smoke x3, hair, fly, spots');
    assert.deepStrictEqual(shaderBodies(bad.g), []);
  }
});

test('a backdrop line lands where `cover` puts it', () => {
  assert.strictEqual(FOOD.lineOnScreen(0.64, 4 / 3), 0.64, 'narrower than the picture: no crop');
  assert.ok(Math.abs(FOOD.lineOnScreen(0.64, 16 / 9) - (0.5 + 0.14 * (16 / 9) / 1.5)) < 1e-12, 'wider: the top and bottom are cut off');
  assert.ok(Math.abs(FOOD.lineOnScreen(0.5, 21 / 9) - 0.5) < 1e-12, 'the middle never moves');
});
