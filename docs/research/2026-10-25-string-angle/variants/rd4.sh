#!/bin/zsh
# The bow arm of the rabbit at 45 degrees.
P='violin@rabbit.pluckPlace=0;violin@rabbit.pizzicatoTip=[0.3,0.5,1]'
node docs/research/2026-10-25-string-angle/species-depth.ts rabbit --demo boulanger-matin --demo brahms-2 --every 2 \
  --set "$P;violin@rabbit.playShift=[-0.084,-0.09,0.185]" \
  --set "$P;violin@rabbit.reach=0.35" \
  --set "$P;violin@rabbit.poleR=[1.8,-0.6,-1]" \
  --set "$P;violin@rabbit.poleTipR=[1.5,-1,-1]" \
  --set "$P;violin@rabbit.slant=-0.2" 2>&1 | grep -E '^rabbit|R>body|instrument>body|play.*L>body'
