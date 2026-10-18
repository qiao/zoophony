#!/bin/zsh
# Puts the rig of scratch/panda-folds/out-<name> into the app, renders the front and the back of
# the gallery panda in the rest pose into scratch/panda-folds/cv-<name>, and measures the white
# fur: docs/research/2026-10-18-panda-folds/render.sh <name>. Afterward, restore the rig files with
# git checkout assets/models/panda/panda.rig.glb src/models/studio/panda.ts.
set -e
name=$1
dir=scratch/panda-folds
cp $dir/out-$name/panda.rig.glb assets/models/panda/panda.rig.glb
pnpm -s studio-body panda > $dir/out-$name/studio-body.log
pnpm -s close-views species panda $dir/cv-$name --views front,back --moment rest > $dir/out-$name/cv.log
for view in front back; do
  boxes='125,50,225,80;120,225,195,295'
  [[ $view == back ]] && boxes='120,55,240,135'
  uv run --no-project --with pillow --with numpy python -I docs/research/2026-10-18-panda-folds/fur_white.py \
    $dir/cv-$name/species-panda-rest-$view.png $boxes
done
