#!/bin/zsh
# Gives the deepest right upper arm corners of the elephant at the ready pose sample for each
# right elbow pole of the timpani hold. Run it from the root of the tree.
for p in 0.3,-1,0.2 0.8,-1,0.2 1.5,-1,0.2 3,-1,0.2 1,-0.3,0.2 1,-1,1 1,-1,-0.5; do
  echo "poleR $p"
  pnpm pose-depth timpanist --where upperArmR beethoven-8-4:565.34 --set "timpani.poleR=$p" \
    2>&1 | grep -A2 'joint forearmR\|in body'
done
