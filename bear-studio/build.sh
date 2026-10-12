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
"$BLENDER" -b --factory-startup --python tools/bear/build.py -- "$@" 2>&1 \
  | grep -E '^(surface nets|remeshed|body:|bone heat|contact|wrote)|Error|Traceback' || true
test -s out/bear.glb
# Each clip must pass the contact check (tools/bear/contacts.py).
python3 -c "import json, sys; c = json.load(open('out/bear.stats.json'))['contacts']['clips']; bad = [k for k, v in c.items() if not v['pass']]; sys.exit('contact check failed: ' + ', '.join(bad) if bad else 0)"

if [[ " $* " == *" --no-shots "* ]]; then
  exit 0
fi

echo '[3/4] compare the four sheet views (IoU)'
node tools/shoot.mjs compare

echo '[4/4] motion frames and the 4/4 path of the baton tip'
node tools/shoot.mjs frames
node tools/shoot.mjs viewer
"$BLENDER" -b --factory-startup --python tools/bear/pattern.py -- 2>&1 | grep -E '^(beat|wrote)|Error' || true
