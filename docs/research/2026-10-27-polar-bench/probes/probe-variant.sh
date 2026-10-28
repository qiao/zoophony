#!/bin/zsh
# Runs the fold probe, the depth sweep, and the note targets of the pianist in the working tree.
# Run from the root of the tree: <this file> <out prefix>
set -uo pipefail
O=$1
pnpm -s fold-probe pianist --base main > $O-fold.txt 2>&1; echo "fold exit=$?"
pnpm -s pose-depth pianist --targets > $O-targets.txt 2>&1; echo "targets exit=$?"
pnpm -s pose-depth pianist --gaps --base main > $O-depth.txt 2>&1; echo "depth exit=$?"
