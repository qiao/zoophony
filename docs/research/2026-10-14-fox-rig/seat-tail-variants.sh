#!/bin/zsh
# Rigs variants of the seat and of the tail of the fox config, and prints the lines of the rig log
# on the faces that turn over in the bind, the seat, and the tail. No fold probe runs.
# Usage: docs/research/2026-10-14-fox-rig/seat-tail-variants.sh
cd "$(dirname "$0")/../../.."
mkdir -p scratch/var
run() {
  python3 -c "
import json
c=json.load(open('tools/mesh-rigs/fox.json'))
w=c['weights']
$2
json.dump(c,open('scratch/var/fox-$1.json','w'))"
  blender -b --factory-startup --python-exit-code 1 --python tools/blender/rig_mesh.py -- scratch/var/fox-$1.json scratch/var/fox-$1.glb > scratch/var/log-$1 2>&1 || echo "$1: rig failed"
  echo "$1: $(grep -E 'rounds of relaxing|tail goes|seat top|tail: the lowest' scratch/var/log-$1 | sed 's/rig_mesh: //' | tr '\n' ' ')"
}
T86="c['studio']['legTurns']['thigh']=[0.673056,-0.035264,-0.100871,0.731831]"
run seat-a "$T86; w['haunch']['height']=[0.2,0.27]"
run seat-b "$T86; w['haunch']['height']=[0.18,0.29]"
run seat-c "w['haunch']['height']=[0.2,0.3]"
run seat-kept "pass"
run tail-a "c['studio']['tailBind']={'tail':[0,-0.45,-1],'tail_tip':[0,-0.8,-1]}"
run tail-b "c['studio']['tailBind']={'tail':[0,-0.35,-1],'tail_tip':[0,-0.8,-1]}"
run tail-c "c['studio']['tailBind']={'tail':[0,-0.25,-1],'tail_tip':[0,-1.4,-1]}"
run tail-d "c['studio']['tailBind']={'tail':[0,-0.2,-1],'tail_tip':[0,-1.4,-1]}"
run tail-e "c['studio']['tailBind']={'tail':[0,-0.12,-1],'tail_tip':[0,-1.7,-1]}"
