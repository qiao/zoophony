#!/bin/zsh
# The left elbow of the cat in the middle of the lift at 45 degrees.
C25='0,-0.21644,0,0.9763'
F="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405;viola@cat.slant=0"
pnpm -s arm-check violist --jobs 8 \
  --variant m1 --set "$F;viola@cat.liftPoleL=[0,-1,-0.5]" \
  --variant m2 --set "$F;viola@cat.liftPoleL=[-0.3,-1,-0.5]" \
  --variant m3 --set "$F;viola@cat.liftPoleL=[0,-1,-0.3]" \
  --variant m4 --set "$F;viola@cat.liftPoleL=[-0.2,-1,-0.2]" \
  --variant m5 --set "$F;viola@cat.liftPoleL=[0.2,-1,-0.5]" \
  --variant m6 --set "$F;viola@cat.liftPoleL=[-0.6,-1,0]"
