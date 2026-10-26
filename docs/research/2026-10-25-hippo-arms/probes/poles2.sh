#!/bin/zsh
# usage: zsh docs/research/2026-10-25-hippo-arms/probes/poles2.sh - <out> <pole>... : the arm gate of the bassist for rest poles of the right elbow.
# Run it from the root of the tree.
glb=unused
out=$2
shift 2
args=()
k=0
for pole in "$@"; do
  k=$((k + 1))
  args+=(--variant "p$k" --set "contrabass@hippo.restPoleR=$pole")
done
pnpm arm-check bassist "${args[@]}" > $out 2>&1
echo "exit $?"
grep -E '^\| (bassist|p[0-9]+) \| [LR] \|' $out | head -20
