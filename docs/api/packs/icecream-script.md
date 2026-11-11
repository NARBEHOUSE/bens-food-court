# Ben's Ice Cream Emporium, the script in words (content-icecream, 2026-11-10)

## Voicecut (phase 3, 2026-11-10): what changed in this script

The user approved cutting the voice script: no recordings exist, and every line is text to speech until a future
voice pass. **The tables and notes below describe the script before this cut where they mention `complain.extra`,
`.unasked`, `.missing`, `.tooMany`, `.tooFew`, `.done`, `.pick` or `.more`: those moments are gone.** Now:

- **Every customer's per-food complaint lines were deleted** (they were recorded once per value, per customer). A
  customer now says one of their own `complain` lines, which name no food and live in `packs/cast/script.js` (8 to 10
  each, locals too; their best old jokes kept, food-free). This pack keeps two 'customer' fallbacks for `complain`.
- **Mitch reads the mistake** (`mistake.extra`, `mistake.unasked`, `mistake.missing`, `mistake.tooMany`, `mistake.tooFew`, `mistake.done`, `mistake.pick`, `mistake.more`), one line each, from the ticket and so with
  no pronoun: "The ticket said no {ings}." / "Nobody ordered {ings}." / "The ticket said {ing}. That got left off." /
  "The ticket said {want}." / "The ticket said {wanted}." / "The ticket said {wanted}. We went over." (or "We came up short.").
  After two readouts (one after a gross-out) he says `mistake.more`; the receipt still lists every mistake in text.
- **`complain.gross.*` lines have no blanks**: the sprinkles (hair), the cherry (tomato), "this shake" (freezer burn).
- **Tutorial warnings are listed only for what the tutorial order runs through** (`SC.varsFor`), and `nearly.1` no longer names the customer. `tutorial.warn.pick` uses {wanted} ("Walt said a vanilla scoop."). **Vernon's "exactly one"** (for content-icecream, 2b report): `vernon/icecream:smalltalk.scoop`, "I take one scoop. Exactly one. The ticket may say otherwise. The ticket does not have a blog." It stays true when the level gives him two, and pays off his cast mention of the Emporium.
- The file is 324 lines now. `node tools/voice-clips.cjs icecream` lists its clips; the whole game's report is
  `docs/api/reports/3-voicecut.md`.

`packs/icecream/script.js` (`BBScripts.icecream`, 379 lines, every one with a `delivery` note). Format:
`docs/api/script.md`; who must say what: `docs/api/packs/icecream.md` section 12. The pack says `format: 3`, so
`tests/script.test.cjs` checks it.

**Check it** (from the game folder):

```
node -e "const B=require('./tests/bot.cjs'),SC=require('./js/core/script.js'),R=B.restaurants().find(r=>r.id==='icecream');console.log(B.schema.validate(R.pack),SC.check(R.pack,R.script),SC.coverage(R.pack,R.script))"
BB_PACKS=icecream node --test "tests/script.test.cjs" "tests/clips.test.cjs"
```

