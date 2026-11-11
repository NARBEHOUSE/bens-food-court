/** Ben's Burger Bar - every line in the diner (DESIGN.md "Voices and the script").
 *
 *  Edit freely: a line whose words change falls back to text to speech until it is
 *  recorded again (tools/voices.cjs lists exactly which). A line is
 *    { id, who, moment, text, each?, delivery? }
 *  who: a character id, 'customer' (shared by every customer who has fewer than two lines
 *  of their own for that moment) or 'mitch'. {ing} is an ingredient (cheese), {ings} its
 *  plural (pickles), {want} a doneness (medium), {got} the stage or pick that was made
 *  instead, {name} the event's name (event.*). each: the blank that changes the words, so
 *  each value is recorded on its own (one changing blank per line: {want} or {got}, never
 *  both). delivery: how Voice Studio should say it.
 *
 *  Tone (DESIGN.md "Writing tone"): adult and dry; the joke is on the customer or the food,
 *  never on the player; nothing about speed or skill; no baby talk.
 *
 *  Ben's Food Court (docs/api/script.md): the moments are js/core/script.js's (SC.MOMENTS);
 *  lines that work at any restaurant (greet, smalltalk, goodbye, mention) live in
 *  packs/cast/script.js and are merged in. plainIds: these lines keep today's clip ids
 *  (<speaker>/<id>), the Burger Bar's recordings. The pack says format: 3: every moment is
 *  covered, and tests/script.test.cjs checks it (BB_PACKS=diner node --test "tests/script.test.cjs").
 *
 *  Phase 2a (diner-script, 2026-11-08): the full script. docs/api/packs/diner-script.md says
 *  who has what. The 145 lines the Burger Bar recorded against keep their text and ids; the
 *  new lines sit after them in each block. New ids are <moment>.<n> (odd.fivePatties.1,
 *  arrive.1, uniform.1, fryer.1, cookFryer.1, eventIntro.1); the cast script's are
 *  <moment>.c<n>, so the two never collide. The diner has no slots, so {slot} and {value}
 *  are never used here; a pick complaint uses {want} (fries, small, cola).
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBScripts = root.BBScripts || {}).diner = data;
})(typeof window === 'undefined' ? globalThis : window, { plainIds: true, lines: [

  /* ── Mitch: the shift ───────────────────────────────────────────────────── */
  { id: 'start.1', who: 'mitch', moment: 'shift.start', text: 'Doors are open. Try not to set anything on fire.' },
  { id: 'start.2', who: 'mitch', moment: 'shift.start', text: "Morning, team. And by team, I mean you. I'll be supervising." },
  { id: 'start.3', who: 'mitch', moment: 'shift.start', text: 'Big day. Corporate might visit. Corporate is my mom. Look busy.' },
  { id: 'start.4', who: 'mitch', moment: 'shift.start', text: "Remember, the customer is always right. Unless it's Vernon." },
  { id: 'start.5', who: 'mitch', moment: 'shift.start', text: "Grill's hot, buns are soft, and I've had four coffees. Let's go." },
  { id: 'end.1', who: 'mitch', moment: 'shift.end', text: "That's the shift. I'm putting mentored a legend on my resume." },
  { id: 'end.2', who: 'mitch', moment: 'shift.end', text: 'Doors are locked. Nobody got food poisoning. Huge win.' },
  { id: 'end.3', who: 'mitch', moment: 'shift.end', text: 'Great shift. I did a lot of pointing. You did everything else.' },
  { id: 'end.4', who: 'mitch', moment: 'shift.end', text: "Doors locked, grill off, hat still on. I'll take it off at home. Maybe.", delivery: 'tired, pleased with himself' },

  /* ── Mitch: his uniform (the red diner shirt and paper hat), the first shift here each session ─ */
  { id: 'uniform.1', who: 'mitch', moment: 'uniform', text: 'Red shirt, paper hat, and the tie underneath. Three layers of authority. The hat does most of the work.', delivery: 'upbeat, a little too proud' },
  { id: 'uniform.2', who: 'mitch', moment: 'uniform', text: 'The paper hat is regulation. I asked who wrote the regulation. It was my mom.', delivery: 'confident, then deflating' },
  { id: 'uniform.3', who: 'mitch', moment: 'uniform', text: "Don't touch the hat. It's paper. It's been through a lot. We both have.", delivery: 'quick, protective' },

  /* ── Mitch: gross-outs, said as the bad ingredient comes down the line ──── */
  { id: 'mouldy.1', who: 'mitch', moment: 'gross.mouldy', text: 'Whoa, why is that cheese green? You nasty. Change that out.', delivery: 'horrified, then disgusted' },
  { id: 'mouldy.2', who: 'mitch', moment: 'gross.mouldy', text: 'That cheese has a pulse. Swap it.' },
  { id: 'mouldy.3', who: 'mitch', moment: 'gross.mouldy', text: 'Is that cheese fuzzy? Nope. Nope. Get a fresh slice.' },
  { id: 'wilted.1', who: 'mitch', moment: 'gross.wilted', text: "That lettuce is brown. Lettuce isn't supposed to be brown. Swap it." },
  { id: 'wilted.2', who: 'mitch', moment: 'gross.wilted', text: 'That lettuce gave up years ago. Get a fresh one.' },
  { id: 'wilted.3', who: 'mitch', moment: 'gross.wilted', text: 'Brown lettuce. Brown is for bags and gravy. Swap it.', delivery: 'flat, disgusted' },
  { id: 'charred.1', who: 'mitch', moment: 'gross.charred', text: 'That bacon is charcoal. We are not a barbecue supply store. Swap it.' },
  { id: 'charred.2', who: 'mitch', moment: 'gross.charred', text: 'Who cremated the bacon? Get a fresh strip.' },
  { id: 'charred.3', who: 'mitch', moment: 'gross.charred', text: "That bacon's a fossil. Somebody's going to dig it up and name it. Swap it.", delivery: 'awed, then firm' },
  { id: 'hair.1', who: 'mitch', moment: 'gross.hair', each: 'ing', text: "There's a hair on the {ing}. It's not mine. Probably. Swap it." },
  { id: 'hair.2', who: 'mitch', moment: 'gross.hair', each: 'ing', text: 'Hair on the {ing}! Swap it before anybody sees. Too late. I saw.' },
  { id: 'fly.1', who: 'mitch', moment: 'gross.fly', each: 'ing', text: "There's a fly on the {ing}. He doesn't work here. Swap it." },
  { id: 'fly.2', who: 'mitch', moment: 'gross.fly', each: 'ing', text: 'Fly on the {ing}! Not on the menu. Swap it.' },

  /* ── Mitch: Timed cooking heads-up, one stage before the ticket's ───────── */
  { id: 'nearly.1', who: 'mitch', moment: 'nearly', each: 'want', text: 'Nearly {want}. Just saying.', delivery: 'quick, a little nervous' },
  { id: 'nearly.2', who: 'mitch', moment: 'nearly', each: 'want', text: 'Heads up. Almost {want}.', delivery: 'quick, a little nervous' },
  { id: 'nearly.3', who: 'mitch', moment: 'nearly', each: 'want', text: "Almost {want}. Spatula's right there. I'm just the voice.", delivery: 'quick, a little nervous' },

  /* ── Mitch: the mistake, read after the customer's complaint (voicecut, 2026-11-10): one line per value, his voice only ── */
  { id: 'mistake.extra.1', who: 'mitch', moment: 'mistake.extra', each: 'ings', text: 'The ticket said no {ings}.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.unasked.1', who: 'mitch', moment: 'mistake.unasked', each: 'ings', text: 'Nobody ordered {ings}.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.missing.1', who: 'mitch', moment: 'mistake.missing', each: 'ing', text: 'The ticket said {ing}. That got left off.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.tooMany.1', who: 'mitch', moment: 'mistake.tooMany', each: 'wanted', text: 'The ticket said {wanted}. We went over.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.tooFew.1', who: 'mitch', moment: 'mistake.tooFew', each: 'wanted', text: 'The ticket said {wanted}. We came up short.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.done.1', who: 'mitch', moment: 'mistake.done', each: 'want', text: 'The ticket said {want}.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.pick.1', who: 'mitch', moment: 'mistake.pick', each: 'wanted', text: 'The ticket said {wanted}.', delivery: 'flat, reading it off the ticket' },
  { id: 'mistake.more.1', who: 'mitch', moment: 'mistake.more', text: "There's more. It's on the receipt. The receipt doesn't forget. I've tried.", delivery: 'resigned, dry' },

  /* ── Mitch: after a customer's reaction (Hints and Jokes only) ──────────── */
  { id: 'after3.1', who: 'mitch', moment: 'after.3', text: "Another satisfied customer. I'll take the credit." },
  { id: 'after3.2', who: 'mitch', moment: 'after.3', text: 'See? I train them well. [laughing] Them being you.' },
  { id: 'after3.3', who: 'mitch', moment: 'after.3', text: 'Beautiful. I would hug you, but HR.' },
  { id: 'after1.1', who: 'mitch', moment: 'after.1', text: "We'll call that a learning experience." },
  { id: 'after1.2', who: 'mitch', moment: 'after.1', text: "I'm going to stand over here and pretend I didn't see that." },
  { id: 'after1.3', who: 'mitch', moment: 'after.1', text: "I'm writing that up as a team-building exercise.", delivery: 'brisk, covering' },
  { id: 'afterGross.1', who: 'mitch', moment: 'after.gross', text: 'In fairness, I did point at it.' },
  { id: 'afterGross.2', who: 'mitch', moment: 'after.gross', text: "That one's going on a review site." },
  { id: 'afterGross.3', who: 'mitch', moment: 'after.gross', text: 'Corporate will hear about this. Corporate will laugh. Corporate is my mom.', delivery: 'resigned' },

  /* ── Mitch: the tutorial (Marge's bacon cheeseburger, medium, no onions; the cheese comes mouldy) ─ */
  { id: 'intro', who: 'mitch', moment: 'tutorial.intro', text: "First day, huh? Great. I'm Mitch. Assistant manager. Let's do one order together, nice and slow." },
  { id: 'intro.2', who: 'mitch', moment: 'tutorial.intro', text: "Hi. Mitch. Assistant manager. The ASST. is tape, and the tape is temporary. Four years temporary. One order together, and I'll point at things.", delivery: 'eager, a touch wounded in the middle, then eager again' },
  { id: 'ticket', who: 'mitch', moment: 'tutorial.ticket', text: "That's the ticket, up on the wheel. If you forget the order, pick Ticket and you'll hear it again." },
  { id: 'ticket.2', who: 'mitch', moment: 'tutorial.ticket', text: 'Every order goes up on the wheel as a ticket, and the ticket lists everything that goes on, in the order it comes. Pick Ticket any time and it reads itself again. It loves that.', delivery: 'helpful, upbeat' },
  { id: 'grill', who: 'mitch', moment: 'tutorial.grill', text: 'This is the grill. One patty for a burger, two for a double. Add one, then pick Done.' },
  { id: 'grill.2', who: 'mitch', moment: 'tutorial.grill', text: "The grill. The ticket says how many patties. Add that many, then pick Done. Resist adding more. I never resist, which is why I'm telling you.", delivery: 'upbeat, confiding' },
  { id: 'cook', who: 'mitch', moment: 'tutorial.cook.grill', text: 'Now, how done? She said medium. The grill does the flipping. I do the supervising.' },
  { id: 'cook.2', who: 'mitch', moment: 'tutorial.cook.grill', text: "Pick how done. The ticket says medium. The grill does the flipping. I tried once. We don't talk about it.", delivery: 'upbeat, then dark' },
  { id: 'board', who: 'mitch', moment: 'tutorial.board', text: "Now the toppings come down the line, one at a time. Add what's on the ticket. Skip what isn't." },
  { id: 'board.2', who: 'mitch', moment: 'tutorial.board', text: "The board. Bottom bun's on, patty's on. Now every topping comes past, one at a time: Add if it's on the ticket, Skip if it isn't. The top bun goes on by itself. It's been trained.", delivery: 'upbeat, instructional' },
  { id: 'gross', who: 'mitch', moment: 'tutorial.gross', text: 'When something comes down the line looking nasty, pick Swap It and you get a fresh one.' },
  { id: 'gross.2', who: 'mitch', moment: 'tutorial.gross', text: "Sometimes an ingredient shows up looking like it's been through something. Pick Swap It and a fresh one comes down. The bad one goes in the bin. The bin and I have an understanding.", delivery: 'wary, then matter-of-fact' },
  { id: 'review', who: 'mitch', moment: 'tutorial.review', text: "Here's the burger. If something's wrong, redo it now. If it's right, ring it up." },
  { id: 'review.2', who: 'mitch', moment: 'tutorial.review', text: "The review. That's what you made, next to the ticket. If a station's wrong, redo it. If it's right, ring it up. The register likes being rung. It told me.", delivery: 'upbeat, instructional' },
  { id: 'serve', who: 'mitch', moment: 'tutorial.serve', text: 'And that is the job. Get something wrong and the customer will tell you. Loudly. Ready for a real shift?' },
  { id: 'serve.2', who: 'mitch', moment: 'tutorial.serve', text: "That's one order, start to finish. The customer tells you what they think. Some of them tell everyone. Vernon has a blog. Ready for a real shift?", delivery: 'proud, then a warning' },
  // The fryer and drinks are never in the tutorial order, but every station has its lines (docs/api/script.md 3).
  { id: 'fryer.1', who: 'mitch', moment: 'tutorial.fryer', text: 'The fryer. Pick fries or onion rings, whichever the ticket says. Then how crispy. Then salt, or no salt. The basket does the dunking.', delivery: 'upbeat, instructional' },
  { id: 'fryer.2', who: 'mitch', moment: 'tutorial.fryer', text: "Fryer. Three questions: which one, how crispy, salt or not. Then the basket comes up and you've got a side. Mind the oil. It minds you back.", delivery: 'upbeat, then wary' },
  { id: 'cookFryer.1', who: 'mitch', moment: 'tutorial.cook.fryer', text: 'How crispy? Golden, crispy or extra crispy. The ticket says which. Dale says extra crispy about everything, including the weather.', delivery: 'instructional, amused' },
  { id: 'cookFryer.2', who: 'mitch', moment: 'tutorial.cook.fryer', text: 'Pick the crispiness on the ticket. With Timed cooking, you lift the basket yourself when it gets there. The basket is the only thing in here with a handle. Besides me.', delivery: 'instructional, self-deprecating' },
  { id: 'drinks.1', who: 'mitch', moment: 'tutorial.drinks', text: "The drinks station. Cup size first, then ice or no ice, then which drink. The cup fills itself. It's the one job I was never trusted with.", delivery: 'upbeat, a touch wounded' },
  { id: 'drinks.2', who: 'mitch', moment: 'tutorial.drinks', text: 'Drinks. Pick the size, add ice or skip it, pick the drink. The fountain does the pouring. Try not to stare at it. It gets shy.', delivery: 'instructional, deadpan' },
  { id: 'warnExtra', who: 'mitch', moment: 'tutorial.warn.extra', each: 'ing', text: "Hold on, she said no {ings}. That's not the right one." },
  { id: 'warnExtra.2', who: 'mitch', moment: 'tutorial.warn.extra', each: 'ing', text: "Hold it. She said no {ings}. That's the one thing she said. Skip it.", delivery: 'quick, a little alarmed' },
  { id: 'warnUnasked', who: 'mitch', moment: 'tutorial.warn.unasked', each: 'ing', text: "Hold on, the ticket has no {ings}. Skip anything that isn't on it." },
  { id: 'warnUnasked.2', who: 'mitch', moment: 'tutorial.warn.unasked', each: 'ing', text: "Easy. That ticket has no {ings}. Not on the ticket, not on the burger. Skip it.", delivery: 'quick, steadying' },
  { id: 'warnMissing', who: 'mitch', moment: 'tutorial.warn.missing', each: 'ing', text: 'Wait, she wants {ing} on that. Add it.' },
  { id: 'warnMissing.2', who: 'mitch', moment: 'tutorial.warn.missing', each: 'ing', text: "Whoa, not Skip. The ticket wants {ing}. She'll notice. She notices everything. She drove a bus.", delivery: 'quick, then confiding' },
  { id: 'warnTooMany', who: 'mitch', moment: 'tutorial.warn.tooMany', text: "Whoa. One patty is plenty. It's not a double." },
  { id: 'warnTooMany.2', who: 'mitch', moment: 'tutorial.warn.tooMany', text: "Whoa. That's one patty more than the ticket. Pick Done before it turns into a Tower.", delivery: 'quick, alarmed' },
  { id: 'warnTooFew', who: 'mitch', moment: 'tutorial.warn.tooFew', text: "It's a burger. It needs a patty. Add one." },
  { id: 'warnTooFew.2', who: 'mitch', moment: 'tutorial.warn.tooFew', text: "Done? There's no patty on there. That's a bun sandwich. Add one.", delivery: 'puzzled, then firm' },
  { id: 'warnDone', who: 'mitch', moment: 'tutorial.warn.done', each: 'want', text: 'Close, but she said {want}.' },
  { id: 'warnDone.2', who: 'mitch', moment: 'tutorial.warn.done', each: 'want', text: 'Not that one. She asked for {want}. The ticket has it in writing. I have it in my heart.', delivery: 'gentle, then earnest' },
  { id: 'warnGross', who: 'mitch', moment: 'tutorial.warn.gross', text: "Whoa, whoa. We're not serving that. Swap it for a fresh one." },
  { id: 'warnGross.2', who: 'mitch', moment: 'tutorial.warn.gross', text: "Nope. Not that one. Pick Swap It and get a fresh one. Nobody eats the green stuff. Not even me, and I've eaten things.", delivery: 'alarmed, then confiding' },
  { id: 'warnGrossSkip', who: 'mitch', moment: 'tutorial.warn.grossSkip', each: 'ing', text: 'She wants {ing}. Just not that {ing}. Swap it.' },
  { id: 'warnGrossSkip.2', who: 'mitch', moment: 'tutorial.warn.grossSkip', each: 'ing', text: "Don't skip it. She wants {ing}. Just not that {ing}. Pick Swap It and a fresh one comes down.", delivery: 'quick, patient' },
  { id: 'warnPick', who: 'mitch', moment: 'tutorial.warn.pick', text: 'Not that one. Check the ticket.' },
  { id: 'warnPick.2', who: 'mitch', moment: 'tutorial.warn.pick', text: "Not that one. The ticket says which. It's the one thing in here that's never wrong. I've checked. Twice. About me.", delivery: 'quick, then sheepish' },

  /* ── Mitch: the five-star event, The Burger Eating Contest ({name} is the event's name) ── */
  { id: 'eventIntro.1', who: 'mitch', moment: 'event.intro', text: "It's {name}. Six contestants, then Coach Bev orders for her whole team. The grill's ready, the buns are ready, and I've had six coffees, so I'm ready too. Probably.", delivery: 'big, eager, a little wired' },
  { id: 'eventIntro.2', who: 'mitch', moment: 'event.intro', text: 'Big day. {name}. The contestants are lined up, Coach Bev has a clipboard, and corporate sent a banner. Corporate is my mom. She made the banner.', delivery: 'proud, then confiding' },
  { id: 'eventCelebrate.1', who: 'mitch', moment: 'event.celebrate', text: "{name}, done! Five stars! The gold sign goes up, and I'm the assistant manager of a gold-sign restaurant. The tape stays on, but it's gold tape now. In my heart.", delivery: 'overjoyed, then quietly moved' },
  { id: 'eventCelebrate.2', who: 'mitch', moment: 'event.celebrate', text: "That's {name} in the books! Five stars! Coach Bev is crying. She says it's sweat. It's not sweat.", delivery: 'triumphant, whispering the end' },
  { id: 'eventAgain.1', who: 'mitch', moment: 'event.again', text: "{name} fell short. In fairness, the contestants ate like they were being timed. They weren't. We'll run it again.", delivery: 'rueful, then hopeful' },
  { id: 'eventAgain.2', who: 'mitch', moment: 'event.again', text: "No gold sign today. {name} is a marathon, not a sprint. I said that into the headset. It's not connected to anything. We go again.", delivery: 'brave face' },

  /* ── every customer, unless they have lines of their own ────────────────── */
  { id: 'greet.1', who: 'customer', moment: 'greet', text: 'Hi there.' },
  { id: 'greet.2', who: 'customer', moment: 'greet', text: 'Evening.' },
  { id: 'react3.1', who: 'customer', moment: 'react.3', text: 'Now that is a burger.' },
  { id: 'react3.2', who: 'customer', moment: 'react.3', text: 'Perfect. Exactly what I asked for.' },
  { id: 'react3.3', who: 'customer', moment: 'react.3', text: "Oh, that's the one. That's the burger I tell people about.", delivery: 'happy, sincere' },
  { id: 'react2.1', who: 'customer', moment: 'react.2', text: 'Close enough, I guess.' },
  { id: 'react2.2', who: 'customer', moment: 'react.2', text: 'Not bad. Not quite right, though.' },
  { id: 'react2.3', who: 'customer', moment: 'react.2', text: "Nearly. Nearly's fine. Nearly's a whole food group where I come from.", delivery: 'mild, resigned' },
  { id: 'react1.1', who: 'customer', moment: 'react.1', text: "Well. It's food." },
  { id: 'react1.2', who: 'customer', moment: 'react.1', text: 'This is not what I ordered.' },
  { id: 'react1.3', who: 'customer', moment: 'react.1', text: "I'd send it back, but I don't want to see it again.", delivery: 'flat, let down' },
  { id: 'reactGross.1', who: 'customer', moment: 'react.gross', text: 'Oh. Oh, no. Oh, that is disgusting.', delivery: 'gagging, disgusted' },
  { id: 'reactGross.2', who: 'customer', moment: 'react.gross', text: "What. Is. That. No. I'm not eating that. Nobody is eating that.", delivery: 'slow horror' },
  // A complaint that names no food (voicecut): everyone has their own in packs/cast/script.js; these stand in for anyone short.
  { id: 'complain.1', who: 'customer', moment: 'complain', text: "That's not what I ordered.", delivery: 'mildly put out' },
  { id: 'complain.2', who: 'customer', moment: 'complain', text: "Hm. This isn't quite what I asked for.", delivery: 'polite, disappointed' },
  // complain.unasked: something added that the customer never mentioned (it was not on the ticket).
  // The patty is the only thing the diner counts, so these say so without a blank.
  // complain.pick: fries for onion rings, the wrong cup size or the wrong drink ({want}: fries, small, cola).
  { id: 'gMouldy.1', who: 'customer', moment: 'complain.gross.mouldy', text: 'The cheese is green! Why is the cheese green?' },
  { id: 'gWilted.1', who: 'customer', moment: 'complain.gross.wilted', text: 'This lettuce is brown. And slimy. Why is it slimy?' },
  { id: 'gCharred.1', who: 'customer', moment: 'complain.gross.charred', text: 'The bacon is burnt to a crisp. And not the good crisp.' },
  { id: 'gHair.1', who: 'customer', moment: 'complain.gross.hair', text: "There's a hair on my burger!" },
  { id: 'gFly.1', who: 'customer', moment: 'complain.gross.fly', text: "There's a fly on my burger! It's still moving!" },
  // The ridiculous orders (level 4 and 5), said instead of the order sentence. Anything the line can't
  // make is said, never made: the ticket is the Diner Tower (three patties), a bacon cheeseburger with
  // nothing green, a plain cheeseburger. Anyone but a visitor can get one; the regulars have their own.
  { id: 'odd.fivePatties.1', who: 'customer', moment: 'order.odd.fivePatties', text: "The Diner Tower, with five patties. I won't be counting. I never count. It only leads to sadness.", delivery: 'brisk, as if it were a normal thing to say' },
  { id: 'odd.nothingGreen.1', who: 'customer', moment: 'order.odd.nothingGreen', text: 'Bacon cheeseburger with everything, except anything green. Green is a warning color. Nature said so.', delivery: 'matter-of-fact' },
  { id: 'odd.bunInside.1', who: 'customer', moment: 'order.odd.bunInside', text: "A cheeseburger, please, with the bun on the inside. I saw it online. Just make it and we'll both pretend.", delivery: 'sheepish, then firm' },

  /* ── Marge: warm, unhurried, has seen everything twice ──────────────────── */
  { id: 'greet.1', who: 'marge', moment: 'greet', text: 'Hi, hon.' },
  { id: 'greet.2', who: 'marge', moment: 'greet', text: 'Evening, sweetie. Busy tonight?' },
  { id: 'greet.3', who: 'marge', moment: 'greet', text: "There's my favorite cook. Don't tell the others." },
  { id: 'usual', who: 'marge', moment: 'order.usual', text: 'The usual, hon.' },
  { id: 'usual.2', who: 'marge', moment: 'order.usual', text: "The usual, hon. Don't make me say it. I like being known.", delivery: 'warm, a little coy' },
  { id: 'odd.fivePatties.1', who: 'marge', moment: 'order.odd.fivePatties', text: "The Tower, hon, with five patties. My grandson dared me, and I don't back down from a seven-year-old.", delivery: 'warm, defiant' },
  { id: 'odd.bunInside.1', who: 'marge', moment: 'order.odd.bunInside', text: "A cheeseburger with the bun on the inside, hon. My grandson says it's a thing. He also says 'yeet', so who knows.", delivery: 'warm, baffled' },
  { id: 'react3.1', who: 'marge', moment: 'react.3', text: "Oh, that's lovely, hon. You're a doll." },
  { id: 'react3.2', who: 'marge', moment: 'react.3', text: "Now that's a burger. I'm telling the girls at bingo." },
  { id: 'react3.3', who: 'marge', moment: 'react.3', text: "Oh, hon. That's just like the one from my first date. Different fella. Same burger.", delivery: 'warm, misty' },
  { id: 'react2.1', who: 'marge', moment: 'react.2', text: "It's fine, hon. I was married forty years. I know fine." },
  { id: 'react2.2', who: 'marge', moment: 'react.2', text: 'Close, sweetie. Not quite. But close.' },
  { id: 'react2.3', who: 'marge', moment: 'react.2', text: "It's alright, hon. My husband never got my order right either, and I kept him forty years.", delivery: 'warm, forgiving' },
  { id: 'react1.1', who: 'marge', moment: 'react.1', text: 'Oh, hon. Oh, no.' },
  { id: 'react1.2', who: 'marge', moment: 'react.1', text: 'I drove a school bus for thirty years. I have never been this disappointed.' },
  { id: 'react1.3', who: 'marge', moment: 'react.1', text: "Oh, sweetie. I've eaten at a bus depot at four in the morning. I'd go back.", delivery: 'gentle, devastating' },
  { id: 'reactGross.1', who: 'marge', moment: 'react.gross', text: "Oh, my stars. I'm going to need a minute." },
  { id: 'smalltalk.1', who: 'marge', moment: 'smalltalk', text: "I had my retirement party in that corner booth, hon. Twelve bus drivers and one cake. The cake didn't make it.", delivery: 'warm, nostalgic' },
  { id: 'goodbye.1', who: 'marge', moment: 'goodbye', text: "Bye, hon. Tell Mitch his hat's crooked. It's always crooked. It's how I know it's him.", delivery: 'warm, fond' },

  /* ── Gus: low, friendly, eleven hours of interstate behind him ──────────── */
  { id: 'greet.1', who: 'gus', moment: 'greet', text: 'Howdy.' },
  { id: 'greet.2', who: 'gus', moment: 'greet', text: "Evenin'. Long drive." },
  { id: 'greet.3', who: 'gus', moment: 'greet', text: 'Hey, buddy. Eleven hours of highway, and now you.' },
  { id: 'twin', who: 'gus', moment: 'order.twin', text: 'One for now, one for the road.' },
  { id: 'twin.2', who: 'gus', moment: 'order.twin', text: 'Two, buddy. One for now, one for the road. The road and I have an arrangement.', delivery: 'easy drawl' },
  { id: 'odd.fivePatties.1', who: 'gus', moment: 'order.odd.fivePatties', text: "The Tower, five patties. Got eleven hours of highway ahead, and I'd like to feel every one of 'em.", delivery: 'easy drawl, dead serious' },
  { id: 'odd.nothingGreen.1', who: 'gus', moment: 'order.odd.nothingGreen', text: "Bacon cheeseburger, everything on it, except anything green. Green's for scenery, buddy. I see plenty.", delivery: 'easy drawl' },
  { id: 'react3.1', who: 'gus', moment: 'react.3', text: "Now that's worth eleven hours of interstate." },
  { id: 'react3.2', who: 'gus', moment: 'react.3', text: "Mm. Beautiful. [laughing] I might cry. Don't tell the other truckers." },
  { id: 'react3.3', who: 'gus', moment: 'react.3', text: "Ohh, buddy. That's the one I'll be thinkin' about somewhere around Tulsa.", delivery: 'contented drawl' },
  { id: 'react2.1', who: 'gus', moment: 'react.2', text: "It'll do, buddy. I've eaten worse at truck stops. Way worse." },
  { id: 'react2.2', who: 'gus', moment: 'react.2', text: 'Not bad. Not bad at all. Little off, though.' },
  { id: 'react2.3', who: 'gus', moment: 'react.2', text: 'Not bad. Not quite right. Like a motel bed. You still sleep.', delivery: 'philosophical drawl' },
  { id: 'react1.1', who: 'gus', moment: 'react.1', text: "Well. I once ate gas station sushi in Nevada. This is still worse." },
  { id: 'react1.2', who: 'gus', moment: 'react.1', text: "I'm gonna eat it. I'm a trucker. But I'm not happy about it." },
  { id: 'react1.3', who: 'gus', moment: 'react.1', text: "Buddy, I've eaten a sandwich off a dashboard in July. I'd trade.", delivery: 'rueful drawl' },
  { id: 'reactGross.1', who: 'gus', moment: 'react.gross', text: 'Oh, no. Oh, buddy. No.' },
  { id: 'smalltalk.1', who: 'gus', moment: 'smalltalk', text: "Parked Delores out front. She's blockin' the hot dog cart. Fella's hollerin'. He'll be fine.", delivery: 'easy drawl, unbothered' },

  /* ── Coach Bev: booming, every moment is the fourth quarter (caps are her emphasis; firm, never shouted) ─ */
  { id: 'greet.1', who: 'bev', moment: 'greet', text: "Let's GO! I'm STARVING!", delivery: 'firm and commanding, like a coach' },
  { id: 'greet.2', who: 'bev', moment: 'greet', text: "Hustle, hustle! I've got practice in twenty!", delivery: 'firm and commanding, like a coach' },
  { id: 'greet.3', who: 'bev', moment: 'greet', text: 'Big game tonight! I need fuel! FUEL!', delivery: 'firm and commanding, like a coach' },
  // order.gag: she orders the Team Stack for her team at the Burger Eating Contest's finale; the team is
  // spoken of, never shown (spec 4.4). The page says a customer's own order.gag after the order.
  { id: 'gag.1', who: 'bev', moment: 'order.gag', text: "That's for the TEAM! Twelve kids, one stack! They'll share! They will NOT share!", delivery: 'firm and commanding, not shouted; the last line an aside' },
  { id: 'gag.2', who: 'bev', moment: 'order.gag', text: "For the TEAM! They're in the van! The van is ROCKING!", delivery: 'firm and commanding, not shouted' },
  { id: 'gag.3', who: 'bev', moment: 'order.gag', text: "The whole TEAM eats off this one! That's what we call a HUDDLE!", delivery: 'firm and commanding, not shouted' },
  { id: 'odd.fivePatties.1', who: 'bev', moment: 'order.odd.fivePatties', text: 'The TOWER! Five patties! One for every practice this week!', delivery: 'firm and commanding, not shouted' },
  { id: 'odd.nothingGreen.1', who: 'bev', moment: 'order.odd.nothingGreen', text: "Bacon cheeseburger, EVERYTHING, except anything green! Green is the other team's color!", delivery: 'firm and commanding, not shouted' },
  { id: 'react3.1', who: 'bev', moment: 'react.3', text: 'THAT is what I call a TEAM EFFORT!', delivery: 'triumphant' },
  { id: 'react3.2', who: 'bev', moment: 'react.3', text: 'Touchdown! Home run! Whatever! It is GOOD!', delivery: 'triumphant' },
  { id: 'react3.3', who: 'bev', moment: 'react.3', text: 'PERFECT execution! Somebody get this burger a TROPHY!', delivery: 'triumphant, firm, not shouted' },
  { id: 'favourite.1', who: 'bev', moment: 'react.favourite', text: 'A DOUBLE! Oh, yes! PROTEIN!', delivery: 'triumphant' },
  { id: 'favourite.2', who: 'bev', moment: 'react.favourite', text: "A DOUBLE! Two patties! That's a DOUBLE-TEAM!", delivery: 'triumphant, firm, not shouted' },
  { id: 'react2.1', who: 'bev', moment: 'react.2', text: 'Not bad! Not great! We run it again next time!' },
  { id: 'react2.2', who: 'bev', moment: 'react.2', text: 'Solid effort! Sloppy footwork! On the burger!' },
  { id: 'react2.3', who: 'bev', moment: 'react.2', text: "Good hustle! Bad finish! We'll watch the TAPE!", delivery: 'firm, coaching' },
  { id: 'react1.1', who: 'bev', moment: 'react.1', text: "That's a penalty! Fifteen yards! On the BURGER!", delivery: 'outraged' },
  { id: 'react1.2', who: 'bev', moment: 'react.1', text: 'This burger is benched. For the season.' },
  { id: 'react1.3', who: 'bev', moment: 'react.1', text: 'Unsportsmanlike BURGER! Ejected! Go sit on the BUS!', delivery: 'outraged, firm, not shouted' },
  { id: 'reactGross.1', who: 'bev', moment: 'react.gross', text: 'TIMEOUT! TIMEOUT! Something is WRONG with this!', delivery: 'panicked' },
  { id: 'smalltalk.1', who: 'bev', moment: 'smalltalk', text: "My team's outside doing wind sprints around the hot dog cart! The hot dog guy is NOT happy!", delivery: 'firm, proud' },

  /* ── Vernon: foppish, fussy, refined; eleven followers hang on every word ── */
  { id: 'greet.1', who: 'vernon', moment: 'greet', text: '[sigh] Good evening. I will be reviewing tonight.', delivery: 'haughty and fussy' },
  { id: 'greet.2', who: 'vernon', moment: 'greet', text: '[sigh] Ah. You again. My eleven followers are waiting.', delivery: 'haughty and fussy' },
  { id: 'greet.3', who: 'vernon', moment: 'greet', text: "I'll keep this brief. My blog will not write itself.", delivery: 'haughty and fussy' },
  { id: 'odd.fivePatties.1', who: 'vernon', moment: 'order.odd.fivePatties', text: 'The Diner Tower, with five patties. Not three. Five. I will know.', delivery: 'haughty, precise' },
  { id: 'odd.nothingGreen.1', who: 'vernon', moment: 'order.odd.nothingGreen', text: 'A bacon cheeseburger with everything, except anything green. Green is a color for amateurs and lawns.', delivery: 'haughty, dismissive' },
  { id: 'odd.bunInside.1', who: 'vernon', moment: 'order.odd.bunInside', text: 'A cheeseburger with the bun on the inside. Deconstructed. My readers demand innovation. Well. Gerald does.', delivery: 'grand, then deflating' },
  { id: 'react3.1', who: 'vernon', moment: 'react.3', text: "Acceptable. Don't let it go to your head.", delivery: 'a long pause first, then grudging' },
  { id: 'react3.2', who: 'vernon', moment: 'react.3', text: "Hm. Four and a half buns out of five. That's a record.", delivery: 'grudging and haughty' },
  { id: 'react3.3', who: 'vernon', moment: 'react.3', text: '[sigh] I have no notes. Do you know how rare that is? I have notes on sunsets.', delivery: 'a theatrical sigh, then grudging wonder' },
  { id: 'react2.1', who: 'vernon', moment: 'react.2', text: "[sigh] A solid meh. I'll write about it.", delivery: 'haughty, unimpressed' },
  { id: 'react2.2', who: 'vernon', moment: 'react.2', text: 'Competent. Forgettable. Like most things.', delivery: 'haughty, unimpressed' },
  { id: 'react2.3', who: 'vernon', moment: 'react.2', text: "Three buns out of five. My readers will sense my disappointment. It's my brand.", delivery: 'haughty, unimpressed' },
  { id: 'react1.1', who: 'vernon', moment: 'react.1', text: "I've had warmer welcomes from a vending machine.", delivery: 'deeply unimpressed' },
  { id: 'react1.2', who: 'vernon', moment: 'react.1', text: 'My followers will hear about this. All eleven of them.', delivery: 'deeply unimpressed' },
  { id: 'react1.3', who: 'vernon', moment: 'react.1', text: 'This burger is getting a post of its own. A long one. In italics.', delivery: 'icy, deliberate' },
  { id: 'reactGross.1', who: 'vernon', moment: 'react.gross', text: 'This will be my most read post ever.', delivery: 'grim, quietly delighted' },
  { id: 'smalltalk.1', who: 'vernon', moment: 'smalltalk', text: "[sigh] My blog began at this very counter. Post one. 'Hm.' It remains my most popular.", delivery: 'a theatrical sigh, wistful' },

  /* ── Sal: gruff, loud, a bit crude; sells hot dogs out front, never eats them ─ */
  { id: 'greet.1', who: 'sal', moment: 'greet', text: "Yo. I'm on my break. Feed me." },
  { id: 'greet.2', who: 'sal', moment: 'greet', text: "Ay. Twelve hours sellin' hot dogs. You know what's in a hot dog? I do. That's why I'm here." },
  { id: 'greet.3', who: 'sal', moment: 'greet', text: "Lemme get somethin' that ain't a hot dog. I'm beggin' ya." },
  // order.dislike: said after an order that leaves off something he never takes (pack.js dislikes: lettuce).
  { id: 'dislike.1', who: 'sal', moment: 'order.dislike', text: 'Lettuce is for rabbits. Do I look like a rabbit?' },
  { id: 'dislike.2', who: 'sal', moment: 'order.dislike', text: "Keep the salad off it. My doctor ain't the boss of me." },
  { id: 'odd.fivePatties.1', who: 'sal', moment: 'order.odd.fivePatties', text: 'Gimme the Tower, five patties high. My doctor said live a little. Actually, he said the opposite.', delivery: 'gruff, defiant' },
  { id: 'odd.nothingGreen.1', who: 'sal', moment: 'order.odd.nothingGreen', text: "Bacon cheeseburger, everything on it, nothin' green. Green's a vegetable, and I'm on my break.", delivery: 'gruff, final' },
  { id: 'odd.bunInside.1', who: 'sal', moment: 'order.odd.bunInside', text: "Cheeseburger, bun on the inside. Don't look at me like that. I lost a bet to my cousin.", delivery: 'gruff, embarrassed' },
  { id: 'react3.1', who: 'sal', moment: 'react.3', text: "Now THAT'S a burger. I'm gonna have to unbutton my pants." },
  { id: 'react3.2', who: 'sal', moment: 'react.3', text: "Mm. Oh, that's beautiful. Don't tell nobody I said somethin' nice." },
  { id: 'react3.3', who: 'sal', moment: 'react.3', text: "Ay, that's beautiful. I'm gonna cry into my apron. It's seen worse.", delivery: 'gruff, moved' },
  { id: 'favourite.1', who: 'sal', moment: 'react.favourite', text: "Bacon! Now we're talkin'! [laughing] My doctor's gonna kill me." },
  { id: 'favourite.2', who: 'sal', moment: 'react.favourite', text: "A bacon cheeseburger, done right. I could cry. I won't. But I could." },
  { id: 'react2.1', who: 'sal', moment: 'react.2', text: "Eh. It's fine. I've had worse. I sell worse." },
  { id: 'react2.2', who: 'sal', moment: 'react.2', text: 'Close. Not perfect. Like my brother-in-law.' },
  { id: 'react2.3', who: 'sal', moment: 'react.2', text: "Eh. Close. My brother-in-law's close. Nobody's happy about it.", delivery: 'gruff, shrugging' },
  { id: 'react1.1', who: 'sal', moment: 'react.1', text: 'What is this? Even the pigeons out front would send this back.' },
  { id: 'react1.2', who: 'sal', moment: 'react.1', text: "Ugh. This is worse than my hot dogs. And I know what's in my hot dogs." },
  { id: 'react1.3', who: 'sal', moment: 'react.1', text: "What is this? I feed the pigeons better than this, and I don't even like the pigeons.", delivery: 'loud, indignant' },
  { id: 'reactGross.1', who: 'sal', moment: 'react.gross', text: "Oh, that's nasty! I ride the subway every day, and that's the nastiest thing I ever seen!" },
  { id: 'smalltalk.1', who: 'sal', moment: 'smalltalk', text: "Ten feet from my own cart, and I can hear the pigeons from here. They know I'm in here. They always know.", delivery: 'gruff, haunted' },

  /* ── Dale: wiry mechanic, gravelly drawl, never in a hurry; the onion-ring guy, extra crispy ─ */
  { id: 'react3.1', who: 'dale', moment: 'react.3', text: "Well, now. That's a ring you could hang a wrench on.", delivery: 'slow, admiring' },
  { id: 'react3.2', who: 'dale', moment: 'react.3', text: "That's done right. I'd shake your hand, but you'd need a degreaser.", delivery: 'slow, warm' },
  { id: 'react3.3', who: 'dale', moment: 'react.3', text: "Mm. That's the good stuff. Beats brake dust. Most things do, but still.", delivery: 'slow, content' },
  { id: 'favourite.1', who: 'dale', moment: 'react.favourite', text: "Extra crispy. [a slow whistle] That's the sound a ring's supposed to make.", delivery: 'slow, reverent; a low whistle in the middle' },
  { id: 'favourite.2', who: 'dale', moment: 'react.favourite', text: "Now that's a ring. Crisp all the way round. Like a good gasket.", delivery: 'slow, deeply content' },
  { id: 'react2.1', who: 'dale', moment: 'react.2', text: "That'll run. Idles a little rough, though.", delivery: 'slow, dry' },
  { id: 'react2.2', who: 'dale', moment: 'react.2', text: "Close. Like a bolt that's one turn short. It'll hold. For now.", delivery: 'slow, dry' },
  { id: 'react2.3', who: 'dale', moment: 'react.2', text: "Not bad. Not right. I'd send it back, if I was the sendin'-back type.", delivery: 'slow, unbothered' },
  { id: 'react1.1', who: 'dale', moment: 'react.1', text: "Hoo. That's a lemon. And I mean the car kind.", delivery: 'slow, grim' },
  { id: 'react1.2', who: 'dale', moment: 'react.1', text: 'Seen better work from a fella with one arm in a cast. That fella was me.', delivery: 'slow, dry' },
  { id: 'react1.3', who: 'dale', moment: 'react.1', text: "That's a tow job. Whole order. Hook it up.", delivery: 'slow, final' },
  { id: 'reactGross.1', who: 'dale', moment: 'react.gross', text: "Nope. I've pulled things out of engines that looked better than that.", delivery: 'slow, unbothered disgust' },
  { id: 'odd.fivePatties.1', who: 'dale', moment: 'order.odd.fivePatties', text: "Gimme the Tower, five patties. Been under a bus all day. Figure I earned somethin' the size of one.", delivery: 'slow drawl, serious' },
  { id: 'odd.nothingGreen.1', who: 'dale', moment: 'order.odd.nothingGreen', text: "Bacon cheeseburger, everything but anything green. Green means go. I ain't goin' anywhere.", delivery: 'slow drawl' },
  { id: 'smalltalk.1', who: 'dale', moment: 'smalltalk', text: "That fryer's got a nice hum to it. Sixty cycles. Could set a clock by it. I have.", delivery: 'slow, admiring' },
  { id: 'goodbye.1', who: 'dale', moment: 'goodbye', text: "Alright. Back under the bus. Tell them rings I'll be thinkin' of 'em.", delivery: 'slow, fond' },

  /* ── Professor Oakes: food science, tweed and a bow tie; nasal, nerdy, too fast; a new reason to hate
        onions every visit (pack.js dislikes: onion, rings) ───────────────────────────────────────── */
  { id: 'dislike.1', who: 'oakes', moment: 'order.dislike', text: "No onions. An onion makes you cry before it's done anything to you. That's not a vegetable, that's a threat.", delivery: 'nasal, too fast, certain' },
  { id: 'dislike.2', who: 'oakes', moment: 'order.dislike', text: 'No onions. Thermodynamically, an onion is a cry for help with a skin on it.', delivery: 'nasal, lecturing' },
  { id: 'dislike.3', who: 'oakes', moment: 'order.dislike', text: "No onions, please. An onion keeps growing after it's picked. I don't eat anything that's still making plans.", delivery: 'nasal, wary' },
  { id: 'dislike.4', who: 'oakes', moment: 'order.dislike', text: 'No onions. An onion is ninety percent water and ten percent regret. I have the charts.', delivery: 'nasal, brisk' },
  { id: 'dislike.5', who: 'oakes', moment: 'order.dislike', text: 'No onions. Statistically, every onion ring is an onion that got away with it.', delivery: 'nasal, grave' },
  { id: 'react3.1', who: 'oakes', moment: 'react.3', text: 'Remarkable! The Maillard reaction, exactly as the textbook promised. I wrote the textbook. Chapter four.', delivery: 'nasal, delighted, too fast' },
  { id: 'react3.2', who: 'oakes', moment: 'react.3', text: "Flawless. I'm going to need a moment, and possibly a footnote.", delivery: 'nasal, moved' },
  { id: 'react3.3', who: 'oakes', moment: 'react.3', text: "Textbook! I'd grade this an A. I don't give A's. I'm giving one.", delivery: 'nasal, thrilled' },
  { id: 'react2.1', who: 'oakes', moment: 'react.2', text: "Acceptable. B minus. See me after class. I'm joking. Don't see me.", delivery: 'nasal, brisk' },
  { id: 'react2.2', who: 'oakes', moment: 'react.2', text: "Close. A rounding error from correct. I round down. It's a flaw.", delivery: 'nasal, precise' },
  { id: 'react2.3', who: 'oakes', moment: 'react.2', text: "Hm. The data's a little noisy. Edible, but noisy.", delivery: 'nasal, squinting' },
  { id: 'react1.1', who: 'oakes', moment: 'react.1', text: "This contradicts everything I teach. I'll have to teach it anyway. For the tenure.", delivery: 'nasal, despairing' },
  { id: 'react1.2', who: 'oakes', moment: 'react.1', text: "Fascinating. Horrible, but fascinating. I'm taking notes with the emergency pen.", delivery: 'nasal, too fast, appalled' },
  { id: 'react1.3', who: 'oakes', moment: 'react.1', text: "Oh dear. If I served this to my students, they'd finally come to office hours. To complain.", delivery: 'nasal, rueful' },
  { id: 'reactGross.1', who: 'oakes', moment: 'react.gross', text: "Oh, no. I know exactly what that is. That's the problem. I know exactly what that is.", delivery: 'nasal, mounting horror' },
  { id: 'odd.fivePatties.1', who: 'oakes', moment: 'order.odd.fivePatties', text: "The Diner Tower, five patties. I'm studying structural failure in sandwiches, and lunch is the control group.", delivery: 'nasal, earnest' },
  { id: 'odd.nothingGreen.1', who: 'oakes', moment: 'order.odd.nothingGreen', text: 'Bacon cheeseburger, everything on it, except anything green. Chlorophyll and I are not speaking.', delivery: 'nasal, wounded' },
  { id: 'odd.bunInside.1', who: 'oakes', moment: 'order.odd.bunInside', text: "A cheeseburger with the bun on the inside. Topologically, it's the same sandwich. Emotionally, it's a breakthrough.", delivery: 'nasal, thrilled' },
  { id: 'smalltalk.1', who: 'oakes', moment: 'smalltalk', text: "Fun fact: this diner's lemonade is the most-cited beverage in my department. Cited by me. Repeatedly.", delivery: 'nasal, proud' },
  { id: 'goodbye.1', who: 'oakes', moment: 'goodbye', text: "Goodbye! I've got a lecture at two. On onions. It's less a lecture, more a warning.", delivery: 'nasal, cheerful' },

  /* ── Reginald: self-declared food critic, scarf in all weather; theatrical, sweeping; a visitor from
        level 4 who always orders the newest thing, the Diner Tower ─────────────────────────────── */
  { id: 'arrive.1', who: 'reginald', moment: 'visitor.arrive', text: "[clears throat] A critic has entered the Burger Bar. Carry on as if I weren't here. You can't, but do try.", delivery: 'theatrical, sweeping in' },
  { id: 'arrive.2', who: 'reginald', moment: 'visitor.arrive', text: 'Make way. Reginald is dining. The scarf goes first; I follow.', delivery: 'theatrical, grand' },
  { id: 'react3.1', who: 'reginald', moment: 'react.3', text: 'A Tower! A monument! I shall review it floor by floor. Ground floor: sublime.', delivery: 'theatrical, rapturous' },
  { id: 'react3.2', who: 'reginald', moment: 'react.3', text: "Magnificent. Four thousand words, and the first three thousand will be the word 'yes'.", delivery: 'theatrical, satisfied' },
  { id: 'react3.3', who: 'reginald', moment: 'react.3', text: 'I have dined in forty-one establishments, and this is the first to make the scarf gasp.', delivery: 'theatrical, awed' },
  { id: 'react2.1', who: 'reginald', moment: 'react.2', text: 'Hm. Promising, with reservations. The reservations have reservations.', delivery: 'theatrical, measured' },
  { id: 'react2.2', who: 'reginald', moment: 'react.2', text: 'Close to greatness, and greatness noticed. It waved. It did not stop.', delivery: 'theatrical, wistful' },
  { id: 'react2.3', who: 'reginald', moment: 'react.2', text: "A noble attempt. I shall write 'noble' nine times and let the reader decide.", delivery: 'theatrical, magnanimous' },
  { id: 'react1.1', who: 'reginald', moment: 'react.1', text: 'Ah. Tragedy. My favorite genre, and I did not order it.', delivery: 'theatrical, grave' },
  { id: 'react1.2', who: 'reginald', moment: 'react.1', text: 'I came for a five-course meal and received a five-act play. Nobody survives the fifth act.', delivery: 'theatrical, mournful' },
  { id: 'react1.3', who: 'reginald', moment: 'react.1', text: 'This will be a long review. The scarf has asked to be left out of it.', delivery: 'theatrical, wounded' },
  { id: 'reactGross.1', who: 'reginald', moment: 'react.gross', text: 'A critic must taste everything. This critic is reconsidering his entire career.', delivery: 'theatrical, faint' },
  { id: 'smalltalk.1', who: 'reginald', moment: 'smalltalk', text: "I'm told the Tower is new. I review only the newest. Yesterday's food is history, and I don't do history. I do lunch.", delivery: 'theatrical, grand' },
  { id: 'goodbye.1', who: 'reginald', moment: 'goodbye', text: 'Farewell. My review of the Burger Bar begins at the door. The door was adequate.', delivery: 'theatrical, sweeping out' },

  /* ── Kai: ten, notebook under one arm, Reginald's biggest fan; bright, very serious; a visitor from
        level 4 who orders one small burger and keeps his reviews short ─────────────────────────── */
  { id: 'arrive.1', who: 'kai', moment: 'visitor.arrive', text: "Okay. Notebook's open. Pencil's sharp. This is a review visit.", delivery: 'bright, very serious' },
  { id: 'arrive.2', who: 'kai', moment: 'visitor.arrive', text: "Reginald says this place has a Tower. I'm ten, so I'm here for a small one. But I'll look at the Tower.", delivery: 'bright, very serious' },
  { id: 'react3.1', who: 'kai', moment: 'react.3', text: "Three stars. Writing it down. 'Good burger.' Underlined.", delivery: 'bright, pleased' },
  { id: 'react3.2', who: 'kai', moment: 'react.3', text: "Smiley face. That's the first one this week. Don't tell my school cafeteria.", delivery: 'bright, conspiratorial' },
  { id: 'react3.3', who: 'kai', moment: 'react.3', text: "Review: yes. Reginald says that's too short. Reginald isn't here.", delivery: 'bright, very serious' },
  { id: 'react2.1', who: 'kai', moment: 'react.2', text: "Two stars. 'Almost.' I had to use the eraser. The eraser is for feelings.", delivery: 'bright, a little sad' },
  { id: 'react2.2', who: 'kai', moment: 'react.2', text: "It's okay. 'Okay' is one word. It's doing a lot of work.", delivery: 'bright, very serious' },
  { id: 'react2.3', who: 'kai', moment: 'react.2', text: "Hmm. Pretty good. I wrote 'pretty', then crossed it out. Just 'good'. With a question mark.", delivery: 'bright, deliberating' },
  { id: 'react1.1', who: 'kai', moment: 'react.1', text: "One star. I'm using the frowny face. I was saving it. This is the something special.", delivery: 'bright, solemn' },
  { id: 'react1.2', who: 'kai', moment: 'react.1', text: 'Review: no. Reginald says be constructive. Okay. No, thank you.', delivery: 'bright, polite, firm' },
  { id: 'react1.3', who: 'kai', moment: 'react.1', text: "I'm going to need the backup pencil for this. The first one is upset.", delivery: 'bright, grave' },
  { id: 'reactGross.1', who: 'kai', moment: 'react.gross', text: "Ew. I'm writing 'ew'. In capital letters. I'm allowed.", delivery: 'bright, horrified' },
  { id: 'smalltalk.1', who: 'kai', moment: 'smalltalk', text: "Reginald says the Tower here is a monument. I say it's a burger. A tall one. That's my whole review.", delivery: 'bright, very serious' },
  { id: 'goodbye.1', who: 'kai', moment: 'goodbye', text: "Bye. My mom's in the shoe store. My review will be done before she is.", delivery: 'bright, very serious' },
] });
