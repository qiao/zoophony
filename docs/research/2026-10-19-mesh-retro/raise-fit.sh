#!/bin/zsh
# Runs `pnpm raise-fit` on the six rules of the mouse and the elephant, with the rigs before the
# shapes (elephant 4280e3d5, mouse 44037ac4), and the fold probe of the mouse rig before the rigid
# face (9c38bfcd). Run it from the root of the tree. The rigs go into scratch/.
set -e
G=scratch/mesh-retro-glb
O=docs/research/2026-10-19-mesh-retro
mkdir -p $G
git show 4280e3d5:assets/models/elephant/elephant.rig.glb > $G/elephant-4280e3d5.glb
git show 44037ac4:assets/models/mouse/mouse.rig.glb > $G/mouse-44037ac4.glb
git show 9c38bfcd:assets/models/mouse/mouse.rig.glb > $G/mouse-9c38bfcd.glb
E=$G/elephant-4280e3d5.glb
M=$G/mouse-44037ac4.glb
pnpm -s raise-fit timpanist --faces 1210,2383,1202,1211,2312 --side L --bone hand --glb $E > $O/raise-fit-elephant-wrist-L.txt
pnpm -s raise-fit timpanist --faces 54,57,97,98,107,329 --side R --bone hand --glb $E > $O/raise-fit-elephant-wrist-R.txt
pnpm -s raise-fit timpanist --faces 959 --side L --glb $E > $O/raise-fit-elephant-arm-L.txt
pnpm -s raise-fit timpanist --faces 133,330 --side R --glb $E > $O/raise-fit-elephant-arm-R.txt
pnpm -s raise-fit oboist --faces 2041,2120 --side L --glb $M > $O/raise-fit-mouse-play.txt
pnpm -s raise-fit oboist --faces 2056,2120,2594 --side L --sets rest --glb $M > $O/raise-fit-mouse-rest.txt
pnpm -s fold-probe oboist --step 1 --faces 6 --glb $G/mouse-9c38bfcd.glb > $O/fold-probe-mouse-9c38bfcd.txt
