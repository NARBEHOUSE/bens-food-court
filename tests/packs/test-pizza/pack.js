/** Ben's Food Court - a test-only pizzeria on the new line model (pack version 3).
 *
 *  Proof that a restaurant is a pack, and the one pack that uses every feature of the line
 *  (docs/api/line.md), with no code in js/core/ that knows about any of it:
 *    slots        crust, sauce and the cut are picks of named values; the dips repeat
 *                 (a pick per dip, Done after the first)
 *    paging       the cut has six values (three and a More… row); the dips nine (past eight,
 *                 so the More… row pages again), with Done kept on the screen
 *    when         basil only on a Margherita (by recipe); garlic only on a deep dish (by slot)
 *    auto         the dough spin and the box: flourishes with no answer
 *    cook words   the oven asks "How crispy?" and its Timed button is "Pull It Out"; the
 *                 warmer runs by itself in Simple (simple: 'auto'), has its own speeds, and its
 *                 stage is the recipe's `heat` slot (want)
 *    counts       parmesan shakes: an Add with a max above 1 of something that does not cook
 *    gross-outs   a hair on an Add; a skin on the sauce, a pick of three plus Swap It
 *  It lives under tests/, so it is never published or downloaded with the game.
 *  docs/backup/tests/packs/test-pizza/old-model.js is this pack before the new model (no longer loaded).
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {})['test-pizza'] = data;
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'test-pizza',
  version: 3,
  name: 'Test Pizzeria',

  /* ── stages: each set names its words, and may name its own speeds ─────── */
  stageSets: {
    bake: { stages: ['raw', 'light', 'golden', 'crispy', 'burnt'], choose: ['light', 'golden', 'crispy'],
      ask: 'How crispy?', stop: 'Pull It Out', speed: { verySlow: 12, slow: 8, normal: 5 }, wantedScale: 2 },
    // Simple warms the knots by itself, to what the ticket says; Timed stops the warmer.
    warm: { stages: ['cold', 'warm', 'hot', 'scorched'], choose: ['warm', 'hot'], simple: 'auto',
      ask: 'How hot?', stop: 'Stop the Warmer', speed: { verySlow: 14, slow: 9, normal: 6 }, wantedScale: 3 },
  },
  stageNames: { raw: 'Raw', light: 'Light', golden: 'Golden', crispy: 'Crispy', burnt: 'Burnt',
    cold: 'Cold', warm: 'Warm', hot: 'Hot', scorched: 'Scorched' },
  cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },
  wantedScale: 2,
  sizeSets: {},

  ingredients: {
    pizza:      { name: 'Pizza', look: { shape: 'plate' } },
    dough:      { name: 'Dough', look: { shape: 'disc', colour: 0xf3dfa8 } },
    mozzarella: { name: 'Mozzarella', look: { shape: 'slice', colour: 0xfff6dc } },
    pepperoni:  { name: 'Pepperoni', look: { shape: 'chips', colour: 0xb02a1a } },
    peppers:    { name: 'Peppers', look: { shape: 'rings', colour: 0x3aa043 } },
    basil:      { name: 'Basil', look: { shape: 'leaf', colour: 0x2f8a2a } },
    garlic:     { name: 'Garlic Clove', plural: 'Garlic Cloves', look: { shape: 'chips', colour: 0xf5efe0 } },
    knots:      { name: 'Garlic Knots', look: { shape: 'heap', colour: 0xe8c27a } },
    butter:     { name: 'Garlic Butter', look: { shape: 'sauce', colour: 0xf2d35b } },
    parmesan:   { name: 'Parmesan Shake', plural: 'Parmesan Shakes', look: { shape: 'sprinkle', colour: 0xfff3c4 } },
  },

  /* ── slots: the picks, their values and how the ticket says them ────────── */
  slots: {
    crust: { name: 'Crust', say: '{value} crust', values: [
      { id: 'thin', name: 'Thin' }, { id: 'regular', name: 'Regular' }, { id: 'deepDish', name: 'Deep Dish' }] },
    // "None" says itself on the ticket (the slot's say would make it "none sauce").
    sauce: { name: 'Sauce', say: '{value} sauce', values: [
      { id: 'red', name: 'Red' }, { id: 'white', name: 'White' }, { id: 'bare', name: 'None', say: 'sauce: none' }] },
    cut: { name: 'Cut', say: 'cut in {value}', values: [
      { id: 'c4', name: '4' }, { id: 'c6', name: '6' }, { id: 'c8', name: '8' }, { id: 'c10', name: '10' },
      { id: 'c12', name: '12' }, { id: 'whole', name: 'Uncut', say: 'left whole' }] },
    // A repeat is named for one pick ("Dip"), so the ticket can say "two ranch dips".
    dips: { name: 'Dip', plural: 'Dips', values: [
      { id: 'ranch', name: 'Ranch' }, { id: 'garlicDip', name: 'Garlic' }, { id: 'marinara', name: 'Marinara' },
      { id: 'honey', name: 'Honey' }, { id: 'bbq', name: 'Barbecue' }, { id: 'pesto', name: 'Pesto' },
      { id: 'buffalo', name: 'Buffalo' }, { id: 'chipotle', name: 'Chipotle' }, { id: 'tahini', name: 'Tahini' }] },
  },

  /* ── stations ───────────────────────────────────────────────────────────── */
  stations: {
    prep: {
      name: 'Prep Table', backdrop: 'prep', redo: 'Redo the Pizza', builds: { on: 'pizza', base: 'dough' },
      steps: [
        { kind: 'pick', slot: 'crust' },
        { kind: 'pick', slot: 'sauce' },
        { kind: 'add', ing: 'mozzarella' },
        { kind: 'add', ing: 'pepperoni' },
        { kind: 'add', ing: 'peppers' },
        { kind: 'add', ing: 'basil', when: { recipes: ['margherita'] } },
        { kind: 'add', ing: 'garlic', max: 3, when: { slot: 'crust', in: ['deepDish'] } },
        { kind: 'auto', id: 'spin', show: 'doughSpin' },
      ],
    },
    oven: { name: 'Oven', backdrop: 'oven', redo: 'Bake Again', tool: 'peel', steps: [{ kind: 'cook', stages: 'bake' }] },
    cutter: {
      name: 'Cutting Board', backdrop: 'prep', redo: 'Cut Again',
      steps: [{ kind: 'pick', slot: 'cut' }, { kind: 'auto', id: 'box', show: 'boxUp' }],
    },
    warmer: {
      name: 'Warmer', backdrop: 'oven', redo: 'Redo the Knots', tool: 'dial',
      steps: [
        { kind: 'add', ing: 'butter' },
        { kind: 'add', ing: 'parmesan', max: 3 },
        { kind: 'cook', stages: 'warm', want: 'heat' },
        { kind: 'pick', slot: 'dips', repeat: { max: 3 } },
      ],
    },
  },

  /* ── recipes ────────────────────────────────────────────────────────────── */
  // A slot is a fixed value, { pick } (pack.picks, or the slot's own values when no pick of
  // that name is listed: the cut), or { pick, count: [lo, hi] } for a repeat.
  picks: {
    bake:  { values: ['light', 'golden', 'crispy'], normal: 'golden' },
    crust: { values: ['thin', 'regular', 'deepDish'], normal: 'regular' },
    sauce: { values: ['red', 'white', 'bare'], normal: 'red' },
    heat:  { values: ['warm', 'hot'], normal: 'warm' },
    dip:   { values: ['ranch', 'garlicDip', 'marinara'], normal: 'ranch',
      fancy: ['ranch', 'garlicDip', 'marinara', 'honey', 'bbq', 'pesto', 'buffalo', 'chipotle', 'tahini'] },
  },
  recipes: {
    margherita: {
      name: 'Margherita', plural: 'Margheritas', price: 8, level: 1, stations: ['prep', 'oven', 'cutter'],
      item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: { pick: 'crust' }, sauce: 'red', cut: { pick: 'cut' } },
        parts: [{ ing: 'mozzarella' }, { ing: 'basil', opt: 'in' }] },
    },
    pepperoni: {
      name: 'Pepperoni Pizza', plural: 'Pepperoni Pizzas', price: 9, level: 1, stations: ['prep', 'oven', 'cutter'],
      item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, cut: { pick: 'cut' } },
        parts: [{ ing: 'mozzarella' }, { ing: 'pepperoni' }, { ing: 'peppers', opt: 'out' }] },
    },
    chicago: {
      name: 'Chicago Deep Dish', plural: 'Chicago Deep Dishes', price: 11, level: 2, stations: ['prep', 'oven', 'cutter'],
      item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: 'deepDish', sauce: { pick: 'sauce' }, cut: 'c8' },
        parts: [{ ing: 'mozzarella' }, { ing: 'pepperoni', opt: 'in' }, { ing: 'garlic' }, { ing: 'garlic' }] },
    },
    knots: {
      name: 'Garlic Knots', plural: 'Garlic Knots', price: 4, level: 2, stations: ['warmer'],
      item: { ing: 'knots', slots: { heat: { pick: 'heat' }, dips: { pick: 'dip', count: [1, 3] } },
        parts: [{ ing: 'butter', opt: 'in' }, { ing: 'parmesan' }, { ing: 'parmesan' }] },
    },
  },
  orderStyles: {
    simple: { items: [1, 1], change: 0.2, maxOptional: 1 },
    usual:  { items: [1, 2], change: 0.3, more: 0.25 },
    fancy:  { items: [1, 3], change: 0.5, more: 0.5, fancy: true },
  },

  /* ── gross-outs: on an Add step, or on a pick of three or fewer values ──── */
  gross: [
    { id: 'hair', on: ['mozzarella', 'basil'], say: '{name} with a hair on it', fx: { hair: true } },
    { id: 'skin', step: 'pick', slot: 'sauce', on: ['red', 'white'], say: '{name} sauce with a skin on it', fx: { tint: 0x8a4a2a } },
  ],
  grossRate: 0.5,
  grossMax: 1,

  /* ── people ─────────────────────────────────────────────────────────────── */
  manager: { id: 'mitch', name: 'Mitch', art: 'mitch' },
  poses: {
    customer: { arrive: 'neutral', order: 'talking', stars3: 'happy', stars2: 'annoyed', stars1: 'angry', gross: 'disgusted' },
    manager: { idle: 'neutral', talk: 'talking' },
  },
  regulars: [
    { id: 'nonna', name: 'Nonna', art: 'nonna', likes: [['margherita', 3]],
      usual: [{ recipe: 'margherita', set: { crust: 'thin', bake: 'crispy', cut: 'c8' } }] },
    { id: 'rocco', name: 'Rocco', art: 'rocco', likes: [['pepperoni', 3], ['knots', 1]], exact: true,
      favourite: { recipe: 'pepperoni', bonus: 1 } },
    { id: 'bruno', name: 'Bruno', art: 'bruno', likes: [['knots', 3], ['chicago', 2]], twin: true, set: { dip: 'marinara' } },
    { id: 'gina', name: 'Gina', art: 'gina', likes: [['chicago', 2], ['knots', 2]], dislikes: ['pepperoni'] },
  ],
  // The tutorial's order has the skin on its red sauce, a gross-out on a pick.
  tutorial: {
    customer: 'nonna',
    items: [{ recipe: 'pepperoni', set: { crust: 'thin', sauce: 'red', bake: 'golden', cut: 'c8' } }],
    gross: { item: 0, slot: 'sauce', event: 'skin' },
  },
});
