#!/bin/zsh
# The share of each change of the cat hold in the swing of the paws in the lift.
C25='0,-0.21644,0,0.9763'
pnpm -s arm-check violist --jobs 6 \
  --variant s --set "cat.violaScale=0.87" \
  --variant t --set "viola@cat.playTurn=$C25" \
  --variant r --set "viola@cat.reachL=0.26" \
  --variant st --set "cat.violaScale=0.87;viola@cat.playTurn=$C25" \
  --variant str --set "cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26"
