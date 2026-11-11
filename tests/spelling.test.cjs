'use strict';
/* Ben's Food Court - the words players read and hear use US spelling (phase 3 fix: the characters are American, and
 * "favourite" on the receipt sat next to "favorite" in Gus's mouth). Code identifiers keep their spelling
 * (look.colour, C.favourite, the moment react.favourite, the slot shakeFlavour); only text is checked: every script
 * line's text, every help, name, say, plural, label and redo in the packs, and the page's own words in js/.
 * "Colour Profile" is the hub's own name for that Settings row (spec 6.4, as in the other hub games), so it stays.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const G = path.join(__dirname, '..');

const BRITISH = /\b(favourites?|flavour(s|ed|ful)?|colour(s|ed|ful)?|grey(er)?|apologis(e|ed|es|ing)|practis(e|ed|ing)|honour(s|ed)?|parlour|cosy|tyres?|recognis(e|ed)|realis(e|ed)|organis(e|ed)|visualis(e|ed)|defence|harbour|neighbour(s|hood)?|centimetres?|millilitres?|litres?|metres?|centre|theatre|cancell(ed|ing)|humour|behaviour|savoury|odour|rumour|armour|labour|favours?|jewellery|yoghurt|travell(ed|ing)|whilst|mum)\b/i;
const KEYS = new Set(['text', 'help', 'name', 'say', 'plural', 'label', 'short', 'stop', 'redo', 'title', 'sub', 'words', 'goal', 'board', 'single']);

function strings(v, key, out, where) {
  if (typeof v === 'string') { if (KEYS.has(key)) out.push([where, v]); return out; }
  if (Array.isArray(v)) { v.forEach(x => strings(x, key, out, where)); return out; }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) strings(v[k], k, out, where + '.' + k);
  return out;
}

/** The string literals in a script ('...', "...", `...`), comments skipped. */
function literals(src) {
  const out = [];
  for (let i = 0; i < src.length; i++) {
    if (src.startsWith('//', i)) { const j = src.indexOf('\n', i); i = j < 0 ? src.length : j; continue; }
    if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 1; continue; }
    const q = src[i];
    if (q !== "'" && q !== '"' && q !== '`') continue;
    let j = i + 1;
    while (j < src.length && src[j] !== q && !(src[j] === '\n' && q !== '`')) j += src[j] === '\\' ? 2 : 1;
    out.push(src.slice(i + 1, j));
    i = j;
  }
  return out;
}

test('every pack, script, the cast and the court: player text in US spelling', () => {
  const bad = [];
  let n = 0;
  for (const d of fs.readdirSync(path.join(G, 'packs'))) {
    const dir = path.join(G, 'packs', d);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter(x => /^(pack|script|cast|court)\.js$/.test(x))) {
      for (const [where, s] of strings(require(path.join(dir, f)), '', [], d + '/' + f)) {
        n++;
        const m = s.match(BRITISH);
        if (m) bad.push(where + ': "' + m[0] + '" in ' + s.slice(0, 90));
      }
    }
  }
  assert.ok(n > 2000, 'read the packs\' text (' + n + ' strings)');
  assert.deepEqual(bad, []);
});

test("the page's own words (js/): US spelling in quoted text", () => {
  const bad = [];
  for (const f of ['stage.js', 'ui.js', 'game.js', 'court.js', 'world.js', 'core/words.js', 'core/court.js']) {
    const code = fs.readFileSync(path.join(G, 'js', f), 'utf8');
    // Quoted text with a space in it (a sentence or a label), not an identifier.
    for (const s of literals(code)) {
      if (!s.includes(' ') || /Colour Profile/.test(s)) continue;
      const b = s.match(BRITISH);
      if (b) bad.push(f + ': "' + b[0] + '" in ' + s.slice(0, 90));
    }
  }
  assert.deepEqual(bad, []);
});
