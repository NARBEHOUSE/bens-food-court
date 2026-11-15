"""Ben's Food Court - the voice pass: candidate voices to choose from, and how each says real lines.

Runs in Voice Studio's Python, like tools/voices.py (which finds Voice Studio and holds the worker and the checks):
  <voice studio python> tools/voice-pilot.py design [characters...]
      For each character in tools/voice-cast.json (default: its "_pilot" list), every style is designed with
      several seeds, saying the character's sample. Each candidate gets the speech check, its pitch and pace, and
      its clarity score. The best of each style is kept (heard right, pitch in the character's range, then clearest).
  <voice studio python> tools/voice-pilot.py lines [characters...]
      Each kept candidate says the character's test lines the way the game records them: cloned from the
      candidate, with the line's delivery note; a second take if the first is unclear or off the voice's pitch.
  <voice studio python> tools/voice-pilot.py distinct
      How alike the kept candidates of different characters sound (Voice Studio's voice encoder, 1 = the same
      voice) and how far apart their pitches are: pairs that could be confused are listed.
  <voice studio python> tools/voice-pilot.py page
      Builds the listening page, voice-source/pilot/page/ (small mp3s and index.html).
  <voice studio python> tools/voice-pilot.py serve [port]
      Serves the page on this PC only (default port 8810). Picks and notes are saved to
      voice-source/pilot/picks.json as they are made.
Every step picks up where it stopped: nothing already made is made again. Nothing here changes the game.
"""
import html
import json
import re
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import voices  # noqa: E402
from voices import CFG, GAME, STEPS, VS, Worker, checks, clarity, export, measure, respell  # noqa: E402

SPEC = json.loads((GAME / 'tools' / 'voice-cast.json').read_text(encoding='utf-8'))
PILOT1 = GAME / 'voice-source' / 'pilot'
ROUND = 1             # --round N: voice-source/pilot<N> (round 1 is voice-source/pilot)
ROOT = PILOT1
PAGE = ROOT / 'page'
TAGS = re.compile(r'\s*\[[^\]]*\]\s*')
SEEDS = [1, 2, 3, 4]
CLEAR = 3.0           # a cloned line under this clarity gets a second take
DRIFT = 0.20          # ... and so does one this far off its voice's own pitch
LOUD = re.compile(r'\b(booming|loud|bellowing|shouting|yelling|barking)\b,?\s*', re.I)
# Sounds more than words: the speech checker spells them its own way, so they are not words said wrong.
SOUNDS = {'ay', 'aye', 'ayy', 'eh', 'ugh', 'yo', 'mm', 'mmm', 'hm', 'hmm', 'huh', 'oh', 'ah', 'uh', 'i', 'hi', 'hey',
          'a', 'howdy', 'hun', 'hon'}
DIFF = re.compile(r"^\w+: '(.*)' -> '(.*)'$")


def names(args):
    return args or (SPEC['_round%d' % ROUND] if ROUND > 1 else SPEC['_pilot'])


def load(path, default):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError:
        return default


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=1), encoding='utf-8')


def real_diffs(diffs):
    """Word differences that are words said wrong, not the checker's spelling of a sound."""
    out = []
    for d in diffs:
        m = DIFF.match(d)
        if m and all(w in SOUNDS for w in m.group(1).split() + m.group(2).split()):
            continue
        out.append(d)
    return out


def allowed(text):
    return 1 if len(checks.words(text)) > 8 else 0


def model_text(who, text):
    """The words the voice model is given: tools/voices.json respellings, and the calm punctuation."""
    text = respell(who, text)
    if SPEC[who].get('respell_ing'):      # dropped g's read as Southern to the model: "standin'" -> "standing"
        text = re.sub(r"\b(\w+in)'(?=\W|$)", r'\1g', text)
    if SPEC[who].get('no_tags'):          # Vernon's [sigh] came out as a long hiss
        text = TAGS.sub(' ', text).strip()
    if SPEC[who].get('calm'):
        text = re.sub(r'\b[A-Z]{2,}\b', lambda m: m.group(0).lower(), text.replace('!', '.'))
    # A respelling or the lower-casing can leave the line starting small ("hun, this isn't..."): capital again. Only
    # at the very start: after a full stop it also caught abbreviations ("The ASST. is tape" -> "ASST. Is").
    return text[:1].upper() + text[1:]


def model_delivery(who, delivery):
    """A delivery note as the model gets it. For a calm character the loud words are left out (they make the model
    shout, too high, and distort); the manner comes from the voice itself."""
    if delivery and SPEC[who].get('calm'):
        delivery = LOUD.sub('', delivery).strip(' ,')
    if delivery:
        # Delivery test (round 22, 2026-11-14, Bryan's ratings):
        # - a two-tone note ("upbeat, then a warning") gives the model one instruction it can't follow both ways; the first
        #   tone alone was better, except when the second part is an aside or confiding (quieter words it can carry)
        if re.search(r'\bthen\b', delivery) and not re.search(r'\bthen\b[^,]*\b(aside|confid)', delivery):
            parts = re.split(r',?\s*\bthen\b', delivery)
            # "a long pause, then grudging": the first part is a beat, not a tone: the tone is what follows
            first = parts[1] if re.fullmatch(r'\s*(a |an )?((long|short|theatrical|big|small|little) )*(pause|sigh|beat)( first)?\s*', parts[0]) else parts[0]
            # "a touch wounded in the middle" is a change mid-line too: dropped with the rest
            delivery = ', '.join(p.strip() for p in first.split(',') if p.strip() and 'in the middle' not in p)
        # - "gagging" does nothing, and plain disgust words came out flat: the stronger phrasing won 5 of 5
        if re.search(r'\b(disgust\w*|revolted|gagging|grossed out)\b', delivery, re.I):
            rest = [p.strip() for p in delivery.split(',') if p.strip()
                    and not re.search(r'\b(disgust\w*|revolted|gagging|grossed out|recoil\w*)\b', p, re.I)]
            delivery = ', '.join(rest + ['grossed out and disgusted, recoiling, nose wrinkled'])
    if delivery and SPEC[who].get('no_tags'):
        # a delivery that asks for a sigh makes one anyway, long and harsh (Vernon, cloner test 2026-11-11)
        parts = [p.strip() for p in re.split(r',|\bthen\b', delivery) if p.strip() and not re.search(r'sigh|pause', p, re.I)]
        delivery = ', '.join(parts)
    return delivery or ''


class LazyWorker:
    """The voice model, loaded only when something actually needs making: a round whose takes were all made by
    another model (tools/voice-qwen.py) is only measured, and never loads VoxCPM."""

    def __init__(self):
        self.w = None

    def render(self, job):
        if self.w is None:
            voices.TAKES_DIR = ROOT / 'takes'
            voices.TAKES_DIR.mkdir(parents=True, exist_ok=True)
            self.w = Worker()
        return self.w.render(job)

    def close(self):
        if self.w is not None:
            self.w.close()


def worker():
    return LazyWorker()


def check(wav, text, work):
    said, diffs, pitch, secs, rate = measure(wav, text, work)
    return {'said': said, 'diffs': real_diffs(diffs), 'pitch': round(pitch), 'seconds': round(secs, 2),
            'rate': round(rate, 2), 'clarity': clarity(work / wav.name)}


# ── design ──────────────────────────────────────────────────────────────────────────────────────────────────────
def design(who_list):
    w = worker()
    try:
        for who in who_list:
            c = SPEC[who]
            folder = ROOT / who
            work = folder / 'work'
            work.mkdir(parents=True, exist_ok=True)
            rep = load(folder / 'design.json', {})
            for style in c['styles']:
                for seed in c.get('seeds', SEEDS):
                    name = f"{style['id']}-s{seed}"
                    wav = folder / (name + '.wav')
                    if name in rep and wav.exists():
                        continue
                    if not wav.exists():
                        ans = w.render({'id': f'{who}-{name}', 'text': f"({style['describe']}){c['sample']}",
                                        'out': str(wav), 'seed': seed, 'steps': STEPS, 'cfg': CFG, 'retry': True})
                        if not ans.get('ok'):
                            print('  failed', who, name, ans.get('error'), flush=True)
                            continue
                    r = check(wav, c['sample'], work)
                    r.update(style=style['id'], seed=seed)
                    rep[name] = r
                    save(folder / 'design.json', rep)
                    print(f"  {who} {name}: {r['pitch']} Hz, {r['rate']} words/s, clarity {r['clarity']}, "
                          f"{len(r['diffs'])} word differences", flush=True)
            # The best of each style: heard right, inside the pitch range, then the clearest.
            lo, hi = c['pitch']
            kept = []
            for style in c['styles']:
                rows = [(n, r) for n, r in rep.items() if r['style'] == style['id']]
                rows.sort(key=lambda nr: (len(nr[1]['diffs']) > allowed(c['sample']), not lo <= nr[1]['pitch'] <= hi,
                                          -nr[1]['clarity']))
                if rows:
                    kept.append(rows[0][0])
            save(folder / 'kept.json', kept)
            # The test lines, with the words the model is to be given, for another model's tool (voice-qwen.py).
            save(folder / 'tests.json', [dict(t, said_as=model_text(who, t['text']),
                                              note=model_delivery(who, t.get('delivery')))
                                         for t in test_lines(who, all_clips())])
            print(f"{who}: kept {', '.join(kept)}", flush=True)
    finally:
        w.close()


# ── the test lines ──────────────────────────────────────────────────────────────────────────────────────────────
def all_clips():
    path = ROOT / 'clips-all.json'
    if not path.exists():
        ROOT.mkdir(parents=True, exist_ok=True)
        subprocess.run(['node', str(GAME / 'tools' / 'voice-clips.cjs'), 'all', str(path)], check=True, cwd=str(GAME))
    return json.loads(path.read_text(encoding='utf-8'))


def test_lines(who, clips):
    """One clip per moment in the character's "lines": the first of that moment, from its "packs" in order."""
    c = SPEC[who]
    mine = [x for x in clips if x['speaker'] == who and x.get('delivery')]
    out = []
    for m in c['lines']:
        hits = [x for x in mine if (x['moment'].startswith(m) if m.endswith('.') else x['moment'] == m)
                and x['clip'] not in [o['clip'] for o in out]]
        hits.sort(key=lambda x: c['packs'].index(x['pack']) if x['pack'] in c['packs'] else 99)
        if hits:
            out.append(hits[0])
    return out


