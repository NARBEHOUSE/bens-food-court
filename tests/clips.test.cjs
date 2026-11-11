/** The clips the voice pass records (2b-seams, 2026-11-09; docs/api/script.md 5): every value a line's words can take is
 *  its own clip, and the page asks for exactly that clip. A pick of a size or a flavour (the Burger Bar's drinks, `of`)
 *  lists its values; a line with {name} or {goal} (words the page passes: a customer's, an event's, a restaurant's
 *  name, a goal) is recorded once per value, its clip id ending in the words' key, and never with the speaker's own
 *  name standing in. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { restaurants, courtScript, CAST, SC, W } = require('./bot.cjs');
const COURT = require('../packs/court/court.js');

const R = id => restaurants().find(r => r.id === id && !r.error);

test('a size or flavour pick (`of`) lists every value, in the words the judge\'s mistake gives them', t => {
  const D = R('diner');
  if (!D) { t.skip('the diner is not loaded (BB_PACKS)'); return; }
  // voicecut (2026-11-10): Mitch reads a wrong pick ({wanted}); the customer's complaint names no food.
  const line = D.script.lines.find(l => l.moment === 'mistake.pick' && l.each === 'wanted' && l.who === 'mitch');
  assert.ok(line, 'Mitch reads a wrong pick with {wanted}');
  const values = SC.valuesFor(D.pack, line);
  for (const v of ['fries', 'rings', 'small', 'medium', 'large', 'cola', 'lemonLime', 'orangeSoda', 'lemonade', 'icedTea']) assert.ok(values.includes(v), v);
  // The page fills the line from the judge's mistake: the same clip, the same words.
  for (const m of [{ kind: 'pick', of: 'size', want: 'small', got: 'large' }, { kind: 'pick', of: 'flavour', want: 'lemonLime', got: 'cola' }]) {
    const said = SC.pick(D.pack, D.script, 'mitch', 'mistake.pick', m, null, () => 0.999, null);
    const clips = SC.everyClip(D.pack, D.script, { customers: ['sal'] });
    const rec = clips.find(c => c.clip === said.clip);
    assert.ok(rec, said.clip + ' is in the clip list');
    assert.strictEqual(rec.text, said.text, said.clip + ': the recording\'s words are the words the page says');
  }
});

test('{name}: an event line is recorded with the event\'s name, once per event, never the speaker\'s name', t => {
  const D = R('diner');
  if (!D) { t.skip('the diner is not loaded (BB_PACKS)'); return; }
  const said = Object.fromEntries(COURT.restaurants.map(r => [r.pack, r.said]));
  const clips = SC.everyClip(D.pack, D.script, { customers: D.pack.regulars.map(c => c.id), said });
  const ev = clips.filter(c => /^event\./.test(c.moment));
  assert.ok(ev.length >= 6, 'the event lines are listed');
  const name = D.pack.events.five.name;
  for (const c of ev) {
    assert.ok(c.text.includes(name), c.clip + ': ' + c.text);
    assert.ok(c.clip.endsWith('.theBurgerEatingContest'), c.clip + ' carries the name\'s key');
  }
  // The page asks for the same clip.
  const one = SC.pick(D.pack, D.script, 'mitch', 'event.intro', { name }, null, () => 0, null);
  assert.ok(ev.some(c => c.clip === one.clip && c.text === one.text), one.clip);
  assert.deepStrictEqual(clips.filter(c => /\{|\}/.test(c.text)).map(c => c.clip), [], 'every blank filled (a mention\'s {about} from BBCourt\'s said)');
});

test('{name} with a changing blank: Mitch\'s `nearly` with the customer\'s name, one clip per customer and value', t => {
  const P = R('pizza');
  if (!P) { t.skip('the pizza is not loaded (BB_PACKS)'); return; }
  // voicecut: no pack's `nearly` names the customer now (one clip per value, not per customer too); the engine still
  // lists a {name} line once per customer and value, so a test line stands in.
  assert.ok(!restaurants().some(r => !r.error && r.script.lines.some(l => l.moment === 'nearly' && /\{name\}/.test(l.text))), 'no nearly line names a customer');
  const line = { id: 'nearly.t', who: 'mitch', moment: 'nearly', each: 'want', text: "Nearly {want}. That's what {name} wanted.", src: 'pizza' };
  const customers = P.pack.regulars.map(c => c.id);
  const clips = SC.everyClip(P.pack, { lines: P.script.lines.concat([line]) }, { customers }).filter(c => c.clip.startsWith('mitch/pizza:' + line.id + '.'));
  const wants = SC.valuesFor(P.pack, line);
  assert.strictEqual(clips.length, wants.length * customers.length, 'every value for every customer');
  const tony = P.pack.regulars.find(c => c.id === 'tony');
  const said = SC.pick(P.pack, { lines: [line] }, 'mitch', 'nearly', { want: wants[0], name: tony.name }, null, () => 0, null);
  assert.ok(clips.some(c => c.clip === said.clip && c.text === said.text), said.clip + ' is recorded with Tony\'s name');
  assert.ok(said.clip.endsWith('.' + wants[0] + '.tony'), said.clip);
});

test('a line without {name} keeps its clip id whatever name the page passes (the Burger Bar\'s recordings)', t => {
  const D = R('diner');
  if (!D) { t.skip('the diner is not loaded (BB_PACKS)'); return; }
  const line = D.script.lines.find(l => l.moment === 'nearly' && !/\{name\}/.test(l.text));
  assert.strictEqual(SC.clipId(line, 'mitch', { want: 'mediumWell', name: 'Marge' }), 'mitch/' + line.id + '.mediumWell');
});

test('the court\'s {name} lines: once per restaurant, the page\'s clip among them', t => {
  const cs = courtScript();
  if (!cs) { t.skip('no court script'); return; }
  const court = SC.court(cs), names = COURT.restaurants.map(r => r.name);
  const clips = SC.everyClip(null, court, { customers: [], names, goals: ['get every open restaurant to two stars'] });
  const unlock = clips.filter(c => c.moment === 'court.unlock');
  const lines = court.lines.filter(l => l.moment === 'court.unlock');
  assert.strictEqual(unlock.length, lines.length * names.length, 'every unlock line for every restaurant');
  const said = SC.pick(null, court, 'mitch', 'court.unlock', { name: "Ben's Smoothie Shack" }, null, () => 0, null);
  assert.ok(said.clip.endsWith('.bensSmoothieShack'), said.clip);
  assert.ok(unlock.some(c => c.clip === said.clip && c.text === said.text), said.clip + ' is listed with its words');
  assert.ok(!clips.some(c => /\{|\}/.test(c.text)), 'every blank filled');
});

test('voicecut: every mistake the judge can make is read by Mitch from a listed clip, in grammatical words', () => {
  for (const Rr of restaurants().filter(r => !r.error)) {
    const pack = Rr.pack, script = Rr.script;
    const listed = new Map(SC.everyClip(pack, script, { customers: [] }).map(c => [c.clip, c.text]));
    const steps = Object.values(pack.stations).flatMap(st => st.steps);
    const mistakes = [];
    steps.filter(st => st.kind === 'add').forEach(st => {
      if ((st.max || 1) > 1) for (let w = 0; w <= st.max; w++) mistakes.push({ kind: 'count', ing: st.ing, want: w, got: w === st.max ? w - 1 : w + 1 });
      else mistakes.push({ kind: 'extra', ing: st.ing, held: true }, { kind: 'extra', ing: st.ing, held: false }, { kind: 'missing', ing: st.ing });
    });
    steps.filter(st => st.kind === 'pick' && st.slot !== undefined).forEach(st => {
      pack.slots[st.slot].values.forEach(v => mistakes.push({ kind: 'pick', of: 'slot', slot: st.slot, want: v.id, got: null }));
      if (st.repeat) for (let w = 1; w <= st.repeat.max; w++) mistakes.push({ kind: 'count', of: 'slot', slot: st.slot, want: w, got: w < st.repeat.max ? w + 1 : w - 1 }, { kind: 'count', of: 'slot', slot: st.slot, want: w, got: w - 1 });
    });
    steps.filter(st => st.kind === 'pick' && st.from).forEach(st => st.from.forEach(v => mistakes.push({ kind: 'pick', of: 'ing', want: v, got: null })));
    [...new Set(Object.values(pack.stageSets || {}).flatMap(x => x.choose || []))].forEach(v => mistakes.push({ kind: 'done', ing: 'x', want: v, got: 'y' }));
    const moment = m => (m.kind === 'count' ? (m.want > m.got ? 'mistake.tooFew' : 'mistake.tooMany') : m.kind === 'extra' && !m.held ? 'mistake.unasked' : 'mistake.' + m.kind);
    for (const m of mistakes) {
      if (m.kind === 'count' && m.want === m.got) continue;
      const said = SC.pick(pack, script, 'mitch', moment(m), m, null, () => 0, null);
      assert.ok(said, Rr.id + ': Mitch has a line for ' + moment(m));
      assert.ok(!/[{}]|undefined|null/.test(said.text), Rr.id + ': ' + said.text);
      assert.ok(!/\bone \w+s\b|\bnone \w|\bno none\b/.test(said.text), Rr.id + ' reads badly: ' + said.text);
      assert.strictEqual(listed.get(said.clip), said.text, Rr.id + ': ' + said.clip + ' is listed with the words the page says');
    }
  }
});
