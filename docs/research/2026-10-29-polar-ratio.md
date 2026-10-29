# The part ratios and the side lean of the polar bear pianist

Date 2026-10-29. Round `polar-ratio`. Decisions:
[`2026-10-29-polar-ratio.md`](../decisions/2026-10-29-polar-ratio.md). The probes and their outputs
are in [`2026-10-29-polar-ratio/`](2026-10-29-polar-ratio/): `probes/`, `out/`, and `images/`.
Each command runs from the root of the tree. "Base" is `c44b8ebb4`.

## 1. The questions

The user asked for the body size and the part ratios of the original mesh, with a free bench
and piano. The measure is the ratio of each part to `polar-bear-tpose.glb`, within about 5%, in a
natural seat. Later, the user asked for calm motion at about 12 s of `bach-bwv1050`.

## 2. The ratios

`probes/ratio_table.py` measures the source, the standing body (`source-long-arms.obj` of
`pnpm rig-mesh --check --preview`), the seated bind (`probes/dump_rig.py`), and the play
(`probes/pose-dump.ts`, `bach-bwv1047` at 149.77 s). Lengths come from the joints. A girth is
the mean diameter (the perimeter over π) of a cut square to the part axis, and a side width is
the width of that cut. Outputs: `out/ratio-c44b8ebb4.txt`, `out/ratio-round.txt`.

| Part | Source | Base standing / source | Base seated / source | Round standing / source | Round seated / source |
|---|---|---|---|---|---|
| Standing height | 1.000 u (1.58 m) | 1.06 | | 1.00 | |
| Head (joint to skull top), trunk, shoulders, chest, arms | | 1.00 | 0.99 to 1.00 | 1.00 | 0.99 to 1.00 |
| The same parts / standing height | | 0.94 | | 1.00 | |
| Belly width / depth | 0.361 / 0.340 u | 1.00 / 1.00 | 0.97 / 0.95 | 1.00 / 1.00 | 0.97 / 0.95 |
| Thigh length | 0.130 u | 1.30 | 1.30 | 1.00 | 1.00 |
| Shin length | 0.087 u | 1.30 | 1.30 | 1.00 | 1.00 |
| Thigh girth at 0.7 / side width | 0.163 / 0.154 u | 0.99 / 0.99 | 0.89 / 0.96 | 1.00 / 1.00 | 0.90 / 0.97 |
| Shin girth at 0.5 / side width | 0.123 / 0.119 u | 0.99 / 1.00 | 0.94 / 0.96 | 0.99 / 0.99 | 0.96 / 0.97 |
| Shin girth at 0.75 | 0.118 u | 1.00 | 1.00 | 1.00 | 0.99 |

The head, the trunk, and the arms keep the ratios of the mesh in each step. The small head and
the tall trunk come from the legs: the leg factor 1.3 made each other part 0.94 of its share of
the standing height. The thigh cut at 0.7 lies in the bend of the knee, so the side width is the
better measure there.

The steps that move a ratio more than 5%:

- `legFactor` 1.3: the thighs and the shins 1.30.
- The knee crease and the calf fair of the seated bind: the seated thigh 0.89 and the shin 0.94
  at the factor 1.3, and 0.87 and 0.89 at the factor 1.0 (`out/seated-variants.txt`). A rig with
  no knee crease keeps 0.93 and 0.99. The other steps keep each ratio within 5%.

## 3. The legs and the seat

`pnpm rig-mesh polar-bear --check --keep <dir> --set legFactor=<f>;studio.legTurns.thigh=<q>`
with the turns of `leg_turns.py <config> <down> 15 0` of `docs/research/2026-10-16-hip-open/`
(`out/rig-check-variants.txt`, `out/seated-variants.txt`), at 1.5828 m for each unit:

| Leg factor, thighs down | Bench (app) | Midline rump over the bench | Seated head top (rest) |
|---|---|---|---|
| 1.3, 25° (base) | 0.255 m | 0.0 cm | 1.540 m |
| 1.2, 25° | 0.237 m | | 1.517 m |
| 1.1, 25° | 0.201 m | | 1.495 m |
| 1.0, 15° | 0.169 m | | 1.438 m |
| 1.0, 25° (chosen) | 0.200 m | 0.1 cm | 1.472 m |
| 1.0, 35° | 0.199 m | 2.9 cm | 1.503 m |

