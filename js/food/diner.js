/** Ben's Food Court - the Burger Bar's food in 3D (docs/api/world.md lists every look it provides).
 *
 *  Chunky, cel-shaded food in close-up (DESIGN.md "Look and feel: 2.5D"): toon materials with three hard shading
 *  bands and ink outlines, so the food matches the cartoon characters. How each ingredient looks comes from the
 *  pack (`look.shape`), never from its id. Doneness is a colour AND a mark: one grill line per stage, char flecks
 *  when charred; fries and rings go from pale to burnt.
 *
 *  Sets, by backdrop name: counter, grill, board, fryer, drinks. Each kitchen camera's lens is solved by world.js
 *  so its work surface meets the line where the backdrop's painted surface starts (measured from the pictures).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kit.js'));
  else factory(root.BB.food);
})(typeof window === 'undefined' ? globalThis : window, function (food) {
  'use strict';
  food.register('diner', k => {
    const THREE = k.THREE;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const TOP = 0.5;                       // the height of every kitchen work surface
    // Raw to charred, by stage index (the patty stages: raw rare medium mediumWell well charred).
    const PATTY = [0xe68d88, 0xc8655d, 0x9d5038, 0x7d4229, 0x5f3521, 0x261812];
    // Fried: raw golden crispy extraCrispy burnt.
    const FRIED = [0xf6e3a0, 0xf2c14e, 0xd99a2b, 0xa8681c, 0x3a2410];
    const FRIED_SCALE = 1.3;               // fries and rings fill their paper boat and the fryer's basket

    /* ── the cups: three sizes, tapered, white paper with red bands ── */
    const CUP = { small: { r: 0.165, h: 0.4 }, medium: { r: 0.185, h: 0.5 }, large: { r: 0.205, h: 0.6 } };
    const WALL = 0.01;
    const cupOf = size => CUP[size] || CUP.medium;
    const inner = C => [[C.r * 0.78 - WALL, 0.014], [C.r - WALL, C.h]];
    let ICE = null;
    const iceGeo = () => ICE || (ICE = k.keep(new THREE.BoxGeometry(0.075, 0.068, 0.075)));
    function cubes(n, seed, place) {
      const g = new THREE.Group(), R = k.rand(seed);
      for (let i = 0; i < n; i++) {
        const c = k.inkThin(iceGeo(), k.toon(0xd3f1ff));
        const p = place(i, R);
        c.position.set(p[0], p[1], p[2]);
        c.rotation.set((R() - 0.5) * 0.9, R() * Math.PI, (R() - 0.5) * 0.9);
        const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), k.SHINE);
        glint.position.set(-0.012, 0.0345, 0.012); glint.rotation.x = -Math.PI / 2;
        c.add(glint);
        g.add(c);
      }
      return g;
    }

    /* ── shapes: one builder per look.shape ── */
    const shapes = {
      bun(part) {
        const L = k.lookFor(part), g = new THREE.Group(), top = part.layer === 'top';
        if (top) {
          const pts = [];
          for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * 0.37, Math.sin(a) * 0.2)); }
          const dome = k.ink(new THREE.LatheGeometry(pts, k.seg(40)), k.toon(L.colour));
          g.add(dome);
          // Its crumb underneath: on the counter the camera looks up at the top bun, which was a hollow shell.
          const under = new THREE.Mesh(new THREE.CircleGeometry(0.368, k.seg(40)), k.toon(0xf4d9a6));
          under.rotation.x = Math.PI / 2; under.position.y = 0.001; g.add(under);
          const seed = new THREE.SphereGeometry(0.014, 6, 4);
          for (let i = 0, n = k.thin(16, 8); i < n; i++) {
            const a = i * 2.4, rr = 0.06 + (i % 5) * 0.055;
            const y = Math.sqrt(Math.max(0, 1 - (rr / 0.37) ** 2)) * 0.2;
            const s = new THREE.Mesh(seed, k.toon(0xfff3d6));
            s.scale.set(1.5, 0.6, 0.9); s.position.set(Math.cos(a) * rr, y + 0.004, Math.sin(a) * rr); s.rotation.y = a;
            g.add(s);
          }
          return { g, h: 0.2 };
        }
        const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.33, 0), new THREE.Vector2(0.365, 0.03), new THREE.Vector2(0.37, 0.07), new THREE.Vector2(0.35, 0.09), new THREE.Vector2(0, 0.09)];
        g.add(k.ink(new THREE.LatheGeometry(pts, k.seg(40)), k.toon(L.colour)));
        const crumb = new THREE.Mesh(new THREE.CircleGeometry(0.345, k.seg(40)), k.toon(0xf4d9a6));
        crumb.rotation.x = -Math.PI / 2; crumb.position.y = 0.0905; g.add(crumb);
        return { g, h: 0.09 };
      },
      patty(part, opts) {
        const L = k.lookFor(part), g = new THREE.Group();
        const geo = k.cyl(0.31, 0.07, 36);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z);
          if (r > 0.05) { const j = 1 + k.noise(a, 1.3) * 0.045; pos.setX(i, x * j); pos.setZ(i, z * j); }
        }
        geo.computeVertexNormals();
        const s = Math.max(0, k.stageIndex(part, opts));
        const body = k.ink(geo, k.toon(k.ramp(L, s, PATTY)));
        body.position.y = 0.035;
        g.add(body);
        // Grill marks: one per stage past raw; char flecks when charred (both are doneness cues: never thinned).
        const marks = new THREE.Group();
        marks.position.y = 0.071;
        const n = Math.min(s, 4);
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.006, 0.03), k.toon(0x1a0e08));
          m.position.z = -0.18 + (i + 0.5) * (0.36 / n); m.rotation.y = 0.45;
          marks.add(m);
        }
        if (s >= 5) for (let i = 0; i < 14; i++) {
          const f = new THREE.Mesh(new THREE.CircleGeometry(0.02 + (i % 3) * 0.008, 6), k.toon(0x0a0605));
          f.rotation.x = -Math.PI / 2; f.position.set(Math.cos(i * 2.1) * 0.22 * ((i % 4) / 4 + 0.2), 0.001, Math.sin(i * 2.1) * 0.22 * ((i % 3) / 3 + 0.2));
          marks.add(f);
        }
        g.add(marks);
        return { g, h: 0.07 };
      },
      slice(part, o) {
        const L = k.lookFor(part);
        const geo = new THREE.BoxGeometry(0.6, 0.018, 0.6, 10, 1, 10);
        const pos = geo.attributes.position;
        // Flat while it waits on the line's tray (o.flat); draped over what it lies on once it is on the burger.
        if (!(o && o.flat)) for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i);
          const r = Math.hypot(x, z), over = Math.max(0, r - 0.27);
          pos.setY(i, pos.getY(i) - over * over * 2.6);          // the corners drape over the edge
        }
        geo.computeVertexNormals();
        const m = k.ink(geo, k.toon(L.colour));
        m.rotation.y = Math.PI / 4 + (part.n || 0) * 0.3;
        m.position.y = 0.009;
        const g = new THREE.Group(); g.add(m);
        return { g, h: 0.018 };
      },
      strips(part) {
        const L = k.lookFor(part), g = new THREE.Group();
        [-0.07, 0.07].forEach((z, j) => {
          const geo = new THREE.PlaneGeometry(0.66, 0.08, 18, 1);
          const pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 16 + j) * 0.018);
          geo.rotateX(-Math.PI / 2);
          geo.computeVertexNormals();
          const meat = k.ink(geo, k.toon(L.colour, { side: THREE.DoubleSide }));
          meat.position.set(0, 0.012, z); meat.rotation.y = j ? 0.2 : -0.15;
          const fat = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.022, 18, 1), k.toon(L.fat || 0xf2c4a8, { side: THREE.DoubleSide }));
          fat.rotation.x = -Math.PI / 2; fat.position.set(0, 0.016 + Math.sin(j) * 0.002, z + 0.01); fat.rotation.z = meat.rotation.y;
          g.add(meat, fat);
        });
        return { g, h: 0.028 };
      },
      leaf(part) {
        const L = k.lookFor(part);
        const geo = new THREE.CircleGeometry(0.4, 48, 0, Math.PI * 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x);
          const j = 1 + Math.sin(a * 7) * 0.06;
          pos.setX(i, x * j); pos.setY(i, y * j);
          pos.setZ(i, r > 0.2 ? Math.sin(a * 9) * 0.03 * ((r - 0.2) / 0.2) : 0);
        }
        geo.rotateX(-Math.PI / 2);
        geo.computeVertexNormals();
        const m = k.ink(geo, k.toon(L.colour, { side: THREE.DoubleSide }));
        m.position.y = 0.014;
        const g = new THREE.Group(); g.add(m);
        return { g, h: 0.03 };
      },
      /** Two slices of something round (tomato): look { colour, inner }. */
      disc(part) {
        const L = k.lookFor(part), g = new THREE.Group();
        [[-0.1, 0.02], [0.11, -0.03]].forEach(([x, z]) => {
          const s = k.ink(k.cyl(0.16, 0.03, 28), k.toon(L.colour !== undefined ? L.colour : 0x999999)); s.position.set(x, 0.015, z); g.add(s);
          const inside = new THREE.Mesh(new THREE.CircleGeometry(0.115, 24), k.toon(L.inner || L.colour || 0x999999));
          inside.rotation.x = -Math.PI / 2; inside.position.set(x, 0.0305, z); g.add(inside);
        });
        return { g, h: 0.03 };
      },
      /** Pickle chips: look { colour (the skin), inner (the cut face) }. */
      chips(part) {
        const L = k.lookFor(part), g = new THREE.Group();
        [[-0.14, 0.04], [0.02, -0.12], [0.15, 0.06], [0.0, 0.14]].forEach(([x, z], i) => {
          const c = k.ink(k.cyl(0.075, 0.016, 18), k.toon(L.colour)); c.position.set(x, 0.008 + (i % 2) * 0.004, z); g.add(c);
          const top = new THREE.Mesh(new THREE.CircleGeometry(0.055, 14), k.toon(L.inner !== undefined ? L.inner : 0xa9cf5a));
          top.rotation.x = -Math.PI / 2; top.position.set(x, 0.0172 + (i % 2) * 0.004, z); g.add(top);
        });
        return { g, h: 0.02 };
      },
      rings(part) {
        const L = k.lookFor(part), g = new THREE.Group();
        [[0.0, 0.0, 0.17], [0.09, 0.05, 0.12]].forEach(([x, z, r]) => {
          const t = k.ink(new THREE.TorusGeometry(r, 0.022, 10, 36), k.toon(L.colour));
          t.rotation.x = Math.PI / 2; t.position.set(x, 0.022, z); g.add(t);
        });
        return { g, h: 0.044 };
      },
      /** A squeeze-bottle sauce: the kit's bead (zigzag), waiting on the line in its bottle. */
      sauce: (part, o) => k.bead(part, o),
      plate() {
        const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.62, 0.035), new THREE.Vector2(0.64, 0.05), new THREE.Vector2(0.5, 0.025), new THREE.Vector2(0, 0.025)];
        const g = new THREE.Group();
        g.add(k.ink(new THREE.LatheGeometry(pts, k.seg(48)), k.toon(0xfbfaf4)));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.008, 6, k.seg(48)), k.toon(0x3d7fc4));
        rim.rotation.x = Math.PI / 2; rim.position.y = 0.04; g.add(rim);
        return { g, h: 0.025 };
      },
      fries(part, opts) {
        const g = new THREE.Group(), s = Math.max(0, k.stageIndex(part, opts)), L = k.lookFor(part);
        for (let i = 0, n = k.thin(22, 14); i < n; i++) {
          const f = k.ink(new THREE.BoxGeometry(0.035, 0.24, 0.035), k.toon(k.ramp(L, s, FRIED)));
          f.position.set(Math.cos(i * 2.4) * 0.12 * ((i % 4) / 4 + 0.3), 0.1, Math.sin(i * 2.4) * 0.1 * ((i % 3) / 3 + 0.3));
          f.rotation.set((i % 5 - 2) * 0.12, i, (i % 3 - 1) * 0.18);
          g.add(f);
        }
        return { g, h: 0.22 };
      },
      onionRings(part, opts) {
        const g = new THREE.Group(), s = Math.max(0, k.stageIndex(part, opts)), L = k.lookFor(part);
        // A little narrower than they were, so the pile stays inside the basket's wires and the boat's sides.
        for (let i = 0; i < 5; i++) {
          const t = k.ink(new THREE.TorusGeometry(0.09, 0.032, 10, 24), k.toon(k.ramp(L, s, FRIED)));
          t.rotation.x = Math.PI / 2 + (i % 2) * 0.4; t.position.set((i - 2) * 0.04, 0.04 + i * 0.03, (i % 2) * 0.04);
          g.add(t);
        }
        return { g, h: 0.2 };
      },
      /** Salt (anything shaken on): fine grains over the food under it, or a little pile on its own. Adds no height. */
      sprinkle(part, o) {
        const L = k.lookFor(part), g = new THREE.Group();
        const under = o && o.below ? o.below() : null;
        const box = under && !under.isEmpty() ? under.clone().translate(V(0, -((o && o.base) || 0), 0)) : null;
        const n = k.thin(L.count || 44, 18), seed = 'sprinkle:' + part.ing + ':' + (part.n || 0);
        const pts = box ? k.sample({ kind: 'box', box, inset: 0.8, depth: 0.06 }, n, seed) : k.sample({ kind: 'disc', r: 0.22, y: 0.006 }, n, seed);
        g.add(k.scatter('grain', k.toon(L.colour !== undefined ? L.colour : 0xffffff), pts, { outline: false, tilt: 1.6 }));
        return { g, h: 0 };
      },
      /** A paper cup, by the item's size (small, medium, large): white with two red bands. The drink and ice go
       *  inside it (the cup layout). -> { g, h, inner: the inside wall as [[r, y], ...] }. */
      cup(part, o) {
        const size = (o && o.item && o.item.size) || part.size || 'medium', C = cupOf(size);
        const rb = C.r * 0.78, g = new THREE.Group(), seg = k.seg(36);
        const outside = [[0, 0], [rb, 0], [C.r, C.h], [C.r + 0.007, C.h + 0.005], [C.r - 0.004, C.h + 0.011]];
        g.add(k.ink(k.lathe(outside, seg), k.toon(0xfbfaf4)));
        const ins = [[C.r - 0.004, C.h + 0.011], [C.r - WALL, C.h], [rb - WALL, 0.014], [0, 0.014]];
        g.add(new THREE.Mesh(k.lathe(ins, seg), k.toon(0xe7e1d3)));
        const rAt = y => rb + (C.r - rb) * (y / C.h) + 0.0025;
        [[0.42, 0.56], [0.64, 0.71]].forEach(([a, b]) => {
          const y0 = C.h * a, y1 = C.h * b;
          g.add(new THREE.Mesh(k.lathe([[rAt(y0), y0], [rAt(y1), y1]], seg), k.toon(0xd63a2f)));
        });
        return { g, h: C.h, inner: inner(C) };
      },
      /** Ice cubes: a few, as a little pile (in the cup they float or sit at the bottom; see the cup layout). */
      ice(part) {
        const g = cubes(5, 'ice:' + (part.n || 0), (i, R) => {
          const a = i * 2.4 + R(), r = i ? 0.07 : 0;
          return [Math.cos(a) * r, 0.034 + (i > 3 ? 0.06 : 0), Math.sin(a) * r];
        });
        return { g, h: 0.1 };
      },
      /** A drink on its own (a short pour, as in a cup with no walls): look { colour }. */
      drink(part) {
        const L = k.lookFor(part);
        return k.fill([[0.12, 0], [0.13, 0.06]], 1, L.colour !== undefined ? L.colour : 0x4a2412);
      },
      /** The fries' paper boat: red with a white rim (not a pack look: the boat layout puts fried food in it). */
      boat() {
        const g = new THREE.Group(), W = 0.56, D = 0.4, H = 0.11, t = 0.014;
        const floor = k.ink(new THREE.BoxGeometry(W, t, D), k.toon(0xf7f1e4));
        floor.position.y = t / 2; g.add(floor);
        [[0, D / 2, W, 0], [0, -D / 2, W, Math.PI], [W / 2, 0, D, -Math.PI / 2], [-W / 2, 0, D, Math.PI / 2]].forEach(([x, z, len, turn]) => {
          const w = new THREE.Group();
          const side = k.ink(new THREE.BoxGeometry(len, H, t), k.toon(0xd63a2f));
          side.position.y = H / 2;
          const band = new THREE.Mesh(new THREE.BoxGeometry(len, H * 0.22, t * 1.2), k.toon(0xfbfaf4));
          band.position.y = H * 0.86;
          w.add(side, band);
          w.position.set(x, t, z);
          w.rotation.y = turn;
          w.rotateX(0.22);                // the paper leans out
          g.add(w);
        });
        return { g, h: t };
      },
    };

    /* ── the fryer's wire basket ── */
    function basket() {
      const g = new THREE.Group(), W = 0.62, D = 0.42, H = 0.2, w = 0.011, steel = k.toon(0x5d656c);
      const bar = (x, y, z, sx, sy, sz) => { const b = k.inkThin(new THREE.BoxGeometry(sx, sy, sz), steel); b.position.set(x, y, z); g.add(b); };
      for (let i = 0; i <= 6; i++) bar(0, 0, -D / 2 + D * i / 6, W, w, w);                 // the bottom grid
      for (let i = 0; i <= 8; i++) bar(-W / 2 + W * i / 8, 0, 0, w, w, D);
      [H * 0.5, H].forEach(y => { bar(0, y, -D / 2, W, w, w); bar(0, y, D / 2, W, w, w); bar(-W / 2, y, 0, w, w, D); bar(W / 2, y, 0, w, w, D); });
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => bar(sx * W / 2, H / 2, sz * D / 2, w, H, w));
      for (let i = 1; i < 6; i++) { bar(-W / 2 + W * i / 6, H / 2, D / 2, w, H, w); bar(-W / 2 + W * i / 6, H / 2, -D / 2, w, H, w); }
      // The handle runs out to the right, low over the rim, its black grip at the end.
      const handle = k.ink(k.cyl(0.016, 0.42, 10), steel);
      handle.position.set(W / 2 + 0.2, H + 0.04, 0); handle.rotation.z = 1.38;
      const grip = k.ink(k.cyl(0.028, 0.18, 12), k.toon(0x1f1f1f));
      grip.position.set(W / 2 + 0.48, H + 0.08, 0); grip.rotation.z = 1.38;
      g.add(handle, grip);
      g.userData.basket = true;
      return g;
    }
    // The basket's bottom over the oil while it waits, and under it while it cooks (its rim just above the oil).
    const FRY_UP = 0.012, FRY_DOWN = -0.17;
    /** The fried food goes from the drained basket into the paper boat on the landing: straight up out of the basket's
     *  open top, across, and straight down into the boat (never through the wires or the boat's sides); then the boat
     *  is drawn with it in, exactly where it landed. */
    function intoBoat(c, s) {
      const f = c.F.getObjectByName('basketFood'), done = { stage: s.stage, cooking: false, served: true };
      if (!f) { c.redraw(done); return Promise.resolve(); }
      const R = c.anchors.rack, p0 = f.position.clone(), to = c.anchors.stack.clone().add(V(0, 0.014, 0));
      const top = R.position.y + 0.2 + 0.05;               // the food's bottom clear of the basket's rim (and the boat's)
      return k.tween(760, t => {
        if (t < 0.3) { const u = k.ease(t / 0.3); f.position.set(p0.x, p0.y + (top - p0.y) * u, p0.z); }
        else if (t < 0.68) {
          const u = k.ease((t - 0.3) / 0.38);
          f.position.set(p0.x + (to.x - p0.x) * u, top + Math.sin(u * Math.PI) * 0.05, p0.z + (to.z - p0.z) * u);
        } else { const u = (t - 0.68) / 0.32; f.position.set(to.x, top + (to.y - top) * u * u, to.z); }
      }).then(() => { c.redraw(done); });
    }
    /** Bubbles in the oil round the basket: they bubble, or sit still with Motion Reduced. */
    function bubbles(c) {
      const o = c.anchors.oil, R = k.rand('oil'), g = new THREE.Group();
      for (let i = 0; i < k.thin(14, 8); i++) {
        let x = o.x0 + (o.x1 - o.x0) * R(), z = o.z0 + (o.z1 - o.z0) * R();
        if (Math.abs(x - c.anchors.basket.x) < 0.36 && Math.abs(z - c.anchors.basket.z) < 0.25) x += x < c.anchors.basket.x ? -0.4 : 0.4;
        if (x < o.x0 || x > o.x1) continue;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.012 + R() * 0.012, 8, 6), k.toon(0xf7dc8a));
        b.position.set(x, o.y, z); b.scale.y = 0.6;
        g.add(b);
        k.spin(b, 'bubble', { phase: R() * 3, height: 0.025, speed: 1.4 + R() });
      }
      c.F.add(g);
    }

    /* ── the cooks ── */
    const cooks = {
      /** The grill: up to three of the ingredient in its slots (the middle, the left, the right). */
      grill: {
        show(c, s) {
          const slots = c.anchors.slots, n = s.n || 0;
          // A patty stays in the slot it went into: the middle, then the left, then the right (it used to jump from
          // the middle to an end when the second went on).
          const where = [1, 0, 2];
          for (let i = 0; i < Math.min(n, 3); i++) {
            const p = k.food({ ing: s.ing }, { stage: s.stage || 0 });
            p.g.position.copy(slots[where[i]]);
            c.F.add(p.g);
          }
        },
        /** One more goes on: it falls into place. */
        add(c, s) {
          c.redraw({ ing: s.ing, n: s.n, stage: 0 });
          const F = c.F, p = F.children[F.children.length - 1];
          if (!p || k.reduced()) return Promise.resolve();
          const y = p.position.y;
          return k.tween(260, t => { p.position.y = y + (1 - k.ease(t)) * 0.6; });
        },
        /** Simple cooking: a sizzle and a hop, a flip half way, then the doneness. */
        run(c, s) {
          const F = c.F, n = F.children.length;
          if (k.reduced() || !n) { c.redraw({ stage: s.stage }); return Promise.resolve(); }
          // Timed: the patties already show the stage they were taken off at; they only hop off the heat (Simple's
          // run would turn them half-raw again and cook them back).
          if (c.state.timed) {
            c.redraw({ stage: s.stage });
            const now = F.children.slice();
            return k.tween(300, t => now.forEach(p => { p.position.y = TOP + Math.sin(t * Math.PI) * 0.12; }));
          }
          const ms = s.ms || 1800, half = ms / 2;
          for (let i = 0; i < n * 3; i++) {
            const slot = c.anchors.slots[i % 3], p = k.puff(0xf4f4f4, 0.75);
            p.scale.setScalar(1.6);
            p.position.set(slot.x + (i % 2 ? 0.12 : -0.1), TOP + 0.12, slot.z);
            c.fx.add(p);
            k.spin(p, 'rise', { phase: i * 0.5, alpha: 0.75, height: 0.35, until: ms });
          }
          return k.tween(half, t => F.children.forEach(p => { p.position.y = TOP + Math.sin(t * Math.PI * 4) * 0.008; }))
            .then(() => {
              c.redraw({ stage: Math.max(1, Math.round(s.stage / 2)) });
              const now = F.children.slice();
              return k.tween(380, t => now.forEach(p => { p.position.y = TOP + Math.sin(t * Math.PI) * 0.32; p.rotation.x = t * Math.PI; }));
            })
            .then(() => { c.redraw({ stage: s.stage }); return k.wait(half - 380); });
        },
      },
      /** The fryer (playtest audit 2026-11-11): its wire basket belongs to the set, so it hangs over the oil the whole
       *  time and is still there while the food is salted (it used to vanish, and the food jumped into a boat). An
       *  empty paper boat waits on the landing. Cooking lowers the basket into the oil (the food under it, its top
       *  showing); taking it off lifts it out to drain, and the food goes up out of the basket's open top, across and
       *  down into the boat: the same boat, food and place the salt step and the counter draw. */
      fryer: {
        show(c, s) {
          const R = c.anchors.rack, at = c.anchors.basket;
          const want = at.y + (s.cooking ? FRY_DOWN : FRY_UP);
          R.position.x = at.x; R.position.z = at.z; R.rotation.set(0, 0, 0);
          if (Math.abs(R.position.y - want) > 1e-4 && !k.reduced()) {
            // The basket goes down into the oil or comes up out of it; the food in it goes with it.
            const y0 = R.position.y;
            R.userData.moving = k.tween(320, t => {
              const y = y0 + (want - y0) * k.ease(t);
              R.position.y = y;
              const f = c.F.getObjectByName('basketFood');
              if (f) f.position.y = y + 0.014;
            });
          } else { R.position.y = want; R.userData.moving = null; }
          if (s.ing && !s.served) {
            const f = k.food({ ing: s.ing }, { stage: s.stage || 0 });
            f.g.position.set(at.x - 0.02, R.position.y + 0.014, at.z);
            f.g.scale.setScalar(FRIED_SCALE);
            f.g.name = 'basketFood';
            c.F.add(f.g);
          }
          // The paper boat on the landing: empty, or with the food in it once it is out of the oil.
          const b = s.ing && s.served ? layouts.boat({ ing: s.ing, parts: [] }, { stage: s.stage || 0 }) : shapes.boat();
          b.g.position.copy(c.anchors.stack);
          b.g.name = 'boat';
          c.F.add(b.g);
          if (s.cooking) bubbles(c);
        },
        /** The pick drops the food into the basket's open top. */
        add(c, s) {
          c.redraw({ ing: s.ing, n: 1, stage: 0, cooking: false, served: false });
          const f = c.F.getObjectByName('basketFood');
          if (!f || k.reduced()) return Promise.resolve();
          const y = f.position.y;
          return k.tween(280, t => { f.position.y = y + (1 - k.ease(t)) * 0.5; });
        },
        /** Simple cooking: the basket goes down into the oil and bubbles, the food browns. Timed: it is already down
         *  at the stage it was lifted at. Then the basket comes up and drains, and the food goes into the boat. */
        run(c, s) {
          if (k.reduced()) { c.redraw({ stage: s.stage, cooking: false, served: true }); return Promise.resolve(); }
          const ms = s.ms || 1800, R = c.anchors.rack;
          const cooked = c.state.timed ? Promise.resolve(c.redraw({ stage: s.stage, cooking: true }))
            : Promise.resolve(c.redraw({ stage: 0, cooking: true }))
              .then(() => k.wait(Math.max(420, ms * 0.4)))
              .then(() => { c.redraw({ stage: Math.max(1, Math.round(s.stage / 2)), cooking: true }); return k.wait(ms * 0.3); });
          return cooked
            .then(() => { c.redraw({ stage: s.stage, cooking: false }); return R.userData.moving; })
            .then(() => {
              // A shake to drain it.
              const x0 = R.position.x;
              return k.tween(260, t => {
                const dx = Math.sin(t * Math.PI * 6) * 0.012 * (1 - t);
                R.position.x = x0 + dx;
                const f = c.F.getObjectByName('basketFood');
                if (f) f.position.x = c.anchors.basket.x - 0.02 + dx;
              }).then(() => { R.position.x = x0; });
            })
            .then(() => intoBoat(c, s));
        },
        stage(c, s) { c.redraw({ stage: s.stage, cooking: true }); },
      },
    };

    /* ── the line: how a few things wait and go on ── */
    // Playtest audit (2026-11-11): nothing passes through the cup; what goes in lands where it then stays, and looks
    // the same at the drinks station, the review and the counter.
    const SCOOP = 1.4, TIP = 0.6;               // the scoop's size, and how far it tips (its mouth well over the rim)
    /** The ice scoop: a steel half-pipe, open at the front (left, toward the cup), closed at the back where the
     *  handle is, heaped with exactly the cubes that go into the cup (n), at their own size. */
    function scoop(part, n) {
      const g = new THREE.Group(), steel = k.toon(0xc3cbd2);
      const bowl = k.ink(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 18, 1, true, Math.PI, Math.PI), k.toon(0xc3cbd2, { side: THREE.DoubleSide }));
      bowl.rotation.z = Math.PI / 2; bowl.position.y = 0.1;
      const end = k.ink(new THREE.CircleGeometry(0.1, 18, Math.PI, Math.PI), k.toon(0xc3cbd2, { side: THREE.DoubleSide }));
      end.rotation.y = Math.PI / 2; end.position.set(0.12, 0.1, 0);
      const handle = k.ink(k.cyl(0.018, 0.2, 10), steel);
      handle.rotation.z = Math.PI / 2; handle.position.set(0.21, 0.1, 0);
      g.add(bowl, end, handle);
      // Two layers of cubes in the bowl (true size: the scoop's scale is undone for them).
      const spots = [];
      [-0.12, -0.04, 0.04, 0.12].forEach(x => [-0.042, 0.042].forEach(z => spots.push([x, 0.062, z])));
      [-0.08, 0, 0.08].forEach(x => [-0.05, 0.05].forEach(z => spots.push([x, 0.13, z])));
      const ice = cubes(Math.min(n || 4, spots.length), 'scoop', i => spots[i]);
      ice.scale.setScalar(1 / SCOOP);
      ice.name = 'scooped';
      g.add(ice);
      g.scale.setScalar(SCOOP);
      g.userData.part = part;
      g.userData.mouth = V(-0.12 * SCOOP, 0.07 * SCOOP, 0);
      return { g, h: 0.2 * SCOOP };
    }
    /** Where a thing tipped over the cup stands: a point over the cup's opening, in F, `up` above its rim. */
    function overRim(c, up, item) {
      const b = item || c.item;
      if (!b || !b.rim) return null;
      return c.toF(b.g, V(0, b.rim + up, 0));
    }
    /** The pitcher every drink is poured from (playtest 2026-11-11, the Cafe's milk jugs: one open container per kind
     *  of liquid, never a prop per value): an open white diner pitcher with a spout, the drink showing inside its open
     *  top, a band of the drink's colour round it with a white mark. The fountain's taps are painted far behind the
     *  counter the cup stands on, so a stream from them came out of nothing. */
    const PITCHER = { S: 1.25, mouth: V(-0.15, 0.272, 0), lean: 1.2 };
    function pitcher(colour) {
      const g = new THREE.Group(), white = k.toon(0xeef1f3);
      g.add(k.ink(k.lathe([[0, 0], [0.095, 0], [0.1, 0.012], [0.112, 0.26], [0.118, 0.27]], k.seg(28)), white));
      g.add(new THREE.Mesh(k.lathe([[0.118, 0.27], [0.105, 0.262], [0.093, 0.014], [0, 0.014]], k.seg(28)), k.toon(0xc9d0d6, { side: THREE.DoubleSide })));
      const liq = k.fill([[0.092, 0.016], [0.103, 0.25]], 0.72, colour, { seg: 24 });
      liq.g.name = 'liquid';
      g.add(liq.g);
      const spout = k.inkThin(new THREE.ConeGeometry(0.04, 0.09, 4).rotateY(Math.PI / 4).rotateZ(Math.PI / 2), white);
      spout.position.set(-0.118, 0.262, 0); spout.scale.set(1, 0.42, 1);
      g.add(spout);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.1072, 0.1065, 0.06, 28, 1, true), k.toon(colour));
      band.position.y = 0.11;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), k.toon(0xffffff));
      dot.position.set(0, 0.11, 0.1085);
      const handle = k.ink(new THREE.TorusGeometry(0.075, 0.014, 6, 14, Math.PI), white);
      handle.rotation.z = -Math.PI / 2; handle.position.set(0.108, 0.15, 0);
      g.add(band, dot, handle);
      g.scale.setScalar(PITCHER.S);
      g.name = 'pitcher';
      return g;
    }
    /** A drink is picked: the pitcher of it comes in from the right at pouring height, tips its spout over the cup's
     *  opening and pours (the stream lands on the drink, or on the ice while the drink is under it), tips back and
     *  goes; then the straw drops in. b: the cup's build at level 0. */
    function pitcherPour(c, b, made, colour) {
      if (!b || !b.setLevel) return Promise.resolve();
      const P = pitcher(colour), spoutAt = overRim(c, 0.1, b).add(V(-0.03, 0, 0));
      const off = PITCHER.mouth.clone().multiplyScalar(PITCHER.S).applyEuler(new THREE.Euler(0, 0, PITCHER.lean));
      const pose = spoutAt.clone().sub(off), from = pose.clone().add(V(1.7, 0, 0));
      P.position.copy(from);
      c.F.add(P);
      const liquid = P.getObjectByName('liquid');
      const floor = b.iceTop !== undefined ? c.toF(b.g, V(0, b.iceTop, 0)).y : -Infinity;
      const land = t => { const s = c.toF(b.g, b.surface(t)); return V(spoutAt.x, Math.max(s.y, floor), spoutAt.z); };
      return k.tween(340, t => { P.position.lerpVectors(from, pose, k.ease(t)); })
        .then(() => k.tween(280, t => { P.rotation.z = PITCHER.lean * k.ease(t); if (liquid) liquid.visible = t < 0.4; }))
        .then(() => k.pour({ F: c.F, from: spoutAt, to: land, colour, ms: 950, onApply: c.onApply, onLevel: t => b.setLevel(Math.min(t, 0.999)) }))   // the straw goes in after
        .then(() => k.tween(260, t => { P.rotation.z = PITCHER.lean * (1 - k.ease(t)); if (liquid) liquid.visible = t > 0.6; }))
        .then(() => k.tween(300, t => { P.position.lerpVectors(pose, from, k.ease(t)); }))
        .then(() => {
          c.F.remove(P);
          k.free(P);
          const nb = c.showItem(made), st = nb && nb.g.getObjectByName('straw');
          if (!st) return null;
          const y = st.position.y;
          return k.tween(240, t => { st.position.y = y + (1 - k.ease(t)) * 0.4; });
        });
    }
    /** How many of each the burger's "each" slice goes on (one slice of cheese per patty). */
    const eachCount = (part, made) => {
      const I = (k.pack().ingredients || {})[part.ing] || {};
      return I.each && made ? Math.max(1, (made.parts || []).filter(p => p.ing === I.each).length) : 1;
    };
    const lines = {
      /** Ice: a steel scoop heaped with the cupful. Add: it comes over the cup, its open front tips down over the
       *  opening, and the cubes slide out of it and fall through the opening to where they then stay. */
      scoop: {
        incoming: (part, c) => Object.assign(scoop(part, c && c.item && c.item.iceCount), { rest: 0.045 }),
        add(c) {
          const inc = c.inc, b = c.item, over = overRim(c, 0.25);
          if (!inc || !over || !b.ice) { if (c.onApply) c.onApply(); return Promise.resolve(); }
          const from = inc.position.clone(), pose = over.clone().add(V(0.16, 0, 0)), up = V(from.x, pose.y, from.z);
          return k.tween(200, t => { inc.position.lerpVectors(from, up, k.ease(t)); })
            .then(() => k.tween(260, t => { inc.position.lerpVectors(up, pose, k.ease(t)); }))
            .then(() => k.tween(260, t => { inc.rotation.z = TIP * k.ease(t); }))
            .then(() => {
              if (c.onApply) c.onApply();
              // The cubes, as the cup will have them, start where they sit in the scoop.
              const held = inc.getObjectByName('scooped'), cup = b.ice();
              cup.name = 'falling';
              b.g.add(cup);
              b.g.updateMatrixWorld(true);
              inc.updateMatrixWorld(true);
              const inv = new THREE.Matrix4().copy(cup.matrixWorld).invert(), m = new THREE.Matrix4();
              const mouth = c.toF(inc, inc.userData.mouth.clone().divideScalar(SCOOP));
              const mid = b.g.worldToLocal(c.F.localToWorld(mouth.clone()));
              const qs = cup.children.map((q, i) => {
                const h = held && held.children[i];
                const s = { p: q.position.clone(), q: q.quaternion.clone() };
                if (h) {
                  m.multiplyMatrices(inv, h.matrixWorld);
                  const sp = new THREE.Vector3(), sq = new THREE.Quaternion(), ss = new THREE.Vector3();
                  m.decompose(sp, sq, ss);
                  s.sp = sp; s.sq = sq;
                } else { s.sp = mid.clone(); s.sq = q.quaternion.clone(); }
                q.position.copy(s.sp); q.quaternion.copy(s.sq);
                return s;
              });
              if (held) held.visible = false;
              const n = qs.length, each = 340, gap = 30, total = each + gap * (n - 1);
              return k.tween(total, t => {
                const now = t * total;
                cup.children.forEach((q, i) => {
                  const s = qs[i], u = Math.max(0, Math.min(1, (now - i * gap) / each));
                  // Out of the scoop's mouth (the first third), then straight down through the opening.
                  const m2 = V(mid.x + (i % 3 - 1) * 0.012, mid.y, mid.z + ((i >> 1) % 3 - 1) * 0.012);
                  if (u < 0.35) q.position.lerpVectors(s.sp, m2, k.ease(u / 0.35));
                  else { const v = (u - 0.35) / 0.65; q.position.lerpVectors(m2, s.p, v * v); }
                  q.quaternion.slerpQuaternions(s.sq, s.q, u);
                });
              });
            })
            .then(() => k.tween(220, t => { inc.rotation.z = TIP * (1 - k.ease(t)); }))
            .then(() => { const p0 = inc.position.clone(); return k.tween(280, t => { inc.position.set(p0.x + k.ease(t) * 2.2, p0.y, p0.z); }); });
        },
      },
      /** A slice that goes on each patty (cheese): one slice for each, stacked on the line as they will lie on the
       *  burger (on top of the patties), and they go on together. */
      slices: {
        incoming(part, c) {
          const g = new THREE.Group(), n = eachCount(part, c && c.made);
          let h = 0;
          for (let i = 0; i < n; i++) { const f = k.food(Object.assign({}, part, { n: i }), { flat: true }); f.g.position.y = h; g.add(f.g); h += f.h; }
          g.userData.part = part;
          return { g, h, rest: 0.04 };
        },
        add(c) {
          const inc = c.inc, from = inc.position.clone(), to = c.top();
          return k.tween(360, t => { inc.position.lerpVectors(from, to, k.ease(t)); inc.position.y += Math.sin(t * Math.PI) * 0.35; })
            .then(() => { if (c.onApply) c.onApply(); });
        },
      },
    };

    /* ── the burger's stack ── */
    /** The parts with every "each" slice moved up to lie just over the last of what it goes on (the cheese on top of
     *  the patties), in the order they came. */
    function eachOnTop(parts) {
      const I = k.pack().ingredients || {};
      const target = p => { const t = I[p.ing] && I[p.ing].each; return t && parts.some(q => q.ing === t) ? t : null; };
      const out = parts.filter(p => !target(p));
      parts.filter(target).forEach(p => {
        const t = target(p);
        let at = -1;
        out.forEach((q, i) => { if (q.ing === t || target(q) === t) at = i; });
        out.splice(at + 1, 0, p);
      });
      return out;
    }
    /** k.stack, but a sauce lies on the last solid layer and adds no height, the cap sits down over the sauces, and a
     *  slice is turned by its place among slices of its kind (the first lies as the line showed it). */
    function burgerStack(parts, o) {
      const g = new THREE.Group(), I = k.pack().ingredients || {}, seen = {};
      let h = 0, sauced = false;
      parts.forEach((p, i) => {
        const L = k.lookFor(p), sauce = !!((I[p.ing] || {}).sauce || L.shape === 'sauce');
        seen[p.ing] = (seen[p.ing] || 0) + 1;
        const n = L.shape === 'slice' ? seen[p.ing] - 1 : i;
        const base = p.layer === 'top' && sauced ? h + 0.006 : h, sofar = g;
        const f = k.food(Object.assign({ n }, p), Object.assign({}, o, { base, below: () => k.boxOf(sofar) }));
        f.g.position.y = base;
        g.add(f.g);
        if (sauce) sauced = true;
        else { h = base + f.h; sauced = false; }
      });
      g.userData.h = h;
      return g;
    }

    /* ── layouts: the drink in its cup, fried food in its paper boat ── */
    const STRAW = [0xd63a2f, 0xfbfaf4];
    const layouts = {
      /** A cup of the item's size, the drink inside it (o.level: how full, 0 to 1), ice floating on it (in an
       *  empty cup, a cupful), a straw once it is poured. -> { g, h, setLevel(t), surface(t) }. */
      cup(made, o) {
        const g = new THREE.Group(), P = k.pack(), R = (P.recipes || {})[made.recipe];
        const asksSize = R && R.stations.some(sid => ((P.stations[sid] || {}).steps || []).some(s => s.kind === 'pick' && (s.of === 'size' || s.slot === 'size')));
        if (asksSize && !made.size) return { g, h: 0, setLevel() {}, surface: () => V(0, 0, 0) };   // no cup until a size is picked
        const C = cupOf(made.size), cup = k.food({ ing: made.ing, size: made.size || 'medium' }, Object.assign({}, o, { item: made }));
        g.add(cup.g);
        const parts = made.parts || [];
        const drink = parts.find(p => k.lookFor(p).shape === 'drink' || p.flavour);
        const icePart = parts.find(p => k.lookFor(p).shape === 'ice');
        const prof = (cup.inner || inner(C)).map(([r, y]) => [r - 0.003, y + 0.002]), FULL = 0.82;
        const fillG = new THREE.Group(), iceG = new THREE.Group(), strawG = new THREE.Group();
        g.add(fillG, iceG, strawG);
        const surfaceY = t => prof[0][1] + (prof[1][1] - prof[0][1]) * FULL * t;
        // The ice: a cupful, packed from where the drink's surface will be down (two hidden layers under the top one),
        // so it is the same before, during and after the pour (it used to sit high in the empty cup, then drop to
        // the bottom and float back up as the drink came in). Lowest layers first: the order the scoop drops them.
        const ICE_Y = surfaceY(1) - 0.02, low = k.thin(4, 3), topN = k.thin(6, 4);
        function iceGroup() {
          const spots = [];
          [ICE_Y - 0.13, ICE_Y - 0.065].forEach((y, l) => {
            const r = k.radiusAt(prof, y) * 0.5;
            for (let i = 0; i < low; i++) { const a = (i / low) * Math.PI * 2 + l * 0.8; spots.push([Math.cos(a) * r, y, Math.sin(a) * r]); }
          });
          const r = k.radiusAt(prof, ICE_Y) * 0.55;
          const Rn = k.rand('cup-ice-top');
          for (let i = 0; i < topN; i++) { const a = i * 2.2 + Rn(); spots.push([Math.cos(a) * r * (0.4 + Rn() * 0.6), ICE_Y + (i % 3) * 0.006, Math.sin(a) * r * (0.4 + Rn() * 0.6)]); }
          const ice = cubes(spots.length, 'cup-ice', i => spots[i]);
          if (icePart && icePart.gross) k.gross(ice, icePart.gross);
          return ice;
        }
        if (icePart) iceG.add(iceGroup());
        function setLevel(t) {
          [fillG, strawG].forEach(x => { while (x.children.length) k.free(x.children[0]); });
          const lvl = drink ? t : 0;
          if (drink && lvl > 0) fillG.add(k.fill(prof, FULL * lvl, k.lookFor(drink).colour).g);
          if (drink && lvl >= 1) {
            // A striped straw standing in it, its top well clear of the rim whatever the size.
            const st = new THREE.Group();
            for (let i = 0; i < 4; i++) {
              const s = new THREE.Mesh(k.cyl(0.012, 0.1, 10), k.toon(STRAW[i % 2]));
              s.position.y = 0.05 + i * 0.1;
              st.add(s);
            }
            st.position.set(0.03, C.h - 0.27, -0.02); st.rotation.set(0.12, 0, -0.24);
            st.name = 'straw';
            strawG.add(st);
          }
        }
        setLevel(o && o.level !== undefined ? o.level : 1);
        if (drink && drink.gross) k.gross(fillG, drink.gross);
        // rim: the top of the cup; ice(): the cupful as it lies in the cup (the scoop drops these); iceTop: where a
        // pour lands while the drink is still under the ice.
        return { g, h: C.h, setLevel, surface: t => V(0, surfaceY(t), 0), rim: C.h + 0.011, ice: iceGroup,
          iceCount: 2 * low + topN, iceTop: icePart ? ICE_Y + 0.04 : undefined };
      },
      /** A burger on its plate (playtest audit 2026-11-11): what goes on stays where it went on. A slice that goes on
       *  "each" patty (cheese) lies on top of the patties, one for each, where the Add put it (drawn between them,
       *  the patties jumped up after it landed). Sauces lie on what is under them and add no height (a second and
       *  third bead floated over the gaps), and the top bun sits down on them (it hovered over the beads). */
      burger(made, o) {
        const m = Object.assign({}, made, { parts: eachOnTop(made.parts || []) });
        const seq = k.sequence(m, o), g = new THREE.Group();
        let h = 0, vessel = null;
        if (seq.vessel) {
          const v = k.food(seq.vessel, o);
          if (o.vesselScale) v.g.scale.set(o.vesselScale[0], o.vesselScale[1], o.vesselScale[2]);
          g.add(v.g); h = v.h; vessel = v.g;
        }
        const s = burgerStack((seq.body ? [seq.body] : []).concat(seq.parts), o);
        s.position.y = h;
        if (o.contentScale) s.scale.setScalar(o.contentScale);
        s.name = 'stack';
        g.add(s);
        return { g, h: h + s.userData.h * (o.contentScale || 1), stack: s, vessel };
      },
      /** Fried food in a paper boat, with whatever is shaken on it on top. */
      boat(made, o) {
        const seq = k.sequence(made, o), g = new THREE.Group();
        const b = shapes.boat();
        g.add(b.g);
        const s = k.stack((seq.body ? [seq.body] : []).concat(seq.parts), o);
        s.position.y = b.h;
        s.scale.setScalar(FRIED_SCALE);
        s.name = 'stack';
        g.add(s);
        return { g, h: b.h + s.userData.h * FRIED_SCALE, stack: s };
      },
    };

    /* ── the sets, by backdrop name ── */
    // Kitchen cameras: the food low and left of centre, the controls on the right. `line` is where the backdrop's
    // painted surface starts, measured from each picture (art-source/backdrops: grill and board at 64%, the fryer's
    // back rim at 65.7%, the drinks counter at 63.2%); world.js shifts the lens so `surface.back` lands on it.
    // The counter (spec 5.2, revised 2026-11-09): solved like a station, so the counter top's back edge lands on the
    // picture's line at 80% (every restaurant's counter picture keeps its painted queue above it) and the counter
    // never covers the customers waiting in the background. The page reads that line (BB.world.counterLine) and
    // stands the served customer just behind it. The camera sits low, a little above the counter top, so the order
    // on it stays on screen even at 21:9, where only the top's back strip is in view.
    const COUNTER_TOP = 0.92, COUNTER_BACK = -0.3;
    const sets = {
      counter: {
        x: 12, line: 0.80, surface: { y: COUNTER_TOP, back: COUNTER_BACK },
        cam: { pos: [0, 1.18, 4.2], at: [0, 1.02, -0.3], fov: 42 },
        build(g) {
          // The Burger Bar's counter as the court picture draws it: a steel top with a chrome nosing, a cherry-red
          // panel with chrome bands (the side the cook sees).
          const T = COUNTER_TOP, depth = 1.6, z0 = COUNTER_BACK + depth / 2, near = COUNTER_BACK + depth;
          const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, depth), k.toon(0xc9d1d8)); top.position.set(0, T - 0.05, z0); g.add(top);
          const nose = new THREE.Mesh(new THREE.BoxGeometry(9, 0.07, 0.07), k.toon(0xeef2f5)); nose.position.set(0, T - 0.035, near + 0.015); g.add(nose);
          const panel = new THREE.Mesh(new THREE.BoxGeometry(9, T - 0.07, 0.08), k.toon(0xd0262a)); panel.position.set(0, (T - 0.07) / 2, near); g.add(panel);
          [T - 0.16, 0.12].forEach(y => { const band = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.02), k.toon(0xe3e8ec)); band.position.set(0, y, near + 0.05); g.add(band); });
          // spots[0]: one item, its far side at the back edge, to the right of the customer's face (a child's too:
          // Kai shows his head and shoulders above the counter). row: the depth several items sit at. back..front:
          // the counter top (world.js keeps the order short of where a wide window cuts the top off). minX..maxX:
          // clear of the Pause sign (minScreenX: world.js works minX out for the window; -1.45 is a 4:3 one's) and
          // left of the counter picture's own painted queue (world.js clamps maxX from BBArt.diner.counter's queue[0]
          // for the window, anchors.maxScreenX: 2b-seams, 2026-11-09; 0.6 only bounds it). Several items (never a
          // child's order: Kai orders one) may stand in front of the customer. The plates are a size smaller than
          // the board's.
          // (2b-seams: at 4:3 the picture's own queue (maxX, at the item's near side) holds a plate's right rim, so
          // the plate is 0.75 (was 0.85): a burger on it then sits right of Kai's face; the burger keeps its size.)
          return { spots: [V(-0.42, T, 0.28)], row: 0.28, contentScale: 0.9, vesselScale: [0.75, 1, 0.75],
            back: COUNTER_BACK + 0.02, front: near - 0.02, minX: -1.45, maxX: 0.6, minScreenX: 0.14 };
        },
      },
      grill: {
        x: -12, line: 0.64, surface: { y: TOP, back: -0.3 }, cook: 'grill',
        cam: { pos: [0.324, 2.911, 4.002], at: [0.324, 1.115, 0.15], fov: 30 },
        build(g) {
          // A dark steel cooking plate with raised bars along it.
          const plate = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.9), k.toon(0x2c2c30)); plate.position.set(0, TOP - 0.06, 0.65); g.add(plate);
          for (let i = 0; i < 10; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(7, 0.012, 0.035), k.toon(0x45454b)); bar.position.set(0, TOP + 0.006, -0.22 + i * 0.2); g.add(bar); }
          const lip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.16, 0.12), k.toon(0x9aa3ab)); lip.position.set(0, TOP - 0.02, 1.62); g.add(lip);
          return { slots: [-0.75, 0, 0.75].map(x => V(x, TOP, 0.15)), surface: TOP };
        },
      },
      board: {
        x: 0, line: 0.64, surface: { y: TOP, back: -0.5 },
        cam: { pos: [0.329, 2.573, 3.277], at: [0.329, 1.115, 0.15], fov: 30 },
        build(g) {
          // Butcher block.
          const block = new THREE.Mesh(new THREE.BoxGeometry(7, 0.14, 2.0), k.toon(0xc98f53)); block.position.set(0, TOP - 0.07, 0.5); g.add(block);
          for (let i = 0; i < 9; i++) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.142, 2.0), k.toon(0xa86f3a)); seam.position.set(-3.2 + i * 0.8, TOP - 0.07, 0.5); g.add(seam); }
          // The line: a flat steel tray to the right of the burger, where each ingredient waits, lying on it (the tray
          // was tilted and what waited hovered over it).
          const slide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.62), k.toon(0xb8c1c8)); slide.position.set(1.0, TOP + 0.02, 0.15); g.add(slide);
          return { stack: V(0, TOP, 0.15), incoming: V(0.98, TOP + 0.056, 0.15), surface: TOP, vesselScale: [0.8, 1, 0.8], giantMax: 1.2 };
        },
      },
      fryer: {
        x: 24, line: 0.657, surface: { y: TOP, back: -0.5 }, cook: 'fryer',
        // Lower than the board's, so the oil (back) and the landing (front) both fit: depth is squashed a little.
        cam: { pos: [0.329, 2.1, 3.4], at: [0.329, 1.0, 0.1], fov: 30 },
        build(g) {
          // The fryer's steel top: the oil well across the back, a landing in front where the food is salted.
          const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 2.1), k.toon(0x8e979e)); top.position.set(0, TOP - 0.06, 0.55); g.add(top);
          const oil = { x0: -1.4, x1: 1.25, z0: -0.46, z1: 0.1, y: TOP + 0.006 };
          const well = new THREE.Mesh(new THREE.BoxGeometry(oil.x1 - oil.x0, 0.008, oil.z1 - oil.z0), k.toon(0xb57a1f));
          well.position.set((oil.x0 + oil.x1) / 2, TOP + 0.002, (oil.z0 + oil.z1) / 2); g.add(well);
          const rim = k.toon(0xbfc7ce), cx = (oil.x0 + oil.x1) / 2, cz = (oil.z0 + oil.z1) / 2;
          [[cx, oil.z1 + 0.025, oil.x1 - oil.x0 + 0.1, 0.05], [cx, oil.z0 - 0.02, oil.x1 - oil.x0 + 0.1, 0.04]].forEach(([x, z, w, d]) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), rim); m.position.set(x, TOP + 0.015, z); g.add(m);
          });
          [oil.x0 - 0.025, oil.x1 + 0.025].forEach(x => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, oil.z1 - oil.z0), rim); m.position.set(x, TOP + 0.015, cz); g.add(m); });
          const lip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.16, 0.12), k.toon(0x9aa3ab)); lip.position.set(0, TOP - 0.02, 1.62); g.add(lip);
          // The line: a steel slide to the right of the landing.
          const slide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.5), k.toon(0xb8c1c8)); slide.position.set(1.0, TOP + 0.02, 0.38); g.add(slide);
          // The wire basket hangs over the oil: part of the set, so it stays while the food is salted (the cook moves it).
          const at = V(-0.05, TOP, -0.19), rack = basket();
          rack.position.set(at.x, at.y + FRY_UP, at.z);
          g.add(rack);
          return { basket: at, rack, stack: V(0, TOP, 0.36), incoming: V(0.98, TOP + 0.056, 0.38), surface: TOP, oil };
        },
      },
      drinks: {
        x: 36, line: 0.632, surface: { y: TOP, back: -0.5 },
        cam: { pos: [0.329, 2.573, 3.277], at: [0.329, 1.115, 0.15], fov: 30 },
        build(g) {
          // The drink counter: flat red, like the painted one, with a steel drip tray and the line's slide.
          const top = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 2.0), k.toon(0xd21a26)); top.position.set(0, TOP - 0.06, 0.5); g.add(top);
          const tray = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.46), k.toon(0xaab3ba)); tray.position.set(0, TOP + 0.006, 0.15); g.add(tray);
          for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.018), k.toon(0x6c757c)); s.position.set(0, TOP + 0.013, 0.15 - 0.18 + i * 0.06); g.add(s); }
          const slide = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.62), k.toon(0xb8c1c8)); slide.position.set(1.0, TOP + 0.02, 0.15); g.add(slide);
          return { stack: V(0, TOP + 0.012, 0.15), incoming: V(0.98, TOP + 0.056, 0.15), surface: TOP };
        },
        /** A size: the cup drops onto the tray. A drink: the pitcher of it pours into the cup, then the straw. */
        pick(c, e, made) {
          const L = k.lookOf(e.value);
          if (L.shape === 'drink') {
            if (k.reduced()) { const b = c.showItem(made); if (c.onApply) c.onApply(); return Promise.resolve(b); }
            return pitcherPour(c, c.showItem(made, { level: 0 }), made, L.colour);
          }
          const b = c.showItem(made);
          if (c.onApply) c.onApply();
          return b ? c.drop(b.g, 0.5, 260) : Promise.resolve();
        },
      },
    };

    /* ── the counter: one, two or three items, clear of the customer and the register ── */
    const counter = {
      /** One item where it has always sat; two or three: null, so world.js sets them side by side across the clear
       *  span (minX..maxX: clear of the customer and of the register), as wide as each is. */
      arrange(n, items, anchors) { return n <= 1 ? [{ p: anchors.spots[0].clone(), s: 1 }] : null; },
    };

    return {
      shapes, sets, cooks, lines, layouts, counter,
      layoutOf(made) {
        const L = made.ing ? k.lookOf(made.ing) : null;
        if (L && L.shape === 'cup') return 'cup';
        if (L && (L.shape === 'fries' || L.shape === 'onionRings')) return 'boat';
        if (L && L.shape === 'plate') return 'burger';
        return null;
      },
      // How an incoming ingredient waits and goes on, by its look's shape (look.apply wins).
      applies: { sauce: 'squirt', sprinkle: 'shake', ice: 'scoop', slice: 'slices' },
      // Doneness colours by stage, for the dial plates (world.colourOf) and the builders.
      ramps: { patty: PATTY, fries: FRIED, onionRings: FRIED },
    };
  });
  return food;
});
