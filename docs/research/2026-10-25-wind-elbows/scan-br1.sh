#!/bin/zsh
# Scans the rest of the beaver bassoon: the rest turn (the lower end back toward the body) and
# the rest move, for the spare reach of each paw at rest.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
s=()
for t in 'holdTurn(10,-5)' 'holdTurn(5,-5)' 'holdTurn(0,-5)' 'holdTurn(-5,-5)' 'holdTurn(0,0)'; do
  for m in '0,-0.05,-0.2' '0,-0.05,-0.15' '0,-0.1,-0.15' '0.05,-0.05,-0.15'; do
    s+=(--set "bassoon@beaver.rest=$t;bassoon@beaver.restShift=$m")
  done
done
pnpm -s hold-reach beaver --instrument bassoon "${s[@]}" > $out/scan-br1.txt 2>&1
echo "exit $?"
