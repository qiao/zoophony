#!/bin/zsh
# tr.sh <label> <raise json>: rigs the copy of this tree with the raise rules, makes the body
# module, and runs the crease probe on both sides and the open loops. Outputs in $OUT/<label>.
set -o pipefail
OUT=${OUT:?set OUT}
d=$OUT/$1
mkdir -p $d
git checkout tools/mesh-rigs/cat.json assets/models/cat/cat.rig.glb src/models/studio/cat.ts
node -e '
const fs=require("fs"); const c=JSON.parse(fs.readFileSync("tools/mesh-rigs/cat.json","utf8"));
c.raise=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
fs.writeFileSync("tools/mesh-rigs/cat.json", JSON.stringify(c,null,2)+"\n");' $2
cp $2 $d/raise.json
pnpm rig-mesh cat > $d/rig.log 2>&1 || { echo rig failed; tail -5 $d/rig.log; exit 1; }
pnpm studio-body cat > $d/body.log 2>&1 || { echo body failed; tail -5 $d/body.log; exit 1; }
grep -E 'arm_raise_L.*turn over|fill the skin' $d/rig.log | sed 's/rig_mesh: raise //' | cut -c1-200
AT=(); for a in rest:#0 play:10 play:30 play:50 play:70 lift:#3 lift:#4 lift:#5 lift:#6 lift:#7 lift:#10 lift:#15 lower:#5 lower:#10 lower:#12 lower:#13 lower:#14 lower:#15; do AT+=(--at boulanger-matin:$a); done; AT+=(--at brahms-2:play:13.38)
node scratch/root-crease.ts --side L --top 4 $AT > $d/crease-L.txt 2>&1 &
node scratch/body-loops.ts > $d/loops.txt 2>&1 &
wait
