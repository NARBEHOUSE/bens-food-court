# Ben's Food Court — design

A switch-accessible cooking game set in a cartoon mall food court. Seven restaurants stand round the court; the player
picks one, works shifts at its counter, and earns it stars. Talking customers order, the player makes each order on an
assembly line where **the ingredients come to him** one step at a time, and every step is one question answered with
one press. Watching the food cook is the fun part; the customers' reactions are the payoff. Everything is original:
no names, art, characters or mechanics from another game.

This file is the design as built (2026-11-10). The hub rulebooks `ACCESSIBILITY.md` and `GRAPHICS-QUALITY.md` (hub
root) outrank it. The build contract, with every rule in full, is `docs/FOODCOURT-BUILD.md`; the formats are in
`docs/api/`; `docs/api/pilot.md` has the commands that check the game. Earlier versions of this file are in
`docs/backup/DESIGN.md.before`.

The game is not in any hub `games.json` or catalog and goes nowhere but this PC until it is tested and approved. It
opens from `bennyshub/apps/games/BENSFOODCOURT/index.html`, served (pilot.md 9).

## The flow

**Main menu** over the live court, out of focus: **Play · How to Play · Settings · Exit Game**.

- **Play** pulls the court into focus (about 0.6 s; a cut under Reduced motion) and the scan moves onto the open
  storefronts in the picture. The player scans the restaurants on the court itself, never a list.
- **How to Play** is one text card, spoken in full, with one stop: Back.
- **Settings** is the shared Settings card. **Exit Game** confirms, Cancel first.

**A storefront** zooms into that restaurant's counter. The first visit offers Mitch's walk-through (Play the
Tutorial · Skip It · Food Court). A saved shift resumes at the customer it was left on: an order left half made starts over, the customer
walks up and orders again (earlier customers, coins and results stay). When the
five-star event is due, a card offers Start the Event · Normal Shift · Food Court.

**A shift** is Shift Length customers (3, 5 or 8). Each customer orders, the player makes and serves the order, the
customer reacts and a receipt shows the stars. Then a results card says the stars, any star gained, any restaurant
that opened, a gold sign or the celebration: Another Shift · Food Court · Exit Game.

**Back on the court** its moments play (a Grand Opening, a gold sign, the grand celebration), each before the scan
opens and each said in full.

## The court

An upside-down U seen from above: three restaurants along the top, two down each side, the bottom open onto the mall,
tables in the middle. The progress board in the middle says the next goal and how many restaurants are at five stars
and fully busy. Every word on the court (name plates, stars as glyphs plus a number, the board) is drawn by the page
at Text Size; the painted picture carries none.

| Arm | Restaurant (scan name) | Opens |
|---|---|---|
| left, lower | Ben's Burritos (Burritos) | 2nd unlock: every open restaurant at 4 stars |
| left, upper | Ben's Smoothie Shack (Smoothie Shack) | 1st unlock: every open restaurant at 3 stars |
| top, left | Ben's Pizza Parlor (Pizza Parlor) | at the start |
| top, middle | Ben's Burger Bar (Burger Bar) | at the start |
| top, right | Ben's Cafe (Cafe) | at the start |
| right, upper | Ben's Sushi (Sushi) | 3rd unlock: every open restaurant at 5 stars |
| right, lower | Ben's Ice Cream Emporium (Ice Cream Emporium) | 4th unlock: every open restaurant at 5 stars |

- **Scanning** goes round the U from the bottom left. With four or fewer open: the open storefronts, then Pause. With
  five or more: the three parts (Left, Top, Right), each entered with a spoken Back stop, then Pause. Never more than
  five stops. Closed restaurants stay in the picture, greyed out behind a shutter, and are never stops. A pointer click
  enters a storefront from any level.
- **Labels** say the name and stars, plus "shift in progress" or "five-star event next" when true.
- **The court's Pause** (the Back in 5 sign, or Enter held 5 s): Continue · Help · Settings · Main Menu · Exit Game.
  Help says every open restaurant's stars and the next goal.
