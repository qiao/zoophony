#!/bin/zsh
# Builds the pair sheets of one role from a folder of `pnpm close-views <role> --base main`:
# one sheet for each moment, main above the branch, from six views.
# Usage: [MOMENTS=<m,...>] sheets.sh <dir> <role> <out dir>
cd "${0:A:h}/../../.."
for m in ${(s:,:)${MOMENTS:-note,rest,lift50,lower50}}; do
  uv run --no-project --with pillow python -I docs/research/2026-10-25-wind-elbows/pairs.py \
    "$1" "$2" $m "$3/$2-$m.webp" front left right back az35 az-35
done
