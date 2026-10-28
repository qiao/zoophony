#!/bin/zsh
# full.sh <label> <cat_arms.py> [<raise json>]: builds the copy with the script, rigs it (with the
# raise rules when given), and runs the violist gate, the fold probe, the crease probes, and the
# app renders. Outputs in $OUT/<label>.
OUT=${OUT:?set OUT}
d=$OUT/$1
mkdir -p $d
git checkout tools/mesh-rigs/cat.json assets/models/cat/cat.rig.glb src/models/studio/cat.ts assets/models/cat/cat-arms.glb assets/models/cat/cat-weights.json 2> /dev/null
cp $2 tools/blender/cat_arms.py
if [ -n "$3" ]; then
node -e '
const fs=require("fs"); const c=JSON.parse(fs.readFileSync("tools/mesh-rigs/cat.json","utf8"));
c.raise=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
fs.writeFileSync("tools/mesh-rigs/cat.json", JSON.stringify(c,null,2)+"\n");' $3
fi
zsh scratch/build.sh $d > $d/build.txt 2>&1 || { echo build failed; tail -5 $d/build.txt; exit 1; }
grep -E 'step_clean_pit|step_round_ends' $d/blender.log | cut -c1-200
pnpm arm-check violist --base main > $d/gate.txt 2>&1
grep -E '^\| violist \| [LR] \| [0-9]' $d/gate.txt
pnpm fold-probe violist --base main --faces 40 > $d/fold.txt 2>&1
sed -n '9,11p' $d/fold.txt; grep -E '\| (new|gone) \|' $d/fold.txt | cut -c1-120
AT=(); for a in rest:#0 play:10 play:30 play:50 play:70 lift:#3 lift:#4 lift:#5 lift:#6 lift:#7 lift:#10 lift:#15 lower:#5 lower:#10 lower:#12 lower:#13 lower:#14 lower:#15; do AT+=(--at boulanger-matin:$a); done; AT+=(--at brahms-2:play:13.38)
node scratch/root-crease.ts --side L --top 4 $AT > $d/crease-L.txt 2>&1
node scratch/root-crease.ts --side R --top 4 $AT > $d/crease-R.txt 2>&1
pnpm close-views play $d/img --demo boulanger-matin --at cat --time 30 --azimuth -72 --azimuth -110 --azimuth 150 --azimuth -150 --azimuth 72 --elevation 28 --zoom 3.5 > $d/img.log 2>&1 || echo render failed
pnpm close-views play $d/img-rest --demo boulanger-matin --at cat --time 30 --pause --azimuth -72 --azimuth -90 --azimuth 150 --azimuth -150 --azimuth 72 --elevation 28 --zoom 3.5 > $d/img-rest.log 2>&1 || echo render failed
echo "full $1 done"
