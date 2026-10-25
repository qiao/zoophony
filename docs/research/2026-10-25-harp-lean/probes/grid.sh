#!/bin/zsh
# Grid of leaned harps: zsh docs/research/2026-10-25-harp-lean/probes/grid.sh <out> "<scales>" "<tilts>" "<turns>" "<cxs>" "<cys>" "<czs>" "<leans>"
# Each variant puts the top of the soundbox axis at (cx, cy, cz) (solve.ts), with the
# play lean of the spine of the harp hold (harp.lean, in degrees).
cd "${0:A:h}/../../../.."
out=$1
args=()
: > "$out.params"
for s in ${=2}; do for t in ${=3}; do for u in ${=4}; do for x in ${=5}; do for y in ${=6}; do for z in ${=7}; do for l in ${=8}; do
  set_text=$(node docs/research/2026-10-25-harp-lean/probes/solve.ts $s $t $u $x $y $z | head -1)
  echo "s$s t$t u$u c$x,$y,$z l$l" >> "$out.params"
  args+=(--set "$set_text;harp.lean=${l}deg${HOLD:+;$HOLD}")
done; done; done; done; done; done; done
pnpm -s pose-depth harpist --demo boulanger-matin --gaps --every 6 "${args[@]}" > "$out" 2>&1
