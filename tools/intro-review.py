"""Ben's Food Court - a review page for the order.intro lead-ins (the DRAFT block in packs/cast/script.js).

  python tools/intro-review.py [port]        (default 8830; any Python 3, needs node on PATH)

One card per character (picture, who they are, their voice), each lead-in with Keep / Edit / Cut, a note, and a
read-aloud button (the browser's own voice: only for the rhythm, not the final voice). Decisions save as they are made
to voice-source/intro-review.json, keyed <speaker>/<id>; applying them to script.js is a separate step. This page
changes nothing in the game. Served on this PC only.
"""
import json
import re
import subprocess
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
STORE = GAME / 'voice-source' / 'intro-review.json'

DUMP = r"""
const path = require('path'); const G = process.argv[1];
const cast = require(path.join(G, 'packs/cast/cast.js')); const script = require(path.join(G, 'packs/cast/script.js'));
const lines = script.lines.filter(l => l.moment === 'order.intro');
const order = []; for (const l of lines) if (!order.includes(l.who)) order.push(l.who);
const people = order.map(w => { const p = cast.people[w] || {};
  return { who: w, name: p.name || w, art: p.art || null, role: p.role || '', about: p.who || '', voice: p.voice || '' }; });
console.log(JSON.stringify({ people, lines: lines.map(l => ({ key: l.who + '/' + l.id, who: l.who, id: l.id, text: l.text, delivery: l.delivery || '' })) }));
"""


MODE = 'intro'   # 'fixes': the script audit (voice-source/script-audit.json), decisions to script-fixes.json
GROUPS = [('template', "Mitch's goal announcements (one template)"), ('year', 'Specific years and dates'),
          ('sense', "Doesn't make sense"), ('fit', "Doesn't fit who says it, or when"),
          ('unseen', "Refers to something the player can't see"), ('weak', 'Weak, or other')]
KIND = {'specific-year': 'year', 'nonsense': 'sense', 'contradiction': 'sense', 'mixed-metaphor': 'sense',
        'wrong-logic': 'sense', 'doesnt-fit-moment': 'fit', 'unseen-reference': 'unseen', 'weak': 'weak', 'other': 'weak'}
TEMPLATE = {'key': 'template/court-goal', 'who': 'template', 'id': 'court-goal',
            'text': "...get the Smoothie Shack and Ben's Sushi to five stars and the Pizza Parlor opens.",
            'delivery': '', 'why': "Mitch's return-to-the-court lines fill in a goal sentence made by the game (js/core/court.js). "
            '"Get X and Y to five stars and Z opens" does not read as an instruction, worst with two names (three "and"s). '
            'One fix in the game code fixes all of them.', 'speakers': ['mitch'], 'variants': 1, 'clips': 264,
            'suggestion': "...get the Smoothie Shack and Ben's Sushi to five stars to open the Pizza Parlor. "
                          '(and "...for the big court celebration" instead of "and the whole court celebrates")', 'conf': 'high'}


def data():
    if MODE == 'fixes':
        audit = json.loads((GAME / 'voice-source' / 'script-audit.json').read_text(encoding='utf-8'))
        people = [{'who': g, 'name': name, 'art': None, 'role': '', 'about': '', 'voice': ''} for g, name in GROUPS]
        lines = [TEMPLATE]
        for i, a in enumerate(audit):
            lines.append({'key': f"{a['clips'][0]}", 'who': KIND.get(a['type'], 'weak'), 'id': a['clips'][0],
                          'text': a['text'], 'delivery': '', 'why': a['why'], 'suggestion': a['suggestion'],
                          'speakers': a['speakers'], 'variants': a.get('variants', 1), 'conf': a['confidence'],
                          'clips': len(a['clips'])})
        cast = subprocess.run(['node', '-e', "const c=require(require('path').join(process.argv[1],'packs/cast/cast.js'));"
                               "console.log(JSON.stringify(Object.fromEntries(Object.entries(c.people).map(([k,p])=>[k,{name:p.name,art:p.art}]))))",
                               str(GAME)], capture_output=True, text=True, encoding='utf-8', check=True)
        order = {g: i for i, (g, _) in enumerate(GROUPS)}
        lines.sort(key=lambda l: (order[l['who']], l.get('conf') != 'high'))
        return {'mode': 'fixes', 'people': people, 'lines': lines, 'cast': json.loads(cast.stdout)}
    out = subprocess.run(['node', '-e', DUMP, str(GAME)], capture_output=True, text=True, encoding='utf-8', check=True)
    return dict(json.loads(out.stdout), mode='intro')


