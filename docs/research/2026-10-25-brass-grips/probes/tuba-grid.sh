#!/bin/sh
# Usage: sh scratch/tuba-grid.sh <out prefix> <base set> <variant set>...
# Runs the arm gate (parallel variants), the depths, and the left grasp for each variant set.
out=$1
shift
base=$1
shift
gate_args=""
depth_args=""
n=0
for v in "$@"; do
  n=$((n + 1))
  echo "v$n: $v"
done
n=0
set --  "$@"
for v in "$@"; do
  n=$((n + 1))
  gate_args="$gate_args --variant v$n --set $base;$v"
done
node tools/arm-check.ts tubist --jobs 8 $gate_args > "$out-gate.txt" 2>&1
grep -E '^\| v[0-9]+ \| tubist \| L' "$out-gate.txt"
n=0
for v in "$@"; do
  n=$((n + 1))
  depth_args="$depth_args --set $base;$v"
done
node tools/pose-depth.ts tubist --long $depth_args > "$out-depth.txt" 2>&1
grep -A40 '^| variant | play paws' "$out-depth.txt" | awk 'NR>2 && /^\| / {print} /^$/ {exit}' | cut -d'|' -f3-6,13-16
node tools/wind-grip.ts tubist $depth_args > "$out-grip.txt" 2>&1
grep -E '^\| (tree|tuba)' "$out-grip.txt" | cut -d'|' -f3,7,9
