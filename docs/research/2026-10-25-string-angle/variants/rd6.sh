#!/bin/zsh
# The free hair at the frog of the rabbit at 45 and 50 degrees.
P='violin@rabbit.pluckPlace=0;violin@rabbit.pizzicatoTip=[0.3,0.5,1]'
Q20='violin@rabbit.playTurn=[0.02181,-0.17348,-0.03778,0.98387]'
node docs/research/2026-10-25-string-angle/species-depth.ts rabbit --demo boulanger-matin --demo brahms-2 --every 2 \
  --set "$P;violin@rabbit.frogHair=0.09" \
  --set "$P;violin@rabbit.frogHair=0.11" \
  --set "$P;$Q20;violin@rabbit.frogHair=0.09" 2>&1 | grep -E '^rabbit|R>body|>violin'
