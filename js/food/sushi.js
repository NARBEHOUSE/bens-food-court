/** Ben's Food Court - Ben's Sushi's food in 3D (docs/api/food.md, the Sushi section; docs/api/packs/sushi.md
 *  section 10 is the list of looks it draws).
 *
 *  The same toon style as the Burger Bar and the Pizza Parlor: chunky cel-shaded food with ink outlines, in close-up.
 *  A roll is drawn in one of four forms, all from the same parts (the nori, the rice, each filling, the toppings):
 *    sheet   on the bamboo mat at the prep table: the nori laid flat, the rice pressed over it (grains as bumps), the
 *            fillings laid across in a band, sesame over the rice, the sauces zigzagged over the band. Inside-out:
 *            the sheet is flipped, so the fillings lie on the nori with the rice showing round its edge.
 *    log     rolled, on the mat (the mat curled round it) or on the cutting board: the nori (or, inside-out, the
 *            rice) outside, and both ends cut so the rice ring and every filling show in the cross-section.
 *    pieces  sliced: 6 or 8 rounds in a row (10 in two rows of 5), cut faces up, each face showing the nori ring, the
 *            rice and a patch of every filling; on the cutting board, on a wooden geta at the counter, or along the
 *            deck of the Sushi Boat.
 *    cone    a hand roll: a nori cone with the rice and the fillings showing at its open mouth, lying on the mat or
 *            on a small geta (never sliced).
 *  The cook is the rolling (the `roll` stage set): Flat, Loose, Firm, Tight, Squashed, each a colour AND a mark
 *  (Loose: paler nori, an open seam and the mat barely curled; Firm: dark nori, the mat wrapped round, one red string
 *  band; Tight: near-black glossy nori, smaller, wrapped further, two bands; Squashed: flattened, the mat flat, rice
 *  squeezed out of both ends and a dent along the top).
 *  Miso soup: a red lacquer bowl (black inside), the broth (white or red miso) with a faint swirl, tofu cubes, wakame
 *  ribbons and a bunch of enoki floating.
 *  What goes on stays as it went on (food audit 2026-11-11): a filling spills out of its bowl into its own fixed lane
 *  and stays; a sauce is squirted exactly where it stays; the sesame and the sauces roll in with the fillings (they
 *  show in every cut face, never jump to the outside); the roll-up curls the mat over the sheet (wrapT keyframes); the
 *  slice lifts each piece out of the log into its row (layT keyframes); the ladle empties as it pours.
 *
 *  Sets, by backdrop name: counter (spec 5.2: line 0.80, a golden hinoki top with an orange-wood edge, as the counter
 *  picture's own sushi counter and the court's storefront draw it), prep (the painted counter is the surface: the
 *  prep table and the soup station) and roll (the painted board counter: the mat, cook 'mat', and the cutting board).
 *  Lines measured from art-source/backdrops: prep 62.8%, roll 62.0% (FOODCOURT-BUILD.md 5.2 asked 62 and 60).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kit.js'));
  else factory(root.BB.food);
})(typeof window === 'undefined' ? globalThis : window, function (food) {
  'use strict';
  food.register('sushi', k => {
    const THREE = k.THREE, PI = Math.PI;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const P0 = () => Promise.resolve();
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const TOP = 0.5;                       // the height of every kitchen work surface (as the diner's)

    const C = {
      mat: 0xd9b26a, matAlt: 0xc9a05a, string: 0xf6eedb, band: 0xd8352a,
      nori: 0x1f3326, noriRidge: 0x2d4a39, soggy: 0x4f6a3a,
      board: 0xe9c189, boardEdge: 0xbf8a4e, boardGrain: 0xd8a96c,
      geta: 0xc98a4c, getaTop: 0xdba066, getaFoot: 0x8a5428,
      bowl: 0xfbfaf6, wave: 0x2d5ea8, tray: 0xf4f1ea,
      steel: 0xdfe4e8, steelDark: 0x8f99a2, handle: 0x4a2c1a,
      lacquer: 0x9a2219, lacquerIn: 0x1c1412, lacquerFoot: 0x6e140f,
      crabRed: 0xe5522c, cucSkin: 0x2f7a22, cucFlesh: 0xd2ecaa, avoSkin: 0x3f6a22, avoFlesh: 0xc9dc6a,
      salmonFat: 0xffe0cc, tunaSheen: 0xe2546a, cheeseEdge: 0x9fb0c4,
    };
    // The roll on the mat, by stage (flat, loose, firm, tight, squashed): the log's size (f) and shape (sy, sz), the
    // nori's colour, how far the mat wraps round it (radians), its string bands and its other marks.
    const ROLLED = [
      null,
      { f: 1.1, sy: 0.86, sz: 1.06, nori: 0x3f6249, wrap: 1.7, bands: 0, seam: true },
      { f: 1.0, sy: 1, sz: 1, nori: 0x1f3326, wrap: 3.3, bands: 1 },
      { f: 0.88, sy: 1, sz: 1, nori: 0x0c1610, wrap: 4.3, bands: 2, shine: true },
      { f: 1.04, sy: 0.56, sz: 1.42, nori: 0x1f3326, wrap: 0, bands: 0, blobs: true },
    ];
    // The dial plates' swatches by stage (world.colourOf): the sheet's rice, then the nori loose to tight, then rice.
    const RAMP = [0xf4efe2, 0x3f6249, 0x1f3326, 0x0c1610, 0xe9e2cf];
    // The mat is a little wider than the nori sheet (0.72) and the log (0.76), as a real makisu is: the sheet never
    // hangs off its sides (food audit 2026-11-11).
    const MAT = { W: 0.8, D: 0.74, r: 0.012 };
    const SHEET = { W: 0.72, D: 0.56, Wcone: 0.42 };
    const LOG = { r: 0.088, L: 0.76 };
    const PIECE = { r: 0.082, h: 0.058, gap: 0.012 };
    const CONE = { r: 0.1, h: 0.3 };
    const SOUP_LINE = 1.6;                 // the soup at the soup station, drawn up (a bowl is small next to the mat)
    const FILLINGS = ['salmon', 'tuna', 'crab', 'cucumber', 'avocado', 'creamCheese'];

    /* ── shared geometry (kept: never freed with a build) ── */
    const geos = {};
    const lo = () => (k.low() ? 'lo' : 'hi');
    const kept = (key, make) => geos[key + ':' + lo()] || (geos[key + ':' + lo()] = k.keep(make()));
    const flat = geo => geo.rotateX(-PI / 2);
    const UNIT = {
      disc: r => kept('disc' + r, () => flat(new THREE.CircleGeometry(r, k.seg(28)))),
      ring: (a, b) => kept('ring' + a + ':' + b, () => flat(new THREE.RingGeometry(a, b, k.seg(28), 1))),
      // A cylinder of radius 1 and height 1 standing on y = 0 (the side of a piece): open, or closed.
      wall: () => kept('wall', () => new THREE.CylinderGeometry(1, 1, 1, k.seg(28), 1, true).translate(0, 0.5, 0)),
      drum: () => kept('drum', () => new THREE.CylinderGeometry(1, 1, 1, k.seg(28), 1, false).translate(0, 0.5, 0)),
      grain: () => kept('grain', () => new THREE.SphereGeometry(0.011, 6, 4).scale(1.7, 0.7, 1)),
      seed: () => kept('seed', () => new THREE.SphereGeometry(0.0075, 6, 4).scale(1.6, 0.55, 1)),
      blob: () => kept('blob', () => new THREE.IcosahedronGeometry(0.03, 1)),
    };
    function roundRect(w, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    const rectGeo = (key, w, h, r) => kept('rr' + key, () => flat(new THREE.ShapeGeometry(roundRect(w, h, r), 4)));
    const mat4 = (p, ry, s) => new THREE.Matrix4().compose(V(p[0], p[1], p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)),
      Array.isArray(s) ? V(s[0], s[1], s[2]) : V(s || 1, s || 1, s || 1));

    /* ── the cross-section's patches: unit shapes in a face's own frame (radius 1, lying flat, facing up) ── */
    // Each filling shows as its own shape AND colour in every cut face, so two fillings never read the same.
    const PATCH = {
      salmon: () => [[rectGeo('salmon', 1.7, 1.05, 0.3), k.toon(k.lookOf('salmon').colour || 0xf28a5b), 0],
        [kept('salmonFat', () => { const g = new THREE.BoxGeometry(0.16, 0.001, 1.0); g.rotateY(0.5); return g; }), k.toon(C.salmonFat), 1, [[-0.45, 0], [0.05, 0], [0.55, 0]]]],
      tuna: () => [[rectGeo('tuna', 1.55, 1.15, 0.35), k.toon(k.lookOf('tuna').colour || 0xc8283c), 0],
        [rectGeo('tunaSheen', 0.9, 0.22, 0.1), k.toon(C.tunaSheen), 1, [[0.1, -0.28]]]],
      crab: () => [[UNIT.disc(1), k.toon(k.lookOf('crab').colour || 0xf4e6dc), 0],
        [kept('crabTop', () => flat(new THREE.CircleGeometry(1.0, k.seg(20), 0, PI))), k.toon(C.crabRed), 1]],
      cucumber: () => [[rectGeo('cuc', 1.3, 1.3, 0.12), k.toon(C.cucSkin), 0], [rectGeo('cucIn', 0.85, 0.85, 0.1), k.toon(C.cucFlesh), 1]],
      avocado: () => [[kept('avo', () => flat(new THREE.RingGeometry(0.45, 1.05, k.seg(20), 1, 0.15 * PI, 0.7 * PI))), k.toon(C.avoFlesh), 0],
        [kept('avoSkin', () => flat(new THREE.RingGeometry(0.92, 1.12, k.seg(20), 1, 0.15 * PI, 0.7 * PI))), k.toon(C.avoSkin), 1]],
      creamCheese: () => [[rectGeo('cheeseEdge', 1.6, 1.0, 0.12), k.toon(C.cheeseEdge), 0], [rectGeo('cheese', 1.36, 0.78, 0.1), k.toon(k.lookOf('creamCheese').colour || 0xfbf7ee), 1]],
    };
    // Where n fillings sit in a face (units of the filling area's radius): [x, z, size].
    const SLOTS = [
      [], [[0, 0, 0.62]], [[-0.42, 0, 0.46], [0.42, 0, 0.46]], [[0, -0.42, 0.4], [-0.4, 0.3, 0.4], [0.4, 0.3, 0.4]],
      [[-0.38, -0.38, 0.36], [0.38, -0.38, 0.36], [-0.38, 0.38, 0.36], [0.38, 0.38, 0.36]],
      Array.from({ length: 5 }, (_, i) => [Math.cos(i * 1.2566 - 1.57) * 0.5, Math.sin(i * 1.2566 - 1.57) * 0.5, 0.33]),
      Array.from({ length: 5 }, (_, i) => [Math.cos(i * 1.2566 - 1.57) * 0.56, Math.sin(i * 1.2566 - 1.57) * 0.56, 0.3]).concat([[0, 0, 0.3]]),
    ];
    /** One piece of geometry on every face: faces are Matrix4s (a face's frame: radius 1 across, y outward). at:
     *  [x, z] the patch's centre, size its scale, subs: [[a, b]] offsets inside the patch (its own units, turning
     *  with it: a salmon's fat lines stay on the salmon). */
    function onFaces(geo, mat, faces, at, size, lift, subs, outline) {
      const list = [], c = at || [0, 0], sz = size || 1;
      faces.forEach((F, i) => (subs || [[0, 0]]).forEach(([a, b]) => {
        const L = mat4([c[0], lift || 0, c[1]], i * 0.7, [sz, 1, sz]).multiply(mat4([a, 0, b], 0, 1));
        list.push(new THREE.Matrix4().multiplyMatrices(F, L));
      }));
      return k.inkInstanced(geo, mat, list, { outline: outline || false });
    }

    /* ── reading a roll: which parts it has, and the form it is drawn in ── */
    const stageOf = (made, o) => (o && o.stage !== undefined && o.stage !== null ? o.stage : k.stageIndex({ ing: made.ing, done: made.done, stages: 'roll' }));
    const isBoat = made => { const R = made.recipe && (k.pack().recipes || {})[made.recipe]; return !!(R && R.look && R.look.shape === 'sushiBoat'); };
    function partsOf(seq) {
      const out = { roll: null, rice: null, cut: null, fillings: [], sesame: null, sauces: [] };
      seq.parts.forEach(p => {
        const sh = k.lookFor(p).shape;
        if (sh === 'nori' || sh === 'noriInside' || sh === 'noriCone') out.roll = p;
        else if (sh === 'rice' || sh === 'noRice') out.rice = p;
        else if (sh === 'rollCut') out.cut = p;
        else if (sh === 'sesame') out.sesame = p;
        else if (sh === 'sauce') out.sauces.push(p);
        else out.fillings.push(p);
      });
      return out;
    }
    /** The roll's context, handed to every part's shape (o.roll): its form, its base and its geometry. */
    function rollCtx(made, o, parts) {
      const pk = made.picks || {}, where = o.where, set = o.set;
      const kindOf = s => (s === 'noriInside' ? 'inside' : s === 'noriCone' ? 'cone' : 'regular');
      const hasRice = !!(parts.rice && k.lookFor(parts.rice).shape === 'rice');
      let kind = parts.roll ? kindOf(k.lookFor(parts.roll).shape) : null;
      if (kind === 'inside' && parts.rice && !hasRice) kind = 'regular';      // no rice to put outside
      const riceColour = hasRice ? k.lookFor(parts.rice).colour : null;
      const N = parts.cut ? (k.lookFor(parts.cut).pieces || 8) : 0;
      const sliced = !!(N && (made.auto || []).includes('slice'));
      let stage = stageOf(made, o);
      const flatSheet = !kind || (where === 'mat' && !stage) || (set === 'prep' && !o.rolled) ||
        (where !== 'mat' && where !== 'counter' && set !== 'roll' && !made.done && !sliced);
      let base, form;
      if (flatSheet) { base = 'mat'; form = 'sheet'; stage = 0; }
      else {
        if (!stage) stage = 2;
        form = kind === 'cone' ? 'cone' : sliced ? 'pieces' : 'log';
        base = where === 'mat' || set === 'prep' ? 'mat' : where === 'counter' ? (form === 'pieces' && isBoat(made) ? 'boat' : 'geta')
          // The Sushi Boat's log is sliced on the boat it is served on (it jumped from the board to the boat).
          : (form !== 'cone' && isBoat(made) ? 'boat' : 'board');
      }
      const st = ROLLED[clamp(stage, 1, 4)];
      const soggy = !!(parts.roll && parts.roll.gross === 'soggy');
      const ctx = { form, base, kind, hasRice, riceColour, N, stage, st, soggy, where, made, boat: isBoat(made) };
      ctx.nori = soggy ? k.mix(C.nori, C.soggy, 0.65) : form === 'sheet' ? C.nori : st.nori;
      return ctx;
    }

    /* ── the sheet: the nori flat on the mat, the rice, the band of fillings ── */
    function sheetGeo(ctx, parts) {
      const cone = ctx.kind === 'cone', W = cone ? SHEET.Wcone : SHEET.W, D = SHEET.D;
      const y0 = MAT.r * 2, inside = ctx.kind === 'inside' && ctx.hasRice, flipped = inside && !ctx.unflipped;
      const NORI = 0.006, RICE = 0.022;
      const S = { W, D, y0, inside: flipped, cone };
      if (flipped) { S.riceY = y0; S.noriY = y0 + RICE; S.surface = y0 + RICE + NORI; }
      else { S.noriY = y0; S.riceY = y0 + NORI; S.surface = y0 + NORI + (ctx.hasRice ? RICE + 0.006 : 0); }
      // The rice: over most of the sheet (the far strip bare, to seal the roll); flipped, a border all round.
      S.rice = flipped ? { x0: -W / 2 - 0.02, x1: W / 2 + 0.02, z0: -D / 2 - 0.02, z1: D / 2 + 0.02 }
        : cone ? { x0: -W / 2 + 0.015, x1: W / 2 - 0.1, z0: -D / 2 + 0.08, z1: D / 2 - 0.015 }
          : { x0: -W / 2 + 0.015, x1: W / 2 - 0.015, z0: -D / 2 + 0.1, z1: D / 2 - 0.015 };
      // The band of fillings, near the front edge (the roll starts there), one lane each in the order they went on.
      const n = parts.fillings.length, lane = 0.056;
      S.band = { x: cone ? -0.05 : 0, len: cone ? 0.24 : W - 0.12, z: 0.06, lane };
      // Each lane is fixed (the middle one first, then either side), so a filling never moves when the next goes on
      // (they shifted back a lane each Add, food audit 2026-11-11).
      const ALT = [0, -1, 1, -2, 2, 3, -3];
      S.laneOf = i => S.band.z + ALT[Math.min(i, ALT.length - 1)] * lane;
      const zs = Array.from({ length: n }, (_, i) => S.laneOf(i));
      S.bandMid = n ? (Math.min(...zs) + Math.max(...zs)) / 2 : S.band.z;
      S.bandW = n ? Math.max(...zs) - Math.min(...zs) + lane : 0.1;
      S.bandTop = S.surface + (n ? 0.045 : 0.004);
      return S;
    }

    /* ── the log and the pieces: the frames of their cut faces ── */
    function logGeo(ctx) {
      const f = ctx.st.f * (ctx.hasRice ? 1 : 0.74) * (ctx.grow || 1);
      const R = LOG.r * f, L = ctx.boat ? LOG.L * 1.15 : LOG.L;
      const faces = [-1, 1].map(sd => new THREE.Matrix4().compose(V(sd * L / 2, 0, 0),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sd * PI / 2)), V(R, 1, R)));
      return { R, L, faces, sy: ctx.st.sy, sz: ctx.st.sz };
    }
    /** The pieces: in a row (ten in two rows of five), each turned a little on its own axis and leaning back toward
     *  the viewer by `tilt` (the cut faces read from a low camera: the counter's), resting on its front edge. */
    function piecesGeo(ctx, tilt) {
      const f = ctx.st.f * (ctx.hasRice ? 1 : 0.76), r = PIECE.r * f, h = PIECE.h, t = tilt || 0;
      const sx = ctx.st.sy, sz = ctx.st.sz, N = ctx.N || 8, rows = N > 8 ? 2 : 1, per = Math.ceil(N / rows);
      const dx = 2 * r * sx + PIECE.gap, dz = 2 * r * sz + PIECE.gap + 0.006 + h * Math.sin(t);
      const R = k.rand('pieces:' + (ctx.made.recipe || '') + ':' + N), list = [];
      for (let i = 0; i < N; i++) {
        const row = Math.floor(i / per), col = i % per;
        const x = (col - (per - 1) / 2) * dx + (rows > 1 && row ? dx * 0.18 : 0), z = (row - (rows - 1) / 2) * dz;
        list.push({ x, z, r: (R() - 0.5) * (ctx.stage === 4 ? 0.3 : 2.4) });
      }
      const lift = r * sz * Math.sin(t) + 0.002;
      const lean = new THREE.Matrix4().makeRotationX(t);
      const at = q => new THREE.Matrix4().makeTranslation(q.x, lift, q.z).multiply(lean);
      const spin = (q, s) => new THREE.Matrix4().compose(V(0, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, q.r, 0)), s);
      let bases = list.map(at);
      if (ctx.layT !== undefined && ctx.layT < 1) {
        // The slice flourish (ctx.layT 0..1): each piece from its place in the cut log (lying on its side, as the board
        // shows the log) to its place in the row, standing cut face up (it jumped from the log to the row before).
        // Ten: alternate pieces go to the front and back rows, so their paths do not cross.
        const u = clamp(ctx.layT, 0, 1), e = k.ease(u), L = ctx.boat ? LOG.L * 1.15 : LOG.L;
        const Rl = LOG.r * ctx.st.f * (ctx.hasRice ? 1 : 0.74) * ctx.st.sy;
        const pa = V(0, 0, 0), qa = new THREE.Quaternion(), sa = V(1, 1, 1), pb = V(0, 0, 0), qb = new THREE.Quaternion(), sb = V(1, 1, 1);
        bases = bases.map((B, i) => {
          const j = rows > 1 ? (i % per) * 2 + Math.floor(i / per) : i, xs = -L / 2 + (j + 0.5) * L / N;
          const S = new THREE.Matrix4().makeRotationY(-0.24).multiply(new THREE.Matrix4().makeTranslation(xs - h / 2, Rl, 0)).multiply(new THREE.Matrix4().makeRotationZ(-PI / 2));
          S.decompose(pa, qa, sa); B.decompose(pb, qb, sb);
          const p = pa.clone().lerp(pb, e);
          p.y += Math.sin(u * PI) * 0.05;
          return new THREE.Matrix4().compose(p, qa.clone().slerp(qb, e), V(1, 1, 1));
        });
      }
      const faces = list.map((q, i) => bases[i].clone().multiply(new THREE.Matrix4().makeTranslation(0, h, 0)).multiply(spin(q, V(r * sx, 1, r * sz))));
      const walls = list.map((q, i) => bases[i].clone().multiply(spin(q, V(r * sx, h, r * sz))));
      const len = per * dx - PIECE.gap, wid = rows * dz - PIECE.gap;
      // The faces' middle and highest point (what lands on them: a sauce follows the faces' lean).
      const faceY = lift + h * Math.cos(t), faceZ = h * Math.sin(t), top = faceY + r * sz * Math.sin(t);
      return { r, h, sx, sz, faces, walls, list, len, wid, rows, dz, tilt: t, lift, faceY, faceZ, top };
    }
    /** Seeded points on the upper half of a log's skin (log frame: axis x, radius R). */
    function skinPoints(L, R, n, seed, spread) {
      const rnd = k.rand(seed), out = [];
      for (let i = 0; i < n; i++) {
        const x = (rnd() - 0.5) * (L - 0.02), a = (rnd() - 0.5) * (spread || 2.4);
        out.push({ p: [x, Math.cos(a) * R, Math.sin(a) * R], nrm: [0, Math.cos(a), Math.sin(a)], r: rnd() * PI * 2, t: rnd() });
      }
      return out;
    }
    /** Seeded points in a ring of every face (face frame; the face's own radius 1). */
    function facePoints(faces, n, r0, r1, seed, lift) {
      const rnd = k.rand(seed), out = [];
      faces.forEach(F => {
        for (let i = 0; i < n; i++) {
          const a = rnd() * PI * 2, rr = r0 + (r1 - r0) * Math.sqrt(rnd());
          const m = new THREE.Matrix4().multiplyMatrices(F, mat4([Math.cos(a) * rr, lift || 0.002, Math.sin(a) * rr], rnd() * PI, 1));
          out.push(m);
        }
      });
      return out;
    }

    /* ── the seigaiha bowl (blue waves on white: the bowls on the prep shelf) and the small tray ── */
    function waveBowl(r, h) {
      const g = new THREE.Group();
      // Steep walls, so the waves on the outside show from the line's camera.
      const prof = [[0, 0], [r * 0.55, 0], [r * 0.6, 0.012], [r * 0.82, h * 0.4], [r, h], [r * 0.95, h + 0.004], [r * 0.9, h * 0.8], [r * 0.55, h * 0.25], [0, h * 0.22]];
      g.add(k.ink(k.lathe(prof, k.seg(28)), k.toon(C.bowl)));
      // The wave band: a blue band round the wall with white arches (seigaiha) over it.
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.77, h * 0.35, k.seg(28), 1, true), k.toon(C.wave));
      band.position.y = h * 0.475;
      g.add(band);
      const scal = [];
      for (let i = 0; i < 14; i++) {
        const a = i * PI * 2 / 14;
        scal.push({ p: [Math.cos(a) * r * 0.885, h * 0.42, Math.sin(a) * r * 0.885], nrm: [Math.cos(a), 0, Math.sin(a)], r: 0, t: 0.5 });
      }
      g.add(k.scatter(kept('scallop' + r, () => new THREE.TorusGeometry(r * 0.15, r * 0.022, 4, 10, PI).rotateX(PI / 2)), k.toon(C.bowl), scal, { outline: false, lie: true }));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.004, 4, k.seg(28)).rotateX(PI / 2), k.toon(C.wave));
      rim.position.y = h + 0.002;
      g.add(rim);
      return { g, floor: h * 0.2, h };
    }
    function smallTray(w, d) {
      const g = new THREE.Group(), t = k.ink(new THREE.BoxGeometry(w, 0.016, d), k.toon(C.tray));
      t.position.y = 0.008;
      g.add(t);
      return { g, h: 0.016 };
    }
    /** A seeded mound of points in a bowl (or on a plate): scatter() format. */
    function mound(n, r, h, seed) {
      const R = k.rand(seed), out = [];
      for (let i = 0; i < n; i++) {
        const a = R() * PI * 2, rr = r * Math.sqrt(R());
        out.push({ p: [Math.cos(a) * rr, h * (1 - (rr / r) ** 2) * (0.5 + 0.5 * R()), Math.sin(a) * rr], nrm: [0, 1, 0], r: R() * PI * 2, t: R(), s: 0.85 + R() * 0.3 });
      }
      return out;
    }

    /* ── what each filling looks like in each form ── */
    // The pieces a filling waits as (in its bowl): geometry and colours.
    const hCrab = () => kept('hCrab', () => new THREE.CylinderGeometry(0.014, 0.014, 0.11, 8).rotateZ(PI / 2));
    const hCuc = () => kept('hCuc', () => new THREE.BoxGeometry(0.11, 0.018, 0.018));
    const HEAP = {
      salmon: () => [[kept('hSalmon', () => new THREE.BoxGeometry(0.1, 0.026, 0.05)), k.lookOf('salmon').colour, 1]],
      tuna: () => [[kept('hTuna', () => new THREE.BoxGeometry(0.1, 0.03, 0.05)), k.lookOf('tuna').colour, 1]],
      crab: () => [[hCrab(), k.lookOf('crab').colour, 0.6], [hCrab(), C.crabRed, 0.4]],
      cucumber: () => [[hCuc(), C.cucSkin, 0.6], [hCuc(), 0x7fbf4a, 0.4]],
      avocado: () => [[kept('hAvo', () => new THREE.CylinderGeometry(0.045, 0.045, 0.014, 12, 1, false, 0, PI)), C.avoFlesh, 1]],
      creamCheese: () => [[kept('hCheese', () => new THREE.BoxGeometry(0.07, 0.03, 0.034)), k.lookOf('creamCheese').colour, 1]],
      tofu: () => [[kept('hTofu', () => new THREE.BoxGeometry(0.04, 0.04, 0.04)), k.lookOf('tofu').colour, 1]],
      wakame: () => [[kept('hWakame', () => new THREE.TorusGeometry(0.03, 0.007, 4, 10, 2.6).scale(1, 1, 0.35)), k.lookOf('wakame').colour, 1]],
      mushrooms: () => [[kept('hEnoki', () => enokiGeo()), k.lookOf('mushrooms').colour, 1]],
    };
    function enokiGeo() {
      const a = new THREE.CylinderGeometry(0.0045, 0.0045, 0.11, 5).rotateZ(PI / 2);
      const b = new THREE.SphereGeometry(0.009, 6, 4).translate(-0.058, 0, 0);
      return mergeGeos([a, b]);
    }
    /** Merge plain geometries (positions and normals) into one. */
    function mergeGeos(list) {
      const pos = [], nor = [];
      list.forEach(g => {
        const n = g.index ? g.toNonIndexed() : g;
        pos.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array);
      });
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      return out;
    }
    /** A filling laid along the sheet as a strip (the sheet form, and how a filling looks on its own): along x, len
     *  long, centred, standing on y = 0. */
    function strip(id, colour, len, seed) {
      const g = new THREE.Group();
      const box = (w, h, d, col, x, y, z, thin) => { const m = (thin ? k.inkThin : k.ink)(new THREE.BoxGeometry(w, h, d), k.toon(col)); m.position.set(x || 0, y, z || 0); g.add(m); return m; };
      if (id === 'salmon') {
        box(len, 0.03, 0.05, colour, 0, 0.015, 0);
        const pts = [];
        for (let i = 0; i < 7; i++) pts.push({ p: [-len / 2 + (i + 0.5) * len / 7, 0.0305, 0], nrm: [0, 1, 0], r: 0.6, t: 0.5 });
        g.add(k.scatter(kept('fat', () => new THREE.BoxGeometry(0.008, 0.002, 0.058)), k.toon(C.salmonFat), pts, { outline: false }));
        return { g, h: 0.031 };
      }
      if (id === 'tuna') {
        box(len, 0.034, 0.048, colour, 0, 0.017, 0);
        box(len * 0.9, 0.002, 0.01, C.tunaSheen, 0, 0.0345, -0.01, true);
        return { g, h: 0.035 };
      }
      if (id === 'crab') {
        [-0.017, 0.017].forEach(z => {
          const c = k.ink(new THREE.CylinderGeometry(0.016, 0.016, len, 12).rotateZ(PI / 2), k.toon(colour)); c.position.set(0, 0.016, z); g.add(c);
          const top = k.inkThin(new THREE.CylinderGeometry(0.0165, 0.0165, len, 12, 1, true, PI / 2 - 0.6, 1.2).rotateZ(PI / 2), k.toon(C.crabRed)); top.position.set(0, 0.0162, z); g.add(top);
        });
        return { g, h: 0.033 };
      }
      if (id === 'cucumber') {
        [-0.013, 0.013].forEach(z => { box(len, 0.02, 0.02, C.cucSkin, 0, 0.01, z); box(len * 0.98, 0.002, 0.011, C.cucFlesh, 0, 0.0205, z, true); });
        return { g, h: 0.022 };
      }
      if (id === 'avocado') {
        const n = Math.max(3, Math.round(len / 0.08)), pts = [];
        for (let i = 0; i < n; i++) pts.push({ p: [-len / 2 + (i + 0.5) * len / n, 0.008 + (i % 2) * 0.004, 0.012], nrm: [0, 1, 0], r: PI / 2 + 0.25, t: 0.5 });
        g.add(k.scatter(kept('avoSlice', () => new THREE.CylinderGeometry(0.048, 0.048, 0.016, 14, 1, false, 0, PI)), k.toon(colour), pts, { outline: 'thin' }));
        g.add(k.scatter(kept('avoSliceSkin', () => new THREE.CylinderGeometry(0.05, 0.05, 0.012, 14, 1, true, 0, PI)), k.toon(C.avoSkin), pts, { outline: false }));
        return { g, h: 0.03 };
      }
      if (id === 'creamCheese') {
        box(len + 0.006, 0.02, 0.042, C.cheeseEdge, 0, 0.01, 0.003);
        box(len, 0.026, 0.032, colour, 0, 0.013, -0.002);
        return { g, h: 0.026 };
      }
      return { g, h: 0 };
    }
    /** A filling in the roll, by the roll's form (o.roll), or on its own (a strip). */
    function filling(id, part, o) {
      const L = k.lookFor(part), ctx = o && o.roll, g = new THREE.Group();
      g.name = id;
      const colour = L.colour !== undefined ? L.colour : 0xcccccc;
      if (!ctx) { const s = strip(id, colour, 0.36, id); s.g.name = id; return s; }
      const i = Math.max(0, ctx.fillings.indexOf(part.ing)), n = ctx.fillings.length;
      if (ctx.form === 'sheet') {
        const S = ctx.sheet, s = strip(id, colour, S.band.len, id + ':' + i);
        s.g.position.set(S.band.x, S.surface, S.laneOf(i));
        g.add(s.g);
        return { g, h: s.h };
      }
      if (ctx.form === 'log' || ctx.form === 'pieces') {
        const faces = ctx.form === 'log' ? ctx.log.faces : ctx.pieces.faces, ri = ctx.kind === 'inside' ? 0.48 : 0.64;
        const [x, z, s] = (SLOTS[Math.min(n, 6)] || SLOTS[6])[Math.min(i, 5)];
        PATCH[id]().forEach(([geo, mat, lift, subs]) => g.add(onFaces(geo, mat, faces, [x * ri, z * ri], s * ri * 1.3, 0.003 + i * 0.0007 + lift * 0.0004, subs)));
        return { g, h: 0 };
      }
      // cone: a stick of it poking out of the rice at the mouth, leaning out.
      const cg = ctx.cone, a = (i / Math.max(1, n)) * PI * 2 + 0.4, rr = cg.r * 0.42;
      const s = strip(id, colour, 0.1, id + ':cone');
      s.g.rotation.set(0, -a, PI / 2 - 0.35);
      s.g.position.set(Math.cos(a) * rr, cg.h - 0.01, Math.sin(a) * rr);
      g.add(s.g);
      return { g, h: 0 };
    }

    /* ── shapes: one builder per look.shape ── */
    const shapes = {
      /** The bamboo mat (the roll's vessel) and, by the roll's form, what it stands on: flat on the prep table, curled
       *  round the log on the mat (string bands by stage), the cutting board, the geta at the counter, the boat. */
      rollMat(part, o) {
        const ctx = o && o.roll, base = ctx ? ctx.base : 'mat';
        if (base === 'board') return cuttingBoard(ctx);
        if (base === 'geta') return geta(ctx);
        if (base === 'boat') return boat(ctx);
        return bambooMat(ctx);
      },
      nori: (part, o) => nori(part, o),
      noriInside: (part, o) => nori(part, o),
      noriCone: (part, o) => nori(part, o),
      rice: (part, o) => rice(part, o),
      noRice(part, o) {
        // "Rice: none": nothing on the sheet but a few glints of the bare nori's sheen (it reads bare).
        const g = new THREE.Group(), ctx = o && o.roll;
        g.name = 'rice';
        if (!ctx || ctx.form !== 'sheet') return { g, h: 0 };
        const S = ctx.sheet, pts = [];
        const R = k.rand('bare');
        for (let i = 0; i < 6; i++) pts.push({ p: [(R() - 0.5) * S.W * 0.8, S.noriY + 0.0065, (R() - 0.5) * S.D * 0.7], nrm: [0, 1, 0], r: R() * PI, t: 0.5 });
        g.add(k.scatter(kept('glint', () => new THREE.BoxGeometry(0.08, 0.001, 0.006)), k.toon(0x48664f), pts, { outline: false }));
        return { g, h: 0 };
      },
      salmon: (p, o) => filling('salmon', p, o),
      tuna: (p, o) => filling('tuna', p, o),
      crab: (p, o) => filling('crab', p, o),
      cucumber: (p, o) => filling('cucumber', p, o),
      avocado: (p, o) => filling('avocado', p, o),
      creamCheese: (p, o) => filling('creamCheese', p, o),
      /** Sesame seeds: over the rice on the sheet, on the log's outside, on the cut faces, on the hand roll's rice. */
      sesame(part, o) {
        const L = k.lookFor(part), ctx = o && o.roll, g = new THREE.Group(), mat = k.toon(L.colour !== undefined ? L.colour : 0xe9d9a6);
        g.name = 'sesame';
        const n = k.thin(70, 30), seed = 'sesame:' + (part.n || 0);
        if (!ctx) { g.add(k.scatter(UNIT.seed(), mat, k.sample({ kind: 'disc', r: 0.14, y: 0.004 }, n, seed), { outline: false })); return { g, h: 0.006 }; }
        if (ctx.form === 'sheet') {
          const S = ctx.sheet, b = S.rice, R = k.rand(seed), pts = [];
          for (let i = 0; i < n; i++) pts.push({ p: [b.x0 + 0.01 + R() * (b.x1 - b.x0 - 0.02), S.surface + 0.003, b.z0 + 0.01 + R() * (b.z1 - b.z0 - 0.02)], nrm: [0, 1, 0], r: R() * PI * 2, t: 0.5 });
          g.add(k.scatter(UNIT.seed(), mat, pts, { outline: false }));
        } else if (ctx.form === 'log' || ctx.form === 'pieces') {
          // Rolled in where they were sprinkled (food audit 2026-11-11: they jumped to the outside of the roll): on a
          // regular roll over the rice, so in the rice ring of every cut face; on an inside-out roll over the nori
          // side (the sheet was flipped before the fillings), so inside the nori ring among the fillings.
          const faces = ctx.form === 'log' ? ctx.log.faces : ctx.pieces.faces;
          const inv = ctx.form === 'log' ? V(1 / ctx.log.R, 1, 1 / ctx.log.R) : V(1 / (ctx.pieces.r * ctx.pieces.sx), 1, 1 / (ctx.pieces.r * ctx.pieces.sz));
          const ms = facePoints(faces, k.thin(9, 5), ctx.kind === 'inside' ? 0.08 : 0.6, ctx.kind === 'inside' ? 0.42 : 0.86, seed, ctx.kind === 'inside' ? 0.0095 : 0.004);
          g.add(k.inkInstanced(UNIT.seed(), mat, ms.map(m => m.scale(inv)), { outline: false }));
        } else {
          const cg = ctx.cone, pts = k.sample({ kind: 'dome', r: cg.r * 0.85, h: 0.03, y: cg.h - 0.012 }, k.thin(24, 12), seed);
          g.add(k.scatter(UNIT.seed(), mat, pts, { outline: false }));
        }
        return { g, h: 0.004 };
      },
      /** A squeeze-bottle sauce: the kit's glossy bead, laid along the band, the log or the row of pieces. */
      sauce(part, o) {
        const ctx = o && o.roll, idx = ctx ? Math.max(0, ctx.sauces.indexOf(part.ing)) : 0;
        if (ctx && (ctx.form === 'log' || ctx.form === 'pieces')) {
          // Rolled in with the fillings it was squirted over (food audit 2026-11-11: it jumped from the band to the
          // outside of the log and then hung in arcs over the pieces): a swirl of it in every cut face, each sauce
          // its own arc, over the fillings.
          const L = k.lookFor(part), g = new THREE.Group(), ri = ctx.kind === 'inside' ? 0.48 : 0.64;
          g.name = 'sauce';
          const arc = kept('sauceArc' + idx, () => flat(new THREE.RingGeometry(0.5, 0.74, k.seg(18), 1, 0.4 + idx * PI, 2.1)));
          g.add(onFaces(arc, k.toon(L.colour !== undefined ? L.colour : 0x4a2414), ctx.form === 'log' ? ctx.log.faces : ctx.pieces.faces, null, ri, 0.0085 + idx * 0.0005, null, 'thin'));
          return { g, h: 0 };
        }
        const b = k.bead(part, o), S = b.g.userData.sauce;
        b.g.name = 'sauce';
        S.bead.rotation.y = 0;
        const fit = (len, wid) => { S.bead.scale.x = len / 0.53; S.bead.scale.z = wid / 0.38; };
        const off = idx * 0.004;
        if (!ctx) { fit(0.5, 0.14); return b; }
        if (ctx.form === 'sheet') {
          // Over the band of fillings; two sauces side by side, one over each half of the band (the second used to
          // cover the first).
          const B = ctx.sheet, two = ctx.sauces.length > 1, bw = Math.max(0.1, B.bandW);
          fit(B.band.len * 0.95, two ? Math.min(0.1, bw * 0.46) : Math.min(0.12, bw * 0.8));
          b.g.position.set(B.band.x, B.bandTop - 0.012 + off, B.bandMid + (two ? (idx ? 1 : -1) * bw * 0.24 : 0));
        } else { const cg = ctx.cone; fit(cg.r * 1.4, cg.r * 1.1); b.g.position.set(0, cg.h + 0.012 + off, 0); b.g.rotation.y = idx * 1.4; }
        return b;
      },
      /** The pieces pick: nothing of its own in a roll (the count is the roll's); on its own, a short row of rounds. */
      rollCut(part, o) {
        const g = new THREE.Group(), ctx = o && o.roll;
        g.name = 'cut';
        if (ctx) return { g, h: 0 };
        const N = k.lookFor(part).pieces || 8, list = [];
        for (let i = 0; i < N; i++) list.push(mat4([(i - (N - 1) / 2) * 0.07, 0, 0], 0, [0.03, 0.04, 0.03]));
        g.add(k.inkInstanced(UNIT.drum(), k.toon(C.nori), list, { outline: 'thin' }));
        g.add(k.inkInstanced(UNIT.disc(0.85), k.toon(0xfbf8f0), list.map(m => m.clone().multiply(mat4([0, 1.002, 0], 0, 1))), { outline: false }));
        return { g, h: 0.04 };
      },
      misoBowl: () => { const b = soupBowl(); return { g: b.g, h: b.floor }; },
      misoBroth(part) {
        const L = k.lookFor(part), b = soupBowl(), f = k.fill(b.inner, 0.85, L.colour !== undefined ? L.colour : 0xe0b86a, { seg: 24 });
        b.g.add(f.g);
        return { g: b.g, h: f.h };
      },
      tofu: (p, o) => floater('tofu', p, o),
      wakame: (p, o) => floater('wakame', p, o),
      enoki: (p, o) => floater('mushrooms', p, o),
    };

    /** The nori, by form: flat (a sheet, or a half sheet for a hand roll), the log's skin and the ring in each end,
     *  the ring round every piece (inside-out: the thin ring inside), the cone. On its own: a sheet on a small tray. */
    function nori(part, o) {
      const L = k.lookFor(part), ctx = o && o.roll, g = new THREE.Group();
      g.name = 'nori';
      const sheetMesh = (w, d, col) => {
        const s = new THREE.Group(), m = k.ink(new THREE.BoxGeometry(w, 0.006, d), k.toon(col));
        m.position.y = 0.003;
        s.add(m);
        const R = k.rand('ridges:' + w), pts = [];
        for (let i = 0; i < 5; i++) pts.push({ p: [0, 0.0062, -d / 2 + (i + 0.5 + (R() - 0.5) * 0.4) * d / 5], nrm: [0, 1, 0], r: 0, t: 0.5 });
        s.add(k.scatter(kept('ridge' + w, () => new THREE.BoxGeometry(w * 0.96, 0.0005, 0.006)), k.toon(k.mix(col, 0xffffff, 0.08)), pts, { outline: false }));
        return s;
      };
      if (!ctx) {
        const cone = L.shape === 'noriCone', t = smallTray(cone ? 0.36 : 0.5, 0.42);
        g.add(t.g);
        const s = sheetMesh(cone ? 0.26 : 0.4, 0.34, L.colour !== undefined ? L.colour : C.nori);
        s.position.y = t.h;
        g.add(s);
        if (L.shape === 'noriInside') {
          // Inside-out: a grain-dotted rice corner turned up at the sheet's edge says "the rice goes outside".
          const c = k.ink(new THREE.BoxGeometry(0.12, 0.012, 0.08), k.toon(0xfbf8f0)); c.position.set(0.12, t.h + 0.012, 0.11); g.add(c);
        }
        return { g, h: t.h + 0.006 };
      }
      const col = ctx.nori;
      if (ctx.form === 'sheet') {
        const S = ctx.sheet, s = sheetMesh(S.W, S.D, col);
        s.position.y = S.noriY;
        if (ctx.soggy) { s.scale.y = 0.6; s.rotation.z = 0.02; }
        g.add(s);
        return { g, h: 0.006 };
      }
      if (ctx.form === 'log') {
        const lg = ctx.log;
        if (ctx.kind === 'inside') { g.add(onFaces(UNIT.ring(0.47, 0.56), k.toon(col), lg.faces, null, 1, 0.0015)); return { g, h: 0 }; }
        const skin = k.ink(new THREE.CylinderGeometry(lg.R, lg.R, lg.L, k.seg(28), 1, true).rotateZ(PI / 2), k.toon(col));
        g.add(skin);
        g.add(onFaces(UNIT.ring(0.88, 1.0), k.toon(k.mix(col, 0x000000, 0.25)), lg.faces, null, 1, 0.0015));
        if (!ctx.hasRice) g.add(onFaces(UNIT.disc(0.9), k.toon(k.mix(col, 0xffffff, 0.06)), lg.faces, null, 1, 0.0008));
        // Loose: the seam stands open along the back (a pale line of rice and the nori's edge lifting).
        if (ctx.st.seam && !ctx.soggy) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(lg.L * 0.96, 0.006, 0.012), k.toon(ctx.riceColour || 0xfbf8f0));
          line.position.set(0, Math.cos(0.75) * lg.R, -Math.sin(0.75) * lg.R);
          line.rotation.x = -0.75;
          const flap = k.inkThin(new THREE.BoxGeometry(lg.L * 0.94, 0.004, 0.05), k.toon(col));
          flap.position.set(0, Math.cos(0.5) * lg.R + 0.012, -Math.sin(0.5) * lg.R - 0.012);
          flap.rotation.x = 0.35;
          g.add(line, flap);
        }
        if (ctx.st.shine) {
          const sh = new THREE.Mesh(new THREE.BoxGeometry(lg.L * 0.86, 0.002, 0.012), k.SHINE);
          sh.position.set(0, lg.R * 0.97, lg.R * 0.24);
          sh.rotation.x = 0.25;
          g.add(sh);
        }
        return { g, h: 0 };
      }
      if (ctx.form === 'pieces') {
        const p = ctx.pieces;
        if (ctx.kind === 'inside') { g.add(onFaces(UNIT.ring(0.47, 0.56), k.toon(col), p.faces, null, 1, 0.0015)); return { g, h: 0 }; }
        g.add(k.inkInstanced(UNIT.wall(), k.toon(col), p.walls, { outline: 'thin' }));
        g.add(onFaces(UNIT.ring(0.86, 1.0), k.toon(k.mix(col, 0x000000, 0.2)), p.faces, null, 1, 0.0015));
        if (!ctx.hasRice) g.add(onFaces(UNIT.disc(0.88), k.toon(k.mix(col, 0xffffff, 0.06)), p.faces, null, 1, 0.0008));
        if (ctx.st.seam) g.add(onFaces(kept('gap', () => new THREE.BoxGeometry(0.42, 0.001, 0.07).translate(0.72, 0, 0)), k.toon(0x0d1510), p.faces, null, 1, 0.0025));
        return { g, h: 0 };
      }
      // the cone: a nori cone, open at the top (seen inside from above), its seam a darker line down one side.
      const cg = ctx.cone, prof = [];
      for (let i = 0; i <= 6; i++) prof.push([cg.r * i / 6, cg.h * i / 6]);
      g.add(k.ink(k.lathe(prof, k.seg(24)), k.toon(col, { side: THREE.DoubleSide })));
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.004, cg.h * 0.95, 0.004), k.toon(k.mix(col, 0x000000, 0.4)));
      seam.position.set(cg.r * 0.5 + 0.002, cg.h * 0.5, 0);
      seam.rotation.z = -Math.atan2(cg.r, cg.h);
      g.add(seam);
      // The cone's own stage marks (they go with it to the counter; a band round it did not): Loose, the nori's
      // edge lifting off the seam; Tight, a gloss down the side.
      if (ctx.st.seam && !ctx.soggy) {
        const flap = k.inkThin(new THREE.BoxGeometry(0.004, cg.h * 0.62, 0.05), k.toon(col));
        flap.position.set(cg.r * 0.55 + 0.012, cg.h * 0.56, 0.018);
        flap.rotation.set(0, 0.45, -Math.atan2(cg.r, cg.h));
        g.add(flap);
      }
      if (ctx.st.shine) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.003, cg.h * 0.7, 0.014), k.SHINE);
        sh.position.set(-(cg.r * 0.55 + 0.002), cg.h * 0.55, 0);
        sh.rotation.z = Math.atan2(cg.r, cg.h);
        g.add(sh);
      }
      return { g, h: cg.h };
    }
    /** The rice, by form: pressed over the sheet (a slab with grains as bumps), the disc in every cut face (inside-out:
     *  the outside of the log and of every piece), a mound in the hand roll's mouth. On its own: a bowl of it. */
    function rice(part, o) {
      const L = k.lookFor(part), ctx = o && o.roll, g = new THREE.Group(), col = L.colour !== undefined ? L.colour : 0xfbf8f0;
      g.name = 'rice';
      const body = k.toon(k.mix(col, 0xc9bda5, 0.18)), grain = k.toon(col);
      if (!ctx) {
        const b = waveBowl(0.14, 0.11);
        g.add(b.g);
        const m = k.ink(new THREE.SphereGeometry(0.12, k.seg(20), 10, 0, PI * 2, 0, PI / 2).scale(1, 0.55, 1), body);
        m.position.y = b.h * 0.55;
        g.add(m);
        g.add(k.scatter(UNIT.grain(), grain, k.sample({ kind: 'dome', r: 0.115, h: 0.064, y: b.h * 0.55 }, k.thin(70, 30), 'riceBowl:' + col), { outline: false, tilt: 1.2 }));
        g.scale.setScalar(1.4);                        // drawn up on the line, like the filling bowls
        return { g, h: (b.h * 0.55 + 0.07) * 1.4 };
      }
      if (ctx.form === 'sheet') {
        const S = ctx.sheet, R = S.rice, w = R.x1 - R.x0, d = R.z1 - R.z0;
        const slab = k.ink(new THREE.BoxGeometry(w, 0.022, d), body);
        slab.position.set((R.x0 + R.x1) / 2, S.riceY + 0.011, (R.z0 + R.z1) / 2);
        g.add(slab);
        const n = k.thin(Math.round(w * d * 1500), 90), rnd = k.rand('grains:' + w);
        let pts = [];
        for (let i = 0; i < n; i++) pts.push({ p: [R.x0 + 0.008 + rnd() * (w - 0.016), S.riceY + 0.022, R.z0 + 0.008 + rnd() * (d - 0.016)], nrm: [0, 1, 0], r: rnd() * PI * 2, t: rnd() });
        // Flipped (inside-out), the nori lies on the rice: grains only where the rice shows round its edge (they
        // poked up through the nori, food audit 2026-11-11).
        if (S.inside) pts = pts.filter(q => Math.abs(q.p[0]) > S.W / 2 + 0.004 || Math.abs(q.p[2]) > S.D / 2 + 0.004);
        if (pts.length) g.add(k.scatter(UNIT.grain(), grain, pts, { outline: false, tilt: 0.8 }));
        return { g, h: 0.028 };
      }
      if (ctx.form === 'log' || ctx.form === 'pieces') {
        const faces = ctx.form === 'log' ? ctx.log.faces : ctx.pieces.faces, inside = ctx.kind === 'inside';
        g.add(onFaces(UNIT.disc(inside ? 1.0 : 0.88), body, faces, null, 1, 0.001));
        const ms = facePoints(faces, k.thin(inside ? 14 : 10, 5), inside ? 0.58 : 0.6, inside ? 0.96 : 0.84, 'faceGrains', 0.0025);
        const inv = ctx.form === 'log' ? V(1 / ctx.log.R, 1, 1 / ctx.log.R) : V(1 / (ctx.pieces.r * ctx.pieces.sx), 1, 1 / (ctx.pieces.r * ctx.pieces.sz));
        g.add(k.inkInstanced(UNIT.grain(), grain, ms.map(m => m.scale(inv)), { outline: false }));
        if (inside && ctx.form === 'log') {
          const lg = ctx.log, skin = k.ink(new THREE.CylinderGeometry(lg.R, lg.R, lg.L, k.seg(28), 1, true).rotateZ(PI / 2), body);
          g.add(skin);
          g.add(k.scatter(UNIT.grain(), grain, skinPoints(lg.L, lg.R + 0.002, k.thin(160, 70), 'skinGrains', PI * 1.6), { outline: false, lie: true, tilt: 0.6 }));
        }
        if (inside && ctx.form === 'pieces') g.add(k.inkInstanced(UNIT.wall(), body, ctx.pieces.walls, { outline: 'thin' }));
        // Squashed: rice squeezed out of both ends of the log.
        if (ctx.st.blobs && ctx.form === 'log') {
          const lg = ctx.log, R = k.rand('blobs'), pts = [];
          [-1, 1].forEach(sd => { for (let i = 0; i < 4; i++) pts.push({ p: [sd * (lg.L / 2 + 0.012 + R() * 0.02), (R() - 0.5) * lg.R * 0.8, (R() - 0.5) * lg.R * 1.2], nrm: [0, 1, 0], r: R() * 6, t: R(), s: 0.8 + R() * 0.5 }); });
          g.add(k.scatter(UNIT.blob(), body, pts, { outline: 'thin' }));
        }
        return { g, h: 0 };
      }
      const cg = ctx.cone, m = k.ink(new THREE.SphereGeometry(cg.r * 0.9, k.seg(18), 8, 0, PI * 2, 0, PI / 2).scale(1, 0.45, 1), body);
      m.position.y = cg.h - 0.03;
      g.add(m);
      g.add(k.scatter(UNIT.grain(), grain, k.sample({ kind: 'dome', r: cg.r * 0.85, h: cg.r * 0.4, y: cg.h - 0.03 }, k.thin(30, 14), 'coneRice'), { outline: false }));
      if (ctx.st.blobs) {
        const pts = k.sample({ kind: 'ring', r0: cg.r * 0.8, r1: cg.r * 1.05, y: cg.h - 0.01 }, 5, 'coneBlobs').map(p => Object.assign(p, { s: 0.9 }));
        g.add(k.scatter(UNIT.blob(), body, pts, { outline: 'thin' }));
      }
      return { g, h: 0 };
    }

    /* ── the bases ── */
    /** The bamboo mat: slats along the roll's axis tied with strings; flat, or curled round the log (ctx.curl). */
    function bambooMat(ctx) {
      const g = new THREE.Group(), N = 28, D = MAT.D, W = MAT.W, r = MAT.r;
      g.name = 'mat';
      const cu = ctx && ctx.curl;
      const at = s => {
        if (!cu || s <= cu.flatLen) return { z: -D / 2 + s, y: r, nz: 0, ny: 1 };
        const a = (s - cu.flatLen) / cu.rho;
        return { z: cu.zl + cu.rho * Math.sin(a), y: cu.yc - cu.rho * Math.cos(a), nz: Math.sin(a), ny: -Math.cos(a) };
      };
      const slat = kept('slat', () => new THREE.CylinderGeometry(r, r, W, 8).rotateZ(PI / 2));
      const even = [], odd = [];
      for (let i = 0; i < N; i++) { const q = at((i + 0.5) * D / N); (i % 2 ? odd : even).push({ p: [0, q.y, q.z], nrm: [0, 1, 0], r: 0, t: 0.5 }); }
      g.add(k.scatter(slat, k.toon(C.mat), even, { outline: 'thin', lie: false }), k.scatter(slat, k.toon(C.matAlt), odd, { outline: 'thin', lie: false }));
      // The strings: four along the depth, over the slats.
      [-0.3, -0.1, 0.1, 0.3].forEach(x => {
        const pts = [];
        for (let i = 0; i <= 32; i++) { const q = at(i * D / 32); pts.push(V(x, q.y + q.ny * (r + 0.002), q.z + q.nz * (r + 0.002))); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0035, 4, false), k.toon(C.string)));
      });
      // String bands round the rolled mat: one at Firm, two at Tight (the mark the cook view is read by).
      if (ctx && ctx.bands) {
        const xs = ctx.bands === 1 ? [0] : [-0.17, 0.17];
        xs.forEach(x => {
          const t = k.ink(new THREE.TorusGeometry(ctx.bandR, 0.008, 6, k.seg(28)).rotateY(PI / 2), k.toon(C.band));
          t.position.set(x + (ctx.bandX || 0), ctx.bandY, ctx.bandZ);
          if (ctx.bandScale) t.scale.set(1, ctx.bandScale[0], ctx.bandScale[1]);
          g.add(t);
        });
      }
      return { g, h: r * 2 };
    }
    /** How long the row of pieces will be (the board and the boat are sized for it before the slice, so they do
     *  not grow when the log is cut). */
    function rowLen(ctx) {
      if (!ctx || !ctx.N || !ctx.st) return 0;
      const f = ctx.st.f * (ctx.hasRice ? 1 : 0.76), rows = ctx.N > 8 ? 2 : 1, per = Math.ceil(ctx.N / rows);
      return per * (2 * PIECE.r * f * ctx.st.sy + PIECE.gap) - PIECE.gap;
    }
    function cuttingBoard(ctx) {
      const g = new THREE.Group(), W = Math.max(1.0, LOG.L + 0.24, (ctx && ctx.pieces ? ctx.pieces.len : rowLen(ctx)) + 0.24), D = 0.5, H = 0.045;
      g.name = 'board';
      const b = k.ink(new THREE.BoxGeometry(W, H, D), k.toon(C.board));
      b.position.y = H / 2;
      g.add(b);
      const R = k.rand('grain'), pts = [];
      for (let i = 0; i < 9; i++) pts.push({ p: [(R() - 0.5) * W * 0.7, H + 0.0006, (R() - 0.5) * D * 0.85], nrm: [0, 1, 0], r: (R() - 0.5) * 0.06, t: 0.5, s: 0.6 + R() * 0.8 });
      g.add(k.scatter(kept('boardGrain', () => new THREE.BoxGeometry(0.3, 0.001, 0.004)), k.toon(C.boardGrain), pts, { outline: false }));
      const edge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.002, 0.02), k.toon(C.boardEdge));
      edge.position.set(0, H + 0.001, D / 2 - 0.014);
      g.add(edge);
      return { g, h: H };
    }
    /** The geta: a low wooden serving board, a little longer than what it holds, its two feet showing at the ends. */
    function geta(ctx) {
      const g = new THREE.Group();
      g.name = 'geta';
      const cone = ctx && ctx.form === 'cone';
      const len = cone ? 0.66 : ctx && ctx.pieces ? ctx.pieces.len + 0.16 : LOG.L + 0.14;
      const wid = cone ? 0.32 : ctx && ctx.pieces ? Math.max(0.22, ctx.pieces.wid + 0.08) : 0.24, H = 0.03, foot = 0.022;
      const top = k.ink(new THREE.BoxGeometry(len, H, wid), k.toon(C.getaTop));
      top.position.y = foot + H / 2;
      g.add(top);
      [-1, 1].forEach(sd => { const f = k.ink(new THREE.BoxGeometry(0.05, foot, wid * 0.96), k.toon(C.getaFoot)); f.position.set(sd * (len / 2 - 0.07), foot / 2, 0); g.add(f); });
      const rim = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.001, 0.006), k.toon(C.geta));
      [-1, 1].forEach(sd => { const m = rim.clone(); m.position.set(0, foot + H + 0.0005, sd * (wid / 2 - 0.02)); g.add(m); });
      return { g, h: foot + H };
    }
    /** The Sushi Boat: a little wooden boat, raised bow and stern, the pieces along its deck. */
    function boat(ctx) {
      const g = new THREE.Group(), p = ctx && ctx.pieces, len = (p ? p.len : rowLen(ctx) || 0.9) + 0.42, beam = (p ? p.wid : 0.4) + 0.14, H = 0.07;
      g.name = 'boat';
      const hullShape = (l, b) => {
        const s = new THREE.Shape();
        s.moveTo(-l / 2, 0);
        s.bezierCurveTo(-l * 0.32, b * 0.62, l * 0.32, b * 0.62, l / 2, 0);
        s.bezierCurveTo(l * 0.32, -b * 0.62, -l * 0.32, -b * 0.62, -l / 2, 0);
        return s;
      };
      const hull = kept('hull' + len.toFixed(3), () => { const geo = new THREE.ExtrudeGeometry(hullShape(len, beam), { depth: H, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 18 }); geo.rotateX(-PI / 2); geo.computeVertexNormals(); return geo; });
      const deck = kept('deck' + len.toFixed(3), () => { const geo = new THREE.ShapeGeometry(hullShape(len * 0.9, beam * 0.8), 18); geo.rotateX(-PI / 2); return geo; });
      g.add(k.ink(hull, k.toon(C.geta)));
      const d = new THREE.Mesh(deck, k.toon(C.getaTop));
      d.position.y = H + 0.0125;
      g.add(d);
      // Planks across the deck, and the raised bow and stern.
      // Each plank line as long as the deck is wide where it lies (they ran 0.9 long, off both sides of the hull).
      const plankMat = k.toon(C.geta);
      for (let i = 1; i < 8; i++) {
        const x = -len * 0.4 + i * len * 0.8 / 8, u = x / (len * 0.45), w = beam * 0.8 * 0.92 * Math.max(0.05, 1 - u * u) - 0.02;
        if (w <= 0.01) continue;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.001, w), plankMat);
        pl.position.set(x, H + 0.013, 0);
        g.add(pl);
      }
      [-1, 1].forEach(sd => {
        const prow = k.ink(new THREE.ConeGeometry(0.05, 0.14, 8).rotateZ(-sd * 1.0), k.toon(C.geta));
        prow.position.set(sd * (len / 2 - 0.02), H + 0.04, 0);
        g.add(prow);
      });
      return { g, h: H + 0.0125 };
    }

    /* ── the roll: every form from the same parts ── */
    function sushiRoll(made, o) {
      o = o || {};
      const seq = k.sequence(made, o), parts = partsOf(seq), ctx = rollCtx(made, o, parts);
      ctx.fillings = parts.fillings.map(p => p.ing);
      ctx.sauces = parts.sauces.map(p => p.ing);
      ctx.unflipped = !!o.unflipped;
      // Rolling up on the mat (o.wrapT 0..1, the roll-up flourish): the log grows from the sheet's near edge as the
      // mat curls over it, and what is not rolled yet still lies flat behind it.
      const rolling = typeof o.wrapT === 'number' && o.wrapT < 1 && ctx.base === 'mat' && (ctx.form === 'log' || ctx.form === 'cone');
      const wT = rolling ? clamp(o.wrapT, 0, 1) : 1, wE = rolling ? k.ease(wT) : 1;
      if (rolling && ctx.form === 'log') ctx.grow = 0.45 + 0.55 * wE;
      if (typeof o.layT === 'number' && o.where !== 'counter') ctx.layT = o.layT;
      const g = new THREE.Group();
      let holder = g, top = 0;
      // The geometry of the form, and of the mat curled round it.
      if (ctx.form === 'sheet') ctx.sheet = sheetGeo(ctx, parts);
      if (ctx.form === 'log') ctx.log = logGeo(ctx);
      if (ctx.form === 'pieces') ctx.pieces = piecesGeo(ctx, ctx.base === 'geta' ? 0.62 : ctx.base === 'boat' ? 0.45 : 0.3);
      if (ctx.form === 'cone') {
        const f = ctx.st.f;
        ctx.cone = { r: CONE.r * f, h: CONE.h };
      }
      if (ctx.base === 'mat' && ctx.form === 'log') {
        const lg = ctx.log, rho = lg.R * Math.max(lg.sy, lg.sz) + MAT.r, wrap = ctx.st.wrap * (rolling ? Math.max(0.06, wE) : 1);
        const flatLen = wrap ? Math.max(0.12, MAT.D - wrap * rho) : MAT.D / 2 + 0.02;
        ctx.curl = wrap ? { flatLen, rho, zl: -MAT.D / 2 + flatLen, yc: MAT.r + rho } : null;
        ctx.logAt = V(0, (wrap ? MAT.r + rho : 2 * MAT.r + lg.R * lg.sy), wrap ? -MAT.D / 2 + flatLen : 0.02);
        ctx.bands = ctx.soggy || rolling ? 0 : ctx.st.bands;
        ctx.bandR = rho + 0.016; ctx.bandY = ctx.logAt.y; ctx.bandZ = ctx.logAt.z;
      }
      // The base: the mat (the vessel), the cutting board, the geta or the boat.
      let y0 = 0;
      if (seq.vessel) {
        const v = k.food(Object.assign({ n: 0 }, seq.vessel), Object.assign({}, o, { roll: ctx, item: made }));
        g.add(v.g);
        y0 = v.h;
      } else y0 = 0;
      const opts = Object.assign({}, o, { roll: ctx, item: made });
      const add = p => { if (!p) return null; const q = p === parts.roll && p.gross === 'soggy' ? Object.assign({}, p, { gross: undefined }) : p; const b = k.food(Object.assign({ n: 1 }, q), opts); holder.add(b.g); return b; };
      if (ctx.form === 'sheet') {
        const contents = new THREE.Group();
        contents.name = 'contents';
        g.add(contents);
        holder = contents;
        const S = ctx.sheet;
        contents.position.y = y0 - S.y0;
        if (parts.roll) add(parts.roll);
        if (parts.rice && ctx.kind) add(parts.rice);
        parts.fillings.forEach(add);
        if (parts.sesame) add(parts.sesame);
        parts.sauces.forEach(add);
        top = y0 - S.y0 + S.bandTop;
        const stack = new THREE.Group();
        stack.name = 'stack';
        stack.position.set(S.band.x, y0 - S.y0, S.band.z);
        stack.userData.h = S.bandTop;
        g.add(stack);
        g.userData.h = top;
        return { g, h: top, stack, sheet: S, contents };
      }
      if (ctx.form === 'log') {
        const lg = ctx.log, lgG = new THREE.Group();
        lgG.name = 'log';
        lgG.scale.set(1, lg.sy, lg.sz);
        lgG.position.copy(ctx.base === 'mat' ? ctx.logAt : V(0, y0 + lg.R * lg.sy, 0));
        // Turned a little, so the right-hand end (the cut face: the rice ring and the fillings) faces the viewer.
        if (ctx.base === 'mat') g.rotation.y = -0.32 * wE; else lgG.rotation.y = -0.24;
        if (rolling) unrolled(g, ctx, parts, y0, ctx.logAt.z - lg.R * lg.sz, wE);
        g.add(lgG);
        holder = lgG;
        add(parts.roll); add(parts.rice);
        parts.fillings.forEach(add);
        // The sesame and the sauces were rolled in with the fillings: they show in the cut faces, mat or no mat.
        if (parts.sesame) add(parts.sesame);
        parts.sauces.forEach(add);
        if (ctx.st.blobs && !ctx.soggy) {
          // Squashed: a dent pressed along the top.
          const dent = new THREE.Mesh(new THREE.BoxGeometry(lg.L * 0.8, 0.004, 0.02), k.toon(k.mix(ctx.nori, 0x000000, 0.55)));
          dent.position.y = lg.R + 0.001;
          lgG.add(dent);
        }
        top = lgG.position.y + lg.R * lg.sy + (parts.sauces.length ? 0.012 : 0);
        const stack = new THREE.Group();
        stack.name = 'stack';
        stack.position.copy(lgG.position);
        stack.userData.h = lg.R * lg.sy;
        g.add(stack);
        g.userData.h = top;
        return { g, h: top, log: lgG, logR: lg.R * lg.sy, logRLocal: lg.R, logL: lg.L, stack };
      }
      if (ctx.form === 'pieces') {
        const pc = new THREE.Group();
        pc.name = 'pieces';
        pc.position.y = y0;
        g.add(pc);
        holder = pc;
        add(parts.roll); add(parts.rice);
        parts.fillings.forEach(add);
        if (parts.sesame) add(parts.sesame);
        parts.sauces.forEach(add);
        top = y0 + ctx.pieces.top + (parts.sauces.length ? 0.016 : 0.004);
        const stack = new THREE.Group();
        stack.name = 'stack';
        stack.position.y = y0;
        stack.userData.h = ctx.pieces.top;
        g.add(stack);
        g.userData.h = top;
        return { g, h: top, pieces: pc, stack };
      }
      // The hand roll: the cone lying on its side, its mouth turned toward the viewer.
      const cg = ctx.cone, coneG = new THREE.Group(), lean = Math.atan2(cg.r, cg.h);
      coneG.name = 'cone';
      coneG.rotation.set(0, ctx.base === 'mat' ? -0.35 : -0.45, -PI / 2 + lean);
      // Served, the cone is drawn up (on its own it is small next to a row of pieces); squashed, it is flattened.
      const up = (ctx.base === 'geta' ? 1.4 : 1) * (rolling ? 0.3 + 0.7 * wE : 1);
      coneG.scale.set(up * (ctx.st.blobs ? 1.35 : 1), up, up * (ctx.st.blobs ? 0.62 : 1));
      coneG.position.set(-cg.h * 0.45 * up, y0 + 0.004 + (rolling ? 0.032 * (1 - wE) : 0), ctx.base === 'mat' ? 0.05 : 0);
      if (rolling) unrolled(g, ctx, parts, y0, null, wE);
      g.add(coneG);
      holder = coneG;
      add(parts.roll); add(parts.rice);
      parts.fillings.forEach(add);
      if (parts.sesame) add(parts.sesame);
      parts.sauces.forEach(add);
      g.updateMatrixWorld(true);
      const box = k.boxOf(g);
      top = box.max.y;
      const stack = new THREE.Group();
      stack.name = 'stack';
      stack.position.set(0, 0, 0);
      stack.userData.h = top;
      g.add(stack);
      g.userData.h = top;
      return { g, h: top, cone: coneG, stack };
    }

    /** What is not rolled up yet, flat on the mat (the roll-up flourish): the nori, the rice and the fillings not yet
     *  under the log, the whole sheet drawn in toward the log as it rolls (log: zEdge the log's back side; cone: the
     *  half sheet drawn in to where the cone lies). */
    function unrolled(g, ctx, parts, y0, zEdge, e) {
      const S = sheetGeo(ctx, parts), rg = new THREE.Group();
      rg.name = 'unrolled';
      const box = (w, h, d, col, x, y, z) => { const m = k.ink(new THREE.BoxGeometry(w, h, d), k.toon(col)); m.position.set(x, y, z); rg.add(m); };
      const nori = ctx.soggy ? k.mix(C.nori, C.soggy, 0.65) : C.nori, riceCol = ctx.hasRice ? k.mix(ctx.riceColour, 0xc9bda5, 0.18) : null;
      if (zEdge === null) {
        // The hand roll: the half sheet shrinks in under the growing cone.
        const s = Math.max(0.02, 1 - e);
        box(S.W, 0.006, S.D, nori, 0, S.noriY + 0.003, 0);
        if (riceCol) { const R = S.rice; box(R.x1 - R.x0, 0.022, R.z1 - R.z0, riceCol, (R.x0 + R.x1) / 2, S.riceY + 0.011, (R.z0 + R.z1) / 2); }
        rg.scale.set(s, 1, s);
        rg.position.set(-0.08 * e, y0 - S.y0, 0.05 * e);
        g.add(rg);
        return;
      }
      const z0 = -S.D / 2, far = z0 + (zEdge - z0) * e, shift = far - z0, d = zEdge - far;
      if (d < 0.01) return;
      box(S.W, 0.006, d, nori, 0, S.noriY + 0.003, far + d / 2);
      if (riceCol) {
        const R = S.rice, a = Math.max(R.z0 + shift, far), b = Math.min(R.z1 + shift, zEdge);
        if (b - a > 0.005) box(R.x1 - R.x0, 0.022, b - a, riceCol, (R.x0 + R.x1) / 2, S.riceY + 0.011, (a + b) / 2);
      }
      parts.fillings.forEach((p, i) => {
        const z = S.laneOf(i) + shift;
        if (z + 0.035 > zEdge || z - 0.035 < far) return;
        const L = k.lookFor(p), st = strip(p.ing, L.colour !== undefined ? L.colour : 0xcccccc, S.band.len, p.ing + ':' + i);
        st.g.position.set(S.band.x, S.surface, z);
        rg.add(st.g);
      });
      // The sesame and the sauces stay on what is still flat (they vanished from it for the roll-up).
      if (parts.sesame) {
        const L = k.lookFor(parts.sesame), b = S.rice, R = k.rand('sesame:1'), pts = [], n = k.thin(70, 30);
        for (let i = 0; i < n; i++) {
          const x = b.x0 + 0.01 + R() * (b.x1 - b.x0 - 0.02), z = b.z0 + 0.01 + R() * (b.z1 - b.z0 - 0.02) + shift, r = R() * PI * 2;
          if (z > far + 0.005 && z < zEdge - 0.01) pts.push({ p: [x, S.surface + 0.003, z], nrm: [0, 1, 0], r, t: 0.5 });
        }
        if (pts.length) rg.add(k.scatter(UNIT.seed(), k.toon(L.colour !== undefined ? L.colour : 0xe9d9a6), pts, { outline: false }));
      }
      if (parts.sauces.length && parts.fillings.every((p, i) => S.laneOf(i) + shift + 0.035 <= zEdge)) {
        const sc = Object.assign({}, ctx, { form: 'sheet', sheet: S });
        parts.sauces.forEach(p => { const b = shapes.sauce(Object.assign({ n: 1 }, p), { roll: sc }); b.g.position.z += shift; rg.add(b.g); });
      }
      rg.position.y = y0 - S.y0;
      g.add(rg);
    }

    /* ── the miso soup ── */
    function soupBowl() {
      const g = new THREE.Group();
      const outer = [[0, 0.012], [0.07, 0.012], [0.074, 0], [0.088, 0], [0.09, 0.016], [0.12, 0.04], [0.155, 0.085], [0.17, 0.13], [0.168, 0.136]];
      const inner = [[0.168, 0.136], [0.158, 0.13], [0.145, 0.085], [0.115, 0.048], [0.07, 0.034], [0, 0.032]];
      g.add(k.ink(k.lathe(outer, k.seg(32)), k.toon(C.lacquer)));
      g.add(new THREE.Mesh(k.lathe(inner, k.seg(32)), k.toon(C.lacquerIn)));
      const foot = new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.004, 4, k.seg(24)).rotateX(PI / 2), k.toon(C.lacquerFoot));
      foot.position.y = 0.004;
      g.add(foot);
      return { g, floor: 0.034, inner: [[0.07, 0.034], [0.115, 0.048], [0.145, 0.085], [0.158, 0.128]], rim: 0.136 };
    }
    /** A soup floater, in the bowl (o.soup) or on its own (on a little dish). */
    function floater(id, part, o) {
      const L = k.lookFor(part), sp = o && o.soup, g = new THREE.Group(), seed = id + ':' + (part.n || 0);
      g.name = id;
      const col = L.colour !== undefined ? L.colour : 0xffffff;
      const place = (n, r, y) => {
        const R = k.rand(seed), out = [];
        for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2 + R() * 0.9, rr = r * (0.35 + 0.65 * R()); out.push({ p: [Math.cos(a) * rr + (sp ? sp.dx[id] || 0 : 0), y, Math.sin(a) * rr + (sp ? sp.dz[id] || 0 : 0)], nrm: [0, 1, 0], r: R() * PI * 2, t: R() }); }
        return out;
      };
      const y = sp ? sp.y : 0.02, r = sp ? sp.r : 0.1;
      if (!sp) { const d = smallTray(0.3, 0.24); g.add(d.g); }
      if (id === 'tofu') g.add(k.scatter(kept('tofu', () => new THREE.BoxGeometry(0.034, 0.03, 0.034)), k.toon(col), place(6, r * 0.75, y + 0.006), { outline: 'thin', tilt: 0.3 }));
      else if (id === 'wakame') g.add(k.scatter(kept('wakame', () => new THREE.TorusGeometry(0.032, 0.008, 4, 12, 2.4).rotateX(PI / 2).scale(1, 0.3, 1)), k.toon(col), place(6, r * 0.8, y + 0.002), { outline: 'thin', tilt: 0.2 }));
      else {
        // Enoki: a bunch of long thin stems with small caps, fanned out from one base.
        const pts = [], R = k.rand(seed), cx = sp ? sp.dx.mushrooms : 0, cz = sp ? sp.dz.mushrooms : 0;
        for (let i = 0; i < 7; i++) pts.push({ p: [cx + 0.02, y + 0.006, cz + (i - 3) * 0.006], nrm: [0, 1, 0], r: PI + (i - 3) * 0.12 + (R() - 0.5) * 0.05, t: 0.5 });
        g.add(k.scatter(kept('enoki', () => enokiGeo().translate(0.055, 0, 0)), k.toon(col), pts, { outline: 'thin' }));
        const base = k.ink(new THREE.BoxGeometry(0.03, 0.014, 0.05), k.toon(0xd9c9a0));
        base.position.set(cx + 0.03, y + 0.006, cz);
        g.add(base);
      }
      return { g, h: sp ? 0 : 0.05 };
    }
    function misoSoup(made, o) {
      o = o || {};
      const seq = k.sequence(made, o), g = new THREE.Group(), bowl = soupBowl();
      g.add(bowl.g);
      const misoPart = seq.parts.find(p => k.lookFor(p).shape === 'misoBroth');
      const ladled = !!misoPart && ((made.auto || []).includes('ladle') || o.where === 'counter');
      const level = o.level !== undefined ? o.level : ladled ? 1 : 0;
      const colour = misoPart ? k.lookFor(misoPart).colour : 0xe0b86a;
      const brothG = new THREE.Group();
      brothG.name = 'broth';
      g.add(brothG);
      const FULL = 0.86;
      const y0 = bowl.inner[0][1], y1 = bowl.inner[bowl.inner.length - 1][1];
      const surfaceAt = t => y0 + (y1 - y0) * FULL * clamp(t, 0, 1);
      const setLevel = t => {
        while (brothG.children.length) { const c = brothG.children[0]; brothG.remove(c); k.free(c); }
        if (t <= 0.001) return;
        const f = k.fill(bowl.inner, FULL * t, colour, { seg: 28, surface: k.mix(colour, 0xffffff, 0.12) });
        brothG.add(f.g);
        // The miso clouds: a paler swirl on the surface.
        const sw = new THREE.Mesh(kept('swirl', () => flat(new THREE.RingGeometry(0.05, 0.075, k.seg(24), 1, 0.3, 2.6))), k.toon(k.mix(colour, 0xffffff, 0.14)));
        sw.position.y = f.h + 0.0025;
        sw.rotation.y = 0.6;
        brothG.add(sw);
      };
      setLevel(level);
      const y = level > 0 ? surfaceAt(level) : bowl.floor;
      // What floats, each in its own part of the bowl.
      const soup = { y, r: 0.1, dx: { tofu: -0.03, wakame: 0.025, mushrooms: -0.05 }, dz: { tofu: 0.02, wakame: -0.02, mushrooms: -0.03 } };
      seq.parts.filter(p => p !== misoPart && k.lookFor(p).shape !== 'misoBroth').forEach((p, i) => {
        const b = k.food(Object.assign({ n: i + 1 }, p), Object.assign({}, o, { soup, item: made }));
        g.add(b.g);
      });
      const stack = new THREE.Group();
      stack.name = 'stack';
      stack.userData.h = y;
      g.add(stack);
      // At the soup station the bowl stands forward of the mat's place (it is drawn up, and the mat's place is far back).
      const dz = o.where === 'counter' ? 0 : 0.2;
      if (dz) g.children.forEach(ch => { ch.position.z += dz; });
      const s = (o.contentScale || 1) * (o.where === 'counter' ? 1 : SOUP_LINE);
      if (s !== 1) g.scale.setScalar(s);
      const h = Math.max(bowl.rim, y + 0.03) * s;
      g.userData.h = h;
      return { g, h, stack, setLevel, surfaceAt, broth: colour, scale: s, z: dz };
    }

    /* ── the line: fillings wait in a seigaiha bowl and are tipped on; sesame shakes, sauces squirt (the kit) ── */
    function fillingBowl(part) {
      const L = k.lookFor(part), id = L.shape === 'enoki' ? 'mushrooms' : part.ing;
      const b = waveBowl(0.14, 0.12), g = new THREE.Group();
      g.add(b.g);
      const hp = new THREE.Group();
      hp.name = 'heap';
      const list = (HEAP[id] || HEAP[L.shape] || HEAP.tofu)();
      const n = id === 'mushrooms' ? 9 : 12, pts = mound(n, 0.095, 0.06, 'bowl:' + part.ing + ':' + (part.n || 0));
      let from = 0;
      list.forEach(([geo, col, share], i) => {
        const take = i === list.length - 1 ? pts.length - from : Math.round(pts.length * share);
        const mine = pts.slice(from, from + take);
        from += take;
        if (!mine.length) return;
        if (id === 'crab' && i === 1) { hp.add(k.scatter(kept('hCrabTop', () => new THREE.CylinderGeometry(0.0145, 0.0145, 0.11, 8, 1, true, 0, PI).rotateZ(PI / 2)), k.toon(C.crabRed), pts.slice(0, Math.round(pts.length * 0.6)), { outline: false, tilt: 0.6 })); return; }
        hp.add(k.scatter(geo, k.toon(col !== undefined ? col : 0xcccccc), mine, { outline: 'thin', tilt: 0.6 }));
      });
      hp.position.y = b.h * 0.5;
      hp.userData.part = part;
      if (part.gross) k.gross(hp, part.gross, { g: hp, h: 0.05 }, {});
      g.add(hp);
      g.scale.setScalar(1.4);
      g.userData.part = part;
      return { g, h: (b.h + 0.04) * 1.4 };
    }
    /** The kit's squeeze bottle or shaker, a size smaller (the prep camera is closer than the diner's board camera):
     *  wrapped, so the kit's squeeze (which sets the wrapper's scale) keeps it small; the tip is moved to match. */
    function smaller(b, s, key) {
      const w = new THREE.Group();
      b.g.scale.setScalar(s);
      w.add(b.g);
      const d = Object.assign({}, b.g.userData[key]);
      d.tip *= s;
      w.userData[key] = d;
      w.userData.part = b.g.userData.part;
      return { g: w, h: b.h * s };
    }
    /** The item with the waiting part on it (what world.js draws once the Add has played), drawn now, the bowl or
     *  bottle kept: so what goes on lands exactly as it will stay (food audit 2026-11-11: the tipped heap landed as
     *  a splash, vanished, and the strip appeared later; a squirted bead jumped to another place at the end). */
    function withPart(c) {
      const made = c.made, part = c.part, F = c.F, inc = c.inc;
      if (!made || !part || !inc) return null;
      const q = { ing: part.ing };
      if (part.gross) q.gross = part.gross;
      const after = Object.assign({}, made, { parts: (made.parts || []).concat([q]) });
      F.remove(inc);
      const b = c.showItem(after);
      F.add(inc);
      return b;
    }
    const groupOf = (b, test) => { let hit = null; if (b && b.g) b.g.traverse(o => { if (!hit && test(o)) hit = o; }); return hit; };
    /** A filling's (or a soup floater's) Add: the bowl comes over the item, tips, and its pieces spill out of the bowl
     *  and settle where they stay; the bowl, emptied, goes on down the line. */
    function spill(c) {
      if (k.reduced()) return k.tip(c);
      const F = c.F, inc = c.inc, part = c.part, look = part && k.lookFor(part);
      const id = look && look.shape === 'enoki' ? 'mushrooms' : part && part.ing;
      const b = withPart(c);
      const grp = groupOf(b, o => o.name === id && o.userData.part && o.userData.part.ing === part.ing);
      if (!grp) return k.tip(c);
      F.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(grp), item = new THREE.Box3().setFromObject(b.g);
      const to = F.worldToLocal(box.getCenter(V(0, 0, 0))), itemTop = F.worldToLocal(V(0, item.max.y, 0)).y;
      const pivot = new THREE.Group();
      pivot.position.copy(to);
      F.add(pivot);
      F.updateMatrixWorld(true);
      pivot.attach(grp);
      grp.visible = false;
      // The bowl's mouth (its rim on the far side from its handle-less right) comes to rest up and right of where the
      // pieces land, high enough that the tipped bowl clears the item (its rim is its lowest point, tipped).
      const lean = 1.05, mouthLocal = V(-0.133, 0.124, 0).multiply(inc.scale).applyEuler(new THREE.Euler(0, 0, lean));
      const mouth = V(to.x + 0.1, Math.max(to.y + 0.17, itemTop + 0.15), to.z);
      const over = mouth.clone().sub(mouthLocal), from = inc.position.clone();
      const hp = inc.getObjectByName('heap'), h0 = hp ? hp.scale.clone() : null;
      return k.tween(340, t => {
        const e = k.ease(t);
        inc.position.lerpVectors(from, over, e);
        inc.position.y += Math.sin(t * PI) * 0.12;
        inc.rotation.z = lean * e;
      }).then(() => {
        if (c.onApply) c.onApply();
        grp.visible = true;
        pivot.position.copy(mouth);
        pivot.scale.setScalar(0.3);
        return k.tween(420, t => {
          const e = k.ease(t);
          pivot.position.set(mouth.x + (to.x - mouth.x) * e, mouth.y + (to.y - mouth.y) * t * t, mouth.z + (to.z - mouth.z) * e);
          pivot.scale.setScalar(0.3 + 0.7 * e);
          if (hp) hp.scale.set(h0.x * Math.max(0.001, 1 - e), h0.y * Math.max(0.001, 1 - e), h0.z * Math.max(0.001, 1 - e));
        });
      }).then(() => {
        if (hp) hp.visible = false;
        const p0 = inc.position.clone();
        return k.tween(300, t => {
          const e = k.ease(t);
          inc.rotation.z = lean * (1 - e);
          inc.position.set(p0.x + e * 2.4, p0.y + Math.sin(t * PI) * 0.12, p0.z);
        });
      });
    }
    /** A sauce's Add: the kit's squirt, its bead squirted exactly where (and as long as) the sauce then stays. */
    function squirtOn(c) {
      const F = c.F, inc = c.inc, part = c.part;
      if (k.reduced()) return k.squirt(F, inc, c.stack, c.onApply);
      const b = withPart(c);
      const fin = groupOf(b, o => o.name === 'sauce' && o.userData.sauce && o.userData.part && o.userData.part.ing === part.ing);
      if (!fin) return k.squirt(F, inc, (b && b.stack) || c.stack, c.onApply);
      F.updateMatrixWorld(true);
      const proxy = new THREE.Group();
      new THREE.Matrix4().copy(F.matrixWorld).invert().multiply(fin.matrixWorld).decompose(proxy.position, proxy.quaternion, proxy.scale);
      proxy.userData.h = 0;
      F.add(proxy);
      fin.visible = false;
      const p = k.squirt(F, inc, proxy, c.onApply);
      const grow = proxy.children[proxy.children.length - 1], S0 = fin.userData.sauce, S1 = grow && grow.userData.sauce;
      if (S1) { S1.bead.scale.copy(S0.bead.scale); S1.bead.rotation.copy(S0.bead.rotation); S1.bead.position.copy(S0.bead.position); }
      return p;
    }
    const lines = {
      bowl: {
        incoming: part => Object.assign(fillingBowl(part), { rest: 0 }),
        add: c => spill(c),
      },
      squirt: {
        incoming: part => Object.assign(smaller(k.bottle(part), 0.72, 'bottle'), { rest: 0.03 }),
        add: c => squirtOn(c),
      },
      shake: {
        incoming: part => Object.assign(smaller(k.shaker(part), 0.8, 'shaker'), { rest: 0.03 }),
        add: c => k.shake(c),
      },
    };
    const applies = { salmon: 'bowl', tuna: 'bowl', crab: 'bowl', cucumber: 'bowl', avocado: 'bowl', creamCheese: 'bowl', tofu: 'bowl', wakame: 'bowl', enoki: 'bowl', sesame: 'shake', sauce: 'squirt' };

    /* ── gross-out fx of its own: the winking tuna ── */
    const fx = {
      /** An eye on the tuna that opens and winks every few seconds: a white eyeball with its pupil toward the viewer
       *  and a tuna-red lid turning round it (the lid's turn is the wink). Motion Reduced: drawn mid-wink, still. */
      wink(g, v, box) {
        const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, top = box.max.y;
        const r = clamp(Math.min(box.max.x - box.min.x, box.max.z - box.min.z) * 0.32, 0.026, 0.042);
        const eye = k.fxPart(new THREE.Group());
        eye.add(k.ink(kept('eyeball', () => new THREE.SphereGeometry(1, 16, 12)), k.toon(0xffffff)));
        eye.children[0].scale.setScalar(r);
        const pupil = new THREE.Mesh(kept('pupil', () => new THREE.SphereGeometry(1, 12, 8)), k.toon(0x121212));
        pupil.scale.set(r * 0.45, r * 0.45, r * 0.3);
        pupil.position.set(0, r * 0.12, r * 0.82);
        const glint = new THREE.Mesh(kept('pupil', () => new THREE.SphereGeometry(1, 12, 8)), k.toon(0xffffff));
        glint.scale.setScalar(r * 0.12);
        glint.position.set(r * 0.12, r * 0.3, r * 0.98);
        eye.add(pupil, glint);
        const hinge = new THREE.Group();
        hinge.rotation.z = PI / 2;
        const lid = new THREE.Mesh(kept('lid', () => new THREE.SphereGeometry(1, 16, 8, 0, PI)), k.toon(0xa81f33, { side: THREE.DoubleSide }));
        lid.scale.setScalar(r * 1.12);
        lid.rotation.y = PI / 4;                       // mid-wink: the lid half down over the eye
        hinge.add(lid);
        eye.add(hinge);
        // A lash line on the lid's edge, so the wink reads at a glance.
        eye.position.set(cx, top + r * 0.7, cz + (box.max.z - box.min.z) * 0.15);
        g.add(eye);
        k.spin(lid, 'spinY', { turn: PI / 4, speed: 2.2 });
      },
    };

    /* ── flourishes ── */
    const without = (made, ids, extra) => Object.assign({}, made, { auto: ((made && made.auto) || []).filter(a => !ids.includes(a)) }, extra || {});
    /** A knife: a steel blade with a dark spine and a wooden handle, edge down along -y, the blade in the x-y plane
     *  turned across the log (the cut is across x). */
    function knife() {
      const g = new THREE.Group();
      g.name = 'knife';
      const blade = k.ink(new THREE.BoxGeometry(0.006, 0.12, 0.36), k.toon(C.steel));
      blade.position.set(0, 0.06, 0);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.0065, 0.014, 0.36), k.toon(C.steelDark));
      spine.position.set(0, 0.114, 0);
      const handle = k.ink(new THREE.BoxGeometry(0.022, 0.03, 0.17), k.toon(C.handle));
      handle.position.set(0, 0.1, 0.26);
      g.add(blade, spine, handle);
      return g;
    }
    /** A wooden ladle: a deep round scoop of broth on a long handle. */
    function ladle(colour) {
      const g = new THREE.Group();
      g.name = 'ladle';
      const cup = k.ink(k.lathe([[0, 0], [0.04, 0.004], [0.058, 0.02], [0.062, 0.05], [0.056, 0.05], [0.052, 0.022], [0.036, 0.01], [0, 0.008]], k.seg(18)), k.toon(0xc99556));
      g.add(cup);
      const f = k.fill([[0.036, 0.01], [0.054, 0.045]], 0.85, colour, { seg: 16 });
      g.add(f.g);
      g.userData.broth = f.g;                        // emptied as it pours (it came back still full)
      const handle = k.ink(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), k.toon(0xb57f45));
      handle.rotation.z = -1.0;
      handle.position.set(0.2, 0.15, 0);
      g.add(handle);
      g.userData.lip = V(-0.06, 0.05, 0);
      return g;
    }
    const autos = {
      /** The board: the knife slices the log into the picked count, one cut at a time, then the pieces part and
       *  stand cut face up. Motion Reduced: the pieces are simply there. */
      rollSlice(c, e, made) {
        const b = c.showItem(without(made, ['slice']));
        if (!b || !b.log || k.reduced()) { if (c.onApply) c.onApply(); c.showItem(made); return P0(); }
        const parts = partsOf(k.sequence(made, {})), N = parts.cut ? (k.lookFor(parts.cut).pieces || 8) : 8;
        const kn = knife(), log = b.log, L = b.logL, R = b.logR;
        kn.rotation.y = 0.3;                         // the handle toward the viewer's right: the blade reads
        c.F.add(kn);
        const at = x => c.toF(log, V(x, 0, 0));
        const over = x => at(x).add(V(0, R + 0.16, 0));
        const down = x => at(x).add(V(0, -R * 0.9, 0));
        kn.position.copy(over(-L / 2 + L / N)).add(V(0.5, 0.1, 0));
        let p = k.tween(220, t => { kn.position.lerpVectors(kn.position.clone(), over(-L / 2 + L / N), k.ease(t)); });
        const mark = kept('cutMark', () => new THREE.TorusGeometry(1, 0.03, 4, 20).rotateY(PI / 2));
        for (let i = 1; i < N; i++) {
          const x = -L / 2 + i * L / N;
          p = p.then(() => { if (i === 1 && c.onApply) c.onApply(); return k.tween(70, t => { kn.position.lerpVectors(over(x), down(x), k.ease(t)); }); })
            .then(() => {
              const m = new THREE.Mesh(mark, k.toon(0x0b120d));
              m.scale.setScalar(b.logRLocal * 1.01);
              m.position.x = x;
              log.add(m);
              const nx = i + 1 < N ? -L / 2 + (i + 1) * L / N : x;
              return k.tween(90, t => { kn.position.lerpVectors(down(x), over(nx), k.ease(t)); });
            });
        }
        return p.then(() => k.tween(200, t => { kn.position.y += t * 0.02; kn.position.x += t * 0.08; }))
          .then(() => {
            c.F.remove(kn); k.free(kn);
            // The cut pieces lift out of the log and stand up in their row, face up (keyframes of the same pieces).
            return keyframes(t => c.showItem(made, { layT: t }), 7, 460);
          })
          .then(() => { c.showItem(made); });
      },
      /** The soup station: a ladle of the picked miso comes over the bowl, tips, and the broth rises. Motion Reduced:
       *  the broth is simply there. */
      misoLadle(c, e, made) {
        const b = c.showItem(made, { level: 0 });
        if (!b || !b.setLevel || k.reduced()) { if (c.onApply) c.onApply(); c.showItem(made); return P0(); }
        const ld = ladle(b.broth), s = b.scale || 1;
        ld.scale.setScalar(s);
        const surf = t => c.toF(b.g, V(-0.02, b.surfaceAt(Math.max(0.05, t)), b.z || 0));
        const home = surf(1).add(V(0.1 * s, 0.17 * s, 0)), from = home.clone().add(V(1.2, 0.35, 0));
        ld.position.copy(from);
        c.F.add(ld);
        return k.tween(320, t => { ld.position.lerpVectors(from, home, k.ease(t)); })
          .then(() => k.tween(260, t => { ld.rotation.z = 1.1 * k.ease(t); }))
          .then(() => {
            ld.updateMatrixWorld(true);
            const lip = c.toF(ld, ld.userData.lip);
            const left = ld.userData.broth;
            return k.pour({ F: c.F, from: lip, to: t => surf(t), colour: b.broth, ms: 900, r: 1.4, onApply: c.onApply,
              onLevel: t => { b.setLevel(t); if (left) { left.scale.y = Math.max(0.001, 1 - t); left.visible = t < 0.98; } } });
          })
          .then(() => k.tween(300, t => { ld.rotation.z = 1.1 * (1 - k.ease(t)); ld.position.lerpVectors(home, from, k.ease(t)); }))
          .then(() => { c.F.remove(ld); k.free(ld); c.showItem(made); });
      },
    };

    /** A flourish drawn as n keyframes over ms (draw(t), t = 1/n .. (n-1)/n; the caller then draws the end). */
    function keyframes(draw, n, ms) {
      let p = P0();
      for (let i = 1; i < n; i++) p = p.then(() => { draw(i / n); return k.wait(ms / n); });
      return p.then(() => k.wait(ms / n));
    }
    /** The roll-up: the mat curls over the sheet from its near edge, the log (or the cone) growing as it goes. */
    const rollUp = draw => keyframes(t => draw(t), 8, 680);

    /* ── the mat: the roll on the bamboo mat, a stage at a time ── */
    const fallbackRoll = () => ({ recipe: null, ing: 'roll', parts: [{ ing: 'crab' }, { ing: 'cucumber' }, { ing: 'avocado' }], picks: { roll: 'regular', rice: 'white' }, counts: {}, auto: [], gross: [] });
    const cooks = {
      mat: {
        /** The item (s.made) at s.stage on the mat: flat, or rolled with the mat curled round it. */
        show(c, s) {
          const made = s.made || c.state.made || fallbackRoll();
          const b = k.item(made, { stage: s.stage || 0, where: 'mat', set: 'roll', wrapT: s.wrapT });
          const A = c.anchors;
          if (A.giantMax && b.giant > A.giantMax) { const f = A.giantMax / b.giant; b.g.scale.multiplyScalar(f); b.h *= f; }
          b.g.position.copy(A.mat || A.stack);
          b.g.name = 'item';
          c.F.add(b.g);
        },
        /** The roll arrives on the mat, flat. */
        add(c, s) {
          c.redraw({ ing: s.ing, n: s.n, stage: 0, cooking: false });
          const it = c.F.getObjectByName('item');
          return it ? popIn(it) : P0();
        },
        /** Simple: the mat rolls it a stage at a time to the answer. Timed: it settles at the stage it stopped on. */
        run(c, s) {
          const stage = s.stage | 0, ms = s.ms || 1800;
          if (k.reduced() || c.state.timed) { c.redraw({ stage, cooking: false, wrapT: undefined }); const it = c.F.getObjectByName('item'); return it && !k.reduced() ? squeeze(it) : P0(); }
          let p = P0();
          for (let i = 1; i <= Math.max(1, stage); i++) {
            if (i === 1) p = p.then(() => rollUp(t => c.redraw({ stage: 1, cooking: true, wrapT: t })));
            p = p.then(() => { c.redraw({ stage: i, cooking: true, wrapT: undefined }); const it = c.F.getObjectByName('item'); return it ? squeeze(it) : P0(); })
              .then(() => k.wait(ms / Math.max(2, stage + 1) * 0.6));
          }
          return p.then(() => { c.redraw({ stage, cooking: false }); });
        },
        /** Each Timed stage: the mat turns it a stage tighter. */
        stage(c, s) {
          // Flat to Loose: it rolls up on the mat (it jumped from the flat sheet to a log in the curled mat).
          if (s.stage === 1 && !k.reduced()) {
            rollUp(t => { if (c.state.stage <= 1) c.redraw({ stage: 1, cooking: true, wrapT: t }); })
              .then(() => { if (c.state.stage <= 1) c.redraw({ stage: 1, cooking: true, wrapT: undefined }); else c.redraw({ wrapT: undefined }); });
            return;
          }
          c.redraw({ stage: s.stage, cooking: true, wrapT: undefined });
          const it = c.F.getObjectByName('item');
          if (it && !k.reduced()) squeeze(it);
        },
      },
    };
    function squeeze(g) {
      const s0 = g.scale.clone();
      return k.tween(260, t => { const b = Math.sin(t * PI) * 0.06; g.scale.set(s0.x * (1 + b * 0.3), s0.y * (1 - b), s0.z * (1 + b)); });
    }
    function popIn(g) {
      if (k.reduced()) return P0();
      const y = g.position.y;
      return k.tween(260, t => { g.position.y = y + (1 - k.ease(t)) * 0.3; });
    }

    /* ── the sets, by backdrop name ── */
    const COUNTER = { line: 0.80, top: 0.92, back: -0.2, x: -0.45, row: 0.42, front: 1.06, scale: 1.35 };
    const SPAN = { left: 0.14, queue: 0.659, gap: 0.24 };
    const sets = {
      counter: {
        // Solved to its picture like a station (spec 5.2 "Counters sit low"): the top's back edge at 80% of the
        // picture. Everything here lies flat on the counter top, so nothing covers the painted queue. The pizza's
        // camera (flat food read from above): the cut faces of the pieces read.
        x: 12, line: COUNTER.line, surface: { y: COUNTER.top, back: COUNTER.back },
        cam: { pos: [0, COUNTER.top + 1.25, COUNTER.back + 4.6], at: [0, COUNTER.top + 1.25 - 1.61, COUNTER.back - 1], fov: 38 },
        build(g) {
          // Ben's Sushi's counter as the counter picture's own sushi counter and the court's storefront draw it: a
          // golden hinoki top, an orange-wood edge along the customer's side, faint plank seams and grain.
          const T = COUNTER.top, B = COUNTER.back, D = 3.4, L = 16;
          const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, D), k.toon(0xf4c56a)); top.position.set(0, T - 0.06, B + D / 2); g.add(top);
          const body = new THREE.Mesh(new THREE.BoxGeometry(L, T - 0.12, D - 0.1), k.toon(0x1d2f6b)); body.position.set(0, (T - 0.12) / 2, B + D / 2 + 0.05); g.add(body);
          const strip2 = (z0, z1, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, z1 - z0).rotateX(-PI / 2), k.toon(col)); m.position.set(0, T + 0.0015, B + (z0 + z1) / 2); g.add(m); return m; };
          strip2(0, 0.05, 0xf08a2c);                           // the orange-wood edge
          strip2(0.05, 0.058, 0x9a4a14);                       // its dark ink line
          [0.62, 1.4, 2.3].forEach(z => strip2(z, z + 0.006, 0xeab866));   // plank seams
          const R = k.rand('counterGrain'), pts = [];
          for (let i = 0; i < 70; i++) pts.push({ p: [(R() - 0.5) * 9, T + 0.0012, B + 0.12 + R() * 2.6], nrm: [0, 1, 0], r: (R() - 0.5) * 0.04, t: 0.5, s: 0.5 + R() });
          g.add(k.scatter(kept('counterGrain', () => new THREE.BoxGeometry(0.5, 0.001, 0.006)), k.toon(0xf0c274), pts, { outline: false }));
          return {
            spots: [V(COUNTER.x, T, COUNTER.row)], row: COUNTER.row, contentScale: COUNTER.scale,
            back: B, front: COUNTER.front, minX: -2.4, maxX: 0.6, minScreenX: SPAN.left,
          };
        },
      },
      prep: {
        // The painted counter under the prep shelves is the surface (measured: 62.8% of the picture, the row under the
        // wall's ink line). The diner's board camera. The mat low and left of centre; what goes on waits on the right.
        x: 0, line: 0.628, surface: { y: TOP, back: -0.5 },
        cam: { pos: [0.329, 2.215, 2.508], at: [0.329, 1.115, 0.15], fov: 30 },
        build() {
          return { stack: V(-0.1, TOP, -0.06), incoming: V(0.54, TOP, 0.12), surface: TOP, giantMax: 1.0 };
        },
        /** A pick here: the nori is laid on the mat; the rice spreads from the middle (inside-out: then the sheet is
         *  flipped over, rice down); the miso's bowl waits for the ladle. */
        pick(c, e, made) {
          if (!made) return P0();
          if (e.slot === 'miso') { const b = c.showItem(without(made, ['ladle'])); if (c.onApply) c.onApply(); return b ? c.pop(b.g) : P0(); }
          if (e.slot === 'rice') {
            const inside = (made.picks || {}).roll === 'insideOut' && e.value !== 'noRice';
            const b = c.showItem(made, inside ? { unflipped: true } : {});
            if (c.onApply) c.onApply();
            if (!b || k.reduced()) { if (inside) c.showItem(made); return P0(); }
            const r = b.g.getObjectByName('rice');
            const spread = r ? k.tween(420, t => { const s = 0.1 + 0.9 * k.ease(t); r.scale.set(s, 1, s); }) : P0();
            if (!inside) return spread;
            return spread.then(() => k.wait(120)).then(() => {
              const ct = b.contents, y0 = ct.position.y, lift = b.sheet.surface + b.sheet.y0;
              return k.tween(520, t => { ct.rotation.x = PI * k.ease(t); ct.position.y = y0 + Math.sin(t * PI) * 0.3 + k.ease(t) * lift; });
            }).then(() => { const a = c.showItem(made); return a ? c.pop(a.g) : P0(); });
          }
          const b = c.showItem(made);
          if (c.onApply) c.onApply();
          if (!b) return P0();
          if (e.slot === 'roll') { const n = b.g.getObjectByName('nori'); return n ? c.drop(n, 0.3, 260) : c.pop(b.g); }
          return c.pop(b.g);
        },
        /** The prep table is done. In Simple the mat has already rolled it (made.done is set; the page does not show
         *  the mat in Simple), so it rolls up here, on the mat it was built on: the sheet curls into the log (or the
         *  cone) and the mat wraps round it. In Timed (made.done unset) the mat station rolls it. */
        finish(c, e, made) {
          if (!made || e.station !== 'prep' || !made.done) return P0();
          // (It used to squash the sheet into a tall slab and then pop a rolled log in: odd, food audit 2026-11-11.)
          if (k.reduced()) { c.showItem(made, { rolled: true }); return P0(); }
          return rollUp(t => c.showItem(made, { rolled: true, wrapT: t }))
            .then(() => { c.showItem(made, { rolled: true }); return k.wait(250); });
        },
      },
      roll: {
        // The painted board counter is the surface (measured: 62.0% of the picture, the row under the back counter's
        // ink line). The mat (cook 'mat') and the cutting board both stand at `mat`/`stack`, low and left of centre.
        x: 24, line: 0.620, surface: { y: TOP, back: -0.5 }, cook: 'mat',
        cam: { pos: [0.329, 2.215, 2.508], at: [0.329, 1.115, 0.15], fov: 30 },
        build() {
          return { stack: V(0.12, TOP, 0.06), mat: V(0.04, TOP, -0.04), incoming: V(0.86, TOP, 0.14), surface: TOP, giantMax: 1.0 };
        },
        /** The pieces pick: the log waits on the board for the knife (the slice flourish follows). */
        pick(c, e, made) {
          const b = c.showItem(made ? without(made, ['slice']) : made);
          if (c.onApply) c.onApply();
          return b ? c.pop(b.g) : P0();
        },
      },
    };

    /* ── the counter: one item at its spot; more side by side, left of the painted queue, at every window shape ── */
    // The page keeps the Back in 5 sign in the bottom-left corner (to 12.5% of the window) and the order left of the
    // counter picture's own painted queue (BBArt.sushi.counter: 65.9% across): world.js hands arrange()
    // anchors.maxScreenX and anchors.lineY. In Node (no anchors from world.js) the shape is 16:9.
    function windowAspect() {
      const w = typeof innerWidth === 'number' ? innerWidth : 0, h = typeof innerHeight === 'number' ? innerHeight : 0;
      return w > 0 && h > 0 ? w / h : 16 / 9;
    }
    function counterCamera(aspect, lineY) {
      const d = sets.counter, c = new THREE.PerspectiveCamera(d.cam.fov, aspect, 0.1, 60);
      c.position.set(d.cam.pos[0], d.cam.pos[1], d.cam.pos[2]);
      c.lookAt(d.cam.at[0], d.cam.at[1], d.cam.at[2]);
      c.updateMatrixWorld(); c.updateProjectionMatrix();
      const want = typeof lineY === 'number' ? lineY : food.lineOnScreen(d.line, aspect, d.picture);
      const dy = food.lensShift(c, V(d.cam.at[0], d.surface.y, d.surface.back), want);
      c.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: -dy, width: 1, height: 1 };
      c.updateProjectionMatrix();
      return c;
    }
    function xAcross(cam, fx, z) {
      const a = V(0, COUNTER.top, z).project(cam), b = V(1, COUNTER.top, z).project(cam);
      return (fx * 2 - 1 - a.x) / (b.x - a.x);
    }
    const counter = {
      /** One item at its spot when it fits there; more (or a giant): side by side in ticket order between the Pause
       *  sign and the painted queue on this window (at the items' near edge), shrunk together only if they do not
       *  fit; world.js then keeps each on the counter top it can see. */
      arrange(n, items, anchors) {
        const aspect = windowAspect(), cam = counterCamera(aspect, anchors.lineY);
        const right = typeof anchors.maxScreenX === 'number' ? anchors.maxScreenX
          : (aspect < food.PICTURE ? 0.5 + (SPAN.queue - 0.5) * food.PICTURE / aspect : SPAN.queue) - 0.006;
        const sizes = items.map(m => {
          const b = k.item(m, { where: 'counter', set: 'counter', contentScale: anchors.contentScale });
          const box = k.boxOf(b.g), sc = b.g.scale.x;
          k.free(b.g);
          return { w: (box.max.x - box.min.x) * sc, mid: (box.min.x + box.max.x) / 2 * sc, near: box.max.z * sc };
        });
        const z = anchors.row + Math.max(...sizes.map(s => s.near));
        const x0 = xAcross(cam, typeof anchors.minScreenX === 'number' ? anchors.minScreenX : SPAN.left, z);
        // world.js then holds each item left of the queue at its own near side (maxXAt): never place one past that, or it
        // is pushed back onto its neighbour (two rolls on their geta overlapped).
        const lim = typeof anchors.maxXAt === 'function' ? anchors.maxXAt(z) : anchors.maxX;
        const x1 = Math.min(xAcross(cam, right, z), typeof lim === 'number' ? lim - 0.01 : Infinity);
        const spot = anchors.spots[0];
        if (n === 1 && spot.x + sizes[0].mid - sizes[0].w / 2 >= x0 && spot.x + sizes[0].mid + sizes[0].w / 2 <= x1) return [{ p: spot.clone(), s: 1 }];
        const total = sizes.reduce((t, x) => t + x.w, 0) + SPAN.gap * (n - 1), s = Math.min(1, (x1 - x0) / total);
        let x = x0 + ((x1 - x0) - total * s) / 2;
        return sizes.map(({ w, mid }) => {
          const p = V(x + (w / 2 - mid) * s, COUNTER.top, anchors.row);
          x += (w + SPAN.gap) * s;
          return { p, s };
        });
      },
    };

    return {
      shapes, sets, cooks, lines, applies, autos, layouts: { sushiRoll, misoSoup }, counter, fx,
      /** Recipe looks name the layout: sushiRoll (and the Sushi Boat, the same roll on a boat), misoSoup. */
      layoutOf(made) {
        const R = made.recipe && (k.pack().recipes || {})[made.recipe];
        const s = R && R.look && R.look.shape;
        if (s === 'sushiRoll' || s === 'sushiBoat') return 'sushiRoll';
        if (s === 'misoSoup') return 'misoSoup';
        if (made.ing === 'roll') return 'sushiRoll';
        if (made.ing === 'soup') return 'misoSoup';
        return null;
      },
      // The dial plates' swatches by stage (world.colourOf), for the roll on the mat.
      ramps: { rollMat: RAMP },
    };
  });
  return food;
});
