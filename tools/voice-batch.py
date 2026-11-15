"""Ben's Food Court - the batch recorder for the cast's lines, in the picked voices (tools/voice-picks.json).

Built 2026-11-14 for the trial before the full run. Each line the way the voice pass decided (2026-11-12/13):
  VoxCPM2 clones the character's picked reference (voice-source/<path>.wav) with the line's delivery note, using the
  pilot's per-character rules (voice-pilot.py model_text / model_delivery: respellings, calm voices, no sigh tags);
  up to four takes, stopping at the first that is heard right, not rushed, near the voice's pitch and clear;
  a line whose best take still falls short (clarity under 3, off pitch, or words wrong) goes to Qwen3-TTS, which clones
  the same voice without the note; the better of the two by the same checks is kept;
  exported with the clean-up filter, and the PA through her speaker effect (voice-cast.json r12 "effect").

  <voice studio python> tools/voice-batch.py trial            pick the trial lines -> voice-source/pilot20/clips.json
  <voice studio python> tools/voice-batch.py run [clips.json]  VoxCPM pass; writes results.json and qwen-jobs.json
  <venv-qwen python>    tools/voice-qwen.py jobs voice-source/pilot20/qwen-jobs.json
  <voice studio python> tools/voice-batch.py fallback         measures the Qwen takes, keeps the better per line
  <voice studio python> tools/voice-batch.py page             listening page (serve: voice-pilot.py --round 20 serve)
Every step picks up where it stopped. The trial writes only under voice-source/pilot20, never into packs/.
"""
import importlib.util
import json
import random
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('voice_pilot', str(HERE / 'voice-pilot.py'))
vp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vp)
from voices import CFG, GAME, STEPS, checks  # noqa: E402

ROOT = GAME / 'voice-source' / 'pilot20'
PICKS = {k: v for k, v in json.loads((HERE / 'voice-picks.json').read_text(encoding='utf-8')).items() if not k.startswith('_')}
SEEDS = (1, 2, 3, 4)
MAX_RATE = 4.6        # words per second: faster is gabbled (voices.py record)
CLEAR = 3.0           # clarity under this is rough
SLACK = 0.25          # a take this far off the voice's own pitch sounds like someone else (a note allows this much)


def setup():
    vp.ROUND, vp.ROOT, vp.PAGE = 20, ROOT, ROOT / 'page'


def ref_of(who):
    return GAME / 'voice-source' / (PICKS[who] + '.wav')


def trial():
    """A few lines per speaker, each from a different kind of moment (no order.intro: under review)."""
    clips = json.loads((ROOT / 'clips-all.json').read_text(encoding='utf-8'))
    rnd = random.Random(20)
    out = []
    for who in PICKS:
        mine = [c for c in clips if c['speaker'] == who and c['moment'] != 'order.intro' and c.get('delivery')]
        groups = defaultdict(list)
        for c in mine:
            groups[c['moment'].split('.')[0] + ('.' + c['moment'].split('.')[1] if c['moment'].startswith(('react', 'order', 'tutorial')) and '.' in c['moment'] else '')].append(c)
        keys = sorted(groups, key=lambda k: -len(groups[k]))
        want = 6 if who == 'mitch' else 4
        for k in keys[:want]:
            out.append(rnd.choice(groups[k]))
    vp.save(ROOT / 'clips.json', out)
    print(f'{len(out)} trial lines for {len(PICKS)} speakers -> {ROOT / "clips.json"}')


_home = {}


def home_pitch(who):
    if who not in _home:
        r = vp.check(ref_of(who), vp.SPEC[who]['sample'], ROOT / 'work')
        _home[who] = (r['pitch'], r['said'])
    return _home[who]


CLIP = 0.5           # per mille of samples at or near full scale (>0.97): above this, audibly clipped (round 21's Kai)


def clipped(wav):
    """Per mille of samples at or near full scale in a raw take: clipping the clarity score does not hear."""
    import numpy as np
    import soundfile as sf
    x, _ = sf.read(str(wav))
    x = x.mean(axis=1) if x.ndim > 1 else x
    return round(float(np.mean(np.abs(x) > 0.97)) * 1000, 3)


