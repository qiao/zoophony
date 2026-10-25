#!/bin/zsh
# Renders the close views of one leaned harp: zsh docs/research/2026-10-25-harp-lean/probes/render.sh <dir> "<scale> <tilt> <turn> <cx> <cy> <cz>" [<more changes>] [-- close-views args]
cd "${0:A:h}/../../../.."
dir=$1
set_text=$(node docs/research/2026-10-25-harp-lean/probes/solve.ts ${=2} | head -1)
more=${3:-}
shift 3 2>/dev/null || shift $#
[[ ${1:-} == -- ]] && shift
pnpm -s close-views harpist "$dir" --set "$set_text${more:+;$more}" "$@"
