#!/bin/zsh
# Replays cat_arms.py with BELLY (JSON) into the assets, rigs the cat, exports the app body, and
# measures the trunk form and the lap. Usage: BELLY='{...}' scratch/try.sh <name>
set -o pipefail
name=$1
root=$(git rev-parse --show-toplevel)
cd $root || exit 1
out=scratch/tries/$name
mkdir -p $out
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P scratch/replay.py > $out/arms.log 2>&1 || { echo "arms failed"; exit 1; }
if grep -q Traceback $out/arms.log; then grep -A 12 Traceback $out/arms.log; exit 1; fi
grep '^belly\|step_belly' $out/arms.log | cut -c1-200
pnpm rig-mesh cat > $out/rig.log 2>&1 || { echo "rig failed"; tail -5 $out/rig.log; exit 1; }
grep 'crease:\|triangles' $out/rig.log | cut -c1-160
pnpm studio-body cat > $out/sb.log 2>&1 || { echo "studio-body failed"; exit 1; }
node tools/trunk-form.ts violist --sets rest,play@40 --json $out/tf.json > $out/tf.txt 2>&1
python3 -c "
import json; d=json.load(open('$out/tf.json'))
for r in d['rows']:
    o=r['outlines']; print('  %-8s front gap %.2f dents %d turn %.1f | left %.2f/%d/%.1f right %.2f/%d/%.1f | patch L %.2f/%d R %.2f/%d | facets %.1f %.1f %.1f' % (r['name'], o[0]['gap']*100, o[0]['dents'], o[0]['turn'], o[1]['gap']*100, o[1]['dents'], o[1]['turn'], o[2]['gap']*100, o[2]['dents'], o[2]['turn'], o[3]['gap']*100, o[3]['dents'], o[4]['gap']*100, o[4]['dents'], *r['facets']))"
node scratch/belly.ts --bind --from 0.1 --to 0.8 --levels 28 | grep 'front:' | sed 's/^/  bind /'
node scratch/lap.ts --bind --json $out/lap.json | sed 's/^/  /'
node scratch/lap.ts --pose rest | sed 's/^/  /'
