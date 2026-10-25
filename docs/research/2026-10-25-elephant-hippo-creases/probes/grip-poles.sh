#!/bin/zsh
# Mallet angles of the timpanist: the tree (pole x 0.8) and the pole x 0.45 of main.
cd "${0:A:h}/../../../.."
out=docs/research/2026-10-25-elephant-hippo-creases/mallets.txt
: > $out
for demo in beethoven-9 beethoven-1; do
  echo "== $demo" >> $out
  DEMO=$demo node docs/research/2026-10-19-elephant-grip/grip.ts \
    --set 'timpani.poleL=-0.45,-1,0.2;timpani.poleR=0.45,-1,0.2' >> $out 2>&1
done
