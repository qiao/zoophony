# The upright wolf clarinet and the mouse oboe paws at rest

Date 2026-10-27. Round `sixth-wolf-vertical`. Decisions:
[`2026-10-27-wolf-mouse-rests.md`](../decisions/2026-10-27-wolf-mouse-rests.md). The probes and
their outputs are in [`2026-10-27-wolf-mouse-rests/`](2026-10-27-wolf-mouse-rests/). Each command
runs from the root of the tree. "Main" is `b3f9d65e`, and `e485e46f` after the rebase (a change
of the hall lamps only). `876ba389` is the commit before the clarinet rest on the knee.

## 1. The wolf: the question

The user said: "for the wolf, in rest mode, the instrument should be vertical". On `main`, the
bell rests against the inner right knee, and the clarinet leans 30° forward and 10° to the left.
The goal: the clarinet within 5° of the vertical from the front and from the side, both paws on
their grips of the play with a full grasp, the arm gate with no `FAIL` against `main` and
`876ba389`, and the forearms at most 1.5 cm in the belly. A real clarinetist rests the bell on
the chair, the knee, or the seat between the legs (`docs/reference/wind-technique.md` 3).

## 2. The wolf: the room for an upright clarinet

`probes/wolf-front.ts` casts rays against the posed skin at rest (`wolf-front.txt`). The belly
front lies 10 cm to 11 cm in front of the seat front from 27 cm to 54 cm above the seat, and
reaches the seat front 9 cm to 12 cm above the seat. The knee tops lie 4 cm to 7 cm above the
seat at x ±16 cm to ±20 cm, with the front edge near 11 cm in front of the seat. An upright
clarinet on the seat thus goes into the belly.

## 3. The wolf: the tries

`probes/wolf-solve.ts` gives `rest` and `restShift` for a bell point and a lean: an upright
clarinet takes `holdTurn(-25,0)`. Each try ran `pnpm hold-fit clarinetist --sets lift,rest,lower`.

| Bell place (x, height above the seat, in front of the seat), cm | Result | Output |
|---|---|---|
| Top of the right knee: (16, 7, 9), (14, 6, 11) | left forearm 12.3 cm and 10.0 cm in the belly | `wolf-try-1.txt` |
| (14, 6, 11) with 27 left rest elbows | left forearm at least 7.1 cm in, right paw twist 82°, right swing 94° | `wolf-grid-knee-poleL.txt` |
| In front of the inner right knee: (8, 3, 15) | left forearm 6.1 cm in | `wolf-try-1.txt` |
| Middle, low: (0 to 4, 3 to 8, 18 to 22) | right forearm 2.1 cm to 3.4 cm in | `wolf-try-1.txt` |
| Middle, x -4 to 6, height 3 to 13, 22 to 30 in front | most places 0.6 cm to 1.0 cm | `wolf-grid-place*.txt` |
| (4, 5.7, 18 to 20), nearer to the belly | left forearm 1.8 cm to 3.6 cm in | `wolf-grid-place-nearer.txt` |
| Four places of the middle in the arm gate | each passes against `876ba389` | `wolf-gate-scan.txt` |

The chosen place (4, 5.7, 22), `restShift` [0.11, -0.56, -0.086], is the lowest and nearest
place that passes. `probes/wolf-rest.ts` measures it (`wolf-rest-round.txt`,
`wolf-rest-main.txt`).

| Measure | `main` | Round |
|---|---|---|
| Tilt from the vertical (forward, side) | 31° (30°, -10°) | 0° (0°, 0°) |
| Bell (x, height above the seat, in front of the seat), cm | 9.4, 2.9, 6.5 | 4.2, 5.7, 22.0 |
| Grasp of each paw in each set (`pnpm wind-grip`, `wolf-wind-grip.txt`) | 100% | 100% |
| Arms in the body at rest (`pnpm hold-fit --base main`, `wolf-hold-fit.txt`) | forearms 1.1 cm, upper arms 0.6 cm | forearms 0.5 cm, upper arms 0.5 cm, no `GROWS` |
| Net turn of the clarinet in the left / right paw over a move | 29° / 11° | 26° / 1° |
| Tilt of the clarinet axis in the left / right paw over a move | 8° / 11° | 14° / 3° |

