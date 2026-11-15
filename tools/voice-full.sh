#!/bin/bash
# Ben's Food Court: the full voice run (2026-11-14). Run from Git Bash:
#   bash tools/voice-full.sh                    everything still to record (stop any time; it picks up where it stopped)
#   bash tools/voice-full.sh --speaker a,b --limit n    a slice (the check run)
# Staged in voice-source/full/ (never packs/ until `voice-batch.py full install`). Log: voice-source/full/run.log
cd "$(dirname "$0")/.." || exit 1
VS=/d/NarbeVoice/venv/Scripts/python.exe
QW=/d/NarbeVoice/venv-qwen/Scripts/python.exe
L=voice-source/full/run.log
mkdir -p voice-source/full
$VS tools/voice-batch.py full prep >> $L 2>&1 && echo "prep: ok $(date)" \
  && $VS tools/voice-batch.py full run "$@" >> $L 2>&1 && echo "voxcpm: ok $(date)" \
  && $QW tools/voice-qwen.py jobs voice-source/full/qwen-jobs.json >> $L 2>&1 && echo "qwen: ok $(date)" \
  && $VS tools/voice-batch.py full fallback >> $L 2>&1 && echo "fallback: ok $(date)" \
  || echo "STOPPED, see $L"
$VS tools/voice-batch.py full report 2>&1 | tail -3
