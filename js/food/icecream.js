/** Ben's Food Court - Ben's Ice Cream Emporium's food in 3D (docs/api/food.md section 14 walks through this file;
 *  docs/api/packs/icecream.md section 10 is the list of looks it draws).
 *
 *  The same toon style as the Burger Bar and the Pizza Parlor: chunky cel-shaded food with ink outlines. An ice
 *  cream is a holder (a cake cone or a waffle cone in a chrome cone stand, a pink-and-white striped cup, the banana
 *  split's glass boat, an actual kitchen sink), its scoops (each a ball with the scooper's curls and a ruffled skirt
 *  where it sits, in its flavour's colour with its flecks or chunks; vanilla gets vanilla-bean specks so it never
 *  reads as whipped cream), then the toppings ON the scoops: sprinkles and nuts on the scoops' own surface
 *  (k.surfaceOf), the sauces as a glossy cap that runs down the sides in drips, a piped swirl of cream and a cherry
 *  on the crown. One layout (`scoopItem`) draws every scoop recipe: it places the scoops for its holder (stacked on a
 *  cone, side by side then stacked in a cup, in a row in the boat, heaped in the sink) and hands the toppings the
 *  tops and crowns. A milkshake is the steel mixing cup on a mint-green mixer until it is poured, then the tall
 *  fluted glass with a striped straw (`shakeItem`).
 *
 *  Cooking is a size and a thickness, never a doneness, and each shows as a size or a surface AND a mark AND a
 *  colour (ACCESSIBILITY.md 9): the scoop grows in the scooper over the tubs, with flat sizing rings under it (none at
 *  Scrape, one at Small, two at Regular, three at Huge, four red ones at Avalanche, when it slumps and drips); the
 *  rings' colours are the size plates' swatches (`ramps.scoopBall`). The shake's surface: lumps of ice cream in milk,
 *  a stiff dome with peaks, a smooth top with a swirl, a flat thin top with bubbles, then a low, pale melted puddle
 *  with a ring where it was.
 *
 *  Sets, by backdrop name: counter (spec 5.2: line 0.80, a cream marble top with the pink edge), scoop (the freezer
 *  case: the steel ledge measured at 62.2%; cook 'scoop') and toppings (the marble bar measured at 64.8%; the shake
 *  machine's cook 'shake' happens here too, on a 3D mixer drawn only while the shake is in its steel cup, since the
 *  painted one stands under the page's answer column).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./kit.js'));
  else factory(root.BB.food);
})(typeof window === 'undefined' ? globalThis : window, function (food) {
  'use strict';
  food.register('icecream', k => {
    const THREE = k.THREE;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const P0 = () => Promise.resolve();
    const TOP = 0.5;                       // every kitchen work surface's height (as the diner's)
    const R0 = 0.1;                        // a scoop's radius at size 1 (a regular scoop is 0.9 of it)
    const SIZES = ['scrape', 'small', 'regular', 'huge', 'avalanche'];
    const SIZE_SCALE = [0.35, 0.7, 0.9, 1.15, 1.45];
    // The size marks: the sizing rings' colours (and the size plates' swatches): grey, mint, pink, gold, red.
    const MARK = [0xa3adb5, 0x2fb879, 0xe8508c, 0xf0a020, 0xd92b2b];
    const SHAKES = ['lumpy', 'thick', 'creamy', 'thin', 'puddle'];
    const MILK = 0xfdf8ee, VANILLA = 0xfbf1d6;
    const STEEL = 0xc3cad0, STEEL_DARK = 0x8a939b, CHROME = 0xe4e9ed, MINT = 0x8fd8ad, MINT_DARK = 0x5fb886;
    const PINK = 0xf0679a, PINK_DARK = 0xd8467c, WHITE = 0xfffdf8;
    const COUNTER = { line: 0.80, top: 0.92, back: -0.2, row: 0.16, front: 1.0, scale: 1.45, x: -0.2 };
    // On the kitchen sets the food is drawn up (the board camera is far for things this small), but never taller
    // than maxH (a three-scoop waffle cone), so it stays on screen.
    const LINE = { scale: 1.6, maxH: 0.95 };
    const lineScale = (o, h) => (o && o.where === 'line' ? Math.min(LINE.scale, LINE.maxH / Math.max(0.01, h)) : 1);
    const SCOOP = { stack: [-0.12, -0.3], scooper: [0.42, 0.3] };      // the scoop set's spots (x, z)
    const TOPS = { stack: [-0.22, 0.06], incoming: [0.98, 0.15] };    // the toppings set's
    const MIXER = V(0.52, 0, -0.16);       // the 3D mixer, from the shake glass's spot (item frame)
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ── shared geometry (kept: never freed with a build) and textures ── */
    const geos = {};
    const kept = (key, make) => geos[key] || (geos[key] = k.keep(make()));
    const TEX = {};
    /** A toon material with a small painted texture: px(x, y) -> colour. sRGB (food.md 7: or it washes out). */
    function painted(key, w, h, px) {
      if (TEX[key]) return TEX[key];
      const data = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = px(x, y), i = (y * w + x) * 4;
        data[i] = (c >> 16) & 255; data[i + 1] = (c >> 8) & 255; data[i + 2] = c & 255; data[i + 3] = 255;
      }
      const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      return (TEX[key] = new THREE.MeshToonMaterial({ color: 0xffffff, map: t, gradientMap: k.toon(0xffffff).gradientMap }));
    }
    // A cake cone's grid of shallow squares; a waffle cone's deep diamonds; the cup's pink-and-white stripes; the
    // straw's red spiral (u runs round a lathe, v along its profile).
    const coneMat = () => painted('cone', 96, 48, (x, y) => (x % 8 === 0 || y % 8 === 0 ? 0xc68a44 : 0xe8b46c));
    const waffleMat = () => painted('waffle', 96, 64, (x, y) => (((x + y) % 12) < 2 || ((x - y + 120) % 12) < 2 ? 0x9a5f22 : ((x + y) % 12) < 4 ? 0xc48638 : 0xd9a050));
    const cupMat = () => painted('cup', 32, 4, x => ((x >> 1) % 2 ? 0xfff4f8 : 0xf05f95));
    const strawMat = () => painted('straw', 16, 32, (x, y) => (((x + y) >> 2) % 2 ? 0xffffff : 0xd8243c));
    const GLASS = () => k.toon(0xe6f6fc, { transparent: true, opacity: 0.15, depthWrite: false });
    /** A liquid seen through glass keeps its colour (food.md 11: plain toon behind clear glass came out grey):
     *  35% more saturated, with a glow of half its own colour. */
    function vivid(colour) {
      const c = new THREE.Color(colour), hsl = {};
      c.getHSL(hsl);
      c.setHSL(hsl.h, Math.min(1, hsl.s * 1.8), hsl.l * 0.92);
      return c.getHex();
    }
    const liquid = colour => { const v = vivid(colour); return k.toon(v, { emissive: k.mix(v, 0x000000, 0.7) }); };

    /* ── small helpers ── */
    const lum = c => (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;
    const without = (made, ids) => Object.assign({}, made, { auto: (made.auto || []).filter(a => !ids.includes(a)) });
    const has = (made, id) => (made.auto || []).includes(id);
    const shapeOf = part => (k.lookFor(part) || {}).shape;
    function sizeIdx(made, o) {
      if (o && typeof o.size === 'number') return clamp(o.size, 0, 4);
      const i = made && made.done ? SIZES.indexOf(made.done) : -1;
      return i >= 0 ? i : 2;
    }
    function shakeIdx(made, o) {
      if (o && typeof o.stage === 'number') return clamp(o.stage, 0, 4);
      const i = made && made.done ? SHAKES.indexOf(made.done) : -1;
      return i >= 0 ? i : 0;
    }
    /** The window's shape (16:9 in Node). */
    function windowAspect() {
      const w = typeof innerWidth === 'number' ? innerWidth : 0, h = typeof innerHeight === 'number' ? innerHeight : 0;
      return w > 0 && h > 0 ? w / h : 16 / 9;
    }
    /** A set's camera with its lens solved for this window, as world.js solves it (set-local). */
    function solvedCamera(def, aspect, lineY) {
      const c = new THREE.PerspectiveCamera(def.cam.fov, aspect, 0.1, 60);
      c.position.set(def.cam.pos[0], def.cam.pos[1], def.cam.pos[2]);
      c.lookAt(def.cam.at[0], def.cam.at[1], def.cam.at[2]);
      c.updateMatrixWorld(); c.updateProjectionMatrix();
      const want = typeof lineY === 'number' ? lineY : food.lineOnScreen(def.line, aspect, def.picture);
      const dy = food.lensShift(c, V(def.cam.at[0], def.surface.y, def.surface.back), want);
      c.view = { enabled: true, fullWidth: 1, fullHeight: 1, offsetX: 0, offsetY: -dy, width: 1, height: 1 };
      c.updateProjectionMatrix();
      return c;
    }
    /** Where a point of a set's picture (fractions fx, fy) lies on the plane y = planeY, for this window: so a 3D
     *  thing meets a painted one at every window shape (the dip well). */
    function onPicture(def, fx, fy, planeY) {
      const a = windowAspect(), p = food.PICTURE || 1.5, cam = solvedCamera(def, a);
      const wx = a < p ? 0.5 + (fx - 0.5) * p / a : fx, wy = a > p ? 0.5 + (fy - 0.5) * a / p : fy;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(wx * 2 - 1, 1 - wy * 2), cam);
      const hit = ray.ray.intersectPlane(new THREE.Plane(V(0, 1, 0), -planeY), new THREE.Vector3());
      return hit || V(0, planeY, 0);
    }

    /* ── the scoop: a ball with the scooper's curls and a ruffled skirt where it sits ── */
    /** The unit ball (radius 1, its centre at 0, its skirt's foot at y -0.66). slump: the avalanche, lopsided. */
    function scoopGeo(variant, slump) {
      const lo = k.low();
      return kept('scoop:' + variant + ':' + (slump ? 's' : 'n') + ':' + (lo ? 'lo' : 'hi'), () => {
        const geo = new THREE.SphereGeometry(1, lo ? 22 : 34, lo ? 16 : 24);
        const pos = geo.attributes.position, j = 0.7 + variant * 1.9;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          const a = Math.atan2(z, x), rxz = Math.hypot(x, z);
          // The scooper's curls: soft ridges wrapping round the ball.
          const m = 1 + 0.04 * k.noise(a + y * 1.6, j) + 0.025 * Math.sin(y * 8 + a * 3 + j);
          let nr = rxz * m, ny = y * m;
          if (y < -0.3) {
            // The ruffled skirt: below the waist it bulges out round the base, then tucks under, flat.
            const t = Math.min(1, (-0.3 - y) / 0.7);
            const bulge = (0.15 + 0.07 * Math.sin(a * 11 + j)) * Math.sin(Math.min(1, t * 1.4) * Math.PI) * (slump ? 1.7 : 1);
            nr = 0.954 * m * (1 + bulge) * (1 - Math.pow(t, 4));
            ny = -0.3 - 0.36 * t;
          }
          if (slump) {
            // Sliding off: the top slides sideways and sags.
            nr *= 1.04;
            ny = ny > -0.3 ? -0.3 + (ny + 0.3) * 0.78 : ny;
          }
          let px = Math.cos(a) * nr, pz = Math.sin(a) * nr;
          if (slump) px += 0.32 * Math.pow(Math.max(0, ny + 0.3), 1.3);
          pos.setXYZ(i, px, ny, pz);
        }
        geo.computeVertexNormals();
        return geo;
      });
    }
    const FLECKS = {
      strawberry: () => kept('f:berry', () => new THREE.DodecahedronGeometry(0.011, 0).scale(1.3, 0.7, 1)),
      mintChip: () => kept('f:chip', () => new THREE.BoxGeometry(0.017, 0.007, 0.013)),
      bubblegum: () => kept('f:ball', () => new THREE.SphereGeometry(0.0095, 8, 6)),
      rockyRoad: () => kept('f:nut', () => new THREE.DodecahedronGeometry(0.009, 0)),
      other: () => kept('f:chip', () => new THREE.BoxGeometry(0.017, 0.007, 0.013)),
    };
    const CHUNKS = {
      cookieDough: () => kept('c:dough', () => new THREE.DodecahedronGeometry(0.017, 0)),
      rockyRoad: () => kept('c:mallow', () => new THREE.BoxGeometry(0.022, 0.02, 0.022)),
      other: () => kept('c:dough', () => new THREE.DodecahedronGeometry(0.017, 0)),
    };
    /** One scoop: { g, h, r } standing on y = 0 (its skirt's foot), its centre at 0.66 r. o.r its radius, else
     *  the size (o.size, o.stage for the sizing ball, else the item's made.done). */
    function scoop(part, o) {
      o = o || {};
      const L = k.lookFor(part), colour = L.colour !== undefined ? L.colour : VANILLA;
      const st = typeof o.size === 'number' ? clamp(o.size, 0, 4)
        : part.ing === 'iceCream' ? (part.done || (o.stage !== undefined && o.stage !== null) ? k.stageIndex(part, o) : 2)
          : sizeIdx(o.item, o);
      const r = o.r || R0 * SIZE_SCALE[st], slump = st >= 4;
      const g = new THREE.Group();
      g.name = 'scoop';
      const variant = k.hash(part.ing + ':' + (part.n || 0)) % 4;
      const ball = k.ink(scoopGeo(variant, slump), k.toon(colour));
      ball.scale.set(r, st === 0 ? r * 0.7 : r, r);
      ball.position.y = 0.66 * r * (st === 0 ? 0.7 : 1);
      ball.name = 'ball';
      g.add(ball);
      const seed = 'scoop:' + part.ing + ':' + (part.n || 0);
      const S = k.surfaceOf(g, -0.15), area = (r / R0) * (r / R0), big = Math.sqrt(r / R0);
      if (L.flecks !== undefined) {
        const n = k.thin(Math.round(24 * area), 8), geo = (FLECKS[part.ing] || FLECKS.other)();
        const pts = k.onSurface(S, n, seed + ':fl', 0.001).map(p => Object.assign(p, { s: big * (0.8 + p.t * 0.5) }));
        g.add(k.scatter(geo, k.toon(L.flecks), pts, { outline: false, tilt: 0.6 }));
        if (part.ing === 'bubblegum') {     // pink gumballs too, as the tub in the scoop picture
          const pk = k.onSurface(S, k.thin(Math.round(10 * area), 4), seed + ':pk', 0.001).map(p => Object.assign(p, { s: big }));
          g.add(k.scatter(geo, k.toon(0xf0508e), pk, { outline: false }));
        }
      }
      if (L.chunks !== undefined) {
        const n = k.thin(Math.round(8 * area), 4), geo = (CHUNKS[part.ing] || CHUNKS.other)();
        const pts = k.onSurface(S, n, seed + ':ch', -0.004).map(p => Object.assign(p, { s: big * (0.85 + p.t * 0.4) }));
        g.add(k.scatter(geo, k.toon(L.chunks), pts, { outline: 'thin', tilt: 1.2 }));
      }
      if (L.flecks === undefined && L.chunks === undefined && lum(colour) > 0.85) {
        // Vanilla: vanilla-bean specks, so a vanilla scoop never reads as whipped cream (white on white needs a cue).
        const pts = k.onSurface(S, k.thin(Math.round(16 * area), 8), seed + ':vb', 0.001);
        g.add(k.scatter(kept('speck', () => new THREE.SphereGeometry(0.0022, 5, 4).scale(1.6, 0.6, 1)), k.toon(0x5a4030), pts, { outline: false }));
      }
      if (slump) {
        // The avalanche: drips down the low side, and a lump sliding off it.
        const R = k.rand(seed + ':drip'), drop = kept('drip', () => new THREE.SphereGeometry(1, 10, 8));
        for (let i = 0; i < 4; i++) {
          const a = -0.9 + i * 0.6 + (R() - 0.5) * 0.3, len = 0.25 + R() * 0.25;
          const d = k.ink(drop, k.toon(colour));
          d.scale.set(0.11 * r, len * r, 0.11 * r);
          d.position.set(Math.cos(a) * 1.02 * r + 0.08 * r, 0.66 * r - (0.25 + len * 0.5) * r, Math.sin(a) * 1.02 * r);
          g.add(d);
        }
        const lump = k.ink(scoopGeo((variant + 1) % 4, false), k.toon(colour));
        lump.scale.setScalar(r * 0.42);
        lump.position.set(r * 1.05, 0.12 * r, r * 0.35);
        lump.rotation.z = -0.5;
        g.add(lump);
      }
      g.userData.r = r;
      g.userData.centre = 0.66 * r * (st === 0 ? 0.7 : 1);
      return { g, h: g.userData.centre + r * (st === 0 ? 0.75 : 1.05), r, centre: g.userData.centre };
    }

    /* ── the holders: cones in a chrome stand, the striped cup, the boat dish, the sink ── */
    /** A chrome cone stand: a pink foot, three wire legs, a ring at ringY holding the cone at ringR. */
    function stand(ringR, ringY) {
      const g = new THREE.Group();
      g.name = 'stand';
      const foot = k.ink(k.lathe([[0, 0], [0.085, 0], [0.09, 0.006], [0.085, 0.014], [0, 0.014]], k.seg(24)), k.toon(PINK));
      g.add(foot);
      const ring = k.inkThin(new THREE.TorusGeometry(ringR + 0.006, 0.006, 6, k.seg(20)).rotateX(Math.PI / 2), k.toon(CHROME));
      ring.position.y = ringY;
      g.add(ring);
      const leg = kept('leg', () => k.cyl(0.0045, 1, 6));
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 + Math.PI / 2, x0 = Math.cos(a) * 0.065, z0 = Math.sin(a) * 0.065, x1 = Math.cos(a) * (ringR + 0.006), z1 = Math.sin(a) * (ringR + 0.006);
        const m = k.inkThin(leg, k.toon(CHROME)), len = Math.hypot(x1 - x0, ringY - 0.012, z1 - z0);
        m.scale.y = len;
        m.position.set((x0 + x1) / 2, (0.012 + ringY) / 2, (z0 + z1) / 2);
        m.quaternion.setFromUnitVectors(V(0, 1, 0), V(x1 - x0, ringY - 0.012, z1 - z0).normalize());
        g.add(m);
      }
      return g;
    }
    /** A cone in its stand: { g, h: the rim (where the first scoop sits), rim: its radius }. */
    function cone(waffle, o) {
      o = o || {};
      const g = new THREE.Group(), y0 = 0.03, H = waffle ? 0.36 : 0.3, Rr = waffle ? 0.1 : 0.084;
      g.name = 'holder';
      const ringY = 0.15, ringR = 0.006 + (ringY - y0) / H * (Rr - 0.006);
      if (!o.noStand) g.add(stand(ringR, ringY));
      const side = k.ink(kept('coneSide:' + waffle, () => k.lathe([[0.003, y0], [Rr, y0 + H]], k.seg(32))), waffle ? waffleMat() : coneMat());
      g.add(side);
      const tip = k.ink(kept('coneTip', () => new THREE.SphereGeometry(0.006, 8, 6)), k.toon(0xc68a44));
      tip.position.y = y0;
      g.add(tip);
      if (waffle) {
        // The rolled rim, and the darker inside showing above the first scoop's skirt.
        const rim = k.ink(kept('waffleRim', () => new THREE.TorusGeometry(Rr, 0.014, 8, k.seg(32)).rotateX(Math.PI / 2)), k.toon(0xc98a3c));
        rim.position.y = y0 + H;
        g.add(rim);
      } else {
        const band = k.ink(kept('coneBand', () => k.lathe([[Rr, y0 + H], [Rr + 0.007, y0 + H + 0.004], [Rr + 0.007, y0 + H + 0.02], [Rr - 0.004, y0 + H + 0.024]], k.seg(32))), k.toon(0xdca25a));
        g.add(band);
      }
      const inside = new THREE.Mesh(kept('coneIn:' + waffle, () => new THREE.CircleGeometry(Rr - 0.004, k.seg(32)).rotateX(-Math.PI / 2)), k.toon(0x8e5a26));
      inside.position.y = y0 + H - 0.004;
      g.add(inside);
      return { g, h: y0 + H + (waffle ? 0.004 : 0.012), rim: Rr };
    }
    /** The pink-and-white striped paper cup (as the dispenser in the scoop picture), a pink spoon once it holds
     *  a scoop (o.spoon). { g, h: the rim, rim, floor }. */
    const CUP = { rb: 0.068, rt: 0.1, h: 0.13 };
    function cup(o) {
      o = o || {};
      const g = new THREE.Group();
      g.name = 'holder';
      g.add(k.ink(kept('cupOut', () => k.lathe([[0, 0], [CUP.rb, 0], [CUP.rt, CUP.h]], k.seg(32))), cupMat()));
      g.add(new THREE.Mesh(kept('cupIn', () => k.lathe([[CUP.rt, CUP.h], [CUP.rt - 0.005, CUP.h], [CUP.rb - 0.005, 0.01], [0, 0.01]], k.seg(32))), k.toon(0xfff4f8)));
      const rim = k.inkThin(kept('cupRim', () => new THREE.TorusGeometry(CUP.rt - 0.001, 0.0055, 6, k.seg(32)).rotateX(Math.PI / 2)), k.toon(0xffffff));
      rim.position.y = CUP.h;
      g.add(rim);
      if (o.spoon) {
        const sp = new THREE.Group();
        sp.name = 'spoon';
        const handle = k.ink(kept('spoonH', () => new THREE.BoxGeometry(0.016, 0.2, 0.006)), k.toon(0xff8fb8));
        handle.position.y = 0.1;
        const bowl = k.ink(kept('spoonB', () => new THREE.SphereGeometry(0.02, 10, 8).scale(1, 1.4, 0.45)), k.toon(0xff8fb8));
        bowl.position.y = 0.0;
        sp.add(handle, bowl);
        sp.position.set(CUP.rt * 0.55, CUP.h - 0.02, -CUP.rt * 0.35);
        sp.rotation.set(-0.25, 0, -0.42);
        g.add(sp);
      }
      return { g, h: CUP.h, rim: CUP.rt, floor: 0.01 };
    }
    /** The banana split's long glass boat dish on its foot. { g, h: the floor, len (half), wid (half) }. */
    function boat() {
      const g = new THREE.Group(), X = 2.3, Z = 1.35;
      g.name = 'holder';
      const glass = new THREE.Mesh(kept('boat', () => k.lathe([[0, 0], [0.05, 0], [0.054, 0.01], [0.034, 0.022], [0.07, 0.034], [0.112, 0.056], [0.126, 0.08], [0.118, 0.084], [0.1, 0.062], [0.06, 0.05], [0, 0.046]], k.seg(40)).scale(X, 1, Z)),
        k.toon(0xbfe2f2, { transparent: true, opacity: 0.78, depthWrite: false }));
      glass.renderOrder = 2;
      g.add(glass);
      // A bright rim so the clear dish reads (a clear vessel is never inked: its hull would show through).
      const rim = k.inkThin(kept('boatRim', () => new THREE.TorusGeometry(0.123, 0.005, 5, k.seg(40)).rotateX(Math.PI / 2).scale(X, 1, Z)), k.toon(0xa9d3e6));
      rim.position.y = 0.082;
      g.add(rim);
      const foot = k.inkThin(kept('boatFoot', () => k.cyl(0.05, 0.01, k.seg(20))), k.toon(0xb9dcea));
      foot.position.y = 0.005;
      g.add(foot);
      return { g, h: 0.05, len: 0.126 * X, wid: 0.126 * Z };
    }
    /** An actual kitchen sink: a steel basin with a lip, a gooseneck tap at the back and a plug on its chain, filled
     *  with melted vanilla (o.fill). { g, h: the floor (or the fill's top), top, w, d } (half sizes). */
    const SINK = { w: 0.25, d: 0.17, h: 0.15 };
    function sink(o) {
      o = o || {};
      const g = new THREE.Group(), steel = k.toon(STEEL), dark = k.toon(STEEL_DARK);
      g.name = 'holder';
      const { w, d, h } = SINK, t = 0.014;
      const floor = k.ink(new THREE.BoxGeometry(w * 2, t, d * 2), dark);
      floor.position.y = t / 2;
      g.add(floor);
      [[0, d, w * 2 + t, t], [0, -d, w * 2 + t, t], [w, 0, t, d * 2], [-w, 0, t, d * 2]].forEach(([x, z, sx, sz]) => {
        const m = k.ink(new THREE.BoxGeometry(sx, h, sz), steel);
        m.position.set(x, h / 2, z);
        g.add(m);
      });
      const lip = k.ink(kept('sinkLip', () => {
        const s = new THREE.Shape([V(-w - 0.04, -d - 0.04), V(w + 0.04, -d - 0.04), V(w + 0.04, d + 0.07), V(-w - 0.04, d + 0.07)].map(p => new THREE.Vector2(p.x, p.y)));
        s.holes.push(new THREE.Path([new THREE.Vector2(-w, -d), new THREE.Vector2(-w, d), new THREE.Vector2(w, d), new THREE.Vector2(w, -d)]));
        return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2);
      }), k.toon(CHROME));
      lip.position.set(0, h, 0);              // the shape's +y (the deeper lip) lies behind the basin, by the tap
      g.add(lip);
      // The gooseneck tap and its two handles, at the back left corner (clear of the whip can over the scoops).
      const tx = -w + 0.035;
      const neck = new THREE.CatmullRomCurve3([V(tx, h, -d - 0.045), V(tx, h + 0.16, -d - 0.04), V(tx, h + 0.2, -d + 0.02), V(tx, h + 0.14, -d + 0.07)]);
      g.add(k.ink(kept('tap', () => new THREE.TubeGeometry(neck, 16, 0.012, 8, false)), k.toon(CHROME)));
      [-1, 1].forEach(sd => {
        const knob = k.ink(kept('knob', () => k.cyl(0.016, 0.03, 10)), k.toon(sd < 0 ? 0xd94a4a : 0x4a8ad9));
        knob.position.set(tx + sd * 0.055, h + 0.025, -d - 0.045);
        g.add(knob);
      });
      // The plug on its ball chain, lying on the lip by the tap.
      const beads = [];
      for (let i = 0; i < 12; i++) beads.push({ p: [0.11 + i * 0.009, h + 0.016, -d - 0.035 + Math.sin(i * 0.8) * 0.008], nrm: [0, 1, 0], r: 0, t: 0.5 });
      g.add(k.scatter(kept('bead', () => new THREE.SphereGeometry(0.005, 6, 4)), k.toon(CHROME), beads, { outline: false }));
      const plug = k.ink(kept('plug', () => k.cyl(0.024, 0.012, 12)), k.toon(0x2b2b2b));
      plug.position.set(0.22, h + 0.018, -d - 0.035);
      g.add(plug);
      let top = t;
      if (o.fill) {
        // Filled with melted vanilla up to near the lip: the scoops sit on it.
        const f = new THREE.Mesh(new THREE.BoxGeometry(w * 2 - 0.004, h * 0.62, d * 2 - 0.004), k.toon(VANILLA));
        f.position.y = t + h * 0.31;
        g.add(f);
        top = t + h * 0.62;
      }
      return { g, h: top, top: h, w, d };
    }

    /* ── the toppings: each lies on the scoops (o.tops, o.surface) or crowns them (o.crowns) ── */
    const RAINBOW = [0xf2485f, 0xf7a325, 0xf5dc3a, 0x46c46b, 0x3a8ef0, 0xb067e0];
    /** Points on the tops: the scoops' (and the cream's) real surface when the layout passes it, else a disc. */
    const onTops = (o, n, seed, lift, r) => (o && o.surface && o.surface.count ? k.onSurface(o.surface, n, seed, lift)
      : k.sample({ kind: 'dome', r: r || 0.08, h: 0.03, y: lift }, n, seed));
    function sprinkles(part, o) {
      const g = new THREE.Group(), seed = 'sprinkles:' + (part.n || 0), crowns = (o && o.tops && o.tops.length) || 1;
      g.name = 'sprinkles';
      const pts = onTops(o, k.thin(44 * crowns, 18 * crowns), seed, 0.011);
      const piece = kept('sprinkleS', () => new THREE.CylinderGeometry(0.0038, 0.0038, 0.02, 6).rotateZ(Math.PI / 2));
      RAINBOW.forEach((c, i) => g.add(k.scatter(piece, k.toon(c), pts.filter((_, j) => j % RAINBOW.length === i), { outline: false, tilt: 0.2 })));
      return { g, h: 0 };
    }
    /** The drip cap (unit sphere radius 1): a shell over the top that runs down the sides in drips. */
    function capGeo(layer) {
      return kept('cap:' + layer + ':' + (k.low() ? 'lo' : 'hi'), () => {
        // A drizzle, not a coat: the cap leaves the scoop's sides (its flavour) showing; a second sauce is a smaller
        // cap on the crown, so the first one's drips still show below it (audit 2026-11-11: caramel hid the fudge).
        const tMax = 0.78 - 0.24 * Math.min(layer, 2), geo = new THREE.SphereGeometry(1, k.seg(36), 14, 0, Math.PI * 2, 0, tMax), pos = geo.attributes.position, j = 1.3 + layer * 2.1;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          const t = Math.acos(clamp(y, -1, 1)), a = Math.atan2(z, x), f = t / tMax;
          const drip = 1.0 * Math.pow(Math.max(0, Math.sin(5 * a + j)), 4) + 0.55 * Math.pow(Math.max(0, Math.sin(8 * a + 2 * j)), 6);
          const t2 = t * (1 + drip * Math.pow(f, 5)), s = Math.sin(t2) * (1 - 0.03 * Math.pow(f, 6) * drip);
          pos.setXYZ(i, Math.cos(a) * s, Math.cos(t2), Math.sin(a) * s);
        }
        geo.computeVertexNormals();
        return geo;
      });
    }
    function drizzle(part, o) {
      const L = k.lookFor(part), colour = L.colour !== undefined ? L.colour : 0x4a2412, g = new THREE.Group();
      g.name = 'sauce';
      const layer = (o && o.layer) || 0;
      const glint = kept('glint', () => new THREE.SphereGeometry(1, 10, 6));
      if (o && o.tops && o.tops.length) {
        o.tops.forEach((T, i) => {
          const R = T.r * (1.075 + 0.035 * layer);
          // Each top's cap and its gloss in a group of their own, so the ladle's pour can bring them in one by one.
          const one = new THREE.Group();
          one.name = 'sauceCap';
          g.add(one);
          const cap = k.inkThin(capGeo(layer), k.toon(colour));
          cap.scale.setScalar(R);
          cap.position.set(T.x, T.y, T.z);
          cap.rotation.y = i * 1.7 + layer;
          one.add(cap);
          // The gloss: two highlights on the side toward the camera.
          [[-0.32, 0.84, 0.44, 0.13], [0.18, 0.62, 0.76, 0.08]].forEach(([dx, dy, dz, s]) => {
            const d = V(dx, dy, dz).normalize();
            const m = new THREE.Mesh(glint, k.SHINE);
            m.scale.set(R * s, R * s * 0.35, R * s * 0.6);
            m.position.set(T.x + d.x * R, T.y + d.y * R, T.z + d.z * R);
            m.quaternion.setFromUnitVectors(V(0, 1, 0), d);
            one.add(m);
          });
        });
        return { g, h: 0 };
      }
      // On its own: a glossy puddle with a drip.
      const m = k.inkThin(kept('puddle', () => k.lathe([[0, 0.014], [0.07, 0.014], [0.085, 0.009], [0.09, 0]], k.seg(24)).rotateX(Math.PI)), k.toon(colour));
      m.position.y = 0.014;
      g.add(m);
      const s = new THREE.Mesh(glint, k.SHINE);
      s.scale.set(0.018, 0.004, 0.01);
      s.position.set(-0.025, 0.016, 0.02);
      g.add(s);
      return { g, h: 0.014 };
    }
    /** The piped swirl (unit: base radius 0.92, 1.75 high): three ridged rings shrinking upward and a curled peak. */
    function swirlGroup(cr, colour) {
      const g = new THREE.Group(), s = cr / 0.92, mat = k.toon(colour);
      g.name = 'cream';
      [[0.62, 0.3, 0.3], [0.42, 0.26, 0.78], [0.22, 0.21, 1.17]].forEach(([R, t, y], i) => {
        const m = k.ink(kept('ring' + i, () => new THREE.TorusGeometry(R, t, 8, k.seg(24)).rotateX(Math.PI / 2)), mat);
        m.position.y = y * s;
        m.rotation.y = i * 0.6;
        m.scale.setScalar(s);
        g.add(m);
      });
      const fillIn = k.ink(kept('creamCore', () => new THREE.CylinderGeometry(0.45, 0.62, 1.1, k.seg(16))), mat);
      fillIn.position.y = 0.55 * s;
      fillIn.scale.setScalar(s);
      g.add(fillIn);
      const peak = k.ink(kept('creamPeak', () => {
        const geo = new THREE.ConeGeometry(0.2, 0.5, 8, 4);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 0.25; pos.setX(i, pos.getX(i) + Math.pow(y / 0.5, 2) * 0.12); }
        geo.computeVertexNormals();
        return geo;
      }), mat);
      peak.position.y = 1.5 * s;
      peak.scale.setScalar(s);
      g.add(peak);
      g.userData.h = 1.75 * s;
      return g;
    }
    function whipped(part, o) {
      const L = k.lookFor(part), colour = L.colour !== undefined ? L.colour : WHITE, g = new THREE.Group();
      g.name = 'whipped';
      let h = 0;
      const crowns = o && o.crowns && o.crowns.length ? o.crowns : [{ x: 0, y: 0, z: 0, cr: 0.075 }];
      crowns.forEach(C => {
        const sw = swirlGroup(C.cr, colour);
        sw.position.set(C.x, C.y, C.z);
        g.add(sw);
        h = Math.max(h, C.y + sw.userData.h);
      });
      return { g, h: crowns === (o && o.crowns) ? 0 : h };
    }
    function nuts(part, o) {
      const L = k.lookFor(part), g = new THREE.Group(), seed = 'nuts:' + (part.n || 0), crowns = (o && o.crowns && o.crowns.length) || 1;
      g.name = 'nuts';
      const pts = onTops(o, k.thin(24 * crowns, 12 * crowns), seed, 0.006).map(p => Object.assign(p, { s: 0.75 + p.t * 0.5 }));
      const piece = kept('nut', () => new THREE.DodecahedronGeometry(0.011, 0).scale(1.2, 0.8, 1));
      g.add(k.scatter(piece, k.toon(L.colour !== undefined ? L.colour : 0xc89a5c), pts.filter((_, i) => i % 3), { outline: 'thin', tilt: 1.4 }));
      g.add(k.scatter(piece, k.toon(0x9a6a38), pts.filter((_, i) => !(i % 3)), { outline: 'thin', tilt: 1.4 }));
      return { g, h: 0 };
    }
    /** One glossy maraschino cherry on a long stem: a group standing on y = 0 (named for the tomato fx). */
    function cherryOne(colour) {
      const g = new THREE.Group();
      g.name = 'cherry';
      const body = k.ink(kept('cherryBody', () => new THREE.SphereGeometry(0.03, k.seg(18), 12).scale(1, 0.92, 1)), k.toon(colour));
      body.name = 'cherryBody';
      body.position.y = 0.028;
      g.add(body);
      const glint = new THREE.Mesh(kept('cherryGlint', () => new THREE.SphereGeometry(0.008, 8, 6).scale(1, 0.6, 1)), k.SHINE);
      glint.name = 'glint';
      glint.position.set(-0.012, 0.046, 0.016);
      g.add(glint);
      const stem = k.inkThin(kept('stem', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.05, 0), V(0.006, 0.08, 0), V(0.02, 0.11, -0.004), V(0.038, 0.128, -0.008)]), 12, 0.0032, 5, false)), k.toon(0x7a8a2c));
      stem.name = 'stem';
      g.add(stem);
      return g;
    }
    function cherry(part, o) {
      const L = k.lookFor(part), colour = L.colour !== undefined ? L.colour : 0xd0101c, g = new THREE.Group();
      g.name = 'cherries';
      const at = o && o.cherries && o.cherries.length ? o.cherries : [{ x: 0, y: 0, z: 0 }];
      at.forEach((C, i) => {
        const c = cherryOne(colour);
        c.position.set(C.x, C.y, C.z);
        c.rotation.y = i * 2.1 - 0.4;
        g.add(c);
      });
      return { g, h: at === (o && o.cherries) ? 0 : 0.06 };
    }

    /* ── the milkshake: the steel cup, the mixer, the tall glass ── */
    /** The shake's colour at a stage: lumps of ice cream in milk, then deeper (thick) to paler and watery (melted). */
    function shakeColour(fc, st) {
      return [MILK, k.mix(fc, 0x4a2a14, 0.1), k.mix(fc, MILK, 0.14), k.mix(fc, 0xf2f7fa, 0.4), k.mix(fc, 0xdfe9ef, 0.6)][clamp(st, 0, 4)];
    }
    /** The surface of a shake at a stage, at y = 0, radius rr: its mark. lumpy: scoops poking out of the milk;
     *  thick: a stiff dome with two peaks; creamy: smooth with a slow swirl; thin: flat, with bubbles; puddle: pale
     *  and flat, a melted ring where it stood (the vessel draws the ring). */
    function shakeTop(st, rr, fc, seed) {
      const g = new THREE.Group(), colour = shakeColour(fc, st);
      g.name = 'surface';
      if (st > 0 && lum(fc) > 0.85) {
        // A vanilla shake is white on white glass and a cream counter: vanilla-bean specks on its top are the cue.
        const sp = k.sample({ kind: 'disc', r: rr * 0.8, y: st === 1 ? rr * 0.3 : 0.003 }, k.thin(14, 8), seed + ':vb');
        g.add(k.scatter(kept('speck', () => new THREE.SphereGeometry(0.0022, 5, 4).scale(1.6, 0.6, 1)), k.toon(0x5a4030), sp, { outline: false, size: 1.4 }));
      }
      if (st === 1) {
        const dome = k.inkThin(kept('dome', () => new THREE.SphereGeometry(1, k.seg(24), 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1)), liquid(colour));
        dome.scale.setScalar(rr * 0.98);
        g.add(dome);
        [[-0.25, 0.15, 0.9], [0.3, -0.15, 0.75], [0.05, 0.35, 0.6]].forEach(([x, z, s], i) => {
          const pk = k.ink(kept('peak', () => new THREE.ConeGeometry(0.22, 0.42, 7).translate(0, 0.21, 0)), liquid(colour));
          pk.scale.setScalar(rr * s);
          pk.position.set(x * rr, rr * 0.5, z * rr);
          pk.rotation.z = x * 0.6;
          g.add(pk);
        });
        return g;
      }
      const disc = new THREE.Mesh(kept('disc', () => new THREE.CircleGeometry(1, k.seg(28)).rotateX(-Math.PI / 2)), liquid(st === 0 ? MILK : colour));
      disc.scale.setScalar(rr);
      disc.position.y = 0.001;
      g.add(disc);
      if (st === 0) {
        const R = k.rand(seed);
        [[-0.4, 0.1], [0.35, -0.25], [0.05, 0.42]].forEach(([x, z], i) => {
          const lump = k.ink(scoopGeo(i % 4, false), k.toon(fc));
          lump.scale.setScalar(rr * (0.33 + R() * 0.08));
          lump.position.set(x * rr, -rr * 0.05, z * rr);
          g.add(lump);
        });
      } else if (st === 2) {
        const pts = Array.from({ length: 40 }, (_, i) => { const t = i / 39, a = t * Math.PI * 4.2, r = rr * (0.08 + 0.72 * t); return V(Math.cos(a) * r, 0.004, Math.sin(a) * r); });
        const sw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, rr * 0.035, 5, false), k.toon(k.mix(colour, 0xffffff, 0.45)));
        sw.scale.y = 0.4;
        g.add(sw);
      } else if (st === 3) {
        const pts = k.sample({ kind: 'disc', r: rr * 0.8, y: 0.002 }, k.thin(9, 6), seed + ':b').map(p => Object.assign(p, { s: 0.6 + p.t * 0.8 }));
        g.add(k.scatter(kept('bubble', () => new THREE.SphereGeometry(rr * 0.09, 8, 6).scale(1, 0.6, 1)), k.toon(k.mix(colour, 0xffffff, 0.6)), pts, { outline: 'thin' }));
      } else if (st >= 4) {
        const pts = k.sample({ kind: 'ring', r0: rr * 0.55, r1: rr * 0.9, y: 0.002 }, k.thin(7, 5), seed + ':f').map(p => Object.assign(p, { s: 1 + p.t }));
        g.add(k.scatter(kept('foam', () => new THREE.CircleGeometry(rr * 0.07, 8).rotateX(-Math.PI / 2)), k.toon(0xffffff), pts, { outline: false }));
      }
      return g;
    }
    // The shake's level in its vessel, by stage (the puddle has melted down).
    const LEVEL = [0.7, 0.84, 0.86, 0.9, 0.68];
    /** The steel mixing cup with what is in it: nothing, the flavour's scoops (picked), milk (the milk auto), or
     *  the shake at a stage (cooked). { g, h, rim }. */
    const MIXCUP = { rb: 0.068, rt: 0.098, h: 0.2 };
    function steelCup(state) {
      const g = new THREE.Group();
      g.name = 'steelCup';
      g.add(k.ink(kept('mixOut', () => k.lathe([[0, 0], [MIXCUP.rb, 0], [MIXCUP.rb + 0.004, 0.012], [MIXCUP.rt, MIXCUP.h], [MIXCUP.rt + 0.005, MIXCUP.h + 0.004]], k.seg(32))), k.toon(STEEL)));
      g.add(new THREE.Mesh(kept('mixIn', () => k.lathe([[MIXCUP.rt + 0.005, MIXCUP.h + 0.004], [MIXCUP.rt - 0.004, MIXCUP.h], [MIXCUP.rb - 0.004, 0.012], [0, 0.012]], k.seg(32))), k.toon(STEEL_DARK)));
      const glint = new THREE.Mesh(kept('mixGlint', () => new THREE.CylinderGeometry(MIXCUP.rt * 0.92 + 0.003, MIXCUP.rb + 0.003, MIXCUP.h * 0.8, 10, 1, true, -0.6, 0.22)), k.SHINE);
      glint.position.y = MIXCUP.h * 0.5;
      g.add(glint);
      const rAt = y => MIXCUP.rb + (MIXCUP.rt - MIXCUP.rb) * (y / MIXCUP.h);
      const fc = state.fc;
      if (state.stage !== undefined) {
        const lv = MIXCUP.h * LEVEL[state.stage], rr = rAt(lv) - 0.006;
        const top = shakeTop(state.stage, rr, fc, 'mixcup');
        top.position.y = lv;
        g.add(top);
        if (state.stage >= 4) {
          // The melted ring where it stood, up the inside wall.
          const ring = new THREE.Mesh(kept('meltRing', () => new THREE.TorusGeometry(1, 0.03, 4, k.seg(28)).rotateX(Math.PI / 2)), k.toon(k.mix(fc, 0x8a6a50, 0.25)));
          const ly = MIXCUP.h * 0.86;
          ring.scale.set(rAt(ly) - 0.006, 0.5, rAt(ly) - 0.006);
          ring.position.y = ly;
          g.add(ring);
        }
        g.userData.level = lv;
      } else if (state.scoop) {
        // The flavour's scoops, heaped up to the rim (two below, one poking out), milk round them once poured.
        const sc = new THREE.Group();
        sc.name = 'shakeScoops';
        [[0, MIXCUP.h * 0.55, 0], [-0.02, MIXCUP.h * 0.85, 0.01]].forEach(([x, y, z], i) => {
          const b = k.ink(scoopGeo(i + 1, false), k.toon(fc));
          b.scale.setScalar(0.064);
          b.position.set(x, y, z);
          sc.add(b);
        });
        if (state.frost) sc.userData.frost = true;
        g.add(sc);
        if (state.milk) {
          const lv = MIXCUP.h * 0.72, m = new THREE.Mesh(kept('disc', () => new THREE.CircleGeometry(1, k.seg(28)).rotateX(-Math.PI / 2)), liquid(MILK));
          m.scale.setScalar(rAt(lv) - 0.006);
          m.position.y = lv;
          m.name = 'milk';
          g.add(m);
        }
      }
      return { g, h: MIXCUP.h, rim: MIXCUP.rt };
    }
    /** The mint-green spindle mixer, like the painted one, the cup on its rest (the cup's foot at y CUP_AT). */
    const CUP_AT = 0.035;
    // The steel cup's spot on the counter, between the glass and the mixer, while it is filled (the scoops and the
    // milk go in there, with nothing over it); it goes onto the mixer's rest to mix (audit 2026-11-11: the scoops
    // fell through the mixer's head, the milk jug through its column).
    const CUP_SPOT = V(0.27, 0, 0.12);
    /** The spindle down in the cup (u 0) or up out of its way (u 1): it lifts so the cup can come on and off the
     *  rest without passing through it. */
    function setSpindle(mx, u) {
      const sp = mx.getObjectByName('spindle'), disc = mx.getObjectByName('spindleDisc');
      if (!sp || !disc) return;
      const lo = 0.07 + 0.185 * u, hi = 0.51 + 0.15 * u;
      sp.position.y = (lo + hi) / 2;
      sp.scale.y = (hi - lo) / 0.44;
      disc.position.y = lo + 0.005;
      mx.userData.spindle = u;
    }
    function mixer(up) {
      // A rounded mint base with the cup rest, a column at the back, a domed head with a chrome band, the chrome
      // spindle down into the cup (the painted one at the back of the topping bar, nearer and smaller).
      const g = new THREE.Group(), mint = k.toon(MINT), chrome = k.toon(CHROME);
      g.name = 'mixer';
      const base = k.ink(kept('mxBase', () => k.lathe([[0, 0], [0.13, 0], [0.14, 0.012], [0.135, 0.03], [0, 0.03]], k.seg(28)).scale(1, 1, 1.25)), mint);
      base.position.z = -0.06;
      const rest = k.inkThin(kept('mxRest', () => k.cyl(0.085, 0.008, k.seg(24))), chrome);
      rest.position.y = CUP_AT - 0.004;
      const column = k.ink(kept('mxCol', () => new THREE.CylinderGeometry(0.052, 0.068, 0.54, k.seg(16)).scale(1.15, 1, 0.8)), mint);
      column.position.set(0, 0.3, -0.2);
      const head = k.ink(kept('mxHead', () => new THREE.SphereGeometry(1, k.seg(24), 14).scale(0.12, 0.085, 0.17)), mint);
      head.position.set(0, 0.6, -0.08);
      const band = k.inkThin(kept('mxBand', () => new THREE.TorusGeometry(1, 0.1, 6, k.seg(24)).rotateX(Math.PI / 2).scale(0.118, 0.12, 0.168)), chrome);
      band.position.set(0, 0.575, -0.08);
      const collar = k.ink(kept('mxCollar', () => k.cyl(0.026, 0.06, k.seg(14))), chrome);
      collar.position.set(0, 0.52, 0.0);
      const spindle = k.inkThin(kept('mxSpin', () => k.cyl(0.0075, 0.44, 8)), chrome);
      spindle.position.set(0, 0.29, 0.0);
      const disc = k.inkThin(kept('mxDisc', () => k.cyl(0.022, 0.008, 10)), chrome);
      disc.position.set(0, 0.075, 0.0);
      const light = k.ink(kept('mxLight', () => new THREE.SphereGeometry(0.014, 10, 8)), k.toon(0xff5a6a));
      light.position.set(0, 0.62, 0.095);
      spindle.name = 'spindle';
      disc.name = 'spindleDisc';
      g.add(base, rest, column, head, band, collar, spindle, disc, light);
      setSpindle(g, up ? 1 : 0);
      return g;
    }
    /** The tall fluted sundae glass for the shake: { g, h: rim, rim, rAt(y) (inner radius) }. */
    const GLASS_P = [[0, 0], [0.056, 0], [0.058, 0.008], [0.016, 0.02], [0.012, 0.05], [0.03, 0.07], [0.062, 0.14], [0.08, 0.26], [0.088, 0.33], [0.092, 0.336]];
    /** The glass's outer radius at a height on its bowl. */
    function glassR(y) {
      for (let i = 5; i < GLASS_P.length; i++) { const [r0, y0] = GLASS_P[i - 1], [r1, y1] = GLASS_P[i]; if (y <= y1) return r0 + (r1 - r0) * ((y - y0) / (y1 - y0)); }
      return 0.092;
    }
    function tallGlass() {
      const g = new THREE.Group();
      g.name = 'glass';
      const geo = kept('tallGlass', () => {
        const gg = k.lathe(GLASS_P, k.seg(32)), pos = gg.attributes.position;
        for (let i = 0; i < pos.count; i++) {   // the flutes: shallow vertical ribs on the bowl
          const y = pos.getY(i);
          if (y < 0.07) continue;
          const a = Math.atan2(pos.getZ(i), pos.getX(i)), m = 1 + 0.035 * Math.cos(a * 10);
          pos.setX(i, pos.getX(i) * m); pos.setZ(i, pos.getZ(i) * m);
        }
        gg.computeVertexNormals();
        return gg;
      });
      const m = new THREE.Mesh(geo, GLASS());
      m.renderOrder = 3;
      g.add(m);
      // A clear glass is never inked (the hull would show through): a tinted rim, foot and stem and two bright
      // streaks down the bowl are what make it read on the white marble.
      const rim = k.inkThin(kept('glassRim', () => new THREE.TorusGeometry(0.091, 0.0045, 5, k.seg(32)).rotateX(Math.PI / 2)), k.toon(0xa9d3e6));
      rim.position.y = 0.335;
      g.add(rim);
      const foot = k.inkThin(kept('glassFoot', () => k.lathe([[0, 0], [0.056, 0], [0.058, 0.008], [0.016, 0.02], [0.012, 0.05], [0.03, 0.07], [0, 0.07]], k.seg(24))), k.toon(0xbfe0ee));
      g.add(foot);
      [[-2.3, 0.012], [-1.75, 0.006]].forEach(([a, w], i) => {
        const st = new THREE.Mesh(kept('glassStreak' + i, () => {
          const pts = [];
          for (let j = 0; j <= 8; j++) { const y = 0.1 + j * 0.026, r = glassR(y) * 1.04 + 0.002; pts.push(V(Math.cos(a) * r, y, -Math.sin(a) * r)); }
          return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, w * 0.5, 4, false);
        }), k.SHINE);
        g.add(st);
      });
      const rAt = y => glassR(y) - 0.004;
      return { g, h: 0.335, rim: 0.09, rAt };
    }
    /** The shake in the glass, filled to `level` (0..1 of the bowl, 0.07 to 0.33) at a stage. */
    function glassFill(glass, st, fc, level) {
      const g = new THREE.Group(), y0 = 0.07, y1 = 0.325, yl = y0 + (y1 - y0) * clamp(level, 0, 1);
      g.name = 'shake';
      if (yl - y0 < 0.002) return { g, h: y0 };
      const prof = [[0, y0], [glass.rAt(y0), y0]];
      for (let y = y0 + 0.02; y < yl; y += 0.02) prof.push([glass.rAt(y), y]);
      prof.push([glass.rAt(yl), yl], [0, yl]);
      const body = new THREE.Mesh(k.lathe(prof, k.seg(28)), liquid(shakeColour(fc, st === 0 ? 2 : st)));
      g.add(body);
      const top = shakeTop(st, glass.rAt(yl) - 0.002, fc, 'glass');
      top.position.y = yl;
      g.add(top);
      if (st >= 4) {
        const ring = new THREE.Mesh(kept('meltRing', () => new THREE.TorusGeometry(1, 0.03, 4, k.seg(28)).rotateX(Math.PI / 2)), k.toon(k.mix(fc, 0x8a6a50, 0.25)));
        const ly = y0 + (y1 - y0) * 0.9;
        ring.scale.set(glass.rAt(ly), 0.5, glass.rAt(ly));
        ring.position.y = ly;
        g.add(ring);
      }
      return { g, h: yl };
    }
    /** A red-and-white striped straw leaning out of the glass. */
    function straw(h) {
      const m = k.inkThin(kept('straw', () => k.cyl(0.0085, 0.4, 10)), strawMat());
      m.name = 'straw';
      m.position.set(0.03, h - 0.05, -0.02);
      m.rotation.set(-0.15, 0, -0.32);
      return m;
    }

    /* ── shapes: one builder per look.shape ── */
    const shapes = {
      scoopBall: (part, o) => scoop(part, o),
      plainCone: (part, o) => cone(false, o),
      waffleCone: (part, o) => cone(true, o),
      stripedCup: (part, o) => cup(o),
      bananaBoat: () => boat(),
      sinkBasin: (part, o) => sink(o),
      /** The milkshake on its own (a dial, a tin): the steel cup with the shake at its stage. */
      shakeCup(part, o) {
        const st = k.stageIndex(part, o), b = steelCup({ stage: st, fc: 0x6b3a1f });
        return { g: b.g, h: b.h };
      },
      /** A shake flavour waiting on the line: a scoop of it in a small steel dish. */
      shakeScoop(part, o) {
        const g = new THREE.Group();
        g.name = 'shakeScoop';
        const dish = k.ink(kept('dish', () => k.lathe([[0, 0], [0.05, 0], [0.085, 0.035], [0.09, 0.04], [0.082, 0.04], [0.048, 0.008], [0, 0.008]], k.seg(24))), k.toon(STEEL));
        dish.name = 'dish';
        g.add(dish);
        const b = scoop(Object.assign({}, part), Object.assign({}, o, { r: 0.085, size: 2 }));
        b.g.position.y = 0.012;
        b.g.name = 'ballG';
        g.add(b.g);
        return { g, h: 0.012 + b.h };
      },
      rainbowSprinkles: (part, o) => sprinkles(part, o),
      fudgeDrizzle: (part, o) => drizzle(part, o),
      caramelDrizzle: (part, o) => drizzle(part, o),
      whippedSwirl: (part, o) => whipped(part, o),
      choppedNuts: (part, o) => nuts(part, o),
      maraschino: (part, o) => cherry(part, o),
    };

    /* ── layouts ── */
    /** Where the scoops go for a holder: [{ x, y (the centre), z }], and which are tops (nothing above them). */
    function scoopPlaces(kind, n, r, hb) {
      const at = [], tops = [];
      if (kind === 'cone') {
        for (let i = 0; i < n; i++) at.push({ x: (i % 2 ? 1 : -1) * (i ? 0.08 : 0) * r, y: hb.h + 0.42 * r + i * 1.3 * r, z: 0 });
        if (n) tops.push(n - 1);
      } else if (kind === 'cup') {
        const y = hb.h + 0.22 * r;
        if (n === 1) at.push({ x: 0, y, z: 0 });
        else if (n >= 2) at.push({ x: -0.72 * r, y, z: 0.1 * r }, { x: 0.72 * r, y: y + 0.06 * r, z: -0.1 * r });
        if (n >= 3) at.push({ x: 0.02 * r, y: y + 0.95 * r, z: 0 });
        if (n === 1) tops.push(0); else if (n === 2) tops.push(0, 1); else if (n >= 3) tops.push(2);
      } else if (kind === 'boat') {
        const dx = Math.max(0.17, 1.75 * r);
        for (let i = 0; i < n; i++) { at.push({ x: (i - (n - 1) / 2) * dx, y: hb.h + 0.42 * r, z: 0 }); tops.push(i); }
      } else if (kind === 'sink') {
        // Heaped in the melted vanilla: two in front, one behind them a little higher, each with its own crown.
        const y = hb.h + 0.2 * r;
        const spots = [{ x: -0.8 * r, y, z: 0.35 * r }, { x: 0.8 * r, y: y + 0.03 * r, z: 0.3 * r }, { x: 0.05 * r, y: y + 0.4 * r, z: -0.6 * r }];
        for (let i = 0; i < n; i++) { at.push(spots[i] || { x: (i - 3) * r, y, z: 0.4 * r }); tops.push(i); }
      }
      return { at, tops };
    }
    /** Every scoop recipe: the holder, the scoops placed for it, the toppings on the tops and crowns. The size is
     *  made.done (every scoop on it is that size). -> { g, h, stack (where an Add lands), tops }. */
    function scoopItem(made, o) {
      o = o || {};
      const seq = k.sequence(made, o), g = new THREE.Group();
      const st = sizeIdx(made, o), r = R0 * SIZE_SCALE[st];
      const scoops = seq.parts.filter(p => p.slot === 'scoops');
      const toppings = seq.parts.filter(p => !p.slot);
      const holderP = seq.parts.find(p => p.slot === 'holder');
      let kind = null, hb = null;
      const opts = Object.assign({}, o, { item: made });
      if (holderP) {
        const sh = shapeOf(holderP);
        kind = sh === 'stripedCup' ? 'cup' : 'cone';
        hb = k.food(Object.assign({ n: 0 }, holderP), Object.assign({}, opts, { spoon: kind === 'cup' && scoops.length > 0 }));
      } else if (seq.body && shapeOf(seq.body) === 'bananaBoat') {
        kind = 'boat'; hb = k.food(Object.assign({ n: 0 }, seq.body), opts);
      } else if (seq.body && shapeOf(seq.body) === 'sinkBasin') {
        // Always filled (audit 2026-11-11: the fill popped in with the first scoop).
        kind = 'sink'; hb = k.food(Object.assign({ n: 0 }, seq.body), Object.assign({}, opts, { fill: true }));
      } else {
        // No holder picked yet (the scoop station's first answer): the holder's place is still empty.
        kind = 'cone'; hb = { g: new THREE.Group(), h: 0, rim: 0.08 };
      }
      g.add(hb.g);
      let top = hb.top || hb.h;
      const P = scoopPlaces(kind, scoops.length, r, hb), balls = [];
      scoops.forEach((p, i) => {
        const b = k.food(Object.assign({ n: i + 1 }, p), Object.assign({}, opts, { size: st, r }));
        const at = P.at[i];
        b.g.position.set(at.x + (st >= 4 ? 0.12 * r : 0), at.y - b.centre, at.z);
        if (st >= 4) b.g.rotation.z = -0.22;
        b.g.rotation.y = (i * 2.3) % 6.28;
        b.g.name = 'scoop-' + i;
        g.add(b.g);
        balls.push({ g: b.g, x: at.x, y: at.y, z: at.z, r });
        top = Math.max(top, at.y + r * 1.05);
      });
      // Bananas tuck in along both sides of the boat once the flourish has run (and always on the counter).
      if (kind === 'boat' && (has(made, 'banana') || o.where === 'counter')) bananas(hb).forEach(b => g.add(b));
      // The tops (where sauces, sprinkles and nuts lie) and the crowns (where the cream and the cherry go).
      const topBalls = P.tops.map(i => balls[i]).filter(Boolean);
      const tops = topBalls.map(b => ({ x: b.x, y: b.y, z: b.z, r: b.r }));
      let crowns;
      if (kind === 'cup' && scoops.length === 2) crowns = [{ x: 0, y: balls[0].y + 0.5 * r, z: 0, cr: clamp(0.95 * r, 0.06, 0.12) }];
      else if (kind === 'sink') crowns = tops.map(T => ({ x: T.x, y: T.y + 0.88 * T.r, z: T.z, cr: clamp(0.6 * T.r, 0.045, 0.08) }));
      else crowns = tops.map(T => ({ x: T.x, y: T.y + 0.86 * T.r, z: T.z, cr: clamp(0.82 * T.r, 0.05, 0.11) }));
      if (!crowns.length) crowns = [{ x: 0, y: top, z: 0, cr: 0.07 }];
      let S = null;
      const surfaceNow = () => {
        if (S) return S;
        const tmp = new THREE.Group();
        topBalls.forEach(b => { const ball = b.g.getObjectByName('ball'); if (ball) { const c = ball.clone(); b.g.updateMatrix(); ball.updateMatrix(); c.matrixAutoUpdate = false; c.matrix.multiplyMatrices(b.g.matrix, ball.matrix); tmp.add(c); } });
        S = k.surfaceOf(tmp, 0.25);
        return S;
      };
      let layer = 0, creamTop = null, creamSurf = null;
      toppings.forEach((p, i) => {
        const sh = shapeOf(p), n = 20 + i;
        let b;
        if (sh === 'rainbowSprinkles') b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { tops, surface: surfaceNow() }));
        else if (sh === 'fudgeDrizzle' || sh === 'caramelDrizzle') b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { tops, layer: layer++ }));
        else if (sh === 'whippedSwirl') {
          b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { crowns }));
          creamTop = crowns.map(C => C.y + 1.75 * C.cr / 0.92);
          creamSurf = k.surfaceOf(b.g, 0.35);
        } else if (sh === 'choppedNuts') {
          const base = surfaceNow(), surf = creamSurf ? mergeSurf(base, creamSurf) : base;
          b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { tops, crowns, surface: surf }));
        } else if (sh === 'maraschino') {
          const cherries = crowns.map((C, j) => ({ x: C.x + (creamTop ? 0.006 : 0), y: creamTop ? creamTop[j] - 0.012 : C.y - 0.008, z: C.z }));
          b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { cherries }));
          cherries.forEach(C => { top = Math.max(top, C.y + 0.13); });
        } else b = k.food(Object.assign({ n }, p), Object.assign({}, opts, { tops, crowns }));
        g.add(b.g);
      });
      if (creamTop) creamTop.forEach(y => { top = Math.max(top, y); });
      // Where an Add lands (world.js c.top()): the first crown, at the top of what is there.
      const mark = new THREE.Group();
      mark.name = 'stack';
      const C0 = crowns[0];
      mark.position.set(C0.x, 0, C0.z);
      mark.userData.h = creamTop ? creamTop[0] : (tops.length ? tops[0].y + tops[0].r : top);
      g.add(mark);
      // The Kitchen Sink on the counter is its own size (1.25), not the kit's 1.6 stretch: it is wide, and at 1.6 its
      // cream stood over the served customer's middle.
      const own = kind === 'sink' && o.where === 'counter' && (o.giant || 1) > 1 ? 1.15 : 1;
      const s = (o.contentScale || 1) * lineScale(o, top) * own;
      if (s !== 1) g.scale.setScalar(s);
      g.userData.h = top * s;
      return { g, h: top * s, stack: mark, tops, crowns, kind, giantDone: own !== 1 };
    }
    /** Two surfaces as one, each about half of the points (a dense cream swirl would take every nut otherwise). */
    function mergeSurf(a, b) {
      if (!a || !a.count) return b;
      if (!b || !b.count) return a;
      const out = { p: [], n: [], count: 0 }, m = Math.min(a.count, b.count);
      [a, b].forEach(S => {
        const step = S.count / m;
        for (let i = 0; i < m; i++) { const j = Math.floor(i * step) * 3; out.p.push(S.p[j], S.p[j + 1], S.p[j + 2]); out.n.push(S.n[j], S.n[j + 1], S.n[j + 2]); out.count++; }
      });
      return out;
    }
    /** The two banana halves, cut side up, curving along the boat's sides. */
    function bananas(hb) {
      const out = [];
      const geo = kept('banana', () => {
        const pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8 - 0.5; return V(t * 0.52, t * t * 0.16, t * t * 0.14); });
        const gg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.032, 10, false);
        const pos = gg.attributes.position;
        for (let i = 0; i < pos.count; i++) {      // tapered toward both ends
          const x = pos.getX(i), f = 1 - Math.pow(Math.abs(x) / 0.27, 3) * 0.55;
          const cy = (x / 0.52) * (x / 0.52) * 0.16, cz = (x / 0.52) * (x / 0.52) * 0.14;
          pos.setY(i, cy + (pos.getY(i) - cy) * f * 0.8);
          pos.setZ(i, cz + (pos.getZ(i) - cz) * f);
        }
        gg.computeVertexNormals();
        return gg;
      });
      [-1, 1].forEach((sd, i) => {
        const g = new THREE.Group();
        g.name = 'banana-' + i;
        const m = k.ink(geo, k.toon(0xf7e08a));
        g.add(m);
        // A row of seed flecks along the top of the cut half.
        const pts = Array.from({ length: 9 }, (_, j) => { const t = (j + 0.5) / 9 - 0.5, u = t * 0.46 / 0.52; return { p: [t * 0.46, u * u * 0.16 + 0.025, u * u * 0.14], nrm: [0, 1, 0], r: j, t: 0.5 }; });
        g.add(k.scatter('seed', k.toon(0x6b5530), pts, { outline: false, size: 0.75 }));
        // Along the sides, the ends curving in (and up over the rim) so neither half passes through the dish's
        // narrowing glass (audit 2026-11-11).
        g.position.set(0, hb.h + 0.02, sd * (hb.wid * 0.7));
        if (sd > 0) g.rotation.y = Math.PI;
        out.push(g);
      });
      return out;
    }
    /** The milkshake: in its steel cup on the mixer (until it is poured: made.auto has 'glass'), the empty glass
     *  waiting at its spot; then the glass, full, a straw, cream and cherry on top. */
    function shakeItem(made, o) {
      o = o || {};
      const seq = k.sequence(made, o), g = new THREE.Group();
      const flv = made.picks && made.picks.shakeFlavour, FL = flv ? k.slotLook('shakeFlavour', flv) : null;
      const fc = FL && FL.colour !== undefined ? FL.colour : VANILLA;
      const flavourPart = seq.parts.find(p => p.slot === 'shakeFlavour');
      const frost = !!(flavourPart && flavourPart.gross);
      const poured = has(made, 'glass') || o.where === 'counter' || o.poured;
      const glass = tallGlass();
      g.add(glass.g);
      let top = glass.h, stackH = glass.h;
      if (!poured) {
        // The mixer right of and behind the glass's spot. The steel cup is filled on the counter in front of it,
        // then stands on the mixer's rest, the spindle down in it, from when the milk is in until it is poured.
        const cooked = o.stage !== undefined && o.stage !== null ? true : !!made.done;
        const mounted = cooked || has(made, 'milk');
        const sc = steelCup(cooked ? { stage: shakeIdx(made, o), fc } : { scoop: !!flv, milk: has(made, 'milk'), fc, frost });
        const mx = new THREE.Group();
        mx.name = 'mixerAt';
        mx.position.copy(MIXER);
        if (o.where !== 'alone') mx.add(mixer(!mounted));
        if (mounted) {
          sc.g.position.y = CUP_AT;
          mx.add(sc.g);
        } else {
          sc.g.position.copy(CUP_SPOT);
          g.add(sc.g);
        }
        if (frost && flavourPart) {
          const sco = sc.g.getObjectByName('shakeScoops');
          if (sco) k.gross(sco, flavourPart.gross, { g: sco }, {});
        }
        g.add(mx);
        top = Math.max(top, 0.6);
        stackH = glass.h;
      } else {
        const st = shakeIdx(made, o);
        const f = glassFill(glass, st, fc, LEVEL[st] / 0.9);
        g.add(f.g);
        g.add(straw(glass.h));
        top = Math.max(top, glass.h + 0.12);
        // The cream sits on the shake: at the rim when it is full, on the liquid when it has melted down or is still
        // lumps in milk (audit 2026-11-11: it floated in the glass's mouth over a melted puddle).
        const crown = { x: 0, y: st === 0 || st >= 4 ? f.h : Math.max(f.h, glass.h - 0.012), z: 0, cr: 0.082 };
        let creamTop = null;
        seq.parts.filter(p => !p.slot).forEach((p, i) => {
          const sh = shapeOf(p);
          if (sh === 'whippedSwirl') {
            const b = k.food(Object.assign({ n: 20 + i }, p), Object.assign({}, o, { item: made, crowns: [crown] }));
            g.add(b.g);
            creamTop = crown.y + 1.75 * crown.cr / 0.92;
            top = Math.max(top, creamTop);
          } else if (sh === 'maraschino') {
            const b = k.food(Object.assign({ n: 20 + i }, p), Object.assign({}, o, { item: made, cherries: [{ x: 0.004, y: creamTop ? creamTop - 0.012 : crown.y + 0.004, z: 0 }] }));
            g.add(b.g);
            top = Math.max(top, (creamTop || crown.y) + 0.13);
          } else {
            const b = k.food(Object.assign({ n: 20 + i }, p), Object.assign({}, o, { item: made, crowns: [crown] }));
            g.add(b.g);
          }
        });
        stackH = creamTop || crown.y;
      }
      const mark = new THREE.Group();
      mark.name = 'stack';
      mark.userData.h = stackH;
      g.add(mark);
      const s = (o.contentScale || 1) * lineScale(o, top);
      if (s !== 1) g.scale.setScalar(s);
      g.userData.h = top * s;
      return { g, h: top * s, stack: mark, steel: g.getObjectByName('steelCup'), glass: glass.g };
    }
    const layouts = {
      coneStack: (made, o) => scoopItem(made, o),
      cupStack: (made, o) => scoopItem(made, o),
      sundaeCup: (made, o) => scoopItem(made, o),
      bananaSplit: (made, o) => scoopItem(made, o),
      kitchenSinkSundae: (made, o) => scoopItem(made, o),
      shakeGlass: (made, o) => shakeItem(made, o),
    };

    /* ── the scooper ── */
    /** The steel scoop with its red handle (as the painted one): the ball sits in its bowl. */
    function scooper() {
      const g = new THREE.Group();
      g.name = 'scooper';
      const bowl = k.ink(kept('scBowl', () => new THREE.SphereGeometry(0.055, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), k.toon(STEEL));
      g.add(bowl);
      const neck = k.ink(kept('scNeck', () => k.cyl(0.011, 0.16, 8)), k.toon(STEEL));
      neck.rotation.z = Math.PI / 2 - 0.45;
      neck.position.set(0.1, -0.02, 0.02);
      const grip = k.ink(kept('scGrip', () => new THREE.CapsuleGeometry(0.02, 0.16, 4, 10)), k.toon(0xd8283a));
      grip.rotation.z = Math.PI / 2 - 0.45;
      grip.position.set(0.25, 0.05, 0.03);
      g.add(neck, grip);
      return g;
    }
    /** The sizing rings under the ball: none at Scrape, 1 to 3 at Small to Huge, 4 red at Avalanche. */
    function sizeRings(st, r) {
      const g = new THREE.Group();
      g.name = 'rings';
      // A dark sizing plate under the rings, so every ring colour reads over every tub.
      const plate = k.ink(kept('sizePlate', () => k.cyl(1, 0.012, k.seg(36))), k.toon(0x46505c));
      const PR = Math.max(r, 0.06) * 1.25 + Math.max(0, k.marks({}, st) - 1) * 0.03 + 0.03;
      plate.scale.set(PR, 1, PR);
      plate.position.y = -0.006;
      g.add(plate);
      for (let i = 0; i < k.marks({}, st); i++) {
        const m = k.inkThin(kept('sizeRing', () => new THREE.TorusGeometry(1, 0.055, 5, k.seg(36)).rotateX(Math.PI / 2)), k.toon(MARK[st]));
        const R = Math.max(r, 0.06) * 1.25 + i * 0.03;
        m.scale.set(R, R * 0.25, R);
        m.position.y = 0.004;
        g.add(m);
      }
      return g;
    }
    /** The scooper with a ball of that size in it (at the scoop set's `scooper` spot), its rings below. */
    function scooperWith(st, look) {
      const g = new THREE.Group();
      g.name = 'scooperAt';
      const sc = scooper();
      const r = R0 * SIZE_SCALE[st];
      const b = scoop({ ing: 'iceCream', look }, { size: st });
      b.g.position.y = 0.01;
      sc.add(b.g);
      sc.position.y = 0.06;
      g.add(sc);
      const rings = sizeRings(st, r);
      g.add(rings);
      return { g, scooper: sc, ball: b.g };
    }

    /* ── cooking: the scoop's size, the shake's thickness ── */
    const madeOf = (c, s) => s.made || c.state.made || null;
    function showItemAt(c, made, o) {
      if (!made) return null;
      const A = c.anchors, b = k.item(made, Object.assign({ where: 'line', set: o && o.set }, o));
      if (A.giantMax && b.giant > A.giantMax) { const f = A.giantMax / b.giant; b.g.scale.multiplyScalar(f); b.h *= f; }
      b.g.position.copy(A.stack);
      b.g.name = 'item';
      c.F.add(b.g);
      return b;
    }
    const cooks = {
      scoop: {
        /** The item so far at its spot, and the scooper over the tubs with a ball of the stage's size in it and
         *  that many sizing rings below; it bobs while Timed scoops. */
        show(c, s) {
          const made = madeOf(c, s), st = clamp(s.stage | 0, 0, 4);
          if (made) showItemAt(c, made, { set: 'scoop' });
          const w = scooperWith(st, k.lookOf('iceCream'));
          w.g.position.copy(c.anchors.scooper);
          w.g.scale.setScalar(LINE.scale);
          c.F.add(w.g);
          if (s.cooking) k.spin(w.scooper, 'bob', { amp: 0.012, speed: 5 });
        },
        add(c, s) { c.redraw({ stage: 0 }); return P0(); },
        /** Simple: the ball grows a stage at a time to the size asked for. */
        run(c, s) {
          const stage = clamp(s.stage | 0, 0, 4), ms = s.ms || 1600;
          if (k.reduced()) { c.redraw({ stage, cooking: false }); return P0(); }
          let p = P0();
          for (let i = 0; i <= stage; i++) p = p.then(() => { c.redraw({ stage: i, cooking: true }); return k.wait(ms / (stage + 1)); });
          return p.then(() => { c.redraw({ stage, cooking: false }); });
        },
        stage(c, s) { c.redraw({ stage: s.stage, cooking: true }); },
      },
      shake: {
        /** The shake in its steel cup on the mixer at the stage, the empty glass waiting; the cup turns while it
         *  mixes. */
        show(c, s) {
          const made = madeOf(c, s) || { recipe: 'milkshake', ing: 'milkshake', parts: [], picks: {}, counts: {}, auto: ['milk'], gross: [] };
          const b = showItemAt(c, without(made, ['glass']), { set: 'toppings', stage: clamp(s.stage | 0, 0, 4) });
          if (b && s.cooking) {
            const cupG = b.g.getObjectByName('steelCup');
            if (cupG) k.spin(cupG, 'spinY', { speed: 9 });
          }
        },
        add(c) { c.redraw({ stage: 0 }); return P0(); },
        run(c, s) {
          const stage = clamp(s.stage | 0, 0, 4), ms = s.ms || 1600;
          if (k.reduced()) { c.redraw({ stage, cooking: false }); return P0(); }
          let p = P0();
          for (let i = 0; i <= stage; i++) p = p.then(() => { c.redraw({ stage: i, cooking: true }); return k.wait(ms / (stage + 1)); });
          return p.then(() => { c.redraw({ stage, cooking: false }); });
        },
        stage(c, s) { c.redraw({ stage: s.stage, cooking: true }); },
      },
    };

    /* ── the line: how each topping waits and goes on ── */
    /** What makes a clear jar read on the white marble (it is never inked): a tinted rim and base ring and two
     *  bright streaks down its side. */
    function glassCues(g, r, h) {
      const tint = k.toon(0xa9d3e6);
      const rim = k.inkThin(kept('cueRim:' + r, () => new THREE.TorusGeometry(r, 0.005, 5, k.seg(28)).rotateX(Math.PI / 2)), tint);
      rim.position.y = h;
      const base = k.inkThin(kept('cueBase:' + r, () => new THREE.TorusGeometry(r + 0.004, 0.006, 5, k.seg(28)).rotateX(Math.PI / 2)), tint);
      base.position.y = 0.006;
      g.add(rim, base);
      [[-2.2, 0.009], [-1.8, 0.005]].forEach(([a, w], i) => {
        const st = new THREE.Mesh(kept('cueStreak:' + r + ':' + i, () => new THREE.BoxGeometry(w, h * 0.6, 0.002)), k.SHINE);
        st.position.set(Math.cos(a) * (r + 0.004), h * 0.45, -Math.sin(a) * (r + 0.004));
        st.rotation.y = a + Math.PI / 2;
        g.add(st);
      });
    }
    /** A glass jar of something loose (sprinkles, nuts): open, its heap named 'heap' for k.tip. Drawn 1.9x. */
    function jar(part) {
      const L = k.lookFor(part), g = new THREE.Group(), S = 1.9;
      const glass = new THREE.Mesh(kept('jar', () => k.lathe([[0, 0], [0.08, 0], [0.086, 0.012], [0.086, 0.17], [0.07, 0.19], [0.07, 0.205], [0.064, 0.205], [0.064, 0.19]], k.seg(28))), GLASS());
      glass.renderOrder = 3;
      g.add(glass);
      glassCues(g, 0.086, 0.17);
      const rim = k.inkThin(kept('jarRim', () => new THREE.TorusGeometry(0.067, 0.005, 5, k.seg(24)).rotateX(Math.PI / 2)), k.toon(0xa9d3e6));
      rim.position.y = 0.205;
      g.add(rim);
      const heap = new THREE.Group();
      heap.name = 'heap';
      const seed = 'jar:' + part.ing + ':' + (part.n || 0), R = k.rand(seed), pts = [];
      for (let i = 0; i < k.thin(L.shape === 'rainbowSprinkles' ? 150 : 70, 40); i++) {
        const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.072, y = R() * 0.13;
        pts.push({ p: [Math.cos(a) * rr, y, Math.sin(a) * rr], nrm: [0, 1, 0], r: R() * 6, t: R() });
      }
      if (L.shape === 'rainbowSprinkles') {
        const piece = kept('sprinkle', () => new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 6).rotateZ(Math.PI / 2));
        RAINBOW.forEach((c, i) => heap.add(k.scatter(piece, k.toon(c), pts.filter((_, j) => j % RAINBOW.length === i), { outline: false, tilt: 3 })));
      } else {
        const piece = kept('nut', () => new THREE.DodecahedronGeometry(0.011, 0).scale(1.2, 0.8, 1));
        heap.add(k.scatter(piece, k.toon(L.colour !== undefined ? L.colour : 0xc89a5c), pts.filter((_, i) => i % 3), { outline: 'thin', tilt: 3, size: 1.3 }));
        heap.add(k.scatter(piece, k.toon(0x9a6a38), pts.filter((_, i) => !(i % 3)), { outline: 'thin', tilt: 3, size: 1.3 }));
      }
      heap.position.y = 0.014;
      heap.userData.part = part;
      if (part.gross) k.gross(heap, part.gross, { g: heap }, {});
      g.add(heap);
      const mouth = new THREE.Object3D();
      mouth.name = 'mouth';
      mouth.position.y = 0.205;
      g.add(mouth);
      g.scale.setScalar(S);
      g.userData.part = part;
      return { g, h: 0.205 * S };
    }
    /** The warmer pot of hot fudge or caramel, a ladle resting in it. */
    function warmer(part) {
      const L = k.lookFor(part), g = new THREE.Group(), S = 1.8;
      g.add(k.ink(kept('pot', () => k.lathe([[0, 0], [0.1, 0], [0.104, 0.01], [0.104, 0.11], [0.112, 0.118], [0.098, 0.12], [0.094, 0.012], [0, 0.012]], k.seg(28))), k.toon(STEEL)));
      const f = k.fill([[0.094, 0.012], [0.094, 0.1]], 0.85, L.colour, { seg: 24, surface: k.mix(L.colour, 0xffffff, 0.06) });
      g.add(f.g);
      const gl = new THREE.Mesh(kept('potGlint', () => new THREE.CircleGeometry(0.02, 10).rotateX(-Math.PI / 2).scale(1.6, 1, 0.6)), k.SHINE);
      gl.position.set(-0.03, f.h + 0.002, 0.03);
      g.add(gl);
      const ladle = new THREE.Group();
      ladle.name = 'ladle';
      const bowl = k.ink(kept('ladleBowl', () => new THREE.SphereGeometry(0.034, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), k.toon(STEEL));
      const blob = new THREE.Mesh(kept('ladleBlob', () => new THREE.CircleGeometry(0.031, 12).rotateX(-Math.PI / 2)), k.toon(L.colour));
      blob.position.y = -0.006;
      const handle = k.ink(kept('ladleH', () => k.cyl(0.006, 0.26, 6)), k.toon(STEEL));
      handle.position.set(0.05, 0.12, 0);
      handle.rotation.z = -0.42;
      // The bowl's lip on the side it tips toward: the sauce's stream starts there.
      const lipM = new THREE.Object3D();
      lipM.name = 'ladleLip';
      lipM.position.set(-0.034, 0, 0);
      ladle.add(bowl, blob, handle, lipM);
      ladle.position.set(-0.02, f.h + 0.03, 0);
      g.add(ladle);
      g.scale.setScalar(S);
      g.userData.part = part;
      g.userData.sauce = L.colour;
      return { g, h: 0.12 * S };
    }
    /** The whipped cream canister: steel, a red nozzle, a puff of cream on it. */
    function canister(part) {
      const g = new THREE.Group(), S = 1.8;
      g.add(k.ink(kept('can', () => k.lathe([[0, 0], [0.052, 0], [0.056, 0.01], [0.056, 0.2], [0.05, 0.225], [0.03, 0.24], [0, 0.242]], k.seg(24))), k.toon(STEEL)));
      const gl = new THREE.Mesh(kept('canGlint', () => new THREE.CylinderGeometry(0.0565, 0.0565, 0.15, 8, 1, true, -0.7, 0.24)), k.SHINE);
      gl.position.y = 0.1;
      g.add(gl);
      const nozzle = k.ink(kept('nozzle', () => new THREE.CylinderGeometry(0.008, 0.016, 0.07, 8)), k.toon(0xd8283a));
      nozzle.position.y = 0.276;
      nozzle.rotation.z = -0.3;
      g.add(nozzle);
      const puff = swirlGroup(0.022, WHITE);
      puff.name = 'puff';
      puff.position.set(0.012, 0.302, 0);
      g.add(puff);
      // The nozzle's tip: the whip's Add rides it just over the growing cream.
      const tipM = new THREE.Object3D();
      tipM.name = 'nozzleTip';
      tipM.position.set(0.0103, 0.3094, 0);
      g.add(tipM);
      g.scale.setScalar(S);
      g.userData.part = part;
      return { g, h: 0.33 * S };
    }
    /** A glass jar of cherries, the next one (the part itself: a cherry, or a cherry tomato) waiting on top. */
    function cherryJar(part) {
      const g = new THREE.Group(), S = 1.9;
      const glass = new THREE.Mesh(kept('jar', () => k.lathe([[0, 0], [0.08, 0], [0.086, 0.012], [0.086, 0.17], [0.07, 0.19], [0.07, 0.205], [0.064, 0.205], [0.064, 0.19]], k.seg(28))), GLASS());
      glass.renderOrder = 3;
      g.add(glass);
      glassCues(g, 0.086, 0.17);
      // Two layers of whole cherries in their red syrup, not touching (a heap of them read as one pink lump).
      const pts = [];
      [[4, 0.046, 0.042, 0], [3, 0.036, 0.1, 0.6]].forEach(([n, rr, y, a0]) => { for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; pts.push({ p: [Math.cos(a) * rr, y, Math.sin(a) * rr], nrm: [0, 1, 0], r: i, t: 0.5 }); } });
      g.add(k.fill([[0.08, 0.012], [0.08, 0.17]], 0.25, 0x8e0a18, { seg: 24 }).g);
      g.add(k.scatter(kept('cherryBody', () => new THREE.SphereGeometry(0.03, k.seg(18), 12).scale(1, 0.92, 1)), k.toon(0xd0101c), pts, { outline: 'thin' }));
      const next = k.food(Object.assign({}, part), {});
      next.g.name = 'next';
      next.g.position.y = 0.15;
      g.add(next.g);
      g.scale.setScalar(S);
      g.userData.part = part;
      return { g, h: 0.22 * S };
    }
    /* Every topping goes on as it would at a real topping bar and lands exactly where it then stays: the item is
       drawn with the topping on it (swapItem) and the motion brings that topping in, so nothing jumps, pops or
       changes when the next step draws the item again (audit 2026-11-11: the cream grew at one spot then appeared at
       another, one cherry flew and three appeared, the can's nozzle went into the food). */
    const withPart = (made, part) => Object.assign({}, made, { parts: (made.parts || []).concat([part.gross ? { ing: part.ing, gross: part.gross } : { ing: part.ing }]) });
    /** Draw the item again as `made` in place of the one on show, leaving what waits on the line where it is
     *  (c.showItem would clear it away). As world.js draws a line item: its set's options, capped by giantMax. */
    function swapItem(c, made) {
      const old = c.F.getObjectByName('item');
      const b = k.item(made, { where: 'line', set: c.set, vesselScale: c.anchors.vesselScale });
      if (c.anchors.giantMax && b.giant > c.anchors.giantMax) { b.g.scale.multiplyScalar(c.anchors.giantMax / b.giant); b.h *= c.anchors.giantMax / b.giant; }
      b.g.position.copy(old ? old.position : (c.anchors.stack || V(0, 0, 0)));
      if (old) k.free(old);
      b.g.name = 'item';
      c.F.add(b.g);
      c.F.updateMatrixWorld(true);
      return b;
    }
    /** The item's last child called `name`: the topping just put on. */
    const newest = (b, name) => { const l = b.g.children.filter(o => o.name === name); return l[l.length - 1] || null; };
    /** What waited on the line goes on down it, righting itself. */
    function leave(inc, ms) {
      const p0 = inc.position.clone(), r0 = inc.rotation.z;
      return k.tween(ms || 300, t => { const e = k.ease(t); inc.position.set(p0.x + e * 2.4, p0.y + Math.sin(t * Math.PI) * 0.1, p0.z); inc.rotation.z = r0 * (1 - e); });
    }
    /** Fade a group in: f(a) for a 0..1, on its own copies of its materials (the shared ones are never changed);
     *  its ink shows once it is nearly there. */
    function fader(g) {
      const list = [];
      g.traverse(o => {
        if (!o.isMesh) return;
        if (o.userData.hull) { list.push({ o, hull: true }); return; }
        const base = o.material.opacity !== undefined ? o.material.opacity : 1, m = k.own(o.material.clone());
        m.transparent = true;
        o.material = m;
        list.push({ o, m, base });
      });
      return a => list.forEach(L => { if (L.hull) L.o.visible = a > 0.75; else L.m.opacity = L.base * a; });
    }
    const STREAM = () => kept('sauceStream', () => new THREE.CylinderGeometry(0.017, 0.013, 1, 8, 1));
    const lines = {
      jar: {
        incoming: part => Object.assign(jar(part), { rest: 0 }),
        /** The open jar comes over the food and tips, mouth down: the sprinkles or nuts shower out and settle over the
         *  top, exactly where they stay; the jar rights itself and goes on. */
        add(c) {
          const inc = c.inc, mouth = inc && inc.getObjectByName('mouth');
          if (!inc || !mouth || !c.made || !c.part) return P0();
          const b = swapItem(c, withPart(c.made, c.part));
          const T = newest(b, shapeOf(c.part) === 'rainbowSprinkles' ? 'sprinkles' : 'nuts');
          if (!T) { if (c.onApply) c.onApply(); return leave(inc); }
          const box = k.boxOf(T), mid = new THREE.Vector3();
          box.getCenter(mid);
          const top = V(mid.x, box.max.y, mid.z), topF = c.toF(b.g, top);
          T.visible = false;
          const heap = inc.getObjectByName('heap'), h0 = heap ? heap.position.y : 0;
          const TILT = 2.0, low = topF.clone().add(V(0.05, 0.3, 0)), hi = low.clone().add(V(0.3, 0.26, 0));
          const pose = (p, rz) => { inc.rotation.z = rz; placeBy(c, inc, mouth, p); };
          const m0 = c.toF(mouth, V(0, 0, 0));
          const toItem = p => b.g.worldToLocal(c.F.localToWorld(p.clone()));
          return k.tween(360, t => { const q = m0.clone().lerp(hi, k.ease(t)); q.y += Math.sin(t * Math.PI) * 0.06; pose(q, 0); })
            .then(() => k.tween(260, t => {
              const e = k.ease(t);
              pose(hi.clone().lerp(low, e), TILT * e);
              // What is in the jar slides toward its mouth as it tips.
              if (heap) { heap.position.y = h0 + 0.05 * e; heap.scale.setScalar(1 - 0.3 * e); }
            }))
            .then(() => {
              if (c.onApply) c.onApply();
              const from = toItem(c.toF(mouth, V(0, 0, 0)));
              T.visible = true;
              // A small clump at the mouth falls and spreads out onto the top, ending as drawn.
              return k.tween(520, t => {
                const s = 0.12 + 0.88 * k.ease(t), fall = t * t;
                const M = from.clone().lerp(top, fall);
                T.scale.setScalar(s);
                T.position.copy(M.sub(top.clone().multiplyScalar(s)));
              });
            })
            .then(() => { T.scale.setScalar(1); T.position.set(0, 0, 0); })
            .then(() => k.tween(240, t => { const e = k.ease(t); pose(low.clone().lerp(hi, e), TILT * (1 - e)); if (heap) { heap.position.y = h0 + 0.05 * (1 - e); } }))
            .then(() => leave(inc));
        },
      },
      /** A shake flavour waiting on the line (the bad one: freezer-burned): a scoop in its dish, drawn up. */
      dish: {
        incoming(part) {
          const b = k.food(Object.assign({}, part), {});
          const w = new THREE.Group();
          w.add(b.g);
          w.scale.setScalar(1.8);
          w.userData.part = part;
          return { g: w, h: b.h * 1.8, rest: 0 };
        },
        /** It was picked anyway: its scoops hop from the dish into the steel cup, and the dish goes on. */
        add(c) {
          const inc = c.inc;
          if (!inc || !c.made || !c.part) return P0();
          const v = c.part.ing;
          const made = Object.assign({}, c.made, {
            picks: Object.assign({}, c.made.picks, { shakeFlavour: v }),
            gross: (c.made.gross || []).concat(c.part.gross ? [{ slot: 'shakeFlavour', value: v, event: c.part.gross }] : []),
          });
          const b = swapItem(c, made), sc = b.g.getObjectByName('shakeScoops');
          if (!sc) { if (c.onApply) c.onApply(); return leave(inc); }
          const local = sc.parent.worldToLocal(c.F.localToWorld(c.toF(inc, V(0, 0.07, 0))));
          const start = local.sub(V(0, MIXCUP.h * 0.6, 0));
          // Everything but the dish leaves it: the scoop and its frost (the fx sits on the dish's group).
          const dishG = inc.getObjectByName('shakeScoop');
          if (dishG) dishG.children.forEach(o => { if (o.name !== 'dish') o.visible = false; });
          return k.tween(460, t => {
            const e = k.ease(t);
            sc.position.set(start.x * (1 - e), start.y * (1 - e) + Math.sin(t * Math.PI) * 0.22, start.z * (1 - e));
          }).then(() => { if (c.onApply) c.onApply(); return leave(inc); });
        },
      },
      ladle: {
        incoming: part => Object.assign(warmer(part), { rest: 0 }),
        /** The ladle lifts straight up out of the pot, goes over the food and tips: a glossy stream runs from its lip
         *  onto each top in turn, and the sauce spreads over that top as it lands; then it goes back in the pot. */
        add(c) {
          const inc = c.inc, ladle = inc && inc.getObjectByName('ladle'), lipM = ladle && ladle.getObjectByName('ladleLip');
          if (!ladle || !lipM || !c.made || !c.part) return P0();
          const b = swapItem(c, withPart(c.made, c.part)), SA = newest(b, 'sauce');
          const caps = SA ? SA.children.filter(o => o.name === 'sauceCap') : [];
          const hits = (b.tops || []).map(T => c.toF(b.g, V(T.x, T.y + T.r * 1.08, T.z)));
          if (!caps.length || caps.length !== hits.length) { if (c.onApply) c.onApply(); return P0(); }
          const fades = caps.map(fader);
          fades.forEach(f => f(0));
          c.F.updateMatrixWorld(true);
          c.F.attach(ladle);
          const q0 = ladle.rotation.z, TIP = 1.0, H = 0.17;
          const pose = (p, rz) => { ladle.rotation.z = rz; placeBy(c, ladle, lipM, p); };
          const l0 = c.toF(lipM, V(0, 0, 0)), up = l0.clone().add(V(0, 0.3, 0));
          const over = i => hits[i].clone().add(V(0, H, 0));
          const jet = new THREE.Mesh(STREAM(), k.toon(inc.userData.sauce));
          jet.visible = false;
          c.F.add(jet);
          const stream = (to, w) => {
            const L = c.toF(lipM, V(0, 0, 0)), len = Math.max(0.001, L.y - to.y);
            jet.visible = w > 0.02;
            jet.position.set(L.x, to.y + len / 2, L.z);
            jet.scale.set(w, len, w);
          };
          let p = k.tween(200, t => pose(l0.clone().lerp(up, k.ease(t)), q0))
            .then(() => k.tween(340, t => { const e = k.ease(t); pose(up.clone().lerp(over(0), e), q0 + TIP * e); }));
          hits.forEach((h, i) => {
            if (i) p = p.then(() => k.tween(220, t => pose(over(i - 1).lerp(over(i), k.ease(t)), q0 + TIP)));
            p = p.then(() => { if (i === 0 && c.onApply) c.onApply(); })
              .then(() => k.tween(hits.length > 1 ? 420 : 560, t => { stream(h, Math.min(1, t * 6) * (t > 0.85 ? (1 - t) / 0.15 : 1)); fades[i](clamp((t - 0.12) / 0.6, 0, 1)); }))
              .then(() => { jet.visible = false; fades[i](1); });
          });
          return p.then(() => { k.free(jet); })
            .then(() => k.tween(320, t => { const e = k.ease(t); pose(over(hits.length - 1).lerp(up, e), q0 + TIP * (1 - e)); }))
            .then(() => k.tween(200, t => pose(up.clone().lerp(l0, k.ease(t)), q0)))
            .then(() => { inc.attach(ladle); return leave(inc); });
        },
      },
      whip: {
        incoming: part => Object.assign(canister(part), { rest: 0 }),
        /** The can turns over above the food and pipes each swirl in its own place, the nozzle riding just over the
         *  growing cream (never into the food); then it rights itself and goes on. */
        add(c) {
          const inc = c.inc, tip = inc && inc.getObjectByName('nozzleTip');
          if (!inc || !tip || !c.made || !c.part) return P0();
          const b = swapItem(c, withPart(c.made, c.part)), W = newest(b, 'whipped');
          const swirls = W ? W.children.filter(o => o.name === 'cream') : [];
          if (!swirls.length) { if (c.onApply) c.onApply(); return leave(inc); }
          // The swirl's foot sits down among the scoops: the nozzle never goes lower than the scoops' surface under
          // it (the cream comes up out of the valley as it grows).
          const floorAt = s => {
            const p = s.position;
            let y = -1e9;
            (b.tops || []).forEach(T => { const d = Math.hypot(p.x - T.x, p.z - T.z), R = T.r * 1.06; if (d < R) y = Math.max(y, T.y + Math.sqrt(R * R - d * d)); });
            return y > -1e9 ? c.toF(b.g, V(p.x, y, p.z)).y : -1e9;
          };
          const G = swirls.map(s => ({ s, base: c.toF(s, V(0, 0, 0)), top: c.toF(s, V(0, s.userData.h, 0)), floor: floorAt(s) }));
          swirls.forEach(s => s.scale.setScalar(0.001));
          const puff = inc.getObjectByName('puff');
          const GAP = 0.03;
          const at = (G0, g) => { const q = G0.base.clone().lerp(G0.top, g).add(V(0, GAP, 0)); q.y = Math.max(q.y, G0.floor + GAP); return q; };
          const pose = (p, rz) => { inc.rotation.z = rz; placeBy(c, inc, tip, p); };
          // It rises upright to well above the food, then turns over there (never swinging its body through anything
          // on the bar), and comes down nozzle first.
          const start = c.toF(tip, V(0, 0, 0)), hi = at(G[0], 1).add(V(0, 0.14, 0)), lift = start.clone().add(V(0, 0.42, 0));
          const above = hi.clone().add(V(0, 0.18, 0));
          let p = k.tween(220, t => { pose(start.clone().lerp(lift, k.ease(t)), 0); if (puff) puff.visible = t < 0.5; })
            .then(() => k.tween(360, t => { const e = k.ease(t); pose(lift.clone().lerp(above, e), Math.PI * e); }))
            .then(() => k.tween(160, t => pose(above.clone().lerp(hi, k.ease(t)), Math.PI)));
          G.forEach((G0, i) => {
            const from = i ? at(G[i - 1], 1).add(V(0, 0.05, 0)) : hi;
            p = p.then(() => k.tween(i ? 260 : 180, t => pose(from.clone().lerp(at(G0, 0.06), k.ease(t)), Math.PI)))
              .then(() => { if (i === 0 && c.onApply) c.onApply(); })
              .then(() => k.tween(G.length > 1 ? 440 : 600, t => {
                const g = 0.06 + 0.94 * k.ease(t), q = at(G0, g);
                G0.s.scale.setScalar(g);
                G0.s.rotation.y = (1 - k.ease(t)) * 2.4;
                q.x += Math.sin(t * Math.PI * 4) * 0.006 * (1 - t);
                pose(q, Math.PI);
              }))
              .then(() => { G0.s.scale.setScalar(1); G0.s.rotation.y = 0; });
          });
          const last = G[G.length - 1];
          return p.then(() => k.tween(180, t => pose(at(last, 1).add(V(0, 0.1 * k.ease(t), 0)), Math.PI)))
            .then(() => leave(inc, 320));
        },
      },
      cherryJar: {
        incoming: part => Object.assign(cherryJar(part), { rest: 0 }),
        /** A cherry for each crown hops out of the jar and lands exactly where it stays, at its size there (the
         *  waiting one first: a cherry, or a cherry tomato). */
        add(c) {
          const inc = c.inc, next = inc && inc.getObjectByName('next');
          if (!inc || !c.made || !c.part) return P0();
          const b = swapItem(c, withPart(c.made, c.part)), CH = newest(b, 'cherries');
          const targets = CH ? CH.children.filter(o => o.name === 'cherry') : [];
          if (!targets.length) { if (c.onApply) c.onApply(); return leave(inc); }
          const fs = new THREE.Vector3();
          c.F.getWorldScale(fs);
          const goals = targets.map(t => { const ws = new THREE.Vector3(); t.getWorldScale(ws); return { t, p: c.toF(t, V(0, 0, 0)), s: ws.x / fs.x }; });
          targets.forEach(t => { t.visible = false; });
          const from = c.toF(inc, V(0, 0.15, 0));
          let p = P0();
          goals.forEach((G0, i) => {
            p = p.then(() => {
              let fly;
              if (i === 0 && next) { c.F.updateMatrixWorld(true); c.F.attach(next); fly = next; }
              else { fly = k.food(Object.assign({}, c.part), {}).g; fly.position.copy(from); fly.scale.setScalar(inc.scale.x); c.F.add(fly); }
              const inner = fly.getObjectByName('cherry');
              const p0 = fly.position.clone(), s0 = fly.scale.x, r0 = inner ? inner.rotation.y : 0;
              return k.tween(goals.length > 1 ? 360 : 440, t => {
                const e = k.ease(t);
                fly.position.lerpVectors(p0, G0.p, e);
                fly.position.y += Math.sin(t * Math.PI) * 0.3;
                fly.scale.setScalar(s0 + (G0.s - s0) * e);
                if (inner) inner.rotation.y = r0 + (G0.t.rotation.y - r0) * e;
              }).then(() => { if (i === 0 && c.onApply) c.onApply(); k.free(fly); G0.t.visible = true; });
            });
          });
          return p.then(() => leave(inc));
        },
      },
    };
    const applies = { rainbowSprinkles: 'jar', choppedNuts: 'jar', fudgeDrizzle: 'ladle', caramelDrizzle: 'ladle', whippedSwirl: 'whip', maraschino: 'cherryJar', shakeScoop: 'dish' };

    /* ── gross-out fx: the cherry tomato, the freezer burn ── */
    const fx = {
      /** A cherry that is actually a cherry tomato: bigger, matte, a lighter orange-red, its long stem gone, a green
       *  star of a calyx on top. */
      tomato(g) {
        const list = [];
        g.traverse(o => { if (o.name === 'cherry') list.push(o); });
        if (!list.length) list.push(g);
        list.forEach(ch => {
          const body = ch.getObjectByName('cherryBody'), glint = ch.getObjectByName('glint'), stem = ch.getObjectByName('stem');
          if (body) {
            body.scale.setScalar(1.22);
            body.traverse(o => { if (o.isMesh && !o.userData.hull) o.material = k.toon(0xf0472e); });
          }
          if (glint) glint.scale.setScalar(0.001);
          if (stem) stem.scale.setScalar(0.001);
          const top = (body ? body.position.y : 0.028) + 0.03 * 0.92 * 1.22;
          const calyx = k.fxPart(new THREE.Group());
          const leaf = kept('calyx', () => new THREE.SphereGeometry(1, 8, 4).scale(0.022, 0.004, 0.007).translate(0.016, 0, 0));
          for (let i = 0; i < 5; i++) {
            const m = new THREE.Mesh(leaf, k.toon(0x3f9a2e));
            m.rotation.y = i * Math.PI * 2 / 5;
            m.rotation.z = 0.25;
            calyx.add(m);
          }
          const nub = new THREE.Mesh(kept('nub', () => k.cyl(0.004, 0.014, 6)), k.toon(0x3f9a2e));
          nub.position.y = 0.007;
          calyx.add(nub);
          calyx.position.y = top - 0.002;
          ch.add(calyx);
        });
      },
      /** Freezer burn: white frost crystals and a grey crust on the top of the ice cream. */
      frost(g, v, box) {
        const S = k.surfaceOf(g, 0.45), y0 = box.max.y - (box.max.y - box.min.y) * 0.45;
        const S2 = { p: [], n: [], count: 0 };
        for (let i = 0; i < S.count; i++) if (S.p[i * 3 + 1] >= y0) { S2.p.push(S.p[i * 3], S.p[i * 3 + 1], S.p[i * 3 + 2]); S2.n.push(S.n[i * 3], S.n[i * 3 + 1], S.n[i * 3 + 2]); S2.count++; }
        const use = S2.count ? S2 : S, f = k.fxPart(new THREE.Group());
        const crust = k.onSurface(use, 8, 'crust', 0.003).map(p => Object.assign(p, { s: 0.8 + p.t * 0.8 }));
        f.add(k.scatter(kept('crust', () => new THREE.CircleGeometry(0.016, 8).rotateX(-Math.PI / 2)), k.toon(0x8f9ba4), crust, { outline: false }));
        const ice = k.onSurface(use, k.thin(16, 10), 'frost', 0.006).map(p => Object.assign(p, { s: 0.7 + p.t * 0.7 }));
        f.add(k.scatter(kept('crystal', () => new THREE.OctahedronGeometry(0.01, 0).scale(0.8, 1.5, 0.8)), k.toon(0xf4fbff), ice, { outline: 'thin', tilt: 0.8 }));
        g.add(f);
      },
    };

    /* ── flourishes ── */
    /** The scoop dips into the warm-water well (the painted sink with its tap) and comes out dripping. */
    function scoopDip(c, e, made) {
      if (made) c.showItem(made);
      if (k.reduced() || !c.anchors.scooper) return P0();
      const sc = scooper(), rest = c.anchors.scooper.clone().add(V(0, 0.06 * LINE.scale, 0));
      sc.scale.setScalar(LINE.scale);
      const well = c.anchors.well ? c.anchors.well() : rest.clone().add(V(0.3, 0, -0.6));
      const over = well.clone().add(V(0, 0.18, 0)), inW = well.clone().add(V(0, 0.01, 0));
      sc.position.copy(rest);
      c.F.add(sc);
      const drops = new THREE.Group(), dg = kept('drop', () => new THREE.SphereGeometry(0.01, 6, 5).scale(1, 1.5, 1));
      for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(dg, k.toon(0x7cc8f2)); d.visible = false; drops.add(d); }
      c.F.add(drops);
      return k.tween(340, t => { const e2 = k.ease(t); sc.position.lerpVectors(rest, over, e2); sc.position.y += Math.sin(t * Math.PI) * 0.1; })
        .then(() => k.tween(220, t => { sc.position.lerpVectors(over, inW, k.ease(t)); }))
        .then(() => k.tween(160, t => { sc.rotation.x = Math.sin(t * Math.PI * 2) * 0.25; }))
        .then(() => k.tween(220, t => { sc.position.lerpVectors(inW, over, k.ease(t)); }))
        .then(() => k.tween(420, t => {
          drops.children.forEach((d, i) => { const u = (t * 1.6 + i * 0.3) % 1; d.visible = t < 0.95; d.position.set(over.x + (i - 1) * 0.02, over.y - 0.02 - u * 0.16, over.z); });
        }))
        .then(() => k.tween(320, t => { const e2 = k.ease(t); sc.position.lerpVectors(over, rest, e2); sc.position.y += Math.sin(t * Math.PI) * 0.08; }))
        .then(() => { k.free(drops); k.free(sc); });
    }
    /** The banana halves come in along both sides of the boat. */
    function bananaTuck(c, e, made) {
      const b = c.showItem(made);
      if (!b || k.reduced()) return P0();
      const halves = [0, 1].map(i => b.g.getObjectByName('banana-' + i)).filter(Boolean);
      if (!halves.length) return c.pop(b.g);
      const p0 = halves.map(h => h.position.clone());
      // Each half slides in along its side high over the dish, then comes straight down into it: never through the
      // dish's glass (audit 2026-11-11).
      return k.tween(620, t => {
        const a = k.ease(clamp(t / 0.55, 0, 1)), d = k.ease(clamp((t - 0.45) / 0.55, 0, 1));
        halves.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(p0[i].x + sd * (1 - a) * 0.5, p0[i].y + 0.2 * (1 - d), p0[i].z); });
      }).then(() => c.pop(b.g));
    }
    /** An open steel milk pitcher, the one jug for milk (audit 2026-11-11: a closed jug poured): a belly, a pinched
     *  spout at the rim on -x, a handle on +x, the milk showing inside. Markers: 'spout' (its tip), 'milkTop'. */
    const PITCHER = { r0: 0.05, rb: 0.056, rr: 0.046, h: 0.13 };
    function spoutOut(gg) {
      const pos = gg.attributes.position, { h } = PITCHER;
      for (let i = 0; i < pos.count; i++) {
        // The rim at -x pulled out and a little up into a pinched lip.
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, -x);
        const f = Math.pow(Math.max(0, Math.cos(a)), 6) * Math.max(0, (y - h * 0.55) / (h * 0.45));
        pos.setX(i, x - f * 0.03);
        pos.setY(i, y + f * 0.012);
      }
      gg.computeVertexNormals();
      return gg;
    }
    function pitcher() {
      const g = new THREE.Group(), { r0, rb, rr, h } = PITCHER;
      g.name = 'pitcher';
      g.add(k.ink(kept('pitcherOut', () => spoutOut(k.lathe([[0, 0], [r0, 0], [r0 + 0.003, 0.008], [rb, h * 0.35], [rr, h], [rr - 0.001, h + 0.002]], k.seg(28)))), k.toon(STEEL)));
      g.add(new THREE.Mesh(kept('pitcherIn', () => spoutOut(k.lathe([[rr - 0.001, h + 0.002], [rr - 0.004, h], [rb - 0.004, h * 0.35], [r0 - 0.004, 0.01], [0, 0.01]], k.seg(28)))), k.toon(STEEL_DARK)));
      const glint = new THREE.Mesh(kept('pitcherGlint', () => new THREE.CylinderGeometry(rb + 0.002, r0 + 0.003, h * 0.3, 8, 1, true, -0.7, 0.24)), k.SHINE);
      glint.position.y = h * 0.2;
      g.add(glint);
      const milk = new THREE.Mesh(kept('disc', () => new THREE.CircleGeometry(1, k.seg(28)).rotateX(-Math.PI / 2)), liquid(MILK));
      milk.scale.setScalar(rb - 0.009);
      milk.position.y = h * 0.62;
      milk.name = 'milkTop';
      g.add(milk);
      const handle = k.inkThin(kept('pitcherHandle', () => new THREE.TorusGeometry(0.034, 0.0065, 6, 14, Math.PI).rotateZ(-Math.PI / 2)), k.toon(STEEL));
      handle.position.set(rb - 0.006, h * 0.55, 0);
      g.add(handle);
      const spout = new THREE.Object3D();
      spout.name = 'spout';
      spout.position.set(-(rr + 0.03), h + 0.012, 0);
      g.add(spout);
      return g;
    }
    /** Move obj so that its marker (a point on it) lands at `at`, in F's frame, whatever obj's parent is. */
    function placeBy(c, obj, marker, at) {
      const now = c.toF(marker, V(0, 0, 0));
      const par = obj.parent || c.F;
      const a = par.worldToLocal(c.F.localToWorld(at.clone())), b = par.worldToLocal(c.F.localToWorld(now));
      obj.position.add(a.sub(b));
    }
    /** The milk pours into the steel cup on its counter spot from the open pitcher's spout, rising round the
     *  scoops; then the cup goes onto the mixer (mountCup). */
    function milkPour(c, e, made) {
      const b = c.showItem(without(made, ['milk']));
      if (!b || k.reduced()) { if (c.onApply) c.onApply(); c.showItem(made); return P0(); }
      const cupG = b.g.getObjectByName('steelCup');
      if (!cupG) { c.showItem(made); return P0(); }
      const jug = pitcher();
      jug.scale.setScalar(1.3);
      b.g.add(jug);
      const spout = jug.getObjectByName('spout'), milkTop = jug.getObjectByName('milkTop');
      // The spout just over the cup's mouth, right of its middle: the stream falls straight in through the mouth.
      const mouth = c.toF(cupG, V(0.035, MIXCUP.h + 0.03, 0.02)), level = c.toF(cupG, V(0.035, MIXCUP.h * 0.72, 0.02));
      // It comes in upright above the cup (its belly clear of the rim), then tips as the spout comes down to the mouth,
      // its belly swinging up and away from the cup.
      const high = mouth.clone().add(V(0, 0.34, 0)), start = high.clone().add(V(1.1, 0.05, 0.12));
      const TILT = 1.2;
      const pose = (at, tilt) => { jug.rotation.z = tilt; placeBy(c, jug, spout, at); };
      pose(start, 0);
      // The milk rising in the cup as it pours.
      const rAt = y => MIXCUP.rb + (MIXCUP.rt - MIXCUP.rb) * (y / MIXCUP.h) - 0.006;
      const rise = new THREE.Mesh(kept('disc', () => new THREE.CircleGeometry(1, k.seg(28)).rotateX(-Math.PI / 2)), liquid(MILK));
      rise.visible = false;
      cupG.add(rise);
      const setLevel = t => { const y = MIXCUP.h * (0.3 + 0.42 * t); rise.visible = t > 0.02; rise.scale.setScalar(rAt(y)); rise.position.y = y; };
      return k.tween(360, t => pose(start.clone().lerp(high, k.ease(t)), 0))
        .then(() => k.tween(300, t => { const e2 = k.ease(t); pose(high.clone().lerp(mouth, e2), TILT * e2); milkTop.visible = t < 0.3; }))
        .then(() => k.pour({ F: c.F, from: c.toF(spout, V(0, 0, 0)), to: () => level.clone(), colour: MILK, ms: 760, r: 1.1, onLevel: setLevel, onApply: c.onApply }))
        .then(() => k.tween(300, t => { const e2 = k.ease(t); pose(mouth.clone().lerp(high, e2), TILT * (1 - e2)); milkTop.visible = t > 0.7; }))
        .then(() => k.tween(300, t => pose(high.clone().lerp(start, k.ease(t)), 0)))
        .then(() => { k.free(jug); return mountCup(c, b, made); });
    }
    /** The filled cup slides from its counter spot onto the mixer's rest, under the spindle (up out of its way),
     *  then the spindle comes down into it. Ends drawing `made` (the milk in: the cup on the mixer). */
    function mountCup(c, b, made) {
      const cupG = b.g.getObjectByName('steelCup'), mx = b.g.getObjectByName('mixerAt');
      if (!cupG || !mx || k.reduced()) { c.showItem(made); return P0(); }
      b.g.updateMatrixWorld(true);
      mx.attach(cupG);
      const p0 = cupG.position.clone(), p1 = V(0, CUP_AT, 0);
      return k.tween(460, t => {
        const e2 = k.ease(t);
        cupG.position.lerpVectors(p0, p1, e2);
        // Up to the rest's height first, so its foot never cuts the mixer's base; never up into the spindle.
        cupG.position.y = p0.y + (p1.y - p0.y) * Math.min(1, t * 3) + Math.sin(t * Math.PI) * 0.008;
      })
        .then(() => k.tween(280, t => setSpindle(mx, 1 - k.ease(t))))
        .then(() => { c.showItem(made); });
    }
    /** The spindle lifts out of the cup; the cup slides off the rest, tips over the glass with its lip just over
     *  the glass's rim, and the shake pours in from the lip; the empty cup goes back on the rest and the mixer moves
     *  on down the line, leaving the glass (audit 2026-11-11: the cup went into the glass, the stream came out of its
     *  side and the mixer vanished). */
    function shakePour(c, e, made) {
      const b = c.showItem(without(made, ['glass']));
      if (!b || k.reduced()) { if (c.onApply) c.onApply(); c.showItem(made); return P0(); }
      const cupG = b.g.getObjectByName('steelCup'), glassG = b.g.getObjectByName('glass'), mx = b.g.getObjectByName('mixerAt');
      if (!cupG || !glassG || !mx) { c.showItem(made); return P0(); }
      const S = b.g.scale.x;
      const st = shakeIdx(made, {}), flv = made.picks && made.picks.shakeFlavour, FL = flv ? k.slotLook('shakeFlavour', flv) : null;
      const fc = FL && FL.colour !== undefined ? FL.colour : VANILLA;
      const lip = new THREE.Object3D();
      lip.position.set(-MIXCUP.rt - 0.004, MIXCUP.h + 0.004, 0);
      cupG.add(lip);
      const surface = cupG.getObjectByName('surface');
      const TILT = 1.9;
      const rest = c.toF(lip, V(0, 0, 0)), off = rest.clone().add(V(-0.17 * S, 0, 0));
      const goal = c.toF(glassG, V(-0.025, 0.37, 0));
      let empty = false;          // once poured, the cup goes back empty
      const pose = (at, tilt) => { cupG.rotation.z = tilt; placeBy(c, cupG, lip, at); if (surface) surface.visible = !empty && tilt < 1.1; };
      const glass = tallGlass(), fillG = new THREE.Group();
      glassG.add(fillG);
      let cur = null;
      const setLevel = t => {
        if (cur) { fillG.remove(cur); k.free(cur); }
        cur = glassFill(glass, st, fc, (LEVEL[st] / 0.9) * t).g;
        fillG.add(cur);
      };
      const bottom = c.toF(glassG, V(-0.025, 0.08, 0)), rimF = c.toF(glassG, V(-0.025, 0.34, 0));
      const tipAt = t => TILT * k.ease(clamp((t - 0.35) / 0.65, 0, 1));
      const path = (t, a, z) => { const at = a.clone().lerp(z, k.ease(t)); at.y += Math.sin(t * Math.PI) * 0.1; return at; };
      const mx0 = mx.position.x;
      return k.tween(240, t => setSpindle(mx, k.ease(t)))
        .then(() => k.tween(240, t => pose(rest.clone().lerp(off, k.ease(t)), 0)))
        .then(() => k.tween(560, t => pose(path(t, off, goal), tipAt(t))))
        .then(() => k.pour({ F: c.F, from: c.toF(lip, V(0, 0, 0)), to: t => bottom.clone().lerp(rimF, LEVEL[st] * t * 0.95), colour: shakeColour(fc, st), ms: 800, r: 1.5, onLevel: setLevel, onApply: c.onApply }))
        .then(() => { empty = true; })
        .then(() => k.tween(520, t => pose(path(t, goal, off), tipAt(1 - t))))
        .then(() => k.tween(220, t => pose(off.clone().lerp(rest, k.ease(t)), 0)))
        .then(() => k.tween(380, t => { mx.position.x = mx0 + k.ease(t) * 1.6; }))
        .then(() => {
          // The straw goes in through the glass's mouth.
          const nb = c.showItem(made), sw = nb && nb.g.getObjectByName('straw');
          return sw ? c.drop(sw, 0.3, 300) : c.pop(nb && nb.g);
        });
    }
    const autos = { scoopDip, bananaTuck, milkPour, shakePour };

    /* ── the sets, by backdrop name ── */
    const BOARD = { pos: [0.329, 2.573, 3.277], at: [0.329, 1.115, 0.15], fov: 30 };
    const sets = {
      counter: {
        // Solved to its picture like a station (spec 5.2): the counter top's back edge lands at 80% of the picture,
        // which the counter picture keeps its painted queue above. Everything drawn lies flat on the top.
        x: 12, line: COUNTER.line, surface: { y: COUNTER.top, back: COUNTER.back },
        cam: { pos: [0, COUNTER.top + 1.05, COUNTER.back + 4.5], at: [0, COUNTER.top - 0.3, COUNTER.back - 1.2], fov: 36 },
        build(g) {
          // The Emporium's counter as the court picture and the counter picture draw it: a cream marble top (the
          // picture's returns are #feebe1) with a few pale veins, a white trim line and the pink edge (#f16487) along
          // the customer's side, over pink boarded panels.
          const T = COUNTER.top, B = COUNTER.back, D = 3.4, Lw = 16;
          const top = new THREE.Mesh(new THREE.BoxGeometry(Lw, 0.12, D), k.toon(0xfff3ec)); top.position.set(0, T - 0.06, B + D / 2); g.add(top);
          const under = new THREE.Mesh(new THREE.BoxGeometry(Lw, T - 0.12, D - 0.1), k.toon(0xfc8ba4)); under.position.set(0, (T - 0.12) / 2, B + D / 2 + 0.05); g.add(under);
          const flat = (z0, z1, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(Lw, z1 - z0).rotateX(-Math.PI / 2), mat); m.position.set(0, T + 0.0015, B + (z0 + z1) / 2); g.add(m); return m; };
          flat(0, 0.07, k.toon(0xf16487));                                        // the pink edge
          flat(0.07, 0.09, k.toon(0xffffff));                                     // the white trim
          flat(0.09, 0.1, k.toon(0xf7a8c0));                                      // a pale pink line
          // Marble veins: thin pale wavy strips lying on the top.
          const R = k.rand('veins'), vm = k.toon(0xf0d8dc);
          for (let i = 0; i < 26; i++) {
            const x0 = -7.5 + R() * 15, z0 = 0.15 + R() * 2.6, pts = [];
            for (let j = 0; j < 6; j++) pts.push(V(x0 + j * 0.12 + (R() - 0.5) * 0.05, 0, B + z0 + j * 0.05 * (R() - 0.3)));
            const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.006, 3, false), vm);
            tube.scale.y = 0.15;
            tube.position.y = T + 0.0012;
            g.add(tube);
          }
          return { spots: [V(COUNTER.x, T, COUNTER.row)], row: COUNTER.row, contentScale: COUNTER.scale, back: B, front: COUNTER.front, minX: -2.6, maxX: 0.6, minScreenX: 0.14 };
        },
      },
      scoop: {
        // The freezer case: its steel ledge (under the wall's ink line, measured at 62.2% of the picture) is the
        // surface; the holder stands on it, left of centre, under the painted cone dispensers; the scooper works
        // over the tubs in front. The diner's board camera. Nothing is furniture: the painted case is the case.
        x: 0, line: 0.622, surface: { y: TOP, back: -0.5 }, cook: 'scoop', cam: BOARD,
        build() {
          const def = sets.scoop;
          return {
            stack: V(SCOOP.stack[0], TOP, SCOOP.stack[1]), incoming: V(0.98, TOP, 0.15), surface: TOP, giantMax: 1.05,
            scooper: V(SCOOP.scooper[0], TOP + 0.04, SCOOP.scooper[1]),
            // The warm-water well: the painted sink's water (73.5% across, 60% down the picture), on this window.
            well: () => onPicture(def, 0.735, 0.6, TOP - 0.02),
          };
        },
        /** A pick here: the holder drops into place; each scoop is brought in by the scooper and let go just over its
         *  place (audit 2026-11-11: the ball flew in on its own). The banana split's bananas, which come next in made(),
         *  are not in the boat until their own flourish tucks them in. */
        pick(c, e, made) {
          if (!made) return P0();
          const b = c.showItem(without(made, ['banana']));
          if (!b || k.reduced()) { if (c.onApply) c.onApply(); return P0(); }
          if (e.slot === 'holder') { const h = b.g.getObjectByName('holder'); if (c.onApply) c.onApply(); return c.drop(h || b.g, 0.45, 280); }
          if (e.slot === 'scoops') {
            const n = [].concat(made.picks.scoops || []).length, last = b.g.getObjectByName('scoop-' + (n - 1));
            if (!last) { if (c.onApply) c.onApply(); return c.pop(b.g); }
            const toItem = p => b.g.worldToLocal(c.F.localToWorld(p.clone()));
            const goal = c.toF(b.g, last.position.clone()), hover = goal.clone().add(V(0, 0.16, 0));
            const sc = scooper();
            sc.scale.setScalar(LINE.scale);
            c.F.add(sc);
            // A cup's spoon goes in once the first scoop is in (it is drawn from then on).
            const spoon = n === 1 ? b.g.getObjectByName('spoon') : null;
            if (spoon) spoon.visible = false;
            const BOWL = 0.01 * LINE.scale;   // the ball's foot in the scooper's bowl
            const away = c.anchors.scooper.clone().add(V(0.55, 0.2 + 0.06 * LINE.scale, 0.1));
            const carry = p => { sc.position.copy(p).sub(V(0, BOWL, 0)); last.position.copy(toItem(p)); };
            carry(away);
            return k.tween(380, t => { const q = away.clone().lerp(hover, k.ease(t)); q.y += Math.sin(t * Math.PI) * 0.1; carry(q); })
              .then(() => k.tween(200, t => { last.position.copy(toItem(hover.clone().lerp(goal, t * t))); sc.rotation.z = 0.5 * k.ease(t); }))
              .then(() => {
                if (c.onApply) c.onApply();
                const s0 = sc.position.clone();
                if (spoon) spoon.visible = true;
                return Promise.all([c.pop(b.g), spoon ? c.drop(spoon, 0.12, 300) : P0(), k.tween(300, t => { sc.position.lerpVectors(s0, away, k.ease(t)); sc.rotation.z = 0.5 * (1 - t); })]);
              })
              .then(() => { k.free(sc); });
          }
          if (c.onApply) c.onApply();
          return c.pop(b.g);
        },
      },
      toppings: {
        // The topping bar: the painted marble is the surface (its front edge measured at 64.8% of the picture). The
        // item stands on it left of centre; each topping comes in its own jar, pot or can from the right. The shake
        // mixes on a 3D mixer right of the glass (the painted mixer is under the page's answer column). cook 'shake'.
        x: 24, line: 0.648, surface: { y: TOP, back: -0.5 }, cook: 'shake', cam: BOARD,
        build() {
          return { stack: V(TOPS.stack[0], TOP, TOPS.stack[1]), incoming: V(TOPS.incoming[0], TOP, TOPS.incoming[1]), surface: TOP, giantMax: 1.05 };
        },
        /** The shake's flavour: the scooper brings its scoops in and lets them down into the steel cup on its counter
         *  spot, through its mouth (audit 2026-11-11: they fell out of the sky). The milk, which follows at once in
         *  made(), is not in yet. */
        pick(c, e, made) {
          if (!made) return P0();
          const b = c.showItem(without(made, ['milk']));
          if (!b || k.reduced()) { if (c.onApply) c.onApply(); return P0(); }
          const heap = b.g.getObjectByName('shakeScoops');
          if (!heap) { if (c.onApply) c.onApply(); return c.pop(b.g); }
          const S = b.g.scale.x, low = heap.children[0];
          // The scooper's bowl under the lower scoop; the heap carried in it, then let down into the cup.
          const under = V(low.position.x, low.position.y - 0.064, low.position.z);
          const goal = c.toF(heap, under), hover = goal.clone().add(V(0, MIXCUP.h * 0.9 * S, 0));
          const away = hover.clone().add(V(0.9, 0.12, 0.1));
          const sc = scooper();
          sc.scale.setScalar(S * 1.1);
          c.F.add(sc);
          const toCup = p => heap.position.copy(heap.parent.worldToLocal(c.F.localToWorld(p.clone())).sub(under));
          const carry = p => { sc.position.copy(p); toCup(p); };
          carry(away);
          return k.tween(380, t => { const q = away.clone().lerp(hover, k.ease(t)); q.y += Math.sin(t * Math.PI) * 0.08; carry(q); })
            .then(() => k.tween(240, t => { toCup(hover.clone().lerp(goal, t * t)); sc.rotation.z = 0.5 * k.ease(t); }))
            .then(() => {
              heap.position.set(0, 0, 0);
              if (c.onApply) c.onApply();
              const s0 = sc.position.clone();
              return Promise.all([c.pop(b.g), k.tween(300, t => { sc.position.lerpVectors(s0, away, k.ease(t)); sc.rotation.z = 0.5 * (1 - t); })]);
            })
            .then(() => { k.free(sc); });
        },
      },
    };

    /* ── the counter: one item right of the served customer's face when it fits, several side by side, all left of
       the painted queue at every window shape ── */
    // The page centres the served customer at 24% of the picture and keeps the Back in 5 sign to 12.5% of the window;
    // world.js hands arrange() anchors.maxScreenX (where BBArt.icecream.counter.queue[0] lands, less a gap) and
    // anchors.lineY. A cone is tall: it stands right of a child's face when the order fits there. In Node: 16:9, the
    // queue from 55%.
    const SPAN = { left: 0.14, customer: 0.24, face: 0.075, queue: 0.55, gap: 0.08 };
    const acrossWindow = (fx, aspect) => (aspect < food.PICTURE ? 0.5 + (fx - 0.5) * food.PICTURE / aspect : fx);
    function xAcross(cam, fx, z) {
      const a = V(0, COUNTER.top, z).project(cam), b = V(1, COUNTER.top, z).project(cam);
      return (fx * 2 - 1 - a.x) / (b.x - a.x);
    }
    const counter = {
      arrange(n, items, anchors) {
        const aspect = windowAspect(), cam = solvedCamera(sets.counter, aspect, anchors.lineY), row = anchors.row !== undefined ? anchors.row : COUNTER.row;
        const sizes = items.map(m => {
          const b = k.item(m, { where: 'counter', set: 'counter', contentScale: anchors.contentScale });
          const box = k.boxOf(b.g), sc = b.g.scale.x;
          k.free(b.g);
          return { w: (box.max.x - box.min.x) * sc, mid: (box.min.x + box.max.x) / 2 * sc, near: box.max.z * sc };
        });
        const z = row + Math.max(...sizes.map(x => x.near));
        const right = typeof anchors.maxScreenX === 'number' ? anchors.maxScreenX : acrossWindow(SPAN.queue, aspect) - 0.006;
        const left = typeof anchors.minScreenX === 'number' ? anchors.minScreenX : SPAN.left;
        const face = acrossWindow(SPAN.customer, aspect) + SPAN.face;
        const x1 = xAcross(cam, right, z), xFace = xAcross(cam, face, z), xLeft = xAcross(cam, left, z);
        const total = sizes.reduce((t, x) => t + x.w, 0) + SPAN.gap * (n - 1);
        const x0 = total <= x1 - xFace ? xFace : xLeft, s = Math.min(1, (x1 - x0) / total);
        let x = x0 + ((x1 - x0) - total * s) / 2;
        return sizes.map(({ w, mid }) => {
          const p = V(x + (w / 2 - mid) * s, COUNTER.top, row);
          x += (w + SPAN.gap) * s;
          return { p, s };
        });
      },
    };

    return {
      shapes, sets, cooks, lines, applies, autos, layouts, counter, fx,
      /** Recipe looks name the layout. */
      layoutOf(made) {
        const R = made.recipe && (k.pack().recipes || {})[made.recipe];
        const s = R && R.look && R.look.shape;
        if (s && layouts[s]) return s;
        if (made.ing === 'milkshake') return 'shakeGlass';
        if (made.ing === 'iceCream' || made.ing === 'bananaSplit' || made.ing === 'kitchenSink') return 'cupStack';
        return null;
      },
      // The size plates' swatches: the sizing rings' colours (grey, mint, pink, gold, red).
      ramps: { scoopBall: MARK },
    };
  });
  return food;
});
