# The mouse mesh of the user as the oboist

Date 2026-10-19. Round `mesh-mouse`. Decisions:
[`2026-10-19-mesh-mouse.md`](../decisions/2026-10-19-mesh-mouse.md). The probes and their outputs
are in [`2026-10-19-mouse-mesh/`](2026-10-19-mouse-mesh/). Each command runs from the root of the
tree, and the base is `ab002346`, the commit before the round.

## 1. The question

The user gave a textured mesh of a mouse with no skeleton (`assets/models/mouse/mouse.glb`), and
asked for no questions. The oboe mice get it by route 3. The measures that decide are the size
against the reference images, the reach of the oboe grips, the clearance of the sweep, and the
play folds.

## 2. The measures

**Size.** No reference image shows a mouse, so the size of the reference does not apply, and the
mouse takes the head height of the red fox, as the cat, the dog, the panda, and the hippo
(`landmark-probe.txt`):

| Image | Mice | Animals near the oboe seats |
|---|---|---|
| `orchestra-latest.png` | 0 | a wolf with a clarinet at the right |
| `orchestra-side.png` | 0 | a wolf with a clarinet at the right |
| `mockup.png`, `scene.png`, `lowpoly-animals.png`, `animals.webp` | 0 | a wolf, rabbits with clarinets |

| Measure | Parametric mouse (`ab002346`) | Mouse mesh |
|---|---|---|
| Standing head top, skull | 0.812 m | 1.570 m (ear tips 1.655 m) |
| Scale | - | 1.655245 m/u |
| H | 0.285 m | 0.525 m |
| Seat | 0.214 m | 0.147 m, chair 0.190 m deep |
| Reach, shoulder joint to the middle of the palm | 0.408 m | 0.460 m with no factor, 0.629 m with 1.4 |
| Triangles, packed mesh after gzip | - | 3,096, 26,346 B |

**Arms.** `pnpm mesh-options mouse <dir> --size main=0.812 --size fox=1.570 --legs 1 --arms
1.2,1.3,1.4,1.5 --instrument oboe --species mouse` (`options.md`, `mid-report.webp`), with the
oboe hold of `main`:

| Arm factor | Reach | Arm/trunk | Spare reach, left and right grip |
|---|---|---|---|
| 1 | 0.460 m | 0.67 | -0.107 m, -0.135 m |
| 1.3 | 0.587 m | 0.85 | 0.019 m, -0.009 m |
| 1.4 | 0.629 m | 0.91 | 0.061 m, 0.033 m |
| 1.5 | 0.671 m | 0.97 | 0.103 m, 0.075 m |

**Nose.** The mesh has a pink nose with no dark faces. With no nose box, the export took the
front-most fur vertex of the head as the tip of the nose: the tip of a whisker, 0.2 u to the right.
The oboe then hung 0.33 m to the right of the head, and the first table of the arms gave misses of
0.29 m and 0.19 m with the factor 1. A nose box gives the 13 faces of the pink pad the gloss.

**Hold.** `pnpm hold-reach mouse --instrument oboe --set` and `pnpm hold-fit oboist --set`
(`hold-reach.txt`, `hold-fit-angles.txt`, `hold-fit-turns.txt`, `hold-fit-poles.txt`). The
reed moves into the mouth under the long muzzle (`lipShift`), 0.14 H back and 0.04 H down:

| Hold | Spare reach L, R | Deepest point, play |
|---|---|---|
| `main` | 0.061 m, 0.033 m | 0.6 cm, the paws in the oboe |
| Reed in the mouth | 0.135 m, 0.104 m | 0.2 cm |
| Reed in the mouth, oboe 40° from the vertical | 0.109 m, 0.060 m | 0.1 cm |
| Reed in the mouth, oboe 45° | 0.098 m, 0.039 m | 0.1 cm |

The shoulder turns and the elbow directions of `WIND_HOLDS.oboe` changed no depth and no fold. In
the close views, the upper arms showed as flat twisted bands. The arm turns of the play samples of
`boulanger-matin` (`keys-dump.ts --demo`, step 8 s), by the elbow directions of both arms:

