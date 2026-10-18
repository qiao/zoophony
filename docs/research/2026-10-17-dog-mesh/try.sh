#!/bin/zsh
# Rigs a variant of the dog config and measures it: docs/research/2026-10-17-dog-mesh/try.sh <name> <shoulders> <changes>...
name=$1; sh=$2; shift 2
python3 -I docs/research/2026-10-17-dog-mesh/variant.py tools/mesh-rigs/dog.json scratch/cfg/$name.json "$@"
docs/research/2026-10-17-dog-mesh/rig.sh scratch/cfg/$name.json scratch/out-$name || { echo "$name: rig failed"; tail -3 scratch/out-$name/rig.log; exit 1; }
node docs/research/2026-10-17-dog-mesh/body-measures.ts scratch/out-$name/dog.rig.glb $sh > scratch/out-$name/measures.txt 2>&1
echo "== $name"; grep -E 'sit:|seat:|chair:|tail: the lowest|bind: after' scratch/out-$name/rig-lines.log; cat scratch/out-$name/measures.txt
