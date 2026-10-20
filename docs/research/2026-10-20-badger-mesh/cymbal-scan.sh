#!/bin/zsh
# Scans the arm factors and the crash places of the cymbalist: depth of the plates and reach.
cd /Users/xueqiaoxu/proj/zoophony
for f in 1 1.1 1.2 1.25; do
  cp scratch/arms/f$f.glb assets/models/badger/badger.rig.glb
  pnpm -s studio-body badger > /dev/null
  echo "== arm factor $f"
  pnpm -s pose-depth cymbalist --demo boulanger-matin --set "percussion.crash=0,0,-1" --set "percussion.crash=0,0.3,-1.2" --set "percussion.crash=0,0.3,-1.4" 2>&1 | sed -n '/^| variant | play/,/^$/p'
done
cp scratch/badger-f1.rig.glb assets/models/badger/badger.rig.glb
pnpm -s studio-body badger > /dev/null
