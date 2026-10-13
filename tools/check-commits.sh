#!/usr/bin/env bash
# Usage: tools/check-commits.sh [--tip] [--no-cache] <base>
#
# Checks each commit of <base>..HEAD with the checks of a merge, and keeps the result of each
# passed commit in a cache that each worktree shares: $(git rev-parse --git-common-dir)/check-cache/.
# The result of a check is a fact of the tree, so a commit with a known key prints "hit" and runs
# no check. Each other commit prints the time of each check.
#
# tools/check-cache.ts gives the plan and the key of each commit. The key holds the tree of the
# commit, the tree of its parent, the check commands, the hash of this script and of the module,
# the version of Node, and the hash of the installed lockfile. A commit that changes code runs the
# lint, the typecheck, the unit tests that its changes reach, and the format check. A commit that
# changes only docs/ and Markdown files runs the format check and the tests that read docs paths.
#
# --tip also runs the full unit suite on the last commit. --no-cache reads no entry, and it
# still writes an entry for each passed check. Only this script writes an entry, after each
# check of the commit exits with 0, through a temporary file and `mv`.
#
# The script checks the commits in place with `git rebase --exec`, which changes no commit. An old
# commit has an old copy of this script or none, so the rebase runs a copy of this script and of
# the module from a temporary folder. The script stops when HEAD changed.
#
# Exit codes: 1 bad use or bad state, 3 a check failed (the branch is unchanged), 4 the commit
# hashes changed.
set -euo pipefail

usage() {
  echo "Usage: tools/check-commits.sh [--tip] [--no-cache] <base>" >&2
  exit 1
}

# Prints the time now in seconds, with one decimal.
now() {
  perl -MTime::HiRes=time -e 'printf "%.1f\n", time'
}

# Prints the seconds since the time $1, with one decimal.
since() {
  awk -v start="$1" -v end="$(now)" 'BEGIN { printf "%.1f", end - start }'
}

# Writes the cache entry $1 of the commit $2 with the subject $3 and the times $4. The entry goes
# into a temporary file first, so a reader never sees a part of an entry.
write_entry() {
  local tmp
  mkdir -p "$CHECK_CACHE"
  tmp=$(mktemp "$CHECK_CACHE/.entry.XXXXXX")
  printf 'commit %s\nsubject %s\nchecks %s\ndate %s\n' "$2" "$3" "$4" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$tmp"
  mv -f "$tmp" "$CHECK_CACHE/$1"
}

# Runs the plan in the file $1, which holds one commit line and its check lines. $2 goes before
# the report line. Prints "hit" for a known key, or the time of each check. Returns 1 at the
# first failed check, after the tail of its log.
run_plan() {
  local plan=$1 label=$2 tag commit key name cmd short subject log start report=
  IFS=$'\t' read -r tag commit key <"$plan"
  if [ "$tag" != commit ]; then
    echo "The plan $plan has no commit line." >&2
    return 1
  fi
  short=$(git rev-parse --short "$commit")
  subject=$(git log -1 --format=%s "$commit")
  if [ "$CHECK_NO_CACHE" = 0 ] && [ -f "$CHECK_CACHE/$key" ]; then
    echo "${label}${short} hit  $subject"
    return 0
  fi

  while IFS=$'\t' read -r tag name cmd; do
    if [ "$tag" != check ]; then
      continue
    fi
    log="$CHECK_TMP/$short-${name// /-}.log"
    start=$(now)
    if ! bash -c "$cmd" >"$log" 2>&1 </dev/null; then
      tail -20 "$log"
      echo "RED ${label}${short} $name failed after $(since "$start")s: $subject"
      echo "The log is $log."
      return 1
    fi
    report="${report:+$report, }$name $(since "$start")s"
  done <"$plan"
  if [ -z "$report" ]; then
    echo "RED ${label}${short} the plan has no check: $subject"
    return 1
  fi

  # A check result is a fact of the tree only when the checks saw the tree of the commit. An
  # edit or a new file during the checks, or a move of HEAD, gives no entry.
  local changed
  changed=$(git status --porcelain --untracked-files=all)
  if [ -n "$changed" ] || [ "$(git rev-parse HEAD)" != "$commit" ]; then
    echo "$changed" | head -20
    echo "RED ${label}${short} the working tree or HEAD changed during the checks: $subject"
    echo "Do not edit the worktree while the script runs. The commit has no entry."
    return 1
  fi
  write_entry "$key" "$commit" "$subject" "$report"
  echo "${label}${short} $report  $subject"
}

# Checks the commit at HEAD. `git rebase --exec` runs this step on each commit.
exec_one() {
  cd "$(git rev-parse --show-toplevel)"
  node "$CHECK_BIN/check-cache.ts" plan commit HEAD >"$CHECK_TMP/plan-one.txt"
  run_plan "$CHECK_TMP/plan-one.txt" ''
}

# Prints the process IDs of each descendant of the process $1.
descendants() {
  local child
  for child in $(pgrep -P "$1" || true); do
    echo "$child"
    descendants "$child"
  done
}

# Stops the check rebase and each of its processes, and aborts the rebase. A trap on INT and TERM
# runs it.
stop_rebase() {
  trap - INT TERM
  if [ -n "${REBASE_PID:-}" ]; then
    # shellcheck disable=SC2046 # Each process ID is one word.
    kill -TERM "$REBASE_PID" $(descendants "$REBASE_PID") 2>/dev/null || true
    wait "$REBASE_PID" 2>/dev/null || true
  fi
  git rebase --abort >/dev/null 2>&1 || true
  echo "The check stopped. The rebase is aborted, and the branch is unchanged." >&2
  exit 130
}

