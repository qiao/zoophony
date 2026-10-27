#!/bin/zsh
# Idea 1: the rest instrument rolled about the normal of its top plate. The twist path of the left
# paw in one lift for each roll angle (path-probe.ts). Run from the root of the tree.
D=docs/research/2026-10-27-violin-unwind
for a in 0 30 60 75 90 105 120; do
  echo "roll $a"
  node $D/path-probe.ts --set "$(node $D/roll-set.mjs $a)" 2>&1 | tail -3
done
