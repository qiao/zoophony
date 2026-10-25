#!/bin/zsh
# Scans the arm gate of the snare drummer and the cymbalist over the pitch values in $@.
# Usage: zsh docs/research/2026-10-25-percussion-tips/arm-scan.sh <out> <pitch>...
set -u
out=$1
shift
S='"rest":-0.6,"lift":0.3'
args=()
for p in "$@"; do
  args+=(--variant "p$p" --set "snare-drum.across={$S,\"pitch\":$p};suspended-cymbal.across={$S,\"pitch\":$p}")
done
# Runs from the root of the tree.
node tools/arm-check.ts snare-drummer cymbalist --jobs 6 "${args[@]}" > "$out" 2>&1
echo "exit $?"
