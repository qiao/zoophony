#!/bin/zsh
# Usage: scratch/rig.sh <name> [<path>=<json>|<path>=DELETE]...  Rigs a variant of the cat config.
set -o pipefail
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/cat-trunk
name=$1; shift
V=$W/scratch/variants
mkdir -p $V
python3 $W/scratch/patch.py $W/tools/mesh-rigs/cat.json $V/$name.json "$@" || exit 1
/opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python $W/tools/blender/rig_mesh.py -- $V/$name.json $V/$name.glb $PREVIEW > $V/$name.log 2>&1
code=$?
grep 'rig_mesh: \(trunk\|legs\|sit\|seat\|chair\|tail\|triangles\|bind\|crease\|arm\)' $V/$name.log
exit $code
