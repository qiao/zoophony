#!/bin/zsh
# Scans the left elbow of the mouse oboe: the grip of each paw and the drop of the left elbow.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
poles=('-1,-1,0' '-0.5,-1,0' '-1,-1,-0.5' '-0.5,-1,-0.5' '-0.3,-1,0' '-1,-1,0.3' '-0.7,-1,0.2')
sets=()
for p in $poles; do
  sets+=(--set "oboe@mouse.poleL=$p;oboe@mouse.restPoleL=$p")
done
pnpm -s wind-grip oboist "${sets[@]}" > $out/scan-oe1.txt 2>&1
echo "grip exit $?"
for p in $poles; do
  echo "poleL $p" >> $out/scan-oe1.txt
  node $out/elbow-probe.ts "oboe@mouse.poleL=$p;oboe@mouse.restPoleL=$p" oboist 2>&1 | grep -E '^\| oboist \| (play|rest) \| L' >> $out/scan-oe1.txt
done
echo "elbow exit $?"