- **The crowd is calm.** People stand still in line or sit eating; nobody strolls or bounces. They are only the game's
  own customers, each on the floor at most once: locals at their own restaurant, regulars dealt out across the
  storefronts, Reginald and Kai only where a restaurant has reached level 4. The line grows from one to four and the
  tables fill as popularity rises; each diner has one of that restaurant's dishes in front of them. Now and then a
  caption of chatter shows over someone, with their name; it is never spoken.
- **Moments:** a Grand Opening rolls the shutter up, the announcer says so and the banner stays until the first visit;
  a gold sign drops onto the sign board; the grand celebration (once) has fireworks with no flash and at most three
  bursts a second, every drawn regular cheering, and Mitch promoted to Manager.

## Stars, popularity, unlocks and events

- **A good shift** averages 2 stars or more. Tutorials never count. A shift left part-way counts once, when it finishes.
- **Popularity** rises by one per good shift, up to 10 (fully busy). It never goes down.
- **Stars** come from popularity and only ever rise: 1 at the start, 2 at popularity 1, 3 at 3, 4 at 5.
- **The five-star event** is due at popularity 7 with 4 stars. Its shift ends on a giant finale item; a good event
  shift gives the fifth star and the gold sign, and a failed one can be tried again. A normal shift while it is due
  still grows popularity.
- **Unlocks** go Smoothie Shack, Burritos, Sushi, Ice Cream Emporium (table above).
- **The grand celebration** plays once, when all seven have five stars.
- **Coins** are the tips. They show on the receipt and the results; nothing spends them yet.

## The levels

A restaurant's star level sets its shifts. Order Size "One Item" makes every order one item at any level.

| Level | Orders |
|---|---|
| 1 | one item from the simplest recipes, at most a couple of changes |
| 2 | one item; more recipes and longer tickets |
| 3 | one or two items (a main and a side or drink); gross-outs, at most two a shift |
| 4 | as 3, plus one ridiculous order a shift and one special visitor (Reginald, Kai or the cameo), never first |
| 5 | as 4, after the event |

**Press budget:** in Simple a level-1 item takes no more than 14 line choices, and no order at any level more than
28. **The same recipe takes the same presses for every customer:** personality changes what someone orders, never
how many presses it takes. Anything the line cannot make ("five patties", "for twelve", "one of everything") is said,
never made: a line of dialogue over a normal ticket.

## The restaurants

Every restaurant is a pack on the shared engine (`packs/<id>/pack.js` and `script.js`, its food module
`js/food/<id>.js`, its backdrops and sounds). Each has a counter scene, its stations, a cooking step with its own
Timed tool, its gross-outs, ridiculous orders, a five-star event, a tutorial, help text, a colour theme, Mitch in its
uniform, and its locals.

| Restaurant | Stations (Timed tool) | Cooking words | Locals (tutorial customer first); cameo | Event |
|---|---|---|---|---|
| Burger Bar | grill (spatula), board, fryer (fryer basket), drinks | Rare → Well Done; fries and rings | Marge's tutorial; Dale, Oakes | The Burger Eating Contest |
| Pizza Parlor | prep, oven (peel), cut, knot basket | Light / Golden / Crispy | Tony, Pam; cameo Breeze | The Pizza Party |
| Cafe | coffee bar (espresso lever), dough, fryer (fryer basket), glaze | the pour (Simple does it by itself); the fry | Jitters, Priya; cameo Grandpa Walt | The Morning Rush |
| Smoothie Shack | prep, blender (blender switch), bowl bar | Chunky / Smooth / Super Smooth | Breeze, Brock; cameo Tony | The Beach Volleyball Tournament |
| Burritos | prep, griddle (grill press), chips | Lightly Toasted / Toasted / Extra Crispy | Rita, Inferno; cameo Chef Hiro | The Burrito Challenge |
| Sushi | prep, mat (a drawn Stop Rolling button), board, soup | the roll (Simple does it by itself) | Dennis, Chef Hiro; cameo Inferno | The Sushi Boat |
| Ice Cream Emporium | scoop (scoop), toppings, shake (mixer switch) | scoop size; the shake | Grandpa Walt, Little Lulu; cameo Brock | The Kitchen Sink |

