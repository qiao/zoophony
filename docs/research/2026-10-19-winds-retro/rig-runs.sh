#!/bin/zsh
# Runs the rig checks of items 3 and 6 one after the other.
cd /Users/xueqiaoxu/proj/zoophony-retro-winds
OUT=scratch/rig-runs
mkdir -p $OUT
start=$(date +%s)
pnpm -s rig-mesh beaver --check --roles bassoonist --demo beethoven-8 --set 'raise+=@docs/research/2026-10-19-winds-retro/raise-beaver-left.json' > $OUT/beaver-append.txt 2> $OUT/beaver-append.err
echo "beaver status $? in $(( $(date +%s) - start )) s" >> $OUT/status.txt
start=$(date +%s)
pnpm -s rig-mesh pig --check --roles hornist --demo beethoven-8 --set 'raise+=@docs/research/2026-10-19-winds-retro/raise-pig-hoof.json' > $OUT/pig-limit.txt 2> $OUT/pig-limit.err
echo "pig status $? in $(( $(date +%s) - start )) s" >> $OUT/status.txt
