#!/bin/zsh
# Rigs a variant of the raise rules of the dog with Blender into scratch/df/out-<name>/ and prints
# the log lines of the rules. Usage, from the root of the tree:
# docs/research/2026-10-17-dog-folds/rig-only.sh <name> <raise.json> [<path>=<json>]...
set -e
name=$1; raise=$2; shift 2
out=scratch/df/out-$name
mkdir -p $out
python3 -I docs/research/2026-10-17-dog-mesh/variant.py tools/mesh-rigs/dog.json $out/dog.json "raise=$(cat $raise)" "$@"
/opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $out/dog.json $out/dog.rig.glb --check > $out/rig.log 2>&1
grep '^rig_mesh: raise' $out/rig.log | sed "s/^/$name: /" || true
