#!/bin/zsh
# Scans the clarinet play grips at the side of the tube with a small side aim.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
sets=()
for s in 0.25 0.35; do
  for t in 0.1 0.12 0.14; do
    for c in -0.07 -0.09 -0.11; do
      sets+=(--set "clarinet@wolf.aimSide=$s;clarinet@wolf.gripShiftL=0.15,$t,$c;clarinet@wolf.gripShiftR=0.05,$t,$c;clarinet@wolf.gripCurl=2.007,2.007")
    done
  done
done
pnpm -s wind-grip clarinetist "${sets[@]}" > scratch/cg2.txt 2>&1
echo "exit $?"
