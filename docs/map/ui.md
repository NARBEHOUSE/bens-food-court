<!-- Engine map, 2026-11-08: 2D interface (ui, stage, css). Written by a read-only mapping agent. -->

# 2D interface map: ui.js, stage.js, bb.css, index.html

Paths are relative to `bennyshub/apps/games/BENSFOODCOURT/`. The hub scanner is `bennyshub/shared/choice-scan-adapter.js` (the adapter) on top of `shared/choice-scan.js` (the controller).

## 1. Page layout (index.html)

- **Body:** `<body data-scene="counter" data-motion="full" data-text="normal">` (:13). `data-theme` is added later by `applyLook` (ui.js:401-405).
- **Inside `#stage`** (fixed, inset 0, bb.css:23), back to front:
  - `#backdrop` (:18)
  - `img#customer` (:19, z2, shown only at the counter, bb.css:29-31)
  - `#canvasWrap` (:20, three.js, z3, no pointer events)
  - `img#mitch` (:21, z4, z2 at the counter)
  - z6 props: `#wheel.prop` (:22), `#back5` labelled "Pause" (:23), `#register` "Ring It Up" (:24), `#bell` "Next Customer" (:25)
  - z7: `#gauge` (:26), `#controls` (:27), `#hud` (:29)
  - z8: `#receipt` (:28), `#bubble` with `<b>` name and `<span>` text (:30)
- **Outside `#stage`** (:32-37): `#scanFrame` (four corner `<i>`, z30), `#choiceStatus` (badge host, z31), `#overlay` (cards, z20), `#fade` (z15), `#holdRing` (z40), `#loading` "Warming up the grill…" (z50).
- **Script order:** hub shared (:40-50), three (:52), core (:54-62), then only `packs/diner/{pack.js,script.js,art/manifest.js,voice/manifest.js}` (:64-67), then save, audio, world, stage, ui, game, main (:69-75).
- **Boot (main.js):** `stage.init` → `ui.init` → `world.init` → `setScene('counter')` → `openCard('title')`.
- **Where things sit (bb.css):**
  - wheel: top-left (computed in stage.js)
  - `#back5`: bottom-left, always `display:block` (75)
  - `#register` / `#bell`: bottom-right, counter only (77-79)
  - `#controls`: right column at top 55% (86); at the counter, top 14vh (90)
  - `#gauge`: left 42%, top 53vh (137)
  - bubbles: 149-154
  - `#receipt`: centred (155)
  - `#hud`: top-right (80)
  - narrow screens: 215-221

## 2. Cards (menu boards, ui.js)

A card is `SCREENS[name](opts)` (314-399) returning:
```
{ top?: html, title: text, sub?: html (not escaped), html?: html, speech?: text, cols2?: bool,
  items: [{ id, label, icon?, value?, say?, off?, action() }] }
```
- **`openCard(name, opts)`** (134-144): sets `ctx='card'` and `lineRoot=null`, renders, calls `swallowHeld()`, then `choice.sync(cardContext(), {fresh:true, restoreId: opts.restoreId||null})`, then `announce(card.speech ?? card.title)`.
- **`renderCard()`** (155-171) fills `#overlay` with `.card` containing `#cardStatus`, top, `h1`, `p.sub`, html, `.menu(.cols2) > .item(.off)` (each with `.ic .lb .val`), and `p.hint`. Each item's element is stored as `it.el` and gets its own click handler to `pointAndPick` (167).
- **Scan context `cardContext()`** (151-154): `{ key:'card:'+name, kind:'card', statusHost:#cardStatus, items }`. Each item that is not `off` becomes `{ id, label: () => say || label, element: it.el, ref: it }`. `off` items are drawn greyed and are not scanned.
- **Opens unhighlighted:** `fresh` makes the controller's `open()` start at index -1 (the blank) unless `restoreId` is set (choice-scan.js:249-264). `restoreId` is only used when coming back: Cancel on a confirm (384) and Back from Settings (366).
- **Selection:** the card branch of `onSelect` calls `ref.action()` (65). Cards are flat lists with no rows.
- **Settings items:**
  - `setting(id,label,value,say,change,off)` (301-308) runs `change()`, then `refreshCard()`, then speaks `say`. Because the key is the same, `refreshCard` goes through `setItems` and the highlight stays on the same id.
  - `pick(key)` (309-310) cycles `NAMES[key]` through `BB.save`.
  - Changes in the hub scan manager also refresh an open card (411).
