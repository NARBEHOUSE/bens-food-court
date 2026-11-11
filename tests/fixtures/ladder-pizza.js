/** Test fixture (core-b): the test pizzeria (tests/packs/test-pizza) as a whole restaurant on the
 *  ladder, with real cast members. It has everything a finished pack has (docs/api/pack-format.md):
 *  levels, courses (pizza is a main, knots a side), ridiculous orders, the five-star event with an
 *  event-only giant recipe, a tutorial, visitors and locals, a theme, and no orderStyles, so the
 *  schema checks it in full. The shift, pack and script tests use it; it is never loaded by the game.
 */
'use strict';
const base = JSON.parse(JSON.stringify(require('../packs/test-pizza/pack.js')));

const pack = Object.assign(base, {
  id: 'ladderPizza',
  version: 1,
  name: 'Ladder Pizzeria',
  format: 3,
  help: 'Make each pizza the way the ticket says.',
  theme: { pageBg: '#7a1f1f', star: '#ffd75e' },
  courses: ['main', 'side'],
  manager: { id: 'mitch', art: 'mitch-pizza' },
  levels: {
    3: { more: 0.5 },
    5: { odd: 0.9 },
  },
  regulars: [
    { id: 'marge', likes: [['margherita', 3]], usual: [{ recipe: 'margherita', set: { crust: 'regular', bake: 'golden', cut: 'c8' } }] },
    { id: 'gus', likes: [['pepperoni', 2], ['chicago', 2]] },
    { id: 'bev', likes: [['chicago', 3], ['knots', 1]], favourite: { recipe: 'chicago', bonus: 2 } },
    { id: 'vernon', likes: [['margherita', 2]], set: { crust: 'thin', bake: 'light', cut: 'c10' } },
    { id: 'sal', likes: [['pepperoni', 3]], dislikes: ['peppers'] },
    { id: 'tony', likes: [['margherita', 3]], dislikes: ['pepperoni'] },
    { id: 'pam', likes: [['knots', 2], ['pepperoni', 1]] },
    { id: 'reginald', likes: [['chicago', 1]], visitor: { level: 4 } },
    { id: 'kai', likes: [['margherita', 1]], visitor: { level: 5 } },
  ],
  tutorial: {
    customer: 'marge',
    items: [{ recipe: 'pepperoni', set: { crust: 'thin', sauce: 'red', bake: 'golden', cut: 'c8' } }],
    gross: { item: 0, slot: 'sauce', event: 'skin' },
  },
  oddOrders: [
    { id: 'justCrust', recipe: 'margherita', holds: ['mozzarella', 'basil'], picks: { sauce: 'bare' }, say: 'order.odd.justCrust' },
    { id: 'deepEverything', level: 5, recipe: 'pepperoni', adds: ['peppers'], picks: { crust: 'deepDish' } },
    { id: 'salKnots', recipe: 'knots', who: ['sal'], picks: { dips: ['marinara', 'marinara', 'marinara'] } },
  ],
  events: {
    five: {
      name: 'The Test Party',
      customers: ['marge', 'gus', 'bev', 'vernon', 'sal', 'tony'],
      finale: { customer: 'pam', items: [{ recipe: 'party', set: { bake: 'golden' } }, { recipe: 'knots', set: { heat: 'hot', dip: 'ranch' } }] },
    },
  },
});
delete pack.orderStyles;
delete pack.grossRate;
delete pack.grossMax;
pack.recipes.margherita.course = 'main';
pack.recipes.pepperoni.course = 'main';
pack.recipes.chicago.course = 'main';
pack.recipes.knots.course = 'side';
// The event's giant item: a party pizza, made on the normal line.
pack.recipes.party = {
  name: 'Party Pizza', plural: 'Party Pizzas', price: 20, level: 'event', course: 'main', look: { giant: true }, stations: ['prep', 'oven', 'cutter'],
  item: { ing: 'pizza', done: { pick: 'bake' }, slots: { crust: 'deepDish', sauce: 'red', cut: 'c12' },
    parts: [{ ing: 'mozzarella' }, { ing: 'pepperoni' }, { ing: 'garlic' }, { ing: 'garlic' }, { ing: 'garlic' }] },
};

module.exports = pack;
