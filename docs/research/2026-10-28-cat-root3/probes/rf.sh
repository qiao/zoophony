#!/bin/zsh
# rf.sh <label> <raise json>: rigs this tree with the raise rules on the config of main, and runs
# the fold probe and the right crease probe. Outputs in $OUT/<label>.
OUT=${OUT:?set OUT}
d=$OUT/$1; mkdir -p $d
node -e '
const fs=require("fs"); const c=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
c.raise=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
fs.writeFileSync("tools/mesh-rigs/cat.json", JSON.stringify(c,null,2)+"\n");' $2 ${BASECFG:?set BASECFG}
cp $2 $d/raise.json
pnpm rig-mesh cat > $d/rig.log 2>&1 || { echo rig failed; exit 1; }
pnpm studio-body cat > $d/body.log 2>&1 || { echo body failed; exit 1; }
grep -E 'raise arm_raise_R' $d/rig.log | grep -o '[0-9]* faces turn over before and [0-9]* after [0-9]* rounds'
pnpm fold-probe violist --base main --faces 40 > $d/fold.txt 2>&1
sed -n '9,11p' $d/fold.txt | cut -c60-200; grep -E '\| (new|gone) \|' $d/fold.txt | cut -c1-100
