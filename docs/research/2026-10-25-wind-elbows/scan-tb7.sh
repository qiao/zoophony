#!/bin/zsh
# Runs the arm gate and the grip tool of the trombonist on right elbows down and forward with
# the right grip of g3 of scan-tb6.sh, for a smaller turn of the right paw on its forearm.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,0,0.08'
V=()
for p in '0,-1,-0.5' '0.2,-1,-0.6' '0.3,-1,-1' '0,-1,0' '0.1,-1,-0.3' '-0.2,-1,-0.5'; do
  V+=("$G;trombone@panda.poleR=$p;trombone@panda.restPoleR=$p")
done
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant q$i --set "$x")
  s+=(--set "$x")
done
pnpm -s arm-check trombonist --jobs 6 "${v[@]}" > $out/scan-tb7-gate.txt 2>&1
echo "gate exit $?"
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb7.txt 2>&1
echo "grip exit $?"