The seat top of the rig is the thigh root under the hip joints, so a steeper thigh lowers the
seat top with the knee, and the bench stays at 0.199 m. With no calf fair, one vertex of the left
thigh root at z −0.02 set the seat top 1.1 cm under the haunch: `chair.front` −0.025 leaves it
out.

The knee probes of `docs/research/2026-10-28-polar-legs/probes/knee-variants.sh`
(`out/knee-variants.txt`) give the seated shin at 0.5 of its length, left leg:

| Knee rule at the factor 1.0 | Shin width × depth | Hard edges behind the knee | Edges through the skin |
|---|---|---|---|
| Calf fair of the base | 0.107 × 0.107 u | 4 / 4 | 0 / 0 |
| Fair with 8 rounds | 0.111 × 0.113 u | 7 / 5 | 0 / 0 |
| No fair (chosen) | 0.114 × 0.119 u | 10 / 8 | 0 / 0 |
| Knee crease that only fills | 0.117 × 0.124 u | 35 / 32 | 26 / 30 |

The source shin is 0.119 × 0.126 u. The renders of `images/knee-backs.webp` show no dark valley
on the calf with no fair. Two thin faces of the right groin then folded in each play sample, and
one mean of their weights removes the fold (`pnpm fold-probe pianist --base c44b8ebb4`).

## 4. The piano and the rest

`docs/research/2026-10-28-polar-legs/probes/seat-probe.ts` with each piano (`out/seat-scan.txt`),
play medians of `bach-bwv1047`:

| Piano scale, keys distance | Elbows above the keys L / R | Forearm | Haunch gap |
|---|---|---|---|
| 1.22, 1.0 H (base piano) | 3.7 / 1.0 cm | 6.3° up | −2.3 cm |
| 1.14, 1.0 H | 7.1 / 4.5 cm | 2.4° down | −2.3 cm |
| 1.16, 1.0 H (chosen) | 6.2 / 3.6 cm | 0.1° down | −2.3 cm |
| 1.16, 0.9 H | 5.6 / 3.0 cm | 1.4° up | 0.0 cm |

The arm gate of each variant (`out/arm-scan.txt`) decides the keys distance and the rest. At
0.9 H and 0.92 H, the left shoulder folds 22 to 24 faces (20 on the base). At 1.0 H, the rest
paws need 0.8 H in front of the lap point: from 0.6 H to 0.75 H, the left shoulder folds 24
faces at rest. The rest paws 0.8 H forward then put the forearms 1.6 cm into the case in the
lowering, and a forward arc of 0.15 H gives 1.1 cm (`out/depth-scan.txt`).

## 5. The side lean

`probes/sway-probe.ts <root> <demo> <from> <to>` gives the side place of each bone at steps of
0.01 s (`out/sway-*.txt`, `out/sway-*-10-14.csv`). A turn counts a change of direction of 2 mm or
more.

| Span | Tree | Head range | Head speed, largest | Head turns each second |
|---|---|---|---|---|
| `bach-bwv1050` 10 to 14 s | base | 22.0 cm | 273 cm/s | 5.25 |
| `bach-bwv1050` 10 to 14 s | round | 13.5 cm | 52 cm/s | 3.25 |
| `bach-bwv1050` 0 to 60 s | base | 26.7 cm | 752 cm/s | 3.43 |
| `bach-bwv1050` 0 to 60 s | round | 26.2 cm | 92 cm/s | 2.00 |
| `boulanger-matin` 0 to 60 s | base | 8.7 cm | 47 cm/s | 0.47 |
| `boulanger-matin` 0 to 60 s | round | 8.2 cm | 18 cm/s | 0.27 |

The cause is `sideLeanOf()`: the lean followed the mean of the two palms at each moment, and the
palms jump between registers in a fast passage. The lean now takes the mean of the palms over
0.3 s before and after the moment, with a raised cosine weight on 61 samples (`sideLeanAt()`).
The far keys still get the full lean.

The window scan (`out/sway-window-scan.txt`) sets the width. A wider window gives a calmer head,
but the trunk lags behind the paws, and the arms cross further into the belly:

