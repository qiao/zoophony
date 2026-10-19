#!/bin/zsh
# Rigs a variant of the hippo config with Blender and counts its folds on one demo.
# Usage: docs/research/2026-10-19-hippo-chest/variant.sh <name> <python expression that edits cfg> [<out root>]
set -e
name=$1; expr=$2
out=${3:-scratch}/var-$name
mkdir -p $out
python3 -c "
import json
cfg=json.load(open('tools/mesh-rigs/hippo.json'))
$expr
json.dump(cfg, open('$out/hippo.json','w'), indent=2)
"
/opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $out/hippo.json $out/hippo.rig.glb --check > $out/rig.log 2>&1
pnpm fold-probe bassist --glb $out/hippo.rig.glb --faces 40 --demo boulanger-matin > $out/fold.txt 2>&1
sed -n '/faces that fold in the most/,/^The corners/p' $out/fold.txt | command grep -E '^\| [0-9]' | awk -F'|' '{printf "%s:%s/%s ", $2, $4, $5}' | tr -s ' '
echo " <- $name"
