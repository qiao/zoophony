#!/bin/zsh
# Rigs the rabbit with the moves of a JSON file (RIG_MOVES), swaps the rig into the tree, renders
# the frame of the user at 120 and 90, measures the groove, and restores the tree.
# Usage: scratch/run-variant.sh <name> <moves json>
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-notch
name=$1; moves=$2; shift 2; out=scratch/var/$name; mkdir -p $out
RIG_MOVES=$PWD/$moves pnpm rig-mesh rabbit --check --roles violinist "$@" --keep $out/glb > $out/rig.txt 2>&1 || { echo "rig failed"; tail -20 $out/rig.txt; exit 1; }
cp $(ls $out/glb/*.glb | tail -1) assets/models/rabbit/rabbit-4.rig.glb
pnpm studio-body rabbit > $out/studio-body.txt 2>&1 || { echo "studio-body failed"; tail $out/studio-body.txt; git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts; exit 1; }
node scratch/id-raster.ts violinist brahms-2 678.63 120 $out/id-678-az120 > /dev/null
node scratch/groove.ts violinist --step 1 --side R > $out/groove.txt 2>&1
node scratch/groove.ts violinist --step 1 --side L > $out/groove-L.txt 2>&1
pnpm close-views play $out/play --demo brahms-2 --time 678.63 --at rabbit --azimuth 120 --azimuth 90 --azimuth -120 > $out/play.log 2>&1 || echo "render failed"
git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts
sed -n '/^| Variant | Triangles/,/^$/p' $out/rig.txt | tail -2
command grep -E "debug moves|raise arm" $out/rig.txt
cat $out/groove.txt
