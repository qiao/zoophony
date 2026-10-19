#!/bin/zsh
# Runs the pose-depth plan probes of item 4 one after the other.
cd /Users/xueqiaoxu/proj/zoophony-retro-winds
start=$(date +%s)
pnpm -s pose-depth hornist --demo beethoven-8 --set 'horn@pig.reachL=24deg' > docs/research/2026-10-19-winds-retro/pose-depth-plan-demo.txt 2>&1
echo "demo status $? in $(( $(date +%s) - start )) s" > scratch/pd-status.txt
start=$(date +%s)
pnpm -s pose-depth hornist --demo beethoven-8 --set 'horn@pig.reachL=24deg' > docs/research/2026-10-19-winds-retro/pose-depth-plan-cached.txt 2>&1
echo "cached status $? in $(( $(date +%s) - start )) s" >> scratch/pd-status.txt
start=$(date +%s)
pnpm -s pose-depth hornist --set 'horn@pig.reachL=24deg' > docs/research/2026-10-19-winds-retro/pose-depth-plan-all.txt 2>&1
echo "all status $? in $(( $(date +%s) - start )) s" >> scratch/pd-status.txt
