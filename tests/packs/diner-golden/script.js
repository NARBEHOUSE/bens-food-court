/** Ben's Burger Bar - every line in the diner (DESIGN.md "Voices and the script").
 *
 *  Edit freely: a line whose words change falls back to text to speech until it is
 *  recorded again (tools/voices.cjs lists exactly which). A line is
 *    { id, who, moment, text, each?, delivery? }
 *  who: a character id, 'customer' (shared by every customer who has fewer than two lines
 *  of their own for that moment) or 'mitch'. {ing} is an ingredient (cheese), {ings} its
 *  plural (pickles), {want} a doneness (medium). each: the blank that changes the words,
 *  so each value is recorded on its own. delivery: how Voice Studio should say it.
 *
 *  Tone (DESIGN.md "Writing tone"): adult and dry; the joke is on the customer or the food,
 *  never on the player; nothing about speed or skill; no baby talk.
 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.BBScripts = root.BBScripts || {}).diner = data;
})(typeof window === 'undefined' ? globalThis : window, { lines: [

  /* ── Mitch: the shift ───────────────────────────────────────────────────── */
  { id: 'start.1', who: 'mitch', moment: 'shift.start', text: 'Doors are open. Try not to set anything on fire.' },
  { id: 'start.2', who: 'mitch', moment: 'shift.start', text: "Morning, team. And by team, I mean you. I'll be supervising." },
  { id: 'start.3', who: 'mitch', moment: 'shift.start', text: 'Big day. Corporate might visit. Corporate is my mom. Look busy.' },
  { id: 'start.4', who: 'mitch', moment: 'shift.start', text: "Remember, the customer is always right. Unless it's Vernon." },
  { id: 'start.5', who: 'mitch', moment: 'shift.start', text: "Grill's hot, buns are soft, and I've had four coffees. Let's go." },
  { id: 'end.1', who: 'mitch', moment: 'shift.end', text: "That's the shift. I'm putting mentored a legend on my resume." },
  { id: 'end.2', who: 'mitch', moment: 'shift.end', text: 'Doors are locked. Nobody got food poisoning. Huge win.' },
  { id: 'end.3', who: 'mitch', moment: 'shift.end', text: 'Great shift. I did a lot of pointing. You did everything else.' },

  /* ── Mitch: gross-outs, said as the bad ingredient comes down the line ──── */
  { id: 'mouldy.1', who: 'mitch', moment: 'gross.mouldy', text: 'Whoa, why is that cheese green? You nasty. Change that out.', delivery: 'horrified, then disgusted' },
  { id: 'mouldy.2', who: 'mitch', moment: 'gross.mouldy', text: 'That cheese has a pulse. Swap it.' },
  { id: 'mouldy.3', who: 'mitch', moment: 'gross.mouldy', text: 'Is that cheese fuzzy? Nope. Nope. Get a fresh slice.' },
  { id: 'wilted.1', who: 'mitch', moment: 'gross.wilted', text: "That lettuce is brown. Lettuce isn't supposed to be brown. Swap it." },
  { id: 'wilted.2', who: 'mitch', moment: 'gross.wilted', text: 'That lettuce gave up years ago. Get a fresh one.' },
  { id: 'charred.1', who: 'mitch', moment: 'gross.charred', text: 'That bacon is charcoal. We are not a barbecue supply store. Swap it.' },
  { id: 'charred.2', who: 'mitch', moment: 'gross.charred', text: 'Who cremated the bacon? Get a fresh strip.' },
  { id: 'hair.1', who: 'mitch', moment: 'gross.hair', each: 'ing', text: "There's a hair on that {ing}. It's not mine. Probably. Swap it." },
  { id: 'hair.2', who: 'mitch', moment: 'gross.hair', each: 'ing', text: 'Hair on the {ing}! Swap it before anybody sees. Too late. I saw.' },
  { id: 'fly.1', who: 'mitch', moment: 'gross.fly', each: 'ing', text: "There's a fly on the {ing}. He doesn't work here. Swap it." },
  { id: 'fly.2', who: 'mitch', moment: 'gross.fly', each: 'ing', text: 'Fly on the {ing}! Not on the menu. Swap it.' },

  /* ── Mitch: Timed cooking heads-up, one stage before the ticket's ───────── */
  { id: 'nearly.1', who: 'mitch', moment: 'nearly', each: 'want', text: 'Nearly {want}. Just saying.', delivery: 'quick, a little nervous' },
  { id: 'nearly.2', who: 'mitch', moment: 'nearly', each: 'want', text: 'Heads up. Almost {want}.', delivery: 'quick, a little nervous' },

  /* ── Mitch: after a customer's reaction (Hints and Jokes only) ──────────── */
  { id: 'after3.1', who: 'mitch', moment: 'after.3', text: "Another satisfied customer. I'll take the credit." },
  { id: 'after3.2', who: 'mitch', moment: 'after.3', text: 'See? I train them well. [laughing] Them being you.' },
  { id: 'after3.3', who: 'mitch', moment: 'after.3', text: 'Beautiful. I would hug you, but HR.' },
  { id: 'after1.1', who: 'mitch', moment: 'after.1', text: "We'll call that a learning experience." },
  { id: 'after1.2', who: 'mitch', moment: 'after.1', text: "I'm going to stand over here and pretend I didn't see that." },
  { id: 'afterGross.1', who: 'mitch', moment: 'after.gross', text: 'In fairness, I did point at it.' },
  { id: 'afterGross.2', who: 'mitch', moment: 'after.gross', text: "That one's going on a review site." },

  /* ── Mitch: the tutorial ────────────────────────────────────────────────── */
  { id: 'intro', who: 'mitch', moment: 'tutorial.intro', text: "First day, huh? Great. I'm Mitch. Assistant manager. Let's do one order together, nice and slow." },
  { id: 'ticket', who: 'mitch', moment: 'tutorial.ticket', text: "That's the ticket, up on the wheel. If you forget the order, pick Ticket and you'll hear it again." },
  { id: 'grill', who: 'mitch', moment: 'tutorial.grill', text: 'This is the grill. One patty for a burger, two for a double. Add one, then pick Done.' },
  { id: 'cook', who: 'mitch', moment: 'tutorial.cook', text: 'Now, how done? She said medium. The grill does the flipping. I do the supervising.' },
  { id: 'board', who: 'mitch', moment: 'tutorial.board', text: "Now the toppings come down the line, one at a time. Add what's on the ticket. Skip what isn't." },
  { id: 'gross', who: 'mitch', moment: 'tutorial.gross', text: 'When something comes down the line looking nasty, pick Swap It and you get a fresh one.' },
  { id: 'review', who: 'mitch', moment: 'tutorial.review', text: "Here's the burger. If something's wrong, redo it now. If it's right, ring it up." },
  { id: 'serve', who: 'mitch', moment: 'tutorial.serve', text: 'And that is the job. Get something wrong and the customer will tell you. Loudly. Ready for a real shift?' },
  { id: 'warnExtra', who: 'mitch', moment: 'tutorial.warn.extra', each: 'ing', text: "Hold on, she said no {ings}. That's not the right one." },
  { id: 'warnUnasked', who: 'mitch', moment: 'tutorial.warn.unasked', each: 'ing', text: "Hold on, there's no {ing} on the ticket. Skip anything that isn't on it." },
  { id: 'warnMissing', who: 'mitch', moment: 'tutorial.warn.missing', each: 'ing', text: 'Wait, she wants {ing} on that. Add it.' },
  { id: 'warnTooMany', who: 'mitch', moment: 'tutorial.warn.tooMany', text: "Whoa. One patty is plenty. It's not a double." },
  { id: 'warnTooFew', who: 'mitch', moment: 'tutorial.warn.tooFew', text: "It's a burger. It needs a patty. Add one." },
  { id: 'warnDone', who: 'mitch', moment: 'tutorial.warn.done', each: 'want', text: 'Close, but she said {want}.' },
  { id: 'warnGross', who: 'mitch', moment: 'tutorial.warn.gross', text: "Whoa, whoa. We're not serving that. Swap it for a fresh one." },
  { id: 'warnGrossSkip', who: 'mitch', moment: 'tutorial.warn.grossSkip', each: 'ing', text: 'She wants {ing}. Just not that {ing}. Swap it.' },
  { id: 'warnPick', who: 'mitch', moment: 'tutorial.warn.pick', text: 'Not that one. Check the ticket.' },

  /* ── every customer, unless they have lines of their own ────────────────── */
  { id: 'greet.1', who: 'customer', moment: 'greet', text: 'Hi there.' },
  { id: 'greet.2', who: 'customer', moment: 'greet', text: 'Evening.' },
  { id: 'react3.1', who: 'customer', moment: 'react.3', text: 'Now that is a burger.' },
  { id: 'react3.2', who: 'customer', moment: 'react.3', text: 'Perfect. Exactly what I asked for.' },
  { id: 'react2.1', who: 'customer', moment: 'react.2', text: 'Close enough, I guess.' },
  { id: 'react2.2', who: 'customer', moment: 'react.2', text: 'Not bad. Not quite right, though.' },
  { id: 'react1.1', who: 'customer', moment: 'react.1', text: "Well. It's food." },
  { id: 'react1.2', who: 'customer', moment: 'react.1', text: 'This is not what I ordered.' },
  { id: 'reactGross.1', who: 'customer', moment: 'react.gross', text: 'Oh. Oh, no. Oh, that is disgusting.', delivery: 'gagging, disgusted' },
  { id: 'extra.1', who: 'customer', moment: 'complain.extra', each: 'ing', text: 'I said no {ings}!' },
  { id: 'extra.2', who: 'customer', moment: 'complain.extra', each: 'ing', text: 'Why are there {ings} on this? I said no {ings}.' },
  // complain.unasked: something added that the customer never mentioned (it was not on the ticket).
  { id: 'unasked.1', who: 'customer', moment: 'complain.unasked', each: 'ing', text: "I didn't ask for {ings}." },
  { id: 'unasked.2', who: 'customer', moment: 'complain.unasked', each: 'ing', text: 'Who put {ings} on this? I never said {ings}.' },
  { id: 'missing.1', who: 'customer', moment: 'complain.missing', each: 'ing', text: 'Where is the {ing}? I wanted {ing}.' },
  { id: 'missing.2', who: 'customer', moment: 'complain.missing', each: 'ing', text: 'You forgot the {ing}.' },
  { id: 'tooMany.1', who: 'customer', moment: 'complain.tooMany', text: 'That is a lot more patty than I ordered.' },
  { id: 'tooFew.1', who: 'customer', moment: 'complain.tooFew', text: "There's a patty missing. I can feel it." },
  { id: 'done.1', who: 'customer', moment: 'complain.done', each: 'want', text: 'I asked for {want}.' },
  { id: 'done.2', who: 'customer', moment: 'complain.done', each: 'want', text: "This isn't {want}. I said {want}." },
  { id: 'pick.1', who: 'customer', moment: 'complain.pick', text: "That's not what I ordered." },
  { id: 'more.1', who: 'customer', moment: 'complain.more', text: 'And that is not even everything.' },
  { id: 'gMouldy.1', who: 'customer', moment: 'complain.gross.mouldy', text: 'The cheese is green! Why is the cheese green?' },
  { id: 'gWilted.1', who: 'customer', moment: 'complain.gross.wilted', text: 'This lettuce is brown. And slimy. Why is it slimy?' },
  { id: 'gCharred.1', who: 'customer', moment: 'complain.gross.charred', text: 'The bacon is burnt to a crisp. And not the good crisp.' },
  { id: 'gHair.1', who: 'customer', moment: 'complain.gross.hair', each: 'ing', text: "There's a hair on my {ing}!" },
  { id: 'gFly.1', who: 'customer', moment: 'complain.gross.fly', each: 'ing', text: "There's a fly on my {ing}! It's still moving!" },

  /* ── Marge: warm, unhurried, has seen everything twice ──────────────────── */
  { id: 'greet.1', who: 'marge', moment: 'greet', text: 'Hi, hon.' },
  { id: 'greet.2', who: 'marge', moment: 'greet', text: 'Evening, sweetie. Busy tonight?' },
  { id: 'greet.3', who: 'marge', moment: 'greet', text: "There's my favorite cook. Don't tell the others." },
  { id: 'usual', who: 'marge', moment: 'order.usual', text: 'The usual, hon.' },
  { id: 'react3.1', who: 'marge', moment: 'react.3', text: "Oh, that's lovely, hon. You're a doll." },
  { id: 'react3.2', who: 'marge', moment: 'react.3', text: "Now that's a burger. I'm telling the girls at bingo." },
  { id: 'react2.1', who: 'marge', moment: 'react.2', text: "It's fine, hon. I was married forty years. I know fine." },
  { id: 'react2.2', who: 'marge', moment: 'react.2', text: 'Close, sweetie. Not quite. But close.' },
  { id: 'react1.1', who: 'marge', moment: 'react.1', text: 'Oh, hon. Oh, no.' },
  { id: 'react1.2', who: 'marge', moment: 'react.1', text: 'I drove a school bus for thirty years. I have never been this disappointed.' },
  { id: 'reactGross.1', who: 'marge', moment: 'react.gross', text: "Oh, my stars. I'm going to need a minute." },
  { id: 'extra.1', who: 'marge', moment: 'complain.extra', each: 'ing', text: 'Hon. I said no {ings}. Do I look like a woman who wants {ings}?' },
  { id: 'unasked.1', who: 'marge', moment: 'complain.unasked', each: 'ing', text: 'Hon, I never asked for {ings}. Read me back that ticket, sweetie.' },
  { id: 'missing.1', who: 'marge', moment: 'complain.missing', each: 'ing', text: "Hon, you forgot the {ing}. I'm old, not blind." },

  /* ── Gus: low, friendly, eleven hours of interstate behind him ──────────── */
  { id: 'greet.1', who: 'gus', moment: 'greet', text: 'Howdy.' },
  { id: 'greet.2', who: 'gus', moment: 'greet', text: "Evenin'. Long drive." },
  { id: 'greet.3', who: 'gus', moment: 'greet', text: 'Hey, buddy. Eleven hours of highway, and now you.' },
  { id: 'twin', who: 'gus', moment: 'order.twin', text: 'One for now, one for the road.' },
  { id: 'react3.1', who: 'gus', moment: 'react.3', text: "Now that's worth eleven hours of interstate." },
  { id: 'react3.2', who: 'gus', moment: 'react.3', text: "Mm. Beautiful. [laughing] I might cry. Don't tell the other truckers." },
  { id: 'react2.1', who: 'gus', moment: 'react.2', text: "It'll do, buddy. I've eaten worse at truck stops. Way worse." },
  { id: 'react2.2', who: 'gus', moment: 'react.2', text: 'Not bad. Not bad at all. Little off, though.' },
  { id: 'react1.1', who: 'gus', moment: 'react.1', text: "Well. I once ate gas station sushi in Nevada. This is still worse." },
  { id: 'react1.2', who: 'gus', moment: 'react.1', text: "I'm gonna eat it. I'm a trucker. But I'm not happy about it." },
  { id: 'reactGross.1', who: 'gus', moment: 'react.gross', text: 'Oh, no. Oh, buddy. No.' },
  { id: 'extra.1', who: 'gus', moment: 'complain.extra', each: 'ing', text: 'Buddy, I said no {ings}. Still love ya, though.' },
  { id: 'unasked.1', who: 'gus', moment: 'complain.unasked', each: 'ing', text: "Buddy, I didn't order {ings}. I've hauled less on a flatbed." },
  { id: 'missing.1', who: 'gus', moment: 'complain.missing', each: 'ing', text: "Hey, where'd the {ing} go?" },

  /* ── Coach Bev: booming, every moment is the fourth quarter ─────────────── */
  { id: 'greet.1', who: 'bev', moment: 'greet', text: "Let's GO! I'm STARVING!", delivery: 'firm and commanding, like a coach' },
  { id: 'greet.2', who: 'bev', moment: 'greet', text: "Hustle, hustle! I've got practice in twenty!", delivery: 'firm and commanding, like a coach' },
  { id: 'greet.3', who: 'bev', moment: 'greet', text: 'Big game tonight! I need fuel! FUEL!', delivery: 'firm and commanding, like a coach' },
  { id: 'react3.1', who: 'bev', moment: 'react.3', text: 'THAT is what I call a TEAM EFFORT!', delivery: 'triumphant' },
  { id: 'react3.2', who: 'bev', moment: 'react.3', text: 'Touchdown! Home run! Whatever! It is GOOD!', delivery: 'triumphant' },
  { id: 'favourite.1', who: 'bev', moment: 'react.favourite', text: 'A DOUBLE! Oh, yes! PROTEIN!', delivery: 'triumphant' },
  { id: 'react2.1', who: 'bev', moment: 'react.2', text: 'Not bad! Not great! We run it again next time!' },
  { id: 'react2.2', who: 'bev', moment: 'react.2', text: 'Solid effort! Sloppy footwork! On the burger!' },
  { id: 'react1.1', who: 'bev', moment: 'react.1', text: "That's a penalty! Fifteen yards! On the BURGER!", delivery: 'outraged' },
  { id: 'react1.2', who: 'bev', moment: 'react.1', text: 'This burger is benched. For the season.' },
  { id: 'reactGross.1', who: 'bev', moment: 'react.gross', text: 'TIMEOUT! TIMEOUT! Something is WRONG with this!', delivery: 'panicked' },
  { id: 'extra.1', who: 'bev', moment: 'complain.extra', each: 'ing', text: 'I said NO {ings}! This burger is running laps!' },
  { id: 'unasked.1', who: 'bev', moment: 'complain.unasked', each: 'ing', text: "Who called {ings}? Not me! That's not the play!", delivery: 'outraged' },
  { id: 'missing.1', who: 'bev', moment: 'complain.missing', each: 'ing', text: "Where's my {ing}? That's a fumble!" },

  /* ── Vernon: foppish, fussy, refined; eleven followers hang on every word ── */
  { id: 'greet.1', who: 'vernon', moment: 'greet', text: '[sigh] Good evening. I will be reviewing tonight.', delivery: 'haughty and fussy' },
  { id: 'greet.2', who: 'vernon', moment: 'greet', text: '[sigh] Ah. You again. My eleven followers are waiting.', delivery: 'haughty and fussy' },
  { id: 'greet.3', who: 'vernon', moment: 'greet', text: "I'll keep this brief. My blog will not write itself.", delivery: 'haughty and fussy' },
  { id: 'react3.1', who: 'vernon', moment: 'react.3', text: "Acceptable. Don't let it go to your head.", delivery: 'a long pause first, then grudging' },
  { id: 'react3.2', who: 'vernon', moment: 'react.3', text: "Hm. Four and a half buns out of five. That's a record.", delivery: 'grudging and haughty' },
  { id: 'react2.1', who: 'vernon', moment: 'react.2', text: "[sigh] A solid meh. I'll write about it.", delivery: 'haughty, unimpressed' },
  { id: 'react2.2', who: 'vernon', moment: 'react.2', text: 'Competent. Forgettable. Like most things.', delivery: 'haughty, unimpressed' },
  { id: 'react1.1', who: 'vernon', moment: 'react.1', text: "I've had warmer welcomes from a vending machine.", delivery: 'deeply unimpressed' },
  { id: 'react1.2', who: 'vernon', moment: 'react.1', text: 'My followers will hear about this. All eleven of them.', delivery: 'deeply unimpressed' },
  { id: 'reactGross.1', who: 'vernon', moment: 'react.gross', text: 'This will be my most read post ever.', delivery: 'grim, quietly delighted' },
  { id: 'extra.1', who: 'vernon', moment: 'complain.extra', each: 'ing', text: 'There are {ings} on this. I said no {ings}. I will be writing about this.', delivery: 'haughty and fussy' },
  { id: 'unasked.1', who: 'vernon', moment: 'complain.unasked', each: 'ing', text: 'I did not order {ings}. And yet. Here we are.', delivery: 'haughty and fussy' },
  { id: 'missing.1', who: 'vernon', moment: 'complain.missing', each: 'ing', text: 'No {ing}. A bold choice. A wrong choice.', delivery: 'haughty and fussy' },
  { id: 'done.1', who: 'vernon', moment: 'complain.done', each: 'want', text: 'I said {want}. I could tell from across the room.', delivery: 'haughty and fussy' },

  /* ── Sal: gruff, loud, a bit crude; sells hot dogs out front, never eats them ─ */
  { id: 'greet.1', who: 'sal', moment: 'greet', text: "Yo. I'm on my break. Feed me." },
  { id: 'greet.2', who: 'sal', moment: 'greet', text: "Ay. Twelve hours sellin' hot dogs. You know what's in a hot dog? I do. That's why I'm here." },
  { id: 'greet.3', who: 'sal', moment: 'greet', text: "Lemme get somethin' that ain't a hot dog. I'm beggin' ya." },
  // order.dislike: said after an order that leaves off something he never takes (pack.js dislikes: lettuce).
  { id: 'dislike.1', who: 'sal', moment: 'order.dislike', text: 'Lettuce is for rabbits. Do I look like a rabbit?' },
  { id: 'dislike.2', who: 'sal', moment: 'order.dislike', text: "Keep the salad off it. My doctor ain't the boss of me." },
  { id: 'react3.1', who: 'sal', moment: 'react.3', text: "Now THAT'S a burger. I'm gonna have to unbutton my pants." },
  { id: 'react3.2', who: 'sal', moment: 'react.3', text: "Mm. Oh, that's beautiful. Don't tell nobody I said somethin' nice." },
  { id: 'favourite.1', who: 'sal', moment: 'react.favourite', text: "Bacon! Now we're talkin'! [laughing] My doctor's gonna kill me." },
  { id: 'favourite.2', who: 'sal', moment: 'react.favourite', text: "A bacon cheeseburger, done right. I could cry. I won't. But I could." },
  { id: 'react2.1', who: 'sal', moment: 'react.2', text: "Eh. It's fine. I've had worse. I sell worse." },
  { id: 'react2.2', who: 'sal', moment: 'react.2', text: 'Close. Not perfect. Like my brother-in-law.' },
  { id: 'react1.1', who: 'sal', moment: 'react.1', text: 'What is this? Even the pigeons out front would send this back.' },
  { id: 'react1.2', who: 'sal', moment: 'react.1', text: "Ugh. This is worse than my hot dogs. And I know what's in my hot dogs." },
  { id: 'reactGross.1', who: 'sal', moment: 'react.gross', text: "Oh, that's nasty! I ride the subway every day, and that's the nastiest thing I ever seen!" },
  { id: 'extra.1', who: 'sal', moment: 'complain.extra', each: 'ing', text: "Ay! I said no {ings}! My stomach's gonna hold a grudge." },
  { id: 'unasked.1', who: 'sal', moment: 'complain.unasked', each: 'ing', text: "Who put {ings} on here? I didn't order no {ings}!" },
  { id: 'missing.1', who: 'sal', moment: 'complain.missing', each: 'ing', text: "Hey! Where's the {ing}? I'm payin' for {ing} here." },
  { id: 'done.1', who: 'sal', moment: 'complain.done', each: 'want', text: "I said {want}! This ain't {want}. Ask anybody." },
] });
