#!/bin/zsh
# The middle turn of the red fox lift at the new angle.
Q25='0.02344,-0.21623,-0.03679,0.97537'
F="violin@fox-red.playTurn=$Q25;violin@fox-red.reachL=0.14"
T='violin@fox-red.liftTurn={"axis":[-0.3,1,-0.6],"top":[0,0,1]}'
T2='violin@fox-red.liftTurn={"axis":[-0.3,1,-0.3],"top":[0,0,1]}'
T3='violin@fox-red.liftTurn={"axis":[0,1,-0.3],"top":[0.5,0,1]}'
pnpm -s arm-check fox-violinist --jobs 6 \
  --variant t1 --set "$F;$T" \
  --variant t2 --set "$F;$T2" \
  --variant t3 --set "$F;$T3" \
  --variant t1p --set "$F;$T;violin@fox-red.liftPlace=1;violin@fox-red.liftTiltL=0.785;violin@fox-red.liftPoleL=[0,-1,-0.5]" \
  --variant t1r --set "$F;$T;violin@fox-red.liftReach=-0.1,0.1,-0.08"
