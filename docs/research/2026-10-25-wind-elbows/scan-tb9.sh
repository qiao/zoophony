#!/bin/zsh
# Runs the arm gate, the grip tool, and the clearance sweep of the trombonist with the right
# elbow down in the play and the rest elbow of the hold, (1, -1, -1).
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,0,0.08'
V=("$G;trombone@panda.poleR=0,-1,0"
  "$G;trombone@panda.poleR=0,-1,-0.5"
  "$G;trombone@panda.poleR=0.3,-1,-0.3"
  "$G;trombone@panda.poleR=0,-1,0;trombone@panda.restPoleR=0.3,-1,-0.3")
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant k$i --set "$x")
  s+=(--set "$x")
done
pnpm -s arm-check trombonist --jobs 4 "${v[@]}" > $out/scan-tb9-gate.txt 2>&1
echo "gate exit $?"
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb9.txt 2>&1
echo "grip exit $?"
pnpm -s pose-depth trombonist "${s[@]}" > $out/depth-tb9.txt 2>&1
echo "depth exit $?"