- **`confirm(id,title,warn,yes,fn)`** (276; card 381-387): Cancel comes first, the warning is spoken when it opens, and Cancel restores the calling card with `restoreId:id`.
- **`openSettings(from)`** stores `settingsReturn` as `'title'` or `'pause'` (277-278). Its Back item (366) only knows those two.
- **Screens:**
  - `title` (315-328)
  - `tutorialOffer` (329-336)
  - `settings` (337-369): 18 items in two columns
  - `pause` (370-380): continue, help, restart, settings, menu, exit
  - `confirm`
  - `results` (388-398)
  - `hint()` (173-177) changes with Auto Scan and Space brake.

## 3. Hub choice scanner

**Setup:** `initChoice()` (42-70) calls `NarbeChoiceScanAdapter.create({holdThreshold:3000, stateHost:document.body, speak, statusHost:#choiceStatus, onContext, onHighlight, onSelect})`.

**Context shape:** `{ key, kind, statusHost, items: [{ id, label: string|fn, element, labelElement?, ref }] }`. ui.js adds `redraw` (on line roots) and `rowDrawn`.

- **`sync(ctx, {fresh, restoreId})`** (adapter:113-131):
  - A new key, or `fresh`, opens the list at -1.
  - The same key calls `setItems`, which keeps the highlighted id. If that id has gone, the scan clears to -1 (choice-scan.js:234-248).
  - `sync(null)` suspends the scan (`suspend()`, ui.js:128-131).
- **Rows:** `enterRow(ref)` (121-126) builds `{ key: lineRoot.key+'>'+ref.id, kind:'line', items: ref.rowItems() }` and calls `enterGroup(lvl, {wrap:true, backStop:true})`.
  - The adapter adds `BACK_STOP {id:'narbe:row-back', label:'Back'}` to the row (adapter:10, 70) and draws a dashed outline round the row while it is on (88).
  - Choosing Back calls `back({restore:true})` (110).
  - When the scan comes back to the root, `onContext` (46-55) calls `lineRoot.redraw()`, so the root answers are drawn again and their items point at the new elements.
- **Settings and speech:** Auto Scan, interval, parking, brake and Wait for Speech all come from `NarbeScanManager` (36-37); the auto clock lives in the controller. `announce(text)` (93-100) speaks through `choice.announce`, so Wait for Speech also waits for titles and prompts. On the blank with parking on, it adds "Park.".
- **Keys** (194-263). Everything acts on release.
  - Space keydown calls `brakePress()` when Auto Scan and Space brake are on. Otherwise it calls `setInputHeld(true)` and starts a 3 s timer; when it fires, the scan steps backwards and repeats at the scan interval.
  - Space release calls `step(1)` unless the press was a back-scan or a brake.
  - Enter release calls `select()`.
  - Holding Enter for 5 s calls `G().pause()`, but only when `ctx==='line'`; the ring shows from 2 s (229-240).
  - `swallowHeld()` (200-204) ignores the release of a key that was held across a screen change. Blur and `narbe-input-cancelled` clear all key state (259-263).
- **Highlight:** `light(el, braked)` (72-77) toggles `.lit` and `.braked`. `frame()` (78-88) runs every 200 ms and puts the `#scanFrame` brackets round the lit element (at least 64 px). It hides them when `ctx==='none'` and while the wheel is turning.
- **Pointer:** `pointAndPick(id)` (180-191) ignores clicks less than 380 ms after a screen opens, and ids that are not in the current context. Inside a row it steps to the id; at the root it uses `align(id)`; then it calls `select()`. Clicks on `.ctl` and `.prop` elements with a `data-id` are handled by one listener (417-420).
- **`__dbg()`** (424-428) returns `{ctx, card, index, id, depth, backStop, parked, items, active}`.
  - tests/dom-play.cjs waits for card `title` (94-95).
  - It uses the ids `start`, `continue`, `tutorial`, `settings`, `back`, `menu` and `yes` (149-185).

## 4. Line steps: how options become real-object controls

In game.js, `present(q, fresh)` (213-225) runs each of `q.options` through `W.option(pack,q,opt,o)` to get `{label, say}`. Then `control(q,e)` (227-236) turns each one into a descriptor `{ id, kind, label, icon?, cls?, marks?, swatch? }`:

