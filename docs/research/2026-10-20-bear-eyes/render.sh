#!/bin/zsh
# Renders the bear head of each variant of scratch/v/ (bear-variants.ts) from a dev server of the
# tree on port 5391 (npx vite --port 5391), at elevation 10 and 45, then restores the module.
# Usage: docs/research/2026-10-20-bear-eyes/render.sh <zoom> <name>...
set -e
cd "$(git rev-parse --show-toplevel)"
zoom=$1; shift
cp src/models/studio/bear.ts scratch/bear-saved.ts
for name in "$@"; do
  cp scratch/v/$name/bear.ts src/models/studio/bear.ts
  sleep 1
  node tools/close-views.ts conductor scratch/cv/$name-z$zoom --target head --zoom $zoom --scale 2 --url http://localhost:5391/ > /dev/null
  node tools/close-views.ts conductor scratch/cv/$name-z$zoom-e45 --target head --zoom $zoom --elevation 45 --scale 2 --url http://localhost:5391/ > /dev/null
done
cp scratch/bear-saved.ts src/models/studio/bear.ts
