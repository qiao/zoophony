# The left shoulder folds and the fur white of the panda trombonist

Date 2026-10-18. Round `panda-folds`, from `f65da87a`. Decisions:
[`2026-10-18-panda-folds.md`](../decisions/2026-10-18-panda-folds.md). The probes and their outputs
are in [`2026-10-18-panda-folds/`](2026-10-18-panda-folds/). Each command runs from the root of the
tree.

## 1. The question

After the round `panda-mesh`, faces 717, 1147, and 1148 at the front of the left shoulder of the
panda folded in each rest, play, and lift sample, and the white fur of the mesh had three times
the Oklab chroma of `SPECIES_COLORS.panda`. The user chose "Merge now, fix folds next
(Recommended)" and "Reference white (Recommended)".

## 2. The folds of the left shoulder

`keys-dump.ts` and `keys-read.ts` of the last round give the turns of the left arm in the folded
samples (`keys-left.txt`). The left clavicle does not turn, and the upper arm turns 68.1° from its
bind direction, mostly around the vertical, with a spread of 0.0° in the play: the left paw holds
the grip near the mouth, far in front of the deep chest. The rest and the lift turn it by 67.4°
and 67.6°. The vertices at the front of the shoulder lie about 10 cm in front of the shoulder
joint, so this turn moves them about 10 cm in toward the middle, past the vertices of the
clavicle, which stay (`dump-shoulder.ts`, `shoulder_plot.py`, `fold-geometry.webp`).

A rule of `raise` of the left arm at the mean play turn leaves 3 faces turned over after 60 rounds
of relaxing, also with 1 to 3 rings of `grow`, `below` 0.3, or a turn 1.25 times as large
(`raise-left.txt`). The relax moves only the corners of the turned faces, and their neighbors are
compressed too, so the fold moves to the next faces.

