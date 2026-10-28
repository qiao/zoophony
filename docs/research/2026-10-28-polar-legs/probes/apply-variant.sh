#!/bin/zsh
# Puts one variant of variants.txt into the working tree: the rig file, the landmark height of the
# polar bear in ANIMALS of tools/studio-body.ts (so that the variant keeps the meters for each
# unit of main), and the module. The bench of the app fits the body (benchFitOf()), so the bench
# needs no patch. With no argument, the script gives the three files of main back.
# Run from the root of the tree:
#   docs/research/2026-10-28-polar-legs/probes/apply-variant.sh [<glb> <ANIMALS height>]
# The GLB file comes from `pnpm rig-mesh polar-bear --check --keep <dir> --set <set>`, and the
# check prints the landmark height of the variant ("the landmark of the scale moves with them").
set -euo pipefail
git checkout -q -- tools/studio-body.ts assets/models/polar-bear/polar-bear-tpose.rig.glb \
  src/models/studio/polar-bear.ts
if [[ $# -eq 0 ]]; then
  git status --short
  exit 0
fi
cp "$1" assets/models/polar-bear/polar-bear-tpose.rig.glb
perl -0pi -e "s/height: 1\.42549,/height: $2,/" tools/studio-body.ts
command grep -q "height: $2," tools/studio-body.ts
pnpm -s studio-body polar-bear > /dev/null
git status --short
