# The seat of the polar bear pianist

Date 2026-10-22. Round `polar-seat`. Decisions:
[`2026-10-22-polar-seat.md`](../decisions/2026-10-22-polar-seat.md). The probes and their outputs
are in [`2026-10-22-polar-seat/`](2026-10-22-polar-seat/). Each command runs from the root of the
tree.

## 1. The question

The user said: "also the polar bear's pose is very wrong now". The mesh polar bear of
`2026-10-22-mesh-polar-bear.md` did not read as seated: its legs were near straight, the bench was a
low block behind its heels, and the body leaned over the keys. The target is a real seated pianist:
the haunch on the bench, the thighs near level, the knees near 90°, the shins near vertical, and the
soles on the floor. A real pianist sits "on the front half of the bench, with your feet firmly on
the floor", with the feet "close to the pedals" ([Merriam
Music](https://www.merriammusic.com/school-of-music/5-keys-to-piano-posture/)), and leans forward a
little ([ArtistWorks](https://blog.artistworks.com/?p=2173)). The legs keep the length of the mesh,
and the arm factor stays 1.25.

## 2. The measures

`seat-probe.ts` measures the pose of the app (`seat-base.txt` at `3796be6d`, `seat-round.txt`): the
angles of the left leg from the side, the lowest trunk corner over the bench less the bench top, the
soles, the center of mass, the knees, and the arms. The play row is the median sample of the lean in
`bach-bwv1047`.

| Measure | Base `3796be6d` | Round |
|---|---|---|
| Hip angle, rest / play | 102° / 88° | 90° / 76° |
| Knee angle | 116° | 95° |
| Ankle angle (shin to sole) | 117° | 107° |
| Haunch to the bench top, rest / play | 0.0 / 0.1 cm | 0.1 / 0.1 cm |
| Lowest sole above the floor | 0.0 cm | 0.0 cm |
| Bench: top, width × depth | 0.173 m, 0.75 × 0.35 m | 0.153 m, 0.95 × 0.39 m |
| Center of mass in front of the bench front, rest / play | 13.5 / 24.7 cm | 5.5 / 15.1 cm |
| Top of the legs below the case of the piano, play | 24.4 cm | 26.5 cm |
| Legs behind the front of the keys | 46.5 cm | 42.3 cm |
| Shoulder joints, play | 1.027 m | 0.939 m |
| Elbows above the key tops, play | 12.4 cm | 8.9 cm |
| Forearm slope up to the wrist, play | -6.8° | 0.5° |
| Note targets within 5 mm | 100% | 100% |
| Play samples with a fold (`fold.txt`) | 52.2% | 36.5% |
| Lift / rest samples with a fold | 75.8% / 100% | 57.3% / 75.0% |

The clearance sweep, `pnpm pose-depth pianist --every 4 --gaps` (`pose-depth-base.txt`,
`pose-depth.txt`):

| Pair | Base | Round |
|---|---|---|
| Play: paws / forearms / upper arms in the body | 0.7 / 7.7 / 9.4 cm | 0.0 / 6.2 / 8.1 cm |
| Play: head to the case | 5.3 cm | 12.0 cm |
| Lift: forearms / upper arms in the body | 1.9 / 1.5 cm | 0.1 / 0.9 cm |
| Rest: paw L / R to the belly | 4.2 / 2.9 cm | 4.0 / 4.3 cm |
| Lowering: forearms / upper arms in the body | 8.8 / 11.7 cm | 6.7 / 11.4 cm |

The seat variants (`pnpm rig-mesh polar-bear --check --set`, `rig-variants.txt`). The thigh joint at
the crotch and the knee at y 0.1 u give a thigh of 0.075 u, shorter than the leg is thick (0.15 u),
so the thighs hide under the belly at each angle. A fold share with the lean of 28° is of the hold
of the base:

| Variant | Seat | Knee | Play folds | Look from the side |
|---|---|---|---|---|
| Base: thigh joint at the crotch, thighs 15° down, shins 10° forward | 0.173 m | 116° | 52.2% | Straight legs, bench behind the heels |
| Base joints, thighs level | 0.144 m | 90° | 93.4% (lean 28°) | Straight legs |
| Thigh joint in the haunch (y 0.25 u), knee y 0.1 u, thighs 10° down | 0.072 m | 100° | 100% (lean 28°) | Thighs show, bench near the floor |
| Thigh joint y 0.26 u, knee y 0.145 u, thighs 10° down | 0.159 m | 100° | 97.5% (lean 28°) | Short thigh, bench behind |
| The same, thighs 5° down, bench front at 0 u, half width 0.25 u | 0.142 m | 95° | 36.5% (lean 24°) | Haunch on the bench, knees bent, a light spike over the tail |
| The same, haunch ramp 0.16 to 0.24 u (round) | 0.153 m | 95° | 36.5% (lean 24°) | No spike |
| The same, haunch ramp 0.175 to 0.26 u | 0.147 m | 95° | 64.5% (lean 24°) | No spike |
| Round with thighs 30° out | 0.135 m | 95° | 37.8%, rest 100% | No change from above |
| A lean from the hips, `studio.trunk.open` -12 / -18 (`lean-sit.patch`) | 0.143 / 0.146 m | 95° | 100% (lean 14° and 18°, `hip-lean-folds.txt`) | Back slopes, arms fold |

The lean of the hold on the round body (`pnpm pose-depth pianist --every 4 --gaps --set`,
`lean-scan.txt`):

| Lean | Targets within 5 mm | Paws in the body (share over the limit) | Head to the case |
|---|---|---|---|
| 28° | 100% | 3.7 cm (33.5%) | 7.0 cm |
| 26° | 100% | 1.7 cm (0.5%) | 9.2 cm |
| 24° | 100% | 0.0 cm | 12.0 cm |
| 22° | 99.8% (12 mm) | 0.0 cm | 15.2 cm |
| 20° | 99.1% (27 mm) | 0.0 cm | 16.0 cm |

`pnpm arm-check pianist --base 3796be6d` (`arm-check.txt`) and `pnpm arm-check --all --base
3796be6d` (`arm-check-all.txt`) give no `FAIL`. The grip turn of each paw grows from 1° to 10°
(limit 45°). `pnpm body-probe --base 3796be6d` (`body-probe.txt`): only the bodies of the polar bear
and its player change. The layout fits the new footprint of the pianist: in `boulanger-matin`, the
pianist moves 25 cm, the harp deer 23 cm, and the other players up to 9 cm, and in the other demos
up to 4 cm (`layout-move.txt`). The poses of the other players change with these moves and the cues.
`pnpm size --base 3796be6d` (`size.txt`): -65 B.

## 3. The result

The round moves the hip joints into the haunch and the knees to the bottom of the round body, as the
joints of a bear lie. The thighs then take the lower sides of the haunch and turn forward to 5°
below level, the shins stand vertical, and the knee angle is 95°. The bench reaches under the thighs
and holds the whole haunch, and its top fits the legs. The haunch rests on the bench within 1 mm,
the soles touch the floor, and the legs stay 26 cm below the case.

The trunk sits about 10 cm lower, so the shoulders come nearer the keys. The lean of 24° reaches
each note with no paw in the belly, and the forearms are level, as the rule of a real pianist asks
(`2026-10-14-polar-bench.md`). The lap places move 0.1 H nearer the belly, so that the paws rest
about 4 cm from it. The folds drop in each sample set.

The haunch ramp of the deer gave the thighs a share of the root of the tail, and the seated thighs
pulled it into a light spike over the tail ball from behind. The ramp from 0.16 to 0.24 u keeps the
root on the hips.

A lean from the hips in the seated bind gave the best seated outline, but it folded both arms in
each play sample, so the play lean stays at the spine. The center of mass lies between the bench
front and the soles, because the calves stop the bench front.

The legs of the mesh are short (the knee joint 0.28 m above the soles), so the bench is 0.153 m
high, and the round belly hides the thighs from the side. The bear reads as seated low on its
haunch. A clear lap needs longer legs, which is a decision of the user (`TODO.md`).

The audit of the seam gate found dark wedges at the outer upper arms (`audit-pianist-back.webp` of
`2026-10-22-seam-gate/`). The seat does not change the arm weights or the cut, and the round does
not fix them.

The images: `pairs-e20-*.webp` and `pairs-e40-*.webp` (the base above the round, each moment, six
views), `audit-e20.webp` and `audit-e40.webp`, `knees.webp` (the knees from each side beside the
seated rabbit and red fox), `strip-az*.webp` (bach-bwv1050 from 17 s, each 0.5 s, the base above the
round), `arms/` (the 2x crops of the arm gate), and `lean-sit.patch` (the code of the lean variant).