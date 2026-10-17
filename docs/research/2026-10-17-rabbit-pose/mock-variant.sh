#!/bin/zsh
# Makes one mock variant of the rabbit: the lean of the rig and the extra room behind the back.
set -e
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-pose
name=$1; lean=$2; back=$3
perl -0pi -e "s/\"lean\": [-0-9.]+,/\"lean\": $lean,/" tools/mesh-rigs/rabbit.json
pnpm rig-mesh rabbit > scratch/mock/$name-rig.log 2>&1
MOCK_BACK=$back pnpm studio-body rabbit > scratch/mock/$name-export.log 2>&1
cp src/models/studio/rabbit.ts scratch/mock/$name.rabbit.ts
cp assets/models/rabbit/rabbit-4.rig.glb scratch/mock/$name.rig.glb
node scratch/side-probe.ts $name > scratch/mock/$name-side.txt 2>&1
cat scratch/mock/$name-side.txt
