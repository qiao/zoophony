#!/bin/zsh
# Scans a grid of the left play grip and curl of the oboe candidate.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
B='mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(10,0);oboe@mouse.restGripShiftL=0.173,0.05,0;oboe@mouse.restGripShiftR=-0.05,0.08,0'
sets=()
for x in 0.3 0.35; do
  for y in 0.05 0.065; do
    for c in 1.222 1.396 1.571; do
      sets+=(--set "$B;oboe@mouse.gripShiftL=$x,$y,0;oboe@mouse.gripCurl=$c,0.960")
    done
  done
done
for s in 0.3 0.7; do
  sets+=(--set "$B;oboe@mouse.gripShiftL=0.3,0.05,0;oboe@mouse.aimSide=$s")
done
pnpm -s wind-grip oboist "${sets[@]}" > scratch/grip-ob4.txt 2>&1
echo "exit $?"
