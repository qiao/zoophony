#!/bin/sh
# The rest twist of the left paw (the studio twist from the bind of the mesh) for 12 directions of
# the rest elbow, with the play twist of each role. Run from the root of the tree.
for pole in '[-1,-1,0]' '[-1,-1,1]' '[-1,-1,-1]' '[0,-1,1]' '[0,-1,-1]' '[1,-1,0]' '[1,-1,1]' \
  '[-1,0,0]' '[-1,1,0]' '[0,0,1]' '[0,1,1]' '[-1,0,-1]'; do
  printf 'elbow %s:' "$pole"
  node docs/research/2026-10-27-violin-carry/carry-geo.ts --steps 0,1.5 --brief \
    --set "violin@rabbit.restPoleL=$pole;violin@fox-red.restPoleL=$pole;viola@cat.restPoleL=$pole" 2>&1 |
    awk '/restTwist/ { printf " %s rest %s play %s;", $1, $9, $11 }'
  echo
done
