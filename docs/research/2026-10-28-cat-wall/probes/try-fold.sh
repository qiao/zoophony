#!/bin/zsh
# try-fold.sh <label> <perl substitution on cat_arms.py>: builds a variant and runs the fold probe
# against main; restores the script and the assets of the tree after.
set -o pipefail
SP=${OUT:?set OUT to a folder for the outputs}
label=$1
cp tools/blender/cat_arms.py $SP/cat_arms.py.keep
mkdir -p $SP/keep && cp assets/models/cat/cat-arms.glb assets/models/cat/cat-weights.json assets/models/cat/cat.rig.glb src/models/studio/cat.ts $SP/keep/
perl -0pi -e "$2" tools/blender/cat_arms.py
diff -q tools/blender/cat_arms.py $SP/cat_arms.py.keep > /dev/null && echo "no change of the script"
scratch/build.sh $SP/$label > /dev/null || { echo build failed; }
cp $SP/cat_arms.py.keep tools/blender/cat_arms.py
pnpm fold-probe violist --base main --faces 40 > $SP/fold-$label.txt 2>&1
[[ -n $KEEP ]] || { cp $SP/keep/cat-arms.glb $SP/keep/cat-weights.json $SP/keep/cat.rig.glb assets/models/cat/; cp $SP/keep/cat.ts src/models/studio/cat.ts; }
sed -n '/^| Set/,/^$/p' $SP/fold-$label.txt | head -5
grep -E '\| (new|gone) \|' $SP/fold-$label.txt | awk -F'|' '{print $2,$3,$5,$6,$7}' | head -30
