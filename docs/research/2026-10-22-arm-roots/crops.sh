#!/bin/zsh
# crops.sh <role> <out> <glb or -> <moments> <elev> <view:box>... ; 3x crops of the base e7ef4f3a and the variant
set -e
role=$1 out=$2 glb=$3 moments=$4 elev=$5; shift 5
mkdir -p $out
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/arm-roots
for vb in "$@"; do
  v=${vb%%:*}; b=${vb#*:}
  g=(); [[ $glb != - ]] && g=(--glb $glb)
  pnpm close-views $role $out/v$v-e$elev $g --lineup --moments $moments --views $v --elevation $elev --crop 3 --box $b --base e7ef4f3a > $out/v$v-e$elev.log 2>&1
done
