#!/bin/zsh
# Scores the clarinet angles of the wolf: the grips, the gate, and the views.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-a7773da8ca22c9295
A30='clarinet@wolf.play=holdTurn(5,0)'
A35='clarinet@wolf.play=holdTurn(10,0)'
pnpm -s wind-grip clarinetist --set "$A30" --set "$A35" > scratch/cl-v-grip.txt 2>&1
echo "grip exit $?"
pnpm -s arm-check clarinetist --jobs 2 --variant a30 --set "$A30" --variant a35 --set "$A35" > scratch/cl-v-gate.txt 2>&1
echo "gate exit $?"
pnpm -s close-views clarinetist scratch/wc-main --views front,left,right,back,35,-35 --moments note,rest --zoom 1.4 > scratch/wc-main.log 2>&1
pnpm -s close-views clarinetist scratch/wc-a30 --views front,left,right,back,35,-35 --moments note,rest --zoom 1.4 --set "$A30" > scratch/wc-a30.log 2>&1
pnpm -s close-views clarinetist scratch/wc-a35 --views front,left,right,back,35,-35 --moments note,rest --zoom 1.4 --set "$A35" > scratch/wc-a35.log 2>&1
echo "views exit $?"
