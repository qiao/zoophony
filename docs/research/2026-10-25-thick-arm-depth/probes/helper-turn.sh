#!/bin/sh
# Sets the turn share of the elbow helper in poseSegments() for a probe, runs the args, and
# restores the file. Run it from the root of the tree on main, with the share 0 and 1:
#   sh docs/research/2026-10-25-thick-arm-depth/probes/helper-turn.sh <share> \
#     pnpm pose-depth timpanist --where upperArmR beethoven-8-4:565.34
set -u
FILE=src/models/studio-rig.ts
cp "$FILE" scratch/studio-rig.orig.ts
trap 'cp scratch/studio-rig.orig.ts "$FILE"' EXIT INT TERM
SHARE="$1"
shift
perl -0pi -e 's/segmentTurn\.copy\(upperTurn\)\.slerp\(foreTurn, [0-9.]+\)/segmentTurn.copy(upperTurn).slerp(foreTurn, '"$SHARE"')/' "$FILE"
grep -n 'copy(upperTurn).slerp' "$FILE"
"$@"
