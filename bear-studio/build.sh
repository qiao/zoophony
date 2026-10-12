#!/usr/bin/env bash
# Builds the bear conductor from the reference sheet, then checks it.
#
#   ./build.sh            masks -> model, rig, clips -> out/bear.glb -> compare -> motion frames
#   ./build.sh --no-shots stops after the GLB
#
# Needs: python3 with Pillow, Blender 5.2 or later (BLENDER or the PATH), Node 24, and the
# packages of the worktree (three, vite, @playwright/test with Chromium).
set -euo pipefail
cd "$(dirname "$0")"
BLENDER="${BLENDER:-blender}"

echo '[1/4] masks and row profiles of the reference views'
python3 tools/measure.py

echo '[2/4] body field, low-poly mesh, colors, rig, weights, clips -> out/bear.glb'
# The facets come from a QuadriFlow remesh, and its seed decides where each face lands. A few
# seeds put one face across two weight regions (the knee, a wrist, an armpit), and that face
# folds over in one clip. So the build tries the seeds of SEEDS in order and keeps the first
# one whose clips all pass the contact and fold check (tools/bear/contacts.py). With --seed,
# the build uses that seed only.
SEEDS="${SEEDS:-2 8 1 3 4 5 6 7}"
build_once() {
  "$BLENDER" -b --factory-startup --python tools/bear/build.py -- "$@" 2>&1 \
    | grep -E '^(surface nets|remeshed|body:|bone heat|contact|wrote)|Error|Traceback' || true
  test -s out/bear.glb
}
clips_pass() {
  python3 -c "import json, sys; c = json.load(open('out/bear.stats.json'))['contacts']['clips']; bad = [k for k, v in c.items() if not v['pass']]; print('contact check failed: ' + ', '.join(bad)) if bad else None; sys.exit(1 if bad else 0)"
}
if [[ " $* " == *" --seed "* ]]; then
  build_once "$@"
  clips_pass
else
  passed=''
  for seed in $SEEDS; do
    echo "  seed $seed"
    build_once "$@" --seed "$seed"
    if clips_pass; then
      passed=$seed
      break
    fi
  done
  if [[ -z "$passed" ]]; then
    echo "no seed of SEEDS ($SEEDS) passes the contact and fold check" >&2
    exit 1
  fi
  echo "  kept seed $passed"
fi

if [[ " $* " == *" --no-shots "* ]]; then
  exit 0
fi

echo '[3/4] compare the four sheet views (IoU)'
node tools/shoot.mjs compare

echo '[4/4] motion frames and the 4/4 path of the baton tip'
node tools/shoot.mjs frames
node tools/shoot.mjs viewer
"$BLENDER" -b --factory-startup --python tools/bear/pattern.py -- 2>&1 | grep -E '^(beat|wrote)|Error' || true