| Elbows (right side) | Right upper arm, paw | Left upper arm, paw |
|---|---|---|
| (1, 0, -1), the oboe of `main` | 83°, 160° | 56°, 141° |
| (1, -1, -1) | 64°, 118° | 56°, 141° |
| (0.5, -1, -0.5), chosen | 61°, 99° | 58°, 122° |
| (0, -1, -1) | 63°, 82° | 64°, 104° |
| (1, 0.5, -1) | 99°, 178° | 80°, 158° |

The final sweep (`pnpm pose-depth oboist --gaps`, `pose-depth-oboist.txt`) finds each part within
0.7 cm, with each palm on its grip within 0.01 mm.

**Folds.** With the oboe of `main`, thin faces of the right arm folded in each play sample: a
vertex of the forearm took 0.25 of the paw weight by the line rule on a long face from the elbow
to the wrist (`vertex_faces.py`), and long faces join the trunk to the upper arm
(`bind_turned.py`). Rings and stricter line rules kept 100%. A raise rule at the mean play turns
(`keys-read.ts`) relaxed the right arm. With the elbows down, the right arm folds in no sample,
and two faces of the left upper arm and one sliver from the neck to the left shoulder folded in
each play sample. A raise rule of the left arm on the oboe, the rule of the left arm at rest, and
one rigid face (`find_faces.py`) leave no fold in the 14,223 play samples and the 11 rest samples,
and a fold in 45 of the 341 lift samples (`fold-probe-oboist.txt`).

**Tail.** The tail has two bones. A curve of the seated tail (`tailCurl`) turned the offsets of the
loop on the floor into a vertical sheet, and 30 vertices of the loop lay outside the radius of the
tail and stretched into a spike (`tail_gap.py`). With the bend at the back of the loop
(`tail_bend.py`) and rigid bone turns (`tailBind`), the seated tail goes back over the seat between
the back posts, down to the floor, and keeps its loop flat on the floor behind the chair. The
lowest point of the tail is at the soles. The footprint grows to 0.785 m by 1.418 m.

**Colors.** The fur has the Oklab hue 58° and the chroma 0.033, and the belly 81° and 0.038
(`colors.txt`). `SPECIES_COLORS.mouse` has 63° and 0.026 for the fur and 70° and 0.024 for the
belly. The tone rule moves 2,014 plain faces to these hues and chromas with their own lightness.
The pink paws, feet, tail, inner ears, and nose have a chroma above 0.05 and keep their colors.

**Face.** The pea eyes sit on the dark eyes of the mesh, and the face has a pink nose and a small
mouth, with no dark brow (`solo-shot.webp`: the solo of `mozart-k315` at 63.9 s, from
`pnpm close-views play <dir> --demo mozart-k315 --shot mouse`). The face reads as neutral to
happy, so no face rule changes it.

**Other bodies.** `pnpm body-probe --base main` at `ab002346` (`body-probe.txt`): 90 of 95 bodies and 22 of
23 players stay equal. The 5 mouse bodies and the oboe player differ, and 250 of 1,492 pose sets:
the mice, and the players that the wider layout moves in the 11 demos with oboes (the pigs, the
hippos, the penguins, the beavers, the rabbits, the red foxes, the cats, the monkeys, the
elephants, the dogs, the pandas, the badgers, the tan fox, and the conductor). The shot tests pass
(`shots-test.log`). The first download grows by 27,231 B to 563,246 B (`size.txt`).

**Images.** `pnpm close-views batch <dir> --species mouse --role oboist --lineup --camera
default --camera violins --base main` on the last pose gives the grids of `main` above the grids
of the round: `oboist-base-views.webp`, `species-play-base-views.webp`,
`species-rest-base-views.webp`, `lineup-base-views.webp`, and `play-base-views.webp`.

## 3. The result

The mouse mesh plays the oboes at the head height of the red fox, with arms of 0.91 of the trunk
and the legs of the mesh on a low chair of 0.147 m. The reed sits in the mouth, the oboe hangs 40°
from the vertical, the angle of a real oboist (Cline, `docs/reference/wind-technique.md` 2.3), and
the elbows point down. The round belly covers the short thighs, so the oboe cannot rest on a leg
as a real oboist rests it, and the rest of `main` stays. The play has no fold, and the lift folds
in 13.2% of its samples.
