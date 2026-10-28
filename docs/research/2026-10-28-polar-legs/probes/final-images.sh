#!/bin/zsh
# Renders the image set of the round against main (main above or left of the tree):
# - e20/, e40/: each moment of the pianist from the front, the back, each side, 35, -35, 150,
#   and -150, at the camera heights 20° and 40° (one sheet for each view);
# - legs/: 2x crops of the knees and the haunch on the bench at the chord and at rest, from the
#   same views at 20°;
# - final/: the stage from the left, the back, and the angle of image 53, the gallery view from
#   35°, and the default view, in the play and at rest (render-variant.sh);
# - demos/<id>/: the default view of each demo at the song time 30 s, so that each other player
#   and the layout compare with main.
# - arms/: 2x crops of each arm (the wrists) at the worst sample, a strike, and a rest
#   (`pnpm arm-check pianist --base main --views <dir> --views-all`).
# Run from the root of the tree: <this file> <out dir>
set -uo pipefail
P=docs/research/2026-10-28-polar-legs/probes
O=$1
mkdir -p $O
M=chord,between,far-left,far-right,rest
V=front,back,left,right,35,-35,150,-150
for e in 20 40; do
  pnpm close-views pianist $O/e$e --base main --sheet --moments $M --views $V --elevation $e > $O/e$e.log 2>&1 || echo "e$e failed"
done
pnpm close-views pianist $O/legs --base main --sheet --moments chord,rest --views $V --elevation 20 --box 0.1,0.5,0.8,0.5 --scale 2 > $O/legs.log 2>&1 || echo "legs failed"
$P/render-variant.sh $O/final || echo "final failed"
pnpm arm-check pianist --base main --views $O/arms --views-all > $O/arms.log 2>&1 || echo "arms failed"
for d in boulanger-matin beethoven-9 mozart-k525 bach-bwv1048 beethoven-8 mozart-k315 beethoven-1 brahms-2 beethoven-8-4 bach-bwv1047 bach-bwv1050 mendelssohn-op61 mozart-k417 mozart-k191; do
  pnpm close-views play $O/demos/$d --demo $d --time 30 --base main > $O/demos-$d.log 2>&1 || echo "demo $d failed"
done
echo done
