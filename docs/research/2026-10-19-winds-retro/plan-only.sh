#!/bin/zsh
# Starts the sweep of the pig case, keeps its plan lines, and stops it by its PID.
cd /Users/xueqiaoxu/proj/zoophony-retro-winds
node tools/pose-depth.ts hornist --set 'horn@pig.reachL=20deg' --set 'horn@pig.reachL=22deg' --set 'horn@pig.reachL=28deg' --set 'horn@pig.reachL=30deg' > docs/research/2026-10-19-winds-retro/pose-depth-plan-pig.txt 2>&1 &
PID=$!
for i in {1..60}; do
  grep -q "^base (" docs/research/2026-10-19-winds-retro/pose-depth-plan-pig.txt 2>/dev/null && break
  sleep 0.5
done
kill $PID
wait $PID 2>/dev/null
echo "stopped $PID" >> docs/research/2026-10-19-winds-retro/pose-depth-plan-pig.txt
node tools/pose-depth.ts hornist --demo beethoven-8 --targets > docs/research/2026-10-19-winds-retro/pose-depth-plan-unknown.txt 2>&1
echo "unknown status $?" >> scratch/pd-status.txt
