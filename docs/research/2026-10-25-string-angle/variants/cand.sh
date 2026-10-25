#!/bin/zsh
# The candidate holds of the angle round, as --set texts.
Q25='0.02344,-0.21623,-0.03679,0.97537'
C25='0,-0.21644,0,0.9763'
RABBIT="violin@rabbit.playTurn=$Q25;violin@rabbit.reachL=0.27;violin@rabbit.playShift=-0.054,-0.09,0.185;violin@rabbit.headDrop=0.3"
FOX="violin@fox-red.playTurn=$Q25;violin@fox-red.reachL=0.14;violin@fox-red.liftTurn={\"axis\":[-0.3,1,-0.6],\"top\":[0,0,1]};violin@fox-red.restBow.via.hair=[0,0.3,1]"
CAT="cat.violaScale=0.87;viola@cat.playTurn=$C25;viola@cat.reachL=0.26;viola@cat.playShift=0.05,-0.031,0.1405;viola@cat.slant=0;viola@cat.liftPoleL=[-0.3,-1,-0.5];viola@cat.liftTiltL=0.9"
