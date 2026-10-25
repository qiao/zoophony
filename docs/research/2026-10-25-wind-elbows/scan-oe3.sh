#!/bin/zsh
# Runs the arm gate of the oboist with the play elbow down and other rest elbows.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
v=()
i=0
for p in '-0.5,-1,0' '-0.3,-1,0' '-0.5,-1,-0.5'; do
  for r in '-1,-0.3,0' '-1,-1,-0.5' '-1,-0.5,-0.5'; do
    i=$((i + 1))
    v+=(--variant r$i --set "oboe@mouse.poleL=$p;oboe@mouse.restPoleL=$r")
  done
done
pnpm -s arm-check oboist --jobs 8 "${v[@]}" > $out/scan-oe3.txt 2>&1
echo "exit $?"
