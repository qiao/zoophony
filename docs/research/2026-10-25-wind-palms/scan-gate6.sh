#!/bin/zsh
# Runs the arm gate of the oboist on the side grips.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
C2='oboe@mouse.aimSide=0;oboe@mouse.gripShiftL=0.05,0.06,-0.05;oboe@mouse.gripShiftR=0.15,0.06,-0.05;oboe@mouse.gripCurl=1.745,1.396'
pnpm -s arm-check oboist --jobs 3 \
  --variant s1 --set "$C2;oboe@mouse.restGripShiftL=0.173,0.05,-0.05;oboe@mouse.restGripShiftR=-0.05,0.06,-0.05" \
  --variant s2 --set "$C2;oboe@mouse.restGripShiftL=0.173,0.05,-0.05;oboe@mouse.restGripShiftR=-0.05,0.08,-0.05" \
  --variant s3 --set "$C2;oboe@mouse.restGripShiftL=0.173,0.05,-0.05;oboe@mouse.restGripShiftR=-0.05,0.08,-0.03" \
  > scratch/gate6.txt 2>&1
echo "exit $?"
