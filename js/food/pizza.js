/** Ben's Food Court - the Pizza Parlor's food in 3D (docs/api/food.md walks through how this file is built;
 *  docs/api/packs/pizza.md section 10 is the list of looks it draws).
 *
 *  The same toon style as the Burger Bar (js/food/diner.js): chunky cel-shaded food with ink outlines, in close-up.
 *  A pizza is a pan, a crust (thin, regular or deep dish), the sauce (or bare dough), the cheese, each topping
 *  scattered evenly over the cheese (all on one surface), and the cut: the `pizza` layout lays them out in line
 *  order, where the kit's `stack` would pile them up. The cut runs over the toppings and notches the crust's rim,
 *  so the slices can be counted round the edge. The heart pizza is the same layout over a heart-shaped crust on a
 *  heart-shaped tray. Garlic knots are six knotted rolls in a red-and-white paper basket (a steel tray in the oven)
 *  with the dip cup beside them; their marks, butter and parmesan lie on the knots' own surface.
 *
 *  Doneness is a colour AND a mark (DESIGN.md): the crust and cheese brown through the pack's ramp, the cheese
 *  turns golden with more and darker spots at every stage past Light, the pepperoni cups up, the knots get browned
 *  spots, and a burnt one smokes.
 *
 *  Sets, by backdrop name: counter (spec 5.2: solved to line 0.80 like a station, a cream top with a checked edge),
 *  prep (the painted marble is the surface: prep, the cut and the knot basket all happen here) and oven (the
 *  painted hearth; cook 'oven'). The lines of the two kitchen pictures were measured from art-source/backdrops:
 *  prep 65.4%, oven 69.4% (the table in FOODCOURT-BUILD.md 5.2 asked for 62 and 65). docs/api/food.md section 9.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kit.js'));
  else factory(root.BB.food);
})(typeof window === 'undefined' ? globalThis : window, function (food) {
  'use strict';
  food.register('pizza', k => {
    const THREE = k.THREE;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const TOP = 0.5;                       // the height of every kitchen work surface (as the diner's)
    // Raw, light, golden, crispy, burnt: the pack's `pizza` and `knots` ramps say the same; these are the fallback.
    const BAKE = [0xf3e2b8, 0xf0cf8a, 0xdba352, 0xb06a2c, 0x3d2416];
    const KNOTS = [0xf4e4bf, 0xf1d08c, 0xdda04e, 0xb36a2a, 0x3f2617];
    const PIE = { r: 0.46, pan: 0.52 };    // a pizza's radius, the round pan's
    const HS = 0.49;                       // the heart's size: as wide as a round pizza
    const KNOT_SCALE = 1.3;                // the knot basket, drawn up on the line and the counter (not the oven tray)
    // The counter (spec 5.2): its top's back edge at 80% of the picture. line, top (y), back (the edge's z); the
    // order's spot (x, row: its centre's z), the gap its far side keeps from the edge (a rim stays below the
    // line), front (the nearest z the counter top still shows at the bottom of a 16:9 window), and the cream.
    const COUNTER = { line: 0.80, top: 0.92, back: -0.2, x: -0.5, row: 0.57, gap: 0.28, front: 1.06, scale: 0.9, cream: 0xfff2e2 };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ── shared geometry (kept: never freed with a build) ── */
    const geos = {};
    const kept = (key, make) => geos[key] || (geos[key] = k.keep(make()));

    // What lands on a lumpy thing lands ON it, not on its bounding box: the kit's surfaceOf / onSurface.
    const surfaceOf = (g, minUp) => k.surfaceOf(g, minUp), onSurface = (S, n, seed, lift) => k.onSurface(S, n, seed, lift);

    /* ── colour by stage: look.ramp as a list, or as { stageName: colour } (the pack's), else `list` ── */
    function stageNamesOf(r) {
      const SS = k.pack().stageSets || {}, keys = Object.keys(r);
      for (const id of Object.keys(SS)) if (keys.every(x => SS[id].stages.includes(x))) return SS[id].stages;
      return null;
    }
    function rampAt(look, stage, list) {
      const r = look && look.ramp, s = clamp(stage | 0, 0, 4);
      if (Array.isArray(r) && r.length) return r[Math.min(s, r.length - 1)];
      if (r && typeof r === 'object') {
        const names = look.stages || stageNamesOf(r);
        if (names && r[names[Math.min(s, names.length - 1)]] !== undefined) return r[names[Math.min(s, names.length - 1)]];
      }
      if (list) return list[Math.min(s, list.length - 1)];
      return look && look.colour !== undefined ? look.colour : 0x999999;
    }
    /** The crust's colour at a stage: the item's own ramp (the pack's `pizza` look) when the layout gives the item. */
    function bakeColour(o, s) {
      const L = o && o.item && o.item.ing ? k.lookOf(o.item.ing) : null;
      return rampAt(L && L.ramp ? L : null, s, BAKE);
    }
    /** An item's stage: o.stage (the oven, the dial), else what made.done says. */
    const stageOf = (made, o) => (o && o.stage !== undefined && o.stage !== null ? o.stage : k.stageIndex({ ing: made.ing, done: made.done }));

    /* ── the heart: the classic curve, lobes away from the viewer when it lies flat ── */
    function heartPoints(n, scale) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3), y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([x / 17 * scale, (y + 6) / 17 * scale * 1.25]);
      }
      return pts;
    }
    function inPoly(poly, x, y) {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    }
    /** A flat heart (y up; the shape's y runs to -z): extruded `depth`, with a rounded rim when `bevel` > 0. */
    function heartGeo(key, scale, depth, bevel) {
      return kept('heart:' + key + ':' + (k.low() ? 'lo' : 'hi'), () => {
        const shape = new THREE.Shape(heartPoints(k.low() ? 48 : 72, scale).map(([x, y]) => new THREE.Vector2(x, y)));
        const geo = new THREE.ExtrudeGeometry(shape, bevel ? { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 1 }
          : { depth, bevelEnabled: false, curveSegments: 1 });
        geo.rotateX(-Math.PI / 2);
        if (bevel) geo.translate(0, bevel, 0);
        geo.computeVertexNormals();
        return geo;
      });
    }
    /** How far a ray from the heart's middle goes before it leaves the heart (for the cut lines). */
    function rayToEdge(poly, a) {
      const dx = Math.cos(a), dy = Math.sin(a);
      let best = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [x1, y1] = poly[j], [x2, y2] = poly[i], ex = x2 - x1, ey = y2 - y1, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = (x1 * ey - y1 * ex) / den, u = (x1 * dy - y1 * dx) / den;
        if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
      }
      return best;
    }

    /* ── even spreads: n points inside a disc or the heart, kept apart, seeded ── */
    function spread(n, inside, span, dmin, seed, y) {
      const R = k.rand(seed), out = [];
      for (let i = 0; i < n; i++) {
        let best = null, bestD = -1;
        for (let tries = 0; tries < 26; tries++) {
          const x = (R() * 2 - 1) * span[0], z = (R() * 2 - 1) * span[1];
          if (!inside(x, z)) continue;
          let d = Infinity;
          for (const q of out) d = Math.min(d, Math.hypot(q.p[0] - x, q.p[2] - z));
          if (d > bestD) { bestD = d; best = [x, z]; }
          if (d >= dmin) break;
        }
        if (best) out.push({ p: [best[0], y || 0, best[1]], nrm: [0, 1, 0], r: R() * Math.PI * 2, t: R() });
      }
      return out;
    }
    const onDisc = r => ({ inside: (x, z) => x * x + z * z <= r * r, span: [r, r] });
    function onHeart(scale) {
      const poly = heartPoints(48, scale);
      return { inside: (x, z) => inPoly(poly, x, -z), span: [0.94 * scale, 0.82 * scale] };
    }
    /** Where toppings may go: inside the crust's rim (o.inner), or inside the heart. */
    function field(o, inset) {
      return o && o.heart ? onHeart(HS * inset) : onDisc(((o && o.inner) || 0.4) * inset);
    }
    /** A disc with a slightly wavy edge (sauce, melted cheese). */
    function wavyDisc(r, h, j, seg) {
      const geo = k.cyl(r, h, k.seg(seg || 48)), pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x);
        if (Math.hypot(x, z) > r * 0.5) { const m = 1 + k.noise(a, j) * 0.02; pos.setX(i, x * m); pos.setZ(i, z * m); }
      }
      geo.computeVertexNormals();
      return geo;
    }

    /* ── the crusts: lathe profiles [r, y] from the middle out; inner = where the sauce stops, floor = its height ── */
    const CRUST = {
      thin: { pts: [[0, 0], [0.44, 0], [0.46, 0.012], [0.46, 0.028], [0.445, 0.034], [0.42, 0.03], [0.408, 0.024], [0, 0.024]], inner: 0.405, floor: 0.024, rim: 0.034 },
      regular: { pts: [[0, 0], [0.42, 0], [0.46, 0.02], [0.465, 0.045], [0.45, 0.068], [0.42, 0.07], [0.39, 0.052], [0.378, 0.036], [0, 0.036]], inner: 0.372, floor: 0.036, rim: 0.07 },
      deepDish: { pts: [[0, 0], [0.42, 0], [0.44, 0.03], [0.44, 0.12], [0.425, 0.135], [0.395, 0.13], [0.372, 0.11], [0.362, 0.04], [0, 0.04]], inner: 0.355, floor: 0.04, rim: 0.135 },
    };
    /** The top of a crust from the edge of its floor out to its outer edge, as [r, y]: what a cut runs over. */
    function rimPath(pts) {
      let iMax = 0;
      pts.forEach(([r], i) => { if (r >= pts[iMax][0]) iMax = i; });
      return pts.slice(iMax, -1).reverse();
    }
    /** A crust of one kind (or the heart, when the layout says): { g, h: the floor, inner, outer, rim, path }. Char
     *  flecks on the rim at crispy and burnt are a doneness cue, never thinned. */
    function crust(kind, part, o) {
      o = o || {};
      const s = k.stageIndex(part, o), g = new THREE.Group(), colour = bakeColour(o, s);
      g.name = 'crust';
      let out;
      if (o.heart) {
        g.add(k.ink(heartGeo('crust', HS, 0.02, 0.018), k.toon(colour)));
        out = { g, h: 0.056, inner: 0.38, outer: 0.47, rim: 0.056, heart: true };
      } else {
        const C = CRUST[kind] || CRUST.regular;
        g.add(k.ink(k.lathe(C.pts, k.seg(56)), k.toon(colour)));
        out = { g, h: C.floor, inner: C.inner, outer: Math.max(...C.pts.map(p => p[0])), rim: C.rim, path: rimPath(C.pts) };
      }
      if (s >= 3) {
        const n = s === 3 ? 10 : 18, pts = [];
        const R = k.rand('char:' + kind + ':' + (part.n || 0));
        for (let i = 0; i < n; i++) {
          if (o.heart) { const a = R() * Math.PI * 2, d = rayToEdge(heartPoints(48, HS), a) * (0.9 + R() * 0.08); pts.push({ p: [Math.cos(a) * d, 0.056 + 0.002, -Math.sin(a) * d], nrm: [0, 1, 0], r: R() * 6, t: 0.5, s: 0.8 + R() * 0.6 }); }
          else { const a = R() * Math.PI * 2, rr = out.inner + (out.outer - out.inner) * (0.3 + R() * 0.6); pts.push({ p: [Math.cos(a) * rr, out.rim + 0.002, Math.sin(a) * rr], nrm: [0, 1, 0], r: R() * 6, t: 0.5, s: 0.8 + R() * 0.6 }); }
        }
        g.add(k.scatter(kept('spot', () => new THREE.CircleGeometry(0.022, 8).rotateX(-Math.PI / 2)), k.toon(s === 3 ? 0x5a3418 : 0x120a06), pts, { outline: false }));
      }
      return out;
    }

    /* ── the toppings: one scatter of a piece each, spread evenly, colour and shape by stage ── */
    const mix = (L, s, to, by) => k.mix(L.colour, to, by[clamp(s | 0, 0, 4)]);
    const TOPPINGS = {
      pepperoni: {
        n: 12, inset: 0.84, h: 0.012, tilt: 0.25, tin: { n: 12, size: 0.78, tilt: 0.55 },   // a heap of slices, each one its own
        piece: (s, o) => (o && o.heart ? heartGeo('pep', 0.062, 0.012, 0)
          : s >= 2 ? kept('pep-cup', () => k.lathe([[0, 0], [0.05, 0], [0.06, 0.012], [0.058, 0.022], [0.052, 0.018], [0.046, 0.008], [0, 0.008]], 18))
            : kept('pep-flat', () => k.cyl(0.06, 0.012, 18))),
        colour: (L, s) => mix(L, s, 0x3a120e, [0, 0, 0.15, 0.32, 0.7]),
        flecks: { n: 3, colour: 0x5a1510 },
      },
      sausage: { n: 14, inset: 0.86, h: 0.03, tilt: 1.5, jitter: true, tin: { n: 22 }, piece: () => k.piece('chunk'), colour: (L, s) => mix(L, s, 0x2e1810, [0, 0.08, 0.2, 0.4, 0.75]) },
      mushrooms: {
        n: 10, inset: 0.84, h: 0.012, tilt: 0.3, scale: s => (s >= 2 ? 0.92 : 1), tin: { n: 16, size: 0.9 },
        piece: () => kept('mushroom', () => {
          const sh = new THREE.Shape();
          sh.moveTo(-0.014, -0.036); sh.lineTo(0.014, -0.036); sh.lineTo(0.014, 0); sh.lineTo(0.06, 0);
          for (let i = 1; i <= 10; i++) { const a = Math.PI * i / 10; sh.lineTo(Math.cos(a) * 0.06, Math.sin(a) * 0.045); }
          sh.lineTo(-0.014, 0); sh.closePath();
          const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 1 });
          geo.rotateX(-Math.PI / 2);
          geo.computeVertexNormals();
          return geo;
        }),
        colour: (L, s) => mix(L, s, 0x8a6a48, [0, 0.1, 0.25, 0.4, 0.7]),
      },
      greenPeppers: { n: 10, inset: 0.86, h: 0.014, tilt: 0.5, tin: { n: 16, size: 0.72 }, piece: () => kept('pepper', () => new THREE.TorusGeometry(0.06, 0.012, 6, 12, 1.7).rotateX(Math.PI / 2)), colour: (L, s) => mix(L, s, 0x1f3a16, [0, 0, 0.1, 0.3, 0.6]), char: s => (s >= 3 ? (s === 3 ? 5 : 9) : 0) },
      redOnions: { n: 12, inset: 0.86, h: 0.008, tilt: 0.4, tin: { n: 14, size: 0.6 }, piece: () => kept('onion', () => new THREE.TorusGeometry(0.075, 0.006, 5, 16, 2.4).rotateX(Math.PI / 2)), colour: (L, s) => mix(L, s, 0x8a4a3a, [0, 0, 0.15, 0.3, 0.6]), flat: s => (s >= 2 ? 0.7 : 1) },
      blackOlives: { n: 12, inset: 0.86, h: 0.014, tilt: 0.3, tin: { n: 14, size: 1.05, tilt: 0.8 }, piece: () => kept('olive', () => new THREE.TorusGeometry(0.034, 0.012, 6, 14).rotateX(Math.PI / 2)), colour: L => L.colour },
      pineapple: { n: 10, inset: 0.86, h: 0.016, tilt: 0.3, tin: { n: 16, size: 0.9 }, piece: () => kept('pineapple', () => k.cyl(0.05, 0.026, 3)), colour: (L, s) => mix(L, s, 0xb5731f, [0, 0, 0.1, 0.4, 0.7]) },
    };
    /** A topping scattered over the pizza (or, on its own, over a small disc): the pieces are never thinned, they
     *  show the topping is there; the flecks on them are. */
    function topping(id, part, o) {
      const T = TOPPINGS[id], L = k.lookFor(part), s = k.stageIndex(part, o), g = new THREE.Group();
      g.name = id;
      const F = field(o, T.inset), seed = id + ':' + (part.n || 0) + (o && o.heart ? ':heart' : '');
      const r = (o && o.heart ? HS * 0.8 : ((o && o.inner) || 0.4) * T.inset);
      const pts = spread(T.n, F.inside, F.span, r * 1.7 / Math.sqrt(T.n), seed, 0.004);
      const sc = T.scale ? T.scale(s) : 1;
      const list = pts.map(p => ({ p: p.p, nrm: p.nrm, r: p.r, t: p.t, s: sc * (T.jitter ? 0.8 + p.t * 0.4 : 1) }));
      const pieces = k.scatter(T.piece(s, o), k.toon(T.colour(L, s)), list, { outline: 'thin', tilt: T.tilt });
      if (T.flat) pieces.scale.y = T.flat(s);
      g.add(pieces);
      if (T.flecks) {
        const fl = [], per = k.thin(T.flecks.n, 1);
        pts.forEach((p, i) => {
          const R = k.rand(seed + ':fl' + i);
          for (let j = 0; j < per; j++) { const a = R() * Math.PI * 2, rr = R() * 0.038; fl.push({ p: [p.p[0] + Math.cos(a) * rr, p.p[1] + T.h + 0.002, p.p[2] + Math.sin(a) * rr], nrm: [0, 1, 0], r: 0, t: 0.5 }); }
        });
        g.add(k.scatter('seed', k.toon(T.flecks.colour), fl, { outline: false, size: 0.9 }));
      }
      if (T.char && T.char(s)) {
        const n = T.char(s), fl = [];
        for (let i = 0; i < n; i++) { const p = pts[i % pts.length], R = k.rand(seed + ':ch' + i); fl.push({ p: [p.p[0] + (R() - 0.5) * 0.05, p.p[1] + T.h + 0.004, p.p[2] + (R() - 0.5) * 0.05], nrm: [0, 1, 0], r: 0, t: 0.5 }); }
        g.add(k.scatter('seed', k.toon(0x1a0e08), fl, { outline: false, size: 1.1 }));
      }
      return { g, h: T.h };
    }
    /** What a topping's tin holds: the same piece and colour, raw; T.tin sizes the heap so big pieces (onion
     *  rings, pepper strips) stay inside the tin and a few pepperoni or olives still read one by one. The tin is
     *  drawn 1.2 times up: on the slide it is small next to the pizza. */
    function tinOf(part) {
      const L = k.lookFor(part), T = TOPPINGS[L.shape];
      let b;
      if (T) b = k.tin(part, Object.assign({ piece: T.piece(0, null), mat: k.toon(T.colour(L, 0)), n: 22, size: 1, tilt: 1.4 }, T.tin));
      else if (L.shape === 'mozzarella') b = k.tin(part, { piece: 'shred', mat: k.toon(L.colour), n: 90, size: 1.15, tilt: 1.2 });
      else b = k.tin(part);
      b.g.scale.setScalar(1.2);
      b.h *= 1.2;
      return b;
    }

    /* ── the garlic knots' basket, their tray in the oven, the butter pot ── */
    const CHECKS = {};
    function checker(cols, rows) {
      const key = cols + 'x' + rows;
      if (CHECKS[key]) return CHECKS[key];
      const data = new Uint8Array(cols * rows * 4);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const red = (x + y) % 2 === 0, i = (y * cols + x) * 4;
        data[i] = red ? 0xc4 : 0xff; data[i + 1] = red ? 0x2a : 0xfa; data[i + 2] = red ? 0x22 : 0xf2; data[i + 3] = 255;
      }
      const t = new THREE.DataTexture(data, cols, rows, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;           // the bytes are sRGB colours: the red stays the parlor's red
      t.needsUpdate = true;
      return (CHECKS[key] = new THREE.MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: k.toon(0xffffff).gradientMap }));
    }
    /** The red-and-white checkered paper basket: { g, h: the floor, top }. */
    function basket() {
      const g = new THREE.Group(), W = 0.46, D = 0.34, H = 0.1, t = 0.012;
      g.name = 'basket';
      const floor = k.ink(new THREE.BoxGeometry(W, t, D), k.toon(0xfaf4ea));
      floor.position.y = t / 2;
      g.add(floor);
      [[0, D / 2, W, 0, 9], [0, -D / 2, W, Math.PI, 9], [W / 2, 0, D, -Math.PI / 2, 7], [-W / 2, 0, D, Math.PI / 2, 7]].forEach(([x, z, len, turn, cols]) => {
        const w = new THREE.Group();
        const side = k.ink(new THREE.BoxGeometry(len, H, t), checker(cols, 2));
        side.position.y = H / 2;
        w.add(side);
        w.position.set(x, t, z);
        w.rotation.y = turn;
        w.rotateX(0.2);                  // the paper leans out
        g.add(w);
      });
      return { g, h: t, top: H + t };
    }
    /** A steel sheet tray (the knots bake on it). */
    function tray() {
      const g = new THREE.Group(), W = 0.5, D = 0.38, t = 0.012;
      g.name = 'tray';
      const sheet = k.ink(new THREE.BoxGeometry(W, t, D), k.toon(0x9aa3ab));
      sheet.position.y = t / 2;
      g.add(sheet);
      [[0, D / 2, W], [0, -D / 2, W]].forEach(([x, z, len]) => { const lip = k.inkThin(new THREE.BoxGeometry(len, 0.03, 0.012), k.toon(0xb8c1c8)); lip.position.set(x, 0.02, z); g.add(lip); });
      [[W / 2, 0, D], [-W / 2, 0, D]].forEach(([x, z, len]) => { const lip = k.inkThin(new THREE.BoxGeometry(0.012, 0.03, len), k.toon(0xb8c1c8)); lip.position.set(x, 0.02, z); g.add(lip); });
      return { g, h: t, top: 0.035 };
    }
    /** The garlic butter pot with its brush standing in it (how the butter waits on the line). */
    function butterPot(part) {
      const L = k.lookFor(part), g = new THREE.Group();
      g.add(k.ink(k.lathe([[0, 0], [0.09, 0], [0.1, 0.01], [0.1, 0.11], [0.108, 0.12], [0.092, 0.122], [0.086, 0.02], [0, 0.02]], k.seg(24)), k.toon(0xe8e2d6)));
      const f = k.fill([[0.086, 0.02], [0.09, 0.1]], 0.8, L.colour, { seg: 20 });
      g.add(f.g);
      const brush = new THREE.Group();
      brush.name = 'brush';
      const handle = k.ink(k.cyl(0.012, 0.3, 10), k.toon(0xd9a85e));
      handle.position.y = 0.15;
      const ferrule = k.inkThin(k.cyl(0.016, 0.04, 10), k.toon(0xb8c1c8));
      ferrule.position.y = -0.005;
      const bristles = k.ink(new THREE.BoxGeometry(0.05, 0.06, 0.018), k.toon(0xf0dca8));
      bristles.position.y = -0.05;
      brush.add(handle, ferrule, bristles);
      brush.position.set(0.03, 0.11, 0);
      brush.rotation.z = -0.3;
      g.add(brush);
      g.userData.part = part;
      return { g, h: 0.4 };
    }

    /* ── shapes: one builder per look.shape ── */
    const shapes = {
      /** The pan: a round steel pan a little wider than the crust; a deep straight-sided one for deep dish; a
       *  heart-shaped tray under the heart pizza. */
      pizzaPan(part, o) {
        const deep = (o && o.crust) === 'deepDish' || (o && o.item && o.item.picks && o.item.picks.crust === 'deepDish');
        const g = new THREE.Group(), steel = k.toon(0xaab3ba);
        g.name = 'pan';
        if (o && o.heart) {
          g.add(k.ink(heartGeo('pan', HS * 1.1, 0.006, 0.008), steel));
          return { g, h: 0.022, top: 0.022, inner: HS };
        }
        if (deep) {
          g.add(k.ink(k.lathe([[0, 0], [0.46, 0], [0.47, 0.01], [0.47, 0.13], [0.455, 0.13], [0.455, 0.012], [0, 0.012]], k.seg(56)), steel));
          return { g, h: 0.012, top: 0.13, inner: 0.455 };
        }
        g.add(k.ink(k.lathe([[0, 0], [0.5, 0], [0.52, 0.012], [0.525, 0.034], [0.512, 0.036], [0.5, 0.016], [0.485, 0.012], [0, 0.012]], k.seg(56)), steel));
        return { g, h: 0.012, top: 0.036, inner: 0.485 };
      },
      thinCrust: (part, o) => crust('thin', part, o),
      regularCrust: (part, o) => crust('regular', part, o),
      deepDishCrust: (part, o) => crust('deepDish', part, o),
      /** The sauce, inside the rim: a little darker at crispy, darker at burnt. */
      pizzaSauce(part, o) {
        const L = k.lookFor(part), s = k.stageIndex(part, o), r = (o && o.inner) || 0.4, g = new THREE.Group();
        g.name = 'sauce';
        const colour = k.mix(L.colour, 0x5a1a10, s >= 4 ? 0.5 : s === 3 ? 0.22 : 0);
        if (o && o.heart) g.add(k.inkThin(heartGeo('sauce', HS * 0.86, 0.009, 0), k.toon(colour)));
        else { const m = k.inkThin(wavyDisc(r * 0.985, 0.009, 2.1), k.toon(colour)); m.position.y = 0.0045; g.add(m); }
        // A pale (white) sauce on pale dough needs a cue: herb and pepper flecks, as a garlic white sauce has.
        const c = new THREE.Color(L.colour);
        if (c.r + c.g + c.b > 2.4) {
          const F = field(o, 0.9), seed = 'herbs:' + (part.n || 0) + (o && o.heart ? ':heart' : '');
          const pts = spread(k.thin(26, 12), F.inside, F.span, 0.05, seed, 0.0095);
          g.add(k.scatter('seed', k.toon(0x4f7a2a), pts.filter((_, i) => i % 3), { outline: false, size: 0.9 }));
          g.add(k.scatter('seed', k.toon(0x3a3330), pts.filter((_, i) => !(i % 3)), { outline: false, size: 0.7 }));
        }
        return { g, h: 0.006 };
      },
      /** No sauce: a few flour specks on the bare dough, so "sauce: none" looks bare. */
      bareDough(part, o) {
        const g = new THREE.Group(), F = field(o, 0.9), seed = 'flour:' + (part.n || 0);
        g.name = 'sauce';
        const pts = spread(k.thin(16, 8), F.inside, F.span, 0.06, seed, 0.003);
        g.add(k.scatter('seed', k.toon(0xffffff), pts, { outline: false, size: 0.9 }));
        return { g, h: 0 };
      },
      /** The cheese: shreds when raw; melted smooth from Light, with golden-brown spots at Golden, browned blisters
       *  at Crispy and charred patches at Burnt (the spots are the doneness mark: never thinned). */
      mozzarella(part, o) {
        const L = k.lookFor(part), s = k.stageIndex(part, o), r = (o && o.inner) || 0.4, heart = !!(o && o.heart), g = new THREE.Group();
        g.name = 'cheese';
        const seed = 'cheese:' + (part.n || 0) + (heart ? ':heart' : '');
        if (s === 0) {
          const F = field(o, 0.95);
          const pts = spread(k.thin(120, 60), F.inside, F.span, 0.02, seed, 0.006).map(p => ({ p: [p.p[0], p.p[1] + p.t * 0.012, p.p[2]], nrm: p.nrm, r: p.r, t: p.t }));
          g.add(k.scatter('shred', k.toon(L.colour), pts, { outline: 'thin', tilt: 0.9, size: 1.15 }));
          return { g, h: 0.018 };
        }
        // Light: pale melted white; Golden: warm yellow with brown spots; Crispy: deeper, browner, blistered;
        // Burnt: dark. Each stage a step apart in colour as well as in its marks, so the oven reads at a glance.
        const colour = [L.colour, L.colour, k.mix(L.colour, 0xf0c060, 0.62), k.mix(L.colour, 0xc98e3e, 0.82), k.mix(L.colour, 0x6e5538, 0.9)][Math.min(s, 4)];
        if (heart) g.add(k.inkThin(heartGeo('cheese', HS * 0.84, 0.013, 0), k.toon(colour)));
        else { const m = k.inkThin(wavyDisc(r * 0.96, 0.014, 4.3), k.toon(colour)); m.position.y = 0.007; g.add(m); }
        const SPOTS = [null, null, [9, 0xb8732e, 0.032], [13, 0x7d4319, 0.038], [16, 0x22140c, 0.045]];
        if (SPOTS[Math.min(s, 4)]) {
          const [n, col, size] = SPOTS[Math.min(s, 4)], F = field(o, 0.78);
          const pts = spread(n, F.inside, F.span, 0.09, 'spots:' + seed, 0.016).map(p => Object.assign(p, { s: (0.7 + p.t * 0.6) * size / 0.022 }));
          g.add(k.scatter(kept('spot', () => new THREE.CircleGeometry(0.022, 8).rotateX(-Math.PI / 2)), k.toon(col), pts, { outline: false }));
          if (s === 3) {
            const bl = spread(4, F.inside, F.span, 0.12, 'blister:' + seed, 0.014).map(p => Object.assign(p, { s: 0.8 + p.t * 0.5 }));
            g.add(k.scatter(kept('blister', () => new THREE.SphereGeometry(0.022, 10, 6).scale(1, 0.5, 1)), k.toon(0xd9a35a), bl, { outline: 'thin' }));
          }
        }
        return { g, h: 0.014 };
      },
      pepperoni: (part, o) => topping('pepperoni', part, o),
      sausage: (part, o) => topping('sausage', part, o),
      mushrooms: (part, o) => topping('mushrooms', part, o),
      greenPeppers: (part, o) => topping('greenPeppers', part, o),
      redOnions: (part, o) => topping('redOnions', part, o),
      blackOlives: (part, o) => topping('blackOlives', part, o),
      pineapple: (part, o) => topping('pineapple', part, o),
      /** The cut: that many slices. Each cut runs from the middle over the toppings (o.lineY, the crust's own
       *  frame), then over the crust's rim (o.path) and ends at its edge: a notch in the crust at every cut, so
       *  the slices can be counted round the edge even under a full set of toppings. On its own (no layout), a
       *  regular crust's. */
      pizzaCut(part, o) {
        o = o || {};
        const L = k.lookFor(part), N = L.slices || 8, g = new THREE.Group(), mat = k.toon(0x6b4423);   // crust brown: a hair stays black
        g.name = 'cut';
        const lineY = o.lineY !== undefined ? o.lineY : CRUST.regular.floor + 0.024;
        const inner = o.inner || CRUST.regular.inner, path = o.path || rimPath(CRUST.regular.pts);
        const poly = o.heart ? heartPoints(72, HS) : null;
        for (let i = 0; i < N; i++) {
          const a = i * Math.PI * 2 / N + (N === 4 ? Math.PI / 4 : 0), dx = Math.cos(a), dz = -Math.sin(a);   // as the wheel rolls
          let pts;
          if (poly) {
            const len = rayToEdge(poly, a);
            pts = [[0, lineY], [len * 0.84, lineY], [len * 0.93, 0.06], [len - 0.006, 0.042]];
          } else {
            let peak = 0;
            path.forEach(([, y], j) => { if (y > path[peak][1]) peak = j; });
            pts = [[0, lineY], [inner * 0.97, lineY]].concat(path.filter(([r]) => r > inner * 0.97 + 0.004)
              .map(([r, y], j, arr) => [r, path.indexOf(arr[j]) <= peak ? Math.max(y + 0.004, lineY) : y + 0.004]));
          }
          const curve = new THREE.CatmullRomCurve3(pts.map(([r, y]) => V(dx * r, y, dz * r)), false, 'centripetal');
          g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.0055, 5, false), mat));
        }
        return { g, h: 0 };
      },
      /** Six knotted rolls in a heap, raw to burnt by stage, browned spots from Golden (the doneness mark, never
       *  thinned), each on a knot's own upper surface. g.userData.surface: the knots' upward-facing points, so
       *  the butter and the parmesan land on the knots, not in the air over them. */
      garlicKnots(part, o) {
        const L = k.lookFor(part), s = k.stageIndex(part, o), g = new THREE.Group();
        g.name = 'knots';
        const geo = kept('knot:' + (k.low() ? 'lo' : 'hi'), () => new THREE.TorusKnotGeometry(0.05, 0.023, k.low() ? 32 : 48, k.seg(8), 2, 3));
        let colour = rampAt(L, s, KNOTS);
        if (o && o.buttered) colour = k.mix(colour, 0xf0c04a, 0.3);
        const R = k.rand('knots:' + (part.n || 0));
        [[-0.11, 0.04, -0.06], [0.1, 0.04, -0.08], [-0.02, 0.04, 0.09], [0.14, 0.04, 0.07], [-0.15, 0.04, 0.06], [0, 0.11, -0.01]].forEach(([x, y, z]) => {
          const m = k.ink(geo, k.toon(colour));
          m.position.set(x + (R() - 0.5) * 0.02, y, z + (R() - 0.5) * 0.02);
          m.rotation.set((R() - 0.5) * 0.8, R() * Math.PI * 2, (R() - 0.5) * 0.8);
          m.scale.setScalar(0.95 + R() * 0.15);
          g.add(m);
        });
        g.userData.surface = surfaceOf(g, 0.35);
        const MARKS = [0, 0, 6, 10, 16], cols = [0, 0, 0xa8642a, 0x6e3c16, 0x1f120b];
        if (MARKS[Math.min(s, 4)]) {
          const pts = onSurface(g.userData.surface, MARKS[Math.min(s, 4)], 'knotmarks:' + (part.n || 0), 0.006).map(p => Object.assign(p, { s: 0.9 + p.t * 0.5 }));
          g.add(k.scatter(kept('mark', () => new THREE.SphereGeometry(0.016, 8, 6).scale(1, 0.55, 1)), k.toon(cols[Math.min(s, 4)]), pts, { outline: false }));
        }
        return { g, h: 0.17 };
      },
      /** Garlic butter on the knots: glossy pools, with parsley and garlic flecks, all on the knots' surface
       *  (o.surface, from the knots); on its own, over a small disc. Waits in a pot with a brush. */
      garlicButter(part, o) {
        const L = k.lookFor(part), g = new THREE.Group(), seed = 'butter:' + (part.n || 0);
        g.name = 'butter';
        const at = (n, salt, lift) => (o && o.surface ? onSurface(o.surface, n, seed + salt, lift) : k.sample({ kind: 'disc', r: 0.16, y: lift }, n, seed + salt));
        const pools = at(9, ':g', 0.002).map(p => Object.assign(p, { s: 0.8 + p.t * 0.6 }));
        g.add(k.scatter(kept('pool', () => new THREE.SphereGeometry(0.03, 10, 6).scale(1, 0.35, 1)), k.toon(L.colour, { transparent: true, opacity: 0.75, depthWrite: false }), pools, { outline: false }));
        g.add(k.scatter('seed', k.toon(0x3c8a2e), at(k.thin(18, 8), ':p', 0.006), { outline: false, size: 1.1, tilt: 1 }));
        g.add(k.scatter('grain', k.toon(0xfff3dc), at(k.thin(10, 5), ':ga', 0.006), { outline: false, size: 1.6 }));
        return { g, h: 0.004 };
      },
      /** Parmesan: a fine pale dusting on the knots' surface (o.surface), or over a small disc on its own; waits
       *  in a shaker. */
      parmesan(part, o) {
        const L = k.lookFor(part), g = new THREE.Group(), seed = 'parm:' + (part.n || 0);
        g.name = 'parmesan';
        const n = k.thin(80, 36);
        const pts = o && o.surface ? onSurface(o.surface, n, seed, 0.006) : k.sample({ kind: 'disc', r: 0.2, y: 0.006 }, n, seed);
        g.add(k.scatter('grain', k.toon(L.colour !== undefined ? L.colour : 0xfff6dc), pts, { outline: false, tilt: 1.6, size: 1.2 }));
        return { g, h: 0 };
      },
      /** A small fluted paper cup of dip, in the dip's colour. */
      dipCup(part) {
        const L = k.lookFor(part), g = new THREE.Group();
        g.name = 'dip';
        const geo = k.lathe([[0, 0], [0.07, 0], [0.075, 0.004], [0.098, 0.085], [0.105, 0.09], [0.093, 0.092], [0.088, 0.08], [0.064, 0.012], [0, 0.012]], 16).toNonIndexed();
        geo.computeVertexNormals();
        g.add(k.ink(geo, k.toon(0xfbfaf4)));
        const f = k.fill([[0.066, 0.012], [0.09, 0.08]], 0.85, L.colour !== undefined ? L.colour : 0xb8301f, { seg: 16 });
        g.add(f.g);
        const glint = new THREE.Mesh(new THREE.CircleGeometry(0.014, 8).rotateX(-Math.PI / 2), k.SHINE);
        glint.position.set(-0.022, f.h + 0.003, -0.022);
        g.add(glint);
        return { g, h: 0.092 };
      },
    };
    const CRUSTS = { thinCrust: 1, regularCrust: 1, deepDishCrust: 1 };

    /* ── layouts: the pizza (round or heart), the knots in their basket ── */
    /** The pizza in line order: pan, crust, then the sauce and the cheese in layers; every topping lies on that
     *  same surface (a hair apart, so two toppings never sit in each other) rather than piled on the one before;
     *  the cut last, over the toppings and the rim. -> { g, h, radius }. o.stage draws every part at that stage
     *  (the oven); else made.done. */
    function pie(made, o, heart) {
      o = o || {};
      const seq = k.sequence(made, o), g = new THREE.Group();
      const stage = stageOf(made, o), crustPick = made.picks && made.picks.crust;
      const base = { stage, item: made, heart: !!heart, crust: crustPick, where: o.where, giant: o.giant };
      let y = 0, top = 0, inner = 0.4, outer = PIE.r, n = 0, crustY = 0, path = null, toppings = 0;
      if (seq.vessel) {
        const pan = k.food(Object.assign({ n }, seq.vessel), Object.assign({}, o, base));
        g.add(pan.g);
        y = crustY = pan.h; top = Math.max(top, pan.top || pan.h);
        n++;
      }
      const cuts = [];
      seq.parts.forEach(p => {
        const shape = k.lookFor(p).shape;
        if (shape === 'pizzaCut') { cuts.push(Object.assign({ n: n++ }, p)); return; }
        const lift = TOPPINGS[shape] ? toppings * 0.004 : 0;
        const opts = Object.assign({}, o, base, { inner, outer, floor: y, top, base: y + lift, below: () => k.boxOf(g) });
        const b = k.food(Object.assign({ n }, p), opts);
        b.g.position.y = y + lift;
        g.add(b.g);
        if (CRUSTS[shape]) {
          inner = b.inner; outer = b.outer || outer; path = b.path || null; crustY = y;
          y += b.h; top = Math.max(top, crustY + (b.rim || b.h));
        } else if (TOPPINGS[shape]) {
          toppings++;
          top = Math.max(top, y + lift + b.h);
        } else {
          y += b.h; top = Math.max(top, y);
        }
        n++;
      });
      // The cut runs just over the toppings (or the cheese), in the crust's own frame.
      cuts.forEach(p => {
        const lineY = y - crustY + (toppings ? 0.016 : 0.003);
        const b = k.food(p, Object.assign({}, o, base, { inner, outer, path, lineY }));
        b.g.position.y = crustY;
        g.add(b.g);
        top = Math.max(top, crustY + lineY + 0.006);
      });
      const s = o.contentScale || 1;
      if (s !== 1) g.scale.setScalar(s);
      g.userData.h = top * s;
      return { g, h: top * s, radius: outer * s };
    }
    const layouts = {
      pizza: (made, o) => pie(made, o, false),
      heartPizza: (made, o) => pie(made, o, true),
      /** The knots in their checkered basket (a tray in the oven), what goes on them on their surface, the dip
       *  beside. A basket of knots is small next to a pizza, so the basket is drawn 1.3 times up on the line and
       *  at the counter (KNOT_SCALE), where its butter, parmesan and dip must read. */
      knotBasket(made, o) {
        o = o || {};
        const seq = k.sequence(made, o), g = new THREE.Group();
        const stage = stageOf(made, o), inOven = o.where === 'oven';
        const base = inOven ? tray() : basket();
        g.add(base.g);
        const buttered = seq.parts.some(p => k.lookFor(p).shape === 'garlicButter');
        let knots = null, top = base.top, dip = null, n = 0;
        if (seq.body) {
          const b = k.food(Object.assign({ n }, seq.body), Object.assign({}, o, { stage, buttered, item: made }));
          b.g.position.set(inOven ? 0 : -0.03, base.h, 0);
          g.add(b.g);
          knots = b.g; top = Math.max(top, base.h + b.h);
          n++;
        }
        seq.parts.forEach(p => {
          const shape = k.lookFor(p).shape;
          if (shape === 'dipCup') {
            const b = k.food(Object.assign({ n }, p), Object.assign({}, o, { item: made }));
            b.g.position.set(-0.37, 0, 0.1);   // left of the basket: on the line the steel slide is on its right
            g.add(b.g);
            dip = b.g;
          } else {
            const surface = knots ? knots.userData.surface : null;
            const b = k.food(Object.assign({ n }, p), Object.assign({}, o, { stage, item: made, base: 0, surface, below: () => (knots ? k.boxOf(knots) : new THREE.Box3(V(-0.15, 0, -0.1), V(0.15, 0.1, 0.1))) }));
            b.g.position.copy(knots ? knots.position : V(0, base.h, 0));
            g.add(b.g);
          }
          n++;
        });
        const s = (o.contentScale || 1) * (inOven ? 1 : KNOT_SCALE);
        if (s !== 1) g.scale.setScalar(s);
        g.userData.h = top * s;
        return { g, h: top * s, dip };
      },
    };

    /* ── the peel, the pizza wheel ── */
    function peel() {
      const g = new THREE.Group(), wood = k.toon(0xd9a85e);
      g.name = 'peel';
      const blade = k.ink(new THREE.BoxGeometry(1.06, 0.018, 0.9), wood);
      blade.position.set(0, 0.009, 0);
      const neck = k.ink(new THREE.BoxGeometry(0.16, 0.022, 0.22), wood);
      neck.position.set(0, 0.011, 0.52);
      const handle = k.ink(k.cyl(0.022, 1.0, 10), wood);
      handle.rotation.x = Math.PI / 2 - 0.1;
      handle.position.set(0.02, 0.07, 1.1);
      g.add(blade, neck, handle);
      return g;
    }
    function wheel() {
      const g = new THREE.Group();
      g.name = 'wheel';
      const blade = k.inkThin(k.cyl(0.085, 0.008, k.seg(24)), k.toon(0xd3dbe1));
      blade.rotation.x = Math.PI / 2;
      blade.name = 'blade';
      const hub = k.inkThin(k.cyl(0.018, 0.02, 10), k.toon(0x6c757c));
      hub.rotation.x = Math.PI / 2;
      const arm = k.ink(k.cyl(0.014, 0.16, 8), k.toon(0x9aa3ab));
      arm.rotation.z = -0.9;
      arm.position.set(0.06, 0.06, 0);
      const grip = k.ink(k.cyl(0.024, 0.2, 10), k.toon(0xc4352b));
      grip.rotation.z = -0.9;
      grip.position.set(0.2, 0.17, 0);
      g.add(blade, hub, arm, grip);
      return g;
    }

    /* ── the oven: the whole item on the peel in front, or inside the mouth; bubbles while it bakes ── */
    /** The cheese (or the sauce) bubbling while it bakes; knots have neither, so they do not bubble. */
    function bubbles(c, item, at) {
      const cheese = item.g.getObjectByName('cheese'), sauce = item.g.getObjectByName('sauce');
      if (!cheese && !sauce) return;
      const on = cheese || sauce, box = k.boxOf(on), R = k.rand('bubbles'), g = new THREE.Group();
      const sc = item.g.scale.x || 1;
      for (let i = 0, n = k.thin(8, 4); i < n; i++) {
        const b = new THREE.Mesh(kept('bubble', () => new THREE.SphereGeometry(0.016, 8, 6)), k.toon(0xf7e3a8));
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * Math.max(0.05, (box.max.x - box.min.x) / 2 * 0.7);
        b.position.set(at.x + Math.cos(a) * rr * sc, at.y + item.h + 0.004, at.z + Math.sin(a) * rr * 0.8 * sc);
        b.scale.y = 0.6;
        g.add(b);
        k.spin(b, 'bubble', { phase: R() * 3, height: 0.03, speed: 1.2 + R() });
      }
      c.F.add(g);
    }
    /** Burnt: dark smoke rolling up off it (dark enough to read against the fire; it sits still with Reduced). */
    function smoke(c, item, at) {
      for (let i = 0; i < 4; i++) {
        const p = k.puff(0x4f4a48, 0.9);
        p.scale.setScalar(1.9);
        p.position.set(at.x + (i - 1.5) * 0.16, at.y + item.h + 0.06 + (i % 2) * 0.08, at.z);
        c.F.add(p);
        k.spin(p, 'rise', { phase: i * 0.5, alpha: 0.9, height: 0.4 });
      }
    }
    const cooks = {
      oven: {
        /** The item (s.made) at s.stage: inside the mouth while it bakes (s.cooking, or mid-run: s.inside), else
         *  on the peel on the hearth in front. The peel rests on the hearth when the food is inside. */
        show(c, s) {
          const made = s.made || c.state.made || (s.ing ? { recipe: null, ing: s.ing, parts: [], picks: {}, counts: {}, auto: [], gross: [] } : null);
          if (!made) return;
          const A = c.anchors, inside = !!(s.cooking || s.inside);
          const b = k.item(made, { stage: s.stage || 0, where: 'oven', set: 'oven' });
          // A giant (the heart) is capped so it still fits the oven's mouth and the hearth in front.
          if (b.giant > A.giantMax) { const f = A.giantMax / b.giant; b.g.scale.multiplyScalar(f); b.h *= f; }
          const at = inside ? A.mouth : A.hearth;
          b.g.position.copy(at);
          b.g.name = 'item';
          if (!inside) {
            // Waiting on the peel in front of the mouth (inside, the page's own peel is the control: no 3D one).
            const P = peel();
            P.position.copy(at);
            c.F.add(P);
            b.g.position.y += 0.018;
          }
          c.F.add(b.g);
          if (inside && s.cooking) bubbles(c, b, b.g.position);
          if ((s.stage | 0) >= 4) smoke(c, b, b.g.position);
        },
        /** The item arrives on the peel, from the right. */
        add(c, s) {
          c.redraw({ ing: s.ing, n: s.n, stage: 0, cooking: false, inside: false });
          const item = c.F.getObjectByName('item'), P = c.F.getObjectByName('peel');
          if (!item || k.reduced()) return Promise.resolve();
          const i0 = item.position.clone(), p0 = P.position.clone();
          return k.tween(300, t => { const e = 1 - k.ease(t); item.position.x = i0.x + e * 1.3; P.position.x = p0.x + e * 1.3; });
        },
        /** Simple: the peel slides it into the mouth, it bakes to the stage (bubbling, browning a stage at a
         *  time), the peel brings it out. Timed: it is in the oven at the stage shown; the peel brings it out. */
        run(c, s) {
          const ms = s.ms || 1800, stage = s.stage | 0, A = c.anchors;
          if (k.reduced()) { c.redraw({ stage, cooking: false, inside: false }); return Promise.resolve(); }
          const lift = V(0, 0.018, 0);
          const out = () => {
            // The peel comes in from the right, slides under it and brings it out to the front.
            c.redraw({ stage, cooking: false, inside: true });
            const item = c.F.getObjectByName('item'), P = peel();
            P.position.copy(A.rest);
            c.F.add(P);
            return k.tween(ms * 0.15, t => { P.position.lerpVectors(A.rest, A.mouth, k.ease(t)); })
              .then(() => k.tween(ms * 0.2, t => { const e = k.ease(t); item.position.lerpVectors(A.mouth, A.hearth.clone().add(lift), e); P.position.lerpVectors(A.mouth, A.hearth, e); }))
              .then(() => { c.redraw({ stage, cooking: false, inside: false }); });
          };
          if (c.state.timed) return out();
          c.redraw({ stage: 0, cooking: false, inside: false });
          const item = c.F.getObjectByName('item'), P = c.F.getObjectByName('peel');
          const f0 = item.position.clone(), p0 = P.position.clone(), inAt = A.mouth.clone().add(lift);
          return k.tween(ms * 0.2, t => { const e = k.ease(t); item.position.lerpVectors(f0, inAt, e); P.position.lerpVectors(p0, A.mouth, e); })
            .then(() => k.tween(ms * 0.1, t => { const e = k.ease(t); P.position.lerpVectors(A.mouth, A.rest, e); item.position.y = inAt.y - 0.018 * e; }))
            .then(() => { c.redraw({ stage: Math.max(1, Math.round(stage / 2)), cooking: true, inside: true }); return k.wait(ms * 0.25); })
            .then(() => { c.redraw({ stage, cooking: true, inside: true }); return k.wait(ms * 0.25); })
            .then(out);
        },
        /** Each Timed stage: the food inside browns a stage (smoke at Burnt, from show). */
        stage(c, s) { c.redraw({ stage: s.stage, cooking: true, inside: true }); },
      },
    };

    /* ── what goes on stays where it lands (food audit, 2026-11-11) ── */
    // An Add used to drop a squashed heap (or dab the air) and then, once the tin or the pot had gone, the world
    // redrew the item with the topping suddenly spread over it. Now the item the world will draw next is put in at
    // the moment the food goes on, and its own pieces are what falls (or what the brush paints): when the world
    // redraws, nothing moves, pops or changes.
    /** The item with `part` on it, as the world draws it once the Add is done, put in place of the item on show
     *  (same place, same size). -> the build, or null. */
    function swapIn(c, part) {
      const old = c.F.getObjectByName('item');
      if (!old || !c.made || !part) return null;
      const p = { ing: part.ing };
      if (part.gross) p.gross = part.gross;
      const after = Object.assign({}, c.made, { parts: (c.made.parts || []).concat([p]) });
      const b = k.item(after, { where: 'line', set: c.set, vesselScale: c.anchors && c.anchors.vesselScale });
      b.g.position.copy(old.position);
      b.g.quaternion.copy(old.quaternion);
      b.g.scale.copy(old.scale);
      b.g.name = 'item';
      k.free(old);
      c.F.add(b.g);
      return b;
    }
    /** The instance lists in g (a piece and its ink share one list): [{ meshes, attr, n, finals (Matrix4 each),
     *  pos (each one's place in g's frame), fromG (g's frame to the mesh's) }]. */
    function instancesIn(g) {
      g.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), out = [];
      g.traverse(o => {
        if (!o.isInstancedMesh) return;
        const hit = out.find(x => x.attr === o.instanceMatrix);
        if (hit) { hit.meshes.push(o); return; }
        const toG = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), finals = [], pos = [];
        for (let i = 0; i < o.count; i++) {
          const m = new THREE.Matrix4();
          o.getMatrixAt(i, m);
          finals.push(m);
          pos.push(new THREE.Vector3().setFromMatrixPosition(m).applyMatrix4(toG));
        }
        out.push({ meshes: [o], attr: o.instanceMatrix, n: o.count, finals, pos, fromG: toG.clone().invert() });
      });
      return out;
    }
    /** A list's instances in a new order (indices), so "the first n" can be drawn. */
    function reorder(L, order) {
      L.finals = order.map(i => L.finals[i]);
      L.pos = order.map(i => L.pos[i]);
      L.finals.forEach((m, i) => L.meshes[0].setMatrixAt(i, m));
      L.attr.needsUpdate = true;
    }
    /** Draw only a list's first n instances (the ink with them). */
    const showFirst = (L, n) => L.meshes.forEach(m => { m.count = Math.max(0, Math.min(L.n, n)); m.frustumCulled = false; });
    const isHair = o => o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.type === 'TubeGeometry';
    function hasInstanced(o) { let y = false; o.traverse(x => { if (x.isInstancedMesh) y = true; }); return y; }
    /** Which of `points` (Vector3s) each of L's instances is nearest, across the top (x, z). */
    const nearestOf = (L, points) => L.pos.map(p => {
      let best = 0, d = Infinity;
      points.forEach((q, j) => { const e = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (e < d) { d = e; best = j; } });
      return best;
    });
    /** A topping's pieces (layer: its group in the item) fall out of the tin's lip (from, a point in F) one after
     *  another, the nearest first, each onto the spot it keeps; the bits on a piece (pepperoni flecks, char, mould
     *  spots) ride on it, a hair falls with the last pieces. tick(share poured, t) every frame. */
    function pourPieces(F, layer, from, ms, tick) {
      const lists = instancesIn(layer);
      if (!lists.length) return Promise.resolve();
      F.updateMatrixWorld(true);
      const src = layer.worldToLocal(F.localToWorld(from.clone()));
      const main = lists.reduce((a, b) => (b.n > a.n ? b : a));
      reorder(main, main.pos.map((p, i) => i).sort((a, b) => main.pos[a].distanceTo(src) - main.pos[b].distanceTo(src)));
      const owner = new Map();
      lists.forEach(L => {
        if (L === main) return;
        const near = nearestOf(L, main.pos), order = near.map((j, i) => i).sort((a, b) => near[a] - near[b]);
        reorder(L, order);
        owner.set(L, order.map(i => near[i]));
      });
      const hairs = [];
      layer.traverse(o => {
        if (!isHair(o)) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        hairs.push({ o, p0: o.position.clone(), c: o.geometry.boundingBox.getCenter(new THREE.Vector3()) });
      });
      const n = main.n, spread = 0.55, fall = 1 - spread, R = k.rand('pour:' + layer.name);
      const jit = main.pos.map(() => [(R() - 0.5) * 0.05, (R() - 0.5) * 0.05]);
      const off = main.pos.map(() => new THREE.Vector3());
      const at = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), m = new THREE.Matrix4();
      const place = t => {
        let started = 0;
        for (let i = 0; i < n; i++) {
          const u = clamp((t - (i / n) * spread) / fall, 0, 1), P = main.pos[i];
          if (u > 0) started = i + 1;
          // straight across from the lip, and down faster as it falls
          off[i].set((src.x + jit[i][0] - P.x) * (1 - u), (src.y - P.y) * (1 - u * u), (src.z + jit[i][1] - P.z) * (1 - u));
          main.finals[i].decompose(at, q, s);
          main.meshes[0].setMatrixAt(i, m.compose(p.copy(P).add(off[i]).applyMatrix4(main.fromG), q, s));
        }
        main.attr.needsUpdate = true;
        showFirst(main, started);
        lists.forEach(L => {
          if (L === main) return;
          const own = owner.get(L);
          let shown = 0;
          for (let i = 0; i < L.n; i++) {
            if (own[i] < started) shown = i + 1;
            L.finals[i].decompose(at, q, s);
            L.meshes[0].setMatrixAt(i, m.compose(p.copy(L.pos[i]).add(off[own[i]]).applyMatrix4(L.fromG), q, s));
          }
          L.attr.needsUpdate = true;
          showFirst(L, shown);
        });
        const uh = clamp((t - spread) / fall, 0, 1);
        hairs.forEach(h => {
          h.o.visible = uh > 0;
          h.o.position.set(h.p0.x + (src.x - h.c.x) * (1 - uh), h.p0.y + (src.y - h.c.y) * (1 - uh * uh), h.p0.z + (src.z - h.c.z) * (1 - uh));
        });
        if (tick) tick(started / n, t);
      };
      place(0);
      return k.tween(ms, place).then(() => place(1));
    }
    /** A tin's Add: up beside the pizza and tipped toward its middle, its pieces fall out of the open side onto
     *  the spots they keep (the heap in the tin going down as they go), then the tin rights itself and goes on
     *  down the line. The tin never comes down into the pizza: its lowest corner stays well over the toppings. */
    function pourTin(c) {
      const inc = c.inc, hp = inc && inc.getObjectByName('heap'), part = c.part || (inc && inc.userData.part);
      const old = c.F.getObjectByName('item');
      if (!inc || !hp || !part || !old || !c.made) return k.tip(c);
      const shape = k.lookFor(part).shape, name = shape === 'mozzarella' ? 'cheese' : shape;
      const top = c.top(), R = ((c.item && c.item.radius) || PIE.r) * (old.scale.x || 1);
      const lean = 1.05, from = inc.position.clone(), over = top.clone().add(V(Math.min(R * 0.62, 0.3), 0.5, 0.02));
      const mouth = (inc.userData.tin && inc.userData.tin.mouth ? inc.userData.tin.mouth.clone() : V(-0.18, 0.13, 0)).add(V(0.02, 0.01, 0));
      return k.tween(360, t => {
        const e = k.ease(t);
        inc.position.lerpVectors(from, over, e);
        inc.position.y += Math.sin(t * Math.PI) * 0.1;
        inc.rotation.z = lean * e;
      }).then(() => {
        const lip = c.toF(inc, mouth), b = swapIn(c, part);
        if (c.onApply) c.onApply();
        const layer = b && b.g.getObjectByName(name);
        if (!layer) { hp.visible = false; return k.wait(250); }
        // A fly circles the tin until the pieces are down, then the pizza; stink lines rise off the tin, then it.
        const late = [];
        layer.traverse(o => { if (o !== layer && o.userData.fx && !isHair(o) && !hasInstanced(o)) late.push(o); });
        late.forEach(o => { o.visible = false; });
        const heap = instancesIn(hp);
        return pourPieces(c.F, layer, lip, 720, (share, t) => {
          heap.forEach(L => showFirst(L, Math.ceil(L.n * (1 - share))));
          inc.position.x = over.x + Math.sin(t * Math.PI * 5) * 0.01;      // a little shake to get them out
        }).then(() => { hp.visible = false; late.forEach(o => { o.visible = true; }); });
      }).then(() => {
        const p0 = inc.position.clone();
        return k.tween(300, t => {
          const e = k.ease(t);
          inc.rotation.z = lean * (1 - e);
          inc.position.set(p0.x + e * 2.4, p0.y + Math.sin(t * Math.PI) * 0.12, p0.z);
        });
      });
    }
    /** Three spots on the knots' own tops (left, the top knot, right), in F: where the brush touches. */
    function dabSpots(c, knots) {
      const S = knots && knots.userData.surface;
      if (!S || !S.count) return null;
      return [[-0.13, 0], [0, -0.01], [0.12, 0]].map(([x, z]) => {
        let best = -1, y = -Infinity;
        for (let i = 0; i < S.count; i++) {
          const dx = S.p[i * 3] - x, dz = S.p[i * 3 + 2] - z;
          if (dx * dx + dz * dz < 0.07 * 0.07 && S.p[i * 3 + 1] > y) { y = S.p[i * 3 + 1]; best = i; }
        }
        if (best < 0) for (let i = 0; i < S.count; i++) if (S.p[i * 3 + 1] > y) { y = S.p[i * 3 + 1]; best = i; }
        return c.toF(knots, V(S.p[best * 3], S.p[best * 3 + 1], S.p[best * 3 + 2]));
      });
    }

    /* ── the line: toppings come in a tin, the butter in a pot with a brush, the parmesan in a shaker ── */
    const lines = {
      tin: {
        incoming: part => Object.assign(tinOf(part), { rest: 0.045 }),   // on the slide's top, like the bottle
        add: c => pourTin(c),
      },
      brush: {
        incoming: part => Object.assign(butterPot(part), { rest: 0 }),
        /** The brush comes out of the pot and paints the knots: three dabs, each on a knot's own top, the butter
         *  showing where it touched (the knots the world draws next, so it stays exactly there); back in the pot,
         *  and the pot goes on down the line. */
        add(c) {
          const inc = c.inc, brush = inc && inc.getObjectByName('brush');
          if (!brush) { if (c.onApply) c.onApply(); return Promise.resolve(); }
          const old = c.F.getObjectByName('item'), top = c.top();
          const spots = dabSpots(c, old && old.getObjectByName('knots')) || [top.clone().add(V(-0.1, 0, 0)), top.clone(), top.clone().add(V(0.1, 0, 0))];
          c.F.updateMatrixWorld(true);
          c.F.attach(brush);
          const LEAN = 0.5, tip = V(0.08 * Math.sin(LEAN), -0.08 * Math.cos(LEAN), 0);   // the bristles' ends, from the brush's middle
          const at = (T, lift) => T.clone().sub(tip).add(V(0, lift, 0));
          const b0 = brush.position.clone(), r0 = brush.rotation.z;
          let lists = null, cum = null;
          const touch = i => {
            if (i === 0) {
              const b = swapIn(c, c.part || inc.userData.part || { ing: 'garlicButter' });
              if (c.onApply) c.onApply();
              const butter = b && b.g.getObjectByName('butter');
              if (butter) {
                // each dab shows the butter nearest it
                lists = instancesIn(butter);
                const local = spots.map(T => butter.worldToLocal(c.F.localToWorld(T.clone())));
                cum = lists.map(L => {
                  const near = nearestOf(L, local);
                  reorder(L, near.map((j, x) => x).sort((a, b2) => near[a] - near[b2]));
                  return local.map((q, j) => near.filter(x => x <= j).length);
                });
              }
            }
            if (lists) lists.forEach((L, j) => showFirst(L, cum[j][i]));
          };
          let p = k.tween(300, t => {
            const e = k.ease(t);
            brush.position.lerpVectors(b0, at(spots[0], 0.14), e);
            brush.position.y += Math.sin(t * Math.PI) * 0.08;
            brush.rotation.z = r0 * (1 - e) + LEAN * e;
          });
          spots.forEach((T, i) => {
            p = p.then(() => { const a = brush.position.clone(); return k.tween(120, t => brush.position.lerpVectors(a, at(T, 0), k.ease(t))); })
              .then(() => { touch(i); const a = brush.position.clone(); return k.tween(110, t => { brush.position.x = a.x + Math.sin(t * Math.PI) * 0.025; }); })
              .then(() => { const a = brush.position.clone(), to = at(spots[i + 1] || T, 0.14); return k.tween(150, t => brush.position.lerpVectors(a, to, k.ease(t))); });
          });
          return p.then(() => { if (lists) lists.forEach(L => showFirst(L, L.n)); })
            .then(() => { const a = brush.position.clone(); return k.tween(260, t => { const e = k.ease(t); brush.position.lerpVectors(a, b0, e); brush.rotation.z = LEAN * (1 - e) + r0 * e; }); })
            .then(() => {
              inc.attach(brush);
              const p0 = inc.position.clone();
              return k.tween(300, t => { const e = k.ease(t); inc.position.set(p0.x + e * 2.4, p0.y + Math.sin(t * Math.PI) * 0.12, p0.z); });
            });
        },
      },
    };
    const applies = { mozzarella: 'tin', pepperoni: 'tin', sausage: 'tin', mushrooms: 'tin', greenPeppers: 'tin', redOnions: 'tin', blackOlives: 'tin', pineapple: 'tin', garlicButter: 'brush', parmesan: 'shake' };

    /* ── flourishes: the dough toss ── */
    // The raw dough ball (the crust pick sets it on the pan; the toss throws it): resting, it sits on the pan.
    const BALL = { r: 0.17, squash: 0.85 };
    function doughBall(at) {
      const ball = k.ink(kept('dough', () => new THREE.SphereGeometry(BALL.r, 20, 14)), k.toon(BAKE[0]));
      ball.name = 'dough';
      ball.scale.set(1, BALL.squash, 1);
      ball.position.copy(at).add(V(0, BALL.r * BALL.squash, 0));
      return ball;
    }
    /** Where the crust sits, in F (the dough ball rests there). */
    function crustAt(c, cr) {
      c.F.updateMatrixWorld(true);
      return c.F.worldToLocal(cr.getWorldPosition(new THREE.Vector3()));
    }
    const autos = {
      /** After the crust pick: the dough ball spins up off the pan; at the top it opens out into the crust itself
       *  (the one picked: a heart for the heart pizza), which stretches as it spins and lands in the pan. One
       *  dough, start to end: no round disc that turns into a heart, no crust that shows before it is tossed. */
      doughToss(c, e, made) {
        const b = c.showItem(made);
        if (!b || k.reduced()) return Promise.resolve();
        const cr = b.g.getObjectByName('crust');
        if (!cr) return Promise.resolve();
        cr.visible = false;
        const ball = doughBall(crustAt(c, cr)), rest = ball.position.y, sc = b.g.scale.y || 1, H = 0.55;
        c.F.add(ball);
        const p0 = cr.position.clone(), s0 = cr.scale.clone();
        return k.tween(360, t => {
          ball.position.y = rest + Math.sin(t * Math.PI / 2) * H;
          ball.rotation.y = t * Math.PI * 2;
          ball.scale.set(1 + t * 0.15, BALL.squash * (1 - t * 0.35), 1 + t * 0.15);
        }).then(() => {
          c.F.remove(ball); k.free(ball);
          cr.visible = true;
          // The crust's bottom starts where the ball's was, and falls into the pan as it opens out.
          const up = (rest + H - BALL.r * BALL.squash * 0.65) - (crustAt(c, cr).y);
          return k.tween(460, t => {
            const e2 = k.ease(Math.min(1, t * 1.25));
            cr.position.y = p0.y + up * (1 - t * t) / sc;
            cr.rotation.y = (1 - t) * Math.PI * 3;
            cr.scale.set(s0.x * (0.42 + 0.58 * e2), s0.y * (2.6 - 1.6 * e2), s0.z * (0.42 + 0.58 * e2));
          });
        }).then(() => { cr.position.copy(p0); cr.scale.copy(s0); cr.rotation.y = 0; });
      },
    };
    /** The sauce ladle: an open steel bowl on a long handle, the sauce (its colour) in the bowl. */
    function ladle(colour) {
      const g = new THREE.Group(), steel = k.toon(0xc9d0d6);
      g.name = 'ladle';
      g.add(k.ink(k.lathe([[0, 0], [0.034, 0.003], [0.058, 0.016], [0.072, 0.036], [0.077, 0.056], [0.071, 0.057], [0.066, 0.038], [0.053, 0.021], [0.031, 0.01], [0, 0.007]], k.seg(20)), steel));
      const inside = new THREE.Mesh(k.cyl(0.062, 0.004, k.seg(18)), k.toon(colour));
      inside.name = 'ladleSauce';
      inside.position.y = 0.042;
      g.add(inside);
      const handle = k.ink(k.cyl(0.009, 0.46, 8), steel);
      handle.position.set(0.077 + 0.23 * Math.sin(0.55), 0.056 + 0.23 * Math.cos(0.55), 0);
      handle.rotation.z = -0.55;
      g.add(handle);
      return g;
    }
    const isHeart = made => {
      const R = made && made.recipe && (k.pack().recipes || {})[made.recipe];
      return !!(R && R.look && R.look.shape === 'heartPizza');
    };

    /* ── the sets, by backdrop name ── */
    const sets = {
      counter: {
        // Solved to its picture like a station (spec 5.2 "Counters sit low", world.md "Counters (REVISED
        // 2026-11-09)"): the counter top's back edge lands at 80% of the picture, the line every counter picture
        // keeps its painted queue, stools and floor above. Everything the set draws lies flat on the counter top,
        // so nothing covers the painted queue; the camera's horizon meets the painted one (46% of a 16:9 screen).
        x: 12, line: COUNTER.line, surface: { y: COUNTER.top, back: COUNTER.back },
        cam: { pos: [0, COUNTER.top + 1.25, COUNTER.back + 4.6], at: [0, COUNTER.top + 1.25 - 1.61, COUNTER.back - 1], fov: 38 },
        build(g) {
          // The Pizza Parlor's counter as the court picture and the counter picture draw it: a cream top over red
          // brick, with a row of red-and-white checked tiles along the customer's edge and the brick-red bullnose.
          const T = COUNTER.top, B = COUNTER.back, D = 3.4, L = 16;
          const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, D), k.toon(COUNTER.cream)); top.position.set(0, T - 0.06, B + D / 2); g.add(top);
          const brick = new THREE.Mesh(new THREE.BoxGeometry(L, T - 0.12, D - 0.1), k.toon(0xc8482c)); brick.position.set(0, (T - 0.12) / 2, B + D / 2 + 0.05); g.add(brick);
          const flat = (z0, z1, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(L, z1 - z0).rotateX(-Math.PI / 2), mat); m.position.set(0, T + 0.0015, B + (z0 + z1) / 2); g.add(m); return m; };
          flat(0, 0.04, k.toon(0xb5422a));                                         // the bullnose, brick red
          flat(0.05, 0.25, checker(Math.round(L / 0.08), 2));                      // two rows of checked tiles
          flat(0.255, 0.27, k.toon(0xb5422a));                                     // a red grout line before the cream
          // One item stands at spots[0], in front of the customer (the page centres them at 24% of the picture);
          // more go side by side at `row`, left of the painted queue at every window shape (counter.arrange below).
          // `row` keeps a pizza's far side COUNTER.gap in front of the edge, so its rim stays below the line.
          // world.js keeps every item between `back` (the edge: its far side on the counter) and `front` (the
          // nearest the counter top still shows on a 16:9 window; less on a wider one), so a giant that is too deep
          // is drawn smaller and slides back to the edge. minX..maxX only back arrange up (any shape's widest span).
          return {
            spots: [V(COUNTER.x, T, COUNTER.row)], row: COUNTER.row, contentScale: COUNTER.scale,
            back: B, front: COUNTER.front, minX: -2.4, maxX: 0.3, minScreenX: SPAN.left,
          };
        },
      },
      prep: {
        // The marble work surface: the diner's board camera; its line measured at 65.4% of the picture. The
        // painted marble (veins and flour dust) is the surface: no 3D slab over it, the food sits on the picture.
        x: 0, line: 0.654, surface: { y: TOP, back: -0.5 },
        cam: { pos: [0.329, 2.573, 3.277], at: [0.329, 1.115, 0.15], fov: 30 },
        build(g) {
          // The line: a short steel slide the tins come down, to the right of the pizza.
          const slide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.62), k.toon(0xb8c1c8)); slide.position.set(1.0, TOP + 0.02, 0.15); slide.rotation.z = 0.1; g.add(slide);
          return { stack: V(0, TOP, 0.06), incoming: V(0.98, TOP + 0.12, 0.15), surface: TOP, giantMax: 1.05 };
        },
        /** A pick here. The crust: a dough ball is set on the pan (the toss that follows turns it into the crust).
         *  The sauce: a ladle of it comes in and spreads it from the middle out in a spiral (no sauce: the bare
         *  dough is just there). The cut: the wheel rolls across edge to edge, each cut line showing once the
         *  wheel has rolled over it. The dip: its cup slides in beside the basket. */
        pick(c, e, made) {
          if (!made) return Promise.resolve();
          const reduced = k.reduced();
          if (e.slot === 'crust' && !reduced) {
            const b = c.showItem(made), cr = b && b.g.getObjectByName('crust');
            if (c.onApply) c.onApply();
            if (!cr) return Promise.resolve();
            cr.visible = false;
            const ball = doughBall(crustAt(c, cr)), to = ball.position.clone(), from = to.clone().add(V(2.0, 0.35, 0.1));   // in from the right
            c.F.add(ball);
            return k.tween(320, t => { ball.position.lerpVectors(from, to, k.ease(t)); ball.position.y += Math.sin(t * Math.PI) * 0.15; ball.rotation.z = (1 - t) * 2; });
          }
          if (e.slot === 'sauce' && !reduced) {
            const b = c.showItem(made), sauce = b && b.g.getObjectByName('sauce'), L = k.slotLook(e.slot, e.value) || {};
            if (!sauce || L.shape !== 'pizzaSauce') { if (c.onApply) c.onApply(); return Promise.resolve(); }
            const s0 = 0.12, sc = b.g.scale.x || 1, sb = k.boxOf(sauce);
            const rF = Math.max(0.12, (sb.max.x - sb.min.x) / 2 * sc), reach = Math.min(rF - 0.085, isHeart(made) ? 0.2 : 1);
            sauce.scale.set(s0, 1, s0);
            const surf = c.toF(sauce, V(0, 0.0095, 0)), rest = surf.clone().add(V(0, 0.006, 0)), from = rest.clone().add(V(1.9, 0.45, 0.05));
            sauce.visible = false;                                          // none until the ladle pours it
            const lad = ladle(L.colour !== undefined ? L.colour : 0xc8321f), inside = lad.getObjectByName('ladleSauce'), TILT = 0.3;
            lad.position.copy(from);
            c.F.add(lad);
            return k.tween(320, t => { const e2 = k.ease(t); lad.position.lerpVectors(from, rest, e2); lad.rotation.z = TILT * e2; })
              .then(() => {
                if (c.onApply) c.onApply();
                sauce.visible = true;
                // Round and out from the middle, the sauce spreading under the bowl, the bowl emptying.
                return k.tween(760, t => {
                  const u = k.ease(t), rho = reach * u, th = t * Math.PI * 2 * 2.25;
                  lad.position.set(rest.x + Math.cos(th) * rho, rest.y, rest.z + Math.sin(th) * rho * 0.9);
                  const s = s0 + (1 - s0) * Math.min(1, (rho + 0.077) / rF) * (0.9 + 0.1 * u);
                  sauce.scale.set(s, 1, s);
                  inside.scale.set(1 - 0.6 * u, 1, 1 - 0.6 * u);
                  inside.position.y = 0.042 - 0.03 * u;
                  inside.visible = u < 0.97;
                });
              })
              .then(() => {
                sauce.scale.set(1, 1, 1);
                const p0 = lad.position.clone();
                return k.tween(280, t => { const e2 = k.ease(t); lad.position.set(p0.x + e2 * 1.2, p0.y + Math.sin(t * Math.PI * 0.5) * 0.4, p0.z); lad.rotation.z = TILT * (1 - e2); });
              })
              .then(() => { c.F.remove(lad); k.free(lad); });
          }
          if (e.slot === 'slices' && !reduced) {
            const N = (k.slotLook(e.slot, e.value) || {}).slices || 8, heart = isHeart(made);
            const b = c.showItem(made), it = c.F.getObjectByName('item'), cut = b && b.g.getObjectByName('cut');
            const tubes = cut ? cut.children.slice() : [];
            tubes.forEach(m => { m.visible = false; });
            const sc = (it && it.scale.x) || 1, top = c.top(), R = ((b && b.radius) || PIE.r) * sc, poly = heart ? heartPoints(72, HS) : null;
            const edge = a => (heart ? rayToEdge(poly, a) * sc : R) * 0.96;           // how far the wheel rolls from the middle
            const lines = Math.max(1, Math.round(N / 2)), w = wheel(), HUB = 0.085, blade = w.getObjectByName('blade');
            let rolled = 0;
            w.position.copy(top).add(V(R + 0.5, HUB + 0.3, 0.1));
            c.F.add(w);
            let p = Promise.resolve();
            for (let i = 0; i < lines; i++) {
              const a = i * Math.PI / lines + (N === 4 ? Math.PI / 4 : 0), dir = V(Math.cos(a), 0, -Math.sin(a));
              const from = top.clone().addScaledVector(dir, -edge(a + Math.PI)).add(V(0, HUB, 0)), to = top.clone().addScaledVector(dir, edge(a)).add(V(0, HUB, 0));
              const far = tubes[(i + lines) % tubes.length], near = tubes[i];
              p = p.then(() => {
                // Up off the last cut and down onto the far edge of the next, turning to its line on the way.
                const a0 = w.position.clone(), r0 = w.rotation.y, turn = a - r0;
                return k.tween(i ? 150 : 220, t => {
                  const e2 = k.ease(t);
                  w.position.lerpVectors(a0, from, e2);
                  w.position.y += Math.sin(t * Math.PI) * 0.1;
                  w.rotation.y = r0 + turn * e2;
                });
              }).then(() => {
                if (i === 0 && c.onApply) c.onApply();
                const len = from.distanceTo(to), r1 = rolled;
                return k.tween(260, t => {
                  const e2 = k.ease(t);
                  w.position.lerpVectors(from, to, e2);
                  rolled = r1 + e2 * len;
                  blade.rotation.y = -rolled / 0.085;
                  if (far && e2 >= 0.5) far.visible = true;           // the far half is cut once the wheel is past the middle
                  if (near && t >= 1) near.visible = true;
                });
              });
            }
            return p.then(() => {
              tubes.forEach(m => { m.visible = true; });
              const a0 = w.position.clone();
              return k.tween(200, t => { const e2 = k.ease(t); w.position.set(a0.x + e2 * 0.9, a0.y + e2 * 0.3, a0.z); });
            }).then(() => { c.F.remove(w); k.free(w); });
          }
          const b = c.showItem(made);
          if (c.onApply) c.onApply();
          if (!b || reduced) return Promise.resolve();
          if (e.slot === 'dip' && b.dip) {
            const d = b.dip, to = d.position.clone(), from = to.clone().add(V(-1.0, 0.25, 0.05));
            return k.tween(320, t => { d.position.lerpVectors(from, to, k.ease(t)); d.position.y += Math.sin(t * Math.PI) * 0.1; });
          }
          return c.pop(b.g);
        },
      },
      oven: {
        // The brick oven's hearth: its line measured at 69.4% of the picture. The food waits in front on the peel
        // and bakes inside the mouth (on the painted oven floor, further back). A lower camera than the prep's, so
        // the mouth and the hearth both fit. The painted stone hearth is the surface: no 3D slab over it.
        x: 24, line: 0.694, surface: { y: TOP, back: -0.55 }, cook: 'oven',
        cam: { pos: [0.15, 2.05, 3.5], at: [0.15, 0.95, -0.1], fov: 30 },
        build(g) {
          // hearth: where the food waits in front; mouth: inside the oven (on the painted floor); rest: off right.
          return { hearth: V(-0.3, TOP, 0.18), mouth: V(0.05, TOP, -1.1), rest: V(2.4, TOP, 0.3), surface: TOP, giantMax: 1.1 };
        },
      },
    };

    /* ── the counter: one item at its spot; more side by side, left of the painted queue, at every window shape ── */
    // The page keeps the Back in 5 sign in the bottom-left corner (to 12.5% of the window: docs/api/page.md 7) and
    // the order left of the counter picture's own painted queue: world.js hands arrange() anchors.maxScreenX (where
    // the picture's queue[0], BBArt.pizza.counter, lands on this window, less a gap; tests/dom-play.cjs checks it) and
    // anchors.lineY (the counter line on this window: the counter is anchored lower on a window wider than 16:9).
    // Several items share that span at the window's own shape: world.js asks again on every resize. In Node (no
    // window, no anchors from world.js) the shape is 16:9 and the queue starts at 52%.
    const SPAN = { left: 0.14, queue: 0.52, gap: 0.12 };
    function windowAspect() {
      const w = typeof innerWidth === 'number' ? innerWidth : 0, h = typeof innerHeight === 'number' ? innerHeight : 0;
      return w > 0 && h > 0 ? w / h : 16 / 9;
    }
    /** The counter's camera with its lens solved for a window shape, as world.js solves it (set-local: x 0 is the
     *  middle of the window). lineY: the counter line's height on the window (world.js's anchors.lineY). */
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
    /** The x on the counter top, at depth z, that lands a fraction fx across the window (linear at a fixed depth). */
    function xAcross(cam, fx, z) {
      const a = V(0, COUNTER.top, z).project(cam), b = V(1, COUNTER.top, z).project(cam);
      return (fx * 2 - 1 - a.x) / (b.x - a.x);
    }
    const counter = {
      /** One item at its spot, when it fits there. More (or a giant): side by side in ticket order, as wide as
       *  each is, between the Pause sign and the painted queue on this window (measured at the items' near edge),
       *  shrunk together only if they do not fit; world.js then keeps each on the counter top it can see. */
      arrange(n, items, anchors) {
        const aspect = windowAspect(), cam = counterCamera(aspect, anchors.lineY), z = anchors.row + 0.5;
        const right = typeof anchors.maxScreenX === 'number' ? anchors.maxScreenX
          : (aspect < food.PICTURE ? 0.5 + (SPAN.queue - 0.5) * food.PICTURE / aspect : SPAN.queue) - 0.006;
        const x0 = xAcross(cam, typeof anchors.minScreenX === 'number' ? anchors.minScreenX : SPAN.left, z), x1 = xAcross(cam, right, z);
        const sizes = items.map(m => {
          const b = k.item(m, { where: 'counter', set: 'counter', contentScale: anchors.contentScale });
          const box = k.boxOf(b.g), sc = b.g.scale.x;
          k.free(b.g);
          return { w: (box.max.x - box.min.x) * sc, mid: (box.min.x + box.max.x) / 2 * sc };
        });
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
      shapes, sets, cooks, lines, applies, autos, layouts, counter,
      /** Recipe looks name the layout: pizza, heartPizza, knotBasket. */
      layoutOf(made) {
        const R = made.recipe && (k.pack().recipes || {})[made.recipe];
        const s = R && R.look && R.look.shape;
        if (s === 'pizza' || s === 'heartPizza' || s === 'knotBasket') return s;
        if (made.ing === 'pizza') return 'pizza';
        if (made.ing === 'knots') return 'knotBasket';
        return null;
      },
      // Doneness colours by stage for the dial plates (world.colourOf) when a look has no ramp of its own.
      ramps: { pizzaPan: BAKE, thinCrust: BAKE, regularCrust: BAKE, deepDishCrust: BAKE, garlicKnots: KNOTS },
    };
  });
  return food;
});
