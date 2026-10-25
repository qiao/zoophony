#!/bin/zsh
# Runs the arm gate of the oboist on variants of the left side grip.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
O='oboe@mouse.gripShiftL=0.05,0.06,-0.05;oboe@mouse.gripShiftR=0.15,0.06,-0.05;oboe@mouse.gripCurl=1.745,1.396;oboe@mouse.restGripShiftL=0.173,0.05,-0.05;oboe@mouse.restGripShiftR=-0.05,0.06,-0.05'
pnpm -s arm-check oboist --jobs 4 \
  --variant a25 --set "$O;oboe@mouse.aimSide=0.25" \
  --variant pole --set "$O;oboe@mouse.aimSide=0;oboe@mouse.poleL=-0.5,-1,-0.5;oboe@mouse.restPoleL=-0.5,-1,-0.5" \
  --variant a25pole --set "$O;oboe@mouse.aimSide=0.25;oboe@mouse.poleL=-0.5,-1,-0.5;oboe@mouse.restPoleL=-0.5,-1,-0.5" \
  --variant a50 --set "$O;oboe@mouse.aimSide=0.5" \
  > scratch/gate8.txt 2>&1
echo "exit $?"
