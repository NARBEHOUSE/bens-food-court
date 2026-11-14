#!/bin/bash
# Ben's Food Court: the batch trial (2026-11-14). Run from Git Bash:  bash tools/voice-trial.sh
# Every step skips what is already made. Log: voice-source/pilot20/run.log
cd "$(dirname "$0")/.." || exit 1
VS=/d/NarbeVoice/venv/Scripts/python.exe
QW=/d/NarbeVoice/venv-qwen/Scripts/python.exe
L=voice-source/pilot20/run.log
mkdir -p voice-source/pilot20
$VS tools/voice-batch.py run >> $L 2>&1 && echo "voxcpm pass: ok $(date)" \
  && $QW tools/voice-qwen.py jobs voice-source/pilot20/qwen-jobs.json >> $L 2>&1 && echo "qwen fallback: ok $(date)" \
  && $VS tools/voice-batch.py fallback >> $L 2>&1 && echo "fallback chosen: ok $(date)" \
  && $VS tools/voice-batch.py page >> $L 2>&1 && echo "page: ok $(date)" \
  || echo "STOPPED, see $L"
grep -E "^VoxCPM pass done|^trial page" $L | tail -2
