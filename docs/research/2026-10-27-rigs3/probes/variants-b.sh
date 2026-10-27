#!/bin/zsh
# Runs each variant of part B from the config of main, and prints the hard edges of both legs
# (zone_turns.py), the turns of the edges of the dark face, and the lowest vertex.
#   zsh scratch/b/variants-b.sh > variants-b.txt
cd /Users/xueqiaoxu/proj/zoophony/.claude/worktrees/fifth-rigs3
export CONFIG=scratch/b/polar-bear-main.json TOP=0
git show main:tools/mesh-rigs/polar-bear.json > $CONFIG
PY="uv run --no-project --with numpy python -I"
show() {  # show <step dir>
  ${=PY} scratch/b/zone_turns.py $1 | head -1
  ${=PY} scratch/b/mirror.py $1 $1-R > /dev/null
  ${=PY} scratch/b/zone_turns.py $1-R | head -1
  ${=PY} scratch/b/edge_steps.py $1 2214-2251,2222-2251,1143-2215 | tail -1
  ${=PY} scratch/b/lowest.py $1 | head -1
}
rig() {  # rig <name> <python statements on c>
  echo "== $1: $2"
  scratch/b/run.sh $1 "$2" > /dev/null 2>&1 || echo "run failed"
  show scratch/b/steps-$1
}
proto() {  # proto <name> <script> <args...>
  local name=$1 script=$2; shift 2
  echo "== $name: $script $*"
  ${=PY} scratch/b/$script scratch/b/steps-base scratch/b/p-$name "$@" | tail -1
  show scratch/b/p-$name
}
rig base 'pass'
for v in 0.14 0.15 0.17 0.18; do rig ring16-$v "c['refine']['rings'][6]['offset'] = $v"; done
for v in 0.14 0.19 0.2; do rig ring-add-$v "r = dict(c['refine']['rings'][6]); r['offset'] = $v; c['refine']['rings'].append(r)"; done
for v in 0.17 0.2 0.22; do rig legflip-$v "c['refine']['legFlip']['radius'] = $v"; done
echo "== the flip of the bad source diagonal 1143-1308"
${=PY} scratch/b/flip_check.py scratch/b/steps-base 1143 1308 | tail -4
proto move-fade fade_proto.py 0.05 10
proto band-bump band_proto.py 0.07 0.13 6 0.5 bump
proto stop-0.12-0.16 stop_proto.py 0.12 0.16
proto stop-0.08-0.12 stop_proto.py 0.08 0.12
proto slide-none slide_proto.py none
proto slide-fall slide_proto.py fall
proto slide-0.5 slide_proto.py 0.5
for r in 0.12 0.13 0.15; do proto reach-$r slide_proto.py 1 $r 12; done
proto cluster-0.005 cluster_proto.py 0.005
proto cluster-0.012 cluster_proto.py 0.012
SHIN=0.07 proto shin-reach-0.07 shin_proto.py 1
KIND=taubin proto taubin kind_proto.py 1 0.105 24
proto fair-inner-0.2-24 fair_proto.py 0.03 0.2 24 0.5
proto fair-inner-0.2-48 fair_proto.py 0.03 0.2 48 0.5
rig fair-0.2 "c['kneeCrease']['fair'] = {'from': 0.03, 'to': 0.2, 'radius': 9, 'rounds': 24, 'share': 0.5}"
rig fair-0.16 "c['kneeCrease']['fair'] = {'from': 0.03, 'to': 0.16, 'radius': 0.09, 'rounds': 24, 'share': 0.5}"
rig final "c['kneeCrease']['fair'] = {'from': 0.03, 'to': 0.17, 'radius': 0.09, 'rounds': 24, 'share': 0.5}"
