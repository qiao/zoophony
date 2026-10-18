#!/bin/zsh
# Measures the start of the round (A) and HEAD (B) in turns, A B A B, with no Metal trace.
set -u
ROOT=$(git rev-parse --show-toplevel)
OUT=$ROOT/scratch/frame-shade
mkdir -p $OUT
typeset -A WT
WT[A]=$ROOT/scratch/fs-base
WT[B]=$ROOT/scratch/fs-head
for side ref in A 0c7ab083 B 03216576; do
  rm -rf ${WT[$side]}
  git -C $ROOT worktree add --detach ${WT[$side]} $ref > /dev/null 2>&1
  ln -s $ROOT/node_modules ${WT[$side]}/node_modules
  (cd ${WT[$side]} && node tools/split-soundfont.ts > /dev/null && node tools/patch-demos.ts > /dev/null && node tools/write-perf-60.ts > /dev/null)
done
wait_low() {
  for i in {1..60}; do
    load=$(sysctl -n vm.loadavg | awk '{print $2}')
    if (( load < 12 )); then echo "load $load" >> $OUT/runs.log; return; fi
    sleep 15
  done
  echo "load still $load after 15 min" >> $OUT/runs.log
}
for round in 1 2; do
  for side in A B; do
    wait_low
    echo "== round $round side $side $(date +%H:%M:%S)" >> $OUT/runs.log
    (cd ${WT[$side]} && node tools/measure-frame.ts --no-metal > $OUT/frame-$side-$round.txt 2>&1)
    grep -E '^\| (Main|GPU: timer query \(no)|Load average' $OUT/frame-$side-$round.txt >> $OUT/runs.log
  done
done
for side in A B; do git -C $ROOT worktree remove --force ${WT[$side]}; done
echo "== done $(date +%H:%M:%S)" >> $OUT/runs.log
