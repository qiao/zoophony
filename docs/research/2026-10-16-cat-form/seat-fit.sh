#!/bin/zsh
# Repeats the seat and tail fit of the cat form with Blender and writes the result lines: the front
# scan with the hanging tail (sit.smooth 2, the value before the fit), the rounds of the sit
# smoothing, and the lifts of the tail curl. Each line gives the side view of the haunch above the
# seat top (gap, cm) and the depth of the tail under the seat top (tail, units, negative is into
# it). It uses var.py of this folder, which writes scratch/var/. Run it from the root of the
# worktree, with var.py copied to scratch/: zsh docs/research/2026-10-16-cat-form/seat-fit.sh
set -o pipefail
F='"slope":25,"trunkFactor":0.686144,"girthFactor":[1.08,1.15],"neckFactor":0.65,"chair.halfWidth":0.184'
echo '== front scan, hanging tail, sit.smooth 2'
EXTRA="{\"trunkFactor\":0.686144,\"girthFactor\":[1.08,1.15],\"neckFactor\":0.65,\"chair.halfWidth\":0.184,\"sit.smooth\":2}" TAG=-fit \
  python3 scratch/var.py scan cat 25 0.1 0.08 0.06 0.05 0.04 0.03
P='[[0.05,-0.085,-0.02],[0.1506,-0.118,0.036],[0.1793,-0.1276,0.0995],[0.1468,-0.1161,0.1573],[0.0987,-0.0714,0.1948]]'
lift() { python3 -c "import json,sys;p=json.loads(sys.argv[1]);d=float(sys.argv[2]);print(json.dumps([[a,round(b+d,4),c] for a,b,c in p]))" $P $1; }
echo '== sit.smooth with sit.top 0.2673 and the curl of main'
for s in 2 3 4 5 6 8; do python3 scratch/var.py rig fit-s$s cat "{$F,\"sit.top\":0.2673,\"sit.smooth\":$s,\"studio.tailCurl.points\":$P}" & done; wait
echo '== lifts of the curl with sit.smooth 8'
for d in 0.004 0.006 0.008; do python3 scratch/var.py rig fit-t$d cat "{$F,\"sit.top\":0.2673,\"sit.smooth\":8,\"studio.tailCurl.points\":$(lift $d)}" & done; wait
echo '== other sit rules with sit.smooth 2, sit.top 0.2673, and the curl of main'
for v in '"sit.end":0' '"sit.end":0.003' '"sit.end":0.0075' '"sit.end":0.01' '"sit.end":0.012' '"sit.ramp":0.005' '"studio.trunk.open":0'; do
  n=$(echo $v | tr -dc 'a-z0-9.')
  python3 scratch/var.py rig fit-$n cat "{$F,\"sit.top\":0.2673,\"sit.smooth\":2,\"studio.tailCurl.points\":$P,$v}" | sed "s/^/$v /" &
done; wait
