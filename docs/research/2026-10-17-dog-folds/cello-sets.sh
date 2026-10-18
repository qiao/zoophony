#!/bin/zsh
# Prints the hold changes of the cello of the dog for each place: <name> <x> <z> <back> <left> <yaw>
# (cello-place.ts of docs/research/2026-10-17-dog-mesh/). Usage, from the root of the tree:
# docs/research/2026-10-17-dog-folds/cello-sets.sh <name>:<x>:<z>:<back>:<left>:<yaw>...
for spec in "$@"; do
  IFS=: read name x z back left yaw <<< "$spec"
  out=$(node docs/research/2026-10-17-dog-mesh/cello-place.ts $x $z $back $left $yaw)
  shift=$(echo "$out" | sed -n 's/^playShift: \[\(.*\)\]/\1/p' | tr -d ' ')
  turn=$(echo "$out" | sed -n 's/^playTurn: \[\(.*\)\]/\1/p' | tr -d ' ')
  echo "$name cello@dog.playShift=$shift;cello@dog.playTurn=$turn"
done
