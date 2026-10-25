#!/bin/zsh
# Scans the left grip and curl of the clarinet at 30 degrees.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
B='clarinet@wolf.play=holdTurn(5,0)'
sets=()
for x in 0.15 0.2 0.25 0.3; do
  for y in 0.12 0.15; do
    for c in 1.396 1.745; do
      sets+=(--set "$B;clarinet@wolf.gripShiftL=$x,$y,0;clarinet@wolf.gripCurl=$c,1.920")
    done
  done
done
pnpm -s wind-grip clarinetist "${sets[@]}" > scratch/cl-grip2.txt 2>&1
echo "exit $?"
