#!/bin/zsh
# pairs.sh <audit dir> <role> <e20|e40> <out> <scale> <view:box>... -- <moment>...
d=$1 role=$2 e=$3 out=$4 sc=$5; shift 5
vbs=(); while [[ $1 != -- ]]; do vbs+=($1); shift; done; shift
args=()
for m in "$@"; do for vb in $vbs; do v=${vb%%:*}; b=${vb#*:}; args+=("$d/$role/$e/$role-base-$m-$v.png@$b" "$d/$role/$e/$role-$m-$v.png@$b"); done; done
uv run --no-project --with pillow python -I /private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/ar/tools/grid.py $out $(( ${#vbs} * 2 )) $sc "${args[@]}"
