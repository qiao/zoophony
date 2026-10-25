#!/bin/zsh
# Runs the arm gate, the grip tool, and the slide reach of g3 of scan-tb6.sh with a larger
# forward turn of the right shoulder, to win back the slide reach of the far grip.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,0,0.08;trombone@panda.poleR=0.3,-1,-0.3;trombone@panda.restPoleR=0.3,-1,-0.3'
V=("$G" "$G;trombone@panda.reach=0.96" "$G;trombone@panda.reach=1.05")
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant s$i --set "$x")
  s+=(--set "$x")
done
pnpm -s arm-check trombonist --jobs 3 "${v[@]}" > $out/scan-tb11-gate.txt 2>&1
echo "gate exit $?"
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb11.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb11.txt
  pnpm -s hold-reach panda --instrument trombone --set "$x" 2>&1 | grep -E 'Slide' | tail -1 >> $out/scan-tb11.txt
done
