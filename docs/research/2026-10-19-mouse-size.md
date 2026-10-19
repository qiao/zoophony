# The mouse at the size of the parametric mouse

Date 2026-10-19. Round `mouse-size`. Decisions:
[`2026-10-19-mouse-size.md`](../decisions/2026-10-19-mouse-size.md). The probes and their outputs
are in [`2026-10-19-mouse-size/`](2026-10-19-mouse-size/). Each command runs from the root of the
tree, and the base is `ef456e07`.

## 1. The question

The user said: "the mouse is way too big. make it the size of the previous parametric model". The
mouse mesh gets the head top of the parametric mouse. The arm factor stays 1.4, so the measure
that decides is the largest oboe scale at which each paw reaches its grip with 3 cm to spare, in
the play and in the rest, with no new fold and no depth over the contact depth.

## 2. The measures

**Size.** The rig is in the units of the source, so `pnpm rig-mesh mouse` writes the same GLB file
at the new `app.shoulders`. Only the export scale changes (`rig-check.txt`):

| Measure | `ef456e07` | This round |
|---|---|---|
| Standing skull top | 1.570 m | 0.812 m |
| Ear tips | 1.655 m | 0.856 m |
| Scale | 1.655245 m/u | 0.856046 m/u |
| H | 0.525 m | 0.272 m |
| Seat, chair depth | 0.147 m, 0.190 m | 0.076 m, 0.120 m |
| Reach with the arm factor 1.4 | 0.629 m | 0.325 m |
| Footprint | 0.785 m by 1.418 m | 0.420 m by 0.764 m |
| Stage side of the demos with oboes | | 2.1% to 6.3% smaller |

The tail loop scales with the body. It lies about 0.31 m behind the chair, in place of 0.6 m.
`lineup-base-views.webp` and `play-base-views.webp` show the mouse beside the other animals.

**Oboe scale.** `scan2.ts` measures the spare reach of each paw with `windReach()` of
`pnpm hold-reach`, for each hold variant and each scale (`--set mouse.oboeScale=<s>`). The table
gives the largest scale with 3 cm to spare in the play and in the rest (`scan2.txt`):

| Hold | Largest scale |
|---|---|
| The hold of `ef456e07`: the reed 0.14 H back, the oboe at 40° | 0.52 |
| The right shoulder turned 40° in place of 20° | 0.59 |
| The oboe at 35° | 0.54 |
| The reed 0.20 H back | 0.58 |
| The reed 0.23 H back | 0.62 |
| The reed 0.20 H back, the lower end turned 10° to the right | 0.61 |

The place of the reed is the strongest lever. The right shoulder turned 30° or 40° folded the right
arm in 87% to 100% of the play samples, and the oboe at 35° in 100% (`fit2.txt`, `fit3.txt`). A
right paw with less than about 2 cm to spare also folded the play.

**Hold fit.** `pnpm hold-fit oboist --set <variant>` on the demos of `FIT_DEMOS` (`fit3.txt` to
`fit6-poles.txt`):

| Variant | Play folds | Lift folds | Rest faces | Arm turns L / R |
|---|---|---|---|---|
| Hold of `ef456e07`, scale 0.52 | 0.0% | 12.9% | 0 | 58°, 122° / 61°, 99° |
| Reed 0.23 H, scale 0.62 | 0.0% | 19.4% | 2 | 58°, 123° / 63°, 100° |
| and the rest 0.04 H lower, 0.03 H forward (`fit5.txt`) | - | 12.9% | 2 | - |
| and the new rest shape (final) | 0.0% | 0.0% | 0 | 58°, 123° / 63°, 100° |
| final, elbows (-1, -1, -1) | 0.0% | 0.0% | 0 | 56°, 142° / 67°, 120° |
| final, elbows (-0.3, -1, -0.3) | 100% | 90.3% | 0 | 62°, 111° / 63°, 88° |

The rest turns and the rest elbows of `fit4.txt` and `fit5.txt` kept one or two folded faces of
the left arm in the rest. `pnpm raise-fit oboist --faces 1308,2611 --side L --sets rest` fits the
rest shape again (`raise-fit.txt`). With the reed at 0.23 H, the oboe goes 1.0 cm into the head
(the instrument in the body of the sweep, limit 1.5 cm), about half of the reed. The close views
show the reed in the mouth under the nose (`oboist-base-views.webp`).

**Final.** `pnpm hold-reach mouse --instrument oboe` (`hold-reach.txt`): the left paw has 7.0 cm
(play) and 6.2 cm (rest) to spare, and the right paw 3.0 cm and 3.3 cm. At 0.63, the right paw has
2.8 cm in the play. `pnpm fold-probe oboist`: no sample of the rest, the play, or the lift folds
(`fold-probe-oboist.txt`). `pnpm pose-depth oboist`: each part is within 0.5 cm, and the limit is
1.5 cm (`pose-depth-oboist.txt`). `pnpm body-probe --base ef456e07`: the other 90 bodies and 22
players are equal, and 1,249 of 1,492 pose sets are equal, because the smaller footprint moves the
layout (`body-probe.txt`). `pnpm test:paused src/shots/` passes (`shots-test.txt`).

## 3. The result

The mouse stands 0.812 m high to the skull top, and plays an oboe of 0.62 of the oboe of the app
(0.34 m), the largest scale with 3 cm to spare. The reed goes 0.09 H deeper into the mouth, and
the rest moves a little lower and forward. The new rest shape also removes the lift folds of the
last round. In the close views, the chair back of the app now reaches the neck of the small mouse.
