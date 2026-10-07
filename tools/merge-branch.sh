#!/usr/bin/env bash
# Usage: tools/merge-branch.sh <branch> [worktree]
#
# Rebases <branch> onto main, checks each commit, and fast-forwards main to it.
# <worktree> is the worktree that holds <branch>. With no <worktree>, the script
# adds a temporary worktree. The script stops at the first failure and keeps the
# branch and the worktree. It removes them only after a successful merge.
#
# Exit codes: 1 bad use or bad state, 2 rebase conflict, 3 a commit failed a
# check, 4 the commit hashes changed, 5 build or size failed, 6 the Chromium
# end-to-end tests failed.
set -euo pipefail

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: tools/merge-branch.sh <branch> [worktree]" >&2
  exit 1
fi

BRANCH=$1
WORKTREE=
if [ $# -eq 2 ]; then
  WORKTREE=$(cd "$2" && pwd)
fi
REPO=$(git rev-parse --show-toplevel)
TMP_ROOT=${TMPDIR:-/tmp}
MERGE_TMP=$(mktemp -d "${TMP_ROOT%/}/merge-branch.XXXXXX")
export MERGE_TMP
LOG=$MERGE_TMP/merge.log

cd "$REPO"
if [ "$(git branch --show-current)" != main ]; then
  echo "The worktree at $REPO must have main checked out." >&2
  exit 1
fi
git rev-parse --verify --quiet "refs/heads/$BRANCH" >/dev/null || {
  echo "No branch $BRANCH." >&2
  exit 1
}

if [ -z "$WORKTREE" ]; then
  WORKTREE=$MERGE_TMP/worktree
  git worktree add -q "$WORKTREE" "$BRANCH"
fi

cd "$WORKTREE"
if [ "$(git branch --show-current)" != "$BRANCH" ]; then
  echo "The worktree $WORKTREE does not have $BRANCH checked out." >&2
  exit 1
fi
pnpm install --frozen-lockfile >>"$LOG" 2>&1

if ! git rebase main >>"$LOG" 2>&1; then
  echo "Rebase conflict. Resolve it in $WORKTREE, then run the script again."
  git status --short | head -20
  exit 2
fi

# The second rebase rewrites no commit: it only runs the checks on each commit.
HEAD_BEFORE=$(git rev-parse HEAD)
CHECK='pnpm -s lint >"$MERGE_TMP/lint.log" 2>&1 && pnpm -s typecheck >"$MERGE_TMP/typecheck.log" 2>&1 && pnpm -s test >"$MERGE_TMP/test.log" 2>&1 && pnpm -s format:check >"$MERGE_TMP/format.log" 2>&1 || { echo "RED $(git log -1 --format="%h %s")"; exit 1; }'
if ! git rebase main --exec "$CHECK" >>"$LOG" 2>&1; then
  grep -E '^RED ' "$LOG" || true
  git rebase --abort >/dev/null 2>&1 || true
  echo "A commit failed a check. The rebase is aborted, and the branch is unchanged."
  echo "The logs are in $MERGE_TMP."
  exit 3
fi
if [ -d "$(git rev-parse --git-path rebase-merge)" ]; then
  echo "The rebase did not finish in $WORKTREE." >&2
  exit 3
fi
if [ "$(git rev-parse HEAD)" != "$HEAD_BEFORE" ]; then
  echo "The check rebase changed the commit hashes. Examine $WORKTREE." >&2
  exit 4
fi

pnpm -s build >"$MERGE_TMP/build.log" 2>&1 || {
  echo "The build failed. The log is $MERGE_TMP/build.log."
  exit 5
}
pnpm -s size >"$MERGE_TMP/size.log" 2>&1 || {
  cat "$MERGE_TMP/size.log"
  echo "The size check failed."
  exit 5
}
tail -2 "$MERGE_TMP/size.log"
# CI blocks a merge on the Chromium end-to-end tests (design 9.2). The merge of step 8
# broke three of them, because no branch ran them (review of step 8, H1).
pnpm -s test:e2e --project=chromium >"$MERGE_TMP/e2e.log" 2>&1 || {
  tail -30 "$MERGE_TMP/e2e.log"
  echo "The Chromium end-to-end tests failed. The log is $MERGE_TMP/e2e.log."
  exit 6
}
tail -2 "$MERGE_TMP/e2e.log"

cd "$REPO"
git merge --ff-only "$BRANCH"
git log --oneline -1
git worktree remove --force "$WORKTREE"
git branch -D "$BRANCH"
rm -rf "$MERGE_TMP"
echo "Merged $BRANCH."
