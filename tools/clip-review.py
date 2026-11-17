"""Clip review (2026-11-16): did the full run's failed VoxCPM takes really sound bad, or only fail the tighter clip
ceiling (CLIP 0.2 per mille, was 0.5)? The fallback deletes failed takes, so they were copied to voice-source/clip-review
first (pending.json + takes/). This builds a blind A/B page: the saved VoxCPM take (through the same export filter as the
game's mp3) against the clip the run chose, and serves it with votes saved to voice-source/clip-review/votes.json.

  clip-review.py build     sample + export mp3s + page (key in key.json)
  clip-review.py serve N   serve on 127.0.0.1:N
  clip-review.py report    votes x key: what was heard per group
"""
import json, random, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
GAME = TOOLS.parent
sys.path.insert(0, str(TOOLS))
REV = GAME / 'voice-source' / 'clip-review'
FULL = GAME / 'voice-source' / 'full'
CLIP, CLEAR, MAX_RATE, SLACK = 0.2, 3.0, 4.6, 0.25
RND = ''
if '--round' in sys.argv:
    i = sys.argv.index('--round'); RND = '' if sys.argv[i + 1] == '1' else sys.argv[i + 1]; del sys.argv[i:i + 2]
PAGE_DIR, KEY, VOTES = REV / f'page{RND}', REV / f'key{RND}.json', REV / f'votes{RND}.json'


def why(b, words):
    r = []
    if b['clip'] > CLIP: r.append('clipping')
    if b.get('drift'): r.append('pitch drift')
    if b['clarity'] < CLEAR: r.append('clarity')
    if len(b['diffs']) > (1 if words > 8 else 0): r.append('words')
    if b['rate'] > MAX_RATE: r.append('too fast')
    return r


def build():
    import importlib
    vp = importlib.import_module('voice-pilot')
    pend = json.loads((REV / 'pending.json').read_text(encoding='utf-8'))
    mans = {}
    rows = []
    for clip, p in pend.items():
        c, b = p['c'], p['best']
        man = mans.setdefault(c['pack'], json.loads((FULL / 'packs' / c['pack'] / 'voice' / 'manifest.json').read_text(encoding='utf-8')))
        e = man.get(clip)
        if not e:
            continue
        w = why(b, max(1, len(c['text'].split())))
        rows.append(dict(clip=clip, c=c, b=b, e=e, why=w))
    rng = random.Random(16)
    rng.shuffle(rows)
    only_clip = [r for r in rows if r['why'] == ['clipping'] and r['e']['model'] == 'qwen']
    mitch_ret = [r for r in only_clip if r['c']['speaker'] == 'mitch' and r['c']['moment'] == 'court.return']
    others_clip = [r for r in only_clip if r not in mitch_ret]
    other_fail = [r for r in rows if 'clipping' not in r['why'] and r['e']['model'] == 'qwen']
    if RND == '2':
        heard = {k['clip'] for k in json.loads((REV / 'key.json').read_text(encoding='utf-8')).values()}
        pool = [r for r in other_fail if 'words' not in r['why'] and r['clip'] not in heard]
        print(f'round 2 pool: {len(pool)} (other failures -> qwen, no word failures, not heard)')
        pick = [('Pitch drift / clarity failures, replaced by Qwen', pool[:20])]
    else:
      pick = [('Mitch, food-court return (clipping only)', mitch_ret[:12]),
              ('Others (clipping only)', others_clip[:10]),
              ('Other failures (drift / clarity / words)', other_fail[:6])]
    items, key = [], {}
    (PAGE_DIR / 'audio').mkdir(parents=True, exist_ok=True)
    n = 0
    for group, rs in pick:
        for r in rs:
            n += 1
            c = r['c']
            fx = vp.SPEC['pa'].get('r12', {}).get('effect') if c['speaker'] == 'pa' else None
            vox = PAGE_DIR / 'audio' / f'{n:02d}-vox.mp3'
            vp.export_fx(REV / r['b']['wav'], vox, fx)
            final = FULL / 'packs' / c['pack'] / 'voice' / r['e']['file']
            fin = PAGE_DIR / 'audio' / f'{n:02d}-final.mp3'
            fin.write_bytes(final.read_bytes())
            vox_is_a = rng.random() < 0.5
            a, bb = (vox, fin) if vox_is_a else (fin, vox)
            items.append({'n': n, 'group': group, 'who': c['speaker'].capitalize(), 'text': c['text'], 'delivery': c.get('delivery', ''),
                          'a': 'audio/' + a.name, 'b': 'audio/' + bb.name})
            key[str(n)] = {'clip': r['clip'], 'vox': 'A' if vox_is_a else 'B', 'why': r['why'], 'vox_clip': r['b']['clip'],
                           'vox_clarity': r['b']['clarity'], 'final_model': r['e']['model'], 'final_clarity': r['e']['clarity'],
                           'vox_wav': r['b']['wav']}
    KEY.write_text(json.dumps(key, indent=1), encoding='utf-8')
    (PAGE_DIR / 'index.html').write_text(PAGE.replace('/*DATA*/null', json.dumps(items, ensure_ascii=False)), encoding='utf-8')
    print(f'{n} pairs:', ', '.join(f'{g} {len(rs)}' for g, rs in pick))
    print(f'pool: clipping-only -> qwen {len(only_clip)} (Mitch return {len(mitch_ret)}); other failures -> qwen {len(other_fail)}')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(PAGE_DIR), **k)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path == '/votes':
            v = VOTES
            body = v.read_bytes() if v.exists() else b'{}'
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != '/votes':
            self.send_error(404); return
        data = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        VOTES.write_text(json.dumps(data, indent=1), encoding='utf-8')
        self.send_response(204); self.end_headers()

    def log_message(self, *a):
        pass


