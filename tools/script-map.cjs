/** Ben's Food Court - which script line each recorded clip comes from (for applying script reviews).
 *
 *  node tools/script-map.cjs <clips.json> <out.json>
 *
 *  clips.json: [{clip}] (e.g. voice-source/script-audit.json flattened, or voice-clips.cjs output). For each clip id
 *  (<speaker>/<pack>:<id>, or <speaker>/<id> for the diner) the source line: its file, its line object, and the
 *  fill-ins when the line has blanks ({name}, {about}, {wanted}...). Read-only.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const G = path.join(__dirname, '..');
const PACKS = ['diner', 'burrito', 'cafe', 'icecream', 'pizza', 'smoothie', 'sushi', 'cast', 'court'];
const files = {};
for (const p of PACKS) {
  const f = path.join(G, 'packs', p, 'script.js');
  if (fs.existsSync(f)) files[p] = { file: path.relative(G, f).replace(/\\/g, '/'), lines: require(f).lines };
}

function find(clip) {
  const [speaker, rest] = clip.split('/');
  let [pack, id] = rest.includes(':') ? rest.split(':') : ['diner', rest];
  const lines = (files[pack] || {}).lines || [];
  // a 'customer' fallback line said by a speaker: <speaker>/<pack>:customer.<id>
  const fallback = id.startsWith('customer.');
  if (fallback) id = id.slice('customer.'.length);
  // exact id first, then the longest line id the clip id extends (a blank's value appended: goldSign.1.bensBurritos)
  const mine = l => fallback ? l.who === 'customer' : l.who === speaker;
  let hit = lines.find(l => l.id === id && l.who === speaker) || lines.find(l => l.id === id && mine(l));
  if (!hit) {
    hit = lines.filter(l => mine(l) && id.startsWith(l.id + '.')).sort((a, b) => b.id.length - a.id.length)[0];
  }
  return hit ? { clip, speaker, pack, file: files[pack].file, line: hit, suffix: id.slice(hit.id.length + 1) || null } : { clip, speaker, pack, missing: true };
}

const [inp, out] = process.argv.slice(2);
const clips = JSON.parse(fs.readFileSync(inp, 'utf8')).map(c => typeof c === 'string' ? c : c.clip);
const res = clips.map(find);
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.error(`${res.length} clips, ${res.filter(r => r.missing).length} not found`);
