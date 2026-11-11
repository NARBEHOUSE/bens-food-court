#!/usr/bin/env bash
# astra.sh <job-name> [reference images, relative to the game folder...]   (prompt: jobs/<job-name>.txt)
# Runs Astra (Codex exec, the user's ChatGPT, built-in image generation) in the game folder (Benny's PC Hub,
# apps/games/BENSFOODCOURT) at medium reasoning; prompts save their images under art-source/. Everything stays in the
# PC hub (never on F:).
set -u
# pwd -W: the Windows form (C:/...), which codex.exe needs for -o; a /c/... path made the reply file fail to save.
HERE="$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))"
# The game folder is two up from art-source/jobs, wherever it lives (it was renamed BENSBURGERBAR -> BENSFOODCOURT).
ART="$(cd "$(dirname "$0")/../.." && (pwd -W 2>/dev/null || pwd))"
CODEX="$(ls -d "$USERPROFILE"/.vscode/extensions/openai.chatgpt-*-win32-x64 | tail -1)/bin/windows-x86_64/codex.exe"
name="$1"; shift
args=()
for img in "$@"; do args+=(-i "$ART/$img"); done
timeout 2400 "$CODEX" exec -C "$ART" --skip-git-repo-check --sandbox workspace-write -c model_reasoning_effort='"medium"' "${args[@]}" \
  -o "$HERE/$name.reply.txt" - < "$HERE/$name.txt" > "$HERE/$name.log" 2>&1
echo "$name exit=$?"; cat "$HERE/$name.reply.txt" 2>/dev/null
