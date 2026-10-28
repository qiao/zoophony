# The beater of the badger bass drummer

Date 2026-10-27 to 2026-10-28. Round `sixth-badger-beater`. Decisions:
[`2026-10-27-badger-beater.md`](../decisions/2026-10-27-badger-beater.md). The probes, their
outputs, and the images are in [`2026-10-27-badger-beater/`](2026-10-27-badger-beater/). Each
command runs from the root of the tree. `main` is 81e6462b9.

## 1. The question

The user said on 2026-10-27: "the badger is not holding the drumstick properly". The image of the
user shows the bass drummer from its right front: both paws at the chest, and no beater.

## 2. Main, and the claims of the brief

`node docs/research/2026-10-27-badger-beater/beater-probe.ts` (`beater-main.txt`, run in a
worktree of `main`) measures the percussion test score at a strike, the rebound, between
strikes, before a strike, and at rest:

- **Few centimeters of shaft.** False in 3D: 22.7 cm of shaft shows between the fist and the head
  of the beater. But the shaft pointed into the drum head, 64° from it, so the right camera saw it
  end on, and the drum hid it from the front.
- **Paw at the chest.** True: the paw stood 7.4 cm to the left of the right shoulder joint, 1.3 cm
  to 2.3 cm from the trunk, and the forearm touched the trunk.
- **No stroke.** True: the head of the beater stood 4.7 cm off the drum head between strikes and
  5.0 cm before a strike, because the share of the lift stopped at the rest height (`peak` 1).

The camera of image 48 is about azimuth 60 and elevation 8 (`pnpm close-views play --demo
beethoven-9 --at badger:bass-drum --azimuth 60 --elevation 8`).

## 3. The sources

- Knight [13] of the percussion reference, text and photos: "situated behind, not beside, the
  bass drum", the left foot between the legs of the stand, which "will
  also naturally place the mallet parallel to the drum head". The photos show the hand at the
  near rim, with the mallet along the head toward its middle.
- The Vic Firth BD3 concert beater is 419 mm long, with a head of 69.8 mm (Thomann).
- The mean height of an adult is 1.683 m: men 175.3 cm and women 161.3 cm (CDC NHANES 2015 to
  2018, tables 9 and 11). The badger head top is 1.038 m (`body-measure.ts`), so the scale is
  0.617.

## 4. The fixes

1. **The scale.** The drum is a concert drum of 36 by 16 inches at the scale: 0.56 m by 0.25 m.
   The beater is 25.8 cm long, with a head of 4.3 cm.
2. **The stance.** The heads face left and right, and the badger stands behind the drum. The
   right head stands 0.26 m to the right of the middle of the badger, and the shell stands 3.9 cm
   in front of the belly in the play.
3. **The grip.** The paw holds the beater one third up from the butt, at the near rim. At the
   strike, the beater lies along the head, 10° down. The shaft lies 38° from the fingers in the
   bind pose, and the paw keeps the roll of the strike around the shaft (`strikeRoll` in the
   mallet hand path, `across` null).
4. **The stroke.** The beater points from a home near the elbow, so its head leaves the drum
   head along its normal, and the paw and the forearm turn with it.
5. **The arm.** The elbow points down, a little in and back, and the spine leans 7° over the
   drum, also at rest (`ready`).

## 5. Main against the round

`beater-main.txt` and `beater-round.txt` (`beater-probe.ts`), `wind-grip-main.txt` and
`wind-grip-round.txt` (`pnpm wind-grip bass-drummer`), `fold-probe.txt`
(`pnpm fold-probe bass-drummer --base main`), and `arm-check.txt`
(`pnpm arm-check --all --base main`).

