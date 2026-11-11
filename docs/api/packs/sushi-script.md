# Ben's Sushi, the script in words (content-sushi, phase 2b, 2026-11-09)

## Voicecut (phase 3, 2026-11-10): what changed in this script

The user approved cutting the voice script: no recordings exist, and every line is text to speech until a future
voice pass. **The tables and notes below describe the script before this cut where they mention `complain.extra`,
`.unasked`, `.missing`, `.tooMany`, `.tooFew`, `.done`, `.pick` or `.more`: those moments are gone.** Now:

- **Every customer's per-food complaint lines were deleted** (they were recorded once per value, per customer). A
  customer now says one of their own `complain` lines, which name no food and live in `packs/cast/script.js` (8 to 10
  each, locals too; their best old jokes kept, food-free). This pack keeps two 'customer' fallbacks for `complain`.
- **Mitch reads the mistake** (`mistake.extra`, `mistake.unasked`, `mistake.missing`, `mistake.done`, `mistake.pick`, `mistake.more`), one line each, from the ticket and so with
  no pronoun: "The ticket said no {ings}." / "Nobody ordered {ings}." / "The ticket said {ing}. That got left off." /
  "The ticket said {want}." / "The ticket said {wanted}.".
  After two readouts (one after a gross-out) he says `mistake.more`; the receipt still lists every mistake in text.
- **`complain.gross.*` lines have no blanks**: the salmon (smelly), the tuna (wink), "the rice" (hair); soggy already named the seaweed.
- **Tutorial warnings are listed only for what the tutorial order runs through** (`SC.varsFor`), and `nearly.1` no longer names the customer. `tutorial.warn.unasked.1` says "the ticket has no {ings}"; `tutorial.warn.pick` uses {wanted} ("The ticket says no rice.").
- The file is 302 lines now. `node tools/voice-clips.cjs sushi` lists its clips; the whole game's report is
  `docs/api/reports/3-voicecut.md`.

`packs/sushi/script.js` (`BBScripts.sushi`, `format: 3`; the pack says `format: 3` too), 333 lines. Format and
moments: `docs/api/script.md`; who must say what: `docs/api/packs/sushi.md` section 12. `SC.check` and `SC.coverage`
are both `[]`; `tests/script.test.cjs` runs them at `format: 3`.

## 1. Where each line lives

| Lines | File | Why |
|---|---|---|
| Mitch in his sushi uniform: the shift, the uniform, the tutorial at every station (prep, mat, board, soup, cook.mat), every warning, every gross-out, `nearly`, the one-liners, the Sushi Boat | `packs/sushi/script.js` | a pack's script holds Mitch's lines there |
| The 'customer' fallbacks for every F moment, the four odd orders | " | |
| The locals' full sets: Chef Hiro (43), Dennis (45) | " | locals have nothing in the cast script |
| The cameo's full set: Inferno (25), Ben's Burritos' hot-sauce fanatic, a level-4 visitor here | " | a cameo's lines live in the pack that brings him (pilot.md 5.2) |
| The regulars' and visitors' lines about the sushi: reactions, favourites, dislikes, odd orders, a few complaints, one or two greets each | " | greet, smalltalk and goodbye otherwise come from `packs/cast/script.js` |

## 2. Conventions (the same as the pizza's, plus three)

