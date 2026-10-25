#!/bin/zsh
# Runs the arm gate of the trombonist with the right grip of t3 of scan-tb3.sh and other right
# elbows, because that grip twists the right paw about 169° on its forearm.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,-0.04,0.08'
V=()
for p in '0.5,-1,0' '0.3,-1,-0.3' '1,-1,0' '0.5,-1,0.3' '1,0,0' '1,-0.5,-0.5' '1,-0.5,0.5'; do
  V+=("$G;trombone@panda.poleR=$p;trombone@panda.restPoleR=$p")
done
v=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant p$i --set "$x")
done
pnpm -s arm-check trombonist --jobs 7 "${v[@]}" > $out/scan-tb4-gate.txt 2>&1
echo "gate exit $?"
s=()
for x in $V; do
  s+=(--set "$x")
done
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb4.txt 2>&1
echo "grip exit $?"
for x in $V; do
  echo "$x" >> $out/scan-tb4.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb4.txt
done
