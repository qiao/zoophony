#!/bin/zsh
# Runs the rig steps of 2026-10-27-polar-legs-rebuild/probes/steps.py for each variant of the knee
# crease and the calf fair of the config in the tree, and measures the left and the right knee
# with the probes of that report. The shin of the factor 1.2 is 0.105 units long, so the calf
# fair of main (0.03 to 0.17 units down the shin) reaches past the ankle. Run from the root:
#   docs/research/2026-10-28-polar-legs/probes/knee-variants.sh <out dir> [<name>=<changes>]...
# Each change is <key>=<JSON> or <key>=DEL of variant_cfg.py, separated by spaces.
R=docs/research/2026-10-27-polar-legs-rebuild/probes
O=$1; shift
mkdir -p $O
for spec in "$@"; do
  name=${spec%%=*}; changes=${spec#*=}
  uv run --no-project python -I $R/variant_cfg.py $O/$name.json ${=changes}
  rm -rf $O/$name; mkdir -p $O/$name
  blender -b --factory-startup --python $R/steps.py -- $O/$name.json $O/$name/out.glb $O/$name > $O/$name.log 2>&1
  uv run --no-project --with numpy python -I $R/mirror.py $O/$name $O/$name-R > /dev/null
  echo "== $name: $changes"
  grep -E 'chair: seat top|knee crease:|calf fair:' $O/$name.log | sed 's/^rig_mesh: /   /'
  uv run --no-project --with numpy python -I $R/leg_rays.py $O/$name $O/$name-R
  uv run --no-project --with numpy python -I $R/zone_turns.py $O/$name $O/$name-R
  uv run --no-project --with numpy python -I $R/hard_edges.py $O/$name $O/$name-R
  last=$(ls $O/$name | grep -E '^1[0-9]-' | tail -1 | cut -c1-2)
  uv run --no-project --with numpy python -I $R/crossings.py $last $O/$name $O/$name-R
done
