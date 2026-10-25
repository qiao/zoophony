#!/bin/zsh
# Scans the left rest grip of the oboe for the left forearm twist at rest.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
pnpm -s arm-check oboist --jobs 4 \
  --variant y065 --set 'oboe@mouse.restGripShiftL=0.173,0.065,0' \
  --variant y03 --set 'oboe@mouse.restGripShiftL=0.173,0.03,0' \
  --variant x22 --set 'oboe@mouse.restGripShiftL=0.22,0.05,0' \
  --variant x12 --set 'oboe@mouse.restGripShiftL=0.12,0.05,0' \
  --variant z05 --set 'oboe@mouse.restGripShiftL=0.173,0.05,0.05' \
  --variant zm05 --set 'oboe@mouse.restGripShiftL=0.173,0.05,-0.05' \
  > scratch/gate-rest.txt 2>&1
echo "exit $?"
