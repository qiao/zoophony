#!/bin/sh
# Sets the turn share of the elbow helper in poseSegments() for a probe, runs the args, and
# restores the file. Usage: sh scratch/helper-share.sh <share> <command...>
set -u
FILE=src/models/studio-rig.ts
cp "$FILE" scratch/studio-rig.orig.ts
trap 'cp scratch/studio-rig.orig.ts "$FILE"' EXIT INT TERM
SHARE="$1"
shift
perl -0pi -e 's/segmentTurn\.copy\(upperTurn\)\.slerp\(foreTurn, [0-9.]+\)/segmentTurn.copy(upperTurn).slerp(foreTurn, '"$SHARE"')/' "$FILE"
grep -n 'copy(upperTurn).slerp' "$FILE"
"$@"
