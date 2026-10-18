# The slide angle of the panda trombone (T1)

Date 2026-10-18. Round `trombone-fit`, from `d6485c4d`. Decisions:
[`2026-10-18-trombone-fit.md`](../decisions/2026-10-18-trombone-fit.md). The probes and their
outputs are in [`2026-10-18-trombone-fit/`](2026-10-18-trombone-fit/). Each command runs from the
root of the tree.

## 1. The question

Item T1 of the motion spec of [`2026-10-18-wind-technique.md`](2026-10-18-wind-technique.md) asks
for a slide nearer to the level. A real trombonist points the slide toward the audience, and never
down to the floor, and holds the trombone straight forward (reference 1.1 and 1.4 of
[`wind-technique.md`](../reference/wind-technique.md)). The slide of the panda pointed 40.0° below
the level and 20.0° to the right. A variant passes when `slideReach` is at least 0.15 m, each
depth of `pnpm pose-depth trombonist --gaps` is at most 1.5 cm, the play folds are at most 5%, and
the lift folds are at most 2.1% (1.1% plus 1 point). The arm factor 1.497 of the user stays.

## 2. The measures

`node docs/research/2026-10-18-trombone-fit/slide-probe.ts` gives the angles in the axes of the
chest, the reach, and the right elbow flexion in positions 1 and 7 (`slide-probe.txt`). The slide
turns right, then down, around the mouthpiece. `pnpm hold-fit trombonist --demo all --set
'trombone@panda.play=<quaternion>'` gives the folds and the deepest part on 3 demos.

| Turn right, down (deg) | Below the level | Right | From the front | Reach | Play folds (left 9°) |
|---|---|---|---|---|---|
| 20, 25 (start) | 40.0° | 20.0° | 44.0° | 0.155 m | 0.0% |
| 30, 20 (B) | 35.0° | 30.0° | 44.8° | 0.165 m | 100.0% |
| 35, 15 (A) | 30.0° | 35.0° | 44.8° | 0.160 m | 100.0% |
| 40, 10 | 25.0° | 40.0° | 46.0° | 0.160 m | 100.0% |
| 45, 5 | 20.0° | 45.0° | 48.4° | 0.160 m | 100.0% |
| 30, 15 | 30.0° | 30.0° | 41.4° | 0.140 m | not run |

For the same reach, a slide less far down must turn further right: the angle from the front stays
44° to 46°. Each candidate keeps the deepest part at 0.5 cm or less (`hold-fit-candidates.txt`).
The folds are faces 1290 and 1291 at the front of the left shoulder (`hold-fit-faces-35-15.txt`,
`hold-fit-faces-30-20.txt`), because the left grip turns with the slide. A grid of the left
shoulder turn (`WindHold.reachL`) on `boulanger-matin` finds the turns with no fold
(`hold-fit-left-grid.txt`, `hold-fit-left-fine.txt`, `hold-fit-38-12.txt`):

| Turn right, down | Left turns with play folds | Left turns with no play fold | Result, 3 demos |
|---|---|---|---|
| 35, 15 (A) | 0° to 13° | 14° to 30° | passes at 15° and 20° (`hold-fit-passing-all.txt`) |
| 30, 20 (B) | 0° to 10° | 15° to 30° | passes at 15° and 20° (`hold-fit-passing-all.txt`) |
| 38, 12 (27° below) | 15° to 35°: 2.1% | none | 30.3% of the play at 15° (`hold-fit-38-12-all.txt`) |
| 40, 10 (25° below) | 0° to 30°: 87.6% or more | none | fails |

A larger forward turn of the right shoulder (`WindHold.reach`, 45°) brings the slide nearer to the
front for the same reach, but it folds the right shoulder (`hold-fit-shoulder-right.txt`,
`hold-fit-shoulder-both.txt`):

| Right shoulder, turn right, down | Below, right, from the front | Reach | Play folds | Lift folds |
|---|---|---|---|---|
| 50°, 30, 15, left 15° | 30.0°, 30.0°, 41.4° | 0.155 m | 0.0% | 6.5%, faces 86 and 497 |
| 55°, 30, 15, left 15° | 30.0°, 30.0°, 41.4° | 0.165 m | 100.0% | 100.0% |
| 60°, 25, 15, left 15° | 30.0°, 25.0°, 38.3° | 0.160 m | 100.0% | 100.0% |

The shadow band of the left arm on the belly grows with the left turn. `band.py` of the report
[`2026-10-18-panda-folds.md`](2026-10-18-panda-folds.md) counts the dark pixels in its box of the
front view of the first position (`render.sh`, `band.txt`, `band.webp`): 20.9% at the start, 43.2%
for A, and 44.6% for B. `lineup.webp` shows the three holds from the front, the left, and 35° to
the right (`lineup.py`).

| Measure | Start (`d6485c4d`) | Round (B) |
|---|---|---|
| Slide below the level, to the right, from the front | 40.0°, 20.0°, 44.0° | 35.0°, 30.0°, 44.8° |
| Left shoulder turn | 9° | 15° |
| `slideReach` | 0.155 m | 0.165 m |
| Right elbow, positions 1 to 7 | 75° to 29° (46°) | 77° to 30° (48°) |
| Deepest part (`pose-depth-start.txt`, `pose-depth-trombonist.txt`) | 0.5 cm, paws in trombone | 0.5 cm, paws in trombone |
| Forearms in trombone, gap of the head to the trombone | 0.1 cm, 0.1 cm | 0.3 cm, 0.5 cm |
| Folds, `pnpm fold-probe trombonist` (`fold-probe-trombonist.txt`) | rest 0.0%, play 0.0%, lift 1.1% | rest 0.0%, play 0.0%, lift 0.0% |
| Belly band (`band.txt`) | 20.9% | 44.6% |
| `pnpm body-probe --base d6485c4d` (`body-probe.txt`) | | bodies 95 of 95 and players 23 of 23 equal. 36 of 1,492 pose sets differ: the 4 sets of the 9 panda players |

The rest pose set differs only by the left shoulder turn, which also holds in the rest. The
trombone keeps its rest place, and the slide stays closed. `slideSec` stays 0.1 s with the end at
the note start (T6 and T7).

## 3. The result

The manager offered A and B. The user chose "B: between (Recommended)": 35° below the level and
30° to the right, with the left shoulder at 15°. B is 5° nearer to the level than the start, and
it keeps the play and the lift free of folds. A is 5° more level and 5° more to the side. No
variant at this reach is nearer to the front than the start (44.0°): the mouth lies 0.40 m in
front of the shoulder joints, so the slide must point toward the right shoulder. The left turn of
15° doubles the belly band, against the choice of 9° for a small band
([`2026-10-18-panda-folds.md`](../decisions/2026-10-18-panda-folds.md)). The elbow range stays
about 46° to 48°, about half of the real range, because the reach does not change much.
