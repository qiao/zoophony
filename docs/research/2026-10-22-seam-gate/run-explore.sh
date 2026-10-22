#!/bin/zsh
# Runs the exploration probe for each role of the tree, and for the bad states.
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/seam-gate
STEP=${STEP:-1}
ROLES=(conductor pianist harpist violinist fox-violinist violist cellist bassist flutist trombonist oboist timpanist bassoonist hornist clarinetist trumpeter tubist singer bass-drummer snare-drummer cymbalist percussionist xylophonist)
jobs_run() {
  for r in $ROLES; do echo "main $r"; done
  echo "5593e92b conductor"
  echo "7c1747ed violinist"
}
jobs_run | xargs -P 6 -L 1 zsh -c '
  if [ "$0" = main ]; then dir=.; else dir=scratch/trees/$0; fi
  (cd $dir && node scratch/seam-explore.ts $1 --step '$STEP' --json '$PWD'/scratch/ex/$0-$1.json > '$PWD'/scratch/ex/$0-$1.txt 2>&1)
'
echo done
