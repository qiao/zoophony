#!/bin/zsh
# The image sets and the probes of the bear round. No edit of the tree while it runs.
set -u
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/sb
W=/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/studio-bears
cd $W || exit 1
pnpm close-views play $S/g-play --time 30 --time 75 --camera default --camera orchestra --camera violins --base d7f4e76e > $S/g-play.log 2>&1 || echo "fail play"
echo play
pnpm close-views conductor $S/g-head --target head > $S/g-head.log 2>&1 || echo "fail head"
echo head
pnpm fold-probe conductor --base d7f4e76e > $S/g-fold.log 2>&1 || echo "fail fold"
echo fold
pnpm pose-depth conductor --base d7f4e76e > $S/g-depth.log 2>&1 || echo "fail depth"
echo depth
pnpm close-views audit $S/g-audit --roles conductor --base d7f4e76e > $S/g-audit.log 2>&1 || echo "fail audit"
echo audit
echo all done
