#!/bin/sh
# Builds scratch/alt-<name>/ : a copy of src, tools, and the scratch probes, with the cat body from a GLB file.
# Usage: sh scratch/alt.sh <name> <glb path relative to the tree>
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
D="$ROOT/scratch/alt-$1"
rm -rf "$D"
mkdir -p "$D/scratch" "$D/assets/models"
cp -R "$ROOT/src" "$ROOT/tools" "$ROOT/package.json" "$D/"
cp "$ROOT"/scratch/*.ts "$D/scratch/"
ln -s "$ROOT/node_modules" "$D/node_modules"
ln -s "$ROOT/demos" "$D/demos"
ln -s "$ROOT/public" "$D/public" 2>/dev/null || true
for a in "$ROOT"/assets/*; do [ "$(basename "$a")" = models ] || ln -s "$a" "$D/assets/"; done
for m in "$ROOT"/assets/models/*; do ln -s "$m" "$D/assets/models/"; done
rm "$D/assets/models/cat"; mkdir "$D/assets/models/cat"
for f in "$ROOT"/assets/models/cat/*; do ln -s "$f" "$D/assets/models/cat/"; done
rm "$D/assets/models/cat/cat.rig.glb"; cp "$ROOT/$2" "$D/assets/models/cat/cat.rig.glb"
cd "$D" && node tools/studio-body.ts cat > studio-body.log 2>&1 && echo "alt $1 ready: $D"
