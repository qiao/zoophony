#!/bin/zsh
# Renders the trombonist at 3 times the size against main into scratch/cv3-trombonist/, and
# crops the right paw in the first position and the right arm at rest (pairs.py).
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
pnpm -s close-views trombonist scratch/cv3-trombonist --views front,left,right,back,35,-35 \
  --zoom 1.4 --scale 3 --moments first,seventh,rest,lower50 --base main
py=(uv run --no-project --with pillow python -I $out/pairs.py scratch/cv3-trombonist trombonist)
$py first $out/trombonist-right-paw-first.webp front:0,100,150 az-35:0,90,150 right:210,20,150 \
  az35:100,70,150 back:0,40,180
$py rest $out/trombonist-right-arm-rest.webp front:60,110,160 az35:120,100,160 right:190,90,170 \
  az-35:0,90,160
