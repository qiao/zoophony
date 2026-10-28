#!/bin/zsh
# Builds a variant of the polar bear copy: the arm rebuild, then the leg rebuild, into <dir>.
# Usage: scratch/variant.sh <dir> [PW_KEY=value]...
# First put the scripts of main (8b5a37ea9) into scratch/blender/ and apply variant-arms.diff and
# variant-legs.diff to them. The keys PW_PARALLEL, PW_SHARE, PW_CLEAN, PW_SMOOTH, PW_FACTOR, and
# PW_PROJECT choose the try.
set -e
dir=$1; shift
mkdir -p $dir
for kv in "$@"; do export "$kv"; done
cd "$(git rev-parse --show-toplevel)"
Blender -b --factory-startup -P scratch/blender/polar_bear_arms.py -- $dir > $dir/arms.log 2>&1
PW_IN=$dir Blender -b --factory-startup -P scratch/blender/polar_bear_legs.py -- $dir > $dir/legs.log 2>&1
grep -E 'VARIANT|CLEAN|SMOOTH|polar_bear_' $dir/arms.log $dir/legs.log
