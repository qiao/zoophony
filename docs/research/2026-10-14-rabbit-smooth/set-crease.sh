#!/bin/zsh
# Sets a temporary crease angle in the three studio modules: set-crease.sh <degrees|flat>
cd "$(dirname $0)/../../.."
for f in src/models/studio/bear.ts src/models/studio/polar-bear.ts src/models/studio/rabbit.ts; do
  perl -0pi -e 's/\n  crease: [\d.]+,//' $f
  if [[ $1 != flat ]]; then
    perl -0pi -e "s/\n  mesh: '/\n  crease: $1,\n  mesh: '/" $f
  fi
done
grep -c 'crease' src/models/studio/*.ts
