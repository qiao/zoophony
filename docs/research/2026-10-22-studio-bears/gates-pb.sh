#!/bin/zsh
set -u
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/sb
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/studio-bears || exit 1
pnpm pose-depth pianist --targets > $S/p-targets.log 2>&1 || echo "fail targets"
echo targets
pnpm arm-check pianist --base d7f4e76e > $S/p-arm.log 2>&1 || echo "fail arm"
echo arm
pnpm fold-probe pianist --base d7f4e76e > $S/p-fold.log 2>&1 || echo "fail fold"
echo fold
pnpm pose-depth pianist --every 4 --base d7f4e76e > $S/p-depth.log 2>&1 || echo "fail depth"
echo depth
echo all done
