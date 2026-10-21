# A chair for the trumpet monkey

Date 2026-10-20. Round `monkey-chair`. Decisions: none, because the user kept no chair (see
[`2026-10-21-monkey-stand.md`](../decisions/2026-10-21-monkey-stand.md)). The probes and their
outputs are in [`2026-10-20-monkey-chair/`](2026-10-20-monkey-chair/). Each command runs from the
root of the tree, and the base is `74ad085a`.

## 1. The question

The user said: "let the monkey sit on a chair". The low chair of the morning (seat 0.145 m) made
the seated monkey look as if it stood in front of the chair, because the thighs of the mesh are
short (8.8 cm) and slope 25° down. The goal was a sit that reads from the front and the side,
with no stretch of the legs and the soles flat on the floor.

## 2. The measures

All variants come from `pnpm rig-mesh monkey --check --set <changes> --keep <dir>`, and the views
from `pnpm close-views trumpeter <dir> --glb <file>` in a probe worktree with no `noChair`.
`variants.txt` and `tall/variants.txt` give the changes. The haunch gap is the rig log line "the
side view of the underside of the final bind behind the hip joints".

**Lower thighs.** A flatter thigh lifts the feet toward the hips, so the tail root must go up
(47° to 38°), else the tail sets the seat and holds the feet up to 3.6 cm above the floor
(`check-slopes.log`, `check-tail.log`, `check-chairs.log`, `check-sit.log`, `check-sit5.log`,
`check-up.log`):

| Variant | Thigh | Tail root | `chair.front` | Seat | Chair depth | Haunch gap | Turned faces |
|---|---|---|---|---|---|---|---|
| A | 25° down | 47° | 0.03 | 0.145 m | 0.208 m | 7.42 cm | 0 |
| B | 15° down | 43° | 0.045 | 0.134 m | 0.226 m | 7.08 cm | 0 |
| C | 5° down | 40° | 0.05 | 0.128 m | 0.231 m | 6.21 cm | 0 |
| C2 | 5° down, `sit.most` 0.06 | 40° | 0.05 | 0.127 m | 0.231 m | 3.66 cm | 0 |
| D | level | 38° | 0.05 | 0.128 m | 0.231 m | 5.51 cm | 1 (hips) |
| D2 | level, `sit.most` 0.06 | 38° | 0.05 | 0.126 m | 0.231 m | 3.07 cm | 0 after the trunk relax |
| up | 10° up | 35° | 0.05 | 0.120 m | 0.231 m | 4.76 cm | 7 (hips) |

The reach to the trumpet grips and the arm gate do not change, because the legs do not move the
trunk (`hold-reach.txt`, `arm-check.txt`, `arm-check-0sit.txt`). The belly and the round haunch
hide the short thighs, so no variant reads as a sit from the side (`lineup.webp`,
`legs-crops.webp`, `knees.webp`). The user chose D2, then rejected all: "no, none. the chair
should be taller and the monkey's hip should touch the chair". The commit of D2 (`320f3a88`) was
reverted (`b4f10553`).

**Taller seats.** The legs and the tail stay as on `main`. The seat top is the lowest point of
the body over the seat, so a front edge further back raises the seat under the haunch
(`tall/check-front-scan.log`, `tall/check-tall.log`):

| Variant | `chair.front` | Seat | Haunch gap | Soles | Tail into the seat |
|---|---|---|---|---|---|
| A | 0.03 | 0.145 m | 7.42 cm | 0 | 0.1 cm |
| T0 | -0.01 | 0.188 m | 3.13 cm | 0 | 1.9 cm |
| T1 | -0.02 | 0.200 m | 2.31 cm | 0 | 1.6 cm |
| T2 | -0.01, body 5 cm up | 0.238 m | 3.13 cm | 5 cm up | 1.9 cm |

In T0, T1, and T2 the haunch rests on the seat with no gap from the back (`tall/seat-3x.webp`).
But the chair of the app is deeper than the chair of the rig, and the root of the tail goes into
its seat behind the haunch. Tail roots from 30° to 47° and a fixed seat top of the sit (`sit.top`)
keep the depth at 1.6 cm to 2.0 cm (`tall/check-tall-tail.log`, `tall/check-tall-top.log`). With
two rigid tail bones, the tail cannot clear a seat at the haunch and keep its curl on the floor.
T0 keeps the reach and passes the arm gate with the values of the base (`tall/hold-reach-T0.txt`,
`tall/arm-check-T0.txt`).

## 3. The result

The user said: "ok, no chair now". The monkey keeps no chair, and the round
[`2026-10-20-monkey-stand.md`](2026-10-20-monkey-stand.md) fixes its stand. A chair at the
haunch needs a tail of three bones, or a tail that lies over the back edge of the seat.
