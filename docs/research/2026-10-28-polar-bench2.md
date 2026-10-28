# The taller bench of the polar bear pianist

Date 2026-10-28. Decisions:
[`2026-10-28-polar-bench2.md`](../decisions/2026-10-28-polar-bench2.md). The probe outputs and the
images are in [`2026-10-28-polar-bench2/`](2026-10-28-polar-bench2/). Each command runs from the
root of the tree. "Main" is `1aea48ff1`.

## 1. The question

The user gave an image of the pianist from its right back and said: "can the polar bear's bench be
taller so that it's leg is more natural? note that you can update the size of the polar bear if
needed as long as it looks natural." On `main`, the legs of the rig were 1.2 times the legs of the
mesh, with the thighs 10° down, on a bench of 0.166 m. Under the big haunch, the legs folded
tight, and the knees came up almost to the height of the hips.

In the side view of `polar-bear-views.png`, the bear sits with short thick legs, the thighs a
little down, the shins near vertical, and the bench top near the knees. The bench is about 0.26 of
the seated head top.

## 2. The variants

`pnpm rig-mesh polar-bear --check --keep <dir> --set <changes>` (`rig-check-variants.txt`) gives
the bench of the rig at the scale of `main` (1.4389 m for each unit). The thigh turns come from
`leg_turns.py` of `docs/research/2026-10-16-hip-open/` (`<config> <down> 15 0`).

| Leg factor | Thighs down | Bench of the rig | Turned faces after the knee crease |
|---|---|---|---|
| 1.2 (`main`) | 10° | 0.166 m | 0 |
| 1.3 | 20° | 0.215 m | 0 |
| 1.3 (chosen) | 25° | 0.232 m | 1 |
| 1.4 | 25° | 0.251 m | 0 |

The variant 1.3 with 25° keeps the shin at 0.67 of the thigh, as on the mesh, and its knee angle
is the 115° of the seat of design 5.2. A body 1.1 times as large (1.5828 m for each unit) puts the
bench at 0.255 m and the head top at 1.53 m in the play, near the 1.50 m that the user chose on
2026-10-27.

## 3. The keys

`probes/seat-probe.ts` and `probes/hold-scan.sh` of `docs/research/2026-10-28-polar-legs/` measure
the seat and the arms over the play of `bach-bwv1047` (`seat-piano-1.03.txt`, `seat.txt`). A
taller bench lifts the shoulders and the elbows by the same height, so the keys must rise too.
With the piano of `main` (1.03), the elbows stood 18.7 and 16.2 cm above the keys, and the forearms
sloped 32° down.

| Piano scale, keys | Hold | Elbows above the keys | Forearm slope | Head gap to the case |
|---|---|---|---|---|
| 1.13, 79.1 cm | `main` | 12.8 / 10.3 cm | 16.8° down | 32.4 cm |
| 1.18, 82.6 cm | `main` | 10.3 / 7.6 cm | 10.2° down | 31.6 cm |
| 1.22, 85.4 cm (chosen) | `main` | 8.4 / 5.6 cm | 5.3° down | 29.8 cm |
| 1.22, 85.4 cm | lean 10°, drop 6° | 7.2 / 4.6 cm | 2.6° down | 23.9 cm |
| 1.23, 86.1 cm | `main` | 7.9 / 5.2 cm | 4.2° down | 29.4 cm |

The hold of `main` stays, so the arm gate keeps its rest folds. Until this morning, `main` had a
piano of 1.16 with the keys at 0.81 m.

## 4. The gates

| Gate | Result | Output |
|---|---|---|
| Seat | bench top 25.5 cm, hip joint 40.0 cm, knee 28.7 cm, knee angle 116°, haunch 0.1 cm into the pad, head top 152.7 cm in the play | `seat.txt` |
| `pnpm arm-check pianist --base main` | no `FAIL`. The rest folds stay `OPEN` (20 and 12 faces, 21 and 13 on `main`) | `gate-arm-check.txt` |
| `pnpm pose-depth pianist --targets` | each note target within 5 mm | `gate-targets.txt` |
| `pnpm pose-depth pianist --gaps --base main` | `GROWS`: the forearms 8.3 cm and the upper arms 8.3 cm into the body in the play (6.3 and 6.8 cm on `main`, 8.8 and 10.3 cm before the legs round) | `gate-pose-depth.txt` |
| `pnpm body-probe --base main` | only the polar bear bodies, and the layout of the four demos with a piano | `gate-body-probe.txt` |
| `pnpm size` | 837,799 B | `size.txt` |

## 5. The images

`e20-<view>.webp` and `e40-<view>.webp`: the chord and the rest of the role from the front, the
right, the back, the left, ±120, and ±150, at 20° and 40°, `main` above the fix
(`pnpm close-views pianist <dir> --base main --sheet --views <views> --moments chord,rest
--elevation <e> --zoom 1 --scale 2`). The camera frames the body, so the larger bear has the size
of `main` in the images. From the right, the thighs slope down from the haunch, the shins stand on
the floor, and the bench holds the haunch. No view shows a new fold or gap.

## 6. Open

- The arms go about 2 cm deeper into the belly in the play. Try the elbows a little further out
  (`poleL`, `poleR` of `HANDS_HOLDS.piano`).
- The piano is 1.22 times a real piano. A smaller piano needs a lower body or more lean.
