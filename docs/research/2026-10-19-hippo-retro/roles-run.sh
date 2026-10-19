#!/bin/zsh
# Runs the new default sweep of each held role over all its demos.
cd "$(git rev-parse --show-toplevel)"
R=docs/research/2026-10-19-hippo-retro
: > scratch/roles-times.txt
for r in violinist violist cellist bassist flutist oboist trombonist; do
  start=$(date +%s)
  node tools/pose-depth.ts $r > scratch/roles-$r.txt 2>&1
  echo "$r exit $? $(( $(date +%s) - start )) s" >> scratch/roles-times.txt
done
echo done >> scratch/roles-times.txt
