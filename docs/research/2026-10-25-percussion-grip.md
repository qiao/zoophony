# The grip of the percussion paws

Date 2026-10-25. Round `percussion-grip`. Decisions:
[`2026-10-25-percussion-grip.md`](../decisions/2026-10-25-percussion-grip.md). The probes and
their outputs are in [`2026-10-25-percussion-grip/`](2026-10-25-percussion-grip/). Each command
runs from the root of the tree. `main` is f04b4e58.

## 1. The question

The user said: "the badger doesnt seem to be 'holding' the stick. can we have it 'hold' the
stick? same applies to other percussion animals". In the crops, the shaft came out of the bottom
of each paw, and the claws stayed open beside it. A paw holds its mallet when the shaft goes
through the closed paw, the finger tips touch it, the palm faces it, and the head leaves the
front of the fist at the side of the thumb (`percussion-technique.md` 1).

## 2. The causes

`shaft-frame` measures put the shaft in the frame of the posed paw: along the fingers, toward the
palm, and toward the thumb.

1. **The grip spot.** Each mallet hung at the palm point, 0.07 H toward the thumb, in the middle
   plane of the paw: its palm component was 0.00 in each sample. The claws curl toward the palm,
   so they closed beside the shaft.
2. **The angle.** The shaft lay 15.5° from the fingers in the bind pose (`malletTilt` 1.3), so it
   left the paw along the claws. At rest, the stick hung along the fingers.
3. **The retarget.** The retarget turns each studio paw in the plane of its palm toward the
   forearm, by up to 70° (`PAW_TURN`). The mallet follows the hand of the player, so the shaft
   moved in the visible paw: from 12° to 80° from the fingers between poses, and the grip spot
   swung around the wrist.
4. **The curl.** The fingers curled 60°, and only in the play: at rest the claws opened.

The rig palm hints are not the cause. On the badger, the claw tips bend 2.9 cm toward the hint
palm, and the paw is thinnest along it (`claw-bend-badger.txt`). The thumb finder of the wind
round finds a separate digit, and the true palm is 34° to 38° from the hint (`palm-probe.txt`):
a reversed hint gives 180°. The elephant paw is a round stump with no separate digit and no
claws, so no measure gives its palm (`claw-bend-elephant.txt`).

## 3. The fixes

- Each mallet lies on the palm side under the curled fingers (`MalletSpot`), at an angle that
  leaves the front of the fist: 60° from the fingers on the badger, 33° for the triangle beater,
  90° for the bass drum beater, and 45° on the elephant. `grip-scan.ts` scans the lines of a shaft through the closed paw for
  each curl and angle.
- The fingers curl 90°, 100° on the xylophone and the elephant, and 75° with the triangle, also
  at rest.
- The snare, cymbal, and bass drum paws roll around the shaft until they have no side bend at the
  strike, and keep that roll through the stroke (`gripRoll()`).
- The xylophone mallets point from homes 0.55 H out from the shoulders and are 0.40 m long.

## 4. The grips

`pnpm wind-grip <the six roles>` (`grip-main.txt`, `grip-branch.txt`; `main` measured with the
same tool in a worktree of `main`). Each cell gives the share of the samples in which the paw
grasps its shaft.

| Role | Paw | Main play | Branch play | Branch lift | Branch rest | Branch lowering | Branch exit, butt |
|---|---|---:|---:|---:|---:|---:|---|
| bass-drummer | R | 0% | 100% | 100% | 100% | 100% | 24°, 0.0 cm |
| snare-drummer | L | 0% | 100% | 100% | 100% | 100% | 56°, 0.8 cm |
| snare-drummer | R | 0% | 100% | 100% | 100% | 100% | 57°, 3.0 cm |
| cymbalist | L | 0% | 100% | 100% | 100% | 100% | 53°, 1.0 cm |
| cymbalist | R | 0% | 100% | 100% | 100% | 100% | 54°, 2.5 cm |
| percussionist | R | 0% | 100% | 100% | 100% | 100% | 55°, 0.0 cm |
| xylophonist | L | 0% | 100% | 94% | 100% | 100% | 36°, 1.3 cm |
| xylophonist | R | 0% | 95% | 97% | 100% | 100% | 46°, 2.0 cm |
| timpanist | L | 0% | 95% | 68% | 100% | 100% | 47°, 0.8 cm |
| timpanist | R | 0% | 93% | 100% | 100% | 100% | 47°, 0.0 cm |

