# The wind grips of the wolf, the mouse, and the tan fox

Date 2026-10-24. After the round of [`2026-10-24-wind-holds.md`](2026-10-24-wind-holds.md), the
user said: "the wind players are obviously not fixed. they are not even holding the instrument".
The decisions are in [`2026-10-24-wind-grips.md`](../decisions/2026-10-24-wind-grips.md). The
images, the tables, and the probes are in [`2026-10-24-wind-grips/`](2026-10-24-wind-grips/).
"Before" is `main` at `ba88b31c`, and the image pairs show `main` at `6cd51b6e`, with the same
wind code.

## The measure

The arm gate and the depth sweep passed while the paws missed the tube. `pnpm wind-grip`
(`tools/wind-grip.ts`) measures the grip on the skin of the studio: a paw holds as a fist (the
axis of the tube within 1 cm of the middle of the paw and in it, the rule of the bow grip) or as a
wrap (the skin and the finger tips on the instrument). The left paw of the red fox on the violin
neck, which the user accepts, has its finger tips 0.1 cm from the neck.

## The causes

On `main` (`grip-main.txt`), each paw touched the tube, and no paw of the wolf or the mouse held
it:

1. The palm direction: `palmToTube()` turned the palm toward the up axis of the instrument
   bone. The oboe and the clarinet hang with the keys of the piece toward the body, so the palms
   faced up (normal 0.98 up on the wolf, `probes/geom.ts`), and the paws lay flat.
2. The grip place: the grip of each woodwind palm lies 2.5 cm off the axis, in front of a
   hanging tube, and the palm point of the IK is the middle of the paw. The paws of the wolf lay
   in front of the tube and pointed away from it: their middles were 4.2 cm to 4.3 cm from the
   axis, and the finger tips 7.6 cm to 8.3 cm.
3. The retarget turn: `PAW_TURN` of `models/studio-rig.ts` turns each studio paw in the plane
   of its palm toward the forearm, up to 70°, so it removes each side bend of the wrist. The left
   grip of the wolf is 8.5 cm above the shoulder joint, so the forearm rose 45° from the tube, and
   with the palm toward the tube, the turn put the paw up along the tube (48°). The right paw turns
   only toward the baton of the conductor.
4. The rest places: the wolf bell stood 21 cm in front of the knees and 6 cm above the seat,
   the mouse oboe 16 cm in front of the belly, and the tan fox right paw 3.8 cm off the flute.

## The fix

The palm faces the axis of the tube. A hold moves each grip around the tube in the play
(`gripShiftL`, `gripShiftR`) and at rest (`restGripShiftL`, `restGripShiftR`), and can keep the
grip of the play at rest (`restAim`). `probes/grip_grid.py` scans the moves, and
`probes/rest_search.py` searches the rests with the gate, the depths, and the contact. After the
review of the first images, the wolf and the mouse got a twist bone of each upper arm
(`upperTwist` 0.5 of their mesh rig configs), and the mouse oboe hangs 10° from the vertical.

| Paw | Play: main | Play: tree | Rest: main | Rest: tree |
|---|---|---|---|---|
| Wolf left | 4.3 cm, tips 7.6 cm | 0.7 cm, fist | 4.6 cm, tips 8.0 cm | 0.1 cm, fist |
| Wolf right | 4.2 cm, tips 8.3 cm | 0.7 cm, fist | 4.8 cm, tips 7.0 cm | 0.7 cm, fist |
| Mouse left | 2.0 cm, tips 3.6 cm | 0.5 cm, fist | 2.5 cm | 0.5 cm, fist |
| Mouse right | 2.7 cm, tips 4.1 cm | 2.1 cm, tips 0.9 cm, on the tube | 0.7 cm | 4.0 cm, 0.4 cm off |
| Fox right | 2.4 cm, tips 7.1 cm | 0.7 cm, fist | 3.8 cm | 0.4 cm, fist |

Each cell gives the median distance of the middle of the paw to the axis (`grip-tree.txt`).

## The rests and the trades

