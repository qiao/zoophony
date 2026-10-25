#!/bin/zsh
# The left elbow part of the way under the instrument.
source scratch/cand.sh
pnpm -s arm-check fox-violinist --jobs 8 \
  --variant f3 --set "$FOX;violin@fox-red.poleL=[-0.25,-1,-1]" \
  --variant f4 --set "$FOX;violin@fox-red.poleL=[-0.5,-1,-1.2]" > scratch/pole2-f.txt 2>&1
pnpm -s arm-check violist --jobs 8 \
  --variant c3 --set "$CAT;viola@cat.poleL=[-0.25,-1,-0.75]" \
  --variant c4 --set "$CAT;viola@cat.poleL=[-0.5,-1,-0.75]" > scratch/pole2-c.txt 2>&1
node docs/research/2026-10-25-string-angle/angle-probe.ts --every 20 --species fox-red \
  --set "$FOX;violin@fox-red.poleL=[-0.25,-1,-1]" --set "$FOX;violin@fox-red.poleL=[-0.5,-1,-1.2]" > scratch/pole2-a.txt 2>&1
node docs/research/2026-10-25-string-angle/angle-probe.ts --every 20 --species cat \
  --set "$CAT;viola@cat.poleL=[-0.25,-1,-0.75]" >> scratch/pole2-a.txt 2>&1