### Recipes

| Restaurant | Level 1 | Level 2 | Level 3+ | Event |
|---|---|---|---|---|
| Burger Bar | Hamburger, Cheeseburger | Bacon Cheeseburger, Double Cheeseburger, Fries, Onion Rings | Fountain Drink, Lemonade or Iced Tea (3); The Diner Tower (4) | The Team Stack |
| Pizza Parlor | Cheese, Pepperoni | Veggie, Meat Lover's, Hawaiian, Garlic Knots | Everything Pizza | Heart-Shaped Pizza |
| Cafe | Coffee, Black Coffee, Latte, Glazed Donut, Sprinkle Donut | Hot Chocolate, Cappuccino, Vanilla Latte, Red Eye, Double Chocolate Donut, Jelly Donut | Wake-Up Call, Everything Donut | Giant Donut |
| Smoothie Shack | Strawberry Banana, Tropical, Berry Blast | Green Smoothie, Protein Shake | Açaí Bowl | Trophy Smoothie |
| Burritos | Chicken, Steak, Bean and Cheese Burritos, Chicken Bowl | Veggie Bowl, Steak and Chicken Tacos, Chips and Salsa | Everything Burrito, Fire Burrito | Challenge Burrito |
| Sushi | California, Spicy Tuna, Veggie Rolls | Philly Roll, Dragon Roll, Miso Soup | Rainbow Roll, Build Your Own Roll | Sushi Boat |
| Ice Cream Emporium | Cone, Cup, Hot Fudge Sundae | Caramel Sundae, Waffle Cone Deluxe, Milkshake | Banana Split | Kitchen Sink Sundae |

Each restaurant's full line (every slot, value and topping) is in `docs/api/packs/<id>.md`.

## The assembly line

Each recipe names its stations; each station is a short list of steps, and every step is one of these:

| Step | What the player sees | Answers |
|---|---|---|
| **Add** | one ingredient, offered on its own; a repeat offers it again up to a limit ("Add a second patty?") | Add · Skip, plus Swap It when it is bad |
| **Pick** | one choice of a few: a crust, a size, a milk, a flavour | the values, at most four a screen, then "More…" |
| **Cook** | the food on the heat | Simple: the stages to pick. Timed: the tool's stop ("Take It Off", "Pull It Out", "Stop the Blender") |
| **Auto** | a flourish the line does by itself (the top bun, the wrap, the roll-up) | none; never judged |

- **The order of the line is the order of the food,** so stacking order is never something to get wrong.
- **After a choice the highlight stays on the same answer** as the next ingredient arrives (the label changes and is
  spoken), so three Adds in a row are three presses. A new station opens on the blank.
- **Review:** the finished order sits on the counter beside its ticket and is described in plain words ("Cheeseburger:
  patty medium, cheese, lettuce, ketchup"); comparing is the player's job. Choices: Ring It Up · Redo <station> (one per
  station the order used) · Ticket · Pause. A redo runs that station again from its first step.
- **Orders with more items** run the line once per item, in ticket order, then one review and one serve.

### The ticket

**The ticket spells out the whole order:** for each item its name, then everything that goes on, with counts, in the
line's order ("Cheeseburger: one patty, medium, with cheese, lettuce, tomato, pickles and ketchup"; "nothing else on
it" when there is nothing). It never says "no X". The rule needs no menu knowledge: **add what's on the ticket, skip
what isn't.** Customers still order the natural way ("the usual, hon", "no onions"); the ticket is the one to follow.
In the kitchen it hangs on the ticket wheel and is read out once; Ticket turns the wheel and reads it again. At the
counter it is the order's slip.

### Cooking

- **Simple** (default): pick the stage; it always comes out as chosen. Stations marked "by itself" (the Cafe's pour,
  the sushi roll) cook to the ticket without asking, and Mitch explains them in the tutorial.
