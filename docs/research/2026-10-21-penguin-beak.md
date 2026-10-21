# The beak of the penguin opens

Date 2026-10-21. Round `penguin-beak`. Decisions:
[`2026-10-21-penguin-beak.md`](../decisions/2026-10-21-penguin-beak.md). The probes and their
outputs are in [`2026-10-21-penguin-beak/`](2026-10-21-penguin-beak/). Each command runs from the
root of the tree, and the base is `008612b3`, the commit before the round.

## 1. The question

The user said: "make the penguins able to open the beak". The beak of the penguin mesh was one
closed cone with no mouth line, so the rig had no jaw, and only the head lift showed each note.
The measures that decide are the outer form of the closed beak, the inside of the open mouth, the
opening in the play, the clearance sweep, the arm gate, and the other bodies.

## 2. The measures

**Edit.** `beak_split.py` runs in a headless Blender (`beak-split.log`, the README of the mesh).
The level plane at the height of the tip of the beak, y 0.883 u, cuts the 93 faces of the beak
into a path of 20 edges from one corner of the mouth to the other. The two parts move apart by
0.0005 units of the file each, and a cap of the mouth color `#4d2312` closes each part. The mesh
keeps its 2 open edges and its 3 edges with more than two faces, and has 3,185 triangles against
3,103, under the budget of 3,200. The script gives the same file again (SHA-256 `27302fbc`).
`open_views.py` turns the lower part 35° in Blender before the rig: the caps close the mouth with
no hole (`split-open.webp`).

**Jaw.** The jaw joint lies at the middle of the corners of the mouth, so the lower beak turns
around the line between them (`config_jaw.py`). `weights.jaw` gives 36 vertices of the lower
beak to the jaw only (`check-jaw.log`). The jaw of the player takes the hinge as its bind place.

**Opening.** `CHOIR_MOTION.jaw` keeps 50° at a gesture size of 1. The three singing penguins of
`orchestra-side.png` open their beaks about 60° to 75°, read on 8x crops
(`reference-beaks.webp`, `reference_crops.py`). `jaw-probe.ts` over the Ode to Joy, with the
beak 9.8 cm from the hinge to the tip (`jaw-probe.txt`):

| While a note sounds | Jaw | Drop of the tip of the lower beak |
|---|---|---|
| p10 | 30.6° | 5.0 cm |
| p50 | 45.0° | 6.9 cm |
| p90 | 50.8° | 7.6 cm |
| max | 54.0° | |

Between two notes, the beak closes to half (`CHOIR_MOTION.dip`), and it closes after the end of a
note in 0.12 s (`phrase-frames.webp`, 79.8 s to 81.2 s at steps of 0.2 s).

**Views.** `pnpm close-views singer <dir> --target head --set choirMotion.jaw=<rad>` at 25°, 50°,
and 60° (`beak-views.webp`): the mouth shows its dark caps from the front, at 60°, and from the
side, with no hole or back face, also past the largest opening of the play. In the first choir
shot (`pnpm close-views play <dir> --demo beethoven-9 --shot penguin --base 008612b3`,
`shot-base-views.webp`), each open beak shows its dark mouth. In the default view, the beak is a
few pixels, so the opening shows little (`default-choir.webp`). The head lift then keeps 15° at
the full opening, its earlier value, in place of 22°.

**Checks.**

| Check | Base | Round |
|---|---|---|
| `pnpm arm-check singer --base 008612b3`, folds p95 L and R | 3, 1 | 3, 1 |
| twist p95 L and R | 31, 34 | 31, 34 |
| `pnpm arm-check --all --base 008612b3` | no `FAIL` | no `FAIL` |
| `pnpm fold-probe singer`, most faces in a sample | 4 | 4 |
| `pnpm pose-depth singer --gaps`, upper arms in the body | 1.1 cm | 1.1 cm |
| folder in the body | 0.1 cm | 0.1 cm |
| gap of the head and the jaw to the folder | 18.1 cm | 18.1 cm |
| palms on their grips at the 484 note starts | 100% | 100% |
| first download (`size.txt`) | 818,711 B | 819,199 B (+488 B) |

`arm-check.txt`, `arm-check-all.txt`, `fold-probe.txt`, and `pose-depth.txt` keep the outputs.
`pnpm body-probe --base 008612b3`: each other body, player, and pose set is equal. Only the
penguin bodies, the choir player, and 24 pose sets of the 8 penguins of `beethoven-9` change.

## 3. The result

The split beak keeps its closed form, and the lower beak opens on its jaw with each note and
closes to half between two notes. The mouth shows its dark caps with no hole. No measure of the
singer gets worse, and the other bodies stay equal.
