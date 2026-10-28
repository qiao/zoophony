#!/bin/zsh
# Rebuilds the cat arm copy, the rig, and the body module of this tree, then measures the left arm
# rings in the bind, the play, the rest, the lift, and the lowering.
#   scratch/try.sh <label>
set -o pipefail
label=$1
out=../rings/$label
mkdir -p $out
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/blender/cat_arms.py > $out/blender.log 2>&1 || { echo "blender failed"; exit 1; }
pnpm rig-mesh cat > $out/rig.log 2>&1 || { echo "rig failed"; tail -5 $out/rig.log; exit 1; }
pnpm studio-body cat > $out/body.log 2>&1 || { echo "body failed"; exit 1; }
for at in bind boulanger-matin:play:30 boulanger-matin:rest:#0 boulanger-matin:lift:#15 boulanger-matin:lower:#10; do
  name=${at//[:#]/-}
  if [[ $at == bind ]]; then node scratch/arm-rings.ts --bind > $out/$name.txt 2>&1; else node scratch/arm-rings.ts --at $at > $out/$name.txt 2>&1; fi
  node scratch/arm-rings.ts ${=${at/bind/--bind}/boulanger*/--at $at} --side R > $out/$name-R.txt 2>&1
done
echo done $label
