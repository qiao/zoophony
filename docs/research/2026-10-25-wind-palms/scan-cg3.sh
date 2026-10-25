#!/bin/zsh
# Scans the right clarinet grip at the side of the tube with the left grip of the candidate.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
B='clarinet@wolf.aimSide=0.25;clarinet@wolf.gripShiftL=0.15,0.14,-0.11'
sets=()
for t in 0.15 0.17 0.19; do
  for c in -0.11 -0.14 -0.17; do
    for k in '2.007,2.007' '2.007,2.269'; do
      sets+=(--set "$B;clarinet@wolf.gripShiftR=0.05,$t,$c;clarinet@wolf.gripCurl=$k")
    done
  done
done
pnpm -s wind-grip clarinetist "${sets[@]}" > scratch/cg3.txt 2>&1
echo "exit $?"
