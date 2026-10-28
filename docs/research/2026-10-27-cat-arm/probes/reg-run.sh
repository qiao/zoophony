#!/bin/zsh
# Measures the left arm rings of the cat at older commits: the bind, the play at 30 s, and the
# rest, each in a temporary worktree.
set -o pipefail
R=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/51e57e32-cee6-44dc-94fc-af50332f7a46/scratchpad/cat-arm/reg
PROBE=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/sixth-cat-arm/scratch/arm-rings.ts
for ref in "$@"; do
  W=$R/wt-$ref
  git -C /Users/xueqiaoxu/proj/zoophony worktree add --detach $W $ref > /dev/null 2>&1 || { echo "no worktree $ref"; continue; }
  ln -s /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/sixth-cat-arm/node_modules $W/node_modules
  mkdir -p $W/scratch && cp $PROBE $W/scratch/
  (cd $W && node scratch/arm-rings.ts --bind > $R/$ref-bind.txt 2>&1; node scratch/arm-rings.ts --at boulanger-matin:play:30 > $R/$ref-play30.txt 2>&1; node scratch/arm-rings.ts --at boulanger-matin:rest:#0 > $R/$ref-rest.txt 2>&1)
  git -C /Users/xueqiaoxu/proj/zoophony worktree remove --force $W
  echo "done $ref"
done