| Window | Head speed, 10 to 14 s | Play upper arms in the body | Lower upper arms in the body | Notes within 5 mm |
|---|---|---|---|---|
| none | 260 cm/s | 7.6 cm | 7.7 cm | 100% |
| 0.3 s (chosen) | 52 cm/s | 8.1 cm | 8.4 cm | 100% |
| 0.35 s | 37 cm/s | 8.3 cm | 8.8 cm | 100% |
| 0.4 s | 26 cm/s | 8.3 cm | 9.1 cm | 100% |
| 1.5 s | 20 cm/s | 10.3 cm | 12.3 cm | 99.8% |

The base gives 8.3 and 8.5 cm. A window ahead of the song time made the depths larger. With 31
samples, the steps between the samples gave the head 13.5 turns each second. A seek gives the
same pose (`probes/seek-check.ts`, `out/seek-*.txt`), and the pose of the scene takes 0.092 ms
(0.082 ms on the base).

## 6. The gates

Each gate runs against the base (`out/gate-*.txt`).

| Gate | Result |
|---|---|
| `pnpm arm-check pianist --base c44b8ebb4 --views <dir>` | `OPEN`, as the base: folds 20 and 11 (20 and 12), and each other value at or under the base |
| `pnpm fold-probe pianist --base c44b8ebb4` | rest 28 (32), play 31 (29), lift 32 (32), no new face |
| `pnpm pose-depth pianist --targets` | each note target within 5 mm in the four demos |
| `pnpm pose-depth pianist --gaps --base c44b8ebb4` | the arms in the body at or under the base. The play upper arms go 8.1 cm in (8.3 cm on the base, limit 4 cm). The paws and the claws go 1.0 to 1.1 cm into the case at rest and in the lift (limit 1.5 cm) |
| `pnpm clip-probe` of the four demos with a piano | `PASS` in each, as the base |
| `pnpm body-probe --base c44b8ebb4` | only the polar bear bodies and the poses of the four demos with a piano change |
| Seat (`seat-probe.ts`, `out/gate-seat.txt`) | bench 20.0 cm, head top 145.9 cm in the play and 147.1 cm at rest, haunch 2.3 cm into the pad in the play |
| `pnpm size --base c44b8ebb4` (`out/size.txt`) | 843,319 B, +233 B |
| Layout (`out/layout.txt`) | the largest move of a player 29.5 cm (a violin of `boulanger-matin`), and of the pianist 9.1 cm |

The round changes no file of `src/scene/` and no shader, so it runs no `pnpm frame`.

## 7. The images

`images/` holds the renders of the round, the base beside or above the round:

- `standing-sheet.webp`, `seated-sheet.webp`: the source, the base, and the round at one scale
  from the front, the back, the left, and the right, standing and in the seated bind.
- `seated-variants-left.webp`, `seated-variants-left-back.webp`: the seated binds of the leg
  factors and the thigh slopes of section 3.
- `knee-backs.webp`: the backs of the knees of the knee rules of section 3.
- `user-angle-play.webp`: the play of `boulanger-matin` at 30 s from the left back, as the image
  of the user.
- `e20-<view>.webp`: the moments chord, between, far-left, far-right, and rest from the front,
  the back, each side, and ±150°, at 20°, with the fill light of the close views. The case hides
  the body from the front, as on the base. `legs-left.webp` and `legs-back.webp`: 2x crops of
  the legs and the bench. `face.webp`: the face of the round, the same happy face as the base.
- `stage-<demo>.webp`: the camera `orchestra` at 30 s.
- `head-side-10-14.webp`: the side place of the head over 10 to 14 s of `bach-bwv1050`, and
  `strip-11-13.webp`: its frames from the back at steps of 0.1 s, the base above the round.

## 8. Open

- The pedal leg pulls the haunch 2.3 cm into the pad in the play (0.1 cm on the base).
- The play upper arms go 8.1 cm into the belly, over the limit of 4 cm, as on the base.
- The seated thigh near the knee is 0.90 of the mesh by its perimeter (0.97 by its side width).
- In a fast passage, the head still moves about 4 cm to each side about two times each second.