def report():
    key = json.loads(KEY.read_text(encoding='utf-8'))
    votes = json.loads(VOTES.read_text(encoding='utf-8'))
    items = {str(i['n']): i for i in json.loads((PAGE_DIR / 'index.html').read_text(encoding='utf-8').split('const D = ')[1].split(';\n')[0])}
    by = {}
    for n, k in key.items():
        v = votes.get(n, {})
        vox_side, fin_side = k['vox'], 'B' if k['vox'] == 'A' else 'A'
        g = by.setdefault(items[n]['group'], [])
        g.append((n, v.get(vox_side), v.get(fin_side), v.get('pref'), k, v.get('note', '')))
    for g, rs in by.items():
        print(f'\n== {g}')
        for n, vv, fv, pref, k, note in rs:
            p = {'A': 'vox' if k['vox'] == 'A' else 'final', 'B': 'vox' if k['vox'] == 'B' else 'final'}.get(pref, pref)
            print(f"{n:>3} {k['clip']:<45} vox={vv} final={fv} prefer={p} (vox clip {k['vox_clip']}, {'+'.join(k['why'])}) {note}")


PAGE = r'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Failed takes check</title><style>
:root{--bg:#fbf8f2;--ink:#1d1a16;--soft:#6b645b;--card:#fff;--line:#e4ddd0;--on:#1f6fd1;--onink:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#1b1916;--ink:#eee8de;--soft:#a69d90;--card:#25221e;--line:#3a352e}}
body{background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,sans-serif;margin:0 auto;max-width:820px;padding:16px}
h1{font-size:1.45em;margin:.2em 0}h2{font-size:1.1em;margin:1.4em 0 .3em}.soft{color:var(--soft)}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:10px 0}
.say{font-weight:600}.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.lab{font-weight:700;min-width:1.4em}audio{height:36px;max-width:100%}
button{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--ink);cursor:pointer;min-height:40px}
button[aria-pressed=true]{background:var(--on);color:var(--onink);border-color:var(--on)}
input[type=text]{font:inherit;width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
#prog{position:sticky;top:0;background:var(--bg);padding:6px 0;border-bottom:1px solid var(--line)}
</style>
<h1>Failed takes: do they actually sound bad?</h1>
<p class="soft">Each line has two versions in random order. One is the expressive VoxCPM take that failed the automatic
checks; the other is what the run used instead (usually Qwen, cleaner but flat). For each version: does it sound
<b>fine</b>, a <b>little rough</b>, or <b>bad</b>? Then pick the one you'd ship. Saved as you go.</p>
<div id="prog"></div><div id="list"></div>
<script>
const D = /*DATA*/null;
let V = {};
const save = () => fetch('/votes', {method: 'POST', body: JSON.stringify(V)});
function prog() { const done = D.filter(i => V[i.n] && V[i.n].A && V[i.n].B && V[i.n].pref).length;
  document.getElementById('prog').textContent = done + ' of ' + D.length + ' done'; }
function btns(i, field, opts) { const r = document.createElement('span');
  for (const [k, l] of opts) { const b = document.createElement('button'); b.textContent = l;
    const paint = () => b.setAttribute('aria-pressed', String((V[i.n] || {})[field] === k)); paint();
    b.onclick = () => { V[i.n] = V[i.n] || {}; V[i.n][field] = V[i.n][field] === k ? '' : k; r.querySelectorAll('button').forEach(x => x._p()); prog(); save(); };
    b._p = paint; r.append(b); } return r; }
fetch('/votes').then(r => r.json()).then(v => { V = v || {}; let g = '';
  const L = document.getElementById('list');
  for (const i of D) {
    if (i.group !== g) { g = i.group; const h = document.createElement('h2'); h.textContent = g; L.append(h); }
    const c = document.createElement('div'); c.className = 'card';
    c.innerHTML = '<div class="soft">' + i.n + '. ' + i.who + ' <span class="del"></span></div><div class="say"></div>';
    c.querySelector('.say').textContent = i.text; c.querySelector('.del').textContent = i.delivery ? '(' + i.delivery + ')' : '';
    for (const s of ['A', 'B']) { const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = '<span class="lab">' + s + '</span>'; const a = document.createElement('audio'); a.controls = true; a.preload = 'none';
      a.src = i[s.toLowerCase()]; row.append(a, btns(i, s, [['fine', 'Fine'], ['little', 'Little rough'], ['bad', 'Bad']])); c.append(row); }
    const pr = document.createElement('div'); pr.className = 'row'; pr.innerHTML = '<span>Ship:</span>';
    pr.append(btns(i, 'pref', [['A', 'A'], ['B', 'B'], ['same', 'Either']])); c.append(pr);
    const nt = document.createElement('input'); nt.type = 'text'; nt.placeholder = 'Note (optional)'; nt.value = (V[i.n] || {}).note || '';
    nt.oninput = () => { V[i.n] = V[i.n] || {}; V[i.n].note = nt.value; save(); }; c.append(nt);
    L.append(c); }
  prog(); });
</script>'''

def swap(nums):
    """clip-review.py [--round N] swap 9,13,...: the saved VoxCPM take becomes the staged clip (Bryan preferred it)."""
    import importlib
    vp = importlib.import_module('voice-pilot')
    key = json.loads(KEY.read_text(encoding='utf-8'))
    pend = json.loads((REV / 'pending.json').read_text(encoding='utf-8'))
    mans = {}
    for n in nums:
        k = key[str(n)]
        p = pend[k['clip']]
        c, b = p['c'], p['best']
        mp = FULL / 'packs' / c['pack'] / 'voice' / 'manifest.json'
        man = mans.setdefault(mp, json.loads(mp.read_text(encoding='utf-8')))
        e = man[k['clip']]
        fx = vp.SPEC['pa'].get('r12', {}).get('effect') if c['speaker'] == 'pa' else None
        vp.export_fx(REV / b['wav'], FULL / 'packs' / c['pack'] / 'voice' / e['file'], fx)
        man[k['clip']] = dict(e, model='voxcpm', seed=b.get('seed'), heard=b['said'], clarity=b['clarity'], pitch=b['pitch'],
                              flag=False, ear_ok='clip-review' + (RND or '1'))
        print('swapped', n, k['clip'])
    for mp, man in mans.items():
        mp.write_text(json.dumps(man, indent=1, sort_keys=True), encoding='utf-8')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    if cmd == 'build':
        build()
    elif cmd == 'serve':
        port = int(sys.argv[2]) if len(sys.argv) > 2 else 8838
        print(f'Clip review: http://127.0.0.1:{port}/', flush=True)
        ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
    elif cmd == 'report':
        report()
    elif cmd == 'swap':
        swap([int(x) for x in sys.argv[2].split(',')])
