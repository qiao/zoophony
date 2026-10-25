# The angle of the oboe and the clarinet

Date 2026-10-25. Round `wind-angle`. Decisions:
[`2026-10-25-wind-angle.md`](../decisions/2026-10-25-wind-angle.md). The probes and their outputs
are in [`2026-10-25-wind-angle/`](2026-10-25-wind-angle/). "Main" is `main` at 3192f0d4. Each
command runs from the root of the tree.

## 1. The question

The mouse held the oboe 15° from the vertical, and a real oboist holds it about 40° from the body
(`docs/reference/wind-technique.md` 2.3). The wolf held the clarinet 20° from the vertical, and
the wolf of the reference images holds it further forward. The goal: the largest oboe angle from
25° to 40° and the clarinet angle of the reference images, each with grasping paws and the whole
arm gate against main. The user prefers a smaller instrument to longer arms.

## 2. The clarinet of the reference images

The wolf is the clarinetist at the right edge of both images. A line from the mouthpiece to the
bell on a 6x gridded crop gives the angle of the tube from the image vertical. The camera looks
down and from the side, so the image angle is smaller than the true angle. Renders of the app
from a camera near the reference camera (azimuth -55°, elevation 35°) calibrate it (`calib.py`,
`wolf-reference.webp`).

| Image | Image angle | Render of the app at | Image angle of the render |
|---|---:|---|---:|
| `orchestra-latest.png` | 28° | 20° | 17° |
| `orchestra-side.png` | 24° | 30° | 25° |
| | | 35° | 28° |

At azimuth -40°, the renders show 12°, 19°, and 22°. Thus the reference wolf holds the clarinet
at about 30° to 35°. The brief range was 25° to 30°, so the clarinet goes to 30°, where both
ranges meet.

## 3. The scans

`pnpm hold-reach mouse --instrument oboe --set ...` (`reach.sh`): on the oboe of 0.62, the right
paw has 3.2 cm to spare at 30° and 0.4 cm at 40°. The wolf has 11 cm to spare at 35°.

| Oboe variant | Side views at zoom 1.4 | Gate (`scan-oboe-gate.txt`, `scan-oboe-scale-gate.txt`) |
|---|---|---|
| 0.62 at 25°, 30° | the elbows bend | as main |
| 0.62 at 35°, 40° | the arms reach forward straight | as main |
| 0.5 at 30° to 40°, grips of main | the elbows bend near the body | right arm 11 folds at rest |
| 0.55 at 40°, rest grips kept | | left arm at rest: 9 folds, forearm twist 109, swing 89 |
| 0.5 at 40°, rest grips kept | the elbows bend near the body | no new value past a limit |

`pnpm wind-grip oboist --set ...` (`scan-oboe-grip-1.txt`, `scan-oboe-grip-2.txt`): on the oboe
of 0.5, the left finger tips stood 1.3 cm to 1.8 cm off the tube. A left grip 0.1 H toward the
axis passes the axis, and the paw turned over to lie across the front of the tube. The grip
(0.3, 0.065, 0) with a curl of 80° gives the grasp shares of main in each set.

`pnpm wind-grip clarinetist --set ...` (`scan-clarinet-grip-1.txt`, `scan-clarinet-grip-2.txt`):
at 30°, the left paw did not hold the clarinet (tips 1.3 cm). The grip (0.15, 0.12, 0) with a
curl of 100° gives the grasp shares of main.

## 4. The measures, main against the branch

`pnpm arm-check --all --base main` (`gate.txt`): the other 21 roles give the values of main. The
values of the two roles that change:

| Role, arm | Value (limit) | Main | Branch | Verdict |
|---|---|---:|---:|---|
| Oboist L | forearm twist p95, rest (80) | 40 | 59 | FAIL on the margin |
| Oboist L | paw twist p95 (170) | 120 | 93 | PASS |
| Oboist L | grip turn p50 (45) | 176 | 10 | PASS |
| Oboist R | move twist max (176) | 84 | 99 | FAIL on the margin |
| Oboist R | grip turn p50 (45) | 161 | 176 | OPEN, FAIL on main |
| Clarinetist L | grip turn p50 (45) | 170 | 174 | OPEN, FAIL on main |
| Clarinetist R | move twist max (176) | 93 | 103 | FAIL on the margin |
| Clarinetist R | grip turn p50 (45) | 164 | 174 | OPEN, FAIL on main |

The three margin values are far inside their limits. The left rest paw of the mouse keeps the
roll of its new play grip (`restAim` 1), and a scan of the left rest grip (`scan-oboe-rest-gate.txt`)
lowered the twist by 4° at most. The `ACCEPTED_GRIPS` of both roles date from 2026-10-24, before
the palm sides of `2026-10-25-grips`, so main fails them too.

| Measure | Main | Branch |
|---|---|---|
| `pnpm wind-grip oboist clarinetist`: holds and grasps in each set (`grip-*.txt`) | play 100% for each paw | the same, wolf right lowering 97% to 100% |
| Largest twist step between neighbor arm bones (`twist-*.txt`), mouse | 30.0° (left forearm) | 26.5° (right upper arm) |
| Largest twist step, wolf | 27.7° (left forearm) | 27.7° |
| Right forearm step, mouse and wolf | 21.1°, 23.3° | 24.8°, 25.8° |
| `pnpm pose-depth <role> --base main` (`depth-*.txt`) | | no `GROWS`, clarinet in the body 0.0 cm |
| `pnpm clip-probe --base main --jobs 4` (`clip.txt`) | 15 files PASS | 15 files PASS |
| Spare reach of the oboe grips (`reach-oboe.txt`) | 11.0 cm, 7.7 cm | 5.4 cm, 4.7 cm |

## 5. The images

Main is above the branch in each pair. The views come from
`pnpm close-views <role> <dir> --views front,left,right,back,35,-35 --moments note,rest --zoom 1.4`:

- `oboist-play-side.webp`, `clarinetist-play-side.webp`: the play from the front, the left, the
  right, and the back.
- `oboist-play-35.webp`, `clarinetist-play-35.webp`: the play at ±35°.
- `oboist-rest.webp`, `clarinetist-rest.webp`: the rest from the four sides.
- `oboist-paws.webp`: the paws of the play at 2x from the front and at ±35°.
- `<role>-audit-e20-play.webp`, `-e40-`: the play rows of `pnpm close-views audit --roles
  oboist,clarinetist --base main`.

At zoom 2, the oboe at 40° leaves the frame of the ±35° views at the paws, so these pairs use
zoom 1.4. No image shows a slit, a fold, or a dark band. The left paw of the mouse now curls
over the front of the tube from above, and the right paw wraps it from the side. Both reeds stay
in the mouth under the muzzle, and the bells point down and forward.

## 6. The result

The mouse plays an oboe of 0.5 (0.275 m) at 40°, and the wolf plays the clarinet at 30°. Both
pass each gate value of main, with three margin values inside their limits.
