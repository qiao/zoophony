#!/bin/zsh
# Runs the arm gate, the palm probe, and the slide reach on the right trombone grips of
# scan-tb5.sh that grasp in each set, with the curls of the hold.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=('trombone@panda.gripShiftR=0.15,0.02,0.08;trombone@panda.poleR=0.3,-1,-0.3;trombone@panda.restPoleR=0.3,-1,-0.3'
  'trombone@panda.gripShiftR=0.15,0.02,0.08;trombone@panda.poleR=0.5,-1,0;trombone@panda.restPoleR=0.5,-1,0'
  'trombone@panda.gripShiftR=0.15,0,0.08;trombone@panda.poleR=0.3,-1,-0.3;trombone@panda.restPoleR=0.3,-1,-0.3'
  'trombone@panda.gripShiftR=0.15,0,0.08;trombone@panda.poleR=0.5,-1,0;trombone@panda.restPoleR=0.5,-1,0')
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant g$i --set "$x")
  s+=(--set "$x")
done
pnpm -s arm-check trombonist --jobs 4 "${v[@]}" > $out/scan-tb6-gate.txt 2>&1
echo "gate exit $?"
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb6.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb6.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb6.txt
  pnpm -s hold-reach panda --instrument trombone --set "$x" 2>&1 | grep -E 'Slide' | tail -1 >> $out/scan-tb6.txt
done
