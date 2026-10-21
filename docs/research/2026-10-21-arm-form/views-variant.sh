#!/bin/zsh
# Renders the arm gate views of a variant GLB in the working tree, then restores the module.
#   zsh scratch/views-variant.sh <animal> <role> <name> <glb>
A=/private/tmp/claude-501/-Users-xueqiaoxu-proj-zoophony/c225625d-02db-4313-8c42-aa5b65f91182/scratchpad/af/ac
a=$1; role=$2; n=$3; glb=$4
node scratch/swap-module.ts $a $glb || exit 1
pnpm -s arm-check $role --base c964526b --views $A/$n --views-all > $A/$n.txt 2>&1
code=$?
git checkout -- src/models/studio/$a.ts
echo "$n $code"
