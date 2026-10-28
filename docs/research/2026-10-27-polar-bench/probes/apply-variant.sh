#!/bin/zsh
# Puts one variant of variants.txt into the working tree: the rig file, the module, the scale, and
# the bench of bench.patch. The files of the tree come back with `git checkout` of the four paths.
# Run from the root of the tree:
#   docs/research/2026-10-27-polar-bench/probes/apply-variant.sh <glb> <ANIMALS height> <bench depth> <bench front>
# The GLB file comes from `pnpm rig-mesh polar-bear --check --keep <dir> --set <set>`.
set -euo pipefail
D=docs/research/2026-10-27-polar-bench/probes
git checkout -q -- src/models/instruments/piano.ts tools/studio-body.ts \
  assets/models/polar-bear/polar-bear-tpose.rig.glb src/models/studio/polar-bear.ts
git apply $D/bench.patch
cp "$1" assets/models/polar-bear/polar-bear-tpose.rig.glb
perl -0pi -e "s/height: 1\.395906,/height: $2,/" tools/studio-body.ts
perl -0pi -e "s/  depth: 0\.35,\n  front: 0\.175,/  depth: $3,\n  front: $4,/" src/models/instruments/piano.ts
grep -q "height: $2," tools/studio-body.ts
grep -q "depth: $3," src/models/instruments/piano.ts
pnpm -s studio-body polar-bear > /dev/null
git status --short
