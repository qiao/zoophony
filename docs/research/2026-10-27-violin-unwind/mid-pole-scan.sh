#!/bin/zsh
# Idea 2: the left elbow swings in the middle of the move (liftPoleL of the three roles). The twist
# path of the left paw in one lift for each pole of the middle (path-probe.ts). Run from the root.
D=docs/research/2026-10-27-violin-unwind
for p in 'null' '[1,-0.6,-1]' '[-1,0,0]' '[0,1,-1]' '[-1,-1,1]'; do
  echo "liftPoleL $p"
  node $D/path-probe.ts --set "violin@rabbit.liftPoleL=$p;violin@fox-red.liftPoleL=$p;viola@cat.liftPoleL=$p" 2>&1 | tail -3
done
