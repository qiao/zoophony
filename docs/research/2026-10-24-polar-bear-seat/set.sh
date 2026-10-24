#!/bin/zsh
# Sets the size factor of the polar bear and PIANO_FRONT_H in the tree, and writes the module.
#   scratch/set.sh <size factor> <front H>
set -eu
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-adedfed9827f86c1a
cd $W
h=$(python3 -c "print(round(1.642242*$1,6))")
perl -0pi -e "s/height: [0-9.]+,\n      seated: true,\n      soloist: false,\n      constant: 'STUDIO_POLAR_BEAR'/height: $h,\n      seated: true,\n      soloist: false,\n      constant: 'STUDIO_POLAR_BEAR'/" tools/studio-body.ts
pnpm -s studio-body polar-bear > /dev/null 2>&1
perl -0pi -e "s/export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $2;/" src/models/instruments/piano.ts
echo "height $h, PIANO_FRONT_H $2"
