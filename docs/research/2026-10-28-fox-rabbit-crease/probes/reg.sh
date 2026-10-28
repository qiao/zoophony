#!/bin/sh
# Runs scratch/crease.ts in a tree of git archive <ref>: reg.sh <ref> <args of crease.ts>...
# Run it from the root of a tree that holds scratch/crease.ts and node_modules/.
set -eu
ROOT=$(pwd)
ref=$1; shift
dir=$(mktemp -d "${TMPDIR:-/tmp}/reg-XXXX")
git -C "$ROOT" archive "$ref" src tools demos package.json tsconfig.json | tar -x -C "$dir"
ln -s "$ROOT/node_modules" "$dir/node_modules"
mkdir -p "$dir/scratch"
cp "$ROOT/scratch/crease.ts" "$dir/scratch/crease.ts"
cd "$dir"
echo "ref $ref ($(git -C "$ROOT" log --format='%h %s' -1 "$ref"))"
node scratch/crease.ts "$@"
cd /
rm -rf "$dir"
