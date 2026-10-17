#!/bin/zsh
# Usage: docs/research/2026-10-17-fox-form/fold-variants.sh <name> <animal> <role> '<json spec>' [demo...]
# Rigs a variant with rig-variants.py and prints the play folds of the role with --glb.
set -o pipefail
W=$(cd "$(dirname "$0")/../../.." && pwd)
cd $W
name=$1; animal=$2; role=$3; spec=$4; shift 4
if (( $# )); then demos=($@); else demos=(beethoven-9 mozart-k525 bach-bwv1047); fi
python3 docs/research/2026-10-17-fox-form/rig-variants.py rig $name $animal "$spec" | cut -c1-200
grep -h 'raise R\|neck:' scratch/var/$name.log | sed 's/^rig_mesh: //' | cut -c1-200
dargs=(); for d in $demos; do dargs+=(--demo $d); done
pnpm fold-probe $role --glb $W/scratch/var/$name.glb $dargs --step 1 --faces 3 > scratch/var/$name-$role-fold.txt 2>&1 || { echo "fold-probe failed"; tail -5 scratch/var/$name-$role-fold.txt; exit 1; }
grep -E '^\| (play|lift|rest) ' scratch/var/$name-$role-fold.txt | cut -c1-120
grep -E '^\| [0-9]+ \| [0-9.]+%' scratch/var/$name-$role-fold.txt | cut -c1-110
