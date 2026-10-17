#!/bin/zsh
# Scans the front edge of a level seat for one animal and one thigh slope in a copy of the
# worktree in scratch/: for each front edge (units of the rig), it rigs, exports, and probes the
# seat. It needs Blender 5.2 at /opt/homebrew/bin/blender.
# Usage, from the root of the worktree:
#   docs/research/2026-10-16-hip-open/front-scan.sh <animal> <slope> <front>...
set -euo pipefail
W=$(cd "$(dirname "$0")/../../.." && pwd)
a=$1 slope=$2; shift 2
T=$W/scratch/tree-scan-$a-$slope${TAG:-}
rm -rf $T; mkdir -p $T/scratch
for d in src tools assets public demos docs; do cp -Rc $W/$d $T/; done
cp $W/*.html $W/package.json $W/tsconfig.json $W/vite.config.ts $T/
ln -s $W/node_modules $T/node_modules
cd $T
# The app seat ends at the front edge of the chair of the rig: no move of the body on the chair
# (seatBack 0), and the back edge of the chair of the rig moves forward by the old move, so that
# the body keeps its place on the chair.
perl -0pi -e 's/seatBack: 0\.0[34],/seatBack: 0,/g' tools/studio-body.ts
open=3; sp=fox-red; [[ $a == rabbit ]] && { open=4; sp=rabbit; }
for f in "$@"; do
  legs=$T/scratch/legs-$a-$slope.json
  uv run --no-project --with numpy python -I docs/research/2026-10-16-hip-open/leg_turns.py tools/mesh-rigs/$a.json $slope 8 23.8 2>/dev/null | tail -1 > $legs
  python3 - $a $legs $open $f "${EXTRA:-{\}}" <<'PY'
import json, sys
a, legs, open_, front, extra = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
p = f'tools/mesh-rigs/{a}.json'
c = json.load(open(p))
c['studio']['legTurns'] = json.load(open(legs))
c['studio']['trunk']['open'] = open_
c['chair']['tilt'] = 0
c['chair']['front'] = front
c['chair']['back'] = round(-0.16 + {'fox': 0.04 / 1.5504, 'rabbit': 0.03 / 1.467789}[a], 4)
for path, value in json.loads(extra).items():
    node = c
    keys = path.split('.')
    for k in keys[:-1]:
        node = node[k]
    node[keys[-1]] = value
json.dump(c, open(p, 'w'), indent=2)
PY
  out=$(python3 -c "import json;print(json.load(open('tools/mesh-rigs/$a.json'))['output'])")
  /opt/homebrew/bin/blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- tools/mesh-rigs/$a.json $out > scratch/rig.log 2>&1
  node tools/studio-body.ts $a > /dev/null 2>&1
  node docs/research/2026-10-16-hip-open/seat-probe.ts > scratch/seat.txt 2>&1
  gap=$(grep -h 'sit:' scratch/rig.log | sed -E 's/.*before and ([0-9.]+) cm after.*/\1/')
  top=$(grep -h 'chair: seat top' scratch/rig.log | sed -E 's/.*seat top ([0-9.]+) u.*/\1/')
  line=$(awk -v s="$sp" '$1==s{f=1} f&&NR>0{print} /underside/{if(f)exit}' scratch/seat.txt | tr '\n' ' ')
  seat=$(echo $line | sed -E 's/.*seat ([0-9.]+) cm high at the back, ([0-9.]+) cm deep.*/\1 cm, depth \2 cm/')
  edge=$(echo $line | sed -E 's/.*front edge of the seat is ([-0-9.]+) cm behind it.*/\1/')
  haunch=$(echo $line | sed -E 's/.*back of the haunch z [-0-9.]+: ([-0-9.]+) cm in front of the posts.*/\1/')
  low=$(echo $line | sed -E 's/.*lowest body point over the seat ([-0-9.]+) cm over the seat top at z ([-0-9.]+).*/\1 at z \2/')
  echo "front $f u: rig top $top u, sit gap $gap cm; app seat $seat; edge to knees $edge cm; haunch to posts $haunch cm; lowest $low"
  tag=${TAG:-}
  cp scratch/seat.txt $W/scratch/scan-$a-$slope-$f$tag.txt
  cp scratch/rig.log $W/scratch/scan-$a-$slope-$f$tag.log
done
