/** Ben's Cafe - the restaurant, as data (docs/api/pack-format.md; in words: docs/api/packs/cafe.md).
 *
 *  A cozy coffee and donut shop with a giant pink donut on the roof and a hissing espresso machine
 *  (FOODCOURT-BUILD.md 5.3, BENS-FOOD-COURT "Ben's Cafe"). The engine (js/core) reads this and nothing else; the
 *  food is js/food/cafe.js (food-cafe), the lines are packs/cafe/script.js, who everyone IS is packs/cast/cast.js.
 *
 *  Two lines, on two backdrops:
 *    coffeeBar (Coffee Bar, coffee)   Size Small/Medium/Large -> Drink Drip/Latte/Cappuccino/Hot Chocolate
 *                                      -> the pour (coffee only: Simple asks "How strong?" Mild, Smooth or Bold and
 *                                         pours to it; Timed: Stop the Pour at Mild, Smooth or Bold; left on, it stops
 *                                         at Burnt). The strength is the player's choice either way (2026-11-11)
 *                                      -> Milk Whole/Oat/Skim (latte, cappuccino, hot chocolate) -> latte art (a flourish)
 *                                      -> Add or Skip: cream (drip), extra shot (coffee), vanilla, caramel,
 *                                         sugar (drip, up to two), whipped cream -> the lid (drip, hot chocolate; a
 *                                         flourish): every drink gets one flourish, the art or the lid
 *    dough (Dough Board, donuts)       Dough Classic/Chocolate/Jelly-Filled
 *    fryer (Fryer, donuts)             Simple: How golden? Golden / Dark Golden. Timed: Lift the Basket (one stop;
 *                                      left in, it stops at Burnt)
 *    glaze (Glaze Bar, donuts)         Glaze Sugar/Chocolate/Strawberry/None -> the dunk (a flourish) -> Add or Skip:
 *                                      sprinkles, coconut, nuts
 *  A coffee and a donut together from level 3 (courses drink, donut). Every recipe takes the same presses for every
 *  customer: a drip coffee 9 or 10 with Serve, a latte or cappuccino 8, a hot chocolate 7, a donut 7.
 *
 *  Changes to the brief, each said in docs/api/packs/cafe.md 2:
 *    - Milk is Whole/Oat/Skim, a pick of three, on the drinks that are made with milk (latte, cappuccino, hot
 *      chocolate). A drip coffee takes cream (an Add) instead of a fourth "None" value, so spoiled milk can sit on the
 *      milk pick (spec 4.6: only on a pick of three values or fewer; its own example is "Oat milk, spoiled") and black
 *      coffee is still a drip with no cream.
 *    - The pour is the espresso machine for every coffee (drip, latte, cappuccino); a hot chocolate is not poured.
 *
 *  Plain data only: no functions, no Math.random. Ids match /^\w+$/.
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBPacks = root.BBPacks || {}).cafe = data;
})(typeof window === 'undefined' ? globalThis : window, {
  id: 'cafe',
  version: 1,
  name: "Ben's Cafe",
  format: 3,                      // packs/cafe/script.js covers every moment (content-cafe, 2026-11-09)

  help: "Ben's Cafe. Coffee starts at the coffee bar: pick the cup size, then the drink. The machine pours the coffee: " +
    'in Simple, pick its strength: Mild, Smooth or Bold, as the ticket says; in Timed, watch it pour and Stop the Pour ' +
    'at the strength on the ticket. A latte, a cappuccino or a hot chocolate then gets its milk: Whole, Oat or Skim. Then ' +
    'Add or Skip each extra as it comes down the line: cream for a drip coffee, an extra shot, vanilla, caramel, ' +
    'sugar for a drip coffee, and whipped cream. Donuts start at the dough board: pick the dough. Then the fryer: in ' +
    'Simple, pick Golden or Dark Golden; in Timed, Lift the Basket at the stage on the ticket. Last, the glaze bar: ' +
    "pick the glaze, then Add or Skip sprinkles, coconut and nuts. The ticket lists everything: add what's on it, " +
    "skip what isn't. If something looks wrong, Swap It brings a fresh one.",

  /* ── colours (spec 5.6): warm brown and cream. Contrast worked out in docs/api/packs/cafe.md 14: every colour the
     highlight sits on is at least 3:1 against #ffd400, every text colour at least 4.5:1 on what it sits on. ── */
  theme: {
    pageBg: '#2b170d',                 // behind everything (loading, fades): espresso
    panelTop: '#7a4a2b',               // the line's control panel: coffee brown (the highlight sits on it, 5.2:1)
    panelBottom: '#55321c',
    panelLip: '#2e1a0e',
    plateTop: '#fff8ec',               // the fryer's doneness plates: cream enamel, ink words
    plateBottom: '#efdcc0',
    mark: '#5a3218',                   // the fried-donut mark on a plate
    labelBg: 'rgba(43,23,13,.9)',      // white words on a prop's label
    ticketAccent: '#8a3a1a',           // the customer's name on the ticket (on paper): cinnamon
    ticketNow: '#fbe7cc',              // the item being made, on the ticket (ink words): latte cream
    perforation: '#d6bb98',
    hudBg: 'rgba(43,23,13,.86)',       // white words
    gaugeBg: 'rgba(30,16,8,.92)',      // the Timed gauge: white words, the highlight marks the stage now
    star: '#c47a08',                   // amber stars: 3:1 on the receipt's paper, the board and its glow
    boardGlow: '#4a2c1a',              // menu boards: a dark roast board in a cream frame
    woodInset: '#2e1a0e',
    cardValue: '#ffe2b0',
    logoTop: '#ffe9c9',
    logoMain: '#fff8ec',
    wheelInk: '#1e130c',
    wheelSteel: '#e3d8ca',
    wheelDark: '#7a4a2b',              // the ticket wheel's spokes, coffee brown
    board: '#3a2416',
    wood: '#e8d2ae',                   // the boards' frame: cream, like the awning's stripes
  },
  courses: ['drink', 'donut'],    // a two-item order (level 3 up) is a drink and a donut, or Gus's two of one thing
  levels: {},                     // the engine's ladder unchanged (pack-format.md 12); put only what differs here

  manager: { id: 'mitch', art: 'mitch-cafe' },    // barista apron, beanie, and a cup with his name spelled MICH

  /* ── cooking ────────────────────────────────────────────────────────────── */
  // The pour: the espresso machine runs the coffee into the cup, and the longer it runs the stronger it gets, until
  // it is burnt (Timed's last stage). In Simple the player picks the strength (How strong? Mild, Smooth or Bold) and
  // the machine pours to it, as the fryer's Golden / Dark Golden (it was simple: 'auto' until the 2026-11-11 playtest:
  // the ticket said a strength the player never chose).
  // The fryer: the donut goes in on the basket; Golden or Dark Golden; left in, it stops at Burnt.
  stageSets: {
    pour: { stages: ['empty', 'mild', 'smooth', 'bold', 'burnt'], choose: ['mild', 'smooth', 'bold'],
      ask: 'How strong?', stop: 'Stop the Pour' },
    fry: { stages: ['raw', 'golden', 'darkGolden', 'burnt'], choose: ['golden', 'darkGolden'],
      ask: 'How golden?', stop: 'Lift the Basket' },
  },
  stageNames: { empty: 'Empty', mild: 'Mild', smooth: 'Smooth', bold: 'Bold', burnt: 'Burnt',
    raw: 'Raw', golden: 'Golden', darkGolden: 'Dark Golden' },
  cookSpeeds: { verySlow: 12, slow: 8, normal: 5 },   // the Burger Bar's grill: seconds a stage
  wantedScale: 2,                                     // the ticket's stage lasts twice as long

  /* ── what goes on (looks: docs/api/packs/cafe.md 10 has the table food-cafe draws from) ── */
  ingredients: {
    // The coffee bar builds every drink in a paper cup (the vessel). The drink itself is the item: coffee (poured,
    // its ramp the strength) or hot chocolate. Kai never orders a coffee: he dislikes it, and it is the item itself.
    cup:       { name: 'Cup', plural: 'Cups', look: { shape: 'paperCup', colour: 0xfff8ec } },
    coffee:    { name: 'Coffee', plural: 'Coffees',
      look: { shape: 'coffeeFill', ramp: { empty: 0xf3ece2, mild: 0xb7814f, smooth: 0x7c4a26, bold: 0x4a2914, burnt: 0x1d120b } } },
    cocoa:     { name: 'Hot Chocolate', plural: 'Hot Chocolates', look: { shape: 'cocoaFill', colour: 0x6b3b22 } },
    cream:     { name: 'Cream', look: { shape: 'creamSwirl', colour: 0xfff4e2 } },
    shot:      { name: 'Extra Shot', plural: 'Extra Shots', look: { shape: 'espressoShot', colour: 0x3b200f } },
    vanilla:   { name: 'Vanilla', look: { shape: 'syrupPump', colour: 0xf3dc8a } },
    caramel:   { name: 'Caramel', look: { shape: 'syrupPump', colour: 0xc77a2a } },
    sugar:     { name: 'Sugar', plural: 'Sugars', look: { shape: 'sugarCube', colour: 0xffffff } },
    whip:      { name: 'Whipped Cream', look: { shape: 'whippedCream', colour: 0xfffdf7 } },
    // The donut: the item itself (fried), then what goes on it at the glaze bar.
    donut:     { name: 'Donut', plural: 'Donuts',
      look: { shape: 'donutBody', ramp: { raw: 0xf1dfb8, golden: 0xd99f4f, darkGolden: 0xa8642b, burnt: 0x3a2214 } } },
    sprinkles: { name: 'Sprinkles', look: { shape: 'sprinkles', colours: [0xff5a8a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xffffff] } },
    coconut:   { name: 'Coconut', look: { shape: 'coconutFlakes', colour: 0xfffaf0 } },
    nuts:      { name: 'Nuts', look: { shape: 'choppedNuts', colour: 0xc08a4e } },
  },

  /* ── named picks ────────────────────────────────────────────────────────── */
  // The ticket never says "no X": the None glaze says itself ("glaze: none").
  slots: {
    size: { name: 'Size', say: '{value} cup', values: [
      { id: 'smallCup', name: 'Small', look: { shape: 'cupSize', scale: 0.82 } },
      { id: 'mediumCup', name: 'Medium', look: { shape: 'cupSize', scale: 1 } },
      { id: 'largeCup', name: 'Large', look: { shape: 'cupSize', scale: 1.2 } }] },
    drink: { name: 'Drink', say: '{value}', values: [
      { id: 'drip', name: 'Drip', look: { shape: 'drinkBase', colour: 0x5a3219 } },
      { id: 'latte', name: 'Latte', look: { shape: 'drinkBase', colour: 0xc9a27a } },
      { id: 'cappuccino', name: 'Cappuccino', look: { shape: 'drinkBase', colour: 0xb88c62, foam: true } },
      { id: 'hotChocolate', name: 'Hot Chocolate', look: { shape: 'drinkBase', colour: 0x6b3b22 } }] },
    milk: { name: 'Milk', values: [
      { id: 'whole', name: 'Whole', look: { shape: 'milkJug', colour: 0xd8302c } },
      { id: 'oat', name: 'Oat', look: { shape: 'milkJug', colour: 0xe0962a } },
      { id: 'skim', name: 'Skim', look: { shape: 'milkJug', colour: 0x2f7fd0 } }] },
    dough: { name: 'Dough', say: '{value} dough', values: [
      { id: 'classic', name: 'Classic', look: { shape: 'doughRing', colour: 0xf3e2bd } },
      { id: 'chocolate', name: 'Chocolate', look: { shape: 'doughRing', colour: 0x7a4a2c } },
      { id: 'jelly', name: 'Jelly-Filled', look: { shape: 'doughBall', colour: 0xf3e2bd, jam: 0xc8283c } }] },
    glaze: { name: 'Glaze', say: '{value} glaze', values: [
      { id: 'sugar', name: 'Sugar', look: { shape: 'glaze', colour: 0xfbf6ec } },
      { id: 'chocolate', name: 'Chocolate', look: { shape: 'glaze', colour: 0x4e2a17 } },
      { id: 'strawberry', name: 'Strawberry', look: { shape: 'glaze', colour: 0xf58fb4 } },
      { id: 'noGlaze', name: 'None', say: 'glaze: none', look: { shape: 'bareDonut' } }] },
  },

  /* ── stations ───────────────────────────────────────────────────────────── */
  stations: {
    coffeeBar: {
      name: 'Coffee Bar', backdrop: 'coffee', redo: 'Redo the Drink', builds: { on: 'cup' }, tool: 'espressoLever',
      sounds: { cook: 'pour', done: 'hiss', auto: 'hiss' },   // auto: the steam wand for the art, the machine's puff for the lid
      // Every drink gets one flourish: a latte or a cappuccino its latte art after the milk, a drip or a hot chocolate
      // its lid at the end.
      steps: [
        { kind: 'pick', slot: 'size' },
        { kind: 'pick', slot: 'drink' },
        { kind: 'cook', stages: 'pour', want: 'strength', when: { slot: 'drink', in: ['drip', 'latte', 'cappuccino'] } },
        { kind: 'pick', slot: 'milk', when: { slot: 'drink', in: ['latte', 'cappuccino', 'hotChocolate'] } },
        { kind: 'auto', id: 'art', show: 'latteArt', when: { slot: 'drink', in: ['latte', 'cappuccino'] } },   // a heart in the foam
        { kind: 'add', ing: 'cream', when: { slot: 'drink', in: ['drip'] } },
        { kind: 'add', ing: 'shot', when: { slot: 'drink', in: ['drip', 'latte', 'cappuccino'] } },
        { kind: 'add', ing: 'vanilla' },
        { kind: 'add', ing: 'caramel' },
        { kind: 'add', ing: 'sugar', max: 2, when: { slot: 'drink', in: ['drip'] } },
        { kind: 'add', ing: 'whip' },
        { kind: 'auto', id: 'lid', show: 'lidOn', when: { slot: 'drink', in: ['drip', 'hotChocolate'] } },   // the lid snaps on
      ],
    },
    dough: {
      name: 'Dough Board', backdrop: 'donuts', redo: 'Redo the Dough',
      steps: [{ kind: 'pick', slot: 'dough' }],
    },
    fryer: {
      name: 'Fryer', backdrop: 'donuts', redo: 'Fry Again', tool: 'fryerBasket', sounds: { cook: 'fryer' },
      steps: [{ kind: 'cook', stages: 'fry', want: 'fry' }],
    },
    glaze: {
      name: 'Glaze Bar', backdrop: 'donuts', redo: 'Redo the Glaze', sounds: { auto: 'dip' },
      steps: [
        { kind: 'pick', slot: 'glaze' },
        { kind: 'auto', id: 'dunk', show: 'glazeDunk', when: { slot: 'glaze', in: ['sugar', 'chocolate', 'strawberry'] } },
        { kind: 'add', ing: 'sprinkles' },
        { kind: 'add', ing: 'coconut' },
        { kind: 'add', ing: 'nuts' },
      ],
    },
  },

  /* ── how orders choose values (level 5 uses the fancy lists) ───────────── */
  picks: {
    size:     { values: ['smallCup', 'mediumCup', 'largeCup'], normal: 'mediumCup' },   // ids, not 'medium': js/core quotes that word
    strength: { values: ['mild', 'smooth', 'bold'], normal: 'smooth' },
    milk:     { values: ['whole', 'oat', 'skim'], normal: 'whole' },
    dough:    { values: ['classic', 'chocolate', 'jelly'], normal: 'classic' },
    fry:      { values: ['golden', 'darkGolden'], normal: 'golden' },
    glaze:    { values: ['sugar', 'chocolate', 'strawberry'], normal: 'sugar', fancy: ['sugar', 'chocolate', 'strawberry', 'noGlaze'] },
  },

  /* ── the menu (spec 4.3): level is the only gate ───────────────────────── */
  // Every coffee names its size, its drink and its strength (the pour's want); a milk drink its milk. Every donut names
  // its dough, how fried and its glaze. opt 'in' parts can be held ("no cream"), opt 'out' parts added ("add
  // vanilla"). Sugar counts are fixed per recipe (a held second sugar would be said "no sugars"). Recipe looks name
  // the layout the food draws the item with.
  recipes: {
    // ── drinks, at the coffee bar ──
    coffee: {                                       // "coffee, cream and two sugars": Marge's usual, as written
      name: 'Coffee', plural: 'Coffees', price: 4, level: 1, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'drip', strength: { pick: 'strength' } },
        parts: [{ ing: 'cream', opt: 'in' }, { ing: 'sugar' }, { ing: 'sugar' }, { ing: 'vanilla', opt: 'out' }] },
    },
    blackCoffee: {
      name: 'Black Coffee', plural: 'Black Coffees', price: 3, level: 1, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'drip', strength: { pick: 'strength' } },
        parts: [{ ing: 'shot', opt: 'out' }] },
    },
    latte: {
      name: 'Latte', plural: 'Lattes', price: 5, level: 1, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'latte', strength: { pick: 'strength' }, milk: { pick: 'milk' } },
        parts: [{ ing: 'vanilla', opt: 'out' }, { ing: 'caramel', opt: 'out' }, { ing: 'whip', opt: 'out' }] },
    },
    hotChocolate: {
      name: 'Hot Chocolate', plural: 'Hot Chocolates', price: 4, level: 2, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'cocoa', slots: { size: { pick: 'size' }, drink: 'hotChocolate', milk: { pick: 'milk' } },
        parts: [{ ing: 'whip', opt: 'in' }, { ing: 'caramel', opt: 'out' }, { ing: 'vanilla', opt: 'out' }] },
    },
    cappuccino: {
      name: 'Cappuccino', plural: 'Cappuccinos', price: 5, level: 2, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'cappuccino', strength: { pick: 'strength' }, milk: { pick: 'milk' } },
        parts: [{ ing: 'shot', opt: 'out' }, { ing: 'caramel', opt: 'out' }] },
    },
    vanillaLatte: {
      name: 'Vanilla Latte', plural: 'Vanilla Lattes', price: 6, level: 2, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'latte', strength: { pick: 'strength' }, milk: { pick: 'milk' } },
        parts: [{ ing: 'vanilla' }, { ing: 'whip', opt: 'out' }] },
    },
    redEye: {                                       // drip with a shot of espresso in it: Priya's usual
      name: 'Red Eye', plural: 'Red Eyes', price: 5, level: 2, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'drip', strength: { pick: 'strength' } },
        parts: [{ ing: 'shot' }, { ing: 'cream', opt: 'out' }] },
    },
    wakeUpCall: {                                   // the house special: everything a cappuccino can have
      name: 'Wake-Up Call', plural: 'Wake-Up Calls', price: 7, level: 3, course: 'drink', look: { shape: 'coffeeCup' },
      stations: ['coffeeBar'],
      item: { ing: 'coffee', slots: { size: { pick: 'size' }, drink: 'cappuccino', strength: { pick: 'strength' }, milk: { pick: 'milk' } },
        parts: [{ ing: 'shot' }, { ing: 'vanilla', opt: 'in' }, { ing: 'caramel' }, { ing: 'whip', opt: 'in' }] },
    },
    // ── donuts: dough board, fryer, glaze bar ──
    glazedDonut: {
      name: 'Glazed Donut', plural: 'Glazed Donuts', price: 3, level: 1, course: 'donut', look: { shape: 'donut' },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: { pick: 'dough' }, fry: { pick: 'fry' }, glaze: 'sugar' },
        parts: [{ ing: 'sprinkles', opt: 'out' }, { ing: 'nuts', opt: 'out' }] },
    },
    sprinkleDonut: {                                // the one on the roof: pink glaze, sprinkles
      name: 'Sprinkle Donut', plural: 'Sprinkle Donuts', price: 3, level: 1, course: 'donut', look: { shape: 'donut' },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: { pick: 'dough' }, fry: { pick: 'fry' }, glaze: 'strawberry' },
        parts: [{ ing: 'sprinkles' }, { ing: 'coconut', opt: 'out' }] },
    },
    chocolateDonut: {
      name: 'Double Chocolate Donut', plural: 'Double Chocolate Donuts', price: 4, level: 2, course: 'donut', look: { shape: 'donut' },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: 'chocolate', fry: { pick: 'fry' }, glaze: 'chocolate' },
        parts: [{ ing: 'nuts', opt: 'in' }, { ing: 'sprinkles', opt: 'out' }] },
    },
    jellyDonut: {
      name: 'Jelly Donut', plural: 'Jelly Donuts', price: 4, level: 2, course: 'donut', look: { shape: 'donut' },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: 'jelly', fry: { pick: 'fry' }, glaze: { pick: 'glaze' } },
        parts: [{ ing: 'coconut', opt: 'out' }] },
    },
    everythingDonut: {
      name: 'Everything Donut', plural: 'Everything Donuts', price: 5, level: 3, course: 'donut', look: { shape: 'donut' },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: { pick: 'dough' }, fry: { pick: 'fry' }, glaze: { pick: 'glaze' } },
        parts: [{ ing: 'sprinkles' }, { ing: 'coconut', opt: 'in' }, { ing: 'nuts', opt: 'in' }] },
    },
    // The five-star event's giant: the donut off the roof, made on the normal line, drawn 1.6 times bigger. Its size is
    // its look, never a slot value (that would add a choice to every donut).
    giantDonut: {
      name: 'Giant Donut', plural: 'Giant Donuts', price: 15, level: 'event', course: 'donut', look: { shape: 'donut', giant: true },
      stations: ['dough', 'fryer', 'glaze'],
      item: { ing: 'donut', slots: { dough: 'classic', fry: { pick: 'fry' }, glaze: 'strawberry' },
        parts: [{ ing: 'sprinkles' }] },
    },
  },

  /* ── gross-outs (spec 4.6): the label names it, Swap It brings a fresh one ── */
  // Two sit on picks of three values (with Swap It, four answers): the stale dough and the spoiled milk (spec 4.6's own
  // example, "Oat milk, spoiled"). The fly sits on the sprinkles' Add. Burnt coffee and a burnt donut are not here:
  // each is its stage set's last stage, in Timed only.
  gross: [
    { id: 'stale', step: 'pick', slot: 'dough', on: ['classic', 'chocolate', 'jelly'], say: '{name} dough, stale',
      fx: { tint: 0xa59d8a, spots: { colour: 0x6b6252, n: 8 }, smoke: 0xd8d0bf } },   // grey, cracked, a puff of dust
    { id: 'spoiled', step: 'pick', slot: 'milk', on: ['whole', 'oat', 'skim'], say: '{name} milk, spoiled',
      fx: { tint: 0xd9dc9c, spots: { colour: 0xb7bd72, n: 6 }, stink: true } },         // lumpy, green-tinged, stink lines
    { id: 'fly', on: ['sprinkles'], say: '{name} with a fly in them', fx: { fly: true } },   // game.js plays the buzz for 'fly'
  ],

  /* ── people (spec 2.2, 2.3, 5.4): what each orders here; who they are is the cast's ── */
  regulars: [
    // "Coffee, cream and two sugars": the Coffee as written is exactly that.
    { id: 'marge', likes: [['coffee', 3]], usual: [{ recipe: 'coffee', set: { size: 'mediumCup', strength: 'smooth' } }] },
    // Two of one thing where the level allows two items (his cast twin); "a dozen donuts" is said (order.twin).
    { id: 'gus', likes: [['coffee', 2], ['glazedDonut', 2], ['blackCoffee', 1]] },
    // Black coffee, bold. No cream, no sugar, no excuses.
    { id: 'bev', likes: [['blackCoffee', 3], ['redEye', 1]], favourite: { recipe: 'blackCoffee', bonus: 2 }, set: { strength: 'bold' } },
    // An oat latte. "Extra hot" is said, never made: the line has no temperature.
    { id: 'vernon', likes: [['latte', 3], ['vanillaLatte', 1], ['cappuccino', 1]], set: { milk: 'oat' } },
    // Plain coffee, black; a glazed donut is the one thing in the mall that isn't trying too hard.
    { id: 'sal', likes: [['blackCoffee', 3], ['glazedDonut', 2]], favourite: { recipe: 'glazedDonut', bonus: 2 } },
    // The night-shift nurse, the Cafe's most loyal regular: the usual is a large, bold Red Eye (from level 2, when it
    // is on the menu); before that, whatever is large and bold.
    { id: 'priya', likes: [['redEye', 3], ['blackCoffee', 2], ['glazedDonut', 1]], set: { size: 'largeCup', strength: 'bold' },
      usual: [{ recipe: 'redEye', set: { size: 'largeCup', strength: 'bold' } }], favourite: { recipe: 'redEye', bonus: 2 } },
    // The local: far too much coffee already. Everything bold, never whipped cream (it slows the caffeine down).
    { id: 'jitters', likes: [['redEye', 3], ['wakeUpCall', 3], ['cappuccino', 2], ['latte', 1]], dislikes: ['whip'],
      set: { strength: 'bold' } },
    // Special visitors from level 4, one a shift, never first: the critic, his ten-year-old fan (who is not allowed
    // coffee: he never orders a drink whose item is coffee), and a cameo (spec 2.2): Grandpa Walt from the Ice Cream
    // Emporium, here for a small black coffee and a plain donut, like 1955.
    { id: 'reginald', likes: [['wakeUpCall', 2], ['everythingDonut', 2]], visitor: { level: 4 } },
    { id: 'kai', likes: [['hotChocolate', 3], ['sprinkleDonut', 3], ['chocolateDonut', 2]], dislikes: ['coffee'], visitor: { level: 4 } },
    { id: 'walt', likes: [['blackCoffee', 3], ['glazedDonut', 3]], set: { size: 'smallCup' }, visitor: { level: 4 } },
  ],

  /* ── the tutorial: one guided order through every station, with a gross-out to Swap ── */
  // Jitters's large, bold latte with an extra shot (coffee bar) and a sprinkle donut (dough board, fryer, glaze bar);
  // the whole milk comes down spoiled, so Swap It is taught once, on a pick.
  tutorial: {
    customer: 'jitters',
    items: [
      { recipe: 'latte', set: { size: 'largeCup', strength: 'bold', milk: 'whole' }, add: ['shot'] },
      { recipe: 'sprinkleDonut', set: { dough: 'classic', fry: 'golden' } },
    ],
    gross: { item: 0, slot: 'milk', event: 'spoiled' },
  },

  /* ── ridiculous orders (level 4+, at most one a shift): said in order.odd.<id>; the ticket stays plain ── */
  oddOrders: [
    // "Half decaf, half extra caffeine." There is no decaf on this line: a black coffee with an extra shot.
    { id: 'halfDecaf', recipe: 'blackCoffee', adds: ['shot'], say: 'order.odd.halfDecaf' },
    // "A donut with a coffee inside it." Said; the ticket is a jelly donut, as written.
    { id: 'coffeeDonut', recipe: 'jellyDonut', say: 'order.odd.coffeeDonut' },
    // "A latte with seven extra shots." Jitters only; one extra shot is what the line can make.
    { id: 'sevenShots', recipe: 'latte', adds: ['shot'], set: { size: 'largeCup', strength: 'bold' }, who: ['jitters'],
      say: 'order.odd.sevenShots' },
    // "Everything on the bar, in a large." A large, bold cappuccino with every extra (dislikes still held).
    { id: 'everythingCup', level: 5, recipe: 'cappuccino', adds: ['shot', 'vanilla', 'caramel', 'whip'], set: { strength: 'bold' },
      picks: { size: 'largeCup' }, say: 'order.odd.everythingCup' },
  ],

  /* ── the five-star event (spec 4.4): the Morning Rush, the office building next door, spoken of, never shown ── */
  // Shift Length orders at level-4 complexity from the regulars and visitors; the last is always Jitters, who works
  // there, with the giant donut off the roof for the whole office and his own large, bold Red Eye.
  events: {
    five: {
      name: 'The Morning Rush',
      customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'priya', 'reginald', 'kai', 'walt'],
      finale: { customer: 'jitters', items: [
        { recipe: 'giantDonut', set: { fry: 'golden' } },
        { recipe: 'redEye', set: { size: 'largeCup', strength: 'bold' } },
      ] },
    },
  },
  // The counter picture's painted queue (the yawning office worker, the student, the man with the corgi) is measured
  // in its art manifest, BBArt.cafe.counter (tools/build_art.py): 59.9-82.2% across, heads 55%, feet 76%.
});
