#!/bin/zsh
# usage: zsh docs/research/2026-10-25-hippo-arms/probes/poledepth.sh <out> <pole>... : the depths by bone (one demo) for rest poles of the
# right elbow, one row for each pole.
# Run it from the root of the tree.
out=$1
shift
args=()
for pole in "$@"; do
  args+=(--set "contrabass@hippo.restPoleR=$pole")
done
pnpm pose-depth bassist --per-bone --demo bach-bwv1048 --demo bach-bwv1050 "${args[@]}" > $out 2>&1
echo "exit $?"
grep -A12 '^| variant |' $out | sed -n '1,/^$/p' | head -12
