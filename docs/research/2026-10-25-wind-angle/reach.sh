#!/bin/zsh
# Scans the grip reach of the oboe and the clarinet over the play turn.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
for a in 0 10 15 25; do
  echo "oboe play turn $a"
  pnpm -s hold-reach mouse --instrument oboe --set "oboe@mouse.play=holdTurn($a,0)" 2>&1 | grep -E 'Playing'
done
for a in 5 10; do
  echo "clarinet play turn $a"
  pnpm -s hold-reach wolf --instrument clarinet --set "clarinet@wolf.play=holdTurn($a,0)" 2>&1 | grep Playing
done
