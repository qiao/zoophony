#!/bin/zsh
# Renders the Blender previews of a species, with no change to src/. Run it from the root of
# the repository. <out-dir> gets the images, and <out-dir>.png the front, side, back, and head.
# Usage: preview.sh <species> <out-dir>
set -euo pipefail
S=$(cd "$(dirname "$0")" && pwd)
OUT=$2
mkdir -p "$OUT"
node tools/sculpt-rig.ts "$1" "$OUT/rig.json" > /dev/null
blender -b --factory-startup --python tools/blender/build_sculpt.py -- "$OUT/rig.json" "$OUT" --render 2>&1 | grep -E 'triangles|Error|error' || true
sp=${1}
python3 "$S/montage.py" "$OUT.png" 600 "$OUT/$sp.seated.front.png" "$OUT/$sp.seated.side.png" "$OUT/$sp.seated.back.png" "$OUT/$sp.seated.head.png"
