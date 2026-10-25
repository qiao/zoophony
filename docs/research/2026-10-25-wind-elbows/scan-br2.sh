#!/bin/zsh
# Measures the grips and runs the arm gate of the bassoonist on the rest variants of
# scan-br1.sh that the right arm reaches.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=('bassoon@beaver.rest=holdTurn(-5,-5);bassoon@beaver.restShift=0,-0.05,-0.15'
  'bassoon@beaver.rest=holdTurn(-5,-5);bassoon@beaver.restShift=0.05,-0.05,-0.15'
  'bassoon@beaver.rest=holdTurn(-5,-5);bassoon@beaver.restShift=0,-0.05,-0.2'
  'bassoon@beaver.rest=holdTurn(-10,-5);bassoon@beaver.restShift=0,-0.05,-0.2'
  'bassoon@beaver.rest=holdTurn(0,0);bassoon@beaver.restShift=0,-0.05,-0.15')
s=()
v=()
i=0
for x in $V; do
  i=$((i + 1))
  s+=(--set "$x")
  v+=(--variant b$i --set "$x")
done
pnpm -s wind-grip bassoonist "${s[@]}" > $out/scan-br2.txt 2>&1
echo "grip exit $?"
pnpm -s arm-check bassoonist --jobs 5 "${v[@]}" > $out/scan-br2-gate.txt 2>&1
echo "gate exit $?"
