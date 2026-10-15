#!/bin/zsh
# Measures the elbows of the polar bear pianist for each bench height.
# Run it from the root of the worktree: docs/research/2026-10-14-polar-bench/benches.sh
# It writes elbow-<bench>.txt into this folder. It swaps the module of the polar bear for each
# bench, and restores the module of the commit at the end, also after a failure.
set -euo pipefail
dir=docs/research/2026-10-14-polar-bench
module=src/models/studio/polar-bear.ts
tmp=$(mktemp -d)
trap 'git checkout -- $module; rm -rf $tmp' EXIT
node $dir/elbow-probe.ts > $dir/elbow-main.txt
for bench in 0.15 0.18 0.20 0.25 0.32 0.40 0.45; do
  node $dir/make-variant.ts $bench $tmp/polar-bear.ts
  cp $tmp/polar-bear.ts $module
  node $dir/elbow-probe.ts > $dir/elbow-$bench.txt
done
