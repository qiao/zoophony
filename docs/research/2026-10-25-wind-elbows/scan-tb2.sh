#!/bin/zsh
# Scans the right trombone grip near the far side of the brace with the side aim and the forward
# turn of the right shoulder, for the reach of the slide with the palm to the side.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=()
for g in '0.05,-0.04,0.06' '0.05,-0.06,0.08' '0.1,-0.04,0.08'; do
  for a in 0.5 0.8 1; do
    V+=("trombone@panda.gripShiftR=$g;trombone@panda.aimSide=$a")
  done
done
V+=('trombone@panda.gripShiftR=0.05,-0.04,0.08;trombone@panda.reach=0.96')
s=()
for x in $V; do
  s+=(--set "$x")
done
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb2.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb2.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb2.txt
  pnpm -s hold-reach panda --instrument trombone --set "$x" 2>&1 | grep -E 'Slide' | tail -1 >> $out/scan-tb2.txt
done
echo "probe exit $?"
