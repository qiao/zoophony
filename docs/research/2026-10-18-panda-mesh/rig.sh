#!/bin/zsh
# Rigs a variant of the panda config into a scratch folder with Blender, with no write into the
# repository: docs/research/2026-10-18-panda-mesh/rig.sh <name> [<path>=<json>]...
set -e
name=$1; shift
out=docs/research/2026-10-18-panda-mesh/out-$name
mkdir -p $out
python3 -I docs/research/2026-10-18-panda-mesh/variant.py tools/mesh-rigs/panda.json $out/panda.json "$@"
blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $out/panda.json $out/panda.rig.glb --obj $out/source-long-arms.obj --check > $out/rig.log 2>&1
grep '^rig_mesh:' $out/rig.log > $out/rig-lines.log || true
echo "$name: $out/panda.rig.glb"
