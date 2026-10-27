#!/bin/zsh
# Runs the rig steps (steps.py) for each variant of the final config and measures the left and
# the right knee. Run from the root of the tree:
#   docs/research/2026-10-27-polar-legs-rebuild/probes/variants.sh \
#     docs/research/2026-10-27-polar-legs-rebuild/probes <out dir>
P=$1; O=$2
mkdir -p $O
typeset -A V
V=(
  final ''
  linear-knee 'bind={}'
  no-crease 'kneeCrease=DEL'
  crease-12 'kneeCrease.rounds=12'
  no-fair 'kneeCrease.fair=DEL'
  front-round 'kneeCrease.front={"radius":0.1,"rounds":12,"share":0.5}'
  new-heat 'heatSource=DEL'
  blender-weights 'paintedLower=["root","hips","spine","spine1","chest","foot_L","toes_L","foot_R","toes_R","tail"]'
)
for name in final linear-knee no-crease crease-12 no-fair front-round new-heat blender-weights; do
  uv run --no-project python -I $P/variant_cfg.py $O/$name.json ${=V[$name]}
  rm -rf $O/$name; mkdir -p $O/$name
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python $P/steps.py -- $O/$name.json $O/$name/out.glb $O/$name > $O/$name.log 2>&1
  uv run --no-project --with numpy python -I $P/mirror.py $O/$name $O/$name-R > /dev/null
  echo "== $name: ${V[$name]}"
  grep -E 'chair: seat top' $O/$name.log | sed 's/^rig_mesh: /   /'
  uv run --no-project --with numpy python -I $P/leg_rays.py $O/$name $O/$name-R
  uv run --no-project --with numpy python -I $P/zone_turns.py $O/$name $O/$name-R
  uv run --no-project --with numpy python -I $P/hard_edges.py $O/$name $O/$name-R
  last=$(ls $O/$name | grep -E '^1[0-9]-' | tail -1 | cut -c1-2)
  uv run --no-project --with numpy python -I $P/crossings.py $last $O/$name $O/$name-R
done
