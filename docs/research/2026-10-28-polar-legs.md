# The legs of the polar bear pianist

Date 2026-10-28. Round `sixth-polar-legs`. Decisions:
[`2026-10-28-polar-legs.md`](../decisions/2026-10-28-polar-legs.md). The probes and their outputs
are in [`2026-10-28-polar-legs/`](2026-10-28-polar-legs/): `probes/`, `phase1/`, and `phase2/`.
Each command runs from the root of the tree. "Main" is `9e11ffa3`.

## 1. The question

The user looked at the pianist from its left front and said: "the polar bear's leg is too long,
making it like a human instead of polar bear. Find the original mesh for the polar bear and do
not make deviate too far from it. You can reduce the height of the bench if needed." On `main`,
the rig made the thighs 1.6 times and the shins 3.208 times as long as on the mesh, for the
bench of 0.38 m of the reference sheet. Nobody checked the legs of the mesh against that bench.

## 2. The mesh and the variants

`probes/leg_table.py` (`leg-table.txt`) gives the standing legs at the scale of `main`:

| Body | Thigh | Shin | Shin / thigh | Hip joint above the sole | Leg / trunk | Leg / H |
|---|---|---|---|---|---|---|
| Mesh (factor 1.0) | 0.187 m | 0.126 m | 0.67 | 0.403 m | 0.63 | 1.36 |
| 1.2 | 0.225 m | 0.151 m | 0.67 | 0.465 m | 0.73 | 1.57 |
| 1.4 | 0.262 m | 0.176 m | 0.67 | 0.527 m | 0.82 | 1.78 |
| `main` | 0.300 m | 0.403 m | 1.35 | 0.785 m | 1.23 | 2.66 |

Phase 1 rigged each factor with level thighs and with the thighs 10° and 20° down
(`phase1/rig-check-*.txt`), and probed each in the tree with the hold of `main`
(`probes/probe-variant.sh`, `phase1/table.txt`). With the thighs 10° down:

| Factor | Bench top | Hip / knee | Head top play / rest | Shoulders, play | Elbows above the keys | Forearm |
|---|---|---|---|---|---|---|
| `main` | 38.2 cm | 50.1 / 50.1 cm | 145.6 / 153.5 cm | 106.7 cm | 7.3 / 5.2 cm | 3.6° down |
| 1.0 | 13.5 cm | 25.2 / 21.9 cm | 120.6 / 128.6 cm | 81.7 cm | −8.2 / −8.9 cm | 39.8° up |
| 1.2 | 16.6 cm | 28.8 / 24.9 cm | 124.2 / 132.2 cm | 85.3 cm | −7.2 / −8.1 cm | 36.6° up |
| 1.4 | 19.2 cm | 31.9 / 27.4 cm | 127.4 / 135.4 cm | 88.5 cm | −6.0 / −7.0 cm | 32.6° up |

Level thighs gave benches of 11.2, 13.3, and 15.9 cm, and 23, 5, and 2 knee faces turned over
in the bind. `source.webp` shows the mesh, 1.2, 1.4, and `main` standing and seated at one
scale beside the reference, and `views-play.webp` and `views-rest.webp` show the variants in
the app. The manager chose 1.2 with the thighs 10° down, and lifted the keys of 0.81 m.

## 3. The knee of the short shin

The calf fair of `main` covered 0.03 to 0.17 units down the shin, and the shin of 1.2 is 0.105
units long. `probes/knee-variants.sh` (`phase2/knee-variants.txt`) runs the probes of
`2026-10-27-polar-legs-rebuild/` on each variant. Hard inner edges turn more than 40° within
0.2 units of the knee, left / right:

| Variant | Knee width × depth | Hard inner | Back hard edges | Pleat faces | Through the skin |
|---|---|---|---|---|---|
| Fair of `main` | 0.126 × 0.133 | 24 / 28 | 10 / 7 | 2 / 2 | 0 / 0 |
| Fair 0.012 to 0.065 (chosen) | 0.126 × 0.131 | 24 / 11 | 11 / 3 | 3 / 6 | 0 / 0 |
| No fair | 0.126 × 0.136 | 26 / 17 | 13 / 11 | 6 / 6 | 0 / 0 |
| Fair 0.012 to 0.065, crease reach 0.06 | 0.127 × 0.132 | 33 / 17 | 12 / 3 | 11 / 12 | 0 / 0 |

## 4. The keys and the hold

`probes/hold-scan.sh` with `probes/seat-probe.ts` (`phase2/hold-scan.txt`) scans the hold, the
scale of the piano, and the distance of the keys. The play medians of `bach-bwv1047`:

| Piano scale / keys in H | Hold | Elbows above the keys | Forearm | Head gap | Haunch gap |
|---|---|---|---|---|---|
| 1.16 / 1.3 | `main` | −7.2 / −8.1 cm | 36.6° up | 11.2 cm | −3.9 cm |
| 1.16 / 1.3 | lean 6°, drop 4° | 1.4 / 0.4 cm | 11.0° up | 31.4 cm | −3.9 cm |
| 1.16 / 1.1 | lean 6°, drop 4° | −2.3 / −4.0 cm | 22.6° up | 25.7 cm | −2.5 cm |
| 1.16 / 0.9 | lean 6°, drop 4° | −4.6 / −6.6 cm | 30.0° up | 19.9 cm | −0.9 cm |
| 1.03 / 1.0 | lean 6°, drop 4°, elbows (±1, −0.6, 0.4) | 6.3 / 4.5 cm | 1.4° down | 26.3 cm | −0.9 cm |
| 1.03 / 1.0 | chosen, elbows (±1, −0.7, 0.4) | 5.7 / 3.7 cm | 0.4° up | 26.3 cm | −0.9 cm |

