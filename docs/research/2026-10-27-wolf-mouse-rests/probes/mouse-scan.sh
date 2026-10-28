#!/bin/zsh
# Scans variants of the mouse oboe rest with two tools and joins one line for each variant: the
# rest turns of `pnpm hold-fit --sets lift,rest,lower` (upper arm, paw twist and swing, left and
# right), the deepest point at rest, and the grasp of each paw in the lift, the rest, and the
# lowering with the left rest palm angle of `pnpm wind-grip` (diagnosis only).
# Usage: docs/research/2026-10-27-wolf-mouse-rests/probes/mouse-scan.sh <out prefix> '<base set>' '<variant set>'...
set -o pipefail
out=$1; base=$2; shift 2
sets=()
for v in "$@"; do sets+=(--set "$base;$v"); done
pnpm hold-fit oboist --sets lift,rest,lower "${sets[@]}" > $out-fit.txt 2>&1 || exit 1
pnpm wind-grip oboist "${sets[@]}" > $out-grip.txt 2>&1 || exit 1
for v in "$@"; do
  key="$base;$v"
  fit=$(command grep -F "| $key |" $out-fit.txt | command grep -v 'wall' | head -1 | awk -F'|' '{print $7 " |" $10}')
  grip=$(command grep -F "| $key |" $out-grip.txt | head -1 | awk -F'|' '{print "lift L " $5 " | rest L " $7 " | lower L " $9}')
  print -r -- "$v |$fit | $grip"
done
