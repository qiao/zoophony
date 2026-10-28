#!/bin/zsh
# try.sh <label> <raise JSON (a rule or a list)>: rigs the cat of this tree with the raise rules,
# writes the body module, and runs the crease probe. The outputs go to $OUT/<label>.
set -o pipefail
OUT=${OUT:?set OUT}
label=$1
mkdir -p $OUT/$label
git checkout tools/mesh-rigs/cat.json assets/models/cat/cat.rig.glb src/models/studio/cat.ts
node -e '
const fs=require("fs"); const c=JSON.parse(fs.readFileSync("tools/mesh-rigs/cat.json","utf8"));
c.raise=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
fs.writeFileSync("tools/mesh-rigs/cat.json", JSON.stringify(c,null,2)+"\n");' $2
pnpm rig-mesh cat > $OUT/$label/rig.log 2>&1 || { echo rig failed; tail -5 $OUT/$label/rig.log; exit 1; }
pnpm studio-body cat > $OUT/$label/body.log 2>&1 || { echo body failed; tail -5 $OUT/$label/body.log; exit 1; }
grep -E 'rig_mesh: raise|shape arm_raise' $OUT/$label/rig.log
node scratch/root-crease.ts --side L --top 4 > $OUT/$label/crease-L.txt 2>&1
tail -11 $OUT/$label/crease-L.txt | cut -c1-80
