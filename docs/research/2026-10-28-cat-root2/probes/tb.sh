#!/bin/zsh
# tb.sh <label>: builds the copy, the rig, and the body module of this tree (scratch/build.sh), and
# runs the crease probe on both sides, the open loops of the body, and the non-manifold edges of
# the copy. The outputs go to $OUT/<label>.
set -o pipefail
OUT=${OUT:?set OUT}
d=$OUT/$1
mkdir -p $d
zsh scratch/build.sh $d > $d/build.txt 2>&1 || { echo build failed; tail -5 $d/build.txt; exit 1; }
grep -E 'step_clean_pit|rig_mesh: raise|after the relax' $d/blender.log $d/rig.log | cut -c1-200 | head -8
AT=(); for a in rest:#0 play:10 play:30 play:50 play:70 lift:#3 lift:#4 lift:#5 lift:#6 lift:#7 lift:#10 lift:#15 lower:#5 lower:#10 lower:#12 lower:#13 lower:#14 lower:#15; do AT+=(--at boulanger-matin:$a); done; AT+=(--at brahms-2:play:13.38)
node scratch/root-crease.ts --side L --top 4 $AT > $d/crease-L.txt 2>&1 &
node scratch/root-crease.ts --side R --top 4 $AT > $d/crease-R.txt 2>&1 &
node scratch/body-loops.ts > $d/loops.txt 2>&1 &
uv run --no-project --with numpy python -I scratch/glb_nm.py assets/models/cat/cat-arms.glb > $d/nm.txt 2>&1 &
wait
echo "loops: $(wc -l < $d/loops.txt) lines, nm: $(wc -l < $d/nm.txt) lines"
