#!/bin/zsh
# Runs the clearance sweep, the palm probe, and the elbow probe of the trombonist on q4 and q1
# of scan-tb7.sh and g3 of scan-tb6.sh.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
G='trombone@panda.gripShiftR=0.15,0,0.08'
V=("$G;trombone@panda.poleR=0,-1,0;trombone@panda.restPoleR=0,-1,0"
  "$G;trombone@panda.poleR=0,-1,-0.5;trombone@panda.restPoleR=0,-1,-0.5"
  "$G;trombone@panda.poleR=0.3,-1,-0.3;trombone@panda.restPoleR=0.3,-1,-0.3")
s=()
for x in $V; do
  s+=(--set "$x")
done
: > $out/scan-tb8.txt
for x in $V; do
  echo "$x" >> $out/scan-tb8.txt
  node $out/palm-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| R' >> $out/scan-tb8.txt
  node $out/elbow-probe.ts "$x" trombonist 2>&1 | grep -E '^\| trombonist \| (play|rest) \| R' >> $out/scan-tb8.txt
done
pnpm -s pose-depth trombonist "${s[@]}" > $out/depth-tb8.txt 2>&1
echo "depth exit $?"
