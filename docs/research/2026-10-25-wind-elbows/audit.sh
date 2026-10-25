#!/bin/zsh
# Renders the seam audit of the three roles against main into scratch/audit/, and writes each
# sheet into this folder at a third of the size (shrink.py).
cd "${0:A:h}/../../.."
out=docs/research/2026-10-25-wind-elbows
if [ "$1" != "--sheets" ]; then
  pnpm -s close-views audit scratch/audit --roles oboist,trombonist,bassoonist --base main
fi
for r in oboist trombonist bassoonist; do
  for e in e20 e40; do
    uv run --no-project --with pillow python -I $out/shrink.py scratch/audit/$r-$e.png $out/$r-audit-$e.webp
  done
done
