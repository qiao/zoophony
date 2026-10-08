#!/bin/zsh
# Runs all phases of the gated fox spike, from the sheet to the GLB file and the images.
#
#   tools/spike/fox-gated/run_all.sh <work-dir> [<triangles>]
#
# The variable BLUR sets the blur passes of the forms (default 4). PLANES sets the faces for
# each plane of the low-poly pass (default 5), and STRENGTH the snap to the planes (default
# 0.75, see `facets.py`).
#
# The work folder gets the intermediate files: matte field, blend files, renders, and gate
# results. Python with Pillow, numpy, and scipy comes from uv. Blender comes from BLENDER, or
# from /opt/homebrew/bin/blender. The script stops at the first failure.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
SPIKE=$ROOT/tools/spike/fox-gated
WORK=${1:?usage: run_all.sh <work-dir> [triangles]}
TRIANGLES=${2:-2400}
BLENDER=${BLENDER:-/opt/homebrew/bin/blender}
SHEET=$ROOT/docs/reference/fox-views.png
MATTE=$ROOT/docs/research/2026-10-08-fox-spike-gated/fox-matte.png
PY=(uv run --no-project --with pillow --with numpy --with scipy python)
mkdir -p "$WORK"
cd "$ROOT"

echo '--- phase 0: matte and matte field'
"${PY[@]}" "$SPIKE/sheet_matte.py" "$SHEET" "$MATTE"
"${PY[@]}" "$SPIKE/matte_field.py" "$MATTE" "$WORK/matte-field.npy" "$WORK/fox-field.npy"

echo '--- phase 2: blockout'
"$BLENDER" -b --factory-startup --python "$SPIKE/build_fox.py" -- --phase blockout \
  --out "$WORK/blockout" --voxel 0.008 > "$WORK/blockout.log" 2>&1
"${PY[@]}" "$SPIKE/gate.py" "$WORK/blockout/sil.png" "$MATTE" "$WORK/blockout/diff.png" \
  "$WORK/blockout/gate.json"

echo '--- phase 3: forms'
"$BLENDER" -b --factory-startup --python "$SPIKE/build_fox.py" -- --phase forms \
  --out "$WORK/forms" --field "$WORK/matte-field.npy" --voxel 0.006 --blur ${BLUR:-4} \
  > "$WORK/forms.log" 2>&1
"${PY[@]}" "$SPIKE/gate.py" "$WORK/forms/sil.png" "$MATTE" "$WORK/forms/diff.png" \
  "$WORK/forms/gate.json"

echo '--- low-poly pass'
"$BLENDER" -b --factory-startup --python "$SPIKE/lowpoly.py" -- --forms "$WORK/forms/fox.blend" \
  --sheet "$SHEET" --matte "$MATTE" --out "$WORK/lowpoly" --triangles "$TRIANGLES" \
  --planes "${PLANES:-5}" --strength "${STRENGTH:-0.75}" --fox-field "$WORK/fox-field.npy" \
  > "$WORK/lowpoly.log" 2>&1
grep -E '^remesh|^planes|^contour|^triangles' "$WORK/lowpoly.log"
"$BLENDER" -b --factory-startup --python "$SPIKE/facet_metrics.py" -- \
  --blend "$WORK/lowpoly/lowpoly.blend" --json "$WORK/lowpoly/facets.json" 2>&1 | grep '^facets'
"$BLENDER" -b --factory-startup --python "$SPIKE/render_views.py" -- \
  --blend "$WORK/lowpoly/lowpoly.blend" --out "$WORK/lowpoly/sil.png" --silhouette \
  > /dev/null 2>&1
"${PY[@]}" "$SPIKE/gate.py" "$WORK/lowpoly/sil.png" "$MATTE" "$WORK/lowpoly/diff.png" \
  "$WORK/lowpoly/gate.json"

echo '--- rig, poses, and GLB'
"$BLENDER" -b --factory-startup --python "$SPIKE/rig.py" -- --lowpoly "$WORK/lowpoly/lowpoly.blend" \
  --out "$WORK/rig" > "$WORK/rig.log" 2>&1
grep -E '^skin|^bones|^glb' "$WORK/rig.log"
for pose in arm-raised head-turned bow-moved; do
  "$BLENDER" -b --factory-startup --python "$SPIKE/render_views.py" -- \
    --blend "$WORK/rig/pose-$pose.blend" --object FoxRig --out "$WORK/rig/pose-$pose.png" \
    --chair > /dev/null 2>&1
done

echo '--- final renders'
"$BLENDER" -b --factory-startup --python "$SPIKE/render_views.py" -- \
  --blend "$WORK/rig/rigged.blend" --object FoxRig --out "$WORK/fox-views-render.png" \
  > /dev/null 2>&1
"$BLENDER" -b --factory-startup --python "$SPIKE/render_views.py" -- \
  --blend "$WORK/rig/rigged.blend" --object FoxRig --out "$WORK/fox-views-chair.png" --chair \
  > /dev/null 2>&1
"$BLENDER" -b --factory-startup --python "$SPIKE/render_views.py" -- \
  --blend "$WORK/rig/rigged.blend" --object FoxRig --out "$WORK/fox-views-silhouette.png" \
  --silhouette > /dev/null 2>&1
"${PY[@]}" "$SPIKE/gate.py" "$WORK/fox-views-silhouette.png" "$MATTE" "$WORK/final-diff.png" \
  "$WORK/final-gate.json"
"${PY[@]}" "$SPIKE/compose.py" "$SHEET" "$MATTE" "$WORK/fox-views-render.png" "$WORK"

echo '--- proportions: blockout, forms, final'
for sil in blockout/sil.png forms/sil.png fox-views-silhouette.png; do
  "${PY[@]}" "$SPIKE/proportions.py" "$MATTE" "$WORK/$sil" | tail -1
done
