#!/bin/zsh
# More bow vias of the red fox with the middle turn of the violin.
Q25='0.02344,-0.21623,-0.03679,0.97537'
F="violin@fox-red.playTurn=$Q25;violin@fox-red.reachL=0.14"
T='violin@fox-red.liftTurn={"axis":[-0.3,1,-0.6],"top":[0,0,1]}'
H='violin@fox-red.restBow.via.hair=[0,0,1]'
pnpm -s arm-check fox-violinist --jobs 6 \
  --variant w1 --set "$F;$T;$H;violin@fox-red.restBow.via.reach=[0.1,0.2,-0.4]" \
  --variant w2 --set "$F;$T;$H;violin@fox-red.restBow.via.reach=[0.2,0.1,-0.4]" \
  --variant w3 --set "$F;$T;$H;violin@fox-red.restBow.via.reach=[0.2,0.3,-0.4]" \
  --variant w4 --set "$F;$T;$H;violin@fox-red.restBow.via.tip=[-0.5,0.3,-1]" \
  --variant w5 --set "$F;$T;$H;violin@fox-red.restBow.via.tip=[-0.1,0.3,-1]" \
  --variant w6 --set "$F;$T;violin@fox-red.restBow.via.hair=[0,0.3,1]"