`[] [] []`. `SC.everyClip` lists 2026 clips for the Emporium (1842 from this file, every value of each changing
blank; the rest the cast's lines for its people), every blank filled except the cast's `{about}`.

## 1. What lives where

As the pizza (`pizza-script.md` 1): Mitch's lines in the soda-jerk uniform, the `'customer'` fallbacks, the locals'
full sets (Lulu, Walt), the cameo's full set (Brock), and every regular's and visitor's lines about the ice cream are
here; their greet, smalltalk, goodbye and mentions are the cast's (`packs/cast/script.js`), plus one
Emporium-flavoured `greet` each here for Marge, Gus, Bev, Vernon, Sal and Tasha.

## 2. Conventions (the pizza's, plus what the repeat pick needed)

- Ids `<moment>.<n>`; clip ids `<speaker>/icecream:<id>[.<value>]`.
- One varying blank per line, named in `each`; never at the start of a line or after a full stop (the fill is lower
  case). `{name}` only in `nearly.1` and the `event.*` lines.
- **Pick lines** say "for the {slot}, I said {want}" or "the ticket says {slot}: {want}". The slots read "holder",
  "scoop" and "flavour", so "for the holder, I said waffle cone", "for the scoop, I said mint chip", "for the flavour,
  I said chocolate". A scoop mistake on the repeat gives the first wanted value it missed.
- **Done lines** ({want}) read for a size and a thickness alike: "I said regular", "I said thick". None says "scoop" or
  "shake" next to the blank.
- **`complain.tooMany` / `tooFew` name the scoops outright** (no blank): the scoops are the only repeat and there is no
  Add with a max, so a count mistake is always a scoop count. The tutorial's `warn.tooMany`/`tooFew` say "two scoops"
  (Walt's sundae is two).
- **Gross-outs**: `hair` and `tomato` sit on Add steps ({ing}/{ings}: sprinkles, cherry); `freezerBurn` on the shake's
  flavour pick ({value}: vanilla, chocolate, strawberry; `each: 'value'`), never {ing}.
- **Reactions name "ice cream" or nothing**, so they stay true for a cone, a sundae, a banana split or a shake. Bev's
  `react.favourite` names the hot fudge sundae (it only plays on that recipe).
- **Odd orders** describe the request without contradicting the plain ticket: the ten scoops (three huge), the
  ketchup (strawberry, "it's red"), just the cherry (the scoops stay to hold it up), the malted (a thick chocolate
  shake). Lulu has only `justCherry` (her vanilla stays true); Sal has none (each would contradict him).

## 3. Who they are here

- **Little Lulu** (41 lines). Seven, agonises out loud, lands on vanilla every time: her greet sets up the agony
  ("seven flavours in my heart and only one mouth"), her five `order.gag` lines land it ("Vanilla. Final answer.
  Final final answer. Vanilla."); a lucky spoon, a list of pros and cons, a brother who picks in one second. Her
  complaints are earnest and never mean; every line stays true because her order is always vanilla.
- **Grandpa Walt** (46). 1955: Murray's soda fountain, a dime, a jukebox with one song, the knotted cherry stem under
  the glass dome on the toppings shelf ("I tied that in '55. With my tongue."), a letterman jacket that fits in the
  arms. The tutorial customer; his favourite is the hot fudge sundae; his own odd order is a malted. His lines at the
  Cafe (a cameo there) are different words: none repeats.
- **Brock** (29, the cameo). The Smoothie Shack's gym bro on his once-a-year cheat day; Kevin the shaker bottle stayed
  home; his mom texts "Brock." Notes say pumped or eager, never loud.
- **Mitch** (75). Striped shirt, clip-on bow tie (it fell in the fudge: a fudge tie), paper soda-jerk hat ("Jerk is
  the job title. I asked HR to change it."), the penguin with earmuffs, the Brain Freeze Safety Zone sign, the rubber
  duck. Event: the Little League team, the sink he has cleaned twice, Bev's participation medal.
- **The regulars**: Marge's vanilla in a cup (cones drip on the bus seats), Gus's two (one for Delores), Bev's sundae
  for the team (her `order.gag`, said at the Kitchen Sink finale: "Twelve kids, twelve spoons, one sink!"), Vernon
  reviewing the roundness of the scoops (never the count: the level decides it), Sal's chocolate and his cherry
  ("Fruit's rabbit food. I ain't a rabbit."), Tasha's deadpan. Reginald reviews the Emporium's name; Kai's reviews are
  one word.

## 4. Counts per speaker

| Speaker | Lines | Moments |
|---|---|---|
| mitch | 75 | shift.start 5, shift.end 4, uniform 3; every tutorial moment 2 (intro, ticket, scoop, cook.scoop, toppings, shake, cook.shake, gross, review, serve, and the nine warnings); gross.hair/tomato/freezerBurn 3 each; nearly 2; after.3 3, after.1 3, after.gross 2; event.intro/celebrate/again 2 each |
| customer | 41 | react.3/2/1 3 each, react.gross 2, every complain.* 2, order.odd.tenScoop/ketchup/justCherry/malted 2 each |
| lulu | 41 | greet 5, order.gag 5, smalltalk 5, goodbye 4, react 3/3/3, react.gross 1, every complain 1, odd justCherry 1 |
| walt | 46 | greet 5, order.gag 4, smalltalk 5, goodbye 4, react.favourite 2, react 3/3/3, react.gross 1, every complain 1, odd malted 2 and the other three 1 each |
| brock | 29 | visitor.arrive 3, greet 4, smalltalk 4, goodbye 3, react 3/3/3, react.gross 1, complain extra/missing/pick/done/tooFew 1 each |
| marge, gus, bev, vernon, sal, tasha | 15-21 | one greet each, react 3/3/3, react.gross 1, a few complaints; marge order.usual 2, gus order.twin 2, bev order.gag 2 and react.favourite 2, sal order.dislike 3, odd orders 1 each where they can get them |
| reginald, kai | 17 each | visitor.arrive 3, react 3/3/3, react.gross 1, complain extra/missing/pick/done 1 each |

## 5. Tone checks applied

Every line: the joke on the customer, the food or Mitch; nothing about the player's speed or skill, nobody hurries
(the ice cream melting is never a clock); PG; Lulu's humour is her seriousness, never baby talk; Walt's is 1955, never
his age as a weakness; Brock's is cheat day. A scratch lint checked a delivery note on every line, one varying blank,
none after a full stop, `order.gag` at most 20 words, `greet` at most 15; three lines that matched the pizza's or
the smoothie's words (Mitch's `tutorial.review.1`, `nearly.1`, `after.gross.1`) were rewritten.

## 6. For the voice pass

`[sigh]`, `[pause]`, `[gasp]` tags; Lulu's notes ask for big dramatic sighs then certainty (her cast voice); Walt
"a little slow"; Bev, Brock and Sal never loud. `nearly.1` has `{name}`: one clip per customer and stage.
