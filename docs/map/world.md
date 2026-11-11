<!-- Engine map, 2026-11-08: 3D food (world.js). Written by a read-only mapping agent. -->

# The 3D food: `js/world.js` (map for Ben's Food Court)

Paths are relative to `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`. A bare number is a line in `js/world.js`.

## 1. Renderer, scene, camera, sets
- **Boot:** three r155 UMD (index.html:52), then core, `packs/diner/pack.js`, then world.js (index.html:71). main.js:8 awaits `BB.world.init()`. `stage.setScene(name)` calls `goTo(name)` (stage.js:50). The scene name is the station id (game.js:179). The backdrop is `pack.backdrops[name]` (stage.js:48-49).
- **`init()` (651-671):**
  - Awaits `hubGraphics.ready`.
  - Creates one `WebGLRenderer({antialias, alpha:true})` via `hubGraphics.rendererOptions`, with sRGB output and a transparent clear.
  - Puts the canvas in `#canvasWrap` (z 3, bb.css:27). That is above the customer (z 2), so the 3D counter hides their legs.
  - Creates one `Scene`, one `PerspectiveCamera(40, 1, 0.1, 60)`, a hemisphere light (1.35) and a directional light (1.6). No shadows.
  - If WebGL fails, `scene` stays null and every call returns early. The game still plays, without food.
- **Sets (372-404):** `buildSets()` builds all three once, side by side. `TOP = 0.5` (377). Only each set's `userData.food` group (403) is ever rebuilt.

  | set | x | contents | anchors |
  |---|---|---|---|
  | `grill` | −12 | steel plate, bars, lip | `userData.slots`: x −0.75, 0, 0.75 |
  | `board` | 0 | butcher block, plus a steel slide at x 1.0 (the line) | `stack` (0, TOP, 0.15); `incoming` (0.98, TOP+0.12, 0.15) |
  | `counter` | +12 | red laminate (y 0.86), chrome edge, teal front | `plates`: 3 spots |
- **`goTo(set)` (604-613):**
  - Moves the one camera to `set.x + cam.pos` and points it at `set.x + cam.at`.
  - Sets the fov: 30 in the kitchen, 42 at the counter.
  - The kitchen cameras were solved so the surface starts about 64% down the screen (369-371).
  - For an unknown set (fryer, drinks, oven) it changes `at` but leaves the camera where it was (607).
- **Loop (620-639):** a continuous rAF steps `tweens` (`{t0, ms, fn, resolve}`) and `spinners`, then renders every frame.
  - `rise` climbs 0.35 and fades over 2 s.
  - `orbit` moves the fly.
  - `resize()` (641-649) uses `hubGraphics.pixelRatio`.

## 2. Ink kit (25-64, 121)
- `toon(colour, opts)`: a cached `MeshToonMaterial` with the 3-band `GRADIENT`.
- `OUTLINE`: an inverted-hull `ShaderMaterial` (BackSide, normal push 0.011, colour 0x1b120e). `OUTLINE_THIN` pushes 0.0045.
- `ink(geo, mat, noOutline)`: a Group of the body plus its hull (renderOrder −1), with the body in `userData.body`. `inkThin` does the same with the thin outline.
- Also `SHINE`, `cyl` and `noise(a, k)`.

## 3. Data
- **Input:** the 3D draws what the player made, never the ticket's `spec.parts`.
  - `BB.line.made(pack, o, i)` (core/line.js:334-380) returns `{ recipe, ing, size?, done?, parts: [{ ing, done?, layer?, gross?, flavour? }], gross }`.
  - On a station with `builds` (pack.js:86), the parts come in this order (line.js:365-375):
    1. `builds.base` (layer `bottom`)
    2. each cooked part with its `done`, then its `each` part (cheese on every patty)
    3. the other Adds, in step order
    4. `builds.cap` (layer `top`)
  - A `from` pick overwrites `made.ing` (line.js:360). A size goes to `made.size`. A flavour becomes a part. An item-level cook goes to `made.done` (line.js:363).
