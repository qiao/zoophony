#!/bin/zsh
# Scans the oboe grips at the side of the tube, with the rest grips moved to the side too.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
B='oboe@mouse.aimSide=0;oboe@mouse.gripShiftL=0.05,0.03,-0.06;oboe@mouse.gripShiftR=0.15,0.03,-0.1'
sets=(--set "$B")
for rl in '0.173,0.05,-0.06' '0.173,0.02,-0.06' '0.173,0.02,-0.09'; do
  for rr in '-0.05,0.08,-0.1' '-0.05,0.03,-0.1'; do
    sets+=(--set "$B;oboe@mouse.restGripShiftL=$rl;oboe@mouse.restGripShiftR=$rr")
  done
done
pnpm -s wind-grip oboist "${sets[@]}" > scratch/og1.txt 2>&1
echo "exit $?"
