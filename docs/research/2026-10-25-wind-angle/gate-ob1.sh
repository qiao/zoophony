#!/bin/zsh
# Screens the oboe variants of the mouse with the arm gate.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
pnpm -s arm-check oboist --jobs 4 \
  --variant a25 --set 'oboe@mouse.play=holdTurn(-5,0)' \
  --variant a30 --set 'oboe@mouse.play=holdTurn(0,0)' \
  --variant a35 --set 'oboe@mouse.play=holdTurn(5,0)' \
  --variant a40 --set 'oboe@mouse.play=holdTurn(10,0)' \
  --variant s50a30 --set 'mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(0,0)' \
  --variant s50a40 --set 'mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(10,0)' \
  --variant s40a40 --set 'mouse.oboeScale=0.4;oboe@mouse.play=holdTurn(10,0)' \
  > scratch/gate-ob1.txt 2>&1
echo "exit $?"
