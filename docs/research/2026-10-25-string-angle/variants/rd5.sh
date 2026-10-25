#!/bin/zsh
# The pizzicato arm of the rabbit at 50 degrees.
B='violin@rabbit.pluckPlace=0;violin@rabbit.pizzicatoTip=[0.3,0.5,1];violin@rabbit.playTurn=[0.02181,-0.17348,-0.03778,0.98387]'
node docs/research/2026-10-25-string-angle/species-depth.ts rabbit --demo boulanger-matin --demo brahms-2 --every 2 \
  --set "$B;violin@rabbit.polePizzicato=[1.5,-0.3,-0.5]" \
  --set "$B;violin@rabbit.polePizzicato=[1,-0.2,-1]" \
  --set "$B;violin@rabbit.pluckSide=-0.03" \
  --set "$B;violin@rabbit.pizzicatoTip=[0.5,0.5,1]" 2>&1 | grep -E '^rabbit|R>body'