- Ids `<moment>.<n>`, unique per speaker; clip ids `<speaker>/sushi:<id>[.<value>]`.
- One varying blank per line, never at the start; `{slot}` rides with `{want}` in pick lines ("For the {slot}, I said
  {want}": "for the rice, I said none", "for the pieces, I said 8"). `{name}` only in `nearly.1` and the three event
  lines (few clips for the voice pass).
- A delivery note on every line. Greets are at most 15 words (the cast script's rule), `order.gag` at most 20 words
  (8 s or less).
- **The hair in the rice** is a gross-out on a pick: its lines use `{value}` with `each: 'value'` ("a hair in the
  {value} rice": "white rice", "brown rice"), never `{ing}`.
- **The soggy seaweed** sits on the roll pick, whose values read badly after "the soggy" ("hand roll"): its lines
  name the seaweed and use no blank.
- **`tutorial.warn.gross` and `.grossSkip`** use no blank (the cafe's choice), so they read for a pick or an Add.
- No `tutorial.warn.done` and no `tooMany`/`tooFew`: Simple never asks the mat, and no Add has a max above 1.

## 3. The people

- **Chef Hiro** (local; 43 lines). The stern master who comes in to judge: calm, low, exacting, quietly funny; the
  pauses are part of his lines. He judges the roll, the rice, his apprentice (now an accountant), himself, the lucky
  cat and Mitch's crooked headband, **never the person making it**. His `react.3.1` is the approval the spec asks for
  at the Sushi Boat: "[long pause] Hm. Yes." Running threads: forty years of sushi, satisfied twice (both times
  asleep); the loud man with a cart who asked for a hot dog roll (Sal); his visit to the burrito place (the burrito
  pack's cameo), which he admits only here. `order.gag` ×4 (also said after the Sushi Boat, the finale).
- **Dennis** (local; 45 lines). The nervous first-timer: polite, anxious, easily alarmed; a fork held like a shield and
  a little blue book, "Sushi for Beginners" (chapter three is chopsticks; he skipped to chapter nine, emergencies). It
  is always his first time, emotionally. His sister owes him five dollars. Nervous about the food, never about the
  service; his complaints come with an apology. `order.dislike` ×2 (eel sauce: "there's no eel in eel sauce? Then
  what IS it?"), `order.gag` ×4. He is the tutorial's customer, so Mitch's tutorial lines mention his book.
- **Inferno** (cameo visitor; 25 lines). Here for the spicy mayo; wants it hotter; his ears smoke. Chef Hiro judged his
  burrito place, and he returns the visit. No `order.gag` (a visitor here, not a local).
- **The regulars** (react ×3/×3/×3 each, plus): Marge's "nothing raw, hon" (`order.usual` ×2, `order.dislike` ×2);
  Gus's "two of every roll" (`order.twin` ×2: "Mitch said let's start with two"); Bev's spicy tuna (`react.favourite`
  ×2, and every reaction is a play call); **Vernon judges alongside Chef Hiro**: every one of his lines names Hiro
  ("I shall nod on his behalf"); **Sal asks for a hot dog roll** (his greets) and calls the imitation crab "the hot dog
  of the sea" (`react.favourite` ×2).
- **Reginald and Kai** (visitors): `visitor.arrive` ×3 each, reactions ×3 each, a complaint or two; both are drawn to
  Chef Hiro's nod (the cast script's mentions say the same).

## 4. Counts per speaker

| who | lines | greet | smalltalk | goodbye | react 3 / 2 / 1 | other |
|---|---|---|---|---|---|---|
| mitch | 71 | | | | | shift.start 4, shift.end 4, uniform 3, gross.* 3 each, nearly 2, after.3/1 3, after.gross 2, tutorial 2 each, warns 2 each, event 2 each |
| customer | 39 | | | | 3 / 3 / 3 | every F moment 2, every odd order 2 |
| hiro | 43 | 5 | 5 | 4 | 4 / 3 / 3 | order.gag 4, react.gross 2, odd orders 3, complaints 9 |
| dennis | 45 | 5 | 5 | 4 | 3 / 3 / 3 | order.gag 4, order.dislike 2, react.gross 2, odd orders 4, complaints 9 |
| inferno | 25 | 3 | 3 | 3 | 3 / 3 / 3 | visitor.arrive 3, react.gross 1, complaints 3 |
| marge | 19 | 1 | | | 3 / 3 / 3 | order.usual 2, order.dislike 2, odd 2, react.gross, 2 complaints |
| gus | 15 | 1 | | | 3 / 3 / 3 | order.twin 2, odd 1, react.gross, 1 complaint |
| bev | 15 | 1 | | | 3 / 3 / 3 | react.favourite 2, odd 1, react.gross, 1 complaint |
| vernon | 15 | 1 | | | 3 / 3 / 3 | odd 1, react.gross, 3 complaints |
| sal | 17 | 2 | | | 3 / 3 / 3 | react.favourite 2, odd 1, react.gross, 2 complaints |
| reginald | 15 | | | | 3 / 3 / 3 | visitor.arrive 3, react.gross, 2 complaints |
| kai | 14 | | | | 3 / 3 / 3 | visitor.arrive 3, react.gross, 1 complaint |

## 5. For the voice pass

Every line is text to speech until then. `{name}` lines: `mitch/sushi:nearly.1.<stage>.<customer>` and the three
event lines (`.theSushiBoat`). Hiro's `[long pause]` and `[pause]` tags are part of his delivery; Vernon's `[sigh]`
as at the other restaurants.