The exit is the median angle of the shaft from the thumb side in the play, and the butt the
median length of the shaft behind the paw. Each strike of the xylophone stays within 5 mm of its
bar: 100% and 100% on the test score, 100% and 100% on the pirates file (`reach.ts` of
`2026-10-25-xylophone-reach/`; `main` 100% and 93%).

## 5. The trades

| Variant | Result |
|---|---|
| Curl 120° on the badger | 100% grasps, but 11 to 20 folded knuckle faces (limit 8) |
| Curl 100° on the snare | 100% grasps with the grip 0.5 cm further toward the palm, 6 to 8 folds |
| A roll at each moment of the stroke | The paws turned up to 79° in 0.01 s (`main` 20°) |
| The same roll on the timpani, the xylophone, the triangle | Up to 180° in 0.01 s where the shaft passes the forearm line |
| Xylophone home 0.4 H, mallets 0.37 m | 95% grasps of the right paw in the play, 1 strike over 5 mm |
| Xylophone mallets 0.30 m | 83% of the right strikes within 5 mm |
| Timpani tilt 30° | The exit 58° to 70° from the thumb side |
| Bass drum beater 60° from the fingers | It crossed the left paw in 44.5% of beethoven-9 (`clip-probe`) |
| Xylophone curl 80° to 90°, or a home of 0.3 H to 0.4 H | 7 to 9 folds, but grasps of 0% to 81% in the play and 0% at rest |

## 6. The gates

`pnpm arm-check --all --base main` (`arm-check.txt`, with the curls of the first commit) and
again for the six roles (`arm-check-roles.txt`). Only the percussion roles change. The values give
the tree and `main` in parentheses.

| Role | Arm | Fail | Kind |
|---|---|---|---|
| snare-drummer | L | folds 5 (0), limit 8 | margin inside the limit |
| cymbalist | L | folds 5 (0), grip turn 16 (0), limit 45 | margin inside the limits |
| timpanist | L | folds 8 (4), move twist 26 (18), limit 176 | margin inside the limits |
| timpanist | R | move twist 20 (10) | margin inside the limit |
| xylophonist | L | folds 12 (3), grip turn 47 (9), stretch 0.23 (0.16) | folds and grip over the limits |
| xylophonist | R | folds 14 (3), grip turn 35 (2) | folds over the limit |

The xylophone folds are the knuckle faces of the curl of 100° and two arm faces of the far
homes: section 5 shows no variant that keeps the folds at 8 and the grasp. The grip turns change on
purpose: `ACCEPTED_GRIPS` keeps the old values until the manager accepts the crops.

`pnpm clip-probe --base main --jobs 4` (`clip-probe.txt`): no file clips. `pnpm body-probe --base
main` (`body-probe.txt`): only the six percussion players change. `pnpm size --base main`
(`size.txt`): 789,458 B, 458 B more. The twist steps of
`docs/research/2026-10-24-violin-arms/twist-steps.ts` (`twist-*.txt`) read the demos only, so
the snare and the xylophone have no rows. The total twist of the elephant left arm grows from a
mean of 61.5° to 77.5°, and its largest from 76.3° to 91.6°. The bass drum, the cymbal, and the
percussionist keep their values. `jumps.ts` (`jumps-main.txt`, `jumps-branch.txt`) counts the
turns of a paw over 30° in 0.01 s: 0 in each role of `main`, and 0 in the tree except the
elephant left paw: 5, up to 33° (`main` 16°).

## 7. The images

`pairs/<role>-pair-<moment>-crop3.webp` hold the 3x paw crops of `pnpm close-views <role> <dir>
--lineup --views front,35,-35,left,right --crop 3 --base main`: `main` above the tree, at the
first moment of the role and at rest. `pairs/<role>-audit-e40.webp` hold the audit sheets of
`pnpm close-views audit` at half size. On `main`, the claws stand open beside each shaft, and the
shaft leaves the paw along the claws. In the tree, each badger paw closes its claws around the
shaft, and the head leaves the front of the fist. The elephant paws curl their ends over the
shafts. The faults that stay:

- The far xylophone homes spread the paws wide to the sides of the body, at the height of the
  chest.
- At rest, the snare sticks and the cymbal mallets stand up and forward, and their heads show
  beside the shoulders from the back.
- The audit sheets show no new seam fault at the arm roots. The folded knuckle faces of section 6
  show as no dark line in the 3x crops.
