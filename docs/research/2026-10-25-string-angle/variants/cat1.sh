#!/bin/zsh
# The lift of the cat with the smaller viola at 45 degrees.
C25='0,-0.21644,0,0.9763'
F="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405"
pnpm -s arm-check violist --jobs 6 \
  --variant c0 --set "$F" \
  --variant c1 --set "$F;viola@cat.liftReach=[0,0.25,-0.1]" \
  --variant c2 --set "$F;viola@cat.liftReach=[0,0.2,-0.2]" \
  --variant c3 --set "$F;viola@cat.liftReach=[0,0.3,-0.2]" \
  --variant c4 --set "$F;viola@cat.liftTurn={\"axis\":[-0.3,1,-0.4],\"top\":[0,0,1]}" \
  --variant c5 --set "$F;viola@cat.liftTurn={\"axis\":[-0.3,1,-0.8],\"top\":[0,0,1]}" \
  --variant c6 --set "$F;viola@cat.restBow.via.reach=[0.45,0.4,-0.3]" \
  --variant c7 --set "$F;viola@cat.restBow.via.reach=[0.35,0.4,-0.4]"
