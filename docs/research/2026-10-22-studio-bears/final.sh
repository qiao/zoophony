#!/bin/zsh
set -u
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/a3b47bb4-448c-4118-8795-27eff295afc3/scratchpad/sb
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/studio-bears || exit 1
pnpm body-probe --base d7f4e76e > $S/f-bodyprobe.log 2>&1; echo "bodyprobe $?"
pnpm arm-check pianist --base d7f4e76e > $S/f-arm-pian.log 2>&1; echo "arm pianist $?"
pnpm fold-probe pianist --base d7f4e76e > $S/f-fold-pian.log 2>&1; echo "fold $?"
pnpm pose-depth pianist --base d7f4e76e > $S/f-depth-pian.log 2>&1; echo "depth $?"
pnpm pose-depth pianist --targets > $S/f-targets.log 2>&1; echo "targets $?"
pnpm close-views pianist $S/f-head-pian --target head > $S/f-head.log 2>&1; echo "head $?"
pnpm close-views play $S/f-play --time 30 --time 75 --camera default --camera orchestra --camera violins --base d7f4e76e > $S/f-play.log 2>&1; echo "play $?"
pnpm arm-check --all --base d7f4e76e > $S/f-arm-all.log 2>&1; echo "arm all $?"
pnpm close-views audit $S/f-audit --roles conductor,pianist --base d7f4e76e > $S/f-audit.log 2>&1; echo "audit $?"
echo all done