| Measure | main | round |
|---|---|---|
| Whole beater, head | 43.5 cm, 11 cm | 25.8 cm, 4.3 cm |
| Drum | 0.70 m by 0.32 m | 0.56 m by 0.25 m |
| Middle of the shaft in the paw, from the butt | 0.18 of the length | 0.32 |
| Shaft from the fist to the head of the beater | 22.7 cm | 12.5 cm |
| Paw to trunk | 1.3 cm to 2.3 cm | 13.0 cm to 14.1 cm |
| Paw from the right shoulder joint, out to the side | -7.4 cm | 15.7 cm |
| Spot | 12 cm below the middle, 23 cm in from the rim | 18 cm from the middle, 3 cm below it, 10 cm in from the rim |
| Shaft to the drum head at the strike, between | 64°, 35° | 0°, 9° |
| Head of the beater off the drum head: strike, between, before a strike | -5.5 cm, 4.7 cm, 5.0 cm | 0 cm, 4.8 cm, 12.2 cm |
| Arms to the drum, trunk to the drum | 0.0 cm, 12.8 cm | 1.6 cm, 3.9 cm |
| Paw grasps the shaft (play) | 100%, 24° from the thumb side | 83% (lift, rest, lowering 100%), 55° |
| Samples with a fold of the right arm (play) | 100%, at most 6 faces | 3.0%, at most 1 face |

`pnpm arm-check --all --base main` gives no `FAIL` in 23 roles: the pianist and the bassist stay
`OPEN` with the values of `main`. The right arm of the bass drummer (main, round): folds 4, 0; twist 41, 16; forearm twist 12,
6; flat 0.62, 0.88; paw twist 37, 20; paw swing 37, 39; stretch 0.05, 0.08; grip turn 0, 7; move
twist 21, 16; move turn 7, 75.

`pnpm pose-depth bass-drummer --base main` (`pose-depth.txt`): the upper arms go 2.4 cm to 2.5 cm
into the side (main 1.7 cm to 2.3 cm), at the accepted 2.5 cm. The paws, the claws, the
forearms, and the beater no longer go into the drum or the body. Each strike hits its target.

## 6. The trades

`scan.ts`, `eval.sh`, and `gen.ts` scan the variants. The twist columns come from
`pnpm arm-check bass-drummer --trace`.

| Variant | Result |
|---|---|
| The drum of `main` (turned -30°), beater parallel | the right shoulder stands 0.44 m from the drum head, out of the reach of 0.27 m |
| A roll of the forearm as the stroke | the head lifts about 8 cm at most, and the paw twist moved 76° between two samples between strikes |
| Beater 10° down, elbow out | the shaft leaves the fist along the claws: no grasp |
| Elbow in, head 0.21 m to the right | the upper arm goes 4.7 cm into the body |
| No lean | the wrist reaches 0.97 of the arm, and the paw grasps in 10% of the play |
| Tilt 0.85, lean 9° | the gate fails: move twist 33° (main 21°), stretch 0.15 (main 0.05) |
| Tilt 1.0 | the shaft leaves the fist 59° to 61° from the thumb side, at the limit of the grasp |

## 7. The other roles

`pnpm body-probe --base main` (`body-probe.txt`): of 23 players, only the bass drummer changes.
The lineups of the snare drummer, the cymbalist, the percussionist, the xylophonist, and the
timpanist against `main` differ only in lines of single pixels at the edges, as two builds do.
The narrower drum moves the 6 players of the percussion test score by up to 0.26 m
(`positions-main.txt`, `positions-round.txt`), and the players of the demos keep their places.
`pnpm test:paused --base main` on the percussion tests: no failure comes on the round alone
(`tests-paused.txt`). `pnpm size --base main` (`size.txt`): 832,170 B, 163 B more than `main`.

## 8. The images

`main` above the round: `sheet-e20-right.webp`, `sheet-e20-az35.webp`, `sheet-e40-front.webp`,
the 2x crops `paw-right.webp` and `paw-az60.webp`, and the angle of image 48 at 76.1 s and
76.29 s, `user48.webp`. From the front, the drum hides the right arm and the beater, as a real
drum hides its player.
