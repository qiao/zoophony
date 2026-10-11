# The seated knees of the rabbit

On 2026-10-10, after the second round of
[`2026-10-10-rabbit-sheet.md`](2026-10-10-rabbit-sheet.md), the user said: "the knee of the rabbit
seem strange". This report gives the causes, the rounds, and the results. The decisions are in
[`2026-10-10-rabbit-knees.md`](../decisions/2026-10-10-rabbit-knees.md).

## The causes

The seated knee of the sheet is round, at the end of a thigh that lies level on the seat. The shin
hangs down in front of the seat to the feet. On the stage, the knees of the rabbit stood up high
and pointed, near the elbows. Probes of the seated mesh found three causes:

1. The weights of the file put the haunch on the thigh bone. When a seated thigh turns forward,
   the haunch behind the hip joint swings down under the thigh. In round k2 (below), the lowest
   vertex of the hips, a vertex of the haunch with 0.47 of its weight on the thigh, went 5 cm
   below the lowest vertex of the standing haunch. This vertex sets the seat (`seatDrop()`). In
   the merged rabbit, the hip joints stood 0.93 thigh lengths (0.20 m) above the seat.
2. The thighs are deep from the front to the back: 0.27 m near the knee in round k2. On a seat,
   this depth stands up. In the merged rabbit, the top of the knee stood 0.34 m above a seat of
   0.265 m (a knee ratio of 1.30, below). On the sheet, the top of the knee is about half the
   seat height above the seat.
3. In round t1, the calf of the shin bulged 0.11 m behind the knee joint, past the front edge of
   the seat. It filled the angle under the knee, and the long feet went 0.23 m in front of the
   ankle. In a side view, the leg was one slant from the seat to the toes.

## The rounds

Each round packs the rabbit with `pnpm rig-body rabbit` and runs `pnpm sheet-check rabbit`. The
knee ratio is the height of the top of the knee above the seat, divided by the seat height. The
top of the knee is the highest thigh or shin corner of the left leg within 4 cm of the knee
joint, from the front to the back. The scales are across, along, and across the bone.

| Round | Change | Seat | Knee ratio | Front | Side | Back |
|---|---|---|---|---|---|---|
| k0 | The merged rabbit (thigh slope 20°) | 0.265 m | 1.30 | 0.551 | 0.651 | 0.591 |
| k1 | Slope 5°, shins 1.3, 1.6, 1.3, thighs 1.4, 1, 1.4 | 0.40 m | | 0.617 | 0.548 | 0.590 |
| k2 | Slope 12°, shins 1.25, 1.45, 1.25, thighs 1.25, 1, 1.25, hips 1.45, 1, 1.5 | 0.271 m | 0.67 | 0.539 | 0.665 | 0.592 |
| p2 | k2, and a test of the haunch on the hips in the bind pose | 0.313 m | 0.67 | 0.554 | 0.645 | 0.590 |
| t1 | p2, slope 20°, thighs 1.4, 1, 0.85 | 0.318 m | 0.53 | 0.532 | 0.641 | 0.587 |
| t2 | t1, shins 1.3, 1.45, 0.95, thighs 1.4, 1.1, 0.85 | 0.330 m | 0.48 | 0.518 | 0.650 | 0.581 |
| t3 | t2, feet 1.3, 1.05, 1.3, toes 1.3, 1, 1.3 | 0.312 m | 0.51 | 0.535 | 0.651 | 0.593 |
| t4 | t3, with the haunch rule in the packer (`haunch`) | 0.296 m | 0.59 | 0.532 | 0.656 | 0.593 |
| t5 | t4, with a wider haunch zone | 0.298 m | 0.58 | 0.534 | 0.656 | 0.594 |

The rabbit of this work is t4. The zone of t5 changed almost nothing, so the narrower zone stays,
because it changes fewer weights of the file.

In k1, the level thighs raised the seat to 0.40 m, and the long shins stood straight. In k2, the
knee stood as high as before. The test p2 moved the thigh weight of the haunch to the hips only in
the bind pose. The seat rose by 4 cm, so the hip joints came 4 cm closer to the seat. The packer
rule of t4 does the same with the weights of the file, before each vertex keeps its two largest
weights. Thus the skin of the app and the bind pose use the same weights.

A test on k2 turned the shins 20° back from the vertical. The calf went further under the seat,
and the leg kept its slant, so the shins point down.

## The weights of the haunch

The rule `haunch` of `tools/blender/rig_body.py` takes a part of the thigh weight of each vertex
to the hips. The part is the product of two ramps, in thigh lengths: a smooth step from 0.1 to 0.4
behind the hip joint, and 1 minus a smooth step from 0.35 to 0.75 down the thigh. The vertices of
the crease between the haunch and the back of the thigh, 0.6 thigh lengths down, keep a mix of 0.6
on the thigh and 0.4 on the hips, so that the crease stays soft.

The lowest vertex of the hips of t4 is a vertex of this crease, 0.7 thigh lengths down the right
thigh, with 0.45 of its weight on the thigh. Its weights come from the file.

## The results

| Measure | Before | After |
|---|---|---|
| Hip joint above the seat | 0.93 thigh lengths | 0.75 thigh lengths |
| Knee ratio (left, right) | 1.30, 1.26 | 0.59, 0.59 |
| Fitted chair seat | 0.265 m | 0.296 m |
| Thigh length | 0.215 m | 0.237 m |
| Knee in front of the seat edge | | 0.07 m |

No thigh corner goes into the 4 cm seat board of the chair. Before, thigh corners went 3.8 cm
into it. The calves still reach 9 mm (right) and 15 mm (left) behind the front edge of the board,
1.5 cm to 2.8 cm below the seat top. Before, they reached 33 mm behind it. The thigh slope stays
20°, so the top line of the thigh falls toward the knee.

In the front view, between rows 464 and 500 of `rabbit-rows.txt`, the shins of the sheet are 35
to 39 px wide. The shins of the page are 36 to 39 px wide with the scale of 1.3 across, and they
were 28 to 29 px wide before.

The front IoU goes down by 0.019. The part of the sheet that the page does not cover grows from
31.1% to 33.7%, and the part of the page outside the sheet goes from 25.0% to 24.5%. The side and
the back IoU go up a little.

## The bow at rest

With the longer thighs, the knee was out of easy reach of the bow paw. The grip of the bow at rest
was on the knee, and the right forearm of the first rabbit turned 1,787° a second at 0.668 s of
the lift in the default demo. The lift test failed with 1,081° a second for the bow paw, and the
pose test of the seeded rest motions found a step of 0.067 in 2 ms (limit 0.06). A grip at 0.85 of
the way from the hip to the knee passes both tests, also with the old body. A grip on the knee
with an offset of 0.12 H up, 0.04 H up, or 0.22 H out failed.

## Size

The rabbit module grows by 1 B after gzip, and the skin by 594 B, to 32,934 B.

## Images

`rabbit-views.png`, the page before this work, and the page after it, in the front view and the
profile view:

![The sheet, the page before, and the page after](2026-10-10-rabbit-knees/sheet-before-after.webp)

The rabbits of the first violins in the play frame of `pnpm snapshot`, before (commit `03b142e6`)
and after:

![The rabbits on the stage before and after](2026-10-10-rabbit-knees/play-before-after.webp)
