#!/usr/bin/env bash
# Usage: tools/decision-rows.sh [--diff <base>] [<term>...]
#
# Prints each table row of docs/decisions/*.md that holds a term, with the file and the line.
# A term of the command line matches with no regard to case. With --diff <base>, the
# identifiers and the string literals that the diff of <base>..HEAD removes are terms too, and
# they match in the code spans of a row. A person reads the list. It stops no merge.
# tools/decision-rows.ts holds the logic.
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/decision-rows.ts" "$@"
