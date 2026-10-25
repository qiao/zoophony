#!/bin/zsh
# Gives the deepest right upper arm corner of the rhino at the play and rest samples of section 2
# for each right shoulder turn and right elbow pole of the table of section 4. Run it from the
# root of the tree.
P=docs/research/2026-10-25-thick-arm-depth/probes/depth-cause.ts
for v in 0.524:1,-0.5,-0.5 0.785:1,-0.5,0 0.785:1,-0.25,-0.25 0.785:1,-0.2,-0.25 0.785:1,0,-0.5; do
  r=${v%%:*}; p=${v#*:}
  h="tuba@rhino.reach=$r;tuba@rhino.poleR=$p;tuba@rhino.restPoleR=$p"
  echo "reach $r, poles $p"
  node $P tubist R brahms-2:340.38 0 "$h" 2>&1 | grep 'deepest cm'
  node $P tubist R brahms-2:rest 0 "$h" 2>&1 | grep 'deepest cm'
done
