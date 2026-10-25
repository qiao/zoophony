#!/bin/zsh
# Scans the clarinet play grips at the side of the tube with no side aim.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
sets=()
for t in 0.15 0.18 0.21 0.24; do
  for c in -0.06 -0.09 -0.12; do
    for k in '2.007,2.007'; do
      sets+=(--set "clarinet@wolf.aimSide=0;clarinet@wolf.gripShiftL=0.15,$t,$c;clarinet@wolf.gripShiftR=0.05,$t,$c;clarinet@wolf.gripCurl=$k")
    done
  done
done
pnpm -s wind-grip clarinetist "${sets[@]}" > scratch/cg1.txt 2>&1
echo "exit $?"
