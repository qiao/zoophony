#!/bin/zsh
# The last bow arm depths of the rabbit and the cat.
node docs/research/2026-10-25-string-angle/species-depth.ts rabbit --demo bach-bwv1050 --demo boulanger-matin --every 2 \
  --set 'violin@rabbit.frogHair=0.11' --set 'violin@rabbit.poleR=[2,-0.3,-1]' --set 'violin@rabbit.poleTipR=[1.3,-1,-1]' 2>&1 | grep -E '^rabbit|R>body|R>violin' > scratch/last-rabbit.txt
node docs/research/2026-10-25-string-angle/species-depth.ts cat --demo bach-bwv1048 --demo boulanger-matin --every 2 \
  --set 'viola@cat.frogHair=0.06' --set 'viola@cat.frogHair=0.09' --set 'viola@cat.poleR=[1.4,-0.5,-1]' 2>&1 | grep -E '^cat|R>viola|R>body' > scratch/last-cat.txt
