# crowd-cast: the court's crowd stands in line and eats (2026-11-10)

The user: "maybe instead of having the characters bounce around in the food court view, just have them stand and wait
like they're in line- it should probably also show people sitting at chairs and eating as you get more popular and the
characters should be characters you'd be serving in the games themselves instead of random characters"

## What changed

- **Nobody strolls.** The passing shoppers, their stroll lines, the walking bob and the walkers are gone
  (`BBCourt.crowd` has no `passing`; `R.check` refuses a store that still has a `passing` list). The page's clock only
  guards the chatter caption now.
- **Lines and diners by popularity** (`BBCourt.crowd`): in line 1 / 1 / 1 / 2 / 2 / 3 / 3 / 4 / 4 / 4 / 4 and seated
  0 / 0 / 0 / 1 / 1 / 1 / 2 / 2 / 3 / 3 / all for popularity 0..10. Tiers unchanged.
- **Only the game's customers, each at most once** (`BB.courtRules.floor`, pure, in js/core/court.js): locals at home,
  regulars dealt out across the storefronts (fewest choices first, a stable hash seeded by the court's finished
  shifts), Reginald and Kai only where the level is 4+; cameo locals stay home. Round by round: queue 1, seat 1,
  queue 2, seat 2... More spots than people leave spots empty. With all seven open: 7 people at popularity 0, 20 at 3,
  all 22 from 7 (8 of them eating).
- **Poses**: front of the line `neutral`, the rest `waiting`, facing the front of their line; diners `eating` (head to
  hips, the fallback is `happy`).
- **Food on the tables**: each diner has one of that restaurant's dishes in front of them (`BBArt.court.food`).
- **Layout** (`BBCourt.layout`): new lines (top row along their stools, turning down at the fourth; side stalls
  stepping out; bottom stalls along the concourse) and seats that face the viewer only (the chair behind each table,
  plus the booth benches), each `[x, y, fx, fy]` with where the food goes. 20 seats.
- **Chatter**: the shoppers' 16 captions moved to the cast members they suit (15) and show over that character, with
  their name, while they are on the floor; chatter.2 (the scooter guard, who no longer passes) dropped. js/core/script.js:
  any customer may say `court.chatter`, nobody must.

## Art

- **EATING pose, 22 customers** (marge gus bev vernon sal dale priya oakes tasha reginald kai tony pam breeze brock
  jitters hiro dennis inferno rita lulu walt): `python art-source/jobs/write_prompts.py eating`, Astra jobs
  `eating-<id>` with the neutral as reference, raw takes in `art-source/cast-eating/`, copied to
  `art-source/cast/<id>/eating.png`, cut out by build_art on the CPU (`BB_CUTOUT=cpu`, new). Hiro eats with chopsticks,
  Lulu and Kai with spoons. Every head matched its neutral to within 4 px (top and width). Jitters and Dennis were
  refused by the image service's filter the first time ("self-harm", a fork to the mouth on the twitchy and the nervous
  one): redone with calmer words (`jobs/write_eating_retry.py`), fork held near the chin. Lulu's job could not save into
  the project: its generated file was copied in. All 22 checked by eye on model and over dark and red (no holes, the
  forks and white aprons intact).
- **Dishes, 21** (`node tools/food-frames.cjs <pack> courtfood`, new: the real food module on the CPU, everything but
  the counter's food hidden, a 42-degree camera from above, two keys, un-premultiplied): diner burger / burgerFries /
  rings, pizza pepperoni / veggie / knots, cafe latteDonut / cocoaDonut / coffeeSprinkles, smoothie strawberry /
  tropical / bowl, burrito burrito / tacos / bowl, sushi california / rainbow / rollSoup, icecream sundae / split /
  shake. `art-source/court-food/` -> `packs/court/art/food/` (build_art's new `food` kind, `BBArt.court.food`).

## Checks

- Node: 319/319 (tests/court.test.cjs: the crowd counts, no strolling, seats with food spots; the floor: only pool
  members, never a shopper, nobody twice at popularity 0-10 in three shapes of court, locals at home, visitors from
  level 4, stable, the `only` option).
- jsdom: 12/12 runs ok (every run whose name has "court", plus the page boots and the whole chain with all seven open:
  RUNS 0, 18, 19, 24, 28, 29, 34, 67, 75, 76, 85, 94), no script error. The crowd tiers: 7 / 20 (7 eating) / 22 (8) /
  22 (8) people at popularity 0 / 3 / 7 / 10.
- Frames: `art-source/review/crowd-cast/` (tiers incl. the new `-busy` pair, seven, moments), composed with guides.
  Nobody left out for a sign or the board in any frame.

## Left

- With all seven open the cast (22) fills well under half the 48 spots: lines of two and a diner or two each. Long
  lines and full tables show only while few restaurants are open.
- At Extra Large text the progress board (half the picture wide) stands in front of the middle tables' diners and
  the side lines' second person, as it already did.
- The shopper pictures and the `shopper` cast entries are still in the cast and art (unused on the court).
