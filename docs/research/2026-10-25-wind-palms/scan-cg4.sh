#!/bin/zsh
# Scans the clarinet rest grips with the side play grips.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
B='clarinet@wolf.aimSide=0.25;clarinet@wolf.gripShiftL=0.15,0.14,-0.11;clarinet@wolf.gripShiftR=0.05,0.19,-0.11;clarinet@wolf.gripCurl=2.007,2.007'
sets=(--set "$B")
for rl in '-0.22,0.06,-0.06' '-0.22,0.14,-0.11'; do
  for rr in '-0.33,0.24,-0.11' '-0.33,0.19,-0.11'; do
    sets+=(--set "$B;clarinet@wolf.restGripShiftL=$rl;clarinet@wolf.restGripShiftR=$rr")
  done
done
pnpm -s wind-grip clarinetist "${sets[@]}" > scratch/cg4.txt 2>&1
echo "exit $?"
