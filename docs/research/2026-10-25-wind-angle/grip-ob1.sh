#!/bin/zsh
# Scans the grips of the oboe variants of the mouse.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
pnpm -s wind-grip oboist \
  --set 'oboe@mouse.play=holdTurn(-15,0)' \
  --set 'mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(0,0)' \
  --set 'mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(5,0)' \
  --set 'mouse.oboeScale=0.5;oboe@mouse.play=holdTurn(10,0)' \
  --set 'mouse.oboeScale=0.45;oboe@mouse.play=holdTurn(10,0)' \
  > scratch/grip-ob1.txt 2>&1
echo "exit $?"