## 4. The wolf: the gate

`pnpm arm-check clarinetist --base main` and `--base 876ba389` (`wolf-arm-check-main.txt`,
`wolf-arm-check-876ba389.txt`): no `FAIL`. The values change only at rest and in the moves:

| Arm | Measure | `876ba389` | `main` | Round |
|---|---|---:|---:|---:|
| L | twist p95 | 24 | 17 | 17 |
| L | paw swing p95 (limit 55 against `876ba389`) | 40 | 54 | 45 |
| L | paw twist p95, move twist max | 89 | 41 | 41 |
| R | twist p95 | 35 | 27 | 24 |
| R | flat p5 | 0.82 | 0.86 | 0.91 |
| R | paw twist p95, move twist max | 101 | 32 | 23 |
| R | paw swing p95 | 46 | 46 | 43 |

`pnpm body-probe --base main` changes only the 42 pose sets of the wolf clarinetist
(`wolf-body-probe.txt`).

## 5. The mouse: the question

The user said: "for the mouse, in rest mode, their two hands are overlapping". On `main`, both
paws close on the middle of the upright oboe on rest grips of their own. `probes/mouse-rest.ts`
measures the span of each paw along the tube, the gap of the spans, the depth of one paw in the
other (as `paw in paw` of `pnpm clip-probe`), and the slide of each paw middle along the tube
over each move (`mouse-rest-main.txt`).

## 6. The mouse: the tries

`probes/mouse-scan.sh` joins the rest turns and the depths of `pnpm hold-fit` with the grasp of
`pnpm wind-grip` for each variant (`mouse-scan-<n>-fit.txt`, `mouse-scan-<n>-grip.txt`).

| Try | Result | Output |
|---|---|---|
| Grips of the play at rest, 27 places | the depths pass at most places, but the largest move twist grows past its margin of 3°: left 154° to 161° (143°), right 125° to 131° (121°) | `mouse-grid-place.txt`, `mouse-gate-scan-1.txt` |
| 32 left rest elbows | a rest twist below 98° puts an upper arm 1.6 cm to 9.4 cm in the body, and 98° to 146° keep it at 0.5 cm to 1.3 cm | `mouse-grid-poleL.txt` |
| 36 right rest elbows | elbows more down give 113° with the depths within the limit | `mouse-grid-poleR.txt` |
| A roll of the upright oboe from -60° to 60° | the twists change by 1° to 4°, and from ±40° the roll of one paw flips to the other side | `mouse-roll.txt` |
| 5 pairs of rest elbows | each passes the gate | `mouse-gate-scan-2.txt` |
| 9 rest heights with the first pick | lower, an arm goes 1.3 cm to 1.9 cm into the body | `mouse-grid-height.txt` |
| The first pick, left [-1.5, -1, -1], right [1, -1, 0], committed in `c7555e73` | the left palm turns 62° from the oboe at rest (limit 60°): the left paw grasps in 0% of the rest, 90% of the lift, and 63% of the lowering. The right upper arm goes 0.8 cm to 0.9 cm into the body (0.6 cm, `GROWS`) | `mouse-grip-scan-1.txt` |
| 27 right rest elbows with a grasping left elbow | a right twist of 121° or less puts the right upper arm 0.6 cm to 2.4 cm in | `mouse-grid-poleR-2.txt` |
| 48 pairs of a left elbow and a side place | the oboe 2.7 cm further right turns the left palm 7° further. Further left, the palm grasps, but the upper arm goes 0.8 cm to 1.0 cm in | `mouse-scan-1-*.txt`, `mouse-scan-2-*.txt`, `mouse-scan-3-*.txt` |
| 3 final pairs | each passes the gate | `mouse-gate-scan-3.txt` |

