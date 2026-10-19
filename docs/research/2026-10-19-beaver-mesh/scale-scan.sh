#!/usr/bin/env bash
# Measures the spare reach of each palm to its bassoon grip, in the play and in the rest, for each
# rig of pnpm mesh-options and each bassoon scale, with the reed in the mouth under the teeth.
# Usage: docs/research/2026-10-19-beaver-mesh/scale-scan.sh <rigs dir> <lipShift y> <lipShift z>
# <shoulder turn rad> <rig name>... The shoulder turn is the forward turn of each shoulder bone
# (reach and reachL of the hold). Each rig writes one log of pnpm hold-reach into options/.
set -euo pipefail
dir=$1
y=$2
z=$3
turn=$4
shift 4
out=docs/research/2026-10-19-beaver-mesh/options
lip="bassoon@beaver.lipShift.1=$y;bassoon@beaver.lipShift.2=$z;bassoon@beaver.reach=$turn"
lip="$lip;bassoon@beaver.reachL=$turn"
for rig in "$@"; do
  sets=()
  for s in 1 0.95 0.9 0.85 0.8 0.75 0.7 0.65 0.6; do
    sets+=(--set "$lip;beaver.bassoonScale=$s")
  done
  pnpm -s hold-reach beaver --instrument bassoon "${sets[@]}" --glb "$dir/$rig.rig.glb" \
    > "$out/reach-$rig-lip$y,$z-turn$turn.txt"
done