def judge(r, words, home):
    """(passes, sort key): heard right (one slip allowed on a long line), not rushed, near the voice's pitch, clear,
    not clipped."""
    drift = bool(home and r['pitch']) and abs(r['pitch'] - home) > SLACK * home
    clip = r.get('clip', 0) > CLIP
    ok = len(r['diffs']) <= (1 if words > 8 else 0) and r['rate'] <= MAX_RATE and not drift and r['clarity'] >= CLEAR and not clip
    return ok, (len(r['diffs']), r['rate'] > MAX_RATE, drift, clip, -r['clarity']), drift


def run(path=None):
    clips = json.loads(Path(path or ROOT / 'clips.json').read_text(encoding='utf-8'))
    (ROOT / 'work').mkdir(parents=True, exist_ok=True)
    res = vp.load(ROOT / 'results.json', {})
    w = vp.worker()
    try:
        for n, c in enumerate(clips, 1):
            key, who = c['clip'], c['speaker']
            if key in res:
                continue
            folder = ROOT / 'takes' / who
            (folder / 'work').mkdir(parents=True, exist_ok=True)
            said = vp.model_text(who, c['text'])
            note = vp.model_delivery(who, c.get('delivery'))
            home, _ = home_pitch(who)
            words = max(1, len(checks.words(c['text'])))
            safe = vp.re.sub(r'[^\w.@-]', '_', key.split('/', 1)[1])
            takes = []
            for seed in SEEDS:
                wav = folder / f'{safe}-vox-s{seed}.wav'
                if not wav.exists():
                    ans = w.render({'id': f'{key}-{seed}', 'text': (f'({note})' if note else '') + said, 'out': str(wav),
                                    'seed': seed, 'steps': STEPS, 'cfg': CFG, 'reference': str(ref_of(who)), 'retry': True})
                    if not ans.get('ok'):
                        continue
                r = vp.check(wav, said, folder / 'work')
                r['clip'] = clipped(wav)
                ok, sk, drift = judge(r, words, home)
                r.update(wav=str(wav.relative_to(ROOT)), seed=seed, model='voxcpm', ok=ok, drift=drift)
                takes.append(r)
                if ok:
                    break
            if not takes:
                print('  NO TAKE', key, flush=True)
                continue
            best = sorted(takes, key=lambda r: judge(r, words, home)[1])[0]
            res[key] = {'clip': key, 'who': who, 'text': c['text'], 'said': said, 'delivery': c.get('delivery', ''), 'note': note,
                        'moment': c['moment'], 'home': home, 'tries': len(takes), 'best': best, 'fallback': not best['ok']}
            vp.save(ROOT / 'results.json', res)
            print(f"  {n}/{len(clips)} {key}: {len(takes)} take(s), clarity {best['clarity']}, {best['pitch']} Hz (voice {home})"
                  f"{'' if best['ok'] else ' -> Qwen fallback'}", flush=True)
    finally:
        w.close()
    jobs = []
    for key, r in res.items():
        if r['fallback']:
            _, ref_text = home_pitch(r['who'])
            out = ROOT / 'takes' / r['who'] / (vp.re.sub(r'[^\w.@-]', '_', key.split('/', 1)[1]) + '-qwen.wav')
            jobs.append({'ref': str(ref_of(r['who'])), 'ref_text': ref_text, 'text': r['said'], 'out': str(out)})
    vp.save(ROOT / 'qwen-jobs.json', jobs)
    print(f'VoxCPM pass done: {len(res)} lines, {len(jobs)} for the Qwen fallback ({ROOT / "qwen-jobs.json"})')


