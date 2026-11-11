/** Ben's Pizza Parlor - the restaurant, as data (docs/api/pack-format.md; in words: docs/api/packs/pizza.md).
 *
 *  A red-and-white checkered pizzeria with a brick oven (FOODCOURT-BUILD.md 5.3, BENS-FOOD-COURT "Ben's Pizza
 *  Parlor"). The engine (js/core) reads this and nothing else; the food is js/food/pizza.js (food-pizza), the
 *  lines are packs/pizza/script.js (pizza-script), who everyone IS is packs/cast/cast.js.
 *
 *  The line, every pizza the same 12 presses in Simple (Serve makes 13):
 *    prep (Prep Table)        crust Thin/Regular/Deep Dish -> (the dough toss, a flourish) -> sauce Red/White/None
 *                             -> Add or Skip: cheese, then each topping as it comes down the line (pepperoni,
 *                             sausage, mushrooms, peppers, onions, olives, pineapple)
 *    oven (Oven)              Simple: How baked? Light / Golden / Crispy. Timed: watch it bake and Pull It Out
 *                             (left in, it stops at Burnt: burnt crust is Timed's last stage, never a gross-out)
 *    cut (Cutting Board)      Slices: 4, 6 or 8 (on the prep backdrop)
 *  Garlic knots (a side, from level 2): the oven (bake), then the knot basket: Add or Skip garlic butter and
 *  parmesan, then the dip, Marinara / Ranch / Pesto. 4 presses (Serve makes 5).
 *
 *  The toppings are Add or Skip steps, one at a time, as the proposal and DESIGN.md have it ("the ingredients come
 *  to him"): that is where the gross-outs sit (the fly on the pepperoni, the mouldy mushrooms, the hair in the
 *  cheese), and where Oakes's onions and Tony's pineapple are held. A pizza takes the same presses whatever is on it.
 *
 *  Plain data only: no functions, no Math.random. Ids match /^\w+$/.
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {}).pizza = data;
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'pizza',
  version: 1,
  name: "Ben's Pizza Parlor",
  format: 3,                      // packs/pizza/script.js covers every moment (pizza-script, 2026-11-08)

  help: "Ben's Pizza Parlor. Every pizza starts at the prep table: pick the crust, then the sauce, then Add or Skip " +
    'the cheese and each topping as it comes down the line. Then the oven: in Simple, pick how baked it is, Light, ' +
    'Golden or Crispy; in Timed, watch it bake and Pull It Out when it reaches the stage on the ticket. Last, the ' +
    'cutting board: pick how many slices. Garlic knots bake in the same oven, then get their garlic butter, parmesan ' +
    "and dip at the knot basket. The ticket lists everything: add what's on it, skip what isn't. If something looks " +
    'wrong, Swap It brings a fresh one.',

  /* ── colours (spec 5.6): pizza red and white. Contrast worked out in docs/api/packs/pizza.md: every colour the
     highlight sits on is at least 3:1 against #ffd400, every text colour at least 4.5:1 on what it sits on. ── */
  theme: {
    pageBg: '#4a0d10',                 // behind everything (loading, fades): deep tomato red
    panelTop: '#a3171c',               // the line's control panel: pizza-box red (the highlight sits on it)
    panelBottom: '#6e0d12',
    panelLip: '#3a0609',
    plateTop: '#fffaf0',               // the oven's doneness plates: white enamel, ink words
    plateBottom: '#efdfc6',
    mark: '#6b3a22',                   // the baked-crust mark on a plate
    labelBg: 'rgba(58,8,10,.9)',       // white words on a prop's label
    ticketAccent: '#a3121a',           // the customer's name on the ticket (on paper)
    ticketNow: '#ffe2d6',              // the item being made, on the ticket (ink words)
    perforation: '#d9b0a8',
    hudBg: 'rgba(74,10,14,.86)',       // white words
    gaugeBg: 'rgba(48,6,8,.92)',       // the Timed gauge: white words, the highlight marks the stage now
    star: '#c97c00',                   // amber stars: 3:1 on the receipt's paper and on the red board and its glow
    boardGlow: '#741518',              // menu boards: a red board in a white frame
    woodInset: '#3a0609',
    cardValue: '#ffe7a3',
    logoTop: '#fff1d6',
    logoMain: '#fffaf0',
    wheelInk: '#1b120e',
    wheelSteel: '#dfe4e8',
    wheelDark: '#a3171c',              // the ticket wheel's spokes, painted red
    board: '#5c1014',
    wood: '#f4ecdc',                   // the boards' frame: white, so every card is red and white
  },
  courses: ['main', 'side'],      // a two-item order (level 3 up) is a pizza and garlic knots, or Gus's two of one thing
  levels: {},                     // the engine's ladder unchanged (pack-format.md 12); put only what differs here

  manager: { id: 'mitch', art: 'mitch-pizza' },   // the flour-dusted apron and pizza-box hat

  /* ── cooking ────────────────────────────────────────────────────────────── */
  // The oven bakes the whole item (a pizza, or the knots). Timed food left in stops at Burnt, its last stage.
  stageSets: {
    bake: { stages: ['raw', 'light', 'golden', 'crispy', 'burnt'], choose: ['light', 'golden', 'crispy'],
      ask: 'How baked?', stop: 'Pull It Out' },
  },
  stageNames: { raw: 'Raw', light: 'Light', golden: 'Golden', crispy: 'Crispy', burnt: 'Burnt' },
  cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },   // the Burger Bar's grill: seconds a stage
  wantedScale: 2,                                     // the ticket's stage lasts twice as long

  /* ── what goes on (looks: docs/api/packs/pizza.md has the table food-pizza draws from) ── */
  ingredients: {
    // The item: what the prep table builds on. Its ramp is the crust's colour at each stage (the oven dial's swatches).
    pizza:        { name: 'Pizza', plural: 'Pizzas',
      look: { shape: 'pizzaPan', ramp: { raw: 0xf3e2b8, light: 0xf0cf8a, golden: 0xdba352, crispy: 0xb06a2c, burnt: 0x3d2416 } } },
    cheese:       { name: 'Cheese', look: { shape: 'mozzarella', colour: 0xfff4d6 } },
    pepperoni:    { name: 'Pepperoni', look: { shape: 'pepperoni', colour: 0xb3261e } },
    sausage:      { name: 'Sausage', look: { shape: 'sausage', colour: 0x8a4b2c } },
    mushrooms:    { name: 'Mushrooms', look: { shape: 'mushrooms', colour: 0xd8c3a5 } },
    peppers:      { name: 'Peppers', look: { shape: 'greenPeppers', colour: 0x3f9e3a } },
    onions:       { name: 'Onions', look: { shape: 'redOnions', colour: 0xb05a9a } },
    olives:       { name: 'Olives', look: { shape: 'blackOlives', colour: 0x2b2b30 } },
    pineapple:    { name: 'Pineapple', look: { shape: 'pineapple', colour: 0xf6d34a } },
    // The garlic knots: the item itself (baked in the oven), then what goes on them at the knot basket.
    knots:        { name: 'Garlic Knots', plural: 'Garlic Knots',
      look: { shape: 'garlicKnots', colour: 0xf2dfb2, ramp: { raw: 0xf4e4bf, light: 0xf1d08c, golden: 0xdda04e, crispy: 0xb36a2a, burnt: 0x3f2617 } } },
    garlicButter: { name: 'Garlic Butter', look: { shape: 'garlicButter', colour: 0xf2cf4f } },
    parmesan:     { name: 'Parmesan', look: { shape: 'parmesan', colour: 0xfff6dc } },
  },

  /* ── named picks ────────────────────────────────────────────────────────── */
  // The ticket never says "no X": the None sauce says itself ("sauce: none").
  slots: {
    crust: { name: 'Crust', say: '{value} crust', values: [
      { id: 'thin', name: 'Thin', look: { shape: 'thinCrust', colour: 0xf3e2b8 } },
      { id: 'regular', name: 'Regular', look: { shape: 'regularCrust', colour: 0xf3e2b8 } },
      { id: 'deepDish', name: 'Deep Dish', look: { shape: 'deepDishCrust', colour: 0xf3e2b8 } }] },
    sauce: { name: 'Sauce', say: '{value} sauce', values: [
      { id: 'red', name: 'Red', look: { shape: 'pizzaSauce', colour: 0xc8321f } },
      { id: 'white', name: 'White', look: { shape: 'pizzaSauce', colour: 0xf7efdc } },
      { id: 'noSauce', name: 'None', say: 'sauce: none', look: { shape: 'bareDough', colour: 0xfbf3df } }] },
    slices: { name: 'Slices', say: '{value} slices', values: [
      { id: 'four', name: '4', look: { shape: 'pizzaCut', slices: 4 } },
      { id: 'six', name: '6', look: { shape: 'pizzaCut', slices: 6 } },
      { id: 'eight', name: '8', look: { shape: 'pizzaCut', slices: 8 } }] },
    dip: { name: 'Dip', say: '{value} dip', values: [
      { id: 'marinara', name: 'Marinara', look: { shape: 'dipCup', colour: 0xb8301f } },
      { id: 'ranch', name: 'Ranch', look: { shape: 'dipCup', colour: 0xf4f1e6 } },
      { id: 'pesto', name: 'Pesto', look: { shape: 'dipCup', colour: 0x5f8f2e } }] },
  },

  /* ── stations ───────────────────────────────────────────────────────────── */
  stations: {
    prep: {
      name: 'Prep Table', backdrop: 'prep', redo: 'Redo the Pizza', builds: { on: 'pizza' },
      steps: [
        { kind: 'pick', slot: 'crust' },
        { kind: 'auto', id: 'toss', show: 'doughToss' },       // the dough spins up and lands as the crust picked
        { kind: 'pick', slot: 'sauce' },
        { kind: 'add', ing: 'cheese' },
        { kind: 'add', ing: 'pepperoni' },
        { kind: 'add', ing: 'sausage' },
        { kind: 'add', ing: 'mushrooms' },
        { kind: 'add', ing: 'peppers' },
        { kind: 'add', ing: 'onions' },
        { kind: 'add', ing: 'olives' },
        { kind: 'add', ing: 'pineapple' },
      ],
    },
    oven: {
      name: 'Oven', backdrop: 'oven', redo: 'Bake Again', tool: 'peel', sounds: { cook: 'oven', done: 'peel' },
      steps: [{ kind: 'cook', stages: 'bake' }],
    },
    cut: {
      name: 'Cutting Board', backdrop: 'prep', redo: 'Cut Again', sounds: { done: 'cut' },
      steps: [{ kind: 'pick', slot: 'slices' }],
    },
    knotBasket: {
      name: 'Knot Basket', backdrop: 'prep', redo: 'Redo the Knots',
      steps: [
        { kind: 'add', ing: 'garlicButter' },
        { kind: 'add', ing: 'parmesan' },
        { kind: 'pick', slot: 'dip' },
      ],
    },
  },

  /* ── how orders choose values (level 5 uses the fancy lists) ───────────── */
  picks: {
    crust:  { values: ['thin', 'regular', 'deepDish'], normal: 'regular' },
    sauce:  { values: ['red', 'white'], normal: 'red', fancy: ['red', 'white', 'noSauce'] },
    bake:   { values: ['light', 'golden', 'crispy'], normal: 'golden' },
    slices: { values: ['four', 'six', 'eight'], normal: 'eight' },
    dip:    { values: ['marinara', 'ranch'], normal: 'marinara', fancy: ['marinara', 'ranch', 'pesto'] },
  },

  /* ── the menu (spec 4.3): level is the only gate ───────────────────────── */
  // Every pizza names every slot its line picks and its bake; opt 'in' parts can be held ("no onions"),
  // opt 'out' parts can be added ("add mushrooms"). Recipe looks name the layout the food draws the item with.
  recipes: {
    cheesePizza: {
      name: 'Cheese Pizza', plural: 'Cheese Pizzas', price: 8, level: 1, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'mushrooms', opt: 'out' }, { ing: 'olives', opt: 'out' }] },
    },
    pepperoniPizza: {
      name: 'Pepperoni Pizza', plural: 'Pepperoni Pizzas', price: 9, level: 1, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'pepperoni' }, { ing: 'mushrooms', opt: 'out' }, { ing: 'peppers', opt: 'out' },
          { ing: 'onions', opt: 'out' }] },
    },
    veggiePizza: {
      name: 'Veggie Pizza', plural: 'Veggie Pizzas', price: 10, level: 2, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'mushrooms' }, { ing: 'peppers' }, { ing: 'onions', opt: 'in' }, { ing: 'olives', opt: 'in' }] },
    },
    meatLovers: {
      name: "Meat Lover's Pizza", plural: "Meat Lover's Pizzas", price: 11, level: 2, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'pepperoni' }, { ing: 'sausage' }, { ing: 'onions', opt: 'out' }] },
    },
    hawaiian: {
      name: 'Hawaiian Pizza', plural: 'Hawaiian Pizzas', price: 10, level: 2, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'pepperoni', opt: 'in' }, { ing: 'pineapple' }] },
    },
    garlicKnots: {
      name: 'Garlic Knots', plural: 'Baskets of Garlic Knots', price: 4, level: 2, course: 'side', look: { shape: 'knotBasket' },
      stations: ['oven', 'knotBasket'],
      item: { ing: 'knots', done: { pick: 'bake' }, slots: { dip: { pick: 'dip' } },
        parts: [{ ing: 'garlicButter', opt: 'in' }, { ing: 'parmesan', opt: 'in' }] },
    },
    // Every topping on the line, pineapple included, so Tony holds it (and Oakes holds the onions).
    everythingPizza: {
      name: 'Everything Pizza', plural: 'Everything Pizzas', price: 13, level: 3, course: 'main', look: { shape: 'pizza' },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' },
        slots: { crust: { pick: 'crust' }, sauce: { pick: 'sauce' }, slices: { pick: 'slices' } },
        parts: [{ ing: 'cheese' }, { ing: 'pepperoni' }, { ing: 'sausage' }, { ing: 'mushrooms', opt: 'in' }, { ing: 'peppers', opt: 'in' },
          { ing: 'onions', opt: 'in' }, { ing: 'olives', opt: 'in' }, { ing: 'pineapple', opt: 'in' }] },
    },
    // The five-star event's giant: made on the normal line, drawn heart-shaped and 1.6 times bigger. The heart is
    // its look, never a slot value (that would add a choice to every pizza).
    heartPizza: {
      name: 'Heart-Shaped Pizza', plural: 'Heart-Shaped Pizzas', price: 24, level: 'event', course: 'main',
      look: { shape: 'heartPizza', giant: true },
      stations: ['prep', 'oven', 'cut'],
      item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: 'regular', sauce: 'red', slices: 'eight' },
        parts: [{ ing: 'cheese' }, { ing: 'pepperoni' }] },
    },
  },

  /* ── gross-outs (spec 4.6): each on an Add step; the label names it, Swap It brings a fresh one ── */
  // Burnt crust is not here: it is the bake set's last stage, in Timed only.
  gross: [
    { id: 'hair', on: ['cheese'], say: '{name} with a hair in it', fx: { hair: true } },
    { id: 'mouldy', on: ['mushrooms'], say: 'the mouldy {name}', fx: { spots: { colour: 0x6d8c3a, n: 9 }, tint: 0x9c9670, stink: true } },
    { id: 'fly', on: ['pepperoni'], say: '{name} with a fly on it', fx: { fly: true } },   // game.js plays the buzz for 'fly'
  ],

  /* ── people (spec 2.2, 2.3, 5.4): what each orders here; who they are is the cast's ── */
  regulars: [
    // "The usual, hon": a plain cheese pizza.
    { id: 'marge', likes: [['cheesePizza', 3]],
      usual: [{ recipe: 'cheesePizza', set: { crust: 'regular', sauce: 'red', bake: 'golden', slices: 'eight' } }] },
    // Two of one thing where the level allows two items (his cast twin); "two larges" is said, pizza has no size.
    { id: 'gus', likes: [['pepperoniPizza', 2], ['meatLovers', 2]] },
    { id: 'bev', likes: [['meatLovers', 3]], favourite: { recipe: 'meatLovers', bonus: 2 } },
    // Exact: thin crust, light, cut in eight. "I will know."
    { id: 'vernon', likes: [['cheesePizza', 2]], set: { crust: 'thin', bake: 'light', slices: 'eight' } },
    // Pepperoni, his favourite after bacon. No lettuce here, so no dislike to hold.
    { id: 'sal', likes: [['pepperoniPizza', 3]], favourite: { recipe: 'pepperoniPizza', bonus: 2 } },
    // A new reason to hate onions: held wherever they come as an option (veggie, everything), never added.
    { id: 'oakes', likes: [['veggiePizza', 2], ['everythingPizza', 1]], dislikes: ['onions'] },
    // The locals. Tony, the pizza purist, never orders a pizza that has to come with pineapple.
    { id: 'tony', likes: [['cheesePizza', 3], ['pepperoniPizza', 2]], dislikes: ['pineapple'] },
    // The birthday-party mom: "for twelve" is said (her order.gag), never made.
    { id: 'pam', likes: [['cheesePizza', 2], ['pepperoniPizza', 2], ['garlicKnots', 2]] },
    // Special visitors from level 4, one a shift, never first: the critic, his ten-year-old fan, and a cameo
    // (spec 2.2): Breeze from the Smoothie Shack, here for the pineapple.
    { id: 'reginald', likes: [['everythingPizza', 2]], visitor: { level: 4 } },
    { id: 'kai', likes: [['pepperoniPizza', 2], ['cheesePizza', 1]], visitor: { level: 4 } },
    { id: 'breeze', likes: [['hawaiian', 3]], visitor: { level: 4 } },
  ],

  /* ── the tutorial: one guided order through every station, with a gross-out to Swap ── */
  // Tony's pepperoni pizza (prep, oven, cut) and garlic knots (oven, knot basket); the pepperoni comes down the line
  // with a fly on it.
  tutorial: {
    customer: 'tony',
    items: [
      { recipe: 'pepperoniPizza', set: { crust: 'regular', sauce: 'red', bake: 'golden', slices: 'eight' } },
      { recipe: 'garlicKnots', set: { bake: 'golden', dip: 'marinara' } },
    ],
    gross: { item: 0, ing: 'pepperoni', event: 'fly' },
  },

  /* ── ridiculous orders (level 4+, at most one a shift): said in order.odd.<id>; the ticket stays plain ── */
  oddOrders: [
    // "Just the crust, no pizza." A cheese pizza with nothing on it at all.
    { id: 'justCrust', recipe: 'cheesePizza', holds: ['cheese'], picks: { sauce: 'noSauce' }, say: 'order.odd.justCrust' },
    // "Half pepperoni, half pineapple and anchovies." No halves and no anchovies on this line: the whole pizza gets
    // both toppings. Never Tony.
    { id: 'halfAndHalf', recipe: 'pepperoniPizza', adds: ['pineapple'], who: ['marge', 'gus', 'bev', 'vernon', 'sal', 'oakes', 'pam'],
      say: 'order.odd.halfAndHalf' },
    // "Heart-shaped, I'm proposing tonight." Only the event's giant is a heart: here it is said, and the ticket is a
    // round pepperoni pizza in eight slices.
    { id: 'heartShaped', recipe: 'pepperoniPizza', picks: { slices: 'eight' }, say: 'order.odd.heartShaped' },
    // "Everything, all the way: deep dish, crispy, cut in four." The Everything Pizza, as deep and as crisp as it goes.
    { id: 'allTheWay', level: 5, recipe: 'everythingPizza', set: { bake: 'crispy' }, picks: { crust: 'deepDish', slices: 'four' },
      say: 'order.odd.allTheWay' },
  ],

  /* ── the five-star event (spec 4.4): a wedding party, spoken of, never shown ── */
  // Shift Length orders at level-4 complexity from the guests; the last is always Pam's heart for the bride and groom.
  events: {
    five: {
      name: 'The Pizza Party',
      customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'oakes', 'tony', 'reginald', 'kai'],
      finale: { customer: 'pam', items: [
        { recipe: 'heartPizza', set: { bake: 'golden' } },
        { recipe: 'garlicKnots', set: { bake: 'golden', dip: 'marinara' } },
      ] },
    },
  },
});
