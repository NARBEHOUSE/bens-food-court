# Phase 2a report: pizza-pack (2026-11-08)

I built Ben's Pizza Parlor as a pack and wrote its hand-off note. All pizza checks pass. The one failing test in the suite comes from the diner lane's change, not the pizza (see Requests). I went against the task text in one place: toppings are one Add/Skip step each, not "a repeat pick with Done" (reasons below).

## What I built

- `packs/pizza/pack.js` (new). Passes the schema with nothing reported.
- `docs/api/packs/pizza.md` (new). It mirrors the structure of `docs/api/packs/diner.md`. Section 10 is food-pizza's table of every look; section 12 lists every script moment and who must say it.
- I made no script stub, because no test needs one. Both files are new, so nothing needed a backup.

## The pack, in brief

**The line**
- **Prep Table** (prep backdrop): crust pick (Thin/Regular/Deep Dish), then an automatic dough-toss flourish (`doughToss`), then sauce pick (Red/White/None, which the ticket writes "sauce: none"). Then Add or Skip, one at a time: cheese, pepperoni, sausage, mushrooms, peppers, onions, olives, pineapple.
- **Oven**: stage set `bake` (raw → light → golden → crispy → burnt). Simple asks "How baked?" with Light/Golden/Crispy. Timed shows one **Pull It Out** button; burnt is Timed's last stage. Speeds are the diner's (12/8/5 s, wanted stage ×2). Tool is `peel`; sounds are `{ cook: 'oven', done: 'peel' }`.
- **Cutting Board** (prep backdrop): "Slices: 4, 6 or 8?" Sound `{ done: 'cut' }`.
- **Knot Basket** (prep backdrop), for garlic knots: they bake in the oven first, then Add garlic butter, Add parmesan, and pick a dip (Marinara/Ranch/Pesto).
- Every pick has 3 values, so no screen ever pages.

**Recipes by level**

| Level | Adds |
|---|---|
| 1 | Cheese Pizza, Pepperoni Pizza |
| 2 | Veggie Pizza, Meat Lover's Pizza, Hawaiian Pizza, Garlic Knots (the side) |
| 3 | Everything Pizza (every topping, so Oakes and Tony hold their dislikes); combos (a pizza and knots) start |
| event | Heart-Shaped Pizza (`level: 'event'`, look `heartPizza`, `giant: true`) |

**Odd orders**
- Level 4: `justCrust` (cheese held, no sauce), `halfAndHalf` ("half pineapple and anchovies" is said; the ticket gets both toppings on the whole pizza; never Tony), `heartShaped` (said; the ticket is a round pizza).
- Level 5: `allTheWay` (Everything Pizza, deep dish, crispy, 4 slices).

**The event, The Pizza Party**: the wedding guests come from the drawn cast. The finale is always Pam's heart pizza plus garlic knots.

