#!/bin/zsh
# Rigs a config with Blender into a scratch folder: docs/research/2026-10-17-dog-mesh/rig.sh <config> <out-dir> [--preview]
set -e
cfg=$1; out=$2; shift 2
mkdir -p $out
extra=()
if [[ "$1" == "--preview" ]]; then extra=(--preview $out/preview); fi
/opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $cfg $out/dog.rig.glb --obj $out/source-long-arms.obj --check $extra > $out/rig.log 2>&1
grep '^rig_mesh:' $out/rig.log | grep -v 'preview:' > $out/rig-lines.log || true
