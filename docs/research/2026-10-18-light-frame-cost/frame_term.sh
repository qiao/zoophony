#!/bin/zsh
# Measures the end of each step of the round with no Metal trace, after a low load.
set -u
ROOT=$(git rev-parse --show-toplevel)
OUT=$ROOT/scratch/frame-uni
mkdir -p $OUT
wait_low() {
  for i in {1..60}; do
    load=$(sysctl -n vm.loadavg | awk '{print $2}')
    if (( load < 12 )); then echo "load $load" >> $OUT/runs.log; return; fi
    sleep 15
  done
  echo "load still $load after 15 min" >> $OUT/runs.log
}
for label ref in lamps 2c00d8d7 term 7a83caac; do
  wt=$ROOT/scratch/fw-$label
  rm -rf $wt
  git -C $ROOT worktree add --detach $wt $ref > /dev/null 2>&1
  ln -s $ROOT/node_modules $wt/node_modules
  (cd $wt && node tools/split-soundfont.ts > /dev/null && node tools/patch-demos.ts > /dev/null && node tools/write-perf-60.ts > /dev/null)
done
for label in lamps term lamps term; do
  wait_low
  echo "== $label $(date +%H:%M:%S)" >> $OUT/runs.log
  n=$((${n:-0} + 1))
  (cd $ROOT/scratch/fw-$label && node tools/measure-frame.ts --no-metal > $OUT/frame-$label-$n.txt 2>&1)
  grep -E "fps with no cap|^\| (Main|GPU: timer query \(no)" $OUT/frame-$label-$n.txt >> $OUT/runs.log
done
for label in lamps term; do git -C $ROOT worktree remove --force $ROOT/scratch/fw-$label; done
echo "== done $(date +%H:%M:%S)" >> $OUT/runs.log
