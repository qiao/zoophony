#!/bin/zsh
# Renders the Blender previews of a species, with no change to src/. Run it from the root of
# the repository. <out-dir> gets the images, and <out-dir>.png the front, side, back, and head.
# Usage: preview.sh <species> <out-dir> [stance]
set -euo pipefail
S=$(cd "$(dirname "$0")" && pwd)
OUT=$2
STANCE=${3:-seated}
mkdir -p "$OUT"
node tools/sculpt-rig.ts "$1" "$OUT/rig.json" > /dev/null
blender -b --factory-startup --python tools/blender/build_sculpt.py -- "$OUT/rig.json" "$OUT" --render 2>&1 | grep -E 'triangles|Error|error|Traceback|File "' || true
sp=${1}
python3 "$S/montage.py" "$OUT.png" 600 "$OUT/$sp.$STANCE.front.png" "$OUT/$sp.$STANCE.side.png" "$OUT/$sp.$STANCE.back.png" "$OUT/$sp.$STANCE.head.png"
