#!/bin/zsh
# Rebuilds the cat arm copy, the rig, and the body module of this tree into the logs of <dir>.
set -o pipefail
out=$1
mkdir -p $out
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/blender/cat_arms.py > $out/blender.log 2>&1 || { echo "blender failed"; tail -20 $out/blender.log; exit 1; }
pnpm rig-mesh cat > $out/rig.log 2>&1 || { echo "rig failed"; tail -15 $out/rig.log; exit 1; }
pnpm studio-body cat > $out/body.log 2>&1 || { echo "body failed"; tail -5 $out/body.log; exit 1; }
grep -E '^step_round_wall|^step_paint' $out/blender.log
echo built
