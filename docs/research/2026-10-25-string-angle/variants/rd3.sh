#!/bin/zsh
# The rabbit at 45 and 50 degrees with the pluck at the end of the fingerboard.
Q20='0.02181,-0.17348,-0.03778,0.98387'
P='violin@rabbit.pluckPlace=0;violin@rabbit.pizzicatoTip=[0.3,0.5,1]'
node docs/research/2026-10-25-string-angle/species-depth.ts rabbit --demo boulanger-matin --demo brahms-2 --every 2 \
  --set "$P" \
  --set "$P;violin@rabbit.playTurn=$Q20" \
  --set "$P;violin@rabbit.playTurn=$Q20;violin@rabbit.playShift=[-0.054,-0.09,0.165]" 2>&1 | grep -E '^rabbit|R>|in body|>body'
