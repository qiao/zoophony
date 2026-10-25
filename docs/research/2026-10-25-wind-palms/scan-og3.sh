#!/bin/zsh
# Scans the oboe rest grips at the side of the tube with the play grips of C2.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
B='oboe@mouse.aimSide=0;oboe@mouse.gripShiftL=0.05,0.06,-0.05;oboe@mouse.gripShiftR=0.15,0.06,-0.05;oboe@mouse.gripCurl=1.745,1.396'
sets=(--set "$B")
for rl in '0.173,0.05,-0.05' '0.173,0.065,-0.035'; do
  for rr in '-0.05,0.08,-0.05' '-0.05,0.06,-0.05' '-0.05,0.08,-0.03'; do
    sets+=(--set "$B;oboe@mouse.restGripShiftL=$rl;oboe@mouse.restGripShiftR=$rr")
  done
done
pnpm -s wind-grip oboist "${sets[@]}" > scratch/og3.txt 2>&1
echo "exit $?"
