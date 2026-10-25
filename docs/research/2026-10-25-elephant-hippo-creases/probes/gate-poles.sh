#!/bin/zsh
# Runs the arm gate of the timpanist on elbow pole variants.
cd "${0:A:h}/../../../.."
pnpm arm-check timpanist --jobs 4 --base main \
  --variant p06 --set 'timpani.poleL=-0.6,-1,0.2;timpani.poleR=0.6,-1,0.2' \
  --variant p08 --set 'timpani.poleL=-0.8,-1,0.2;timpani.poleR=0.8,-1,0.2' \
  --variant p08z0 --set 'timpani.poleL=-0.8,-1,0;timpani.poleR=0.8,-1,0' \
  --variant p10 --set 'timpani.poleL=-1,-1,0.2;timpani.poleR=1,-1,0.2' \
  "$@" > docs/research/2026-10-25-elephant-hippo-creases/gate-poles.txt 2>&1
