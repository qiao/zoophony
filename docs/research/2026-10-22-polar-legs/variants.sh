#!/bin/zsh
# Probes each kept rig of a leg factor at the scale of main: it sets the landmark height of the
# polar bear in ANIMALS to the kept height for the run, then restores it.
# Usage: scratch/variants.sh <tag>=<glb>=<height> ...
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-legs
for spec in "$@"; do
  tag=${spec%%=*}; rest=${spec#*=}; glb=${rest%%=*}; h=${rest#*=}
  perl -0pi -e "s/('polar-bear',\n    \{\n      landmark: 'shoulders',\n      height: )[0-9.]+/\${1}$h/" tools/studio-body.ts
  command grep -n -A3 "'polar-bear'," tools/studio-body.ts | command grep height
  node docs/research/2026-10-22-polar-legs/seat-probe.ts --glb $glb > scratch/out/seat-$tag.txt 2>&1; echo "seat $tag $?"
  pnpm pose-depth pianist --every 4 --gaps --glb $glb > scratch/out/pose-depth-$tag.txt 2>&1; echo "depth $tag $?"
  perl -0pi -e "s/('polar-bear',\n    \{\n      landmark: 'shoulders',\n      height: )[0-9.]+/\${1}1.1574/" tools/studio-body.ts
done
git -C /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/polar-legs diff --stat