def lines(who_list):
    clips = all_clips()
    w = worker()
    try:
        for who in who_list:
            folder = ROOT / who
            rep_d = load(folder / 'design.json', {})
            tests = test_lines(who, clips)
            save(folder / 'tests.json', tests)
            rep = load(folder / 'lines.json', {})
            for cand in load(folder / 'kept.json', []):
                ref = folder / (cand + '.wav')
                home = rep_d[cand]['pitch']
                out_dir = folder / 'lines' / cand
                work = out_dir / 'work'
                work.mkdir(parents=True, exist_ok=True)
                # 'b' takes: the character's short identity added to the delivery, to keep the voice's qualities.
                variants = [('', '')] + ([('b', SPEC[who]['identity'])] if SPEC[who].get('identity') else [])
                for i, t in [(i, t) for i, t in enumerate(tests)]:
                  for suffix, ident in variants:
                    key = f'{cand}/{i}{suffix}'
                    final = out_dir / f'{i}{suffix}.wav'
                    if key in rep and final.exists():
                        continue
                    said_as = model_text(who, t['text'])
                    note = model_delivery(who, t.get('delivery'))
                    if ident:
                        note = ident + (', ' + note if note else '')
                    if final.exists():   # made by another model (tools/voice-qwen.py): measure it only
                        r = check(final, said_as, work)
                        r.update(seed=1, drift=bool(home and r['pitch']) and abs(r['pitch'] - home) > DRIFT * home,
                                 clip=t['clip'], said_as=said_as, note='', takes=1)
                        rep[key] = r
                        save(folder / 'lines.json', rep)
                        print(f"  {who} {key} (measured): {r['pitch']} Hz (voice {home}), clarity {r['clarity']}, "
                              f"{len(r['diffs'])} word differences", flush=True)
                        continue
                    takes = []
                    for seed in (1, 2):
                        wav = out_dir / f'{i}{suffix}-s{seed}.wav'
                        ans = w.render({'id': f'{who}-{key}-{seed}', 'text': (f'({note})' if note else '') + said_as,
                                        'out': str(wav), 'seed': seed, 'steps': STEPS, 'cfg': CFG,
                                        'reference': str(ref), 'retry': True})
                        if not ans.get('ok'):
                            continue
                        r = check(wav, said_as, work)
                        r.update(seed=seed, wav=wav.name, drift=bool(home and r['pitch']) and
                                 abs(r['pitch'] - home) > DRIFT * home)
                        takes.append(r)
                        if len(r['diffs']) <= allowed(said_as) and not r['drift'] and r['clarity'] >= CLEAR:
                            break
                    if not takes:
                        print('  NO TAKE', who, key, flush=True)
                        continue
                    best = sorted(takes, key=lambda r: (len(r['diffs']), r['drift'], -r['clarity']))[0]
                    (out_dir / best['wav']).replace(final)
                    for r in takes:
                        (out_dir / r['wav']).unlink(missing_ok=True)
                    best.update(clip=t['clip'], said_as=said_as, note=note, takes=len(takes))
                    del best['wav']
                    rep[key] = best
                    save(folder / 'lines.json', rep)
                    print(f"  {who} {key}: {best['pitch']} Hz (voice {home}), clarity {best['clarity']}, "
                          f"{len(best['diffs'])} word differences, {len(takes)} take(s)", flush=True)
    finally:
        w.close()


# ── how alike ───────────────────────────────────────────────────────────────────────────────────────────────────
_ve = None


def embed(wav16):
    """Voice Studio's speaker encoder (Chatterbox's, as studio.py loads it): one vector per clip."""
    global _ve
    import soundfile as sf
    if _ve is None:
        from huggingface_hub import hf_hub_download
        from safetensors.torch import load_file
        from voice_encoder import VoiceEncoder
        _ve = VoiceEncoder()
        _ve.load_state_dict(load_file(hf_hub_download('ResembleAI/chatterbox', 've.safetensors',
                                                      revision='5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18')))
        _ve.eval()
    wav, sr = sf.read(str(wav16), dtype='float32')
    return _ve.embeds_from_wavs([wav], sr, as_spk=True)


def distinct(who_list):
    from voice_encoder import VoiceEncoder
    cands = []
    for who in who_list:
        folder = ROOT / who
        rep = load(folder / 'design.json', {})
        for cand in load(folder / 'kept.json', []):
            cands.append({'who': who, 'cand': cand, 'pitch': rep[cand]['pitch'],
                          'emb': embed(folder / 'work' / (cand + '.wav'))})
    if ROUND > 1:   # the voices already picked are part of the cast these must stand apart from
        for who, (where, cand) in picked(True).items():
            rep = load(where / who / 'design.json', {})
            cands.append({'who': who, 'cand': cand + ' (picked)', 'pitch': rep[cand]['pitch'],
                          'emb': embed(where / who / 'work' / (cand + '.wav'))})
    pairs = []
    for i, a in enumerate(cands):
        for b in cands[i + 1:]:
            if a['who'] == b['who']:
                continue
            sim = float(VoiceEncoder.voice_similarity(a['emb'], b['emb']))
            gap = abs(a['pitch'] - b['pitch']) / max(1, min(a['pitch'], b['pitch']))
            pairs.append({'a': a['who'] + '/' + a['cand'], 'b': b['who'] + '/' + b['cand'], 'alike': round(sim, 3),
                          'pitch_gap': round(gap, 2)})
    pairs.sort(key=lambda p: -p['alike'])
    save(ROOT / 'distinct.json', pairs)
    print('Most alike across characters (1 = the same voice; pitch gap as a share of the lower pitch):')
    for p in pairs[:15]:
        print(f"  {p['alike']:.3f}  gap {p['pitch_gap']:.2f}  {p['a']}  ~  {p['b']}")


