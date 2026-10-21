#!/bin/bash
# Runs the arm gate of the tubist for the variants of the tuba hold of the rhino in arm-twist.txt.
# Part 3 edits the left grip of tuba() in src/models/instruments/brass.ts, so run it on a scratch
# copy of the tree. Usage, from the root of the tree: bash docs/research/2026-10-21-mesh-rhino/arm_scan.sh
P="rhino.tubaPipe=0.25,0.1;tuba@rhino.reach=30deg;tuba@rhino.play=holdTurn(0,25);tuba@rhino.poleR=1,-0.5,-0.5"
gate() {
  pnpm -s arm-check tubist --set "$1" > /tmp/arm-scan.log 2>&1
  echo "[$2] $(grep -E '^\| tubist \| L \| [0-9]' /tmp/arm-scan.log) $(grep -E '^\| tubist \| L \| twist' /tmp/arm-scan.log | cut -d'|' -f5)"
}
echo 'Part 1'
for v in "reachL=40deg;tuba@rhino.poleL=-1,-1,-1" "reachL=40deg;tuba@rhino.poleL=-1,-1,-0.5" \
  "reachL=40deg;tuba@rhino.poleL=-0.5,-1,-1" "reachL=40deg;tuba@rhino.poleL=-1,-0.5,-1" \
  "reachL=30deg;tuba@rhino.poleL=-1,-0.5,-0.5" "reachL=20deg;tuba@rhino.poleL=-1,-0.5,-0.5" \
  "reachL=30deg;tuba@rhino.poleL=-1,-1,-1"; do
  gate "$P;tuba@rhino.$v" "$v"
done
echo 'Part 2'
Q="$P;tuba@rhino.reachL=40deg;tuba@rhino.poleL=-1,-0.5,-0.5"
POLES="tuba@rhino.restPoleL=-1,-0.5,-0.5;tuba@rhino.restPoleR=1,-0.5,-0.5"
for v in "rest=holdTurn(0,25)" "rest=holdTurn(5,20)" "rest=holdTurn(5,20);$POLES" \
  "rest=holdTurn(5,20);tuba@rhino.restShift=0,-0.05,-0.03;$POLES"; do
  gate "$Q;tuba@rhino.$v" "$v"
done
echo 'Part 3'
R="$Q;tuba@rhino.rest=holdTurn(5,20);$POLES"
for g in "-0.24, 0.4, 0.06" "-0.2, 0.4, 0.04" "-0.22, 0.4, 0.06" "-0.26, 0.4, 0.02"; do
  perl -0pi -e "s/palmL: at\(\[[^\]]*\]\)/palmL: at([$g])/" src/models/instruments/brass.ts
  gate "$R" "$g"
done
