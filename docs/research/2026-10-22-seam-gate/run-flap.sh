#!/bin/zsh
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/seam-gate
ROLES=(conductor pianist harpist violinist fox-violinist violist cellist bassist flutist trombonist oboist timpanist bassoonist hornist clarinetist trumpeter tubist singer bass-drummer snare-drummer cymbalist percussionist xylophonist)
{ for r in $ROLES; do echo "main $r"; done; echo "5593e92b conductor"; echo "7c1747ed violinist"; } | xargs -P 6 -L 1 zsh -c '
  if [ "$0" = main ]; then dir=.; else dir=scratch/trees/$0; fi
  (cd $dir && node scratch/flap.ts $1 --step 2 > /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/seam-gate/scratch/flap/$0-$1.txt 2>&1)
'