| kind | Used for | Look |
|---|---|---|
| `btn` with cls `add`/`skip`/`swap` | Add steps; icons ＋ ✕ ♻ | enamel push-button; `--c` comes from `--enamel-*` (bb.css:95-101) |
| `plate` | Simple cooking; marks = stage index (max 4), swatch from `BB.world.colourOf` | dial plate (103-107) |
| `spatula` | Timed "Take It Off"; the panel is `.bare` | `spatula` prop art, or 🍳 without art (109-111; stage.js:214-215) |
| `tile` (`.more` for a row) | pick steps | 113-118 |
| `slip` (`.ticketSlip` for the Ticket) | review redo slips, and the Ticket at the counter | 113-117 |

- **`BB.stage.controls(list, bare)`** (stage.js:200-221) rebuilds `#controls` and returns `{id: element}`.
- **`rootContext(key, entries, draw, extra, noTicket)`** (game.js:239-253) builds the scan items in this order:
  1. the step's answers
  2. `ticket`: the `#ticket` on the wheel, or the order's slip at the counter
  3. `pause`: the `#back5` sign

  It also sets `data-id` on the wheel and the sign (241), and `root.redraw` re-binds the items to newly drawn elements.
- **Props used as choices:**
  - `#register` is `serve` at the review (game.js:386-387).
  - `#bell` is `next` on the receipt, with its label rewritten (466-476).
- **Context keys:**
  - `line:<cust>:<n>:<item>:<station>`: stays the same for a whole phase, so the highlight stays on one answer.
  - `review:<n>:<count>`
  - `receipt:<n>`
- **Hand-off:** `BB.ui.line(root, fresh, prompt)` (ui.js:106-119).

## 5. Stage pieces (stage.js)

- **`setScene(name)`** (41-55):
  - Returns early if the name is the same as the current scene.
  - Fades `#fade` (not the first time, not on Reduced).
  - Sets `body.dataset.scene = name`.
  - Sets the `#backdrop` image from `pack.backdrops[name]` if `BBArt.diner.backdrops` lists it.
  - Calls `BB.world.goTo(name)`, redraws the wheel and plays a pending spin.
  - Scene names are `counter` plus station ids. The CSS only distinguishes counter from not-counter: lines 31, 35-39, 52, 79, 90, 153-154 and 218.
- **`customer(folder,pose)`** (64-72) and **`mitch(pose)`** (74-81): `castSrc` builds `packs/diner/art/cast/<folder>/<pose>.webp`, falling back to `neutral`. `pop()` adds a squash on Full motion. Mitch's folder is `pack.manager.art` (77).
- **Ticket wheel** (83-196):
  - `geometry(w,h,text,theta)` returns `{tw,R,ry,cx,cy,slots[{phi,cz,x,y,scale,paper,shade}]}`. It is pure, for the Node layout check.
  - `drawWheel()` places the 8 slots and two SVG layers. Its colours are hard-coded (132, 143).
  - `spinWheel('in'|'turn')` animates for 1100 or 1600 ms; Reduced motion skips it. `body.wheelTurning` is set while it turns.
  - `wheelShown()` is true when `scene !== 'counter'` (91).
  - `ticket(order, active, spin)` (171-194) writes `.who` and an `<ol>` using `W.spelled`/`W.onWords` with the diner pack, sets `.many` and `li.now`, and queues a `pending` spin while the wheel is out of sight.
- **Gauge, bubbles, receipt, HUD:**
  - `gauge(stages,s,want)` (228-233): `.now` gets a lit border and `.want` is underlined, so neither relies on colour alone.
  - `bubble(kind 'customer'|'mitch', name, text)` (236-242)
  - `receipt({name,stars,mistakes,tip,favourite})` (243-251)
  - `hud(text)` (252)
  - `show(prop,on)` (225)

## 6. Look settings and CSS colour tokens

- **Settings applied by `applyLook`:**
  - `data-motion`: full | reduced
  - `data-text`: normal | large | xlarge. Changes `--label` and `--small` (bb.css:14-18) and the ticket width (stage.js:106).
  - `data-theme`: standard | contrast. Contrast (206-210) gives heavier borders, a dimmer backdrop and `--lit:#00e5ff`.
  - Reduced motion (213) stops every animation; the JS also skips pop, fade and spin.
