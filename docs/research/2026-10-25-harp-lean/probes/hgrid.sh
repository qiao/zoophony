#!/bin/zsh
# Hold grid at one harp place: zsh docs/research/2026-10-25-harp-lean/probes/hgrid.sh <out> "<scale> <tilt> <turn> <cx> <cy> <cz>" "<base changes>" "<variant changes>"...
# Each variant is the place, the base changes, and its own changes, in one --set.
cd "${0:A:h}/../../../.."
out=$1
place=$(node docs/research/2026-10-25-harp-lean/probes/solve.ts ${=2} | head -1)
common=$3
shift 3
args=()
: > "$out.params"
for v in "$@"; do
  echo "$v" >> "$out.params"
  args+=(--set "$place${common:+;$common}${v:+;$v}")
done
pnpm -s pose-depth harpist --demo boulanger-matin --gaps --every 6 "${args[@]}" > "$out" 2>&1
