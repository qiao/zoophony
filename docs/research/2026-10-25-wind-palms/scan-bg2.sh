#!/bin/zsh
# Scans the right bassoon grip at the side of the tube with the left grip of the candidate.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
B='bassoon@beaver.aimSide=0.25;bassoon@beaver.gripShiftL=0,0.1,-0.1'
sets=()
for t in 0.1 0.15 0.2; do
  for c in -0.1 -0.14 -0.18; do
    for k in '1.745,1.745' '1.745,2.007'; do
      sets+=(--set "$B;bassoon@beaver.gripShiftR=0.15,$t,$c;bassoon@beaver.gripCurl=$k")
    done
  done
done
pnpm -s wind-grip bassoonist "${sets[@]}" > scratch/bg2.txt 2>&1
echo "exit $?"
