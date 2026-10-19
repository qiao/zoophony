#!/bin/zsh
cd "$(git rev-parse --show-toplevel)"
for r in violinist violist cellist bassist flutist oboist trombonist; do
  start=$(date +%s)
  node tools/pose-depth.ts $r --bones instrument,slide --into body > scratch/base/$r.txt 2>&1
  echo "$r exit $? $(( $(date +%s) - start )) s" >> scratch/base/times.txt
done
