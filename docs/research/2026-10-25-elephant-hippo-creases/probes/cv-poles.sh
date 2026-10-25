#!/bin/zsh
# Renders the timpanist with one elbow pole variant.
# zsh scratch/cv-poles.sh <x> <y> <z> <dir> [options of close-views]
cd "${0:A:h}/../../../.."
x=$1 y=$2 z=$3 dir=$4
shift 4
pnpm close-views timpanist "$dir" --moments left,right,rest \
  --views front,left,right,back,35,-35 --zoom 2 \
  --set "timpani.poleL=-$x,$y,$z;timpani.poleR=$x,$y,$z" "$@"
