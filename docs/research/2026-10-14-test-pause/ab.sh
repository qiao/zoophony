#!/bin/zsh
# Runs the base set (the projects unit and paused, the 224 files of pnpm test on d46d7fbe) and the
# new set (the project unit) in turn, two times each, and writes the JSON report of each run into
# <dir>. Run from the repository root: docs/research/2026-10-14-test-pause/ab.sh <dir>.
# Then node docs/research/2026-10-14-test-pause/test-times.ts <dir>/ab-<set>-<round>.json gives
# the span of each run. The run of the report wrote the loads into <dir>/ab.txt.
dir=${1:?Give a folder for the reports.}
for round in 1 2; do
  for kind in base new; do
    load=$(uptime | sed 's/.*load averages: //')
    if [[ $kind == base ]]; then
      args=(--project unit --project paused)
    else
      args=(--project unit)
    fi
    pnpm exec vitest run $args --reporter=json --outputFile=$dir/ab-$kind-$round.json \
      > $dir/ab-$kind-$round.log 2>&1
    echo "$round $kind exit=$? load_before=[$load]" >> $dir/ab.txt
  done
done
