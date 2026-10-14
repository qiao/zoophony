#!/bin/zsh
# Sets a temporary crease angle in the three studio modules: set-crease.sh <degrees|flat>
#
# The renders of crease-table.txt came from commit c0871c39, where a module with no crease angle
# still took the copy of the material with flat shading, as on main. "flat" removes the angle, so
# it gives the flat look of main only in such a checkout. From commit bcff8c92 on, the scene has
# no flat path, and the script refuses "flat".
cd "$(dirname $0)/../../.."
if [[ $1 == flat ]] && ! grep -q 'function flatMaterial' src/scene/player.ts; then
  echo 'This checkout has no flat path (src/scene/player.ts). Check out c0871c39 for the flat look.' >&2
  exit 1
fi
for f in src/models/studio/bear.ts src/models/studio/polar-bear.ts src/models/studio/rabbit.ts; do
  perl -0pi -e 's/\n  crease: [\d.]+,//' $f
  if [[ $1 != flat ]]; then
    perl -0pi -e "s/\n  mesh: '/\n  crease: $1,\n  mesh: '/" $f
  fi
done
grep -c 'crease' src/models/studio/*.ts
