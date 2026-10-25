#!/bin/zsh
# The left elbow of the cat in the moves: depths and gate.
V1='viola@cat.liftPoleL=[-0.5,-1,-0.4]'
V2='viola@cat.liftPoleL=[-0.6,-1,-0.5]'
V3='viola@cat.liftPoleL=null'
V4='viola@cat.liftPoleL=[-0.45,-1,-0.6]'
node docs/research/2026-10-25-string-angle/species-depth.ts cat --demo bach-bwv1047 --demo mozart-k191 --demo boulanger-matin --every 4 \
  --set "$V1" --set "$V2" --set "$V3" --set "$V4" 2>&1 | grep -E '^cat|lift|lower' > scratch/cd2-depth.txt
pnpm -s arm-check violist --jobs 8 --variant base --set '' --variant v1 --set "$V1" --variant v2 --set "$V2" --variant v3 --set "$V3" --variant v4 --set "$V4" > scratch/cd2-gate.txt 2>&1
