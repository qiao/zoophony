#!/bin/zsh
# Idea 3: the play elbow toward the middle and the tilt of the left paw over the neck. For each pole
# and tilt of the three roles: the play studio twist of the left paw from the bind, the wrist bend
# that the viewer sees, and the height of the elbow in head heights (the shoulders: rabbit 2.65,
# red fox 3.00, cat 2.67). Run from the root of the tree.
G=docs/research/2026-10-27-violin-carry/carry-geo.ts
for t in 0 0.26 0.52; do
  for pole in '[-0.5,-1,-0.5]' '[0.5,-1,-1]' '[1,-1,-1]' '[1,-0.75,-1]' '[1,-0.5,-1]' '[1,0,-1]'; do
    printf 'tilt %s %-15s' $t "$pole"
    node $G --steps 1.5 --joints \
      --set "violin@rabbit.poleL=$pole;violin@fox-red.poleL=$pole;viola@cat.poleL=$pole;violin@rabbit.tiltL=$t;violin@fox-red.tiltL=$t;viola@cat.tiltL=$t" 2>&1 |
      awk '/^== /{role=$2} /shoulder/{split($6,a,","); eh=a[2]} /^1.50/{printf " %s %5s bend %-3s elbow y %s;", substr(role,1,3), $3, $NF, eh}'
    echo
  done
done
