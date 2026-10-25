#!/bin/zsh
# The bow arm of the cat at 45 degrees.
C25='0,-0.21644,0,0.9763'
F="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405"
pnpm -s arm-check violist --jobs 8 \
  --variant p1 --set "$F;viola@cat.poleR=[1.2,-0.8,-1]" \
  --variant p2 --set "$F;viola@cat.poleR=[1.5,-0.5,-0.7]" \
  --variant p3 --set "$F;viola@cat.poleR=[1,-0.5,-1.3]" \
  --variant p4 --set "$F;viola@cat.reach=0.35" \
  --variant p5 --set "$F;viola@cat.reach=0.7" \
  --variant p6 --set "$F;viola@cat.slant=-0.2" \
  --variant p7 --set "$F;viola@cat.slant=-0.5" \
  --variant p8 --set "$F;viola@cat.poleR=[1.2,-0.2,-1]"
