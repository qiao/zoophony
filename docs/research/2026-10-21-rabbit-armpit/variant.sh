#!/bin/zsh
# Rigs one variant of the rabbit, swaps it into the tree, renders the user camera, and restores.
# Usage: scratch/variant.sh <name> [--set <change>]...
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-armpit
name=$1; shift
out=scratch/var/$name
mkdir -p $out
pnpm rig-mesh rabbit --check --roles violinist "$@" --keep $out/glb > $out/rig.txt 2>&1 || { echo "rig failed"; tail -20 $out/rig.txt; exit 1; }
glb=$(ls $out/glb/*.glb | tail -1)
echo "glb $glb"
cp $glb assets/models/rabbit/rabbit-4.rig.glb
pnpm studio-body rabbit > $out/studio-body.txt 2>&1 || { echo "studio-body failed"; tail $out/studio-body.txt; git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts; exit 1; }
node scratch/id-raster.ts violinist brahms-2 678.63 120 $out/id-678-az120 > /dev/null
node scratch/id-raster.ts violinist brahms-2 678.63 90 $out/id-678-az90 > /dev/null
node scratch/groove.ts violinist --step 1 --side R > $out/groove.txt 2>&1
node scratch/groove.ts violinist --step 1 --side L > $out/groove-L.txt 2>&1
pnpm close-views play $out/play --demo brahms-2 --time 678.63 --at rabbit --azimuth 120 --azimuth 90 > $out/play.log 2>&1 || echo "render failed"
git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts
command grep -E '^[|] (base|set)' $out/rig.txt | head -1
cat $out/groove.txt $out/groove-L.txt