- **Existing tokens (3-16):** `--lit #ffd400`, `--lit-ink`, `--ink #1b120e`, `--paper #fffaf0`, `--enamel-add #2fa84f`, `--enamel-skip #8b8f96`, `--enamel-swap #ff8a1c`, `--chalk #f7f3e8`, `--board #23382f`, `--wood #8a5a32`, `--label`, `--small`.
- **Hard-coded colours that cannot be re-skinned yet:**
  - page, fade and loading background `#3a2418` (21, 194, 201)
  - backdrop fallback `#e9c99a` (26)
  - prop label background `rgba(27,18,14,.86)` (48)
  - clip gradient (58)
  - ticket perforation `#c9c1b0` (61, 117)
  - ticket name `#8a2a20` (63); current ticket line `#fff2a8` (72)
  - HUD background (81)
  - control panel `#c9d1d8`→`#8d969e` with lip `#4d545a` (88)
  - plate gradient (104); grill mark `#6b3a22` (106)
  - gauge (138, 141)
  - bubble name `#b03024` (148)
  - stars `#f0a500` / `#ddd` (162-163, 191)
  - card glow `#2f4a3f` and inset `#5e3b20` (173-174); value text `#ffe27a` (182)
  - logo `#ffd36b` / `#ff6b4a` (188-189)
  - wheel SVG ink, steel, dark and `#fff` (stage.js:132, 143)

## 7. Places that are burger-specific or assume one pack

- **stage.js:**
  - 12: `BBPacks.diner`; 15: `BBArt.diner`
  - 22, 24, 49: hard-coded `packs/diner/…` paths
  - 27-31: props are loaded once, and missing art removes the `<img>` for good
  - 42: the same-name early return ignores which pack is showing
  - 48: uses `pack.backdrops`; `pack.stations[].backdrop` is never read
  - 77: Mitch's art folder; 91: `wheelShown`
  - 182-187, 231, 247: words built with the diner pack
  - 214-215: the spatula
- **ui.js:**
  - 318-319: logo, tagline and speech say "Burger Bar"
  - 321-325: title items are tied to one shift
  - 329-336: `tutorialOffer`
  - 296-298: `SAYS.orders` says "One burger…"
  - 365: Reset Progress wording covers one pack
  - 277 and 366: settings can only return to title or pause
  - 370-380: pause Main Menu calls `G().quit()`, which reopens title
  - 388-398: results offer Main Menu
  - 229 and 237: the Enter-hold pause only works on the line
  - 67: every non-card choice goes to `BB.game.onChoice`
  - 418: the click selector only covers `.ctl, .prop`
- **bb.css:** every `data-scene="counter"` rule, `#back5` always shown (75), `.ctl.spatula`, `.logo`.
- **index.html:** the title (:6), the loading text (:37), the single-pack script block (:64-67), and the register/bell labels (:24-25).
- **Other files with the same pattern:** save.js:10, game.js:11, audio.js:12, world.js:15. Save keys are already per pack (`bb-progress:<id>`, `bb-shift:<id>`), and settings are already global (`bb-settings`, savefmt.js:19).

## To support the Food Court

### Changes the four items below depend on

1. **stage.js `usePack(pack)`** (new export):
   - Keep `pack` and `art` as variables that can change, with `base='packs/'+pack.id+'/'`.
   - Reset `shown`, `scene`, the wheel and the ticket.
   - Re-point the prop images. Keep each `<img>` and toggle `.noart` instead of removing it.
   - Set `body.dataset.pack = pack.id` and apply `pack.theme` (see c).
2. **Look in more than one place for art:**
   - `castSrc` checks `BBArt[pack.id].cast` first, then a shared cast (`BBArt.cast` under `packs/cast/art/cast/`). Regulars are drawn once, and a venue-specific version overrides them. Mitch's uniforms are chosen through `pack.manager.art`.
   - `propSrc` checks the pack first, then `packs/court/art/props/` (back5, register, bell and the ticket wheel art shared).
3. **`setScene(name)`:**
   - Remember the scene as `pack.id+':'+name`, so the same scene name in another restaurant still changes the backdrop.
   - Set `body.dataset.place` to `court`, `counter` or `kitchen`.
   - Take the backdrop from `pack.backdrops[name] || pack.stations[name]?.backdrop`.
   - Call `world.goTo` only inside a restaurant.
   - Change `wheelShown` to `place==='kitchen'`.
