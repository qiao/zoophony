#!/bin/zsh
# Puts one variant into the tree (apply-variant.sh), and runs the bench probe of
# 2026-10-27-polar-bench, the note targets, and the depth sweep of the pianist with the hold of
# main. With a render folder, it then renders the image set (render-variant.sh).
# Run from the root of the tree:
#   <this file> <name> <glb> <ANIMALS height> <out dir> [<render dir>]
set -uo pipefail
P=docs/research/2026-10-28-polar-legs/probes
N=$1; O=$4
$P/apply-variant.sh $2 $3 || { echo "apply failed"; exit 1; }
node docs/research/2026-10-27-polar-bench/probes/bench-probe.ts --json $O/bench-$N.json > $O/bench-$N.txt 2>&1; echo "bench exit=$?"
pnpm -s pose-depth pianist --targets > $O/targets-$N.txt 2>&1; echo "targets exit=$?"
pnpm -s pose-depth pianist > $O/depth-$N.txt 2>&1; echo "depth exit=$?"
if [[ $# -ge 5 ]]; then
  $P/render-variant.sh $5/$N; echo "render exit=$?"
fi