The chosen rest: the grips of the play, the oboe 0.25 H below the mouth and 1.4 cm in front of
the first pick (`restShift` [0.1, -0.25, -0.05]), the left elbow [-1, -0.75, -1], and the right
elbow [1.5, -0.75, 0.25] (`mouse-rest-round.txt`).

| Measure | `main` | Round |
|---|---|---|
| Spans of the paws along the tube at rest | overlap 4.5 cm, middles 1.0 cm apart | gap 5.7 cm, middles 11.2 cm apart |
| Closest corners of the paws, paw in paw | 0.1 cm, 0.4 cm | 6.3 cm, 0.0 cm |
| Slide of the left / right paw along the tube in a move | 4.5 cm / 5.4 cm | 0.4 cm / 0.0 cm |
| Net turn of the oboe in the left / right paw over a move | 36° / 2° | 13° / 6° |
| Tilt from the vertical at rest | 0° | 0° |
| Grasp of each paw in each set (`pnpm wind-grip oboist`, `mouse-wind-grip.txt`) | 100% | 100% |
| Deepest arm at rest (`pnpm hold-fit oboist --base main`, `mouse-hold-fit.txt`) | forearms 0.7 cm, upper arms 0.6 cm | forearms 0.0 cm, upper arms 0.6 cm, no `GROWS` |

## 7. The mouse: the gate

`pnpm arm-check oboist --base main` (`mouse-arm-check-main.txt`): no `FAIL`.

| Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95, move twist max | paw swing p95 |
|---|---|---|---|---|---|---|
| L, `main` | 8 | 33 | 49 | 0.63 | 143 | 44 |
| L, round | 4 | 23 | 47 | 0.67 | 134 | 43 |
| R, `main` | 7 | 31 | 41 | 0.74 | 121 | 39 |
| R, round | 7 | 27 | 41 | 0.74 | 121 | 32 |

`pnpm body-probe --base main` changes only the 42 pose sets of the wolf clarinetist and the 66
pose sets of the mouse oboist (`body-probe.txt`). `pnpm clip-probe --demo bach-bwv1047 --demo
boulanger-matin --base main` gives the values of `main` (`clip-probe.txt`).

## 8. The images

`main` is above the round in each sheet. `<view>` is front, back, left, right, az-35, az35,
az150, or az-150.

- `clarinetist-e20-<view>.webp`, `clarinetist-e40-<view>.webp`: `pnpm close-views clarinetist
  <dir> --base main --sheet --moments note,between,rest,lift20,lift40,lift60,lift80,lower20,lower40,lower60,lower80,stand
  --views front,back,left,right,-35,35,150,-150 --box 0.15,0.3,0.7,0.62 --scale 2` at the
  elevations 20 and 40.
- `clarinetist-e0-<view>.webp`: the rest at the elevation 0 from four sides (`--box
  0.1,0.1,0.8,0.85`).
- `clarinetist-paws-<view>.webp`: the paws at rest, lift40, and lower60 from four sides, cut from
  `pnpm close-views clarinetist <dir> --base main --moments rest,lift40,lower60 --views
  front,back,left,right --scale 2 --elevation 10` by `probes/paw-pairs.py`.
- `wolf-stage-rest.webp`: `pnpm close-views play <dir> --at wolf --azimuth -30 --azimuth 30
  --time 30 --zoom 1.6 --base main --pause`. The angle -30 is the angle of the image of the user.
- The same sets of the mouse: `oboist-e20-<view>.webp`, `oboist-e40-<view>.webp` (`--box
  0.1,0.1,0.8,0.7`), `oboist-e0-<view>.webp`, `oboist-paws-<view>.webp`, and
  `mouse-stage-rest.webp` (`--at mouse`).

## 9. The result

The upright clarinet stands in front of the belly with both paws on their grips of the play. No
upright place on the seat or on the knee keeps the forearms out of the belly, so the bell rests
on nothing. The mouse paws keep their grips of the play at rest with a gap of 5.7 cm. The rest
elbows keep the left palm on the oboe and the upper arms out of the body, and the left paw twists
less than on `main`.
