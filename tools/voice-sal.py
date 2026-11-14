"""Ben's Food Court - Sal's voice from a recorded New York performance (round 16, 2026-11-13).

Bryan made a Voice Studio voice "sal" from a recording of a real person. Sal is NOT to be that person's voice: the
recording gives the accent and the attitude, and the voice is changed two ways, then VoxCPM2 re-records each one
(voice-pilot.py --round 16 requal, which also scores how alike each take is to the recording):
  vc-<design>   Seed-VC (Voice Studio's voice changer, the pitch model, style off so the accent stays) turns the
                performance into the timbre of an earlier designed Sal (right gruffness, no accent)
  deeper-<n>    the performance made n semitones deeper with the formants moved too: a bigger, older man
Run in Voice Studio's Python:  <voice studio python> tools/voice-sal.py
Writes voice-source/pilot16/src/. Picks up where it stopped. Nothing here changes the game.
"""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voices import GAME, VS, checks  # noqa: E402

sys.path.insert(0, str(VS))
import config as vsconfig  # noqa: E402

C = vsconfig.CONFIG
REC = Path(C.get('data', r'D:\NarbeVoice\studio')) / 'voices' / 'sal' / 'ref.wav'
OUT = GAME / 'voice-source' / 'pilot16' / 'src'
VSRC = GAME / 'voice-source'
# the clearest earlier Sal designs in his middle range (rounds 1-4): the timbres Seed-VC turns the performance into
TARGETS = {'r1-bronx-s3': 'pilot/sal/bronx-s3', 'r2-brooklyn-s3': 'pilot2/sal/brooklyn-s3',
           'r3-cabbie-s4': 'pilot3/sal/cabbie-s4', 'r4-brooklyn-s5': 'pilot4/sal/brooklyn-s5'}
DEEPER = [2, 3.5]
CUT = (9.0, 14.0)    # the performance is cut at a pause in this window (a reference this long is plenty)


def ff(*args):
    subprocess.run([checks.ffmpeg(), '-v', 'error', '-y', *map(str, args)], check=True)


