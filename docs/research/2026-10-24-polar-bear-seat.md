# The size and the seat of the polar bear pianist

Date 2026-10-24. The user looked at the T-pose polar bear pianist and said: "the polar bear is too
tall and sit too far away from the piano" and "the polar bear's arms are too stretched". The
decisions are in [`2026-10-24-polar-bear-seat.md`](../decisions/2026-10-24-polar-bear-seat.md).
The probes, their outputs, and the images are in
[`2026-10-24-polar-bear-seat/`](2026-10-24-polar-bear-seat/). The probe scripts ran from
`scratch/` of the worktree.

## What sets each value

```text
  ANIMALS height (tools/studio-body.ts) --> scale of the module --> H, shoulders, bench height
                                                                 |
  PIANO_FRONT_H (models/instruments/piano.ts) ---------------> key front = PIANO_FRONT_H * H
                                                                 + 0.05 m in front of the bench
  HANDS_HOLDS.piano (pose/hands.ts) --> lean, poles, rest lap place, restArc
```

The bench of the rig sets only the seat under the haunch. The piano stands in front of the floor
point of the body by `PIANO_FRONT_H` head heights, so that constant sets the seat distance.

## The cause of the straight arms

`pianist-size.ts` gives the joints of the pianist in the model axes (`size-scan.txt`):

| Body | Shoulder joints, play | Head top, play / rest | Mean play elbow | Rest elbow |
|---|---:|---:|---:|---:|
| Studio polar bear (931b5f32~1) | 1.08 m | 1.56 / 1.745 m | 105° | 91° |
| T-pose mesh of `main` | 1.23 m | 1.67 / 1.81 m | 152° (reach limit) | 180° |
| This round | 1.05 m | 1.42 / 1.54 m | 104° to 108° | 95° to 101° |

On `main` the shoulder joints stand 0.53 m above the keys, and each play arm is at the reach
limit of the IK, so it is straight. The shoulder to the key front is 0.42 m, about as on the
studio polar bear (0.40 m). So the height of the shoulders is the main cause. The rest place of
the paws lay 0.5 H in front of the knee, a place for the round belly of the studio polar bear.
The long thighs of the T-pose mesh put that place out of reach, so each rest arm hung straight.

## The size

The orthographic side view of `polar-bear-views.png` wins for the polar bear and the piano
(design 1). Against the keys of the app (0.70 m), it gives the head top at 1.40 m, the shoulder
joints at about 1.0 m, the elbow at the height of the keys, and the bench middle 0.475 m behind
the key front (`reference-side.txt`, `reference-side.webp`). Its label "180 cm" ends above the
head top, and with it the keys are 0.79 m high, so the label does not give the size.

`size-scan.txt` scans the size factor, the key distance, and the lean. The factor 0.85 puts the
play head top at 1.42 m and the shoulder joints at 1.05 m. At 0.88 the elbows are 7° straighter,
and at 0.82 the head top is 1.37 m, below the sheet. A smaller lean (18° or 22°) leaves paws up to
49.6 mm short of their keys, so the lean stays 28°.

## The seat distance

`key-distance.txt` scans `PIANO_FRONT_H` at the size 0.85:

| PIANO_FRONT_H | Key front from the bench middle | Mean play elbow L / R | Play forearms in body |
|---:|---:|---:|---:|
| 1.68 (as on `main`) | 0.60 m | 119° / 116° | 2.0 cm |
| 1.60 | 0.58 m | 112° / 108° | 3.7 cm |
| 1.55 (chosen) | 0.56 m | 108° / 104° | 4.3 cm |
| 1.50 | 0.54 m | 104° / 100° | 5.5 cm |
| 1.45 | 0.53 m | 100° / 96° | 6.6 cm |

On `main` the key front is 0.70 m from the bench middle. Nearer keys bend the elbows more, and
the forearms go deeper into the round belly. The value 1.55 bends the elbows to about 106° and
keeps the forearms at 4.3 cm (3.1 cm on `main`, accepted limit 9 cm).

## The rest

`rest-scan.txt` scans the lap place, and `gate-variants.txt` the poles on the arm gate. The paws
lie on the thighs, 0.45 of the way to the knee, 0.22 H up and 0.5 H forward, with the palms down
and the fingers forward and in. Elbows that point down, or paws 0.35 H forward, folded 10 to 13
faces of an arm (limit 8). Elbows that point out (poles ±1, -0.3, 0.77) fold 5 and 7. The wrist
arc goes 0.25 H forward: with 0.1 H, the lowering paws went 2.6 cm into the body.

## The gate and the depths

`pnpm arm-check pianist --base main` (`arm-check.txt`):

| Arm | folds p95 (8) | twist p95 (55) | flat p5 (0.55) | paw swing p95 (70) | stretch p95 (0.35) | move twist max (176) | move turn max (3000) | Verdict |
|---|---|---|---|---|---|---|---|---|
| L | 5 (7) | 30 (23) | 0.55 (0.49) | 37 (50) | 0.11 (0.16) | 38 (41) | 112 (331) | PASS |
| R | 7 (12) | 27 (27) | 0.74 (0.63) | 38 (51) | 0.06 (0.28) | 36 (36) | 118 (851) | PASS |

The value of `main` is in parentheses. The size alone failed the left stretch (0.24) and the
right move twist (40), and the size with the nearer keys the left stretch (0.26). The rest of
the third commit passes each measure.

`pnpm pose-depth pianist --gaps --base main` (`pose-depth.txt`): no part goes into the case, as on `main`, and each note target is reached.

| Set | Pair | `main` cm | Tree cm |
|---|---|---:|---:|
| play | forearms in body | 3.1 | 4.3 |
| play | upper arms in body | 7.6 | 6.4 |
| rest and lift | upper arms in body | 3.3 | 0.2 |
| lower | forearms in body | 3.9 | 4.9 |
| lower | upper arms in body | 7.6 | 6.8 |

The head keeps 14.6 cm from the case in the play. `pnpm body-probe --base main` changes only the
polar bear and the pianist (`body-probe.txt`). The smaller body moves the layout around the
piano, so some poses of the near players change too.

## The images

- `views.webp` and `views-main.webp`: the role views of the tree and of `main`.
- `views-e20.webp` and `views-e40.webp`: each moment at the camera heights 20° and 40°, from the
  front, each side, the back, az150, and az-150.
- `rest-pairs.webp`: the rest at 2x, `main` on the left of each pair.
- `arm-crops.webp`: the 2x arm crops of the gate, `main` on the left of each pair.
- `stage.webp` and `shot.webp`: the orchestra frame (`main` above) and a solo shot.

## Open

- At rest, slivers show along the upper arms, smaller than on `main`, and a dark notch shows under
  the right upper arm from the right side. A ring at each shoulder needs the user.
- The play forearms go 4.3 cm into the belly (3.1 cm on `main`), and the left upper arm keeps 0.55
  of its round shape, at its limit.
- The rest paws hover about 2 cm above the thighs.
- From the front, the open lid hides the head in the play. The shot planner refuses a camera
  where the case covers a head, and the solo shot looks from behind on the left.
