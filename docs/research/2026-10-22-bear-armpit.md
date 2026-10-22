# The flaps under the arms of the bear conductor

Date 2026-10-22. Round `bear-armpit`, base `5593e92b`. Decisions:
[`2026-10-22-mesh-bear.md`](../decisions/2026-10-22-mesh-bear.md). The probes and their outputs
are in [`2026-10-22-bear-armpit/`](2026-10-22-bear-armpit/). Each command runs from the root of
the tree. The probes import `../tools/` and `../src/`, so copy a probe to `scratch/` before you run
it. `with-glb.ts` runs a probe on a kept rig.

## 1. The question

The user said: "the bear has deformed meshes under the arm". With the arms raised in the beat, a
dark, flat wedge hangs from each arm down to the side of the trunk, past the outline of the trunk.
The goal: no flap, no black wedge, and no dark patch from each view, with the rest pose of
`5593e92b`.

## 2. The cause

`dump.ts` writes the posed body of a play sample, and `faces.py` draws it with the index of each
face. In brahms-2 at 718.38 s, the faces of the flap are 558, 559, 394 to 397, 628, and 629 under
the right arm and 2204, 2005, 2009, 2010, 1326, 1327, and 1329 under the left arm (module of
`5593e92b`, `flap-faces-posed.webp`). They are trunk faces: each corner has an arm weight of 0.1 to
0.3, and a corner at the top of the cut has 0.79.

```text
 source section at y 0.49 (left arm, seen from above)

   trunk |x| < 0.193        arm x 0.195 .. 0.353
                       +-----------------------+  z +0.044
                       |     free arm          |
                       |   (gap < 0.085 u)     |
   - - - - - chain of the arm joints  z -0.03 -|
                       |.......................|
                       |  back strip of the    |  z -0.12  gap 0.087 .. 0.089 u
                       |  root: on the trunk   |
                       +-----------------------+
```

The free arm is the part beyond `armSplit` and within 0.085 u of the chain of the arm joints
(`weights.armFree`). The arm root reaches farther back than forward. Its back strip lies 0.087 u to
0.089 u from the chain, so it stays on the trunk, and the cut gives it to the trunk with the rim of
the body caps. Bone heat gives it 0.2 to 0.3 of arm weight. In the bind pose with the raised bind
arms, it already sticks out past the trunk (`flap-faces-bind-rest-side.webp`). At rest, the
hanging arm covers it. A raised arm pulls it out and down as a flat wedge that faces down or back,
so it shades dark. The caps, the quads, and the normals of the cut are not the cause.

`weights.armBelow` gives the trunk all the arm weight below a height. The strip then keeps its
source place, which still sticks out from the trunk, and the corrective shapes fail
(`check-armbelow.txt`). The strip is a part of the arm, so the fix gives it to the free arm.

## 3. The measure

`flap.ts` takes the trunk faces of a box under each arm (each corner with less than half of its
weight on the arm) and gives, for each play sample, the area of the faces that face down (normal y
below -0.3). The caps and the rim of the cut take the normals of the skin in the app, so the column
"own" leaves them out. Play, step 1 s, all demos, p50 (`flap-*.txt`):

| Measure | red fox | `5593e92b` | round |
|---|---:|---:|---:|
| Down area, own normals, L / R (cm²) | 4.7 / 5.4 | 55.7 / 56.5 | 19.2 / 23.3 |
| Down area, all trunk faces, L / R (cm²) | 4.7 / 5.4 | 411.5 / 230.5 | 109.6 / 185.1 |
| Upper arms in the body, play / arms (cm) | | 0.8 / 0.0 | 0.9 / 0.3 |
| Folds play / lift / rest | | 2.9% / 7.7% / 0% | 2.8% / 7.5% / 0% |
| Crease share L / R (`pnpm arm-look`) | | 2.1% / 4.5% | 1.6% / 1.9% |
| Section L / R (`pnpm arm-look`) | | 0.77 / 0.63 | 0.97 / 0.75 |

