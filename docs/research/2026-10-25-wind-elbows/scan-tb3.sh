#!/bin/zsh
# Measures the grip, the palm, the thumb, and the slide reach, and runs the arm gate, of the
# right trombone grips at the side of the brace away from the audience.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=('trombone@panda.gripShiftR=0.1,-0.04,0.08'
  'trombone@panda.gripShiftR=0.1,-0.04,0.1'
  'trombone@panda.gripShiftR=0.15,-0.04,0.08'
  'trombone@panda.gripShiftR=0.1,-0.02,0.07'
  'trombone@panda.gripShiftR=0.1,-0.04,0.08;trombone@panda.reach=0.96')
s=()
v=()
i=0
for x in $V; do
  i=$((i + 1))
  s+=(--set "$x")
  v+=(--variant t$i --set "$x")
done
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb3.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb3.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb3.txt
  pnpm -s hold-reach panda --instrument trombone --set "$x" 2>&1 | grep -E 'Slide' | tail -1 >> $out/scan-tb3.txt
done
pnpm -s arm-check trombonist --jobs 5 "${v[@]}" > $out/scan-tb3-gate.txt 2>&1
echo "gate exit $?"
