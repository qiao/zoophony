#!/usr/bin/env bash
# Runs paw-twist.ts on each demo with a contrabass hippo, at a step of 0.25 s, and prints the last
# line of each run. The arguments go to paw-twist.ts, such as --set '<changes>'.
# Usage, from the root of the tree: docs/research/2026-10-18-hippo-arm/roll-all.sh [args]
set -euo pipefail
for demo in bach-bwv1048.mid bach-bwv1050.mid beethoven-1.mid beethoven-8-4.mid beethoven-8.mid \
  beethoven-9.mid boulanger-matin.mid brahms-2.mid mendelssohn-op61.mid; do
  printf '%s: ' "$demo"
  node docs/research/2026-10-18-hippo-arm/paw-twist.ts "$demo" --step 0.25 "$@" | tail -1
done