if [ "${1:-}" = --exec-one ]; then
  exec_one
  exit $?
fi

TIP=0
CHECK_NO_CACHE=0
while [ $# -gt 0 ]; do
  case $1 in
    --tip) TIP=1 ;;
    --no-cache) CHECK_NO_CACHE=1 ;;
    -*) usage ;;
    *) break ;;
  esac
  shift
done
if [ $# -ne 1 ]; then
  usage
fi
BASE=$1
SOURCE_DIR=$(cd "$(dirname "$0")" && pwd)

cd "$(git rev-parse --show-toplevel)"
if [ -d "$(git rev-parse --git-path rebase-merge)" ]; then
  echo "A rebase is in progress. Finish it or abort it first." >&2
  exit 1
fi
DIRTY=$(git status --porcelain --untracked-files=all)
if [ -n "$DIRTY" ]; then
  echo "The working tree has changes. The checks must see the tree of each commit:" >&2
  echo "$DIRTY" | head -20 >&2
  exit 1
fi
git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null || {
  echo "No commit $BASE." >&2
  exit 1
}

CHECK_CACHE="$(git rev-parse --path-format=absolute --git-common-dir)/check-cache"
TMP_ROOT=${TMPDIR:-/tmp}
CHECK_TMP=$(mktemp -d "${TMP_ROOT%/}/check-commits.XXXXXX")
CHECK_BIN=$CHECK_TMP/bin
mkdir "$CHECK_BIN"
cp "$SOURCE_DIR/check-commits.sh" "$SOURCE_DIR/check-cache.ts" "$CHECK_BIN/"
export CHECK_CACHE CHECK_TMP CHECK_BIN CHECK_NO_CACHE

HEAD_BEFORE=$(git rev-parse HEAD)
COMMITS=$(git rev-list --reverse "$BASE..HEAD")
COUNT=0
FIRST_MISS=
if [ -n "$COMMITS" ]; then
  # shellcheck disable=SC2086 # Each hash is one word.
  node "$CHECK_BIN/check-cache.ts" plan commit $COMMITS >"$CHECK_TMP/plan-all.txt"
  while IFS=$'\t' read -r tag commit key; do
    if [ "$tag" != commit ]; then
      continue
    fi
    COUNT=$((COUNT + 1))
    if [ -z "$FIRST_MISS" ] && [ "$CHECK_NO_CACHE" = 0 ] && [ -f "$CHECK_CACHE/$key" ]; then
      echo "$(git rev-parse --short "$commit") hit  $(git log -1 --format=%s "$commit")"
    elif [ -z "$FIRST_MISS" ]; then
      FIRST_MISS=$commit
    fi
  done <"$CHECK_TMP/plan-all.txt"
fi
EXPECTED=$(git rev-list --count "$BASE..HEAD")
if [ "$COUNT" != "$EXPECTED" ]; then
  echo "The plan has $COUNT commits, and $BASE..HEAD has $EXPECTED. The plan is wrong." >&2
  exit 1
fi

# The rebase starts at the parent of the first commit with no entry. Each later commit with an
# entry prints "hit" in the rebase.
#
# A stop (Ctrl-C, kill, or the time limit of a tool) runs stop_rebase(): it stops the rebase and
# its checks, and aborts the rebase. Else the worktree stays in a rebase at an old commit. The
# rebase runs in the background, because bash runs a trap only after the foreground command.
if [ -n "$FIRST_MISS" ]; then
  trap stop_rebase INT TERM
  # The messages of git go to the log. The report lines of each commit go to the output.
  git rebase --exec "bash \"$CHECK_BIN/check-commits.sh\" --exec-one" "$FIRST_MISS^" \
    2>"$CHECK_TMP/rebase.log" &
  REBASE_PID=$!
  REBASE_STATUS=0
  wait "$REBASE_PID" || REBASE_STATUS=$?
  REBASE_PID=
  trap - INT TERM
  if [ "$REBASE_STATUS" != 0 ]; then
    git rebase --abort >/dev/null 2>&1 || true
    echo "A commit failed a check. The branch is unchanged, and that commit has no entry."
    echo "The logs and the messages of the rebase (rebase.log) are in $CHECK_TMP."
    exit 3
  fi
fi
if [ -d "$(git rev-parse --git-path rebase-merge)" ]; then
  echo "The check rebase did not finish. Examine $(pwd)." >&2
  exit 3
fi
if [ "$(git rev-parse HEAD)" != "$HEAD_BEFORE" ]; then
  echo "The check rebase changed the commit hashes. Examine $(pwd)." >&2
  exit 4
fi

if [ "$TIP" = 1 ]; then
  node "$CHECK_BIN/check-cache.ts" plan tip HEAD >"$CHECK_TMP/plan-tip.txt"
  run_plan "$CHECK_TMP/plan-tip.txt" 'tip ' || {
    echo "The full unit suite failed on the last commit. The logs are in $CHECK_TMP."
    exit 3
  }
fi

rm -rf "$CHECK_TMP"
echo "Checked $COUNT commits of $BASE..HEAD in ${SECONDS}s."