def fallback():
    res = vp.load(ROOT / 'results.json', {})
    for key, r in res.items():
        if not r['fallback'] or 'qwen' in r:
            continue
        wav = ROOT / 'takes' / r['who'] / (vp.re.sub(r'[^\w.@-]', '_', key.split('/', 1)[1]) + '-qwen.wav')
        if not wav.exists():
            print('  no Qwen take yet:', key)
            continue
        q = vp.check(wav, r['said'], ROOT / 'takes' / r['who'] / 'work')
        words = max(1, len(checks.words(r['text'])))
        ok, sk, drift = judge(q, words, r['home'])
        q.update(wav=str(wav.relative_to(ROOT)), model='qwen', ok=ok, drift=drift)
        r['qwen'] = q
        r['chosen'] = 'qwen' if sk < judge(r['best'], words, r['home'])[1] else 'voxcpm'
        print(f"  {key}: VoxCPM clarity {r['best']['clarity']} vs Qwen {q['clarity']} -> {r['chosen']}", flush=True)
    vp.save(ROOT / 'results.json', res)


def page():
    """The listening page: per speaker, each line's kept take (labelled VoxCPM or Qwen), rated holds up / feeling."""
    res = vp.load(ROOT / 'results.json', {})
    out = vp.PAGE / 'req'
    out.mkdir(parents=True, exist_ok=True)
    fx = vp.SPEC['pa'].get('r12', {}).get('effect')
    voices_out = []
    for who in PICKS:
        mine = [r for r in res.values() if r['who'] == who]
        if not mine:
            continue
        v = {'who': who, 'name': vp.SPEC[who]['name'] if who in vp.SPEC else who.title(), 'home': mine[0]['home'],
             'cands': ['A'], 'lines': []}
        for r in mine:
            take = r['qwen'] if r.get('chosen') == 'qwen' else r['best']
            src = ROOT / take['wav']
            f = vp.re.sub(r'[^\w.@-]', '_', r['clip']) + '.mp3'
            if not (out / f).exists():
                vp.export_fx(src, out / f, fx if who == 'pa' else None)
            label = ('Qwen (fallback)' if take['model'] == 'qwen' else 'VoxCPM') + f", take {r['tries']}" + ('' if take['ok'] else ' - below the bar')
            v['lines'].append({'kind': r['moment'].replace('.', '-'), 'text': r['text'], 'note': r['delivery'],
                               'takes': [{'model': 'A', 'label': label, 'file': f, 'clarity': take['clarity'], 'pitch': take['pitch'],
                                          'drift': take['drift'], 'diffs': take['diffs']}]})
        voices_out.append(v)
    (out / 'stress.js').write_text('window.STRESS = ' + json.dumps(voices_out) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(
        vp.STRESS_HTML.replace('stress-votes', 'req-votes').replace('<title>Voice stress test</title>', '<title>Batch trial</title>')
        .replace('<h1>Voice stress test</h1>', '<h1>Batch trial: real game lines in the picked voices</h1>')
        .replace(vp.re.search(r'<p>Each picked voice.*?</p>', vp.STRESS_HTML, vp.re.S).group(0),
                 '<p>A few real lines per character, made the way the full run will make them (VoxCPM with the delivery note, '
                 'up to four takes; Qwen when VoxCPM fell short). Rate each take. The label says which model made it and on which take.</p>'),
        encoding='utf-8')
    n = len(res)
    q = sum(1 for r in res.values() if r.get('chosen') == 'qwen')
    print(f'trial page: {out / "index.html"} ({n} lines, {q} from Qwen)')


def notetest(spec_path):
    """Side-by-side versions of real lines (round 22, 2026-11-14): spec = [{clip, who, text, note, variants: [{label,
    text?, note?}]}]; each version made in the picked voice (2 seeds, the better kept), then one page row per line with
    its versions as labelled takes. Writes under voice-source/pilot22."""
    global ROOT
    ROOT = GAME / 'voice-source' / 'pilot22'
    vp.ROUND, vp.ROOT, vp.PAGE = 22, ROOT, ROOT / 'page'
    spec = json.loads(Path(spec_path).read_text(encoding='utf-8'))
    res = vp.load(ROOT / 'results.json', {})
    w = vp.worker()
    try:
        for row in spec:
            who = row['who']
            folder = ROOT / 'takes' / who
            (folder / 'work').mkdir(parents=True, exist_ok=True)
            home, _ = home_pitch(who)
            for vi, var in enumerate(row['variants']):
                key = f"{row['clip']}#{vi}"
                if key in res:
                    continue
                text = var.get('text', row['text'])
                said = vp.model_text(who, text)
                note = var['note'] if 'note' in var else vp.model_delivery(who, row.get('note'))
                words = max(1, len(checks.words(text)))
                safe = vp.re.sub(r'[^\w.@-]', '_', row['clip'].split('/', 1)[1]) + f'-v{vi}'
                takes = []
                for seed in (1, 2):
                    wav = folder / f'{safe}-s{seed}.wav'
                    if not wav.exists():
                        ans = w.render({'id': f'{key}-{seed}', 'text': (f'({note})' if note else '') + said, 'out': str(wav),
                                        'seed': seed, 'steps': STEPS, 'cfg': CFG, 'reference': str(ref_of(who)), 'retry': True})
                        if not ans.get('ok'):
                            continue
                    r = vp.check(wav, said, folder / 'work')
                    r['clip'] = clipped(wav)
                    ok, sk, drift = judge(r, words, home)
                    plain = lambda v: v.item() if hasattr(v, 'item') else v   # numpy bools/floats -> JSON
                    r.update(wav=str(wav.relative_to(ROOT)), ok=bool(ok), drift=bool(drift), sk=[plain(v) for v in sk])
                    takes.append(r)
                    if ok:
                        break
                if not takes:
                    continue
                best = sorted(takes, key=lambda r: r['sk'])[0]
                res[key] = {'row': row['clip'], 'who': who, 'label': var['label'], 'text': text, 'note': note, 'take': best}
                vp.save(ROOT / 'results.json', res)
                print(f"  {key} [{var['label']}]: clarity {best['clarity']}", flush=True)
    finally:
        w.close()
    out = vp.PAGE / 'req'
    out.mkdir(parents=True, exist_ok=True)
    voices_out = {}
    for row in spec:
        who = row['who']
        v = voices_out.setdefault(who, {'who': who, 'name': vp.SPEC[who]['name'], 'home': home_pitch(who)[0], 'cands': [], 'lines': []})
        takes = []
        for vi, var in enumerate(row['variants']):
            r = res.get(f"{row['clip']}#{vi}")
            if not r:
                continue
            f = vp.re.sub(r'[^\w.@-]', '_', row['clip']) + f'-v{vi}.mp3'
            if not (out / f).exists():
                vp.export(ROOT / r['take']['wav'], out / f)
            letter = 'ABCDEFGH'[vi]
            if letter not in v['cands']:
                v['cands'].append(letter)
            takes.append({'model': letter, 'label': f"{letter}: {var['label']}" + (f" (note: {r['note']})" if r['note'] else ' (no note)')
                          + (f" - says: {r['text']}" if r['text'] != row['text'] else ''), 'file': f, 'clarity': r['take']['clarity'],
                          'pitch': r['take']['pitch'], 'drift': r['take']['drift'], 'diffs': r['take']['diffs']})
        v['lines'].append({'kind': vp.re.sub(r'[^\w-]', '-', row['clip'].split('/', 1)[1]), 'text': row['text'],
                           'note': row.get('why', ''), 'takes': takes})
    (out / 'stress.js').write_text('window.STRESS = ' + json.dumps(list(voices_out.values())) + ';\n', encoding='utf-8')
    (out / 'index.html').write_text(
        vp.STRESS_HTML.replace('stress-votes', 'req-votes').replace('<title>Voice stress test</title>', '<title>Delivery test</title>')
        .replace('<h1>Voice stress test</h1>', '<h1>Delivery test: the same line, made different ways</h1>')
        .replace(vp.re.search(r'<p>Each picked voice.*?</p>', vp.STRESS_HTML, vp.re.S).group(0),
                 '<p>Each line is made in the picked voice a few ways (the label says how: which delivery note, or different words '
                 'given to the model). Rate each version; the note box is for which way works.</p>'),
        encoding='utf-8')
    print(f'delivery test page: {out / "index.html"}')


def main():
    setup()
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'notetest':
        return notetest(sys.argv[2])
    if cmd == 'trial':
        trial()
    elif cmd == 'run':
        run(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == 'fallback':
        fallback()
    elif cmd == 'page':
        page()
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
