/** Ben's Smoothie Shack - the restaurant, as data (docs/api/pack-format.md; in words: docs/api/packs/smoothie.md).
 *
 *  A beach shack with a surfboard counter, tiki torches and a row of loud blenders (FOODCOURT-BUILD.md 5.3,
 *  BENS-FOOD-COURT "Ben's Smoothie Shack"). The first restaurant to unlock (the left arm, upper). The engine
 *  (js/core) reads this and nothing else; the food is js/food/smoothie.js (food-smoothie), the lines are
 *  packs/smoothie/script.js (content-smoothie), who everyone IS is packs/cast/cast.js.
 *
 *  The line, every smoothie the same 12 presses in Simple (Serve makes 13):
 *    prep (Prep Table)        Size: Small / Medium / Large -> Base: Juice / Milk / Yogurt / Oat Milk -> (the base
 *                             glugs into the jug, a flourish) -> Add or Skip each fruit as it comes down the line
 *                             (strawberries, banana, mango, pineapple, blueberries), then each extra (spinach,
 *                             protein, honey, ice)
 *    blender (Blender)        Simple: How smooth? Chunky / Smooth / Super Smooth. Timed: watch it blend and Stop the
 *                             Blender (left on, it ends Soupy: over-blending is Timed's last stage, never a
 *                             gross-out). Then it pours itself into the cup (a flourish).
 *  Acai bowls (level 3 up, the second course): the blender (the acai blends, then is poured into the bowl), then
 *  the bowl bar: Add or Skip granola, banana, strawberries, blueberries, honey. 6 presses (Serve makes 7).
 *
 *  The fruits and extras are Add or Skip steps, one at a time ("the ingredients come to him", DESIGN.md; pilot.md
 *  5.2): that is where the gross-outs sit (the brown banana, the mouldy strawberries, the bug and the sock in the
 *  ice) and where Sal's spinach and Tony's pineapple are held. A smoothie takes the same presses whatever is in it.
 *
 *  Plain data only: no functions, no Math.random. Ids match /^\w+$/. (The cup sizes are smallCup, mediumCup and
 *  largeCup: js/core quotes "medium" in a comment, and no pack id may be a word js/core quotes.)
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {}).smoothie = data;
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'smoothie',
  version: 1,
  name: "Ben's Smoothie Shack",
  format: 3,                      // packs/smoothie/script.js covers every moment (content-smoothie, 2026-11-09)

  help: "Ben's Smoothie Shack. Every smoothie starts at the prep table: pick the cup size, then the base, then Add " +
    'or Skip each fruit and extra as it comes down the line. Then the blender: in Simple, pick how smooth it is, ' +
    'Chunky, Smooth or Super Smooth; in Timed, watch it blend and Stop the Blender when it reaches the thickness on ' +
    'the ticket. It pours itself into the cup. An açaí bowl blends first, then gets its toppings at the bowl bar. ' +
    "The ticket lists everything: add what's on it, skip what isn't. If something looks wrong, Swap It brings a " +
    'fresh one.',

  /* ── colours (spec 5.6): tropical teal. Contrast worked out in docs/api/packs/smoothie.md section 14: every
     colour the highlight sits on is at least 3:1 against #ffd400, every text colour at least 4.5:1. ── */
  theme: {
    pageBg: '#08393a',                 // behind everything (loading, fades): deep lagoon
    panelTop: '#0f6f6c',               // the line's control panel: shack teal (the highlight sits on it)
    panelBottom: '#0a4e4c',
    panelLip: '#052c2b',
    plateTop: '#fffaf0',               // the blender's thickness plates: white enamel, ink words
    plateBottom: '#e3f4ee',
    mark: '#8a2457',                   // the thickness mark on a plate: berry
    labelBg: 'rgba(5,44,43,.9)',       // white words on a prop's label
    ticketAccent: '#0b6663',           // the customer's name on the ticket (on paper)
    ticketNow: '#d6f5ec',              // the item being made, on the ticket (ink words): pale mint
    perforation: '#9fd0c5',
    hudBg: 'rgba(6,52,51,.86)',        // white words
    gaugeBg: 'rgba(4,36,36,.92)',      // the Timed gauge: white words, the highlight marks the stage now
    star: '#c97c00',                   // mango stars: 3:1 on the receipt's paper and on the teal board and its glow
    boardGlow: '#0a4543',              // menu boards: a dark teal board in a bamboo frame
    woodInset: '#5a3d12',
    cardValue: '#ffe7a3',
    logoTop: '#ffd36b',                // pineapple gold
    logoMain: '#ffa8cc',               // smoothie pink
    wheelInk: '#10201f',
    wheelSteel: '#dfe8e6',
    wheelDark: '#0f6f6c',              // the ticket wheel's spokes, painted teal
    board: '#06302f',
    wood: '#d9a640',                   // the boards' frame: golden bamboo, as the shack's pillars
  },
  courses: ['smoothie', 'bowl'],  // a two-item order (level 3 up) is a smoothie and an acai bowl, or Gus's two of one thing
  levels: {},                     // the engine's ladder unchanged (pack-format.md 12); put only what differs here

  manager: { id: 'mitch', art: 'mitch-smoothie' },   // the Hawaiian shirt, the lei, sunglasses on his head

  /* ── cooking ────────────────────────────────────────────────────────────── */
  // The blender blends the whole item (a smoothie, or the acai for a bowl). Timed food left on ends Soupy, its last
  // stage: over-blended, thin and foamy (one mistake, complain.done), never a gross-out.
  stageSets: {
    blend: { stages: ['unblended', 'chunky', 'smooth', 'superSmooth', 'soupy'], choose: ['chunky', 'smooth', 'superSmooth'],
      ask: 'How smooth?', stop: 'Stop the Blender' },
  },
  stageNames: { unblended: 'Unblended', chunky: 'Chunky', smooth: 'Smooth', superSmooth: 'Super Smooth', soupy: 'Soupy' },
  cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },   // the Burger Bar's grill: seconds a stage
  wantedScale: 2,                                     // the ticket's stage lasts twice as long

  /* ── what goes in (looks: docs/api/packs/smoothie.md section 10 has the table food-smoothie draws from) ── */
  // Plurals are the words a "no ..." says ("no banana", "no ice"): smoothie fruit is counted by the scoop, not one by one.
  ingredients: {
    // The items. The smoothie is built in the blender jug (the prep table builds on it); its ramp is a blended
    // smoothie's colour at each stage, for the blender's thickness plates. The acai is the bowl's body.
    smoothie:     { name: 'Smoothie', plural: 'Smoothies',
      look: { shape: 'blenderJug', ramp: { unblended: 0xf3d2b0, chunky: 0xf08ba0, smooth: 0xec7096, superSmooth: 0xe75d8b, soupy: 0xf7c7d6 } } },
    acai:         { name: 'Açaí', plural: 'Açaí',
      look: { shape: 'acaiBlend', colour: 0x4e1f60, ramp: { unblended: 0x6d3a7e, chunky: 0x5b2b6e, smooth: 0x4e1f60, superSmooth: 0x461a57, soupy: 0x9a7aa8 } } },
    // The fruits.
    strawberries: { name: 'Strawberries', plural: 'Strawberries', look: { shape: 'strawberries', colour: 0xe2303c } },
    banana:       { name: 'Banana', plural: 'Banana', look: { shape: 'banana', colour: 0xf7d84a } },
    mango:        { name: 'Mango', plural: 'Mango', look: { shape: 'mangoChunks', colour: 0xffa21f } },
    pineapple:    { name: 'Pineapple', plural: 'Pineapple', look: { shape: 'pineappleChunks', colour: 0xf6d34a } },
    blueberries:  { name: 'Blueberries', plural: 'Blueberries', look: { shape: 'blueberries', colour: 0x3b4fa8 } },
    // The extras.
    spinach:      { name: 'Spinach', plural: 'Spinach', look: { shape: 'spinachLeaves', colour: 0x2f8a3a } },
    protein:      { name: 'Protein', plural: 'Protein', look: { shape: 'proteinPowder', colour: 0xf1e3c6 } },
    honey:        { name: 'Honey', plural: 'Honey', look: { shape: 'honey', colour: 0xe9a520 } },
    ice:          { name: 'Ice', plural: 'Ice', look: { shape: 'iceCubes', colour: 0xdff4ff } },
    // The bowl's own topping (its banana, strawberries, blueberries and honey are the same as the smoothie's).
    granola:      { name: 'Granola', plural: 'Granola', look: { shape: 'granola', colour: 0xc98f4a } },
  },

  /* ── named picks ────────────────────────────────────────────────────────── */
  slots: {
    size: { name: 'Size', say: '{value} cup', values: [
      { id: 'smallCup', name: 'Small', look: { shape: 'paperCup', size: 0.82 } },
      { id: 'mediumCup', name: 'Medium', look: { shape: 'paperCup', size: 1 } },
      { id: 'largeCup', name: 'Large', look: { shape: 'paperCup', size: 1.22 } }] },
    base: { name: 'Base', say: '{value} base', values: [
      { id: 'juice', name: 'Juice', look: { shape: 'baseLiquid', colour: 0xffa62b } },
      { id: 'milk', name: 'Milk', look: { shape: 'baseLiquid', colour: 0xfbfaf4 } },
      { id: 'yogurt', name: 'Yogurt', look: { shape: 'baseLiquid', colour: 0xf4efe2, thick: true } },
      { id: 'oatMilk', name: 'Oat Milk', look: { shape: 'baseLiquid', colour: 0xeadcc0 } }] },
  },

  /* ── stations ───────────────────────────────────────────────────────────── */
  stations: {
    prep: {
      name: 'Prep Table', backdrop: 'prep', redo: 'Redo the Smoothie', builds: { on: 'smoothie' }, sounds: { auto: 'pour' },
      steps: [
        { kind: 'pick', slot: 'size' },
        { kind: 'pick', slot: 'base' },
        { kind: 'auto', id: 'pour', show: 'basePour' },          // the base glugs into the blender jug
        { kind: 'add', ing: 'strawberries' },
        { kind: 'add', ing: 'banana' },
        { kind: 'add', ing: 'mango' },
        { kind: 'add', ing: 'pineapple' },
        { kind: 'add', ing: 'blueberries' },
        { kind: 'add', ing: 'spinach' },
        { kind: 'add', ing: 'protein' },
        { kind: 'add', ing: 'honey' },
        { kind: 'add', ing: 'ice' },
      ],
    },
    blender: {
      name: 'Blender', backdrop: 'blender', redo: 'Blend Again', tool: 'blenderSwitch',
      sounds: { cook: 'blender', done: 'blenderStop', auto: 'pour' },
      steps: [
        { kind: 'cook', stages: 'blend' },
        { kind: 'auto', id: 'fill', show: 'cupFill' },             // it pours into the cup (or the bowl)
      ],
    },
    bowlBar: {
      name: 'Bowl Bar', backdrop: 'prep', redo: 'Redo the Bowl',
      steps: [
        { kind: 'add', ing: 'granola' },
        { kind: 'add', ing: 'banana' },
        { kind: 'add', ing: 'strawberries' },
        { kind: 'add', ing: 'blueberries' },
        { kind: 'add', ing: 'honey' },
      ],
    },
  },

  /* ── how orders choose values (level 5 uses the fancy lists) ───────────── */
  // Three bases with different usual values: a fruit smoothie comes on juice, a berry one on yogurt, a shake on milk.
  picks: {
    size:       { values: ['smallCup', 'mediumCup', 'largeCup'], normal: 'mediumCup' },
    base:       { values: ['juice', 'milk', 'yogurt'], normal: 'juice', fancy: ['juice', 'milk', 'yogurt', 'oatMilk'] },
    creamyBase: { values: ['yogurt', 'milk', 'juice'], normal: 'yogurt', fancy: ['yogurt', 'milk', 'juice', 'oatMilk'] },
    milkBase:   { values: ['milk', 'oatMilk', 'yogurt'], normal: 'milk' },
    blend:      { values: ['chunky', 'smooth', 'superSmooth'], normal: 'smooth' },
  },

  /* ── the menu (spec 4.3): level is the only gate ───────────────────────── */
  // Every smoothie names its size, its base and its blend; opt 'in' parts can be held ("no ice"), opt 'out' parts
  // can be added ("add honey"). Recipe looks name the layout the food draws the item with.
  recipes: {
    strawberryBanana: {
      name: 'Strawberry Banana Smoothie', plural: 'Strawberry Banana Smoothies', price: 6, level: 1, course: 'smoothie',
      look: { shape: 'smoothieCup' }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: { pick: 'size' }, base: { pick: 'base' } },
        parts: [{ ing: 'strawberries' }, { ing: 'banana' }, { ing: 'blueberries', opt: 'out' }, { ing: 'honey', opt: 'out' },
          { ing: 'ice', opt: 'in' }] },
    },
    tropical: {
      name: 'Tropical Smoothie', plural: 'Tropical Smoothies', price: 7, level: 1, course: 'smoothie',
      look: { shape: 'smoothieCup' }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: { pick: 'size' }, base: { pick: 'base' } },
        parts: [{ ing: 'banana', opt: 'in' }, { ing: 'mango' }, { ing: 'pineapple' }, { ing: 'honey', opt: 'out' },
          { ing: 'ice', opt: 'in' }] },
    },
    berryBlast: {
      name: 'Berry Blast', plural: 'Berry Blasts', price: 7, level: 1, course: 'smoothie',
      look: { shape: 'smoothieCup' }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: { pick: 'size' }, base: { pick: 'creamyBase' } },
        parts: [{ ing: 'strawberries' }, { ing: 'banana', opt: 'out' }, { ing: 'blueberries' }, { ing: 'honey', opt: 'out' },
          { ing: 'ice', opt: 'in' }] },
    },
    greenSmoothie: {
      name: 'Green Smoothie', plural: 'Green Smoothies', price: 8, level: 2, course: 'smoothie',
      look: { shape: 'smoothieCup' }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: { pick: 'size' }, base: { pick: 'base' } },
        parts: [{ ing: 'banana' }, { ing: 'mango', opt: 'out' }, { ing: 'pineapple', opt: 'in' }, { ing: 'spinach' },
          { ing: 'honey', opt: 'in' }, { ing: 'ice', opt: 'in' }] },
    },
    proteinShake: {
      name: 'Protein Shake', plural: 'Protein Shakes', price: 8, level: 2, course: 'smoothie',
      look: { shape: 'smoothieCup' }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: { pick: 'size' }, base: { pick: 'milkBase' } },
        parts: [{ ing: 'strawberries', opt: 'out' }, { ing: 'banana' }, { ing: 'spinach', opt: 'in' }, { ing: 'protein' },
          { ing: 'honey', opt: 'in' }, { ing: 'ice', opt: 'in' }] },
    },
    // The second course, from level 3: blended in the same blender, then topped at the bowl bar.
    acaiBowl: {
      name: 'Açaí Bowl', plural: 'Açaí Bowls', price: 9, level: 3, course: 'bowl',
      look: { shape: 'acaiBowl' }, stations: ['blender', 'bowlBar'],
      item: { ing: 'acai', done: { pick: 'blend' },
        parts: [{ ing: 'granola' }, { ing: 'banana' }, { ing: 'strawberries', opt: 'in' }, { ing: 'blueberries', opt: 'in' },
          { ing: 'honey', opt: 'in' }] },
    },
    // The five-star event's giant: made on the normal line (every fruit), drawn in a two-handled trophy and 1.6
    // times bigger. The trophy is its look, never a size value (that would add a choice to every smoothie).
    trophySmoothie: {
      name: 'Trophy Smoothie', plural: 'Trophy Smoothies', price: 20, level: 'event', course: 'smoothie',
      look: { shape: 'trophyCup', giant: true }, stations: ['prep', 'blender'],
      item: { ing: 'smoothie', done: { pick: 'blend' }, slots: { size: 'largeCup', base: 'juice' },
        parts: [{ ing: 'strawberries' }, { ing: 'banana' }, { ing: 'mango' }, { ing: 'pineapple' }, { ing: 'blueberries' },
          { ing: 'honey' }, { ing: 'ice' }] },
    },
  },

  /* ── gross-outs (spec 4.6): each on an Add step; the label names it, Swap It brings a fresh one ── */
  // Over-blending is not here: Soupy is the blend set's last stage, in Timed only. The sock goes in the ice Add
  // (spec 4.6: it cannot sit on the blender, a cook step).
  gross: [
    { id: 'brown', on: ['banana'], say: 'the brown, mushy {name}', fx: { tint: 0x7a5524, spots: { colour: 0x3b2410, n: 10 }, droop: true } },
    { id: 'mouldy', on: ['strawberries'], say: 'the mouldy {name}', fx: { spots: { colour: 0xe4eadc, n: 12 }, tint: 0x8c6a62, stink: true } },
    { id: 'bug', on: ['ice'], say: '{name} with a bug in it', fx: { bug: true } },               // a beetle frozen in a cube
    { id: 'sock', on: ['ice'], say: '{name} with a sock in it', fx: { sock: true, stink: true } }, // a striped sock in the ice
  ],

  /* ── people (spec 2.2, 2.3, 5.4): what each orders here; who they are is the cast's ── */
  regulars: [
    // "Strawberry banana": her usual, as written.
    { id: 'marge', likes: [['strawberryBanana', 3]],
      usual: [{ recipe: 'strawberryBanana', set: { size: 'mediumCup', base: 'juice', blend: 'smooth' } }] },
    // "Two shakes, same deal": two of one thing where the level allows two items (his cast twin).
    { id: 'gus', likes: [['tropical', 2], ['proteinShake', 2]] },
    // "Protein shake": her favourite.
    { id: 'bev', likes: [['proteinShake', 3]], favourite: { recipe: 'proteinShake', bonus: 2 } },
    // "Very specific blend": small, oat milk, super smooth, and his cast `exact` strays further from the recipe.
    { id: 'vernon', likes: [['berryBlast', 2], ['greenSmoothie', 1]],
      set: { size: 'smallCup', base: 'oatMilk', creamyBase: 'oatMilk', milkBase: 'oatMilk', blend: 'superSmooth' } },
    // "Refuses, then orders anyway": the refusal is his greet; the order is a normal one. No lettuce here, so the
    // rabbit food he never takes is the spinach: held on a protein shake (where it is optional; he says why), and
    // never a green smoothie (it always comes with it).
    { id: 'sal', likes: [['strawberryBanana', 2], ['proteinShake', 2]], dislikes: ['spinach'] },
    // The deadpan skater (spec 2.2, 5.4): "Whatever. Large."
    { id: 'tasha', likes: [['berryBlast', 3], ['tropical', 1]], set: { size: 'largeCup' } },
    // The locals. Breeze, the slow surfer (his gag is in his words, not their length); Brock, the gym bro
    // ("all the protein" is said, never made).
    { id: 'breeze', likes: [['tropical', 3], ['acaiBowl', 2]] },
    { id: 'brock', likes: [['proteinShake', 4], ['greenSmoothie', 1]], favourite: { recipe: 'proteinShake', bonus: 2 } },
    // Special visitors from level 4, one a shift, never first: the critic, his ten-year-old fan, and a cameo (spec
    // 2.2): Tony from the Pizza Parlor, in a shack full of pineapple. He never orders a smoothie that has to come
    // with it, and holds it where it is optional.
    { id: 'reginald', likes: [['acaiBowl', 2]], visitor: { level: 4 } },
    { id: 'kai', likes: [['strawberryBanana', 2], ['berryBlast', 1]], visitor: { level: 4 } },
    { id: 'tony', likes: [['berryBlast', 3], ['greenSmoothie', 2]], dislikes: ['pineapple'], visitor: { level: 4 } },
  ],

  /* ── the tutorial: one guided order through every station, with a gross-out to Swap ── */
  // Breeze's Tropical Smoothie (prep, blender) and an acai bowl (blender, bowl bar); the banana comes down the line
  // brown and mushy.
  tutorial: {
    customer: 'breeze',
    items: [
      { recipe: 'tropical', set: { size: 'mediumCup', base: 'juice', blend: 'smooth' } },
      { recipe: 'acaiBowl', set: { blend: 'smooth' } },
    ],
    gross: { item: 0, ing: 'banana', event: 'brown' },
  },

  /* ── ridiculous orders (level 4+, at most one a shift): said in order.odd.<id>; the ticket stays plain ── */
  oddOrders: [
    // "Every fruit you've got." The Tropical Smoothie with the strawberries and blueberries added: all five.
    { id: 'everyFruit', recipe: 'tropical', adds: ['strawberries', 'blueberries'], say: 'order.odd.everyFruit' },
    // "A green smoothie, but not green." The Green Smoothie without its spinach: it comes out yellow.
    { id: 'notGreen', recipe: 'greenSmoothie', holds: ['spinach'], say: 'order.odd.notGreen' },
    // "A protein shake for my dog." A small one, no honey ("he's watching his figure"). Said, never served to a dog.
    { id: 'dogShake', recipe: 'proteinShake', holds: ['honey'], picks: { size: 'smallCup' }, say: 'order.odd.dogShake' },
    // "Everything. Blend it until it gives up." Every fruit and every extra, the largest cup, super smooth.
    { id: 'wipeout', level: 5, recipe: 'tropical', adds: ['strawberries', 'blueberries', 'spinach', 'protein', 'honey'],
      set: { blend: 'superSmooth' }, picks: { size: 'largeCup' }, say: 'order.odd.wipeout' },
  ],

  /* ── the five-star event (spec 4.4): two beach volleyball teams, spoken of, never shown ── */
  // Shift Length orders at level-4 complexity between games; the last is always Brock's: the giant Trophy Smoothie
  // for the winners (Breeze's team, who didn't know they were keeping score) and an acai bowl for himself.
  events: {
    five: {
      name: 'The Beach Volleyball Tournament',
      customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'tasha', 'breeze', 'reginald', 'kai'],
      finale: { customer: 'brock', items: [
        { recipe: 'trophySmoothie', set: { blend: 'superSmooth' } },
        { recipe: 'acaiBowl', set: { blend: 'smooth' } },
      ] },
    },
  },
});
