#!/bin/zsh
# Runs the arm gate of the three woodwinds on the side grips.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
O='oboe@mouse.aimSide=0;oboe@mouse.gripShiftL=0.05,0.06,-0.05;oboe@mouse.gripShiftR=0.15,0.06,-0.05;oboe@mouse.gripCurl=1.745,1.396;oboe@mouse.restGripShiftL=0.173,0.05,-0.05;oboe@mouse.restGripShiftR=-0.05,0.06,-0.05'
C='clarinet@wolf.aimSide=0.25;clarinet@wolf.gripShiftL=0.15,0.14,-0.11;clarinet@wolf.gripShiftR=0.05,0.19,-0.11;clarinet@wolf.gripCurl=2.007,2.007;clarinet@wolf.restGripShiftL=-0.22,0.14,-0.11;clarinet@wolf.restGripShiftR=-0.33,0.19,-0.11'
B='bassoon@beaver.aimSide=0.25;bassoon@beaver.gripShiftL=0,0.1,-0.1;bassoon@beaver.gripShiftR=0.15,0.2,-0.14;bassoon@beaver.gripCurl=1.745,1.745'
pnpm -s arm-check oboist clarinetist bassoonist --jobs 3 --variant side --set "$O;$C;$B" > scratch/gate7.txt 2>&1
echo "exit $?"
