#!/bin/zsh
# Prints the elbows and the moves of the rabbit and the cat with the holds of main (as --set
# changes on the working tree) and of the working tree. Run it from the root of the tree:
#   zsh docs/research/2026-10-24-violin-poses/summary.sh > docs/research/2026-10-24-violin-poses/summary.txt
D=docs/research/2026-10-24-violin-poses
RABBIT_MAIN='violin@rabbit.restPlace=0.4;violin@rabbit.rest.lap.along=1.1;violin@rabbit.restBow.lap.offset=[0.65,0.45,-0.3];violin@rabbit.restBow.via={"tip":[-0.3,0.3,-1],"hair":[0,0,1],"reach":[0,0,-0.2]}'
CAT_MAIN='viola@cat.restPlace=0.5;viola@cat.rest.lap={"along":0.95,"offset":[0,0,-0.3]};viola@cat.liftReach=[0.1,0.4,0];viola@cat.liftTurn={"axis":[-0.6,1,-0.6],"top":[0,0,1]};viola@cat.restBow.via={"tip":[-0.3,0.3,-1],"hair":[0,-1,0],"reach":[0.3,0.1,-0.5]}'
for species in rabbit cat; do
  if [[ $species == rabbit ]]; then main=$RABBIT_MAIN role=violinist demo=beethoven-8; else main=$CAT_MAIN role=violist demo=mozart-k525; fi
  for state in main tree; do
    args=()
    if [[ $state == main ]]; then
      for c in ${(s:;:)main}; do args+=(--set "$c"); done
    fi
    echo "## $species, $state"
    node $D/path.ts $species --summary $args 2>&1 | command grep '^rest elbows\|^move elbows'
    if [[ $state == main ]]; then
      node $D/moves-eval.ts $role --set "$main" 2>&1 | command grep "^$role"
      node tools/arm-check.ts $role --set "$main" --trace ${demo}:lift0-1.2 2>&1 | python3 -I $D/trace-sum.py
    else
      node $D/moves-eval.ts $role 2>&1 | command grep "^$role"
      node tools/arm-check.ts $role --trace ${demo}:lift0-1.2 2>&1 | python3 -I $D/trace-sum.py
    fi
  done
done
