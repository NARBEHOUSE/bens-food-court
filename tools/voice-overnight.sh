#!/bin/bash
# Ben's Food Court voice pass: the overnight run (2026-11-12). Run from Git Bash:  bash tools/voice-overnight.sh
# Every step skips what is already made, so it can be stopped any time and started again.
#   Round 10: the 16 new characters designed by Qwen3-TTS, their test lines, page.
#   Round 9:  the same 16 designed by VoxCPM2, test lines, page.
#   Round 11: Vernon, Bev and Kai redesigned for VoxCPM2 and tried on expressive lines (requal), page.
# Progress: voice-source/pilot{9,10,11}/run.log, and the step summary this prints.
cd "$(dirname "$0")/.." || exit 1
VS=/d/NarbeVoice/venv/Scripts/python.exe
QW=/d/NarbeVoice/venv-qwen/Scripts/python.exe
mkdir -p voice-source/pilot9 voice-source/pilot10 voice-source/pilot11
step() { echo "$1: $2 $(date)"; }

L=voice-source/pilot10/run.log
# A Qwen round's measuring step makes any missing take with VoxCPM, so it runs only if Qwen's step finished.
$QW tools/voice-qwen.py design --round 10 >> $L 2>&1 && step "qwen design" ok \
  && $VS tools/voice-pilot.py --round 10 design >> $L 2>&1 && step "qwen design measured" ok \
  && $QW tools/voice-qwen.py lines --round 10 >> $L 2>&1 && step "qwen lines" ok \
  && $VS tools/voice-pilot.py --round 10 lines >> $L 2>&1 && step "qwen lines measured" ok \
  && $VS tools/voice-pilot.py --round 10 page >> $L 2>&1 && step "qwen page" ok \
  || step "round 10" "STOPPED, see $L"

L=voice-source/pilot9/run.log
$VS tools/voice-pilot.py --round 9 design >> $L 2>&1 && step "voxcpm design" ok \
  && $VS tools/voice-pilot.py --round 9 lines >> $L 2>&1 && step "voxcpm lines" ok \
  && $VS tools/voice-pilot.py --round 9 page >> $L 2>&1 && step "voxcpm page" ok \
  || step "round 9" "STOPPED, see $L"

L=voice-source/pilot11/run.log
$VS tools/voice-pilot.py --round 11 requal >> $L 2>&1 && step "redesign (round 11)" ok \
  || step "round 11" "STOPPED, see $L"
step "all done" ""
