#!/bin/zsh
# Sweeps the elbow poles of the timpani hold: the depth of each arm part in the body.
cd "${0:A:h}/../../../.."
pnpm pose-depth timpanist \
  --set 'timpani.poleL=-0.6,-1,0.2;timpani.poleR=0.6,-1,0.2' \
  --set 'timpani.poleL=-0.8,-1,0.2;timpani.poleR=0.8,-1,0.2' \
  --set 'timpani.poleL=-1,-1,0.2;timpani.poleR=1,-1,0.2' \
  "$@"
