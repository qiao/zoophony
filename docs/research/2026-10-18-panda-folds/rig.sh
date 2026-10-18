#!/bin/zsh
# Rigs a variant of the panda config into scratch/panda-folds/out-<name> with Blender, with no
# write into the repository: docs/research/2026-10-18-panda-folds/rig.sh <name> [<path>=<json>]...
set -e
name=$1; shift
out=scratch/panda-folds/out-$name
mkdir -p $out
python3 -I docs/research/2026-10-18-panda-mesh/variant.py tools/mesh-rigs/panda.json $out/panda.json "$@"
blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $out/panda.json $out/panda.rig.glb > $out/rig.log 2>&1
echo "$name: $out/panda.rig.glb"
