#!/bin/zsh
# Rigs one variant of a mesh rig config with the scratch dump script, then measures the look.
#   zsh scratch/variant.sh <animal> <role> <name> '<jq filter>'
set -o pipefail
S=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/c225625d-02db-4313-8c42-aa5b65f91182/scratchpad/af/var
mkdir -p $S
a=$1; role=$2; n=$3; f=$4
jq "$f" tools/mesh-rigs/$a.json > $S/$a-$n.json || exit 1
blender -b --factory-startup --python-exit-code 1 --python scratch/rig_mesh_dump.py -- $S/$a-$n.json $S/$a-$n.glb --faces $S/$a-$n-faces.json > $S/$a-$n-rig.log 2>&1 || { echo "rig failed $a $n"; tail -5 $S/$a-$n-rig.log; exit 1; }
node scratch/arm-look.ts $role --step 1 --faces $S/$a-$n-faces.json --glb $S/$a-$n.glb > $S/$a-$n-look.txt 2>&1 || { echo "look failed $a $n"; tail -5 $S/$a-$n-look.txt; exit 1; }
echo "done $a $n"
