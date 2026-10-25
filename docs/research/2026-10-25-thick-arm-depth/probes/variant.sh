#!/bin/zsh
# Builds one elephant arm variant with run_variant.py of 2026-10-25-elephant-arms, rigs it, and
# prints the most folded faces of the rig check and the deepest upper arm corners at the ready
# pose sample. The files go to scratch/v/<name> and scratch/runs/<name>.
# Usage: variant.sh <name> [key=value ...], such as: variant.sh f9 flatten.move=0.009
cd "${0:A:h}/../../../.."
name=$1; shift
dir=$PWD/scratch/v/$name
mkdir -p $dir scratch/runs
${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender} -b --factory-startup \
  -P docs/research/2026-10-25-elephant-arms/run_variant.py -- $dir "$@" > $dir.log 2>&1
echo "== $name $*"
grep -E '^step_flatten|Error' $dir.log
rm -rf scratch/runs/$name
pnpm rig-mesh elephant --check --roles timpanist --keep scratch/runs/$name \
  --set "source=$dir/elephant-arms.glb;paintedWeights=$dir/elephant-weights.json" \
  > scratch/runs/$name.log 2>&1
grep -E '^\| all' scratch/runs/$name.log
for side in R L; do
  pnpm pose-depth timpanist --where upperArm$side beethoven-8-4:565.34 \
    --glb scratch/runs/$name/variant-1.glb 2>&1 | grep -A3 'in body'
done
