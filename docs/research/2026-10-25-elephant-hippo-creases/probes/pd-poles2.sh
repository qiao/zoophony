#!/bin/zsh
# Sweeps the elbow poles of the timpani hold on one demo: the out share and the back share.
cd "${0:A:h}/../../../.."
pnpm pose-depth timpanist --demo beethoven-1 \
  --set 'timpani.poleL=-0.8,-1,0;timpani.poleR=0.8,-1,0' \
  --set 'timpani.poleL=-0.8,-1,0.5;timpani.poleR=0.8,-1,0.5' \
  --set 'timpani.poleL=-0.8,-1,-0.3;timpani.poleR=0.8,-1,-0.3' \
  --set 'timpani.poleL=-0.6,-0.6,0.2;timpani.poleR=0.6,-0.6,0.2' \
  --set 'timpani.poleL=-1.2,-1,0.2;timpani.poleR=1.2,-1,0.2' \
  "$@"
