#!/bin/zsh
# Rigs a raise list of the dog (the config of the tree otherwise) into scratch/df/out-<name>/ and prints the
# folds of each sample set with a hold change. Usage, from the root of the tree:
# docs/research/2026-10-17-dog-folds/rig-hold.sh <name> <raise.json> <changes>
set -e
name=$1; raise=$2; hold=$3
out=scratch/df/out-$name; mkdir -p $out
python3 -I docs/research/2026-10-17-dog-mesh/variant.py tools/mesh-rigs/dog.json $out/dog.json "raise=$(cat $raise)"
/opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- $out/dog.json $out/dog.rig.glb --check > $out/rig.log 2>&1
node docs/research/2026-10-17-dog-folds/keys-glb.ts $out/dog.rig.glb $out/keys.json --step 1 --set "$hold" > /dev/null
node -e "
const a=JSON.parse(require('fs').readFileSync('$out/keys.json','utf8'));
for (const set of ['rest','play','lift']) { const l=a.filter(s=>s.set===set); const c=new Map(); let n=0; for(const s of l){ if(s.folded.length) n++; for(const f of s.folded) c.set(f,(c.get(f)||0)+1);} console.log('$name', set, n+'/'+l.length, (100*n/l.length).toFixed(1)+'%', [...c.entries()].sort((x,y)=>y[1]-x[1]).slice(0,8).map(([f,k])=>f+':'+k).join(' ')); }"