PAGE = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lead-in Review</title>
<style>
:root { --bg:#f5f3ee; --card:#fff; --ink:#1d1b18; --soft:#625c52; --line:#dcd6c9; --chip:#eeeae1;
  --keep:#1a7f37; --keep-bg:#e3f4e8; --edit:#9a6700; --edit-bg:#fdf3d8; --cut:#b42318; --cut-bg:#fde6e3; --accent:#2b6cb0; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#181714; --card:#23211d; --ink:#eeeae2; --soft:#aaa397;
  --line:#3a3731; --chip:#2e2b26; --keep:#56c271; --keep-bg:#1d3324; --edit:#e0b24a; --edit-bg:#3a3018; --cut:#ff8a7a; --cut-bg:#3d211d; --accent:#6aa9f0; } }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:17px/1.5 system-ui, "Segoe UI", sans-serif; }
header { position:sticky; top:0; z-index:5; background:var(--bg); border-bottom:2px solid var(--line); padding:10px 16px; }
.wrap { max-width:960px; margin:0 auto; }
h1 { font-size:22px; margin:0 0 6px; }
.bar { height:12px; background:var(--chip); border-radius:6px; overflow:hidden; }
.bar > div { height:100%; background:var(--keep); width:0; transition:width .2s; }
.row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:8px; }
.soft { color:var(--soft); }
button, .chip { font:inherit; border:2px solid var(--line); background:var(--card); color:var(--ink); border-radius:10px; padding:6px 12px; cursor:pointer; }
button:focus-visible, textarea:focus-visible, input:focus-visible, a:focus-visible { outline:3px solid var(--accent); outline-offset:2px; }
.chip[aria-pressed="true"] { background:var(--ink); color:var(--bg); border-color:var(--ink); }
nav.who { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
nav.who a { display:flex; align-items:center; gap:6px; text-decoration:none; color:var(--ink); background:var(--card); border:2px solid var(--line);
  border-radius:999px; padding:2px 10px 2px 2px; font-size:14px; }
nav.who a.done { border-color:var(--keep); }
nav.who img, nav.who .noimg { width:26px; height:26px; border-radius:50%; object-fit:cover; object-position:top; background:var(--chip); }
main { padding:8px 16px 80px; }
details.rules { background:var(--card); border:2px solid var(--line); border-radius:12px; padding:10px 14px; margin:12px 0; }
details.rules summary { cursor:pointer; font-weight:600; }
section.person { background:var(--card); border:2px solid var(--line); border-radius:14px; margin:16px 0; scroll-margin-top:170px; }
.ph { display:flex; gap:14px; padding:12px 14px; border-bottom:2px solid var(--line); align-items:center; }
.ph img, .ph .noimg { width:88px; height:88px; border-radius:12px; object-fit:cover; object-position:top; background:var(--chip); flex:none; }
.ph h2 { margin:0; font-size:21px; } .ph .meta { font-size:15px; }
.count { margin-left:auto; font-size:14px; white-space:nowrap; }
.line { padding:12px 14px; border-top:1px solid var(--line); }
.line:first-of-type { border-top:none; }
.line[data-st="keep"] { background:var(--keep-bg); } .line[data-st="edit"] { background:var(--edit-bg); } .line[data-st="cut"] { background:var(--cut-bg); }
.say { font-size:20px; font-weight:500; }
.say.was { text-decoration:line-through; color:var(--soft); font-size:16px; font-weight:400; }
.how { font-size:14px; font-style:italic; color:var(--soft); }
.acts { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; align-items:center; }
.acts button[data-a="keep"][aria-pressed="true"] { background:var(--keep); border-color:var(--keep); color:#fff; }
.acts button[data-a="edit"][aria-pressed="true"] { background:var(--edit); border-color:var(--edit); color:#fff; }
.acts button[data-a="cut"][aria-pressed="true"] { background:var(--cut); border-color:var(--cut); color:#fff; }
.acts .speak { margin-left:auto; }
.editbox { display:none; margin-top:8px; } .line[data-st="edit"] .editbox { display:block; }
.line[data-st="kept"] { background:var(--chip); }
.acts button[data-a="keep2"][aria-pressed="true"] { background:var(--ink); border-color:var(--ink); color:var(--bg); }
.who-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:4px; font-size:14px; }
.spk { display:inline-flex; align-items:center; gap:4px; background:var(--chip); border-radius:999px; padding:1px 8px 1px 1px; }
.spk img, .spk .noimg { width:22px; height:22px; border-radius:50%; object-fit:cover; object-position:top; background:var(--line); }
.why { font-style:normal; } .sugg { margin-top:4px; } .small { font-size:13px; }
label { display:block; font-size:14px; color:var(--soft); margin-top:6px; }
textarea, input[type=text] { width:100%; font:inherit; border:2px solid var(--line); border-radius:8px; padding:6px 8px; background:var(--card); color:var(--ink); }
.note { margin-top:6px; } .note input { font-size:15px; }
.hidden { display:none !important; }
#status { font-size:14px; }
@media (max-width:600px) { .ph img, .ph .noimg { width:64px; height:64px; } .say { font-size:18px; } section.person { scroll-margin-top:230px; } }
</style></head><body>
<header><div class="wrap">
  <h1>Lead-in review</h1>
  <div class="bar" aria-hidden="true"><div id="fill"></div></div>
  <div class="row"><span id="prog" class="soft"></span><span id="status" class="soft" role="status"></span></div>
  <div class="row" role="group" aria-label="Show">
    <button class="chip" data-f="all" aria-pressed="true">All</button>
    <button class="chip" data-f="todo" aria-pressed="false">Still to review</button>
    <button class="chip" data-f="edit" aria-pressed="false">Edited</button>
    <button class="chip" data-f="cut" aria-pressed="false">Cut</button>
  </div>
  <nav class="who" id="nav" aria-label="Characters"></nav>
</div></header>
<main class="wrap">
  <details class="rules"><summary>What a lead-in is for (the rules)</summary>
    <p>Customers no longer say their order. They say <b>one short lead-in</b>, then the ticket read-out gives the order.
    A lead-in must <b>name no food</b>, mention <b>nothing that belongs to one restaurant</b>, and still be true for <b>any order</b>
    that isn't their usual or a ridiculous one. Each character has five; one is picked at random each time.</p>
    <p>Keep, Edit or Cut each line. Edited text and notes save as you type. <b>Read aloud</b> uses your browser's voice, only to hear the rhythm.
    Bracketed tags like <code>[sigh]</code> are sounds the voice makes, not words.</p></details>
  <div id="app"></div>
</main>
<script>
const D = __DATA__;
let R = {};
const $ = (s, el = document) => el.querySelector(s);
const st = $('#status');
let timer = null;
function save() { clearTimeout(timer); st.textContent = 'Saving...';
  timer = setTimeout(() => fetch('save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(R) })
    .then(r => { st.textContent = r.ok ? 'Saved' : 'NOT saved'; }).catch(() => { st.textContent = 'NOT saved: is the page server running?'; }), 300); }
const art = p => p.art ? 'packs/cast/art/cast/' + p.art + '/neutral.webp' : null;
function avatar(p, cls) { if (art(p)) { const i = document.createElement('img'); i.src = art(p); i.alt = ''; if (cls) i.className = cls; return i; }
  const d = document.createElement('div'); d.className = 'noimg'; d.setAttribute('aria-hidden', 'true'); return d; }
function speak(text) { if (!window.speechSynthesis) return; speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/\[[^\]]*\]/g, ' '))); }
let filter = 'all';
function progress() {
  const done = D.lines.filter(l => R[l.key] && R[l.key].st).length;
  $('#fill').style.width = (100 * done / D.lines.length) + '%';
  const n = s => D.lines.filter(l => R[l.key] && R[l.key].st === s).length;
  $('#prog').textContent = done + ' of ' + D.lines.length + ' reviewed · ' + (D.mode === 'fixes'
    ? n('use') + ' suggestion used · ' + n('keep') + ' kept as is · ' + n('edit') + ' your own wording'
    : n('keep') + ' kept · ' + n('edit') + ' edited · ' + n('cut') + ' cut');
  for (const p of D.people) {
    const mine = D.lines.filter(l => l.who === p.who), d = mine.filter(l => R[l.key] && R[l.key].st).length;
    const a = document.querySelector('nav a[data-who="' + p.who + '"]'); if (a) a.classList.toggle('done', d === mine.length);
    const c = document.querySelector('#p-' + p.who + ' .count'); if (c) c.textContent = d + ' / ' + mine.length + ' reviewed';
  }
  applyFilter();
}
function applyFilter() {
  document.querySelectorAll('.line').forEach(el => { const r = R[el.dataset.key] || {};
    el.classList.toggle('hidden', !(filter === 'all' || (filter === 'todo' ? !r.st : r.st === filter))); });
  document.querySelectorAll('section.person').forEach(s => s.classList.toggle('hidden', !s.querySelector('.line:not(.hidden)')));
}
function render() {
  const nav = $('#nav'), app = $('#app');
  for (const p of D.people) {
    const a = document.createElement('a'); a.href = '#p-' + p.who; a.dataset.who = p.who; a.append(avatar(p), document.createTextNode(p.name)); nav.append(a);
    const s = document.createElement('section'); s.className = 'person'; s.id = 'p-' + p.who; s.setAttribute('aria-labelledby', 'h-' + p.who);
    const ph = document.createElement('div'); ph.className = 'ph'; ph.append(avatar(p));
    const t = document.createElement('div');
    t.innerHTML = '<h2></h2><div class="meta"></div><div class="meta soft"></div>';
    t.querySelector('h2').id = 'h-' + p.who; t.querySelector('h2').textContent = p.name;
    t.children[1].textContent = p.about; t.children[2].textContent = p.voice ? 'Voice: ' + p.voice + (p.role ? ' · ' + p.role : '') : '';
    if (D.mode === 'fixes') { ph.querySelector('.noimg, img').remove(); a.querySelector('.noimg, img').remove(); a.style.paddingLeft = '10px'; }
    const c = document.createElement('span'); c.className = 'count soft';
    ph.append(t, c); s.append(ph);
    for (const l of D.lines.filter(x => x.who === p.who)) s.append(lineEl(l));
    app.append(s);
  }
}
function fixEl(l) {
  const r = R[l.key] = R[l.key] || {};
  const el = document.createElement('div'); el.className = 'line'; el.dataset.key = l.key; el.dataset.st = r.st || '';
  el.innerHTML = '<div class="who-row"></div><div class="say"></div><div class="how why"></div>' +
    '<div class="sugg"><span class="soft">Suggested:</span> <b></b></div>' +
    '<div class="acts" role="group"><button data-a="keep" data-k="use">Use suggestion</button><button data-a="keep2" data-k="keep">Keep as is</button>' +
    '<button data-a="edit" data-k="edit">Edit</button><button class="speak" type="button">Read aloud</button></div>' +
    '<div class="editbox"><label>Your wording<textarea rows="2"></textarea></label></div>' +
    '<div class="note"><label>Note (optional)<input type="text" placeholder="Anything for Claude or Ari"></label></div>';
  const wr = $('.who-row', el);
  for (const s of l.speakers) { const p = (D.cast || {})[s] || { name: s }; const c = document.createElement('span'); c.className = 'spk';
    c.append(avatar({ art: p.art }), document.createTextNode(p.name || s)); wr.append(c); }
  const extra = document.createElement('span'); extra.className = 'soft small';
  extra.textContent = (l.variants > 1 ? ' · ' + l.variants + ' versions (one per restaurant)' : '') + (l.clips > 1 ? ' · ' + l.clips + ' recordings' : '') + (l.conf === 'medium' ? ' · less certain' : '');
  wr.append(extra);
  const say = $('.say', el), ta = $('textarea', el), nt = $('.note input', el);
  say.textContent = l.text; $('.why', el).textContent = 'Why flagged: ' + l.why; $('.sugg b', el).textContent = l.suggestion;
  ta.value = r.text != null ? r.text : l.suggestion; nt.value = r.note || '';
  const paint = () => { el.dataset.st = r.st === 'use' ? 'keep' : r.st === 'keep' ? 'kept' : (r.st || '');
    el.querySelectorAll('.acts [data-k]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === r.st))); };
  el.querySelectorAll('.acts [data-k]').forEach(b => b.onclick = () => {
    r.st = r.st === b.dataset.k ? '' : b.dataset.k;
    if (r.st === 'edit') { r.text = ta.value; setTimeout(() => ta.focus(), 0); }
    paint(); progress(); save(); });
  ta.oninput = () => { r.text = ta.value; save(); };
  nt.oninput = () => { r.note = nt.value; save(); };
  $('.speak', el).onclick = () => speak(r.st === 'edit' ? ta.value : r.st === 'use' ? l.suggestion : l.text);
  paint();
  return el;
}
function lineEl(l) {
  if (D.mode === 'fixes') return fixEl(l);
  const r = R[l.key] = R[l.key] || {};
  const el = document.createElement('div'); el.className = 'line'; el.dataset.key = l.key; el.dataset.st = r.st || '';
  el.innerHTML = '<div class="say"></div><div class="how"></div>' +
    '<div class="acts" role="group"><button data-a="keep">Keep</button><button data-a="edit">Edit</button><button data-a="cut">Cut</button>' +
    '<button class="speak" type="button">Read aloud</button></div>' +
    '<div class="editbox"><label>New wording<textarea rows="2"></textarea></label><label>How it\'s said (delivery)<input type="text"></label></div>' +
    '<div class="note"><label>Note (optional)<input type="text" placeholder="Anything for Claude or Ari"></label></div>';
  const say = $('.say', el), how = $('.how', el), ta = $('textarea', el), dl = $('.editbox input', el), nt = $('.note input', el);
  say.textContent = l.text; how.textContent = l.delivery ? 'said: ' + l.delivery : '';
  $('.acts', el).setAttribute('aria-label', 'Decision for ' + l.text);
  ta.value = r.text != null ? r.text : l.text; dl.value = r.delivery != null ? r.delivery : l.delivery; nt.value = r.note || '';
  const paint = () => { el.dataset.st = r.st || ''; say.classList.toggle('was', r.st === 'edit' && ta.value !== l.text);
    el.querySelectorAll('.acts [data-a]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a === r.st))); };
  el.querySelectorAll('.acts [data-a]').forEach(b => b.onclick = () => {
    r.st = r.st === b.dataset.a ? '' : b.dataset.a;
    if (r.st === 'edit') { r.text = ta.value; r.delivery = dl.value; setTimeout(() => ta.focus(), 0); }
    paint(); progress(); save(); });
  ta.oninput = () => { r.text = ta.value; paint(); save(); };
  dl.oninput = () => { r.delivery = dl.value; save(); };
  nt.oninput = () => { r.note = nt.value; save(); };
  $('.speak', el).onclick = () => speak(r.st === 'edit' ? ta.value : l.text);
  paint();
  return el;
}
document.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f;
  document.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); applyFilter(); });
fetch('save').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(v => { R = v || {}; render(); progress(); });
</script></body></html>
'''


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(GAME), **k)

    def log_message(self, *a):
        pass

    def send(self, body, ctype):
        b = body.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            page = PAGE
            if MODE == 'fixes':
                page = (page.replace('<title>Lead-in Review</title>', '<title>Script Fixes</title>')
                        .replace('<h1>Lead-in review</h1>', '<h1>Script fixes: lines that may not make sense</h1>')
                        .replace('data-f="cut" aria-pressed="false">Cut', 'data-f="keep" aria-pressed="false">Kept as is')
                        .replace(re.search(r'<details class="rules">.*?</details>', page, re.S).group(0),
                                 '<details class="rules" open><summary>How this list was made</summary><p>Five reviewers read all 4,845 '
                                 'lines, calibrated on your trial notes, and flagged lines that are confusing even as a joke, use specific '
                                 'years, or don\'t fit who says them. Lines several characters share, or one line with a version per '
                                 'restaurant, appear once here: one decision fixes all of them. "Less certain" = the reviewer was less sure.</p>'
                                 '<p><b>Use suggestion</b>, <b>Keep as is</b>, or <b>Edit</b> (starts from the suggestion). Saves as you go.</p></details>'))
            return self.send(page.replace('__DATA__', json.dumps(data())), 'text/html; charset=utf-8')
        if self.path == '/save':
            return self.send(STORE.read_text(encoding='utf-8') if STORE.exists() else '{}', 'application/json')
        if not self.path.startswith('/packs/cast/art/'):   # only the pictures are served from the repo
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        if self.path != '/save':
            return self.send_error(404)
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])) or b'{}')
        STORE.parent.mkdir(parents=True, exist_ok=True)
        tmp = STORE.with_suffix('.tmp')
        tmp.write_text(json.dumps(body, indent=1, ensure_ascii=False), encoding='utf-8')
        tmp.replace(STORE)
        self.send('{"ok":true}', 'application/json')


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--fixes' in args:   # the script audit instead of the lead-ins
        args.remove('--fixes')
        MODE, STORE = 'fixes', GAME / 'voice-source' / 'script-fixes.json'
    port = int(args[0]) if args else 8830
    print(f'Lead-in review: http://127.0.0.1:{port}/  (decisions: {STORE})', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