- Wolf: the bell stands on the front of the seat between the knees, and both paws close on the
  upper half. With the grips of the play at rest, the forearms went 3.2 cm into the belly, and the
  bell on the right knee put the upper arms 5.6 cm into the body. With no twist bone, each bell on
  the seat twisted the right upper arm past the gate (69°). With the bone, it is 43°
  (`wolf-twist-bone-rig.txt`).
- Mouse: at 30° the arms reached forward as planks, with the wrists 23 cm to 26 cm in front of
  the shoulders. At 10°, the elbows bend near the body. Down and in, the right elbow folded the arm
  13 to 17 faces, so it points out and forward (`mouse-play-search.txt`). Each right grip that
  closes on the tube folded 9 to 10 faces (limit 8). An oboe on the belly folded the right arm 15
  to 17 faces, also with the twist bone, and the trial put the oboe into the belly
  (`mouse-belly-rest-search.txt`, `mouse-rest-belly-trial.webp`). The oboe stays about 10 cm off
  the belly.
- Tan fox: George puts the flute vertically on the right leg, and her text shows that players
  also put it across the lap (`docs/reference/wind-technique.md` 2.4). Across the lap with both
  paws, both upper arms went flat and the left paw flipped in the lowering (`flute-lap-both.txt`).
  With the foot joint on the knee, the right arm folded, went flat, or went 5.6 cm into the body
  (`flute-knee-right.txt`). The flute now stands 10° from the vertical at the right side in the
  closed right paw near the foot joint, with the foot joint beside the knee
  (`flute-upright-grip.txt`).

## The arm gate

`pnpm arm-check clarinetist oboist flutist --base main` (`arm-check.txt`):

| Role | Arm | Twist | Forearm twist | Flat | Paw twist | Grip turn | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| clarinetist | L | 26 (35) | 30 (27) | 0.84 | 109 (93) | 105 (28) | FAIL: grip turn, move twist margin |
| clarinetist | R | 43 (47) | 34 (28) | 0.95 | 94 (82) | 82 (18) | FAIL: grip turn, paw swing and move twist margins |
| oboist | L | 38 (25) | 39 (54) | 0.61 | 69 (144) | 77 (16) | FAIL: grip turn, fold, twist, and stretch margins |
| oboist | R | 39 (27) | 16 (38) | 0.69 | 30 (88) | 39 (13) | FAIL: twist, flat, paw swing, and grip turn margins |
| flutist | L | 28 (28) | 33 (33) | 0.65 | 120 (122) | 0 (0) | PASS |
| flutist | R | 25 (40) | 24 (26) | 0.65 | 85 (91) | 13 (4) | PASS |

The base value is in parentheses. No value is past its limit, except the grip turns, which
change on purpose. Their entries of `ACCEPTED_GRIPS` wait for the review of the 2x crops.

## The depths and the other players

`pnpm pose-depth <role> --base main` (`depth-*.txt`) gives no new pair over its limit for the wolf
(at most 1.0 cm) or the mouse (0.5 cm). The upper arms of the tan fox go 1.7 cm to 1.9 cm into
the body at rest and in the moves, over the limit of 1.5 cm as on `main` (2.0 cm to 2.1 cm).
`pnpm body-probe --base main` (`body-probe.txt`) changes only the bodies of the wolf and the
mouse, and the poses of the three players.

## The images

`<animal>-paws-<moment>-e20.webp` and `-e40.webp` show the 2x crops of the paws of `main` above the
tree, from the front, the back, each side, and ±150°, at a note, at rest, and in the middle of the
lift and of the lowering, at half size.

## Open items

- The right mouse paw lies on the oboe in the play, with its finger tips 0.9 cm from it, and stays
  0.4 cm off it at rest. The oboe stands off the belly, and the arms reach forward at rest.
- From the left side, the left mouse paw keeps its long fingers open on the oboe.
- The foot joint of the resting flute stands in the air beside the right knee.
- `armSegments` needs painted Blender weights and the arm factor 1, which these bodies lack.
