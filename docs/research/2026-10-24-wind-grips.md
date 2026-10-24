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
`probes/rest_search.py` searches the rests with the gate, the depths, and the contact.

| Paw | Play: main | Play: tree | Rest: main | Rest: tree |
|---|---|---|---|---|
| Wolf left | 4.3 cm, tips 7.6 cm | 0.7 cm, fist | 4.6 cm, tips 8.0 cm | 0.1 cm, fist |
| Wolf right | 4.2 cm, tips 8.3 cm | 0.7 cm, fist | 4.8 cm, tips 7.0 cm | 0.7 cm, fist |
| Mouse left | 2.0 cm, tips 3.6 cm | 0.6 cm, fist | 2.5 cm | 0.5 cm, fist |
| Mouse right | 2.7 cm, tips 4.1 cm | 0.8 cm, fist | 0.7 cm | 2.7 cm, touches |
| Fox right | 2.4 cm, tips 7.1 cm | 0.7 cm, fist | 3.8 cm | 0.5 cm, fist |

Each cell gives the median distance of the middle of the paw to the axis (`grip-tree.txt`). The
right mouse paw holds in 84% of the lift and 47% of the lowering, and each other paw on its grip
in each sample.

## The rests and the trades

- Wolf: the bell now stands on the front of the seat between the knees, and both paws close on
  the upper half. With the grips of the play at rest, the forearms went 3.2 cm into the belly. The
  bell on the right knee put the upper arms 5.6 cm into the body. Each bell on the seat twists the
  right upper arm past the gate: of 72 rests, the 6 that passed put the forearms 2.6 cm to 6.0 cm
  into the body (`wolf-rest-search.txt`). With a twist bone of half of the roll, the twist fell
  from 71° to 44° (`wolf-twist-bone.txt`). The coordinator gives the twist bones to the shared rig
  work, so this round has none, and the twist stays at 69°.
- Mouse: an oboe on the belly folded the right arm 11 to 15 faces, and each right grip that
  closes at rest folded 9 to 12 (limit 8, `mouse-right-rest-search.txt`). The oboe stands about
  10 cm in front of the right side of the belly. The palm fix alone flipped the rest paws 180° in
  the lowering, and `restAim` removes the flip (`mouse-gate-split.txt`).
- Tan fox: an upright flute on the right knee failed the gate with the right paw alone and with
  both paws: 10 to 15 folds, a twist of 55° to 73°, and a flat left upper arm
  (`flute-upright-right.txt`, `flute-upright-both.txt`). The flute stays at its rest place of
  `main`, through the closed right paw.

## The arm gate

`pnpm arm-check clarinetist oboist flutist --base main` (`arm-check.txt`, and
`arm-check-flutist.txt` after the last change of the flute):

| Role | Arm | Twist | Forearm twist | Flat | Paw twist | Grip turn | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| clarinetist | L | 42 (35) | 31 (27) | 0.79 | 109 (93) | 105 (28) | FAIL: grip turn, move twist margin |
| clarinetist | R | 69 (47) | 34 (28) | 0.84 | 94 (82) | 82 (18) | FAIL: twist, grip turn, paw swing and move twist margins |
| oboist | L | 35 (25) | 41 (54) | 0.57 | 83 (144) | 91 (16) | FAIL: grip turn, twist margin |
| oboist | R | 30 (27) | 41 (38) | 0.79 | 77 (88) | 68 (13) | FAIL: grip turn, paw swing margin |
| flutist | L | 28 (28) | 33 (33) | 0.65 | 122 (122) | 0 (0) | PASS |
| flutist | R | 39 (40) | 23 (26) | 0.61 | 81 (91) | 13 (4) | FAIL: stretch margin, 0.20 against 0.13 (limit 0.35) |

The base value is in parentheses. Only the twist of the right arm of the wolf is past its limit
(55°). The grip turns change on purpose, and their entries of `ACCEPTED_GRIPS` wait for the review
of the 2x crops.

## The depths and the other players

`pnpm pose-depth <role> --base main` (`depth-*.txt`) gives no new pair over its limit for the wolf
(at most 1.0 cm) or the mouse (0.4 cm). The upper arms of the tan fox go 2.4 cm into the body in
the lift and the lowering (2.0 cm and 2.1 cm on `main`) and 1.9 cm at rest (2.1 cm), over the limit
of 1.5 cm as on `main` (`flute-rest-depths.txt`). `pnpm body-probe --base ba88b31c`
(`body-probe.txt`) changes only the poses of the wolf, the mouse, and the tan fox.

## The images

`*-views-e20.webp` and `*-views-e40.webp` show `main` above the tree at four moments from six
views. `*-paws-<moment>.webp` hold the 2x crops of the paws, and `strips/` the play strips at four
azimuths. In the strips, a music stand hides the paws of the mouse from the front.

## Open items

- The right upper arm of the wolf twists 69° at rest until it gets a twist bone.
- The right mouse paw only touches the oboe at rest, and the oboe stands off the belly.
- From the left side, the left mouse paw lies on the oboe with its long fingers open.
- The flute of the tan fox leans out at rest, and its left paw hangs free.
