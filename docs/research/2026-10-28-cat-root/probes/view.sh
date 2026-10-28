#!/bin/zsh
# view.sh <label> [<at>]: renders the posed body of this tree around the left arm root with the
# crease vertices marked, into $OUT/<label>/view-*.png.
set -o pipefail
OUT=${OUT:?set OUT}
at=${2:-boulanger-matin:play:30}
mkdir -p $OUT/$1
node scratch/mark-obj.ts $OUT/$1/view.obj --at $at --mark 1574,1295 --mark 896,1292 --mark 895,894,1608 --mark 1291,1605,897 > /dev/null
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python scratch/armviews.py -- $OUT/$1/view.obj $OUT/$1/view -0.14,0.88,-0.12 0.35 -72:28,-110:28 smooth > $OUT/$1/view-blender.log 2>&1 || echo blender failed