- **`lookOf(id)` (120):** the ingredient's `look`, or `{shape:'disc', colour:0x999999}` if it has none.
- **`food(part, opts)` (305-310):** builds `BUILD[look.shape] || BUILD.disc`, then applies `gross()`, then sets `userData.part`. Returns `{ g, h }`, where h is the height the next part sits at. `opts` is `{ stage?, growing? }`.
- **`stackOf(parts, opts)` (417-428):** a vertical stack, the only layout. Each part sits at the running h and gets `n: i`, which seeds the slice and sauce rotation. The total height goes in `userData.h`.
- **`stageIndex(part, opts)` (298-303):** `opts.stage`, else the index of `part.done` in the ingredient's stage set.

## 4. Shape builders (`BUILD`, 123-297)

| shape | used for | geometry |
|---|---|---|
| bun | bun | `layer:'top'`: lathe dome, r 0.37, 16 seeds. Otherwise: heel with a crumb face |
| patty | patty | noisy cylinder (r 0.31) in `PATTY[s]`, one grill mark per stage (max 4), char flecks at stage 5 and up. `userData.cook` and `userData.marks` are set but never read (160, 176) |
| slice | cheese | 0.6 square with draped corners, turned π/4 + n·0.3 |
| strips | bacon | 2 wavy planes and a `look.fat` stripe |
| leaf | lettuce | ruffled circle, DoubleSide |
| disc | tomato, and any unknown shape | 2 cylinders with a `look.inner` face |
| chips | pickles | 4 discs; face colour hard-coded to 0xa9cf5a |
| rings | onion | 2 tori |
| sauce | ketchup, mustard, mayo | one shared zigzag tube (69-89: Chaikin, then CatmullRom, 160 segments), flattened to 0.62, with caps and 6 glints. Turned n·0.9 + sauceIndex·0.7 (92), so two sauces cross. `growing` clones the tube. Sets `userData.sauce` |
| plate | plate (hard-wired) | lathe (r 0.64) with a blue rim |
| fries, onionRings | fries, rings | 22 boxes or 5 tori in `FRIED[s]` |

- **Shapes with no builder:** `sprinkle`, `cup`, `ice` and `drink` (pack.js:68-76) fall back to `disc`.
  - Cup and ice have no colour either, so they come out white with a three.js warning.
  - These are M4 recipes and are not offered yet (game.js:13).
  - schema.js:38 only checks that `look.shape` is set, so nothing catches a missing builder.
- **`bottle(part)` (102-114)** is not in BUILD. It is a lathe squeeze bottle (body in `look.colour`, cap in `look.cap`) with `userData.bottle = { tip, colour }`. It is used only for a sauce waiting on the line.

## 5. Cooking visuals
- **`showGrill(ing, n, stage)` (432-444):** puts up to 3 copies in the slots (1 → [1], 2 → [0,2], 3 → [0,1,2]) and remembers `grillIng`.
- **`dropOnGrill(ing, n)` (446-453):** rebuilds at stage 0, and the newest patty drops 0.6 in 260 ms.
- **`cookGrill(stage, ms = 1800)` (455-469):** doneness only changes by rebuilding. In order:
  1. Puffs start (`puffs()` 472-481, wired to the grill slots).
  2. A sizzle hop runs for half the time.
  3. It rebuilds at `max(1, round(stage/2))`.
  4. A 380 ms flip.
  5. It rebuilds at the final stage.
- **`grillStage(stage)` (471):** rebuilds on each Timed tick.
- **`colourOf(ing, k)` (674-679):** `PATTY[k]` for the patty, `FRIED[k]` for fries and onion rings, otherwise `look.colour`.
  - It colours the 2D dial plates (game.js:233, with `min(k, 4)` marks).
  - PATTY and FRIED (118-119) follow the diner's stage order (pack.js:35-36).
- **game.js assumes that cooking means the grill:**
  - Any station whose cook step names an `ing` is treated as the grill (game.js:193-197).
  - Any Add of an ingredient with stages goes to `dropOnGrill` (game.js:322).
  - `cooked` animates only when the scene is `'grill'` (game.js:330).
  - The Timed clock calls `grillStage` on every station (game.js:352).
  - So tests/packs/test-pizza would show no kitchen at all: `prep` and `oven` have no sets, so the camera stays parked (607).

