#!/bin/zsh
# Scans the right trombone grip with the right elbow down (p1 and p2 of scan-tb4.sh): the grip
# toward the brace and the curl of the right fingers, so that the finger tips close on it.
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
V=()
for p in '0.5,-1,0' '0.3,-1,-0.3'; do
  for g in '0.15,0,0.08' '0.15,-0.02,0.06' '0.15,0.02,0.08' '0.15,-0.04,0.06'; do
    for c in '1.9199,1.9199' '1.5708,2.1817'; do
      V+=("trombone@panda.gripShiftR=$g;trombone@panda.poleR=$p;trombone@panda.restPoleR=$p;trombone@panda.gripCurl=$c")
    done
  done
done
s=()
for x in $V; do
  s+=(--set "$x")
done
pnpm -s wind-grip trombonist "${s[@]}" > $out/scan-tb5.txt 2>&1
echo "grip exit $?"
