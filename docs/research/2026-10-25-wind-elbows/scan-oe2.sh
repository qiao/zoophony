#!/bin/zsh
# Runs the arm gate of the oboist on the left elbow variants of scan-oe1.sh.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
v=()
i=0
for p in '-1,-1,0' '-0.5,-1,0' '-1,-1,-0.5' '-0.5,-1,-0.5' '-0.3,-1,0' '-0.7,-1,0.2'; do
  i=$((i + 1))
  v+=(--variant e$i --set "oboe@mouse.poleL=$p;oboe@mouse.restPoleL=$p")
done
pnpm -s arm-check oboist --jobs 6 "${v[@]}" > $out/scan-oe2.txt 2>&1
echo "exit $?"
