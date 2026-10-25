#!/bin/zsh
# The bow via of the red fox with the middle turn of the violin.
Q25='0.02344,-0.21623,-0.03679,0.97537'
F="violin@fox-red.playTurn=$Q25;violin@fox-red.reachL=0.14"
T='violin@fox-red.liftTurn={"axis":[-0.3,1,-0.6],"top":[0,0,1]}'
pnpm -s arm-check fox-violinist --jobs 6 \
  --variant v1 --set "$F;$T;violin@fox-red.restBow.via.hair=[0,0,1]" \
  --variant v2 --set "$F;$T;violin@fox-red.restBow.via.hair=[0,0,1];violin@fox-red.restBow.via.reach=[0.2,0.2,-0.3]" \
  --variant v3 --set "$F;$T;violin@fox-red.restBow.via.reach=[0.3,0.3,-0.4]" \
  --variant v4 --set "$F;$T;violin@fox-red.restBow.via.tip=[-0.3,0.5,-1]" \
  --variant v5 --set "$F;$T;violin@fox-red.restBow.via.hair=[0,0,1];violin@fox-red.restBow.via.reach=[0,0.2,-0.4]"
