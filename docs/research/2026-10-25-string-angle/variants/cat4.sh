#!/bin/zsh
# The left paw of the cat in the lift at 45 degrees.
C25='0,-0.21644,0,0.9763'
F="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405;viola@cat.slant=-0.2"
pnpm -s arm-check violist --jobs 8 \
  --variant l1 --set "$F;viola@cat.liftPoleL=[0,-1,-0.5]" \
  --variant l2 --set "$F;viola@cat.liftPoleL=[-0.5,-1,-0.5]" \
  --variant l3 --set "$F;viola@cat.liftTiltL=0.6" \
  --variant l4 --set "$F;viola@cat.liftTiltL=1" \
  --variant l5 --set "$F;viola@cat.liftReach=[0,0.25,-0.3]" \
  --variant l6 --set "$F;viola@cat.liftReach=[-0.05,0.25,-0.2]" \
  --variant l7 --set "$F;viola@cat.slant=0" \
  --variant l8 --set "$F;viola@cat.slant=-0.1"
