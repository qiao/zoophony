#!/usr/bin/env bash
# Renders the trumpeter with other trumpet grips, and gives the reach and the arm gate of each.
# It edits the two grips of trumpet() in src/models/instruments/brass.ts, and restores the file.
#   OUT=<dir> docs/research/2026-10-20-mesh-monkey/grips.sh <label> <palmL> <palmR> ...
set -euo pipefail
out=${OUT:-scratch/monkey2}
mkdir -p $out
file=src/models/instruments/brass.ts
cp $file $out/brass.ts.keep
trap 'cp $out/brass.ts.keep $file' EXIT
while [ $# -ge 3 ]; do
  label=$1 L=$2 R=$3; shift 3
  cp $out/brass.ts.keep $file
  perl -0pi -e "s/palmL: scaled\(\[0.17, -0.04, -0.03\]\),\n    palmR: scaled\(\[0.18, 0.03, 0.01\]\),/palmL: scaled($L),\n    palmR: scaled($R),/" $file
  grep -qF "scaled($L)" $file
  pnpm -s close-views trumpeter $out/grip-$label > $out/grip-$label.log 2>&1
  pnpm -s hold-reach monkey --instrument trumpet > $out/grip-$label-reach.txt 2>&1
  pnpm -s arm-check trumpeter > $out/grip-$label-arm.txt 2>&1 || true
  echo "== $label"; grep 'spare' $out/grip-$label-reach.txt; grep '^| trumpeter | [LR] | [0-9]' $out/grip-$label-arm.txt
done
