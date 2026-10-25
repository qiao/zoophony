#!/bin/zsh
# Builds each arm variant of the elephant with run_variant.py, and rigs all of them in one check
# run of pnpm rig-mesh. Run it from any folder of the tree:
#   docs/research/2026-10-25-elephant-arms/variants.sh <run> '<name> <key=value ...>' ...
# A key=value changes an entry of ELEPHANT of tools/blender/elephant_arms.py, and helper=<u> sets
# the length of the elbow helper (armSegments.helper). The rigs go to scratch/runs/<run>/.
cd "$(git rev-parse --show-toplevel)"
run=$1; shift
sets=()
for spec in "$@"; do
  words=(${(Q)${(z)spec}})
  name=$words[1]
  dir=scratch/v/$name
  mkdir -p $dir
  blender -b --factory-startup -P docs/research/2026-10-25-elephant-arms/run_variant.py -- $dir ${words[2,-1]} > $dir.log 2>&1 || { echo "blender failed: $name"; tail -5 $dir.log; }
  grep -E '^step_(cut_and_tube|clean_cut|clean_pit|clean_bridge)' $dir.log | tr '\n' ' '; echo " <- $name"
  extra=""
  for w in ${words[2,-1]}; do
    [[ $w == helper=* ]] && extra=";armSegments.helper=${w#helper=}"
  done
  dir=$PWD/$dir
  sets+=(--set "source=$dir/elephant-arms.glb;paintedWeights=$dir/elephant-weights.json$extra")
done
mkdir -p scratch/runs
pnpm rig-mesh elephant --check --keep scratch/runs/$run "${sets[@]}" > scratch/runs/$run.log 2>&1
echo "check exit $?"
grep -E '^(source=|\| all |Folded faces of all)' scratch/runs/$run.log | sed -E 's#^source=[^;]*/v/##' | cut -c1-300