4. **Generalise the spatula:** add `kind:'tool'` taking `c.prop` and `c.icon` from `pack.stations[st].tool` (peel, blender stop, fryer basket, scoop). Keep `spatula` as an alias.
5. **Share the ticket markup:** pull `ticketHTML(order, active)` out of `ticket()` (181-188) so a card can show the order.
6. **ui.js routing:**
   - `line(root, fresh, prompt)` sets `ctx = root.kind || 'line'`, and `enterRow` copies `root.kind` into the row.
   - Non-card `onSelect` calls `(lineRoot && lineRoot.onChoice || G().onChoice)(item.ref)`.
   - The Enter-hold pause runs when `ctx` is `line` or `court`, and calls `lineRoot.onPause || G().pause`.
   - `pointAndPick` falls back to `lineRoot.direct?.(id)` when the id is outside the current level, for example a click on a storefront while the root is showing.
   - Add `.store` to the click selector.
   - Store `settingsReturn` as `{name, opts}`.
7. **Card rows:** an item with `items:[…]` renders as a `.group`. The card branch of `onSelect` calls `choice.enterGroup({key:'card:'+cardName+'>'+id, kind:'card', items}, {wrap:true, backStop:true})`.

### (a) Food Court main menu and tutorial picker

- **Main menu:** replace `SCREENS.title` but keep the card name `title` so the tests still find it.
  - Logo `BEN'S / Food Court`; speech "Ben's Food Court".
  - Items:
    - `play` → `BB.court.open()`
    - `tutorial` → `openCard('tutorials')`
    - `settings` → `openSettings('title')`
    - `exit` → the existing confirm
  - Drop Continue Shift. A saved `bb-shift:<id>` resumes when that storefront is entered.
- **Tutorial picker, new `SCREENS.tutorials`:**
  - One item per open restaurant: `{id:'tut:'+rid, label:r.short, say:r.short+' tutorial', action:()=>BB.court.enter(rid,{tutorial:true})}`.
  - Then Back, with `restoreId:'tutorial'`.
  - With more than four open, use the court's Left/Bottom/Right groups as card rows, so no level offers more than five choices.
- **First visit:** `BB.court.enter()` opens `tutorialOffer`, retitled with the current pack's name.
- **Settings:** make `SAYS.orders` neutral or supplied by the pack. Reset Progress must clear every pack and the court's progress.

### (b) Court screen

- **Markup:** inside `#stage`, after `#backdrop`: `#court` containing `.arm#arm-left`, `.arm#arm-bottom`, `.arm#arm-right` and `#courtBoard.prop`.
- **New js/court.js** (`BB.court`): `open`, `enter`, `openList`, `stars`, `onChoice`, `pause`.
  - It fills each arm with `.store[data-id="store:<rid>"]`, each containing:
    - the storefront art
    - a star sign (★ glyphs plus a text count)
    - a crowd sized by popularity
    - `.shutter` "Coming Soon", `.banner` "Grand Opening", `.gold`
    - an `.lb` name label
  - Mitch's "the next restaurant needs…" line plays before the scan is handed over, the way `begin()` does it (game.js:101-104).
- **New data file packs/court/court.js:** `BBCourt.restaurants: [{id, pack, name, short, arm, slot, start, unlockOrder}]` plus the unlock rules. The court backdrop goes in `packs/court/art/`.
- **Scan context**, passed as `BB.ui.line(courtRoot(), true, 'The food court. ' + goalWords)`:
```js
const store = r => ({ id:'store:'+r.id, element:els[r.id], label:()=>r.short+', '+starWords(stars(r.id)), ref:{kind:'store', rid:r.id} });
const pause = { id:'pause', element:$('back5'), label:()=>'Pause', ref:{kind:'pause'} };
const open = BBCourt.restaurants.filter(isOpen);
const items = open.length <= 4 ? open.map(store)
  : ARMS.map(a => [a, open.filter(r => r.arm === a)]).filter(([, l]) => l.length).map(([a, l]) => ({
      id:'arm:'+a, element:$('arm-'+a), label:()=>ARM_NAME[a]+'. '+l.map(r => r.short).join(', '),
      ref:{ row:true, id:'arm:'+a, rowItems:()=>l.map(store) } }));
return { key:'court', kind:'court', items:items.concat(pause), onChoice, onPause:openCourtPause, direct };
```
  - The root has at most 4 items plus the blank: either up to 4 stores and Pause, or up to 3 arms and Pause.
  - Each arm row has at most 3 stores plus the adapter's own Back stop; no visible Back button is needed.
  - Locked stores are never scanned.
  - Choosing a store calls `enter(rid)`, which runs `usePack`, then `setScene('counter')`, then the game.
  - Add `SCREENS.courtPause`: Continue, Settings, Main Menu, Exit Game.
