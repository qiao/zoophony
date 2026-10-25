#!/bin/zsh
# The harp against the body for places: HOLD='<changes>' zsh docs/research/2026-10-25-harp-lean/probes/geo.sh <every> "<scale> <tilt> <turn> <cx> <cy> <cz>"...
cd "${0:A:h}/../../../.."
every=$1
shift
for v in "$@"; do
  s=$(node docs/research/2026-10-25-harp-lean/probes/solve.ts ${=v} | head -1)
  echo "== $v"
  SET="$s${HOLD:+;$HOLD}" HS=${v%% *} node docs/research/2026-10-25-harp-lean/probes/harp-geo.ts boulanger-matin $every 2>&1 | grep -E '^(play|lift|rest|lower)|harp '
done