- **Timed** (challenge): the food goes through its named stages and the player presses the tool's stop at the right
  one. **Cooking Speed** (Very Slow by default, 12 s a stage; Slow 8 s; Normal 5 s) sets the pace, and the ticket's
  stage lasts twice as long. Every stage change is spoken and shown on a gauge as a word and a mark. Mitch says
  "Nearly …" one stage early. **The clock freezes while either switch is down,** so the stop takes the stage shown
  when the press began, however long the hold; it also stops for Pause, Settings, any card and a lost window focus.
  Food left on stops at its last stage (burnt), which is one mistake. Time is never scored.

## Rating

Accuracy only, never time:

- **3 stars:** everything matches the ticket. **2 stars:** one or two mistakes. **1 star:** more. No zero, no fail.
- **One mistake** is any of: something added that is not on the ticket or skipped that is; one too many or too few of
  a repeat; the wrong stage; a wrong pick; a bad ingredient served. Auto steps are never judged.
- **The serve:** the customer reacts in their own words (happy, annoyed, angry or disgusted). If there was a mistake
  that was not a gross-out, they say one short complaint of their own that names no food. **Mitch then reads what was
  wrong from the ticket** ("The ticket said no onions.", "Nobody ordered cherries.", "The ticket said medium."), up to
  two, then "There's more. It's on the receipt." Then the receipt: the stars (filled and empty stars plus the number), every mistake
  in words, and the tip. Hear It Again repeats it.
- **Tips:** price × (0.6 + 0.2 × stars), at least 1 coin. A customer's favourite adds a bonus tip and a happy line,
  never stars.

## Gross-outs

