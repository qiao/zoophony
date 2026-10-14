#!/usr/bin/env bash
# Measures the times of the compare options of the retro round on the development Mac
# (section 4 of 2026-10-14-rabbit-smooth-retro.md). Run it from the root of a worktree after
# `pnpm install`: bash docs/research/2026-10-14-rabbit-smooth-retro/times.sh > times.txt
# It writes the close views into a temporary folder, and removes the folder at the end.
set -euo pipefail
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

echo "commit $(git rev-parse --short HEAD), $(date '+%Y-%m-%d %H:%M'), load: $(uptime | sed 's/.*load averages*: //')"

# Prints the wall time of a command in seconds. A command that exits with an error still counts,
# because pnpm body-probe --base exits with 1 when it finds a difference.
measure() {
  local name=$1
  shift
  /usr/bin/time -p "$@" >"$out/log.txt" 2>"$out/time.txt" || true
  echo "$name: $(awk '/^real/ { print $2 }' "$out/time.txt") s"
}

measure 'pnpm build' pnpm build
measure 'pnpm size' pnpm size
measure 'pnpm size --base main' pnpm size --base main
measure 'pnpm close-views violinist <dir>' pnpm close-views violinist "$out/plain"
measure 'pnpm close-views violinist <dir> --base main' pnpm close-views violinist "$out/base" --base main
measure 'pnpm body-probe' pnpm body-probe
measure 'pnpm body-probe --base main' pnpm body-probe --base main
measure "tools/break-test.sh (one break of tools/close-views.ts)" \
  tools/break-test.sh 's/`working tree: /`new: /' tools/close-views.ts tools/close-views.test.ts
