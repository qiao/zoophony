#!/bin/zsh
# Renders the play views of a camera file with the body of a variant GLB in the working tree, then
# restores the rig and the module of the tree.
# Usage: scratch/render-variant.sh <glb> <out dir> <camera file> [play options]...
set -e
glb=$1; out=$2; cams=$3; shift 3
cd "$(git rev-parse --show-toplevel)"
rig=assets/models/polar-bear/polar-bear-tpose.rig.glb
mod=src/models/studio/polar-bear.ts
cp $rig scratch/rig-keep.glb; cp $mod scratch/mod-keep.ts
trap 'cp scratch/rig-keep.glb $rig; cp scratch/mod-keep.ts $mod' EXIT
cp $glb $rig
pnpm studio-body polar-bear > /dev/null
pnpm close-views play $out --camera-file $cams --size 640x640 "$@" > $out.log 2>&1
