#!/bin/zsh
# Scores the oboe candidates of the mouse: the grips and the arm gate.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
V50='mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(10,0);oboe@mouse.gripShiftL=0.2,0.1,0;oboe@mouse.restGripShiftL=0.173,0.05,0;oboe@mouse.restGripShiftR=-0.05,0.08,0'
V55='mouse.oboeScale=0.55;oboe@mouse.play=holdTurn(10,0);oboe@mouse.gripShiftL=0.2,0.1,0;oboe@mouse.restGripShiftL=0.142,0.05,0;oboe@mouse.restGripShiftR=-0.112,0.08,0'
V50R="$V50;oboe@mouse.gripShiftR=0.15,0.08,0"
pnpm -s wind-grip oboist --set "$V50" --set "$V55" --set "$V50R" > scratch/ob-v-grip.txt 2>&1
echo "grip exit $?"
pnpm -s arm-check oboist --jobs 3 --variant v50 --set "$V50" --variant v55 --set "$V55" --variant v50r --set "$V50R" > scratch/ob-v-gate.txt 2>&1
echo "gate exit $?"