The remaining "own" area is the notch of the source below the caps, which faces down in each pose.

## 4. The variants

`variants.txt` gives each variant with its log. A radius of 0.1 freed the strip, but the quad at
the top of the cut then folded in 36% of the play samples. A radius of 0.095 freed the strip and
also the front edge of the root (0.085 u from the chain), and in the sweep that corner went 4.3 cm
into the body. The free arm and the cut also left a kept face of the left notch with two edges in
the hole, and the cap repeated it with the opposite winding (`cutprobe.py`).

Two new rules of `tools/blender/rig_mesh.py`, each behind its own key, so that each other config
keeps its rig:

- `weights.armFree.shift` moves the chain of the arm joints before the distance. The bear takes
  0.01 u back with the radius 0.09: the back strip is 0.079 u to 0.080 u from the chain, and the
  front edge 0.095 u.
- `cut.fins` removes each kept face of a side that sticks into the hole with two edges, when its
  corner between these edges has no other kept face (`cut_fins()`). It removes one face on each
  side of the bear.

## 5. The result

`pnpm rig-mesh bear` and `pnpm studio-body bear` wrote the rig (`rig-write.txt`). The crop pairs
(`pairs-*.webp`, `5593e92b` above, the round below) show the front, the back, the left, the right,
az150, and az-150 at each moment of `ROLE_VIEWS.conductor`. The flaps are gone from each view. The
rest pose keeps no black wedge. The dark areas under the raised arms from the front and the sides
are the cast shadows of the arms: with `--probe noshadow`, no dark patch shows
(`noshadow-beat.webp`). The strips of boulanger-matin (fast) and mozart-k315 (slow) at the four
azimuths are `strip-*.webp` (`strips.sh`, the camera of `cams.py`).

`pnpm body-probe --base 5593e92b` changes only the 5 bear bodies and the conductor
(`body-probe.txt`). The folds and the depths of section 3 are in `fold-probe.txt` and
`pose-depth.txt`.

## 6. The arm gate

`pnpm arm-check conductor --base 5593e92b` (`arm-check.txt`):

| Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | paw swing p95 | stretch p95 | grip turn p50 | move twist max | move turn max | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L | 0 (0) | 33 (28) | 14 (14) | 0.78 (0.82) | 49 (49) | 25 (25) | 0.21 (0.20) | 2 (2) | 53 (53) | 468 (455) | PASS |
| R | 0 (0) | 33 (23) | 11 (11) | 0.84 (0.84) | 41 (41) | 34 (34) | 0.24 (0.24) | 4 (4) | 79 (73) FAIL | 1183 (1150) | FAIL |

`pnpm arm-check --all --base 5593e92b` gives the same `FAIL` and no other (`arm-check-all.txt`).
The bones of the poses change because the hang of the rest arm reads the radius of the upper arm
from its corners (`radiusOf()` of `src/pose/hang.ts`). With the back strip, the radius grows, and
the rest wrist hangs 2.2 cm to 2.5 cm further out (`hang.ts`). The lift from that rest turns the
right paw 79° on the forearm at its worst sample, mozart-k191 lift at 74.83 s, wall 0.13 s
(`moves.ts`), against 73° on the base. The limit is 176°, and the margin of the base is 3°.

## 7. The other bodies

The same measure on the other roles (`flap-trombonist.txt`, `flap-tubist.txt`, `flap-harpist.txt`,
`flap-cellist.txt`), play p50, own normals, L / R: panda 34.7 / 32.5, rhino 114.4 / 211.2, deer
10.2 / 13.8, dog 16.5 / 18.4. On the panda, the down faces are trunk faces next to the cut with an
arm weight of 0.23 to 0.46 at each corner, as on the bear. On the rhino, the largest down faces
(125, 371, 372) have no arm weight, so they are the form of the trunk. The deer and the dog have no
cut, and their measure is near the red fox.
