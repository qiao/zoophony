#!/bin/zsh
# var.sh <name> '<edits JSON>': writes the copy, its welded dump, the rig check, the posed dump, and the depths.
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-armpit
N=$1; E=$2; BL=${BLENDER:-blender}; D=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/rab/d
mkdir -p scratch/glb $D scratch/v
$BL -b --factory-startup --python tools/blender/arm_root.py -- tools/arm-roots/rabbit.json --out $PWD/scratch/glb/$N.glb --edits "$E" > scratch/v/$N-blender.txt 2>&1
command grep 'arm_root:' scratch/v/$N-blender.txt > scratch/v/$N-edit.txt || { tail -20 scratch/v/$N-blender.txt; exit 1; }
$BL -b --factory-startup --python scratch/dump.py -- scratch/glb/$N.glb scratch/glb/$N.npz > /dev/null 2>&1
pnpm rig-mesh rabbit --check --set source=scratch/glb/$N.glb --keep scratch/rig-$N > scratch/v/$N-rig.txt 2>&1 || { tail -20 scratch/v/$N-rig.txt; exit 1; }
G=scratch/rig-$N/variant-1.glb; CJ=${G%.glb}.corners.json
SPECIES=rabbit node scratch/with-glb.ts $G dump-mat.ts violinist $D/$N --step 4 --every 2 > /dev/null 2>&1
uv run --no-project --with numpy --with scipy python -I scratch/sdent.py $D/$N $CJ scratch/glb/$N.npz 0.05 > scratch/v/$N-sdent.txt
cat scratch/v/$N-edit.txt; command grep -E '^\| (Variant|base|variant|source)' scratch/v/$N-rig.txt | head -4
