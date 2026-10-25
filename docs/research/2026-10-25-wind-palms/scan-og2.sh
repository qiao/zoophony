#!/bin/zsh
# Scans the oboe play grips at the side of the tube: toward, across, and the curl.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
sets=()
for t in 0.04 0.06 0.08; do
  for c in -0.02 -0.035 -0.05; do
    for k in '1.396,0.960' '1.745,1.396'; do
      sets+=(--set "oboe@mouse.aimSide=0;oboe@mouse.gripShiftL=0.05,$t,$c;oboe@mouse.gripShiftR=0.15,$t,$c;oboe@mouse.gripCurl=$k")
    done
  done
done
pnpm -s wind-grip oboist "${sets[@]}" > scratch/og2.txt 2>&1
echo "exit $?"
