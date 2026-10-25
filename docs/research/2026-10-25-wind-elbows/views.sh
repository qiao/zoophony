#!/bin/zsh
# Renders the close views of each role against main into scratch/cv-<role>/, and builds the pair
# sheets of each moment into scratch/ (sheets.sh).
# Usage: [MOMENTS=<m,...>] views.sh <role>...
cd "${0:A:h}/../../.."
for r in "$@"; do
  pnpm -s close-views $r scratch/cv-$r --views front,left,right,back,35,-35 --zoom 1.4 \
    --moments ${MOMENTS:-note,rest,lift50,lower50} --base main > scratch/cv-$r.log 2>&1
  echo "$r exit $?"
  zsh docs/research/2026-10-25-wind-elbows/sheets.sh scratch/cv-$r $r scratch
done
