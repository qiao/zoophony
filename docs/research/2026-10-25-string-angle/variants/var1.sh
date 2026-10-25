#!/bin/zsh
# The first arm gate variants of the angle round.
Q25='0.02344,-0.21623,-0.03679,0.97537'
Q20='0.02181,-0.17348,-0.03778,0.98387'
C25='0,-0.21644,0,0.9763'
pnpm -s arm-check violinist fox-violinist violist --jobs 6 \
  --variant r45 --set "violin@rabbit.playTurn=$Q25;violin@rabbit.reachL=0.27;violin@rabbit.playShift=-0.054,-0.12,0.205" \
  --variant r45b --set "violin@rabbit.playTurn=$Q25;violin@rabbit.reachL=0.27" \
  --variant r50 --set "violin@rabbit.playTurn=$Q20;violin@rabbit.reachL=0.27" \
  --variant f45 --set "violin@fox-red.playTurn=$Q25;violin@fox-red.reachL=0.14" \
  --variant c45 --set "cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405"
