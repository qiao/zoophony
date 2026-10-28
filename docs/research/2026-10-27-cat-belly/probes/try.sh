#!/bin/zsh
# Replays cat_arms.py into the assets, rigs the cat, exports the app body, and measures the belly.
# Usage: scratch/try.sh <name>
set -o pipefail
name=$1
root=$(git rev-parse --show-toplevel)
cd $root || exit 1
mkdir -p scratch/tries/$name
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P tools/blender/cat_arms.py > scratch/tries/$name/arms.log 2>&1 || { echo "arms failed"; exit 1; }
if grep -q Traceback scratch/tries/$name/arms.log; then grep -A 12 Traceback scratch/tries/$name/arms.log; exit 1; fi
grep 'step_belly' scratch/tries/$name/arms.log
pnpm rig-mesh cat > scratch/tries/$name/rig.log 2>&1 || { echo "rig failed"; tail -5 scratch/tries/$name/rig.log; exit 1; }
grep 'crease:\|bind: 1\|triangles' scratch/tries/$name/rig.log | cut -c1-160
pnpm studio-body cat > scratch/tries/$name/sb.log 2>&1 || { echo "studio-body failed"; exit 1; }
node scratch/belly.ts --glb assets/models/cat/cat-arms.glb --from 0.1 --to 0.8 --levels 28 > scratch/tries/$name/probe.txt
node scratch/belly.ts --bind --from 0.1 --to 0.8 --levels 28 --obj scratch/tries/$name/m >> scratch/tries/$name/probe.txt
node scratch/belly.ts --pose rest --from 0.1 --to 0.8 --levels 28 --obj scratch/tries/$name/m >> scratch/tries/$name/probe.txt
cat scratch/tries/$name/probe.txt
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scratch/objviews.py -- scratch/tries/$name/m-rest-10.0.obj scratch/tries/$name/v > /dev/null 2>&1
