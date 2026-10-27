#!/bin/zsh
# Usage: variants.sh name json [name json]...: runs each Blender variant of deer_arms.py in
# parallel, with variant.py copied to scratch/probes/, into scratch/var/<name>/.
cd "$(git rev-parse --show-toplevel)"
pids=()
while [ $# -gt 0 ]; do
  name=$1; json=$2; shift 2
  mkdir -p scratch/var/$name
  VARIANT=$json /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scratch/probes/variant.py -- scratch/var/$name > scratch/var/$name/log.txt 2>&1 &
  pids+=($!)
done
for p in $pids; do wait $p; done
