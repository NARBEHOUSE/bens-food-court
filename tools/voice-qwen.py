"""Ben's Food Court - the voice pass: the same voice tests made with Qwen3-TTS instead of VoxCPM2 (Apache-2.0,
https://github.com/QwenLM/Qwen3-TTS), to hear whether it follows descriptions (age, accent, manner) better.

Runs in its own environment (D:/NarbeVoice/venv-qwen: qwen-tts 0.1.1 and the same ROCm torch as Voice Studio):
  <venv-qwen python> tools/voice-qwen.py design --round N [characters...]
      VoiceDesign (Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign): every style in tools/voice-cast.json x seeds, saying the
      character's sample, saved as voice-source/pilot<N>/<who>/<style>-s<seed>.wav. Then run
      `voice-pilot.py --round N design` (Voice Studio's Python) to measure them and keep the best of each style; it makes
      nothing that already exists, so the voice model is never loaded.
  <venv-qwen python> tools/voice-qwen.py lines --round N [characters...]
      Base (Qwen/Qwen3-TTS-12Hz-1.7B-Base): each kept candidate cloned (its sample and words as the reference) saying
      the test lines in tests.json, saved as lines/<candidate>/<i>.wav. Qwen's cloning takes no delivery note, so the
      lines carry the voice's own manner only. Then `voice-pilot.py --round N lines` measures them.
"""
import json
import sys
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

GAME = Path(__file__).resolve().parent.parent
SPEC = json.loads((GAME / 'tools' / 'voice-cast.json').read_text(encoding='utf-8'))
SEEDS = [1, 2, 3, 4, 5, 6]


def load_model(name):
    for dtype in (torch.bfloat16, torch.float16, torch.float32):
        try:
            m = Qwen3TTSModel.from_pretrained(name, device_map='cuda:0', dtype=dtype, attn_implementation='sdpa')
            print(f'{name} loaded ({dtype})', flush=True)
            return m
        except Exception as e:   # a dtype this card or build cannot run: try the next
            print(f'  {name} in {dtype} failed: {type(e).__name__}: {e}', flush=True)
    sys.exit('could not load ' + name)


def design(root, who_list):
    model = load_model('Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign')
    for who in who_list:
        c = SPEC[who]
        folder = root / who
        folder.mkdir(parents=True, exist_ok=True)
        for style in c['styles']:
            for seed in c.get('seeds', SEEDS):
                wav = folder / f"{style['id']}-s{seed}.wav"
                if wav.exists():
                    continue
                torch.manual_seed(seed)
                wavs, sr = model.generate_voice_design(text=c['sample'], language='English',
                                                       instruct=style['describe'].replace(' Clear studio recording.', ''))
                sf.write(str(wav), wavs[0], sr)
                print(f'  {who} {wav.stem}: {len(wavs[0]) / sr:.1f} s at {sr} Hz', flush=True)


def lines(root, who_list):
    model = load_model('Qwen/Qwen3-TTS-12Hz-1.7B-Base')
    for who in who_list:
        folder = root / who
        tests = json.loads((folder / 'tests.json').read_text(encoding='utf-8'))
        for cand in json.loads((folder / 'kept.json').read_text(encoding='utf-8')):
            ref, sr0 = sf.read(str(folder / (cand + '.wav')), dtype='float32')
            prompt = model.create_voice_clone_prompt(ref_audio=(ref, sr0), ref_text=SPEC[who]['sample'],
                                                     x_vector_only_mode=False)
            out = folder / 'lines' / cand
            out.mkdir(parents=True, exist_ok=True)
            for i, t in enumerate(tests):
                wav = out / f'{i}.wav'
                if wav.exists():
                    continue
                torch.manual_seed(1)
                wavs, sr = model.generate_voice_clone(text=t['said_as'], language='English', voice_clone_prompt=prompt)
                sf.write(str(wav), wavs[0], sr)
                print(f'  {who} {cand} line {i}: {len(wavs[0]) / sr:.1f} s', flush=True)


def jobs(path):
    """Clone jobs from a JSON list [{ref, ref_text, text, out}] (voice-pilot.py clonetest prep)."""
    model = load_model('Qwen/Qwen3-TTS-12Hz-1.7B-Base')
    prompts = {}
    for j in json.loads(Path(path).read_text(encoding='utf-8')):
        out = Path(j['out'])
        if out.exists():
            continue
        if j['ref'] not in prompts:
            ref, sr0 = sf.read(j['ref'], dtype='float32')
            prompts[j['ref']] = model.create_voice_clone_prompt(ref_audio=(ref, sr0), ref_text=j['ref_text'],
                                                                x_vector_only_mode=False)
        out.parent.mkdir(parents=True, exist_ok=True)
        torch.manual_seed(1)
        wavs, sr = model.generate_voice_clone(text=j['text'], language='English', voice_clone_prompt=prompts[j['ref']])
        sf.write(str(out), wavs[0], sr)
        print(f"  {out.parent.name}/{out.name}: {len(wavs[0]) / sr:.1f} s", flush=True)


def main():
    args = sys.argv[1:]
    if args[:1] == ['jobs'] and len(args) == 2:
        jobs(args[1])
        return
    if '--round' not in args or not args or args[0] not in ('design', 'lines'):
        sys.exit(__doc__)
    k = args.index('--round')
    n = int(args[k + 1])
    del args[k:k + 2]
    root = GAME / 'voice-source' / f'pilot{n}'
    who_list = args[1:] or SPEC[f'_round{n}']
    (design if args[0] == 'design' else lines)(root, who_list)


if __name__ == '__main__':
    main()
