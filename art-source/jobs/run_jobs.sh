#!/usr/bin/env bash
# run_jobs.sh <list.tsv>   (name<TAB>reference images) - runs the listed Astra jobs, keeping $PAR (default 5) running
# at once (a rolling pool: a new job starts as soon as any finishes). Windows line endings in the list are ignored.
HERE="$(cd "$(dirname "$0")" && pwd)"; PAR="${PAR:-5}"
run() { local name="$1"; shift; bash "$HERE/astra.sh" "$name" "$@" > "$HERE/$name.run" 2>&1; echo "$(date +%T) $name: $(grep -m1 -o 'exit=[0-9]*' "$HERE/$name.run")"; }
running=0
while IFS=$'\t' read -r name refs; do
  name="${name%$'\r'}"; refs="${refs%$'\r'}"
  [ -z "$name" ] && continue
  if [ "$running" -ge "$PAR" ]; then wait -n; running=$((running - 1)); fi
  run "$name" $refs &
  running=$((running + 1))
done < "$1"
wait
echo ALL DONE
