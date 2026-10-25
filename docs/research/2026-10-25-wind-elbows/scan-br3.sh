#!/bin/zsh
# Runs the grip tool, the arm gate, and the clearance sweep of the bassoonist on the rests b3
# and b5 of scan-br2.sh, alone and with the left elbows p3 and p5 of scan-gate9.sh of
# docs/research/2026-10-25-wind-palms/, for a smaller twist of the left forearm.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
B3='bassoon@beaver.rest=holdTurn(-5,-5);bassoon@beaver.restShift=0,-0.05,-0.2'
B5='bassoon@beaver.rest=holdTurn(0,0);bassoon@beaver.restShift=0,-0.05,-0.15'
V=("$B3" "$B5"
  "$B3;bassoon@beaver.poleL=-0.5,-1,0.2;bassoon@beaver.restPoleL=-0.5,-1,0.2"
  "$B3;bassoon@beaver.poleL=-0.3,-1,-0.6;bassoon@beaver.restPoleL=-0.3,-1,-0.6"
  "$B5;bassoon@beaver.poleL=-0.5,-1,0.2;bassoon@beaver.restPoleL=-0.5,-1,0.2")
v=()
s=()
i=0
for x in $V; do
  i=$((i + 1))
  v+=(--variant c$i --set "$x")
  s+=(--set "$x")
done
pnpm -s wind-grip bassoonist "${s[@]}" > $out/scan-br3.txt 2>&1
echo "grip exit $?"
pnpm -s arm-check bassoonist --jobs 5 "${v[@]}" > $out/scan-br3-gate.txt 2>&1
echo "gate exit $?"
pnpm -s pose-depth bassoonist "${s[@]}" > $out/depth-br3.txt 2>&1
echo "depth exit $?"
