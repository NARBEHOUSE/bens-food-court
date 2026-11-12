"""Ben's Food Court - the voice pass: Chatterbox Turbo (Resemble AI, MIT, https://github.com/resemble-ai/chatterbox) as a
cloner, to hear whether it is cleaner than VoxCPM2 while still taking some direction through its tags.

Runs in its own environment (D:/NarbeVoice/venv-chatterbox: chatterbox-tts 0.1.7 installed without its pins, the same
ROCm torch as Voice Studio, transformers 4.57.6, as Voicebox runs it):
  <venv-chatterbox python> tools/voice-chatterbox.py jobs <jobs.json>
      jobs.json from `voice-pilot.py --round 7 cbtest prep`: [{ref, text, out}]; text may start with one of Turbo's
      tags ([dramatic], [sarcastic]...). Sampling as Voicebox sets it (temperature 0.8, top_k 1000, top_p 0.95,
      repetition penalty 1.2), seed 1. Output 24 kHz.
"""
import json
import sys
import types
from pathlib import Path

import numpy as np
import soundfile as sf
import torch


def patch_f32(model):
    """librosa gives float64 audio that upstream feeds straight into float32 weights (Voicebox's patch_chatterbox_f32)."""
    tok = model.s3gen.tokenizer
    orig_mel = tok.log_mel_spectrogram.__func__
    tok.log_mel_spectrogram = types.MethodType(
        lambda self, audio, padding=0: orig_mel(self, audio.float() if torch.is_tensor(audio) else audio, padding), tok)
    ve = model.ve
    orig_fwd = ve.forward.__func__
    ve.forward = types.MethodType(lambda self, mels: orig_fwd(self, mels.float()), ve)


def main():
    if sys.argv[1:2] != ['jobs'] or len(sys.argv) != 3:
        sys.exit(__doc__)
    from huggingface_hub import snapshot_download
    from chatterbox.tts_turbo import ChatterboxTurboTTS
    model = ChatterboxTurboTTS.from_local(snapshot_download('ResembleAI/chatterbox-turbo'), 'cuda')
    patch_f32(model)
    print('Chatterbox Turbo loaded', flush=True)
    for j in json.loads(Path(sys.argv[2]).read_text(encoding='utf-8')):
        out = Path(j['out'])
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        torch.manual_seed(1)
        with torch.inference_mode():
            wav = model.generate(j['text'], audio_prompt_path=j['ref'], temperature=0.8, top_k=1000, top_p=0.95,
                                 repetition_penalty=1.2)
        audio = wav.squeeze().cpu().numpy().astype(np.float32) if torch.is_tensor(wav) else np.asarray(wav, np.float32)
        sr = getattr(model, 'sr', 24000)
        sf.write(str(out), audio, sr)
        print(f"  {out.parent.name}/{out.name}: {len(audio) / sr:.1f} s  {j['text'][:60]}", flush=True)


if __name__ == '__main__':
    main()
