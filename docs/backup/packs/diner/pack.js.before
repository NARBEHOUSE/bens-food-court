/** Ben's Burger Bar - the diner, as data (pack version 2: the guided line, DESIGN.md).
 *
 *  Everything the diner is lives here, and the engine in js/core/ reads this and nothing
 *  else, so a pizzeria is a new pack with no code changes (tests/packs/test-pizza).
 *
 *  stations   each one is a PHASE: a list of steps, every step one of three kinds:
 *               add   offer one ingredient (Add / Skip); max > 1 offers it again
 *               cook  the doneness of what this station cooks (Simple: pick a stage;
 *                     Timed: watch it cook and Take It Off)
 *               pick  one choice of a few: `from` a list of ingredients, or `of` the
 *                     item's size or flavour
 *             `builds` names what a station stacks the item on and what goes first and
 *             last by itself (the bun).
 *  recipes    `stations` is the order the line runs; `item` is the template a ticket is
 *             made from (orders.js): `opt: 'in'` parts can be held ("no onions"),
 *             `opt: 'out'` parts can be added; a `{ pick }` value is chosen per order.
 *  gross      what can go wrong with an ingredient on an Add step, and how it looks.
 *  regulars   the cast. A customer only comes in once their pictures exist (`art`).
 *  look       how the 3D food draws each ingredient (a shape name and colours).
 *
 *  Prices are starting values, tuned with progression (M6).
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {}).diner = data;
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'diner',
  version: 2,
  name: "Ben's Burger Bar",

  /* ── stages ─────────────────────────────────────────────────────────────── */
  // choose: what Simple cooking offers; the list then runs on to its last stage, where
  // Timed cooking stops if the food is never taken off.
  stageSets: {
    patty:   { stages: ['raw', 'rare', 'medium', 'mediumWell', 'well', 'charred'], choose: ['rare', 'medium', 'mediumWell', 'well'] },
    fried:   { stages: ['raw', 'golden', 'crispy', 'extraCrispy', 'burnt'], choose: ['golden', 'crispy', 'extraCrispy'] },
  },
  stageNames: {
    raw: 'Raw', rare: 'Rare', medium: 'Medium', mediumWell: 'Medium Well', well: 'Well Done', charred: 'Charred',
    golden: 'Golden', crispy: 'Crispy', extraCrispy: 'Extra Crispy', burnt: 'Burnt',
  },
  /** Seconds per stage with Timed cooking; the stage the ticket asks for lasts wantedScale times as long. */
  cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },
  wantedScale: 2,
  sizeSets: {
    cup: [{ id: 'small', name: 'Small' }, { id: 'medium', name: 'Medium' }, { id: 'large', name: 'Large' }],
  },

  /* ── ingredients ────────────────────────────────────────────────────────── */
  // each: an Add puts one on every one of those (a slice of cheese on each patty).
  ingredients: {
    patty:   { name: 'Patty', plural: 'Patties', stages: 'patty', look: { shape: 'patty' } },
    bun:     { name: 'Bun', layers: { bottom: 'Bottom Bun', top: 'Top Bun' }, look: { shape: 'bun', colour: 0xe0a456 } },
    cheese:  { name: 'Cheese', each: 'patty', look: { shape: 'slice', colour: 0xffc21f } },
    bacon:   { name: 'Bacon', look: { shape: 'strips', colour: 0xb4442a, fat: 0xf2c4a8 } },
    lettuce: { name: 'Lettuce', look: { shape: 'leaf', colour: 0x5cbf3a } },
    tomato:  { name: 'Tomato', plural: 'Tomatoes', look: { shape: 'disc', colour: 0xe23b2a, inner: 0xff7a5c } },
    pickles: { name: 'Pickles', look: { shape: 'chips', colour: 0x6f9f2c } },
    onion:   { name: 'Onion', plural: 'Onions', look: { shape: 'rings', colour: 0xf3ecdc } },
    // A sauce comes down the line in its squeeze bottle (colour; cap: the cap and nozzle) and is squirted on.
    ketchup: { name: 'Ketchup', sauce: true, look: { shape: 'sauce', colour: 0xc8231a, cap: 0xa51a13 } },
    mustard: { name: 'Mustard', sauce: true, look: { shape: 'sauce', colour: 0xf2c21b, cap: 0xd6a30c } },
    mayo:    { name: 'Mayo', sauce: true, look: { shape: 'sauce', colour: 0xf8f3e3, cap: 0xffffff } },
    plate:   { name: 'Plate', look: { shape: 'plate' } },

    fries:   { name: 'Fries', stages: 'fried', look: { shape: 'fries', colour: 0xf2c14e } },
    rings:   { name: 'Onion Rings', stages: 'fried', look: { shape: 'onionRings', colour: 0xd99a3a } },
    salt:    { name: 'Salt', look: { shape: 'sprinkle', colour: 0xffffff } },

    cup:        { name: 'Cup', sizes: 'cup', look: { shape: 'cup' } },
    ice:        { name: 'Ice', look: { shape: 'ice' } },
    cola:       { name: 'Cola', look: { shape: 'drink', colour: 0x4a2412 } },
    lemonLime:  { name: 'Lemon-Lime', look: { shape: 'drink', colour: 0xd9f2a0 } },
    orangeSoda: { name: 'Orange Soda', look: { shape: 'drink', colour: 0xff8a1c } },
    lemonade:   { name: 'Lemonade', look: { shape: 'drink', colour: 0xfff07a } },
    icedTea:    { name: 'Iced Tea', look: { shape: 'drink', colour: 0x9a5a1e } },
  },

  /* ── stations: the phases of the line ───────────────────────────────────── */
  stations: {
    grill: {
      name: 'Grill', backdrop: 'grill', redo: 'Redo the Grill',
      steps: [{ kind: 'add', ing: 'patty', max: 3 }, { kind: 'cook', ing: 'patty' }],
    },
    board: {
      name: 'Board', backdrop: 'board', redo: 'Redo the Toppings', builds: { on: 'plate', base: 'bun', cap: 'bun' },
      steps: ['cheese', 'bacon', 'lettuce', 'tomato', 'pickles', 'onion', 'ketchup', 'mustard', 'mayo'].map(ing => ({ kind: 'add', ing })),
    },
    fryer: {
      name: 'Fryer', backdrop: 'fryer', redo: 'Redo the Fryer',
      steps: [{ kind: 'pick', from: ['fries', 'rings'] }, { kind: 'cook' }, { kind: 'add', ing: 'salt' }],
    },
    drinks: {
      name: 'Drinks', backdrop: 'drinks', redo: 'Redo the Drink', builds: { on: 'cup' },
      steps: [{ kind: 'pick', of: 'size' }, { kind: 'add', ing: 'ice' }, { kind: 'pick', of: 'flavour' }],
    },
  },

  /* ── recipes ────────────────────────────────────────────────────────────── */
  picks: {
    doneness: { values: ['rare', 'medium', 'mediumWell', 'well'], normal: 'medium' },
    fry:      { values: ['golden', 'crispy'], normal: 'golden', fancy: ['golden', 'crispy', 'extraCrispy'] },
    cupSize:  { values: ['small', 'medium', 'large'], normal: 'medium' },
    soda:     { values: ['cola', 'lemonLime', 'orangeSoda'], normal: 'cola' },
    tea:      { values: ['lemonade', 'icedTea'], normal: 'lemonade' },
  },
  // milestone: the build the recipe arrives in (DESIGN.md "Recipes"); the game offers the
  // recipes of its milestone and earlier until progression arrives (M6).
  recipes: {
    hamburger: {
      name: 'Hamburger', plural: 'Hamburgers', price: 6, unlock: 0, milestone: 2, stations: ['grill', 'board'],
      item: { ing: 'plate', parts: [
        { ing: 'bun' }, { ing: 'patty', done: { pick: 'doneness' } },
        { ing: 'lettuce', opt: 'in' }, { ing: 'tomato', opt: 'in' }, { ing: 'pickles', opt: 'in' }, { ing: 'onion', opt: 'out' },
        { ing: 'ketchup', opt: 'in' }, { ing: 'mustard', opt: 'out' }, { ing: 'mayo', opt: 'out' }, { ing: 'bun' }] },
    },
    cheeseburger: {
      name: 'Cheeseburger', plural: 'Cheeseburgers', price: 7, unlock: 0, milestone: 2, stations: ['grill', 'board'],
      item: { ing: 'plate', parts: [
        { ing: 'bun' }, { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' },
        { ing: 'lettuce', opt: 'in' }, { ing: 'tomato', opt: 'in' }, { ing: 'pickles', opt: 'in' }, { ing: 'onion', opt: 'out' },
        { ing: 'ketchup', opt: 'in' }, { ing: 'mustard', opt: 'out' }, { ing: 'mayo', opt: 'out' }, { ing: 'bun' }] },
    },
    baconCheeseburger: {
      name: 'Bacon Cheeseburger', plural: 'Bacon Cheeseburgers', price: 9, unlock: 40, milestone: 2, stations: ['grill', 'board'],
      item: { ing: 'plate', parts: [
        { ing: 'bun' }, { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' }, { ing: 'bacon' },
        { ing: 'lettuce', opt: 'in' }, { ing: 'tomato', opt: 'in' }, { ing: 'pickles', opt: 'out' }, { ing: 'onion', opt: 'in' },
        { ing: 'ketchup', opt: 'in' }, { ing: 'mustard', opt: 'out' }, { ing: 'mayo', opt: 'out' }, { ing: 'bun' }] },
    },
    doubleCheeseburger: {
      name: 'Double Cheeseburger', plural: 'Double Cheeseburgers', price: 10, unlock: 60, milestone: 2, stations: ['grill', 'board'],
      item: { ing: 'plate', parts: [
        { ing: 'bun' }, { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' },
        { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' },
        { ing: 'lettuce', opt: 'in' }, { ing: 'tomato', opt: 'out' }, { ing: 'pickles', opt: 'in' }, { ing: 'onion', opt: 'in' },
        { ing: 'ketchup', opt: 'in' }, { ing: 'mustard', opt: 'in' }, { ing: 'mayo', opt: 'out' }, { ing: 'bun' }] },
    },
    tower: {
      name: 'The Diner Tower', plural: 'Diner Towers', price: 14, unlock: 150, milestone: 2, rare: true, stations: ['grill', 'board'],
      item: { ing: 'plate', parts: [
        { ing: 'bun' },
        { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' },
        { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' },
        { ing: 'patty', done: { pick: 'doneness' } }, { ing: 'cheese' }, { ing: 'bacon' },
        { ing: 'lettuce', opt: 'in' }, { ing: 'tomato', opt: 'in' }, { ing: 'pickles', opt: 'in' }, { ing: 'onion', opt: 'in' },
        { ing: 'ketchup', opt: 'in' }, { ing: 'mustard', opt: 'in' }, { ing: 'mayo', opt: 'in' }, { ing: 'bun' }] },
    },
    fries: {
      name: 'Fries', plural: 'Fries', price: 3, unlock: 0, milestone: 4, stations: ['fryer'],
      item: { ing: 'fries', done: { pick: 'fry' }, parts: [{ ing: 'salt', opt: 'in' }] },
    },
    onionRings: {
      name: 'Onion Rings', plural: 'Onion Rings', price: 4, unlock: 40, milestone: 4, stations: ['fryer'],
      item: { ing: 'rings', done: { pick: 'fry' }, parts: [{ ing: 'salt', opt: 'in' }] },
    },
    fountain: {
      name: 'Fountain Drink', plural: 'Fountain Drinks', price: 2, unlock: 0, milestone: 4, stations: ['drinks'],
      item: { ing: 'cup', nameFrom: 'flavour', size: { pick: 'cupSize' }, parts: [{ ing: 'ice', opt: 'in' }, { ing: { pick: 'soda' } }] },
    },
    lemonade: {
      name: 'Lemonade or Iced Tea', plural: 'Lemonades', price: 3, unlock: 30, milestone: 4, stations: ['drinks'],
      item: { ing: 'cup', nameFrom: 'flavour', size: { pick: 'cupSize' }, parts: [{ ing: 'ice', opt: 'in' }, { ing: { pick: 'tea' } }] },
    },
  },
  /** Orders setting: how many items (more: the chance of each one past the first), how far
   *  from the recipe as written an order strays, and maxOptional, the most toppings a Simple
   *  order keeps ("with just lettuce and ketchup"). */
  orderStyles: {
    simple: { items: [1, 1], change: 0.2, maxOptional: 2 },
    usual:  { items: [1, 2], change: 0.3, more: 0.25 },
    fancy:  { items: [1, 3], change: 0.5, more: 0.5, fancy: true },
  },

  /* ── gross-outs (DESIGN.md "Gross-outs") ────────────────────────────────── */
  // on: the ingredients it can happen to (only when the ticket wants them). say: how the
  // step's spoken label names it ({name} is the ingredient, lower case). fx: how it looks.
  gross: [
    { id: 'mouldy',  on: ['cheese'], say: 'the green cheese', fx: { tint: 0x86b83c, stink: true } },
    { id: 'wilted',  on: ['lettuce'], say: 'the brown lettuce', fx: { tint: 0x7a5a2a, droop: true, stink: true } },
    { id: 'charred', on: ['bacon'], say: 'the burnt bacon', fx: { tint: 0x2a1a12, smoke: true } },
    { id: 'hair',    on: ['lettuce', 'tomato', 'pickles', 'onion', 'cheese'], say: '{name} with a hair on it', fx: { hair: true } },
    { id: 'fly',     on: ['lettuce', 'tomato', 'pickles', 'onion', 'cheese', 'bacon'], say: '{name} with a fly on it', fx: { fly: true } },
  ],
  grossRate: 0.3,           // chance an order (not a shift's first) has one
  grossMax: 2,              // at most this many in a shift, never two on one order

  /* ── people ─────────────────────────────────────────────────────────────── */
  // art: the folder under packs/diner/art/cast/ with the character's pose images.
  // tts: how text to speech says their lines until they are recorded.
  manager: { id: 'mitch', name: 'Mitch', art: 'mitch', tts: { pitch: 1.15, rate: 1.12 } },
  // Pose for each moment (DESIGN.md "Expressions"). Every character's art has these names.
  poses: {
    customer: { arrive: 'neutral', order: 'talking', wait: 'waiting', stars3: 'happy', favourite: 'delighted',
      stars2: 'annoyed', stars1: 'angry', gross: 'disgusted', shock: 'shocked', joke: 'laughing' },
    manager: { idle: 'neutral', talk: 'talking', teach: 'pointing', good: 'thumbsUp', grossSpot: 'shocked',
      grossNasty: 'disgusted', bad: 'facepalm', joke: 'laughing', nearly: 'worried', shrug: 'shrug' },
  },
  // likes: recipes and weights. usual: a fixed order. dislikes: always held.
  // favourite: a bonus tip and a line, never stars. twin: two of one thing. exact: an
  // order that strays further from the recipe.
  regulars: [
    { id: 'marge', name: 'Marge', art: 'marge', tts: { pitch: 1.25, rate: 0.88 },
      who: 'Retired school-bus driver, cardigan, reading glasses on a chain', voice: 'Warm, unhurried',
      likes: [['cheeseburger', 3], ['hamburger', 1]], usual: [{ recipe: 'cheeseburger', set: { doneness: 'medium' } }] },
    // voice: as the voice test's round 1 notes asked (2026-11-08): Gus a Western drawl and a bit quicker; Bev low and
    // butch; Vernon foppish and fussy. Round 2 offers new voices in those styles.
    { id: 'gus', name: 'Gus', art: 'gus', tts: { pitch: 0.7, rate: 0.95 },
      who: 'Long-haul trucker, huge beard, trucker cap', voice: 'Deep, friendly, a Western drawl',
      likes: [['cheeseburger', 2], ['baconCheeseburger', 2], ['hamburger', 1]], twin: true, tipScale: 1.25 },
    { id: 'bev', name: 'Coach Bev', art: 'bev', tts: { pitch: 0.8, rate: 1.1 },
      who: 'Whistle, tracksuit, clipboard', voice: 'Low, butch, booming',
      likes: [['doubleCheeseburger', 3], ['baconCheeseburger', 2], ['tower', 1]], favourite: { recipe: 'doubleCheeseburger', bonus: 2 } },
    { id: 'vernon', name: 'Vernon', art: 'vernon', tts: { pitch: 1.1, rate: 0.92 },
      who: 'Runs a burger-review blog with eleven followers', voice: 'Foppish, fussy and refined, with theatrical sighs',
      likes: [['cheeseburger', 3], ['hamburger', 2], ['doubleCheeseburger', 1]], exact: true, threeStarScale: 1.5 },
    // Added 2026-11-08 (the user asked for a gruff, crude New Yorker): never takes lettuce, so every burger he orders
    // leaves it off (the ticket never lists it), and he says why after ordering (order.dislike).
    { id: 'sal', name: 'Sal', art: 'sal', tts: { pitch: 0.75, rate: 1.05 },
      who: 'Runs the hot-dog cart out front and never eats his own hot dogs', voice: 'Gruff, loud New Yorker',
      likes: [['baconCheeseburger', 3], ['doubleCheeseburger', 2], ['cheeseburger', 1], ['tower', 1]], dislikes: ['lettuce'],
      favourite: { recipe: 'baconCheeseburger', bonus: 2 } },
    // Drawn later (DESIGN.md "Customers and cast"): no art yet, so not in a shift.
    { id: 'dale', name: 'Dale', who: 'Wiry mechanic in grease-spotted overalls', voice: 'Gravelly drawl',
      likes: [['onionRings', 4], ['cheeseburger', 1]], always: ['onionRings'], favourite: { recipe: 'onionRings', bonus: 2 } },
    { id: 'priya', name: 'Priya', who: 'Night-shift nurse in scrubs, coffee-deprived', voice: 'Dry, quick',
      likes: [['hamburger', 1], ['fountain', 1]] },
    { id: 'oakes', name: 'Professor Oakes', who: 'Tweed jacket, bow tie, pocket protector', voice: 'Nasal, nerdy, slightly too fast',
      likes: [['lemonade', 3], ['hamburger', 1]], dislikes: ['onion'] },
    { id: 'reginald', name: 'Reginald', who: 'Self-declared food critic, scarf in all weather', voice: 'Theatrical, sweeping',
      likes: [['cheeseburger', 1]], newest: true },
    { id: 'tasha', name: 'Tasha', who: 'Teenage skateboarder, deeply unimpressed', voice: 'Flat, deadpan',
      likes: [['fries', 2], ['fountain', 1]] },
    { id: 'kai', name: 'Kai', who: 'Ten years old, notebook under one arm', voice: 'Bright, very serious',
      likes: [['hamburger', 2], ['cheeseburger', 2]], short: true },
  ],

  /* ── the tutorial (DESIGN.md "Tutorial") ────────────────────────────────── */
  // One typical order, made exactly as written with the changes listed, and one gross-out.
  tutorial: {
    customer: 'marge',
    items: [{ recipe: 'baconCheeseburger', set: { doneness: 'medium' }, hold: ['onion'] }],
    gross: { item: 0, ing: 'cheese', event: 'mouldy' },
  },

  /* ── backdrops (art under packs/diner/art/backdrops/) ───────────────────── */
  backdrops: { counter: 'counter', grill: 'grill', board: 'board' },
  dailySpecialBonus: 0.2,
});
