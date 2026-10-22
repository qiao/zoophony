#!/bin/zsh
# Renders the knees of each kept rig from the side beside the seated rabbit and red fox, at the
# scale of main: it sets the landmark height of the polar bear in ANIMALS before each run (no
# build runs then), then restores it.
# Usage: scratch/knees.sh <tag>=<glb>=<height> ...
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-legs
for spec in "$@"; do
  tag=${spec%%=*}; rest=${spec#*=}; glb=${rest%%=*}; h=${rest#*=}
  perl -0pi -e "s/('polar-bear',\n    \{\n      landmark: 'shoulders',\n      height: )[0-9.]+/\${1}$h/" tools/studio-body.ts
  mkdir -p scratch/knees/$tag
  pnpm close-views pianist scratch/knees/$tag --lineup --glb $glb --views left,right \
    --moments chord,rest --with violinist,fox-violinist --base 2da5c8ec \
    > scratch/knees/$tag/log.txt 2>&1
  echo "knees $tag $?"
  perl -0pi -e "s/('polar-bear',\n    \{\n      landmark: 'shoulders',\n      height: )[0-9.]+/\${1}1.1574/" tools/studio-body.ts
done
git -C /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-legs diff --stat
