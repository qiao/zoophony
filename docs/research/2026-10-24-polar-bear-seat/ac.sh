#!/bin/zsh
# Arm gate variants of the pianist: each argument is name=changes.
#   scratch/ac.sh <log> <name>=<changes>...
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/agent-adedfed9827f86c1a
cd $W
log=$1
shift
args=()
for v in "$@"; do
  args+=(--variant "${v%%=*}" --set "${v#*=}")
done
pnpm -s arm-check pianist --jobs 8 "${args[@]}" > scratch/$log 2>&1
echo "exit $?"
