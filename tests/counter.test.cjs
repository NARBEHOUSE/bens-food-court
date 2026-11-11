/** The counter pictures' own layouts (2b-seams, 2026-11-09; docs/api/page.md 7): every restaurant whose art has a
 *  counter backdrop has its picture's measured layout in its manifest (BBArt.<pack>.counter), copied by
 *  tools/build_art.py from art-source/backdrops/<picture>.layout.json, with sane numbers: the painted queue right of the
 *  served customer and above the counter line, the horizon in spec 5.2's band, the blank sign board above the queue. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const GAME = path.join(__dirname, '..');
const at = (...p) => path.join(GAME, ...p);
const ONLY = process.env.BB_PACKS ? process.env.BB_PACKS.split(',').map(s => s.trim()).filter(Boolean) : null;
const COURT = require(at('packs/court/court.js'));
const PACKS = COURT.restaurants.map(r => r.pack).filter(id => !ONLY || ONLY.includes(id));
const LINE = 0.80;                                         // every counter set's line (spec 5.2)
const KEYS = ['queue', 'heads', 'feet', 'eyes', 'horizon', 'sign'];
const sourceOf = id => at('art-source', 'backdrops', (id === 'diner' ? 'counter' : id + '-counter') + '.layout.json');
const manifestOf = id => {
  const f = at('packs', id, 'art', 'manifest.js');
  if (!fs.existsSync(f)) return null;
  delete require.cache[require.resolve(f)];
  return require(f);
};
const frac = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

for (const id of PACKS) {
  test(id + ': the counter picture has its own measured layout in BBArt.' + id + '.counter', t => {
    const M = manifestOf(id);
    if (!M || !(M.backdrops || []).includes('counter')) { t.skip(id + ': no counter backdrop yet'); return; }
    const C = M.counter;
    assert.ok(C && typeof C === 'object', id + ': the manifest has no counter layout: measure art-source/backdrops/' + path.basename(sourceOf(id)) + ' and run tools/build_art.py');
    // The manifest is up to date with the layout file beside the picture.
    assert.ok(fs.existsSync(sourceOf(id)), path.basename(sourceOf(id)) + ' is beside the picture');
    const src = JSON.parse(fs.readFileSync(sourceOf(id), 'utf8'));
    assert.deepStrictEqual(Object.fromEntries(KEYS.map(k => [k, src[k]])), Object.fromEntries(KEYS.map(k => [k, C[k]])),
      id + ': the manifest matches ' + path.basename(sourceOf(id)) + ' (run tools/build_art.py)');
    const pic = sourceOf(id).replace(/\.layout\.json$/, '.png');
    if (fs.existsSync(pic) && fs.statSync(pic).mtimeMs > fs.statSync(sourceOf(id)).mtimeMs + 1000) t.diagnostic(id + ': the picture is newer than its layout: measure it again');
    // The painted queue: three people right of the served customer (centred at 24%, the quiet part to 55%), not past
    // the picture's edge; their heads above their feet, their feet above the counter line.
    const [x0, x1] = C.queue;
    assert.ok(Array.isArray(C.queue) && C.queue.length === 2 && frac(x0) && frac(x1), id + ': queue is [x0, x1]');
    assert.ok(x0 >= 0.45 && x1 <= 0.98 && x1 - x0 >= 0.12 && x1 - x0 <= 0.45, id + ': the queue at ' + x0 + '-' + x1);
    assert.ok(frac(C.heads) && frac(C.feet) && C.heads >= 0.25 && C.heads < C.feet && C.feet < LINE, id + ': heads ' + C.heads + ', feet ' + C.feet);
    assert.ok(frac(C.eyes) && C.eyes > C.heads && C.eyes < C.feet, id + ': the eye line inside the queue');
    // The served customer's eyes: spec 5.2's "about 45 to 48% of the picture".
    assert.ok(C.horizon >= 0.45 && C.horizon <= 0.48, id + ': horizon ' + C.horizon + ' in spec 5.2\'s 0.45-0.48');
    // The blank sign board (or none), across the top, above the queue's heads.
    if (C.sign !== null) {
      assert.ok(Array.isArray(C.sign) && C.sign.length === 4 && C.sign.every(frac), id + ': sign is [x0, y0, x1, y1]');
      const [s0, t0, s1, t1] = C.sign;
      assert.ok(s0 < s1 && t0 < t1 && s1 - s0 >= 0.1 && t1 - t0 >= 0.03, id + ': the sign is a board, not a sliver');
      assert.ok(t1 < C.heads - 0.05, id + ': the sign is well above the queue');
    }
  });
}

test('every counter picture in art-source has its layout file, and only counter pictures do', () => {
  const dir = at('art-source', 'backdrops');
  const files = fs.readdirSync(dir);
  for (const f of files.filter(f => /(^|-)counter\.png$/.test(f))) assert.ok(files.includes(f.replace(/\.png$/, '.layout.json')), f + ' has no layout file beside it');
  for (const f of files.filter(f => /\.layout\.json$/.test(f))) assert.ok(/(^|-)counter\.layout\.json$/.test(f) && files.includes(f.replace(/\.layout\.json$/, '.png')), f + ': a layout for a counter picture that exists');
});
