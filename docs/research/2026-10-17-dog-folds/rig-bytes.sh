#!/bin/zsh
# Rigs each mesh animal into ${RIGS:-scratch/rigs} and compares the bytes with the repository file.
cd "$(git rev-parse --show-toplevel)"
for a in "$@"; do
  out=$(node -e "console.log(require('./tools/mesh-rigs/$a.json').output)")
  /opt/homebrew/bin/blender -b --factory-startup --python tools/blender/rig_mesh.py -- tools/mesh-rigs/$a.json ${RIGS:-scratch/rigs}/$a.glb > ${RIGS:-scratch/rigs}/$a.log 2>&1
  echo "$a blender exit $?"
  echo "$a new  $(shasum -a 256 ${RIGS:-scratch/rigs}/$a.glb | cut -c1-64)"
  echo "$a repo $(shasum -a 256 $out | cut -c1-64)"
done
