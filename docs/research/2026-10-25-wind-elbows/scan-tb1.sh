#!/bin/zsh
# Scans the right trombone grip across the slide brace toward its far side, so that the palm of
# the panda faces the player: the grasp, the palm and the thumb, and the reach of the slide.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=()
for g in '0.05,-0.04,0' '0.05,-0.04,0.04' '0.05,-0.04,0.08' '0.05,0,0.08' '0.05,0.02,0.1' '0,-0.04,0.08'; do
  V+=("trombone@panda.gripShiftR=$g")
done
s=()
for x in $V; do
  s+=(--set "$x")
done
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb1.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb1.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb1.txt
  pnpm -s hold-reach panda --instrument trombone --set "$x" 2>&1 | grep -i -E 'slide' >> $out/scan-tb1.txt
done
echo "probe exit $?"