# ── the listening page ──────────────────────────────────────────────────────────────────────────────────────────
PAGE_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Food Court voices: pilot</title>
<style>
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b18; --soft:#5d574d; --line:#d9d3c6; --pick:#1f6f4a; --pickbg:#e3f3ea; --warn:#8a5a00; }
@media (prefers-color-scheme: dark) { :root { --bg:#191815; --card:#24221e; --ink:#eeeae2; --soft:#aaa397; --line:#3b3832; --pick:#7fd3a6; --pickbg:#1d3529; --warn:#e2b25a; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, "Segoe UI", sans-serif; }
main { max-width:1100px; margin:0 auto; padding:16px; }
h1 { font-size:1.5rem; margin:.2em 0; } h2 { font-size:1.3rem; margin:0; }
p { margin:.4em 0; } .soft { color:var(--soft); } .warn { color:var(--warn); }
section { border-top:2px solid var(--line); margin-top:28px; padding-top:16px; }
.lines { margin:.5em 0 1em; padding-left:1.4em; } .lines li { margin:.2em 0; }
.grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:12px; }
.card { background:var(--card); border:2px solid var(--line); border-radius:10px; padding:12px; }
.card.best { border-color:var(--pick); background:var(--pickbg); }
.card h3 { margin:0 0 .1em; font-size:1.05rem; }
.clip { display:flex; align-items:center; gap:8px; margin:6px 0; } .clip span { width:5.2em; flex:none; font-size:.9rem; }
audio { width:100%; height:34px; }
label { display:flex; gap:8px; align-items:center; padding:6px 0; cursor:pointer; }
input[type=radio], input[type=checkbox] { width:20px; height:20px; flex:none; }
input[type=text], textarea { width:100%; font:inherit; padding:8px; border:1px solid var(--line); border-radius:6px; background:var(--card); color:var(--ink); }
details { margin-top:6px; } summary { cursor:pointer; color:var(--soft); font-size:.9rem; }
#status { position:sticky; top:0; background:var(--bg); padding:6px 0; z-index:2; font-size:.95rem; }
nav a { margin-right:12px; }
</style></head><body><main>
<h1>Food Court voices: pilot round</h1>
<p>Eight characters, four candidate voices each. For each candidate: the <b>sample</b> is the voice as designed; the numbered clips are real game lines spoken in that voice. Choose a <b>best</b> voice for each character (or "none of these"), tick any others worth keeping, and add notes. Everything saves as you go.</p>
<p class="soft">The numbers under each name are measured, not judged: pitch in Hz and a clarity score (about 1 = distorted, 4.5 = clean). Trust your ear over them.</p>
<div id="status" class="soft" role="status">Loading...</div>
<nav id="nav"></nav>
<div id="app"></div>
</main>
<script src="data.js"></script>
<script>
const D = window.PILOT, app = document.getElementById('app'), statusEl = document.getElementById('status');
let picks = {};
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const kid of kids.flat()) if (kid != null) e.append(kid); return e; };
const entry = who => (picks[who] = picks[who] || { best: '', also: [], notes: {}, note: '' });
let timer = null;
function saveSoon() { clearTimeout(timer); statusEl.textContent = 'Saving...'; timer = setTimeout(async () => {
  try { const r = await fetch('picks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(picks) }); if (!r.ok) throw new Error(r.status); summary('Saved. '); }
  catch (e) { statusEl.textContent = 'NOT saved (' + e.message + '). Is the page server still running?'; } }, 400); }
function summary(lead) { const done = D.cast.filter(c => entry(c.id).best).length; statusEl.textContent = (lead || '') + done + ' of ' + D.cast.length + ' characters have a choice.'; }
function audio(src) { const a = el('audio', { controls: true, preload: 'none', src }); a.addEventListener('play', () => document.querySelectorAll('audio').forEach(o => { if (o !== a) o.pause(); })); return a; }
function render() {
  app.textContent = '';
  document.getElementById('nav').replaceChildren(...D.cast.map(c => el('a', { href: '#' + c.id }, c.name)));
  for (const c of D.cast) {
    const p = entry(c.id), sec = el('section', { id: c.id });
    sec.append(el('h2', {}, c.name), el('p', { class: 'soft' }, c.who + ' Voice brief: ' + c.brief + '.'),
      el('p', {}, el('b', {}, 'Sample: '), '“' + c.sample + '”'),
      el('ol', { class: 'lines' }, c.tests.map(t => el('li', {}, '“' + t.text + '” ', el('span', { class: 'soft' }, '(' + t.delivery + ')')))));
    if (c.alike.length) sec.append(el('p', { class: 'warn' }, 'Could be confused with: ' + c.alike.join('; ') + '.'));
    const grid = el('div', { class: 'grid' });
    for (const v of c.voices) {
      const card = el('div', { class: 'card' + (p.best === v.id ? ' best' : '') });
      card.append(...[el('h3', {}, v.label), el('p', { class: 'soft' }, v.pitch + ' Hz, clarity ' + v.clarity),
        el('div', { class: 'clip' }, el('span', {}, 'Sample'), audio(v.sample)),
        v.lines.map(l => el('div', { class: 'clip' }, el('span', {}, 'Line ' + l.n + (l.plus ? ' +' : '') + (l.flag ? ' *' : '')), audio(l.src))),
        v.lines.some(l => l.plus) ? el('p', { class: 'soft' }, '+ the same line with the character’s short description added to the delivery, to see if it keeps the voice’s qualities') : null,
        v.lines.some(l => l.flag) ? el('p', { class: 'soft' }, '* the checker flagged this take (a word, the pitch or the clarity)') : null,
        el('label', {}, el('input', { type: 'radio', name: 'best-' + c.id, checked: p.best === v.id, onchange: () => { p.best = v.id; p.also = p.also.filter(x => x !== v.id); saveSoon(); render(); } }), 'Best for ' + c.name),
        el('label', {}, el('input', { type: 'checkbox', checked: p.also.includes(v.id), onchange: e => { p.also = p.also.filter(x => x !== v.id); if (e.target.checked) p.also.push(v.id); saveSoon(); } }), 'Also worth keeping'),
        el('input', { type: 'text', 'aria-label': 'Notes on ' + v.label, placeholder: 'Notes on this voice', value: p.notes[v.id] || '', oninput: e => { p.notes[v.id] = e.target.value; saveSoon(); } }),
        el('details', {}, el('summary', {}, 'The description used'), el('p', { class: 'soft' }, v.describe))].flat().filter(x => x != null));
      grid.append(card);
    }
    sec.append(grid,
      el('label', {}, el('input', { type: 'radio', name: 'best-' + c.id, checked: p.best === 'none', onchange: () => { p.best = 'none'; saveSoon(); render(); } }), 'None of these: try again for ' + c.name),
      el('textarea', { rows: 2, 'aria-label': 'Notes on ' + c.name, placeholder: 'What ' + c.name + ' should sound like instead, or anything else', oninput: e => { p.note = e.target.value; saveSoon(); } }, p.note || ''));
    app.append(sec);
  }
  summary();
}
fetch('picks').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(saved => { picks = saved || {}; const y = scrollY; render(); scrollTo(0, y); });
</script></body></html>
'''


def page(who_list):
    clips = all_clips()
    cast = json.loads(subprocess.run(['node', '-e', "console.log(JSON.stringify(require('./packs/cast/cast.js').people))"],
                                     cwd=str(GAME), check=True, capture_output=True, text=True, encoding='utf-8').stdout)
    pairs = load(ROOT / 'distinct.json', [])
    (PAGE / 'audio').mkdir(parents=True, exist_ok=True)
    data = []
    for who in who_list:
        c = SPEC[who]
        folder = ROOT / who
        rep_d, rep_l = load(folder / 'design.json', {}), load(folder / 'lines.json', {})
        tests = load(folder / 'tests.json', None) or test_lines(who, clips)
        label = {s['id']: s for s in c['styles']}
        voices_out = []
        for cand in load(folder / 'kept.json', []):
            style = label[rep_d[cand]['style']]
            dst = PAGE / 'audio' / who / (cand + '-sample.mp3')
            if not dst.exists():
                export(folder / (cand + '.wav'), dst)
            line_out = []
            for i in range(len(tests)):
              for suffix in ('', 'b'):
                r = rep_l.get(f'{cand}/{i}{suffix}')
                src = folder / 'lines' / cand / f'{i}{suffix}.wav'
                if not r or not src.exists():
                    continue
                d = PAGE / 'audio' / who / f'{cand}-l{i}{suffix}.mp3'
                if not d.exists():
                    export(src, d)
                line_out.append({'src': f'audio/{who}/{cand}-l{i}{suffix}.mp3', 'n': i + 1, 'plus': bool(suffix),
                                 'flag': bool(r['diffs']) or r['drift'] or r['clarity'] < CLEAR})
            voices_out.append({'id': cand, 'label': style['label'], 'describe': style['describe'],
                               'pitch': rep_d[cand]['pitch'], 'clarity': rep_d[cand]['clarity'],
                               'sample': f'audio/{who}/{cand}-sample.mp3', 'lines': line_out})
        # Another character's candidate that sounds much like one of these, and is near it in pitch.
        alike = sorted({(p['b'] if p['a'].startswith(who + '/') else p['a']).split('/')[0] for p in pairs
                        if who + '/' in (p['a'][:len(who) + 1], p['b'][:len(who) + 1])
                        and p['alike'] >= 0.80 and p['pitch_gap'] < 0.15})
        data.append({'id': who, 'name': c['name'], 'who': cast[who]['who'] + '.', 'brief': c['brief'],
                     'sample': c['sample'], 'tests': [{'text': t['text'], 'delivery': t.get('delivery', '')} for t in tests],
                     'voices': voices_out, 'alike': [SPEC[a]['name'] for a in alike]})
    (PAGE / 'data.js').write_text('window.PILOT = ' + json.dumps({'made': time.strftime('%Y-%m-%d %H:%M'), 'cast': data}) + ';\n',
                                  encoding='utf-8')
    (PAGE / 'index.html').write_text(PAGE_HTML, encoding='utf-8')
    print(f"page: {PAGE / 'index.html'} ({sum(len(c['voices']) for c in data)} voices)")


PARTS_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Order parts test</title>
<style>
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b18; --soft:#5d574d; --line:#d9d3c6; }
@media (prefers-color-scheme: dark) { :root { --bg:#191815; --card:#24221e; --ink:#eeeae2; --soft:#aaa397; --line:#3b3832; } }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, "Segoe UI", sans-serif; }
main { max-width:900px; margin:0 auto; padding:16px; } .soft { color:var(--soft); }
.card { background:var(--card); border:2px solid var(--line); border-radius:10px; padding:12px; margin:12px 0; }
.row { display:flex; gap:8px; align-items:center; margin:6px 0; } .row span { width:9em; flex:none; }
audio { width:100%; height:34px; }
</style></head><body><main>
<h1>Order parts test</h1>
<p>The game says an order as separate recorded pieces played one after another (90 ms apart). <b>Joined pieces</b> is exactly that. <b>Whole sentence</b> is the same order said in one go, for comparison. Is "joined pieces" acceptable?</p>
<div id="app"></div></main>
<script src="parts.js"></script>
<script>
const app = document.getElementById('app');
for (const o of window.PARTS) {
  const c = document.createElement('div'); c.className = 'card';
  c.innerHTML = '<b></b> <span class="soft"></span><div class="soft"></div>';
  c.querySelector('b').textContent = o.name; c.querySelector('span').textContent = '(' + o.pack + ')';
  c.querySelector('div').textContent = o.parts.join('  ·  ');
  for (const [label, src] of [['Joined pieces', o.joined], ['Whole sentence', o.whole]]) {
    const r = document.createElement('div'); r.className = 'row';
    const s = document.createElement('span'); s.textContent = label;
    const a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = src;
    r.append(s, a); c.append(r);
  }
  app.append(c);
}
</script></body></html>
'''


def parts(who_list):
    """The order-parts test: real orders said as separate pieces joined the way the game plays them, against the
    same order said whole. Uses each character's first kept candidate as the voice."""
    import numpy as np
    import soundfile as sf
    orders = json.loads((ROOT / 'parts' / 'orders.json').read_text(encoding='utf-8'))
    out = PAGE / 'parts'
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    w = worker()
    try:
        for who in who_list:
            cand = load(ROOT / who / 'kept.json', [None])[0]
            ref = ROOT / who / (cand + '.wav')
            work = ROOT / 'parts' / who
            chk = work / 'check'      # the speech check's own files (it writes a 16 kHz copy named like the take)
            chk.mkdir(parents=True, exist_ok=True)

            def make(text, name):
                raw = work / (name + '.wav')
                if not raw.exists():
                    for seed in (1, 2):
                        ans = w.render({'id': f'{who}-{name}', 'text': model_text(who, text), 'out': str(raw),
                                        'seed': seed, 'steps': STEPS, 'cfg': CFG, 'reference': str(ref), 'retry': True})
                        if ans.get('ok'):
                            r = check(raw, text, chk)
                            print(f"  {who} '{text}': heard '{r['said']}', {r['pitch']} Hz", flush=True)
                            if len(r['diffs']) <= allowed(text):
                                break
                # trimmed and levelled exactly as a game clip is, kept as wav for joining
                lev = work / (name + '.lev.wav')
                if not lev.exists():
                    trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06'
                    subprocess.run([checks.ffmpeg(), '-v', 'error', '-y', '-i', str(raw), '-af',
                                    f'{trim},areverse,{trim},areverse,loudnorm=I=-17:TP=-1.5:LRA=11', '-ac', '1',
                                    '-ar', '44100', str(lev)], check=True)
                return lev

            for k, o in enumerate(orders):
                pieces = [make(p, 'p-' + re.sub(r'\W+', '_', p.lower())) for p in o['parts']]
                gap = np.zeros(int(44100 * 0.09), dtype='float32')
                joined = []
                for i, f in enumerate(pieces):
                    x, _ = sf.read(str(f), dtype='float32')
                    joined += [x] + ([gap] if i < len(pieces) - 1 else [])
                jw = work / f'order{k}-joined.wav'
                sf.write(str(jw), np.concatenate(joined), 44100)
                whole = make(o['said'].strip(), f'order{k}-whole')
                export(jw, out / f'{who}-order{k}-joined.mp3')
                export(whole, out / f'{who}-order{k}-whole.mp3')
                rows.append({'name': f"{SPEC[who]['name']}: order {k + 1}", 'pack': o['pack'], 'parts': o['parts'],
                             'joined': f'{who}-order{k}-joined.mp3', 'whole': f'{who}-order{k}-whole.mp3'})
    finally:
        w.close()
    (out / 'parts.js').write_text('window.PARTS = ' + json.dumps(rows) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(PARTS_HTML, encoding='utf-8')
    print(f'parts test: {out / "index.html"} ({len(rows)} orders)')


def serve(port):
    picks = ROOT / 'picks.json'
    stores = {'picks': picks, 'clean-votes': ROOT / 'clean-votes.json', 'clean2-votes': ROOT / 'clean2-votes.json',
              'ab-votes': ROOT / 'ab-votes.json', 'stress-votes': ROOT / 'stress-votes.json',
              'req-votes': ROOT / 'req-votes.json'}

    def store(path):
        name = path.split('?')[0].rstrip('/').rsplit('/', 1)[-1]
        return stores.get(name)

    class H(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(PAGE), **k)

        def log_message(self, *a):
            pass

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def do_GET(self):
            f = store(self.path)
            if f:
                body = f.read_bytes() if f.exists() else b'{}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            else:
                super().do_GET()

        def do_POST(self):
            f = store(self.path)
            if not f:
                self.send_error(404)
                return
            data = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            tmp = f.with_suffix('.tmp')
            tmp.write_text(json.dumps(data, indent=1), encoding='utf-8')
            tmp.replace(f)
            self.send_response(204)
            self.end_headers()

    print(f'Listening page: http://127.0.0.1:{port}/  (picks: {picks})', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()


def round_dir(n):
    return PILOT1 if n == 1 else GAME / 'voice-source' / f'pilot{n}'


def picked(with_folder=False):
    """The voices picked so far, in any earlier round: {who: candidate} (or {who: (round folder, candidate)})."""
    out = {}
    for n in range(1, ROUND if ROUND > 1 else 2):
        for w, p in load(round_dir(n) / 'picks.json', {}).items():
            if p.get('best') not in (None, '', 'none'):
                out[w] = (round_dir(n), p['best'])
    return out if with_folder else {w: c for w, (f, c) in out.items()}


CLEAN_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice clarity test</title>
<style>
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b18; --soft:#5d574d; --line:#d9d3c6; }
@media (prefers-color-scheme: dark) { :root { --bg:#191815; --card:#24221e; --ink:#eeeae2; --soft:#aaa397; --line:#3b3832; } }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, "Segoe UI", sans-serif; }
main { max-width:900px; margin:0 auto; padding:16px; } .soft { color:var(--soft); }
.card { background:var(--card); border:2px solid var(--line); border-radius:10px; padding:12px; margin:12px 0; }
.row { display:flex; gap:8px; align-items:center; margin:6px 0; flex-wrap:wrap; } .row span { width:3em; flex:none; font-weight:600; }
.row audio { flex:1; min-width:200px; height:34px; } select { font:inherit; padding:4px; }
</style></head><body><main>
<h1>Voice clarity test</h1>
<p>The four voices picked in round 1, two lines each, made five ways (A to E, shuffled per line so you judge by ear). Rate each: <b>clean</b>, <b>a little rough</b> or <b>rough</b>. Ratings save as you go; the key is revealed in the results, not here.</p>
<div id="status" class="soft" role="status"></div><div id="app"></div></main>
<script src="clean.js"></script>
<script>
const app = document.getElementById('app'), st = document.getElementById('status');
let votes = {};
const save = () => fetch('clean-votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(votes) })
  .then(r => { st.textContent = r.ok ? 'Saved: ' + Object.keys(votes).length + ' ratings.' : 'NOT saved'; }).catch(() => { st.textContent = 'NOT saved: is the page server running?'; });
function render() {
  app.textContent = '';
  for (const g of window.CLEAN) {
    const c = document.createElement('div'); c.className = 'card';
    const h = document.createElement('p'); h.innerHTML = '<b></b> <span class="soft"></span>'; h.querySelector('b').textContent = g.name; h.querySelector('span').textContent = '“' + g.text + '”'; c.append(h);
    g.clips.forEach((src, i) => {
      const key = g.id + '/' + i, r = document.createElement('div'); r.className = 'row';
      const s = document.createElement('span'); s.textContent = 'ABCDE'[i];
      const a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = src;
      a.addEventListener('play', () => document.querySelectorAll('audio').forEach(o => { if (o !== a) o.pause(); }));
      const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Rating for ' + g.name + ' ' + 'ABCDE'[i]);
      for (const [v, t] of [['', 'rate...'], ['clean', 'clean'], ['little', 'a little rough'], ['rough', 'rough']]) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (votes[key] === v) o.selected = true; sel.append(o); }
      sel.onchange = () => { votes[key] = sel.value; save(); };
      r.append(s, a, sel); c.append(r);
    });
    app.append(c);
  }
}
fetch('clean-votes').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(v => { votes = v || {}; render(); });
</script></body></html>
'''


def clean():
    """The clarity test: each round-1 pick's lines 1 and 3, five ways: A as heard (64 kbps mp3), B the same take at
    128 kbps, C the same take as full-quality wav, D the same take filtered (rumble and the top end cut, light
    de-noise, de-ess) at 128 kbps, E re-made with more model steps (40) at 128 kbps. Shuffled per line; the key is
    in clean-key.json."""
    import random
    out = PAGE / 'clean'
    out.mkdir(parents=True, exist_ok=True)
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06'
    lev = f'{trim},areverse,{trim},areverse,loudnorm=I=-17:TP=-1.5:LRA=11'
    filt = 'highpass=f=70,lowpass=f=11000,afftdn=nf=-40:nr=8,deesser=i=0.4,'

    def enc(src, dst, af, rate):
        if not dst.exists():
            args = ['-b:a', rate] if rate else ['-c:a', 'pcm_s16le']
            subprocess.run([checks.ffmpeg(), '-v', 'error', '-y', '-i', str(src), '-af', af, '-ac', '1', '-ar', '44100',
                            *args, str(dst)], check=True)

    groups, key, rnd = [], {}, random.Random(11)
    w = None
    try:
        for who, cand in picked().items():
            folder = PILOT1 / who
            rep = load(folder / 'lines.json', {})
            tests = load(folder / 'tests.json', [])
            for i in (0, 2):
                r = rep.get(f'{cand}/{i}')
                src = folder / 'lines' / cand / f'{i}.wav'
                if not r or not src.exists():
                    continue
                more = ROOT / 'clean' / who / f'{cand}-{i}-steps40.wav'
                if not more.exists():
                    if w is None:
                        w = worker()
                    more.parent.mkdir(parents=True, exist_ok=True)
                    w.render({'id': f'{who}-{i}-s40', 'text': (f"({r['note']})" if r.get('note') else '') + r['said_as'],
                              'out': str(more), 'seed': r['seed'], 'steps': 40, 'cfg': CFG,
                              'reference': str(folder / (cand + '.wav')), 'retry': True})
                base = f'{who}-{i}'
                made = {'A as heard (64k mp3)': (src, lev, '64k', '.mp3'), 'B same take, 128k mp3': (src, lev, '128k', '.mp3'),
                        'C same take, full-quality wav': (src, lev, None, '.wav'),
                        'D same take, filtered, 128k': (src, filt + lev, '128k', '.mp3'),
                        'E more model steps (40), 128k': (more, lev, '128k', '.mp3')}
                names_ = list(made)
                rnd.shuffle(names_)
                clips = []
                for n, label in enumerate(names_):
                    s, af, rate, ext = made[label]
                    f = f'{base}-{n}{ext}'
                    enc(s, out / f, af, rate)
                    clips.append(f)
                    key[f'{who}-{i}/{n}'] = label
                groups.append({'id': f'{who}-{i}', 'name': f"{SPEC[who]['name']} ({cand})", 'text': tests[i]['text'], 'clips': clips})
    finally:
        if w:
            w.close()
    save(ROOT / 'clean-key.json', key)
    (out / 'clean.js').write_text('window.CLEAN = ' + json.dumps(groups) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(CLEAN_HTML, encoding='utf-8')
    print(f'clarity test: {out / "index.html"} ({len(groups)} lines x 5)')


def clean2():
    """Clarity test 2: the model's guidance setting. VoxCPM's usage guide: cfg 2.0-3.0 carries "more risk of noise or
    artifacts", and noisy or buzzy output is "often more stable" toward 1.5-1.6; steps "recommended 4-30". Each pick's
    lines 1 and 3, same seed, four ways, all lossless wav (no mp3 in the way): cfg 2.0 / 24 steps (what we use),
    cfg 1.6 / 24, cfg 1.6 / 30, cfg 2.0 / 30. Shuffled per line; the key is clean2-key.json."""
    import random
    out = PAGE / 'clean2'
    out.mkdir(parents=True, exist_ok=True)
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06'
    lev = f'{trim},areverse,{trim},areverse,loudnorm=I=-17:TP=-1.5:LRA=11'
    # clean test 1 (Bryan, 2026-11-11): the mp3 was not the cause; the filter (D) took 6 of 8 lines to clean.
    filt = 'highpass=f=70,lowpass=f=11000,afftdn=nf=-40:nr=8,deesser=i=0.4,'
    ways = {'cfg 2.0, 24 steps (now)': (2.0, 24, ''), 'cfg 1.6, 24 steps': (1.6, 24, ''), 'cfg 1.6, 30 steps': (1.6, 30, ''),
            'cfg 2.0, 30 steps': (2.0, 30, ''), 'cfg 1.6, 24 steps + filter': (1.6, 24, filt)}
    groups, key, rnd = [], {}, random.Random(12)
    w = worker()
    try:
        for who, cand in picked().items():
            folder = PILOT1 / who
            rep, tests = load(folder / 'lines.json', {}), load(folder / 'tests.json', [])
            for i in (0, 2):
                r = rep.get(f'{cand}/{i}')
                if not r:
                    continue
                labels = list(ways)
                rnd.shuffle(labels)
                clips = []
                for n, label in enumerate(labels):
                    cfg, steps, extra = ways[label]
                    raw = ROOT / 'clean2' / who / f'{cand}-{i}-cfg{cfg}-st{steps}.wav'
                    if not raw.exists():
                        raw.parent.mkdir(parents=True, exist_ok=True)
                        w.render({'id': f'{who}-{i}-{cfg}-{steps}', 'out': str(raw), 'seed': r['seed'], 'steps': steps,
                                  'cfg': cfg, 'text': (f"({r['note']})" if r.get('note') else '') + r['said_as'],
                                  'reference': str(folder / (cand + '.wav')), 'retry': True})
                    f = f'{who}-{i}-{n}.wav'
                    if not (out / f).exists():
                        subprocess.run([checks.ffmpeg(), '-v', 'error', '-y', '-i', str(raw), '-af', extra + lev, '-ac', '1',
                                        '-ar', '44100', '-c:a', 'pcm_s16le', str(out / f)], check=True)
                    clips.append(f)
                    key[f'{who}-{i}/{n}'] = label
                groups.append({'id': f'{who}-{i}', 'name': f"{SPEC[who]['name']} ({cand})", 'text': tests[i]['text'], 'clips': clips})
    finally:
        w.close()
    save(ROOT / 'clean2-key.json', key)
    (out / 'clean2.js').write_text('window.CLEAN = ' + json.dumps(groups) + ';\n', encoding='utf-8')
    page_html = (CLEAN_HTML.replace('clean-votes', 'clean2-votes').replace('clean.js', 'clean2.js')
                 .replace('Voice clarity test</title>', 'Voice clarity test 2</title>')
                 .replace('<h1>Voice clarity test</h1>', '<h1>Voice clarity test 2: the model setting</h1>')
                 .replace('made five ways (A to E', 'made five ways with different model settings, all full quality (A to E'))
    (out / 'index.html').write_text(page_html, encoding='utf-8')
    print(f'clarity test 2: {out / "index.html"} ({len(groups)} lines x {len(ways)})')


AB_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Which cloner</title>
<style>
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b18; --soft:#5d574d; --line:#d9d3c6; }
@media (prefers-color-scheme: dark) { :root { --bg:#191815; --card:#24221e; --ink:#eeeae2; --soft:#aaa397; --line:#3b3832; } }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, "Segoe UI", sans-serif; }
main { max-width:900px; margin:0 auto; padding:16px; } .soft { color:var(--soft); }
.card { background:var(--card); border:2px solid var(--line); border-radius:10px; padding:12px; margin:12px 0; }
.row { display:flex; gap:8px; align-items:center; margin:6px 0; } .row span { width:2em; flex:none; font-weight:600; }
.row audio { flex:1; min-width:200px; height:34px; }
label { display:inline-flex; gap:6px; align-items:center; margin-right:16px; padding:6px 0; cursor:pointer; }
input[type=radio] { width:20px; height:20px; } input[type=text] { width:100%; font:inherit; padding:8px; border:1px solid var(--line); border-radius:6px; background:var(--card); color:var(--ink); }
</style></head><body><main>
<h1>Which model should say the lines?</h1>
<p>Each line, said by a voice you picked, made two ways (A and B, in random order). One way follows the line's delivery note (in brackets); the other is cleaner but ignores it. Choose the one you would put in the game, and say why if you like. Everything saves as you go.</p>
<div id="status" class="soft" role="status"></div><div id="app"></div></main>
<script src="ab.js"></script>
<script>
const app = document.getElementById('app'), st = document.getElementById('status');
let votes = {};
const save = () => fetch('ab-votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(votes) })
  .then(r => { st.textContent = r.ok ? 'Saved.' : 'NOT saved'; }).catch(() => { st.textContent = 'NOT saved: is the page server running?'; });
for (const g of window.AB) {
  const v = votes[g.id] = votes[g.id] || {};
  const c = document.createElement('div'); c.className = 'card';
  const h = document.createElement('p'); const b = document.createElement('b'); b.textContent = g.name + ': '; h.append(b, '“' + g.text + '” ');
  const s = document.createElement('span'); s.className = 'soft'; s.textContent = '(' + g.delivery + ')'; h.append(s); c.append(h);
  const LET = 'ABCDE'.slice(0, g.clips.length).split('');
  LET.forEach((L, i) => { const r = document.createElement('div'); r.className = 'row'; const sp = document.createElement('span'); sp.textContent = L;
    const a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = g.clips[i];
    a.addEventListener('play', () => document.querySelectorAll('audio').forEach(o => { if (o !== a) o.pause(); })); r.append(sp, a); c.append(r); });
  const p = document.createElement('div');
  for (const [val, t] of LET.map(L => [L, L + ' is best']).concat([['same', 'No clear best']])) {
    const l = document.createElement('label'); const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'ab-' + g.id; inp.value = val;
    inp.dataset.g = g.id; inp.onchange = () => { votes[g.id].pick = val; save(); }; l.append(inp, t); p.append(l); }
  const n = document.createElement('input'); n.type = 'text'; n.placeholder = 'Why (optional)'; n.setAttribute('aria-label', 'Notes on ' + g.name + ' line');
  n.dataset.g = g.id; n.oninput = () => { votes[g.id].note = n.value; save(); }; c.append(p, n); app.append(c);
}
fetch('ab-votes').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(saved => { Object.assign(votes, saved || {});
  document.querySelectorAll('input[type=radio]').forEach(i => { i.checked = (votes[i.dataset.g] || {}).pick === i.value; });
  document.querySelectorAll('input[type=text]').forEach(i => { i.value = (votes[i.dataset.g] || {}).note || ''; }); });
</script></body></html>
'''
CLONE_TEST = ['mitch', 'marge', 'vernon']


def clonetest(stage):
    """Which model clones the picked voices for the script: VoxCPM2 (takes the delivery note) or Qwen3-TTS Base
    (cleaner, no delivery note). stage 'prep' writes qwen-jobs.json for tools/voice-qwen.py; stage 'make' renders the
    VoxCPM takes and builds the A/B page (same filter and loudness for both)."""
    import random
    clips = all_clips()
    jobs, rows = [], []
    for who in CLONE_TEST:
        where, cand = picked(True)[who]
        ref = where / who / (cand + '.wav')
        for i, t in enumerate(test_lines(who, clips)):
            said, note = model_text(who, t['text']), model_delivery(who, t.get('delivery'))
            base = ROOT / 'clone' / who / f'{i}'
            jobs.append({'who': who, 'ref': str(ref), 'ref_text': SPEC[who]['sample'], 'text': said, 'out': str(base) + '-qwen.wav'})
            rows.append({'who': who, 'i': i, 'ref': ref, 'said': said, 'note': note, 'base': base, 'text': t['text'],
                         'delivery': t.get('delivery', '')})
    if stage == 'prep':
        save(ROOT / 'qwen-jobs.json', jobs)
        print(f"{len(jobs)} Qwen jobs: {ROOT / 'qwen-jobs.json'}")
        return
    out = PAGE / 'ab'
    out.mkdir(parents=True, exist_ok=True)
    w, key, groups, rnd = worker(), {}, [], random.Random(5)
    try:
        for r in rows:
            vox = Path(str(r['base']) + '-voxcpm.wav')
            if not vox.exists():
                vox.parent.mkdir(parents=True, exist_ok=True)
                w.render({'id': f"{r['who']}-{r['i']}-vox", 'text': (f"({r['note']})" if r['note'] else '') + r['said'],
                          'out': str(vox), 'seed': 1, 'steps': STEPS, 'cfg': CFG, 'reference': str(r['ref']), 'retry': True})
            pair = [('VoxCPM2 (delivery note)', vox), ('Qwen3-TTS (no delivery note)', Path(str(r['base']) + '-qwen.wav'))]
            rnd.shuffle(pair)
            gid = f"{r['who']}-{r['i']}"
            files = []
            for n, (label, src) in enumerate(pair):
                f = f'{gid}-{"ab"[n]}.mp3'
                if not (out / f).exists():
                    export(src, out / f)
                files.append(f)
                key[f'{gid}/{"AB"[n]}'] = label
            groups.append({'id': gid, 'name': SPEC[r['who']]['name'], 'text': r['text'], 'delivery': r['delivery'], 'clips': files})
    finally:
        w.close()
    save(ROOT / 'ab-key.json', key)
    (out / 'ab.js').write_text('window.AB = ' + json.dumps(groups) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(AB_HTML, encoding='utf-8')
    print(f'cloner test: {out / "index.html"} ({len(groups)} lines)')


def vctest():
    """Cloner test 2: VoxCPM2 performs each line with its delivery note, then Seed-VC's pitch-following model (Voice
    Studio's vc_boot.py, the "pitch" model) rebuilds it in the picked voice, to keep the delivery and get the clean,
    steady voice. Compared with plain VoxCPM2 and with Qwen3-TTS (round 5's takes), three ways, shuffled."""
    import random
    import config as vsconfig
    C = vsconfig.CONFIG
    clips = all_clips()
    rows = []
    for who in CLONE_TEST:
        where, cand = picked(True)[who]
        for i, t in enumerate(test_lines(who, clips)):
            rows.append({'who': who, 'i': i, 'ref': where / who / (cand + '.wav'), 'text': t['text'],
                         'delivery': t.get('delivery', ''), 'said': model_text(who, t['text']),
                         'note': model_delivery(who, t.get('delivery')), 'base': ROOT / 'vc' / who / f'{i}',
                         'qwen': round_dir(5) / 'clone' / who / f'{i}-qwen.wav'})
    w = worker()
    try:
        for r in rows:
            vox = Path(str(r['base']) + '-voxcpm.wav')
            if not vox.exists():
                vox.parent.mkdir(parents=True, exist_ok=True)
                w.render({'id': f"{r['who']}-{r['i']}-vox", 'text': (f"({r['note']})" if r['note'] else '') + r['said'],
                          'out': str(vox), 'seed': 1, 'steps': STEPS, 'cfg': CFG, 'reference': str(r['ref']), 'retry': True})
    finally:
        w.close()   # free the card for Seed-VC
    ff = checks.ffmpeg()
    for who in CLONE_TEST:
        mine = [r for r in rows if r['who'] == who and not Path(str(r['base']) + '-vc.wav').exists()]
        if not mine:
            continue
        work = ROOT / 'vc' / who / 'work'
        work.mkdir(parents=True, exist_ok=True)
        target = work / 'target.wav'   # as recordings.py: at most 10 s of the voice, levelled to -32 LUFS
        subprocess.run([ff, '-v', 'error', '-y', '-i', str(mine[0]['ref']), '-t', '10', '-af', 'loudnorm=I=-32:TP=-6:LRA=11',
                        '-ac', '1', '-ar', '44100', str(target)], check=True)
        pieces = []
        for r in mine:
            src = work / f"src{r['i']}.wav"
            subprocess.run([ff, '-v', 'error', '-y', '-i', str(r['base']) + '-voxcpm.wav', '-af', 'loudnorm=I=-28:TP=-8:LRA=7',
                            '-ac', '1', '-ar', '44100', str(src)], check=True)
            pieces.append({'src': str(src), 'out': str(r['base']) + '-vc.wav'})
        job = {'model': 'pitch', 'target': str(target), 'steps': 30, 'shift': 0, 'match': True, 'similarity': 0.7,
               'intelligibility': 0.7, 'style': False, 'fp32': True, 'pieces': pieces}
        save(work / 'job.json', job)
        env = dict(__import__('os').environ, PYTHONIOENCODING='utf-8', HF_HUB_DISABLE_SYMLINKS_WARNING='1')
        if C.get('hf_home'):
            env['HF_HOME'] = C['hf_home']
        with open(work / 'vc.log', 'w', encoding='utf-8') as log:
            subprocess.run([C['vc_python'], str(Path(VS) / 'vc_boot.py'), C['vc_dir'], str(work / 'job.json')],
                           stdout=log, stderr=log, env=env, check=True)
        print(f'  {who}: {len(pieces)} lines converted', flush=True)
    out = PAGE / 'ab'
    out.mkdir(parents=True, exist_ok=True)
    key, groups, rnd = {}, [], random.Random(6)
    for r in rows:
        three = [('VoxCPM2', Path(str(r['base']) + '-voxcpm.wav')), ('VoxCPM2 then Seed-VC', Path(str(r['base']) + '-vc.wav')),
                 ('Qwen3-TTS', r['qwen'])]
        rnd.shuffle(three)
        gid, files = f"{r['who']}-{r['i']}", []
        for n, (label, src) in enumerate(three):
            f = f'{gid}-{n}.mp3'
            if not (out / f).exists():
                export(src, out / f)
            files.append(f)
            key[f'{gid}/{"ABC"[n]}'] = label
        groups.append({'id': gid, 'name': SPEC[r['who']]['name'], 'text': r['text'], 'delivery': r['delivery'], 'clips': files})
    save(ROOT / 'ab-key.json', key)
    (out / 'ab.js').write_text('window.AB = ' + json.dumps(groups) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(AB_HTML.replace("made two ways (A and B, in random order). One way follows the line's delivery note (in brackets); the other is cleaner but ignores it.",
                                                    'made three ways (A, B and C, in random order).'), encoding='utf-8')
    print(f'cloner test 2: {out / "index.html"} ({len(groups)} lines x 3)')


TURBO_TAGS = [   # a delivery note's words -> one Chatterbox Turbo delivery tag (first match wins); none = no tag
    ('', r'let down|wounded|disappoint|\bsad\b|misty|wistful|nostalgic|flat'),   # no tag fits: better none than wrong
    ('[angry]', r'angry|outraged|indignant|furious|appalled'),
    ('[surprised]', r'surpris|shock|disbelief|alarmed|startled'),
    ('[dramatic]', r'dramatic|theatrical|grand|operatic|sweeping|tragic|anguish|crescendo|ceremonial|emotional'),
    ('[sarcastic]', r'sarcas|smug|dry|deadpan|icy|pointed|sly|wry|unimpressed|haughty|grudging'),
    ('[happy]', r'happy|pleased|delighted|warm|cheerful|proud|upbeat|ecstatic|eager|bright|fond|triumphant'),
    ('[whispering]', r'whisper'),
]


def turbo_tag(note):
    for tag, words in TURBO_TAGS:
        if note and re.search(words, note, re.I):
            return tag
    return ''


def cbtest(stage):
    """Cloner test 3: Chatterbox Turbo (with a delivery tag made from each line's note) against VoxCPM2 (round 6's takes,
    sigh-free notes) and Qwen3-TTS (round 5's takes), on the same 12 lines. 'prep' writes cb-jobs.json for
    tools/voice-chatterbox.py; 'make' builds the three-way page."""
    import random
    clips = all_clips()
    rows = []
    for who in CLONE_TEST:
        where, cand = picked(True)[who]
        for i, t in enumerate(test_lines(who, clips)):
            note = model_delivery(who, t.get('delivery'))
            tag = turbo_tag(note)
            rows.append({'who': who, 'i': i, 'text': t['text'], 'delivery': t.get('delivery', ''), 'tag': tag,
                         'ref': str(where / who / (cand + '.wav')), 'said': model_text(who, t['text']),
                         'cb': ROOT / 'cb' / who / f'{i}-chatterbox.wav',
                         'vox': round_dir(6) / 'vc' / who / f'{i}-voxcpm.wav',
                         'qwen': round_dir(5) / 'clone' / who / f'{i}-qwen.wav'})
    if stage == 'prep':
        save(ROOT / 'cb-jobs.json', [{'ref': r['ref'], 'text': (r['tag'] + ' ' if r['tag'] else '') + r['said'],
                                       'out': str(r['cb'])} for r in rows])
        for r in rows:
            print(f"  {r['who']} {r['i']}: {r['tag'] or '(no tag)':12} <- {r['delivery']}")
        return
    out = PAGE / 'ab'
    out.mkdir(parents=True, exist_ok=True)
    key, groups, rnd = {}, [], random.Random(7)
    for r in rows:
        three = [('VoxCPM2', r['vox']), ('Chatterbox Turbo ' + (r['tag'] or '(no tag)'), r['cb']), ('Qwen3-TTS', r['qwen'])]
        rnd.shuffle(three)
        gid, files = f"{r['who']}-{r['i']}", []
        for n, (label, src) in enumerate(three):
            f = f'{gid}-{n}.mp3'
            if not (out / f).exists():
                export(src, out / f)
            files.append(f)
            key[f'{gid}/{"ABC"[n]}'] = label
        groups.append({'id': gid, 'name': SPEC[r['who']]['name'], 'text': r['text'], 'delivery': r['delivery'], 'clips': files})
    save(ROOT / 'ab-key.json', key)
    (out / 'ab.js').write_text('window.AB = ' + json.dumps(groups) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(AB_HTML.replace("made two ways (A and B, in random order). One way follows the line's delivery note (in brackets); the other is cleaner but ignores it.",
                                                    'made three ways (A, B and C, in random order).'), encoding='utf-8')
    print(f'cloner test 3: {out / "index.html"} ({len(groups)} lines x 3)')


# ── stress test ─────────────────────────────────────────────────────────────────────────────────────────────────
# The same twelve lines for every picked voice, so a difference between voices is the voice's, not the words'.
# A lighthearted game (Bryan, 2026-11-12): expressive but never angry or shouting. What matters is a clean voice,
# natural expressive delivery, and the characters staying distinct; this finds how far each voice can go.
STRESS = [
    ('grumpy', "Hey, I asked for no onions. This is a whole mountain of onions!", 'grumpy and put out, but playful'),
    ('delighted', "Oh, wow! That is the best burger I have ever had in my whole life!", 'delighted and excited'),
    ('thanks', "Thank you so much. That's exactly how I like it.", 'warm and grateful'),
    ('sad', "Aw, you're out of milkshakes? That was the best part of my day.", 'disappointed, a little sad'),
    ('whisper', "Psst. Don't tell anyone, but I'm going to order a second dessert.", 'whispering, secretive'),
    ('nervous', "Uh oh. Is that smoke? Is the grill on fire?", 'worried, a little nervous'),
    ('laugh', "[laughing] Oh, that's too funny. You put the pickles on top of the bun!", 'laughing, amused'),
    ('sarcasm', "Oh, wonderful. Another twenty minutes for one grilled cheese. I simply can't wait.", 'sarcastic, dry'),
    ('sigh', "[sigh] Well, I suppose it's fine. It's not what I pictured, but it's fine.", 'disappointed, resigned'),
    ('unsure', "So I'll have the, [Uhm] the chicken sandwich. No, wait, the fish.", 'unsure, thinking it over'),
    ('fast', "Okay, okay, I need a cheeseburger, fries, a chocolate shake and extra ketchup, and I need it right now, please!",
     'talking very fast, in a hurry'),
    ('slow', "Take your time. There's no rush at all. Good food is worth the wait.", 'slow, relaxed and unhurried'),
    ('long', "When I was young, this whole street was nothing but fields, and on Saturdays my father drove us into town "
             "for one cheeseburger, which we split three ways, and it was the best thing all week.",
     'fond, telling a story'),
]
STRESS_WHO = ['mitch', 'gus', 'kai', 'tony', 'bev', 'marge', 'vernon']


def stress_rows():
    """The lines as the game would make them: the same text and delivery rules as the script (model_text,
    model_delivery), so Bev's calm rule and Vernon's no-tags rule apply."""
    rows, refs = [], picked(True)
    for who in STRESS_WHO:
        where, cand = refs[who]
        home = load(where / who / 'design.json', {}).get(cand, {}).get('pitch')
        for kind, text, note in STRESS:
            said, note = model_text(who, text), model_delivery(who, note)
            base = ROOT / 'stress' / who / kind
            rows.append({'who': who, 'kind': kind, 'text': text, 'note': note, 'said': said, 'home': home,
                         'ref': where / who / (cand + '.wav'), 'cand': cand,
                         'vox': Path(str(base) + '-voxcpm.wav'), 'qwen': Path(str(base) + '-qwen.wav')})
    return rows


STRESS_HTML = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Voice stress test</title>
<style>
:root { --bg:#f6f4ef; --card:#fff; --ink:#1d1b18; --soft:#5d574d; --line:#d9d3c6; --warn:#a4372a; }
@media (prefers-color-scheme: dark) { :root { --bg:#191815; --card:#24221e; --ink:#eeeae2; --soft:#aaa397; --line:#3b3832; --warn:#f0907f; } }
body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.5 system-ui, "Segoe UI", sans-serif; }
main { max-width:960px; margin:0 auto; padding:16px; } .soft { color:var(--soft); } .warn { color:var(--warn); }
nav { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 16px; } nav button { font:inherit; padding:6px 12px; border-radius:6px;
  border:2px solid var(--line); background:var(--card); color:var(--ink); cursor:pointer; } nav button[aria-pressed=true] { border-color:var(--ink); font-weight:700; }
.card { background:var(--card); border:2px solid var(--line); border-radius:10px; padding:12px; margin:12px 0; }
.row { display:flex; gap:8px; align-items:center; margin:6px 0; flex-wrap:wrap; } .row .who { width:9.5em; flex:none; font-weight:600; }
.row audio { flex:1; min-width:200px; height:34px; } select { font:inherit; padding:4px; } .m { font-size:13px; width:100%; margin:-4px 0 4px 9.5em; }
input[type=text] { width:100%; box-sizing:border-box; font:inherit; padding:6px 8px; border:1px solid var(--line); border-radius:6px; background:var(--card); color:var(--ink); }
@media (max-width:600px) { .row .who { width:100%; } .m { margin-left:0; } }
</style></head><body><main>
<h1>Voice stress test</h1>
<p>Each picked voice says the same thirteen expressive lines (grumpy, delighted, grateful, a little sad, a whisper, nervous, laughing, sarcasm, sound tags, fast, slow, long), made by both models with the game's normal text rules. <b>VoxCPM2</b> is given the delivery note; <b>Qwen3-TTS</b> ignores notes and gets the words only (sound tags removed), so it shows the voice's default. For each take: does the voice <b>hold up</b>, and did the <b>feeling come through</b>? The numbers under each take are the machine's: clarity (about 4 = clean, under 3 = rough), pitch against the voice's own, and words heard wrong.</p>
<nav id="nav" aria-label="Voices"></nav>
<div id="status" class="soft" role="status"></div><div id="app"></div></main>
<script src="stress.js"></script>
<script>
const app = document.getElementById('app'), st = document.getElementById('status'), nav = document.getElementById('nav');
let votes = {}, who = location.hash.slice(1) || window.STRESS[0].who;
const save = () => fetch('stress-votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(votes) })
  .then(r => { st.textContent = r.ok ? 'Saved.' : 'NOT saved'; }).catch(() => { st.textContent = 'NOT saved: is the page server running?'; });
function sel(key, label, opts) {
  const s = document.createElement('select'); s.setAttribute('aria-label', label);
  for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; if ((votes[key] || '') === v) o.selected = true; s.append(o); }
  s.onchange = () => { votes[key] = s.value; save(); }; return s;
}
function render() {
  nav.textContent = '';
  for (const v of window.STRESS) { const b = document.createElement('button'); b.textContent = v.name; b.setAttribute('aria-pressed', v.who === who);
    b.onclick = () => { who = v.who; location.hash = who; render(); }; nav.append(b); }
  app.textContent = '';
  const v = window.STRESS.find(x => x.who === who);
  if (v.cands) {   // the redesign page: pick one voice for the character
    const c = document.createElement('div'); c.className = 'card'; const h = document.createElement('p'); h.innerHTML = '<b>Your pick for ' + v.name + '</b>'; c.append(h);
    const pk = v.who + '/pick';
    for (const L of v.cands.concat(['none'])) {
      const l = document.createElement('label'); l.style.marginRight = '16px'; const i = document.createElement('input'); i.type = 'radio'; i.name = pk; i.value = L;
      i.checked = votes[pk] === L; i.onchange = () => { votes[pk] = L; save(); }; l.append(i, ' ' + (L === 'none' ? 'None of them' : 'Voice ' + L)); c.append(l);
    }
    app.append(c);
  }
  for (const g of v.lines) {
    const c = document.createElement('div'); c.className = 'card';
    const h = document.createElement('p'); const b = document.createElement('b'); b.textContent = g.kind + ': ';
    const n = document.createElement('span'); n.className = 'soft'; n.textContent = ' (' + g.note + ')'; h.append(b, '“' + g.text + '”', n); c.append(h);
    for (const t of g.takes) {
      const key = v.who + '/' + g.kind + '/' + t.model, r = document.createElement('div'); r.className = 'row';
      const s = document.createElement('span'); s.className = 'who'; s.textContent = t.label;
      const a = document.createElement('audio'); a.controls = true; a.preload = 'none'; a.src = t.file;
      a.addEventListener('play', () => document.querySelectorAll('audio').forEach(o => { if (o !== a) o.pause(); }));
      r.append(s, a, sel(key + '/holds', 'Voice holds up, ' + t.label, [['', 'voice...'], ['good', 'holds up'], ['little', 'a little rough'], ['breaks', 'breaks']]),
        sel(key + '/feel', 'Feeling came through, ' + t.label, [['', 'feeling...'], ['yes', 'came through'], ['partly', 'partly'], ['no', 'flat / wrong']]));
      const m = document.createElement('div'); m.className = 'm soft';
      m.innerHTML = 'clarity ' + t.clarity + ' · ' + t.pitch + ' Hz (voice ' + v.home + ')' + (t.drift ? ' <span class="warn">off pitch</span>' : '') +
        (t.like != null ? ' · likeness to the recording ' + t.like : '') +
        ' · ' + (t.diffs.length ? '<span class="warn">' + t.diffs.length + ' word(s) wrong</span>' : 'words right');
      if (t.diffs.length) m.title = t.diffs.join('\n');
      r.append(m); c.append(r);
    }
    const note = document.createElement('input'); note.type = 'text'; note.placeholder = 'Notes (optional)'; note.setAttribute('aria-label', 'Notes on ' + v.name + ' ' + g.kind);
    const nk = v.who + '/' + g.kind + '/note'; note.value = votes[nk] || ''; note.oninput = () => { votes[nk] = note.value; save(); }; c.append(note);
    app.append(c);
  }
}
fetch('stress-votes').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(s => { votes = s || {}; render(); });
</script></body></html>
'''


def stresstest(stage):
    """Stress test (round 8): the seven picked voices, thirteen expressive lines each, by VoxCPM2 (with the delivery note) and
    Qwen3-TTS (words only). 'prep' writes qwen-jobs.json for `tools/voice-qwen.py jobs`; 'make' renders VoxCPM's takes
    (seed 1, one take: no second chances, this is to find where voices break), measures both and builds the page."""
    rows = stress_rows()
    if stage == 'prep':
        save(ROOT / 'qwen-jobs.json', [{'who': r['who'], 'ref': str(r['ref']), 'ref_text': SPEC[r['who']]['sample'],
                                         'text': TAGS.sub(' ', r['said']).strip(), 'out': str(r['qwen'])} for r in rows])
        print(f"{len(rows)} Qwen jobs: {ROOT / 'qwen-jobs.json'}")
        return
    w = worker()
    try:
        for r in rows:
            if not r['vox'].exists():
                r['vox'].parent.mkdir(parents=True, exist_ok=True)
                ans = w.render({'id': f"{r['who']}-{r['kind']}", 'text': (f"({r['note']})" if r['note'] else '') + r['said'],
                                'out': str(r['vox']),
                                'seed': 1, 'steps': STEPS, 'cfg': CFG, 'reference': str(r['ref']), 'retry': True})
                print(f"  {r['who']} {r['kind']}: {'ok' if ans.get('ok') else 'FAILED'}", flush=True)
    finally:
        w.close()
    rep = load(ROOT / 'stress.json', {})
    out = PAGE / 'stress'
    out.mkdir(parents=True, exist_ok=True)
    voices_out = {}
    for r in rows:
        v = voices_out.setdefault(r['who'], {'who': r['who'], 'name': SPEC[r['who']]['name'], 'home': r['home'],
                                             'ref': r['cand'], 'lines': []})
        takes = []
        for model, label, src, text in (('voxcpm', 'VoxCPM2 + note', r['vox'], r['said']),
                                        ('qwen', 'Qwen3-TTS', r['qwen'], TAGS.sub(' ', r['said']).strip())):
            if not src.exists():
                print(f"  missing: {src}", flush=True)
                continue
            key = f"{r['who']}/{r['kind']}/{model}"
            if key not in rep:
                work = ROOT / 'stress' / r['who'] / 'work'
                work.mkdir(parents=True, exist_ok=True)
                m = check(src, TAGS.sub(' ', text).strip(), work)
                m['drift'] = bool(r['home'] and m['pitch']) and abs(m['pitch'] - r['home']) > DRIFT * r['home']
                rep[key] = m
                save(ROOT / 'stress.json', rep)
                print(f"  {key}: clarity {m['clarity']}, {m['pitch']} Hz (voice {r['home']}), {len(m['diffs'])} wrong", flush=True)
            f = f"{r['who']}-{r['kind']}-{model}.mp3"
            if not (out / f).exists():
                export(src, out / f)
            m = rep[key]
            takes.append({'model': model, 'label': label, 'file': f, 'clarity': m['clarity'], 'pitch': m['pitch'],
                          'drift': m['drift'], 'diffs': m['diffs']})
        v['lines'].append({'kind': r['kind'], 'text': r['text'], 'note': r['note'], 'takes': takes})
    (out / 'stress.js').write_text('window.STRESS = ' + json.dumps(list(voices_out.values())) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(STRESS_HTML, encoding='utf-8')
    print(f'stress test: {out / "index.html"} ({len(rows)} lines x 2)')


# ── requalify (round 11) ────────────────────────────────────────────────────────────────────────────────────────
# After the stress test (2026-11-12): a voice is picked on how it carries expressive lines, not on one calm sample.
REQ_LINES = ['delighted', 'grumpy', 'sad', 'sarcasm', 'thanks']
REQ_RETAKES = 2       # best retakes kept per character
REQ_PER_STYLE = 1     # best take kept per new style


def ranked(rows, c):
    lo, hi = c['pitch']
    return sorted(rows, key=lambda nr: (len(nr[1]['diffs']) > allowed(c['sample']), not lo <= nr[1]['pitch'] <= hi,
                                        -nr[1]['clarity']))


def export_fx(src, dst, params):
    """export() plus a Voice Studio effect (effects.py), for a voice the game plays through one (the PA's speakers)."""
    if not params:
        return export(src, dst)
    sys.path.insert(0, str(VS))
    import effects
    effects.init(str(ROOT / 'fx'))
    clean = 'highpass=f=70,lowpass=f=11000,afftdn=nf=-40:nr=8,deesser=i=0.4'
    trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06'
    parts, files = effects.build(params, 'dry', 'wet', 1)
    graph = ';'.join([f'[0:a]{clean},{trim},areverse,{trim},areverse[dry]'] + parts + ['[wet]loudnorm=I=-17:TP=-1.5:LRA=11[out]'])
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([voices.checks.ffmpeg(), '-v', 'error', '-y', '-i', str(src)] + [x for f in files for x in ('-i', f)] +
                   ['-filter_complex', graph, '-map', '[out]', '-ac', '1', '-ar', '44100', '-b:a', '64k', str(dst)], check=True)


def requal(stage):
    """Rounds 11+: candidates for each character in _round<N> (retakes of a voice, new designs, earlier runners-up),
    the best kept, each saying REQ_LINES as the game would make them (VoxCPM2 + note, two seeds, the better kept), then
    a blind page with the current pick (if any) among them. Each character's settings are its "r<N>" entry:
      current      voice-source path of the current voice (default: the latest pick; null = none yet)
      retake_from  path the retakes clone (default: current); retake_note  their delivery note
      styles, old  new designs ({id, seeds, describe}) and earlier takes to include
      retakes, per_style  how many retakes / takes per style are kept;  effect  Voice Studio effect for the page
    'make' does it all and picks up where it stopped."""
    import random
    import shutil
    who_list = SPEC[f'_round{ROUND}']
    cur = picked(True)
    lines_by = {k: (t, n) for k, t, n in STRESS}

    def tests_for(who):
        """The lines a character's candidates say: REQ_LINES, or real game lines ("tests": trial clip ids, read from
        round 20's results.json with their delivery notes)."""
        ids = SPEC[who][f'r{ROUND}'].get('tests')
        if not ids:
            return REQ_LINES
        trial = load(round_dir(20) / 'results.json', {})
        now = {c['clip']: c for c in all_clips()}   # today's script: a line reworded since the trial is said as it is now
        kinds = []
        for cid in ids:
            k = re.sub(r'[^\w.-]', '_', cid.split('/', 1)[1])
            cur = now.get(cid) or now.get(cid.replace(':customer.', ':'))   # a shared line that became the speaker's own copy
            lines_by[k] = (cur['text'], cur.get('delivery', '')) if cur else (trial[cid]['text'], trial[cid]['delivery'])
            kinds.append(k)
        return kinds
    vsrc = GAME / 'voice-source'
    w = worker()
    try:
        for who in who_list:
            c, r11 = SPEC[who], SPEC[who][f'r{ROUND}']
            if r11.get('pitch'):   # a round's own pitch range for choosing which takes to keep
                c = dict(c, pitch=r11['pitch'])
            folder = ROOT / who
            work = folder / 'work'
            work.mkdir(parents=True, exist_ok=True)
            rep = load(folder / 'cands.json', {})
            if 'current' in r11:
                home_ref = vsrc / (r11['current'] + '.wav') if r11['current'] else None
            else:
                where, pick = cur[who]
                home_ref = where / who / (pick + '.wav')
            # retake_from: one path, or a list (each gets its own retakes, named retake-<its name>-s<seed>, kept per source)
            rf = r11.get('retake_from')
            retake_refs = ([('', vsrc / (rf + '.wav'))] if isinstance(rf, str) else
                           [(Path(x).name + '-', vsrc / (x + '.wav')) for x in rf] if rf else
                           [] if rf == [] else [('', home_ref)] if home_ref else [])   # [] = no retakes
            r11.setdefault('styles', [])
            r11.setdefault('old', [])
            jobs = []   # (name, source, render job or None for an existing file)
            for tag, retake_ref in retake_refs:
                note = model_delivery(who, r11['retake_note'])
                for seed in range(1, 7):
                    with_note = seed <= 3
                    jobs.append((f'retake-{tag}s{seed}', 'retake:' + tag, {'text': (f'({note})' if with_note and note else '') + model_text(who, c['sample']),
                                                                           'seed': seed, 'reference': str(retake_ref)}))
            for st in r11['styles']:
                for seed in st['seeds']:
                    jobs.append((f"{st['id']}-s{seed}", 'design:' + st['id'], {'text': f"({st['describe']}){c['sample']}", 'seed': seed}))
            if home_ref:
                jobs.append(('current', 'current', home_ref))
            for o in r11['old']:
                jobs.append(('old-' + Path(o).name, 'old', vsrc / (o + '.wav')))
            for name, source, job in jobs:
                wav = folder / (name + '.wav')
                if name in rep and wav.exists():
                    continue
                if isinstance(job, Path):
                    shutil.copyfile(job, wav)
                elif not wav.exists():
                    ans = w.render(dict(job, id=f'{who}-{name}', out=str(wav), steps=STEPS, cfg=CFG, retry=True))
                    if not ans.get('ok'):
                        print('  failed', who, name, ans.get('error'), flush=True)
                        continue
                r = check(wav, c['sample'], work)
                r['source'] = source
                rep[name] = r
                save(folder / 'cands.json', rep)
                print(f"  {who} {name}: {r['pitch']} Hz, clarity {r['clarity']}, {len(r['diffs'])} wrong", flush=True)
            # kept: the current pick, the earlier runners-up, the best retakes, the best of each new style
            kept = [n for n, r in rep.items() if r['source'] in ('current', 'old')]
            n_retakes = r11.get('retakes', REQ_RETAKES if r11['styles'] or r11['old'] else 4)   # retakes the only source (Vernon): more
            for tag, _ in retake_refs:   # 'retake' was round 11's name for the one source ('retake:' now)
                kept += [n for n, _ in ranked([(n, r) for n, r in rep.items() if r['source'] in ('retake:' + tag, 'retake' if not tag else '')], c)[:n_retakes]]
            for st in r11['styles']:
                kept += [n for n, _ in ranked([(n, r) for n, r in rep.items() if r['source'] == 'design:' + st['id']], c)[:r11.get('per_style', REQ_PER_STYLE)]]
            save(folder / 'kept.json', kept)
            # each kept candidate says the expressive lines, as the game makes lines: two seeds, the better kept
            lrep = load(folder / 'lines.json', {})
            for cand in (kept if r11.get('lines', True) else []):   # lines: false = the sample only (an accent round)
                home = rep[cand]['pitch']
                out_dir = folder / 'lines' / cand
                out_dir.mkdir(parents=True, exist_ok=True)
                for kind in tests_for(who):
                    key = f'{cand}/{kind}'
                    final = out_dir / f'{kind}.wav'
                    if key in lrep and final.exists():
                        continue
                    text, dnote = lines_by[kind]
                    said, dnote = model_text(who, text), model_delivery(who, dnote)
                    takes = []
                    for seed in (1, 2):
                        wav = out_dir / f'{kind}-s{seed}.wav'
                        ans = w.render({'id': f'{who}-{key}-{seed}', 'text': (f'({dnote})' if dnote else '') + said, 'out': str(wav),
                                        'seed': seed, 'steps': STEPS, 'cfg': CFG, 'reference': str(folder / (cand + '.wav')), 'retry': True})
                        if not ans.get('ok'):
                            continue
                        r = check(wav, said, work)
                        r.update(wav=wav.name, drift=bool(home and r['pitch']) and abs(r['pitch'] - home) > DRIFT * home)
                        takes.append(r)
                        if len(r['diffs']) <= allowed(said) and not r['drift'] and r['clarity'] >= CLEAR:
                            break
                    if not takes:
                        continue
                    best = sorted(takes, key=lambda r: (len(r['diffs']), r['drift'], -r['clarity']))[0]
                    (out_dir / best['wav']).replace(final)
                    for r in takes:
                        (out_dir / r['wav']).unlink(missing_ok=True)
                    best.update(takes=len(takes))
                    del best['wav']
                    lrep[key] = best
                    save(folder / 'lines.json', lrep)
                    print(f"  {who} {key}: clarity {best['clarity']}, {best['pitch']} Hz (voice {home}), {len(takes)} take(s)", flush=True)
    finally:
        w.close()
    # the page: candidates as letters, shuffled per character (key in req-key.json), sample first, then the lines
    out = PAGE / 'req'
    out.mkdir(parents=True, exist_ok=True)
    key, voices_out, rnd = {}, [], random.Random(ROUND)
    for who in who_list:
        folder = ROOT / who
        rep, lrep, kept = load(folder / 'cands.json', {}), load(folder / 'lines.json', {}), load(folder / 'kept.json', [])
        fx = SPEC[who][f'r{ROUND}'].get('effect')
        like_to = SPEC[who][f'r{ROUND}'].get('likeness_to')   # a recording no take should sound like (Sal's source)
        if like_to:
            import numpy as np
            likes = load(folder / 'likeness.json', {})

            def like(src):
                k = src.relative_to(folder).as_posix()
                if k not in likes or likes[k][0] != src.stat().st_mtime:
                    w16 = folder / 'work' / ('like16-' + k.replace('/', '-'))
                    subprocess.run([voices.checks.ffmpeg(), '-v', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', '16000', str(w16)], check=True)
                    a, b = embed(w16), base
                    likes[k] = [src.stat().st_mtime, round(float(np.dot(a, b) / np.linalg.norm(a) / np.linalg.norm(b)), 3)]
                return likes[k][1]
            ref16 = folder / 'work' / 'like16-reference.wav'
            subprocess.run([voices.checks.ffmpeg(), '-v', 'error', '-y', '-i', str(GAME / 'voice-source' / (like_to + '.wav')), '-ac', '1', '-ar', '16000', str(ref16)], check=True)
            base = embed(ref16)
        order = kept[:]
        rnd.shuffle(order)
        letters = {cand: 'ABCDEFGHIJKL'[i] for i, cand in enumerate(order)}
        for cand, L in letters.items():
            key[f'{who}/{L}'] = cand
        groups = [('sample', SPEC[who]['sample'], 'the voice as designed', lambda cand: (folder / (cand + '.wav'), rep[cand]))]
        groups += [(k, lines_by[k][0], lines_by[k][1], (lambda k: lambda cand: (folder / 'lines' / cand / f'{k}.wav', lrep.get(f'{cand}/{k}')))(k))
                   for k in tests_for(who) if SPEC[who][f'r{ROUND}'].get('lines', True)]
        home = rep['current']['pitch'] if 'current' in rep else round(sum(SPEC[who]['pitch']) / 2)
        v = {'who': who, 'name': SPEC[who]['name'] + (' (heard through the speaker effect)' if fx else ''), 'home': home,
             'cands': [letters[x] for x in order], 'lines': []}
        for kind, text, gnote, get in groups:
            takes = []
            for cand in order:
                src, m = get(cand)
                if not src.exists() or not m:
                    continue
                f = f'{who}-{kind}-{letters[cand]}.mp3'
                if not (out / f).exists():
                    export_fx(src, out / f, fx)
                takes.append({'model': letters[cand], 'label': 'Voice ' + letters[cand], 'file': f, 'clarity': m['clarity'],
                              'pitch': m['pitch'], 'drift': bool(m.get('drift')), 'diffs': m['diffs'],
                              'like': like(src) if like_to else None})
            v['lines'].append({'kind': kind, 'text': text, 'note': gnote, 'takes': takes})
        if like_to:
            save(folder / 'likeness.json', likes)
        voices_out.append(v)
    save(ROOT / 'req-key.json', key)
    (out / 'stress.js').write_text('window.STRESS = ' + json.dumps(voices_out) + ';\n', encoding='utf-8')
    html_src = STRESS_HTML
    if SPEC.get(f'_round{ROUND}_ask') == 'accent':   # the second rating asks about the accent, not the feeling
        html_src = (html_src.replace("'Feeling came through, '", "'Accent came through, '")
                    .replace("[['', 'feeling...'], ['yes', 'came through'], ['partly', 'partly'], ['no', 'flat / wrong']]",
                             "[['', 'accent...'], ['yes', 'clearly there'], ['partly', 'some / overdone'], ['no', 'missing / wrong']]"))
    (out / 'index.html').write_text(
        html_src.replace('stress-votes', 'req-votes').replace('<title>Voice stress test</title>', '<title>Voice redesign</title>')
        .replace('<h1>Voice stress test</h1>', f"<h1>{', '.join(SPEC[w]['name'] for w in who_list)}: which voice carries the feeling?</h1>")
        .replace(re.search(r'<p>Each picked voice.*?</p>', STRESS_HTML, re.S).group(0),
                 '<p>Each character\'s candidates (letters, shuffled; the current voice, where there is one, is among them) say the sample' + ('' if SPEC.get(f'_round{ROUND}_ask') == 'accent' else ', then five expressive lines made the way the game makes them') + '. Rate each take, then pick the voice at the top. Machine numbers are under each take (clarity about 4 = clean, under 3 = rough).</p>'),
        encoding='utf-8')
    print(f'requalify page: {out / "index.html"}')


def main():
    global ROUND, ROOT, PAGE
    if '--round' in sys.argv:
        k = sys.argv.index('--round')
        ROUND = int(sys.argv[k + 1])
        del sys.argv[k:k + 2]
        ROOT = PILOT1 if ROUND == 1 else GAME / 'voice-source' / f'pilot{ROUND}'
        PAGE = ROOT / 'page'
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else ''), sys.argv[2:]
    if cmd == 'clean':
        clean()
        return
    if cmd == 'clean2':
        clean2()
        return
    if cmd == 'requal':
        requal(args[0] if args else 'make')
        return
    if cmd == 'stresstest':
        stresstest(args[0] if args else 'make')
        return
    if cmd == 'cbtest':
        cbtest(args[0] if args else 'make')
        return
    if cmd == 'vctest':
        vctest()
        return
    if cmd == 'clonetest':
        clonetest(args[0] if args else 'make')
        return
    if cmd == 'design':
        design(names(args))
    elif cmd == 'lines':
        lines(names(args))
    elif cmd == 'distinct':
        distinct(names(args))
    elif cmd == 'page':
        page(names(args))
    elif cmd == 'parts':
        parts(args or ['marge', 'gus'])
    elif cmd == 'serve':
        serve(int(args[0]) if args else 8810)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
