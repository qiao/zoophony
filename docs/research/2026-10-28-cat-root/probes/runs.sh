#!/bin/zsh
# runs.sh <label>...: for each label, rigs scratch/<label>.json, prints the raise lines and the
# crease rows, and renders the user angle.
export OUT=${OUT:?set OUT}
for v in "$@"; do
  echo "== $v"
  scratch/try.sh $v scratch/$v.json 2>&1 | grep "rig_mesh: raise" | grep -o "L: .*\|[0-9]* after.*"
  grep -m3 "^\(play:30\|lift:#15\|lower:#10\)" $OUT/$v/crease-L.txt | cut -c1-110
  pnpm close-views play $OUT/$v/img --demo boulanger-matin --at cat --time 30 --azimuth -72 --azimuth -45 --azimuth -110 --elevation 28 --zoom 3.5 > $OUT/$v/img.log 2>&1 || echo "render failed"
done
echo runs done