From level 3, now and then (at most two a shift, never two on one order) something offered is bad: a hair, a fly, a
bug, mould, wilted lettuce, charred bacon, brown guacamole, spoiled milk, a stale donut, freezer burn, a sock in the
ice, a fish that winks, a cherry that is actually a tomato. It sits on an Add step, or on a short Pick step where the
bad one is the value the ticket wants. Never on a cook or auto step (burnt is Timed's last stage).

It is flagged three ways, because no cue may need sight and Mitch can be switched off: **it looks wrong** (stink lines,
green, a circling fly), **Mitch says so**, and **the spoken label names it** ("Add the green cheese", "Oat milk,
spoiled"). The step gains **Swap It**, which brings a fresh one and asks again. Serving it is one mistake and gets a
disgusted reaction.

## Tutorial

Each restaurant's first visit offers one guided order with that restaurant's tutorial customer, always in Simple. Mitch
introduces every station and cook step, and **only in the tutorial** he warns before a mistake lands: the choice is not
applied, he says what is wrong, and the step asks again. The tutorial order meets one gross-out, so Swap It is
explained once. Tutorial lines ignore the Assistant Manager and Character Voices settings (with them Off they are
spoken in the game's voice and captioned). A tutorial never counts and never touches a saved shift. Its results: Start
a Shift · Food Court · Exit Game.

## Customers and cast

All drawn as whole-body poses. The same 22 customers serve the whole game; a restaurant's queue, visitors and event
orderers come only from characters whose art is complete.

| Who | Where | Who they are |
|---|---|---|
| Marge, Gus, Coach Bev, Vernon, Sal | every restaurant | retired bus driver ("the usual, hon"); long-haul trucker, orders two where the level allows; booming coach who orders "for the team"; burger blogger with eleven followers, picky about the food, never the player; gruff hot-dog-cart man, never lettuce |
| Dale, Professor Oakes | Burger Bar (Oakes wherever there are onions) | the onion-ring guy; a new over-researched reason to hate onions each time |
| Priya, Tasha | Cafe; Smoothie Shack and Ice Cream Emporium | night-shift nurse; deadpan teenage skater |
| Reginald, Kai | every restaurant from level 4 | self-declared food critic; his ten-year-old fan, who keeps it short |
| Tony, Pam | Pizza Parlor | retired opera tenor, offended by pineapple; birthday-party mom ("for twelve" is said) |
| Jitters | Cafe | far too much coffee |
| Breeze, Brock | Smoothie Shack | slow surfer; gym bro ("all the protein" is said) |
| Rita, Inferno | Burritos | construction worker ("one of everything" is said); wants it hotter |
| Dennis, Chef Hiro | Sushi | nervous first-timer; the stern master whose finale order is the event's approval |
| Grandpa Walt, Little Lulu | Ice Cream Emporium | "like 1955"; agonises, then picks vanilla (the ticket shows her final pick) |

Rules for every customer: the level and Order Size decide item counts, never personality. The ticket shows the whole
order. Nobody brings a new mechanic, changes their mind, leaves or hurries the player. Snark aims at the food, never at
the player. Greeting plus order is about two sentences at most; a running gag is one line of 8 seconds or less.

### Mitch, the assistant manager

Mitch runs the court with the player: he narrates, teaches the tutorials, spots gross-outs, reads the mistakes at the
serve, and has a joke about each restaurant's uniform (seven uniforms; "ASST." is tape over "MANAGER" on his badge
until the grand celebration). Funny, but there to help.

- **Scan speech always wins.** He never cuts off a label. He speaks into silence, while the scan is suspended.
- **Priority:** gross-outs and heads-ups, then tutorial lines, then jokes. At most one joke per customer; no line
  repeats in a shift.
- **Silent** while Pause, Settings or a card is open. **Never** comments on time, speed or skill.
- **Assistant Manager** setting: Hints and Jokes (default) / Hints Only / Off. Off silences him (and his mistake
  readout); the gross-out still shows and its label still names it, and the receipt still lists every mistake.

### Expressions

Customers have ten poses plus one for the court: neutral (walks up, front of a line), talking, waiting (while the
order is made, further back in a line), happy (3 stars), delighted (a favourite), annoyed (2 stars), angry (1 star),
disgusted (a gross-out served), shocked, laughing, and eating (seated on the court). Mitch has ten in each uniform:
neutral, talking, pointing (tutorial), thumbs up, shocked, disgusted, facepalm, laughing, worried (Timed heads-up),
shrug; plain Mitch has an eleventh, promoted. A new pose pops in with a small bounce on Full motion and cuts on
Reduced.

### Writing tone

Funny for adults, dry and absurd. The joke lands on the customer, the food or Mitch, never on the player. Nothing
mentions the player's speed or skill, and there is no baby talk or "great job!". Crude means PG, no swearing.
Characters from every background are written and drawn with respect: the humour comes from personality, never from
accent or ethnicity. US spelling in everything the player reads.

## Inside a restaurant

### The counter (where things sit)

Each counter picture is the view from behind that storefront's counter, looking out into the court, so walking in is
continuous with the court picture. Each has its own measured layout (`art-source/backdrops/<picture>.layout.json`:
the painted queue's box, the horizon, the sign board).

- **Nothing the game draws hides the painted people in the queue except the served customer.** The answer column,
  the receipt, the bubbles, the register and the bell all keep clear of the queue's box; where nothing fits (Extra
  Large text on a small window), legibility wins and the least of the queue is covered.
- **The served customer** stands behind the counter, hidden from the hips down, eyes at the picture's horizon,
  left of centre. A child stands on a step so their head and shoulders clear the counter.
- **The counter top** sits low: its back edge at 80% of the picture. The order lies flat on it, left of the queue,
  fully on screen at 16:9, 16:10, 4:3 and 21:9.
- **Mitch** stands at the customer's spot when nobody is being served, and right of the queue when someone is. Where a
  narrow window leaves no room he speaks from just off the right edge (his named bubble against the edge).
- **The answer column** sits top right (two columns, or a row above the queue's heads, when one column would reach
  the queue); the register bottom right; the counter bell in front of the customer; the Back in 5 sign bottom left;
  the restaurant's name on the painted sign board when it shows whole and nothing covers it.
- **In the kitchen** the food sits low and left of centre on the station's work surface, the control column is on the
  right, and Mitch steps in from the left low enough that the ticket wheel never covers his face. The scan runs the
  answers, Ticket, then Pause.

### No floating UI

The controls are real objects in the restaurant: Ticket is the ticket on its wheel (kitchen) or slip (counter); Add,
Skip and Swap It are enamel push-buttons on the line's control box; Timed's stop is the station's tool (spatula,
peel, fryer basket, blender or mixer switch, espresso lever, grill press, scoop; a drawn button at the sushi mat);
Serve is the cash register ("Ring It Up"); Next Customer is the counter bell; Pause is the "Back in 5" sign. Labels
stay large; the highlight is colour and thickness, never colour alone, at least 64 px.

### Pause

Continue · Ticket · Help · Restart Shift · Settings · Food Court · Main Menu · Exit Game. Ticket speaks the order
without closing the card. Leaving by Food Court, Main Menu or Exit Game saves the shift ("This shift is saved. You can
finish it later."); Restart Shift is the only route that discards it. Every route out confirms, Cancel first, with the
consequence spoken when the card opens. While Pause is open Mitch is silent and the cooking clock stops.

## Controls and scanning (ACCESSIBILITY.md)

- **Two switches:** Space moves, Enter picks. **One switch:** Auto Scan moves, Enter picks. The hub's choice scanner
  runs every card and screen.
- **Choices act on release.** Key-down only starts things: the Space brake, the back-scan hold, and the Pause ring
  (shown from 2 s; Enter held 5 s opens Pause, and that release is swallowed). A held switch never changes what a
  press did; a press that began while the game was talking is ignored on release.
- **Every card, the court and each court part open with nothing highlighted.** The first Space goes to item 1. Only
  rows return to the item they came from.
- **Choice limits:** a line screen offers at most four answers, plus Ticket, plus Pause, plus the blank stop; more
  values page with "More…". The court and each part have at most five stops. Pause and Settings are flat cards.
- **Speech is never cut off** by a scene change or an automatic step: tickets, reactions and long help hold Auto Scan
  until the words end, and a spoken state holds still for about 4 s.
- **Simple stays safe and predictable:** it always comes out as chosen. Timed is the only place timing matters.

## Settings

One set for the whole court, in this order: Text to Speech · Voice · Cooking (Simple / Timed) · Cooking Speed (Timed
only) · Shift Length (5 / 3 / 8) · Order Size (Follow the Stars / One Item) · Assistant Manager · Character Voices
(Voices and Captions / Captions Only / Off) · Colour Profile (Standard / High Contrast) · Motion (Full / Reduced) · Text
Size (Normal / Large / Extra Large) · Graphics Quality · Auto Scan ("On — One Switch" / "Off — Two Switches") · Scan
Speed · Sound Effects · Reset Progress (asks first; settings stay) · Back.

Text to Speech, Voice, Auto Scan and Scan Speed are the hub's own settings and always stay, because the game may be
played outside the hub. Shift Length, Order Size and Cooking apply from the next shift; Cooking Speed applies at once.
There is no music, so no Music row.

## Look and feel: 2.5D

- **3D (three.js) food:** chunky, cel-shaded food in close-up on each station's
  painted work surface; each restaurant's food module (`js/food/<id>.js`) draws its food, sets and cooking. Graphics
  Quality Low thins details; Reduced motion resolves every animation at once.
- **2D characters:** cartoony, cel-shaded, original designs, one static whole-body image per pose with its own clear
  silhouette, big on screen (about half the screen's height at the counter) so a low-vision player sees who is there
  and how they feel.
- **Painted backdrops,** one per station plus the counter and the court, each with a few small gags for anyone who
  looks. Every restaurant has a colour theme (Burger Bar red diner, Pizza red and white, Cafe brown and cream, Smoothie
  tropical teal, Burritos orange and green, Sushi navy and wood, Ice Cream pastel pink); High Contrast overrides them,
  and the highlight's yellow is never themed.
- **Menus** are boards in the restaurant's style. Doneness and every stage show as a word and a mark, never colour
  alone.
- **Art** is complete: 22 customers (ten poses plus eating), Mitch in seven uniforms plus plain (ten poses, plus
  promoted), every backdrop, the court, its props and the 21 dishes on its tables. `tools/build_art.py` turns
  `art-source/` (cast, backdrops, props, court-food) into the game's `.webp` files and the manifests; the game only
  asks for pictures the manifests list, and missing art never breaks it (a backdrop falls back to the theme colour).

## Sound

Short, soft sound effects only, played through the hub's SafeAudio (never Web Audio): the shared ones (plop, swoosh,
toss, tick, ding, kaching, stars, buzz, ew), each restaurant's cooking sounds (sizzle, flip, squirt, fryer, oven,
blender, espresso hiss, griddle press, knife, mixer, pour...) and the court's pops, chimes and shutter. Anything heard
every step stays short, quiet and below about 2.5 kHz. No ambient loop plays under speech. Sound Effects turns them
off.

## Voices and the script

**Today every line is text to speech.** There are no recordings in the game. Each character gets a distinct device
voice with its own pitch and rate (no two speakers at a restaurant sound the same); scan labels, the ticket read-out
and help stay in the player's own hub voice. Lines go through the hub's voice manager, never `speechSynthesis`
directly, and only while Text to Speech is on; scanner speech always wins. **Character Voices** (Voices and Captions
/ Captions Only / Off) controls the characters; captions always show.

**The script.** Every restaurant has `packs/<id>/script.js` (its food lines, its regulars' lines there, Mitch's);
`packs/cast/script.js` holds lines that work anywhere (greetings, small talk, goodbyes, the customers' own complaints,
gossip about other restaurants); `packs/court/script.js` holds the court's (Mitch, the announcer, cheers, chatter).
Each moment has several variants and none repeats in a shift. `SC.MOMENTS` (`js/core/script.js`) lists every moment;
the tests check every speaker has their moments at every restaurant they visit and that no blank is ever left
unfilled. Orders are spoken from parts ("Bacon cheeseburger" · "medium" · "no onions"), so any order can be said.

**The complaint split** (2026-11-10), so a future recording pass stays small: a customer's complaint is one short
line in their own voice that names no food and fits any restaurant and any mistake; **Mitch reads the actual mistake
from the ticket**, one line per kind of mistake per restaurant. Gross-out complaints name their own food in plain
words.

**The voice plan.** Brand-new character voices will be made later, from scratch (every earlier voice was removed).
Until then nothing changes: recordings are switched off (`BBCourt.recordedVoices = false`). When the voice pass comes,
`node tools/voice-clips.cjs all` lists every clip to record (about 8,000, most of them order parts); each clip carries
a hash of its words, so an edited line falls back to text to speech until it is recorded again, and an order with any
part unrecorded is spoken wholly by text to speech so one sentence never mixes two voices.

## Saves

`localStorage`, per web origin: `bb-settings` (version 3), `bb-court` (each restaurant's popularity, stars, opened,
gold, tutorial done, shifts; the celebration), `bb-shift:<id>` (a shift in progress) and `bb-progress:<id>` (coins).
Reset Progress clears everything but the settings.

## How it is built

- **One page,** `index.html`, loads the hub's shared scanner, voice manager and graphics-quality scripts from
  `bennyshub/shared/`, three.js, the engine and every pack. It needs the hub folder served over http (pilot.md 9).
- **The engine never names food.** `js/core/*.js` (line, judge, words, orders, shift, script, cast, court rules,
  saves) are pure rules, testable in Node, and never name an ingredient, station, recipe or restaurant. Everything
  about a restaurant lives in its pack. `js/{game,ui,stage,world,audio,save,court,packs,main}.js` are the page.
- **Offline:** no network, no fetch; pictures, sounds and scripts are local files.
- **Testing on this PC:** no browsers and no GPU. Node: `node --test "tests/*.test.cjs"`. The whole page, played by
  Space and Enter in jsdom: `tests/dom-play.cjs`. Review frames, rendered on the CPU: `tools/review-frames.cjs` plus
  `tools/review_compose.py`. The exact commands are in `docs/api/pilot.md` 8.4.

## Later

Ben's playtest, then press counts and timing tuned from it. The voice pass with new voices. Something to spend coins
on. Listing the game in the hub only after the user approves it.