- **CSS** for `body[data-place="court"]`:
  - Show `#court`.
  - Hide `#canvasWrap`, `#customer`, `#wheel`, `#controls`, `#register`, `#bell`, `#gauge`, `#receipt` and `#hud`.
  - Keep `#back5` bottom-left, which the U shape leaves free, and move `#choiceStatus` off the bottom row.
  - Stores are at least 64 px, and `.arm.lit` outlines the whole arm.

### (c) Per-restaurant themes and backdrops

- **Tokens:** turn every hard-coded colour in section 6 into a token: `--page-bg`, `--panel-top`, `--panel-bottom`, `--panel-lip`, `--plate-top`, `--plate-bottom`, `--mark`, `--label-bg`, `--ticket-accent`, `--ticket-now`, `--perforation`, `--hud-bg`, `--gauge-bg`, `--star`, `--board-glow`, `--wood-inset`, `--card-value`, `--logo-top`, `--logo-main`, `--wheel-ink`, `--wheel-steel`, `--wheel-dark`.
- **Wheel:** draw the SVG with classes (`#wheel .w-steel{stroke:var(--wheel-steel)}`) instead of colour literals.
- **Applying a theme:** `usePack` writes `pack.theme` (a camelCase map) onto `document.documentElement.style`. The `body[data-theme="contrast"]` overrides sit on `body`, so High Contrast still wins.
  - Packs never set `--lit`.
  - Add, Skip and Swap stay distinguishable by icon and word, not just colour.
- **Backdrops:** `pack.backdrops[scene]` under `packs/<id>/art/backdrops/`, listed in `BBArt[<id>].backdrops` by `build_art.py`.
- **Selectors:** change every `data-scene="counter"` / `:not(...)` selector to use `data-place`.

### (d) Restaurant pause menu

```js
pause: () => ({ title:'Back in 5', speech:'Paused', items: [
  { id:'continue', label:'Resume', icon:'▶️', action:()=>G().resume() },
  { id:'ticket', label:'Ticket', icon:'🧾', off:!G().ticketWords(), say:'Ticket. Hear the order.',
    action:()=>choice && choice.announce(G().ticketWords()) },
  { id:'settings', label:'Settings', icon:'⚙️', action:()=>openSettings('pause') },
  { id:'court', label:'Back to Food Court', icon:'🏬', action:()=>confirm('court', 'Back to the food court?',
    'This shift is saved, and your stars so far are kept.', 'Back to Food Court', ()=>G().leaveToCourt()) },
  { id:'exit', label:'Exit Game', icon:'🚪', action:()=>confirm('exit', /* as now */) } ] })
```
- Keep the id `continue` so the tests still work.
- Optionally show `ticketHTML` in the card's `html`.
- This needs two new game.js functions, `ticketWords()` and `leaveToCourt()`; `quit()` currently reopens `title` (game.js:117).
- **Needs a decision:** ACCESSIBILITY.md §7 and DESIGN.md:479-482 both list Restart and Help in the pause menu, and this proposal drops them. Flag it for the team.
- **Results card:** Another Shift, Back to Food Court, Exit Game, plus the restaurant's star sign and any restaurant it unlocked.

### index.html and tests

- **index.html:**
  - Title "Ben's Food Court" and a loading text that isn't about the grill.
  - Load `packs/court/*`, `packs/cast/art/manifest.js`, and each restaurant's pack, script and manifests.
  - Load `js/court.js` before ui.js.
- **tests/dom-play.cjs:**
  - Starting a shift becomes title → `play` → (`arm:…`) → `store:diner`.
  - In pause, `menu` becomes `court`, and the run ends at `ctx 'court'` instead of the title card.
  - `__dbg` should report the court context.