A real shoulder shares a forward reach between two joints: the shoulder blade slides forward
(protraction) when the arm moves forward across the body (Human Kinetics, "Using a goniometer to
assess shoulder horizontal adduction",
https://us.humankinetics.com/blogs/excerpt/using-a-goniometer-to-assess-shoulder-horizontal-adduction:
the examiner holds the scapula to stop the protraction; Brook Bush Institute, "Kinesiology of the
Shoulder and Scapula", https://brookbushinstitute.com/article/kinesiology-of-the-shoulder-and-scapula).
The new field `WindHold.reachL` turns the left shoulder bone forward, as `reach` turns the right
one. `pnpm hold-fit trombonist --sets play,lift,rest` measured each turn on `boulanger-matin`
(`hold-fit-reach-left.txt`, `hold-fit-reach-left-grid.txt`):

| Left shoulder turn | Play folds | Lift folds | Rest faces | Deepest part cm |
|---|---|---|---|---|
| 0° (start) | 100.0% | 100.0% | 4 | 0.5 |
| 5.7° | 0.7% | 9.7% | 0 | 0.5 |
| 8.6° | 0.0% | 3.2% | 0 | 0.5 |
| 15° (chosen) | 0.0% | 3.2% | 0 | 0.5 |
| 20.1° | 0.0% | 3.2% | 0 | 0.5 |
| 22.9° | 100.0% | 83.9% | 0 | 0.6 |
| 30° | 100.0% | 87.1% | 0 | 0.5 |
| 45° | 100.0% | 100.0% | 2 | 3.2, over the limit |

The chosen 15° lies in the middle of the turns with no play fold.

| Measure, 3 demos | Start (`f65da87a`) | Round |
|---|---|---|
| Play folds, step 0.25 s (`fold-probe-base.txt` at step 1 s, `fold-probe-trombonist.txt`) | 100.0% | 0.0% (0 of 4,788) |
| Lift folds | 100.0% | 2.2%, face 467 of the right shoulder, as before |
| Rest folds | 100.0% | 0.0% |
| Deepest part, `pnpm pose-depth trombonist --gaps` (`pose-depth-trombonist.txt`) | 0.5 cm, upper arms in body | 0.5 cm, paws in trombone (upper arms 0.0 cm) |
| `slideReach` (`slide-reach.ts`, `slide-reach.txt`) | 0.155 m | 0.155 m |
| Left shoulder joint to the left grip | 0.533 m | 0.489 m |

The turn moves the trunk vertices of the left clavicle by at most 5.5 cm, all at the top of the
shoulder, and the front of the chest below them by at most 2 cm (`bulge.ts`, `bulge.txt`). In the
front view of the first position, a dark band crosses the belly (`belly-band.webp`). With no
received shadows on the players, the band goes (`left-arm-shadow.webp`), so it is the shadow of
the left arm, which now comes further forward over the belly, in the overhead light of the
gallery. It is not a fold of the mesh.

`pnpm body-probe --base f65da87a` finds each body, player, and pose set equal after the new field
(`body-probe-mechanism.txt`), and only the 36 pose sets of the 9 panda trombonists different after
the turn of the panda (`body-probe-hold.txt`).

## 3. The white fur

`fur_white.py` takes the median Oklab of the pixels with the lightness above 0.6 in boxes of the
white fur of a gallery render, and `face_hues.py` reads the face colors of a rig. `rig.sh` rigs a
variant of `colors.tone`, and `render.sh` puts it into the app and renders the front and the back
of the panda in the rest pose (`fur-white.txt`, `fur-gallery.webp`). The reference is the
parametric panda of `5d1ef638`, which has the color of `SPECIES_COLORS.panda` (Oklab chroma 0.013
at the hue 87°), in the same views.

| Variant, move (da, db) | Face chroma, hue | Front of the head L, chroma | Front of the belly L, chroma | Back of the head L, chroma |
|---|---|---|---|---|
| Parametric panda | 0.013, 87° | 0.918, 0.034 | 0.836, 0.053 | 0.950, 0.023 |
| Mesh at the start | 0.042, 85° | 0.881, 0.056 | 0.765, 0.077 | 0.958, 0.026 |
| Half step, (-0.004, -0.025) | 0.017, 92° | 0.881, 0.045 | 0.762, 0.064 | 0.958, 0.020 |
| Full step, (-0.0027, -0.029), chosen | 0.013, 87° | 0.881, 0.043 | 0.762, 0.062 | 0.959, 0.020 |
| Past the full step, (-0.008, -0.05) | 0.009, 241° | 0.881, 0.035 | 0.762, 0.050 | 0.960, 0.016 |

In this light, a darker part of the white fur shows more chroma: the parametric panda goes from
0.034 at the lightness 0.918 to 0.053 at 0.836. The mesh is darker in each box, because of its
form. At the same lightness, the full step has the chroma of the reference: 0.043 against 0.043
(on the line between the two parametric boxes) on the front of the head, and 0.020 against
0.021 on the back of the head. Thus the full step is the reference white in the gallery light,
and a larger move makes the white blue (the hue 241° in the faces).

The full step moves 1,187 white faces, keeps their lightness 0.957, and gives 46 of them (4%) an
Oklab b below -0.005, at least -0.019. The faces below the lightness 0.5 do not move. In the play
frame of `boulanger-matin` at 33.5 s (camera `default`), the heads of the three pandas have the
chroma 0.082 at the hue 66°, against 0.092 at 67° at the start, and the lightness 0.774 against
0.777, so the fur looks warm white on the stage, with no blue or gray tint (`fur-play.webp`).
`pnpm rig-mesh panda --check` keeps 3,146 triangles, and the packed mesh grows from 29,744 B to
29,748 B after gzip (`rig-mesh-check-tone.txt`). `pnpm size --base f65da87a` gives +31 B for the
round (`size.txt`).

## 4. The result

A forward turn of 15° of the left shoulder removes the folds of the left shoulder in each play and
rest sample, with no change of the rig, the clearance, or the slide reach. The white fur of the
panda has the color of `SPECIES_COLORS.panda`, and its renders match the parametric panda of that
color at the same lightness.
