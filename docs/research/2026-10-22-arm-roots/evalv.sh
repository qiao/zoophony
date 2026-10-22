#!/bin/zsh
# evalv.sh <species> <role> <glb> <name> <src.npz> <src-edges>: dump the samples of a kept rig and print the crease of the source edges
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/arm-roots
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/ar
SPECIES=$1 node scratch/with-glb.ts $3 dump-all.ts $2 $S/$4-all --step 4 --every 2 > /dev/null 2>&1
uv run --no-project --with numpy --with scipy python -I $S/tools/seamcrease.py $S/$4-all ${3%.glb}.corners.json $5 --limit 999 --src-edges $6