## 6. The line
- **`showBoard(parts, incoming)` (484-511):**
  - Builds a plate (scaled ×0.8) at `stack`, then `stackOf(parts)`, named `'stack'`.
  - The waiting `{ ing, gross }` is named `'incoming'`. A sauce uses `bottle()`, standing at TOP+0.045; anything else uses `food()`. It slides in from (+1.4, +0.4) over 320 ms.
  - game.js:200-202 passes `made.parts` without the `top` layer.
  - After `phaseDone` on a `builds.cap` station, game.js:331-335 redraws with all parts, so the top bun just appears.
- **`lineOutcome(kind, {onSquirt})` (514-526):**
  - `add` with a bottle runs `squirt()`.
  - Any other `add` arcs onto the top of the stack (360 ms).
  - `swap` is thrown right, spinning (360 ms).
  - `skip` slides right (300 ms).
  - Nothing is re-parented; the next `showBoard` rebuilds.
- **`squirt()` (531-577), about 1.6 s in all:**
  1. A growing bead is added with the next `n`, so it matches the rebuild.
  2. The bottle tilts to π−0.38 over 340 ms.
  3. `onSquirt()` fires.
  4. A 950 ms squeeze: `growSauce` extends the drawRange (94-100), a `STREAM_GEO` stream runs, and the bottle squashes.
  5. The bottle exits over 320 ms.
- **Dependencies:** `__scene()` (682) is used by:
  - tests/dom-play.cjs:129-133, which relies on the `'incoming'` name and on `userData.bottle`;
  - tools/review-frames.cjs:206-207, which relies on `userData.sauce.geo`.

## 7. Gross-out fx (313-366)
`gross(g, eventId)` reads `pack.gross[].fx` (pack.js:178-184):

| fx | what it does |
|---|---|
| `tint` | clones each toon material and lerps it 0.65 toward the tint colour |
| `droop` | `scale.y × 0.6` |
| `stink`, `smoke` | 3 sprites at x −0.15, 0, 0.15 and y 0.2, on `rise` spinners |
| `hair` | a tube from x −0.2 to 0.22 at y 0.05 |
| `fly` | a fly on an `orbit` spinner |

Problems:
- Every position is a burger-sized constant, not taken from the item's bounds.
- One SpriteMaterial is shared per kind (326), but `rise` writes `opacity` per sprite (635). So all the sprites fade in step.
- With Motion Reduced, `rise` still moves (635), and the fly is never placed (636), so it sits inside the food.

## 8. Disposal
- `clear(g)` (410-416) disposes every geometry not in `KEEP` (409: the shared sauce geometry).
- Cached materials are never freed. The tint clones and the fly-wing materials leak.
- Sets are never disposed.

## 9. Low graphics quality
- **Setup:** the game opens `NarbeGraphics.openGame('bensfoodcourt')` (16) and creates the renderer only after `ready` (652).
- **What Low does:** antialiasing is off from creation (655), and the pixel ratio is capped at 1 and at 1280×720 (644; `bennyshub/shared/graphics-quality.js:32-37, 91-94`). `subscribe(resize)` (667) re-applies this when the setting changes.
- **What Low does not do:** it does not thin anything, and the scene still redraws every frame.
- **Gap:** the in-game Graphics Quality item (ui.js:358, savefmt.js:32) only writes `BB.save`. Nothing calls `hubGraphics.setChoice`, so the in-game setting never reaches the renderer.

## 10. Burger-specific or single-pack code
| lines | assumption |
|---|---|
| 15 | `BBPacks.diner` is hard-wired (also stage.js:12, game.js:11, save.js:10) |
| 69-114 | the sauce path and the bottle are sized to a 0.37 bun |
| 118-119, 164-174, 674-679 | colours and marks are indexed by the diner's stages |
| 123-297, 306 | BUILD is a closed object literal with a silent fallback |
| 330-366 | fx sizes are fixed |
| 372-404 | three fixed sets, with their colours, anchors and cameras |
| 431-481 | cooking always means the grill |
| 488, 586 | the plate is hard-wired, and `builds.on` is ignored |
| 501, 505 | the bottle's height and the slide-in direction |
| 585 | counter spots are `i % 3`, so a 4th item overlaps the 1st |
| 588 | an item with parts loses its `made.ing` body (fries with salt draws only the salt); `made.done` and `made.size` are ignored |
| 607 | unknown sets are silently ignored |

