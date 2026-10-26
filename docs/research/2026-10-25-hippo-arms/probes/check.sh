#!/bin/zsh
# usage: scratch/check.sh <out dir> <variant spec>...
# A spec is <var name>[:<extra changes>]: the glb and weights of scratch/var/<name>, then the
# extra changes of rig-mesh --set.
set -o pipefail
# Run it from the root of the tree.
out=$1
shift
mkdir -p $out
args=()
for spec in "$@"; do
  name=${spec%%:*}
  extra=""
  [[ $spec == *:* ]] && extra=";${spec#*:}"
  args+=(--set "source=scratch/var/$name/hippo-arms.glb;paintedWeights=scratch/var/$name/hippo-weights.json$extra")
done
pnpm rig-mesh hippo --check --keep $out "${args[@]}" > $out/check.log 2>&1
code=$?
grep -A12 '^| Variant | Triangles' $out/check.log | grep '^| \(base\|source\)' | cut -d'|' -f2,12-15 | sed 's/source=scratch.var.\([a-z0-9]*\)[^;]*;paintedWeights=[^;|]*/\1/'
exit $code
