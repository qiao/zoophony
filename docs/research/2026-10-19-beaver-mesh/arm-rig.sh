#!/bin/zsh
# Rigs a variant of the beaver config with a direct run of Blender into scratch/rigs/<name>/, then
# runs the fold probe of the bassoonist on the rig with the other options.
# docs/research/2026-10-19-beaver-mesh/arm-rig.sh <name> '<python statement that changes d>' \
#     [fold-probe options...]
# Example: arm-rig.sh cut60 "d['cut']={'top':0.6}" --set 'bassoon@beaver.reachL=0.43633'
set -e
cd "$(git rev-parse --show-toplevel)"
name=$1; expr=$2; shift 2
out=scratch/rigs/$name
mkdir -p $out
python3 - "$expr" "$out/beaver.json" <<'PY'
import json, sys
d = json.load(open('tools/mesh-rigs/beaver.json'))
exec(sys.argv[1])
json.dump(d, open(sys.argv[2], 'w'), indent=2)
PY
blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- \
    $out/beaver.json $out/beaver.rig.glb --obj $out/source-long-arms.obj --check > $out/rig.log 2>&1
pnpm -s fold-probe bassoonist --glb $out/beaver.rig.glb "$@" > $out/fold.txt 2>&1
