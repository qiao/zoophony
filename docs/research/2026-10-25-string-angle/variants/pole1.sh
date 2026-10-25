#!/bin/zsh
# The left elbow under the instrument: the arm gate of each pole.
source scratch/cand.sh
pnpm -s arm-check violinist --jobs 8 \
  --variant r0 --set "$RABBIT" \
  --variant r1 --set "$RABBIT;violin@rabbit.poleL=[-0.5,-1,-0.5]" \
  --variant r2 --set "$RABBIT;violin@rabbit.poleL=[0,-1,-0.5]" \
  --variant r3 --set "$RABBIT;violin@rabbit.poleL=[0.5,-1,-0.5]" > scratch/pole1-r.txt 2>&1
pnpm -s arm-check fox-violinist --jobs 8 \
  --variant f0 --set "$FOX" \
  --variant f1 --set "$FOX;violin@fox-red.poleL=[0,-1,-1]" \
  --variant f2 --set "$FOX;violin@fox-red.poleL=[0.5,-1,-1]" > scratch/pole1-f.txt 2>&1
pnpm -s arm-check violist --jobs 8 \
  --variant c0 --set "$CAT" \
  --variant c1 --set "$CAT;viola@cat.poleL=[0,-1,-0.75]" \
  --variant c2 --set "$CAT;viola@cat.poleL=[0.5,-1,-0.5]" > scratch/pole1-c.txt 2>&1
