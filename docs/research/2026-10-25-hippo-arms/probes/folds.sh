#!/bin/zsh
# usage: scratch/folds.sh <glb> [faces] [demo...] : the summary and the faces that fold most.
set -o pipefail
# Run it from the root of the tree.
glb=$1
n=${2:-12}
shift 2 2>/dev/null
demos=()
for d in "$@"; do demos+=(--demo $d); done
pnpm fold-probe bassist --glb $glb --faces $n "${demos[@]}" > $glb.fold.txt 2>&1
grep -E '^\| (rest|play|lift|all) ' $glb.fold.txt
grep -E '^\| [0-9]+ \| [0-9.]+%' $glb.fold.txt | cut -d'|' -f2-9,11 | head -$n