The lean does not move the haunch. The pedal leg does: farther keys make the right leg reach,
and the thigh weights of the haunch pull it down. At 1.0 H, the play haunch gap is the gap of the
rest. The keys stand at 0.72 m at the scale 1.03.

The arm gate then failed two values (`phase2/arm-variants.txt`). The left shoulder folded 24
faces at rest (19 on `main`, margin 2), because the shorter lap brings the rest paws nearer to
the belly. The move twist of the lift was 40° and 42° (26° and 27°, margin 3). Rest paws 0.6 H
forward remove the folds. Rest elbows near the play elbows, and a lower arc of the lift, remove
the twist.

## 5. The gates

The probes ran on the tree rebased onto `main` `d2d23a565`. `probes/seat-probe.ts`
(`phase2/gate-seat.txt`) gives the final seat: the bench top 16.6 cm, the hip and knee joints
28.8 and 24.9 cm, the knee 100°, the haunch 0.9 cm into the pad in the play as at rest, the head
top 131.2 cm in the play and 132.2 cm at rest, and the head 24 cm or more from the case.

| Gate | Result | Output |
|---|---|---|
| `pnpm arm-check --all --base main` | no `FAIL`. The pianist folds 21 and 13 faces at rest (19 and 15 on `main`, `OPEN`), and the paws twist 27° and 28° in the lift (26° and 27°) | `gate-arm-check-all.txt` |
| `pnpm hold-fit pianist --demo all --base main` | each note target within 5 mm. Play upper arm turn 64° and 62° (51° and 47°) | `gate-hold-fit.txt` |
| `pnpm pose-depth pianist --gaps --base main` | play forearms 6.3 cm and upper arms 6.8 cm into the body (8.8 and 10.3 cm). In the lift and the lowering, the paws go 1.0 cm and the forearms 1.5 cm into the case front (limit 1.5 cm, 0 and 0.6 cm) | `gate-pose-depth.txt` |
| `pnpm fold-probe pianist --base main --faces 60` | rest 34, play 33 (34), lift 34. The faces of the right groin fold in no sample | `gate-fold-probe.txt` |
| `pnpm rig-mesh polar-bear --check` | 5,106 triangles, packed mesh 32,400 B after gzip (budget 34,000 B), the standing body within 0.28 mm. 4 faces of the left leg stay turned over in the bind (0 on `main`) | `gate-rig-check.txt` |
| `pnpm body-probe --base main` | only the polar bear bodies and the pianist change. The poses of the other players change only in the four demos with a piano, by the layout | `gate-body-probe.txt` |
| `pnpm carry-check violinist,fox-violinist,violist --base main` | each value of `main` | `gate-carry-check.txt` |
| `pnpm size --base main` | 832,784 B, +614 B | `size.txt` |

The smaller piano moves rows of the four demos with a piano (`probes/layout-moves.ts`,
`phase2/layout.txt`): two violins up to 1.40 m in `bach-bwv1050` and 0.99 m in
`boulanger-matin`, and each player up to 0.18 m in `bach-bwv1047` and `bach-bwv1048`. The rows
keep their gaps, and the other ten demos keep each place. The round changes no file of
`src/scene/` and no shader, so it runs no `pnpm frame`.

## 6. The images

`images/` holds the renders of `probes/final-images.sh`, `main` above or left of the round:

- `e20-<view>.webp`, `e40-<view>.webp`: the moments chord, between, far-left, far-right, and
  rest from the front, the back, each side, 35, −35, 150, and −150, at 20° and 40°. The case and
  the lid hide the body from the front and from −35, as on `main`.
- `legs-<view>.webp`: 2x crops of the knees and the haunch on the bench, at the chord and at
  rest.
- `arms-<demo>-<time>-arms.webp`: 2x crops of each arm and wrist at the worst sample, a strike,
  and a rest (`pnpm arm-check pianist --base main --views <dir> --views-all`).
- `final-views-play.webp`, `final-views-rest.webp`: the stage from the left, the back, the angle
  of image 53, the gallery view from 35°, and the default view.
- `demos.webp`: the default view of each demo at 30 s. The camera of the default view moves at
  that time, so two runs of one tree frame the stage a little apart: in `mozart-k525`, two runs
  of `main` differ by 2.4 of 255 on the mean, and `main` and the round by 2.3 to 2.5.

No crop shows a new clip, fold, or twist. The knees bend round, the haunch sits on the bench, and
the feet stand flat, with the right foot on the damper pedal in the play.

## 7. Open

- The head top is 1.31 m in the play (1.46 m on `main`), and in the default view of
  `bach-bwv1050` the red fox violinists hide more of the bear.
- The rows of two demos move up to 1.40 m. Shorter legs of the piano at the scale 1.16 would keep
  the layout.
- The bench is 0.13 of the head top, and 0.28 on `polar-bear-views.png`.
- In the lift and the lowering, the paws and the forearms touch the case front up to the limit.
- 4 faces of the left shin and thigh stay turned over in the bind.
