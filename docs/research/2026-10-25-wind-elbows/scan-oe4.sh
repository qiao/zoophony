#!/bin/zsh
# Runs the clearance sweep and the arm gate of the oboist on left elbows near (-0.5, -1, 0).
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=('oboe@mouse.poleL=-0.5,-1,0'
  'oboe@mouse.poleL=-0.5,-1,0;oboe@mouse.reachL=0.1745'
  'oboe@mouse.poleL=-0.6,-1,-0.2'
  'oboe@mouse.poleL=-0.5,-1,0;oboe@mouse.restPoleL=-1,-0.6,0')
s=()
v=()
i=0
for x in $V; do
  i=$((i + 1))
  s+=(--set "$x")
  v+=(--variant d$i --set "$x")
done
pnpm -s pose-depth oboist "${s[@]}" > $out/depth-oe4.txt 2>&1
echo "depth exit $?"
pnpm -s arm-check oboist --jobs 4 "${v[@]}" > $out/scan-oe4.txt 2>&1
echo "gate exit $?"
