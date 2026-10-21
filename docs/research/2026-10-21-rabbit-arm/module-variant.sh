#!/bin/zsh
# Renders the role views with a rig file (or the tree's) and a crease angle in the module.
# Usage: module-variant.sh <name> <glb or -> <crease>
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-arm
name=$1; out=scratch/rv/$name; mkdir -p $out
[[ "$2" != "-" ]] && cp $2 assets/models/rabbit/rabbit-4.rig.glb && pnpm studio-body rabbit > $out/studio-body.txt 2>&1
perl -pi -e "s/^  crease: 35,/  crease: $3,/" src/models/studio/rabbit.ts
command grep -n "^  crease" src/models/studio/rabbit.ts
pnpm close-views violinist $out/close --scale 2 > $out/close.log 2>&1 || echo render failed
git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts
