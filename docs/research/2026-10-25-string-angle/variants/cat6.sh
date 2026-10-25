#!/bin/zsh
# The left elbow and roll of the cat in the middle of the lift at 45 degrees.
C25='0,-0.21644,0,0.9763'
F="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405;viola@cat.slant=0"
pnpm -s arm-check violist --jobs 8 \
  --variant n1 --set "$F;viola@cat.liftPoleL=[-0.15,-1,-0.5]" \
  --variant n2 --set "$F;viola@cat.liftPoleL=[-0.3,-1,-0.5];viola@cat.liftTiltL=0.9" \
  --variant n3 --set "$F;viola@cat.liftPoleL=[-0.3,-1,-0.5];viola@cat.liftTiltL=0.65" \
  --variant n4 --set "$F;viola@cat.liftPoleL=[-0.15,-1,-0.5];viola@cat.liftReach=[0,0.25,-0.25]" \
  --variant n5 --set "$F;viola@cat.liftPoleL=[-0.15,-1,-0.7]" \
  --variant n6 --set "$F;viola@cat.liftPoleL=[-0.3,-1,-0.8]"
