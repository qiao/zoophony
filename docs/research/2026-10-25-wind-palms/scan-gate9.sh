#!/bin/zsh
# Runs the arm gate of the bassoonist on left elbow variants of the side grip.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-ab9c0d2a0f1565495
v=()
i=0
for p in '-1,-0.5,0' '-1,-1,0' '-0.3,-1,-0.6' '-1,-0.3,-0.4' '-0.5,-1,0.2'; do
  i=$((i + 1))
  v+=(--variant p$i --set "bassoon@beaver.poleL=$p;bassoon@beaver.restPoleL=$p")
done
pnpm -s arm-check bassoonist --jobs 5 "${v[@]}" > scratch/gate9.txt 2>&1
echo "exit $?"
