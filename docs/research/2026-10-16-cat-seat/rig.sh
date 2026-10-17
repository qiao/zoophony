#!/bin/zsh
# Usage: scratch/rig.sh <name> [<path>=<json>]...  Rigs a variant of the cat config with Blender
# (the debug copy of the rig script, which also prints the profile of the seat and dumps arrays).
set -o pipefail
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/cat-seat
cd $W
name=$1; shift
V=$W/scratch/variants
python3 $W/scratch/patch.py $W/tools/mesh-rigs/cat.json $V/$name.json "$@" || exit 1
DUMP=$V/$name /opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python scratch/rig_debug.py -- $V/$name.json $V/$name.glb --preview $V/$name-preview > $V/$name.log 2>&1
code=$?
python3 $W/scratch/gap.py $V/$name.log
exit $code
