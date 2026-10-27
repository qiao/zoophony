#!/bin/zsh
# Runs one variant of the polar bear config: run.sh <name> <python statements on c>
# Writes scratch/b/cfg-<name>.json, the steps, and prints the hard edges of both legs and the lowest vertex.
set -o pipefail
name=$1; code=$2
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/fifth-rigs3
cd $W
uv run --no-project python -I -c "
import json
c = json.load(open('${CONFIG:-tools/mesh-rigs/polar-bear.json}'))
$code
json.dump(c, open('scratch/b/cfg-$name.json', 'w'), indent=1)
" || exit 1
rm -rf scratch/b/steps-$name scratch/b/steps-$name-R
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scratch/b/steps.py -- scratch/b/cfg-$name.json scratch/b/out-$name.glb scratch/b/steps-$name > scratch/b/steps-$name.log 2>&1 || { echo "blender failed"; tail -5 scratch/b/steps-$name.log; exit 1; }
grep -E "knee crease|refine:|leg flips" scratch/b/steps-$name.log | sed 's/^/  /'
TOP=${TOP:-5} uv run --no-project --with numpy python -I scratch/b/zone_turns.py scratch/b/steps-$name
uv run --no-project --with numpy python -I scratch/b/mirror.py scratch/b/steps-$name scratch/b/steps-$name-R
TOP=${TOP:-5} uv run --no-project --with numpy python -I scratch/b/zone_turns.py scratch/b/steps-$name-R
uv run --no-project --with numpy python -I scratch/b/lowest.py scratch/b/steps-$name
