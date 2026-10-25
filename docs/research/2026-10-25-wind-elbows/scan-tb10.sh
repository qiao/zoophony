#!/bin/zsh
# Runs the arm gate, the grip tool, and the palm probe of the trombonist on the side aim of the
# right paw with the grip and the elbows of g3 of scan-tb6.sh.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,0,0.08;trombone@panda.poleR=0.3,-1,-0.3;trombone@panda.restPoleR=0.3,-1,-0.3'
V=("$G;trombone@panda.aimSide=0" "$G;trombone@panda.aimSide=0.3" "$G;trombone@panda.aimSide=0.5"
  "$G;trombone@panda.aimSide=0;trombone@panda.aimAcross=0.5")
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant a$i --set "$x")
  s+=(--set "$x")
done
pnpm -s arm-check trombonist --jobs 4 "${v[@]}" > $out/scan-tb10-gate.txt 2>&1
echo "gate exit $?"
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb10.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb10.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \|' >> $out/scan-tb10.txt
done