## 11. Proposed plugin API
**Files.** All are UMD, like `js/core`, so Node can load them. Load order:
1. `js/food/kit.js` (the registry and the kit)
2. `js/food/common.js`
3. `js/food/burger.js` (the diner's shapes and sets, plus `cooks.grill`)
4. `pizza.js`, `smoothie.js`, `cafe.js`, `sushi.js`, `burrito.js`, `icecream.js`
5. `js/world.js`

```js
BB.food.register(id, k => ({
  shapes:   { name(part, o) { return { g, h, top } } },   // o = { stage, growing, item: made, under: Surface }
  layouts:  { name(made, o) { return { g, h, top } } },   // the whole item; default 'stack'
  sets:     { name: { cam: { pos, at, fov }, build(group) { return anchors } } },  // { stack, incoming, enter, slots, heat, spots }
  cooks:    { name: { show(c, { ing, n, stage }), add(c, { ing, n }), stage(c, k), run(c, { stage, ms }) } }, // add/run -> Promise
  lines:    { name: { incoming(part), add(c), skip(c), swap(c) } },   // keyed by look.apply
  finishes: { name(c, made) {} },                         // after phaseDone: top bun, wrap, roll, pour
  counters: { name: { vessel(made), arrange(n) } },       // arrange -> [{ pos, scale }]
  fx:       { key(g, value, box) {} },                    // one per gross fx key
  pieces:   { name() { return geometry } },               // kept; used by scatter
}));
// Surface = { kind: 'disc' | 'rect' | 'sphere' | 'torus' | 'cyl', ...dims };  c = { food, anchors, made, part }
```

Lookups try the active module first, then `common`.

**What the kit `k` provides:**
- **Materials:** `THREE`, `toon`, `ink`, `inkThin`, and `inkInstanced(geo, mat, matrices)`, whose outline applies `instanceMatrix`.
- **Geometry and placement:** `lathe`, `rand(seed)`, `sample(surface, n, seed) → [{p, nrm}]`.
- **Colour:** `mix(colours, weights)`, `ramp(look, stage)`, `marks(look, stage)`.
- **Lifetime:** `keep(geo)`, `own(mat)`, `sprite(kind)`.
- **Motion:** `spin`, `tween`, `ease`, `wait`, `reduced()`, `detail()`.
- **Pack access:** `food(part, o)`, `lookOf`, `stageIndex`, `pack()`.

**Pack data:**
- `world: { module, layout, counter }`.
- `stations[sid].world: { set, cook?, finish? }`.
- `look: { shape, apply?, ramp: { stage: colour }, marks, piece, count, sizes, path }`. The diner's PATTY and FRIED move into `look.ramp`.
- New keys in `gross[].fx`.

**Contracts:**
- Builds are deterministic. Scatter is seeded by `ing + n`, and a growing build ends up equal to its rebuild. Otherwise toppings jump on every step.
- Scatter uses InstancedMesh, not one `ink()` per piece.
- Bodies use MeshToon or MeshBasic; only hulls may use a ShaderMaterial. The review renderer hides shader meshes (review-frames.cjs:99) and draws only meshes and points, including instanced ones (`../NARBEKART/tools/node_render.cjs:577`). Sprites never appear in it.
- Reveals use an indexed `setDrawRange`, which review-frames.cjs:100-104 knows how to cut.
- Rolling and wrapping are model swaps or CPU tweens, never shaders.
- Under `reduced()`, animations resolve at once.
- Without a scene, every call does nothing.

| | shapes | layout | cook (set) | lines | finish | fx |
|---|---|---|---|---|---|---|
| Pizza | crust (thin, regular or deep; heart), spread, melt, scatter, knots | `pie`; `made.cut` draws 4, 6 or 8 cuts | `oven`: peel goes in, browning ramp, bubbles | ladle, shake, drop | `cut` (wheel) | burnt, mould, hair, fly |
| Smoothie | jar, fill, chunk, cup (`look.sizes`), straw | `jar`; `cup` (`mix` colour) | `blender`: spins, chunks shrink by stage | pour, drop, scoop, shake | `pour` | brown, mould, `prop` (bug, sock) |
| Coffee | cup, fill (`mix`), foam, whip, spiral drizzle | `cup` | `espresso`: fills to a line | pump, pour, dollop, drizzle | lid | lumps, burnt |
| Donuts | ring (torus with ramp), jelly, glaze with drips, box | `ring` (scatter on the torus top); `box` of 12 | `fryer`: dunk, bubbles, flip, lift | dip, shake | none | stale, fly |
| Sushi | mat, nori, rice, filling log, roll, piece, hand cone | `flat`, then `roll`, then `pieces` (from `made.done`) | `roll`: mat curls, N−1 cuts | spread, lay, drizzle, shake | `roll` | stink, hair, soggy, `wink` |
| Burritos | tortilla (toast spots), heaps, bowl, taco shell, wrapped with foil | `row`, `sectors`, `tacos`, `wrapped` | `griddle`: press, marks by stage | scoop, shake, squirt, dash | `wrap` | brown, hair, `burst`, fly |
| Ice cream | cone, waffle cone, cup, scoop (radius by `part.done`), whip, cherry, shake glass, sink | `scoops` (each overlaps the one below; toppings on the top sphere) | `scoop`: ball grows; shakes reuse `blender` | scoop, drizzle, shake, dollop, drop | none | frost, puddle, hair, `as` (cherry → tomato) |

`common.js` holds what several restaurants share: scatter and sample, the bead and bottle with path presets, pour, fill and mix, ramp and marks, the blender, and heaps.

## 12. To support the Food Court
1. **Add `BB.world.usePack(pack)` in place of line 15.**
   - It disposes the old sets.
   - It builds the pack's sets (`stations[*].world.set`) plus its own counter top.
   - It resets `grillIng`.
   - `goTo(null)` hides the 3D on the court, whose backdrop is 2D (`court` in art-source/jobs/write_prompts.py).
2. **Split world.js into kit, common and burger**, with the diner unchanged. Keep `showGrill`, `dropOnGrill`, `cookGrill`, `grillStage` and `showBoard` as aliases while dom-play.cjs and review-frames.cjs move over.
3. **Replace game.js's guesses** (193-202, 322, 330-335, 352) with generic calls:
   - `showStep(q, made)`
   - `cookShow`, `cookAdd`, `cookRun`, `cookStage(sid, …)`
   - `showLine(sid, made, incoming)`
   - `lineOutcome(kind, opts)`, chosen by `look.apply`, plus a `'pick'` kind, because game.js:310-336 ignores `picked`
   - `finish(sid, made)`
   - `showCounter(list)`, using `builds.on` and `arrange(n)`
   - `colourOf` and `marksOf`, read from `look`

   Builders receive the whole `made`.
4. **Fill the diner's gaps:**
   - builders for `sprinkle`, `cup`, `ice` and `drink`;
   - fryer and drinks sets. Their backdrops are already prompted as `diner-fryer` and `diner-drinks`.
5. **Fix the fx:**
   - move them into the registry;
   - place them from `Box3.setFromObject`;
   - give each sprite its own material;
   - hold them still under Reduced.
6. **Cameras:** solve one per set, so each meets its backdrop's surface line.
   - Counters: 78% down the screen (`counter_scene`).
   - Kitchens follow `station_scene(top=…)`: 65% for the oven, blender, coffee, griddle and fryer; 60% for the sushi roll; 62% for the rest.
   - Add `--pack` to review-frames.cjs; it hard-codes packs/diner at line 23, as does dom-play.cjs:20.
7. **Low:**
   - `k.detail()` thins scatter counts and segments.
   - Render on demand, with a dirty flag.
   - Route the in-game setting to `hubGraphics.setChoice`.
8. **`clear()`:** also dispose `own` materials and InstancedMesh, and keep a `keep` set per module.
9. **Add `tests/food.test.cjs`** (Node, three r155 UMD). It checks that:
   - every name a pack uses resolves;
   - every builder returns h ≥ 0 at every stage;
   - no body uses a ShaderMaterial;
   - builds are deterministic.
10. **Changes needed in the core rules:**
    - `made()` must record every pick. Today several `from` picks overwrite `made.ing` (line.js:360): the burrito's rice, beans and protein; the smoothie base; the coffee drink and milk.
    - `made()` must also carry the slice and piece counts, and each scoop's size.
