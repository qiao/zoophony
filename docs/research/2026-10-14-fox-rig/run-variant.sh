#!/bin/zsh
# Rigs a variant of the fox config and counts its folds in the play of the violinist.
# Usage: docs/research/2026-10-14-fox-rig/run-variant.sh <name> '<python statements on c and w>'
# Example: run-variant.sh a6 "w['clavicleFrom']=[0.58,0.63]; w['armTop']=[0.66,0.72]"
# The variant config, its rig, and its logs go into scratch/var/ of the worktree.
name=$1; upd=$2
cd "$(dirname "$0")/../../.."
mkdir -p scratch/var
python3 -c "
import json
c=json.load(open('tools/mesh-rigs/fox.json'))
w=c['weights']
$upd
json.dump(c,open('scratch/var/fox-$name.json','w'))"
blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- scratch/var/fox-$name.json scratch/var/fox-$name.glb > scratch/var/log-$name 2>&1 || echo "$name: rig failed"
pnpm -s fold-probe fox-violinist --glb scratch/var/fox-$name.glb > scratch/var/fold-$name.txt 2>&1
echo "$name: $(grep -E 'rounds of relaxing' scratch/var/log-$name | sed 's/rig_mesh: //') $(grep -E '^\| (play|rest|lift) ' scratch/var/fold-$name.txt | tr '\n' ' ')"
grep "main studio bone" scratch/var/fold-$name.txt
