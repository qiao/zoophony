#!/usr/bin/env bash
# Gives the spare reach of each palm to its trumpet grip in the play and the rest, for a smaller
# trumpet and each arm factor of the mid-report. A smaller trumpet keeps its mouthpiece at the
# origin, so its grips (palmL and palmR of trumpet() in src/models/instruments/brass.ts) take the
# scale. The script edits the two grips for each scale, runs pnpm hold-reach on each rig of
# pnpm mesh-options, and restores the file.
#   docs/research/2026-10-20-mesh-monkey/trumpet-scale.sh <rigs dir> <arm factor>... -- <scale>...
set -euo pipefail
rigs=$1
shift
arms=()
while [[ $1 != -- ]]; do arms+=("$1"); shift; done
shift
file=src/models/instruments/brass.ts
trap 'git checkout -- "$file"' EXIT
for s in "$@"; do
  git checkout -- "$file"
  perl -0pi -e "s/palmL: \[0.17, -0.04, -0.03\],\n    palmR: \[0.18, 0.03, 0.01\],/palmL: [0.17 * $s, -0.04 * $s, -0.03 * $s],\n    palmR: [0.18 * $s, 0.03 * $s, 0.01 * $s],/" "$file"
  grep -q "0.17 \* $s" "$file"
  for a in "${arms[@]}"; do
    out=$(pnpm -s hold-reach monkey --instrument trumpet --glb "$rigs/skull-legs1-arms$a.rig.glb")
    line=$(echo "$out" | awk '
      $1 ~ /^[LR]:$/ { side = substr($1, 1, 1); arm = $3 }
      /pose: shoulder joint to the grip/ { pose = ($1 == "Playing") ? "play" : "rest"; d = $8
        printf "%s %s %.1f cm, ", pose, side, (arm - d) * 100 }')
    echo "scale $s arms $a: ${line%, }"
  done
done