def pause_in(src, lo, hi):
    """The middle of the first silence that ends inside lo..hi seconds (else hi)."""
    p = subprocess.run([checks.ffmpeg(), '-i', str(src), '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', p.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', p.stderr)]
    for s, e in zip(starts, ends):
        if lo <= (s + e) / 2 <= hi:
            return (s + e) / 2
    return hi


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    work = OUT / 'work'
    work.mkdir(exist_ok=True)
    perf = OUT / 'perf.wav'
    if not perf.exists():
        at = pause_in(REC, *CUT)
        ff('-i', REC, '-t', f'{at:.2f}', '-ac', '1', '-ar', '48000', perf)
        print(f'performance: first {at:.1f} s of the recording', flush=True)
    for n in DEEPER:
        out = OUT / f'deeper-{n:g}.wav'
        if not out.exists():
            ff('-i', perf, '-af', f'rubberband=pitch={2 ** (-n / 12):.4f}:formant=shifted', '-ac', '1', '-ar', '48000', out)
            print(f'  {out.name}', flush=True)
    src = work / 'src.wav'   # as recordings.py: the source levelled to -28 LUFS, the target's voice to -32
    ff('-i', perf, '-af', 'loudnorm=I=-28:TP=-8:LRA=7', '-ac', '1', '-ar', '44100', src)
    env = dict(os.environ, PYTHONIOENCODING='utf-8', HF_HUB_DISABLE_SYMLINKS_WARNING='1')
    if C.get('hf_home'):
        env['HF_HOME'] = C['hf_home']
    for name, path in TARGETS.items():
        out = OUT / f'vc-{name}.wav'
        if out.exists():
            continue
        target = work / f'target-{name}.wav'
        ff('-i', VSRC / (path + '.wav'), '-t', '10', '-af', 'loudnorm=I=-32:TP=-6:LRA=11', '-ac', '1', '-ar', '44100', target)
        job = {'model': 'pitch', 'target': str(target), 'steps': 30, 'shift': 0, 'match': True, 'similarity': 0.7,
               'intelligibility': 0.7, 'style': False, 'fp32': True, 'pieces': [{'src': str(src), 'out': str(out)}]}
        (work / f'job-{name}.json').write_text(json.dumps(job, indent=1), encoding='utf-8')
        with open(work / f'vc-{name}.log', 'w', encoding='utf-8') as log:
            subprocess.run([C['vc_python'], str(Path(VS) / 'vc_boot.py'), C['vc_dir'], str(work / f'job-{name}.json')],
                           stdout=log, stderr=log, env=env, check=True)
        print(f'  {out.name}', flush=True)
    print('sources ready:', ', '.join(sorted(p.stem for p in OUT.glob('*.wav') if p.stem != 'perf')), flush=True)


# Round 18: round 16's Seed-VC and rubberband were rough or unnatural; the control (round 17) showed VoxCPM clones the
# performance cleanly with the accent, and Bryan liked its retake (pilot17 retake-s3) - but that is still the person
# (likeness 0.85; two different game characters score about 0.67). So: gentle changes to that retake with Voice
# Studio's own pitch/timbre changer (recordings.py world_render: pitch and timbre move separately, which keeps it natural).
TUNE_SRC = 'pilot17/sal/retake-s3'
TUNES = {'p-1_t-0.5': {'pitch': -1, 'timbre': -0.5}, 'p-2_t-1': {'pitch': -2, 'timbre': -1},
         'p-3_t-1': {'pitch': -3, 'timbre': -1}, 'p0_t-1': {'pitch': 0, 'timbre': -1}, 'p-2_t0': {'pitch': -2, 'timbre': 0}}


def tune():
    import recordings
    out_dir = GAME / 'voice-source' / 'pilot18' / 'src'
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, params in TUNES.items():
        out = out_dir / f'tune-{name}.wav'
        if not out.exists():
            recordings.world_render(str(VSRC / (TUNE_SRC + '.wav')), params, str(out))
            print(f'  {out.name}', flush=True)


# Round 19: every after-the-fact change (Seed-VC, rubberband, WORLD) sounded rough or unnatural. Bryan: the performance may
# MODEL the voice (accent, delivery) but Sal must not be a clone of the person. VoxCPM's own takes are the only natural
# ones, and each retake is a slightly different voice that keeps the accent (round 17). So walk away from the person a
# generation at a time: retakes of the performance (some with a note asking for a bigger, older man), keep the ones least
# like the recording that are still clear and in Sal's range, re-record from those, three generations.
WALK_NOTES = ['casual and blunt, a little grumpy', 'a big, heavyset man in his sixties, casual and blunt',
              'an older, heavier man, slower and deeper, a little grumpy']
WALK_GENS, WALK_KEEP, WALK_SEEDS, WALK_CLEAR = 3, 2, 4, 3.3


def walk():
    import importlib.util
    import numpy as np
    spec = importlib.util.spec_from_file_location('vp', str(Path(__file__).with_name('voice-pilot.py')))
    vp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vp)
    vp.ROOT = GAME / 'voice-source' / 'pilot19'
    root = vp.ROOT / 'walk'
    work = root / 'work'
    work.mkdir(parents=True, exist_ok=True)
    c = vp.SPEC['sal']
    lo, hi = c['pitch']
    rep = vp.load(root / 'walk.json', {})

    def emb(wav):
        w16 = work / ('e16-' + wav.stem + '.wav')
        ff('-i', wav, '-ac', '1', '-ar', '16000', w16)
        return vp.embed(w16)
    base = emb(VSRC / 'pilot16' / 'src' / 'perf.wav')
    parents = [('perf', VSRC / 'pilot16' / 'src' / 'perf.wav')]
    w = vp.worker()
    try:
        for g in range(1, WALK_GENS + 1):
            gen = []
            for pi, (pname, pwav) in enumerate(parents):
                for i, note in enumerate(WALK_NOTES):
                    for seed in range(1, WALK_SEEDS + 1) if g == 1 else range(1, WALK_SEEDS // 2 + 2):
                        name = f'g{g}-p{pi}-n{i}-s{seed}'
                        wav = root / (name + '.wav')
                        if name not in rep or not wav.exists():
                            text = f'({vp.model_delivery("sal", note)})' + vp.model_text('sal', c['sample'])
                            ans = w.render({'id': name, 'text': text, 'out': str(wav), 'seed': seed, 'steps': vp.STEPS,
                                            'cfg': vp.CFG, 'reference': str(pwav), 'retry': True})
                            if not ans.get('ok'):
                                continue
                            r = vp.check(wav, c['sample'], work)
                            a = emb(wav)
                            r['like'] = round(float(np.dot(a, base) / np.linalg.norm(a) / np.linalg.norm(base)), 3)
                            r.update(gen=g, parent=pname, note=i, seed=seed)
                            rep[name] = r
                            vp.save(root / 'walk.json', rep)
                            print(f"  {name}: {r['pitch']} Hz, clarity {r['clarity']}, likeness {r['like']}", flush=True)
                        gen.append(name)
            ok = [n for n in gen if rep[n]['clarity'] >= WALK_CLEAR and lo <= rep[n]['pitch'] <= hi
                  and len(rep[n]['diffs']) <= 3]
            pool = ok or sorted(gen, key=lambda n: -rep[n]['clarity'])[:WALK_KEEP * 3]
            parents = [(n, root / (n + '.wav')) for n in sorted(pool, key=lambda n: rep[n]['like'])[:WALK_KEEP]]
            kept = ', '.join(f"{n} (likeness {rep[n]['like']})" for n, _ in parents)
            print(f"generation {g}: kept {kept}{'' if ok else ' (none passed the clarity/pitch check: clearest used)'}", flush=True)
    finally:
        w.close()
    vp.save(root / 'final.json', [str(p.relative_to(VSRC).with_suffix('')).replace('\\', '/') for _, p in parents])


if __name__ == '__main__':
    {'tune': tune, 'walk': walk}.get(sys.argv[1] if sys.argv[1:] else '', main)()
