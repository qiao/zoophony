#!/bin/zsh
# Runs the sweep of the pianist on GLB with PIANO_FRONT_H set by a temporary edit of piano.ts
# (and BODY_LOOPS of the sweep when LOOPS is set), with the sets given as the remaining
# arguments. OUT names the output file. TOOL (default pose-depth) names the probe.
set -u
GLB=$1; FRONT=$2; OUT=$3; shift 3
F=src/models/instruments/piano.ts
S=src/pose/test-sweep-roles.ts
cp $F scratch/pb/piano.ts.bak
cp $S scratch/pb/sweep.ts.bak
trap 'cp scratch/pb/piano.ts.bak $F; cp scratch/pb/sweep.ts.bak $S' EXIT
perl -0pi -e "s/export const PIANO_FRONT_H = [0-9.]+;/export const PIANO_FRONT_H = $FRONT;/" $F
if [[ -n "${LOOPS:-}" ]]; then perl -0pi -e "s/const BODY_LOOPS = 2;/const BODY_LOOPS = $LOOPS;/" $S; fi
args=()
glb=()
if [[ "$GLB" != "-" ]]; then glb=(--glb $GLB); fi
for s in "$@"; do args+=(--set "$s"); done
if [[ "${TOOL:-pose-depth}" == pose-depth ]]; then
  pnpm -s pose-depth pianist "${glb[@]}" --every ${EVERY:-8} --gaps "${args[@]}" > $OUT 2>&1
else
  pnpm -s ${=TOOL} "${glb[@]}" "${args[@]}" > $OUT 2>&1
fi
