#!/bin/zsh
# Scans the bassoon grips at the side of the tube.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
sets=()
for s in 0 0.25; do
  for t in 0 0.05 0.1; do
    for c in -0.05 -0.1; do
      sets+=(--set "bassoon@beaver.aimSide=$s;bassoon@beaver.gripShiftL=0,$t,$c;bassoon@beaver.gripShiftR=0.15,$t,$c;bassoon@beaver.gripCurl=1.745,1.745")
    done
  done
done
pnpm -s wind-grip bassoonist "${sets[@]}" > scratch/bg1.txt 2>&1
echo "exit $?"
