#!/bin/zsh
# Sets the turns of PANDA_PLAY in src/pose/winds.ts and renders the gallery panda: the play views
# of the lineup (front, left, front35) and the role views of the trombonist (the band box is in the
# front view of the first position).
# Usage: docs/research/2026-10-18-trombone-fit/render.sh <right> <down> <left shoulder> <dir>
# Afterward, restore the file with git checkout src/pose/winds.ts.
set -euo pipefail
perl -0pi -e "s/(const PANDA_PLAY = \{.*?right: )\d+(,.*?down: )\d+(,.*?shoulderL: )\d+/\${1}$1\${2}$2\${3}$3/s" src/pose/winds.ts
git diff --stat src/pose/winds.ts
pnpm -s close-views species panda $4/lineup --views front,left,front35 --moment play
pnpm -s close-views trombonist $4/role
