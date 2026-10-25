#!/bin/zsh
# The lift reach of the red fox: the paw swing.
pnpm -s arm-check fox-violinist --jobs 8 \
  --variant a --set 'violin@fox-red.liftReach=[0,0,-0.15]' \
  --variant b --set 'violin@fox-red.liftReach=[0,0.05,-0.2]' \
  --variant c --set 'violin@fox-red.liftReach=[0,0.1,-0.2]' \
  --variant d --set 'violin@fox-red.liftReach=[-0.05,0.05,-0.2]' \
  --variant e --set 'violin@fox-red.liftReach=[0.05,0.05,-0.2]' > scratch/fox4.txt 2>&1
node docs/research/2026-10-25-string-angle/species-depth.ts fox-red --demo mozart-k525 --demo boulanger-matin --every 4 \
  --set 'violin@fox-red.liftReach=[0,0,-0.15]' --set 'violin@fox-red.liftReach=[0,0.05,-0.2]' \
  --set 'violin@fox-red.liftReach=[0,0.1,-0.2]' --set 'violin@fox-red.liftReach=[-0.05,0.05,-0.2]' \
  --set 'violin@fox-red.liftReach=[0.05,0.05,-0.2]' 2>&1 | grep -E '^fox|instrument>body|lift upperArmL>body' > scratch/fox4-depth.txt