**People**
- marge: her usual is a plain cheese pizza.
- gus: likes pepperoni and Meat Lover's; his cast twin trait gives two of one thing from level 3, and "two larges" is said.
- bev: Meat Lover's is her favourite.
- vernon: always thin crust, light, 8 slices.
- sal: pepperoni is his favourite; no lettuce here, so no dislike.
- oakes: dislikes onions. tony: dislikes pineapple, so never a Hawaiian.
- pam: her "for twelve" is a spoken gag, never made.
- Visitors from level 4: reginald and kai, plus one cameo, **Breeze** (the Smoothie Shack's surfer, who loves the Hawaiian, a running joke against Tony). His voice passes the strict cast checks.

**Gross-outs** (all on Add steps): `hair` on the cheese, `mouldy` on the mushrooms, `fly` on the pepperoni. The id `fly` is what game.js keys its buzz sound on.

**Tutorial**: Tony orders a pepperoni pizza and garlic knots, which goes through every station. The fly on the pepperoni teaches Swap It.

**Theme**: all 24 tokens in red and white. I computed the contrast:
- The highlight `#ffd400` is 5.44:1 or better on every colour it sits on (3:1 needed).
- All text is 6.43:1 or better (4.5:1 needed).
- Stars are 3.17:1 or better on the receipt's paper and the red boards.

These figures assume each token keeps the job it has in the diner.

**Recipe looks** tell food-pizza which layout to draw: `pizza`, `heartPizza` or `knotBasket`.

## Press counts (Serve included; Simple and Timed are the same)

| Recipe | Levels | Presses |
|---|---|---|
| Cheese, Pepperoni | 1–5 | 13 |
| Veggie, Meat Lover's, Hawaiian | 2–5 | 13 |
| Garlic Knots | 2–5 | 5 |
| Everything | 3–5 | 13 |
| Heart (finale, with knots) | event | 17 |

- Level 1 is 13, inside the budget of 14.
- Worst whole order at levels 3–5 and the event: 26 (Gus's two pizzas plus a Swap It), inside 28.
- A pizza with knots is 17, every odd order 13, the tutorial 18.

## Tests run (from the game folder)

| Command | Result |
|---|---|
| Schema validate (`node -e …`) | `[]` |
| `BB_PACKS=pizza node --test "tests/*.test.cjs"` | 212 tests: 202 pass, **1 fail (the diner's, below)**, 3 skipped, 6 todo |
| `node --test "tests/*.test.cjs"` (all packs) | 226 tests: 216 pass, 1 fail (the same one), 3 skipped, 6 todo |
| `node --test tests/cast.test.cjs tests/voices.test.cjs` | 38/38 pass, including the cameo |
| `pressReport('pizza')` | the table above |

- All 7 pizza checks in `pack.test.cjs` pass: schema, at most 4 answers on every screen with 3 stars in Simple and Timed, the press budget, the same presses for every customer, tickets list everything, and whole shifts plus the event and the tutorial.
- An earlier full run, before diner-pack's change, had 0 failures.
- I also ran my own simulation: 300 shifts at each level and the event. No customer ever got something they dislike, visitors were never first, odd orders came only at levels 4–5, and the heart finale came last 300 times out of 300.
- **The 6 todo** need `js/food/pizza.js` (food-pizza).
- **The 3 skipped**: the pizza script check waits for `format: 3`, and the cast and court scripts aren't written yet.
- I didn't run the jsdom driver; `index.html` doesn't load the pizza yet.

## Going against the task text

I made the toppings one Add/Skip step each, following spec 5.3, the proposal and DESIGN.md ("the ingredients come to him"), instead of a repeat pick. A repeat pick can't do things the same task asks for:
- It can't carry a gross-out, and the fly on the pepperoni and the mouldy mushrooms sit on toppings.
- Dislikes only work on ingredients, so Oakes's onions and Tony's pineapple couldn't be held.
- It needs at least one pick, so there could be no plain cheese pizza.
- Its 7 values would page behind More….

The press budget holds without it. The diner made the same choice for its toppings. I didn't follow the hub rulebook against the spec anywhere.

## Not done

- `format: 3` and the lines: pizza-script (265 coverage items, listed in section 12 of pizza.md).
- The food module: food-pizza.

## Requests

- **core-b / integrate**: `tests/script.test.cjs:138` asserts that the live diner has no event moments. diner-pack just added `events.five` to `packs/diner/pack.js`, so that assertion now fails. It needs updating; it isn't caused by the pizza.
- **integrate / page**:
  - Load `packs/pizza/pack.js`, `packs/pizza/script.js` and `js/food/pizza.js`.
  - Draw the `peel` as the oven's Timed control.
  - Play the `doughToss` flourish event after the crust pick.
  - Keep each theme token on the diner's surface, since my contrast figures assume it.
- **pizza-script**: "I said {want} {slot}" reads "I said none sauce" for a None sauce. Write pick complaints that work for every slot, e.g. "The ticket said {slot}: {want}."

Files are in `C:/Users/ass/OneDrive/BEN'S SOFTWARE/Documents/Python Projects/Benny's PC Hub/bennyshub/apps/games/BENSFOODCOURT/`:
- `packs/pizza/pack.js`
- `docs/api/packs/pizza.md`
