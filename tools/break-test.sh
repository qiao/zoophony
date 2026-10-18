#!/usr/bin/env bash
# Applies one temporary break to a file, runs the named tests, restores the file, and prints the
# tests that fail (docs/agents/workflow.md, "Tests"). The report of a new pure function gives one
# such command for each rule that its TSDoc states.
#
# Usage: tools/break-test.sh '<perl expr>' <file> <test files>...
#
# Run it from the root of the worktree. The break is `perl -0pi -e '<perl expr>' <file>`. The
# script refuses a file that git does not track or that has changes that are not committed,
# because the restore is `git checkout -- <file>`. It restores the file at the end, also after a
# failure and after Ctrl-C. It stops when the expression changes nothing.
#
# Exit codes: 0 when at least one test fails, 1 when no test fails, 2 for a wrong call, a refused
# file, an expression that changes nothing, or a test run with no report, and 130 after Ctrl-C.
set -euo pipefail

usage() {
  echo "Usage: tools/break-test.sh '<perl expr>' <file> <test files>..." >&2
  exit 2
}

if [ $# -lt 3 ]; then
  usage
fi
expr=$1
file=$2
shift 2

script_dir=$(cd "$(dirname "$0")" && pwd)
top=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "break-test: run it in a git worktree." >&2
  exit 2
}
if [ "$(pwd -P)" != "$(cd "$top" && pwd -P)" ]; then
  echo "break-test: run it from the root of the worktree, $top." >&2
  exit 2
fi
if [ ! -f "$file" ] || ! git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
  echo "break-test: git does not track the file $file." >&2
  exit 2
fi
if ! git diff --quiet HEAD -- "$file" || ! git diff --cached --quiet -- "$file"; then
  echo "break-test: $file has changes that are not committed. Commit them first." >&2
  exit 2
fi

work=$(mktemp -d "${TMPDIR:-/tmp}/break-test.XXXXXX")
# The reader of the report runs from a copy, so that a break of the reader does not change the
# verdict.
cp "$script_dir/break-test.ts" "$work/break-test.ts"

# The file is equal to HEAD and to the index here, so the checkout restores it as it was.
restore() {
  git checkout -- "$file"
  rm -rf "$work"
}
trap restore EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! perl -0pi -e "$expr" "$file"; then
  echo "break-test: perl fails on the expression." >&2
  exit 2
fi
if git diff --quiet -- "$file"; then
  echo "break-test: the expression changes nothing in $file." >&2
  exit 2
fi
echo "The break:"
git --no-pager diff --no-color -U0 -- "$file" | tail -n +5

status=0
pnpm exec vitest run --reporter=json --outputFile="$work/report.json" "$@" \
  >"$work/vitest.log" 2>&1 || status=$?
if [ ! -s "$work/report.json" ]; then
  echo "break-test: the test run gives no report (exit code $status). Its last lines:" >&2
  tail -n 20 "$work/vitest.log" >&2
  exit 2
fi

verdict=0
node "$work/break-test.ts" "$work/report.json" "$(pwd -P)" || verdict=$?
exit "$verdict"
