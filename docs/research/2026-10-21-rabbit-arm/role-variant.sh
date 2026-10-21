#!/bin/zsh
# Rigs a variant of the rabbit config (--set), swaps it in, renders the role views at scale 2 with
# no shadow on the rabbit and with it, and restores the tree. Usage: role-variant.sh <name> <set>
set -o pipefail
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/rabbit-arm
name=$1; out=scratch/rv/$name; mkdir -p $out
if [[ -n "$2" ]]; then
  pnpm rig-mesh rabbit --check --roles violinist --set "$2" --keep $out/glb > $out/rig.txt 2>&1 || { echo rig failed; exit 1; }
  cp $(ls $out/glb/*.glb | tail -1) assets/models/rabbit/rabbit-4.rig.glb
  pnpm studio-body rabbit > $out/studio-body.txt 2>&1
fi
pnpm close-views violinist $out/close --scale 2 > $out/close.log 2>&1 || echo render failed
git checkout assets/models/rabbit/rabbit-4.rig.glb src/models/studio/rabbit.ts
sed -n '/^| Variant | Triangles/,/^$/p' $out/rig.txt 2>/dev/null | tail -2
