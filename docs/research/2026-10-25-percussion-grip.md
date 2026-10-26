# The grip of the percussion paws

Date 2026-10-25. Round `percussion-grip`. Decisions:
[`2026-10-25-percussion-grip.md`](../decisions/2026-10-25-percussion-grip.md). The probes and
their outputs are in [`2026-10-25-percussion-grip/`](2026-10-25-percussion-grip/). Each command
runs from the root of the tree. `main` is f04b4e58.

## 1. The question

The user said: "the badger doesnt seem to be 'holding' the stick. can we have it 'hold' the
stick? same applies to other percussion animals". A paw holds its mallet when the shaft goes
through the closed paw, the tips touch it, the palm faces it, and the head leaves the front of
the fist at the side of the thumb (`percussion-technique.md` 1).

## 2. The causes

`shaft-frame.ts` puts the shaft in the frame of the posed paw.

1. **The grip spot.** Each mallet hung at the palm point, 0.07 H toward the thumb, in the middle
   plane of the paw: its palm component was 0.00 in each sample. The claws curl toward the palm,
   so they closed beside the shaft.
2. **The angle.** The shaft lay 15.5° from the fingers in the bind pose (`malletTilt` 1.3), so it
   left the paw along the claws. At rest, the stick hung along the fingers.
3. **The retarget.** The retarget turns each studio paw in the plane of its palm toward the
   forearm, by up to 70° (`PAW_TURN`). The mallet follows the hand of the player, so the shaft
   moved in the visible paw, from 12° to 80° from the fingers.
4. **The curl.** The fingers curled 60°, and only in the play: at rest the claws opened.

The rig palm hints are not the cause. On the badger, the claw tips bend 2.9 cm toward the hint
palm (`claw-bend-badger.txt`), and the true palm of the thumb finder is 34° to 38° from the hint
(`palm-probe.txt`). The elephant stump has no digit and no claws, so no measure gives its palm.

## 3. The fixes

- Each mallet lies on the palm side under the curled fingers (`MalletSpot`), at an angle that
  leaves the front of the fist: 60° from the fingers on the badger, 30° to 33° for the xylophone
  mallets and the triangle beater, 90° for the bass drum beater, and 45° on the elephant
  (`grip-scan.ts`).
- The fingers curl 90°, 100° on the elephant, and 75° with the triangle, also at rest.
- The snare, cymbal, and bass drum paws roll around the shaft until they have no side bend at the
  strike, and keep that roll through the stroke (`gripRoll()`).
- The xylophone keeps the mallets of 0.30 m and the homes of `main`, as the manager asked. Its
  bars are 11 cm to 7 cm long, so that the short arms reach the sharp bars with the new grip.
- The left timpani mallet strikes 8 cm toward the middle (`offsetL`).

## 4. The grips

`pnpm wind-grip <the six roles>` (`grip-main.txt`, `grip-branch.txt`; `main` measured with the
same tool in a worktree of `main`). Each cell gives the share of the samples in which the paw
grasps its shaft. For the xylophone, the cells give the share that holds as a fist, then the share
that grasps.

| Role | Paw | Main play | Branch play | Branch lift | Branch rest | Branch lowering | Branch exit, butt |
|---|---|---:|---:|---:|---:|---:|---|
| bass-drummer | R | 0% | 100% | 100% | 100% | 100% | 24°, 0.0 cm |
| snare-drummer | L | 0% | 100% | 100% | 100% | 100% | 56°, 0.8 cm |
| snare-drummer | R | 0% | 100% | 100% | 100% | 100% | 57°, 3.0 cm |
| cymbalist | L | 0% | 100% | 100% | 100% | 100% | 53°, 1.0 cm |
| cymbalist | R | 0% | 100% | 100% | 100% | 100% | 54°, 2.5 cm |
| percussionist | R | 0% | 100% | 100% | 100% | 100% | 55°, 0.0 cm |
| xylophonist | L | 67%, 0% | 62%, 0% | 26%, 10% | 100%, 100% | 100%, 30% | 115°, 1.9 cm |
| xylophonist | R | 43%, 0% | 90%, 0% | 100%, 10% | 100%, 100% | 100%, 30% | 101°, 1.3 cm |
| timpanist | L | 0% | 94% | 68% | 100% | 100% | 49°, 0.8 cm |
| timpanist | R | 0% | 94% | 100% | 100% | 100% | 47°, 0.0 cm |

The xylophone mallets run near the line of the forearms, so the shafts leave the fists past the
knuckles, under the curled claws: the paws hold as fists, and the claws touch the shafts, but the
exit rule fails.

The exit is the median angle of the shaft from the thumb side in the play, and the butt the
median length of the shaft behind the paw. Each strike of the xylophone stays within 5 mm of its
bar: 100% and 93% on the test score, 100% and 100% on the pirates file (`reach.ts` of
`2026-10-25-xylophone-reach/`; `main` 100% and 93%). With the bars of 12 cm to 8 cm, 88%.

## 5. The trades

| Variant | Result |
|---|---|
| Curl 120° on the badger | 100% grasps, but 11 to 20 folded knuckle faces (limit 8) |
| Curl 100° on the snare | 100% grasps with the grip 0.5 cm further toward the palm, 6 to 8 folds |
| A roll at each moment of the stroke | The paws turned up to 79° in 0.01 s (`main` 20°) |
| The same roll on the timpani, the xylophone, the triangle | Up to 180° in 0.01 s where the shaft passes the forearm line |
| Xylophone homes 0.55 H out, mallets 0.40 m | 94% to 100% grasps, but folds 12 and 14 (limit 8), grip turn 47, paws spread wide at the chest |
| Xylophone at the homes of `main`, tilt 0.79 to 1.3, curl 80° to 100° | Holds of 57% to 90% in the play, no grasp; folds 7 to 9 |
| Xylophone mallet turned 180° in the paw | The exit 62° to 87°, but paw twists of 162° to 175° |
| Timpani lift 0.2 to 0.5, rest -0.9 to -1.5, or pitch | Steps of 28° to 36°, or the grasp lost |
| Timpani tilt 30° | The exit 58° to 70° from the thumb side |
| Bass drum beater 60° from the fingers | It crossed the left paw in 44.5% of beethoven-9 (`clip-probe`) |

## 6. The gates

`pnpm arm-check --all --base main` (`arm-check.txt`). Only the percussion roles change, and each
fail is a margin inside its limit. The values give the tree and `main` in parentheses.

| Role | Arm | Fail |
|---|---|---|
| snare-drummer | L | folds 5 (0), limit 8 |
| cymbalist | L | folds 5 (0), grip turn 16 (0), limit 45 |
| timpanist | L | folds 8 (4), move twist 22 (18), limit 176 |
| timpanist | R | move twist 20 (10) |
| xylophonist | L | folds 7 (3), paw swing 66 (49), limit 70 |

The folds are knuckle faces of the closed claws. `ACCEPTED_GRIPS` takes the play medians of the
grips that the manager accepted. The xylophone grip turns are 15 (L) and 9 (R).

`pnpm clip-probe --base main --jobs 4` (`clip-probe.txt`, `clip-pirates.txt`): no file clips.
`pnpm body-probe --base main` (`body-probe.txt`): only the six percussion players change. `pnpm
size --base main` (`size.txt`): 458 B more. The twist steps of
`docs/research/2026-10-24-violin-arms/twist-steps.ts` (`twist-*.txt`) read the demos only, so the
snare and the xylophone have no rows. The total twist of the elephant left arm grows from a mean
of 61.5° to 81.0°, and its largest from 76.3° to 94.4°: the grip of 45° rolls the paw further on
the forearm for one strike direction. The arm gate keeps it inside its limit (twist p95 35, limit
55). `jumps.ts` (`jumps-main.txt`, `jumps-branch.txt`) counts the turns of a paw over 30° in
0.01 s: 0 in each role of `main` and of the tree. The elephant left paw turns at most 29° (`main`
16°): its strike 8 cm toward the middle keeps the strike direction near the rest direction, and
with no offset it turned up to 33°.

## 7. The images

`pairs/<role>-pair-<moment>-crop3.webp` hold the 3x paw crops of `pnpm close-views <role> <dir>
--lineup --views front,35,-35,left,right --crop 3 --base main`: `main` above the tree, at the
first moment of the role and at rest. `pairs/<role>-audit-e40.webp` hold the audit sheets of
`pnpm close-views audit` at half size. On `main`, the claws stand open beside each shaft, and the
shaft leaves the paw along the claws. In the tree, each badger paw closes its claws around the
shaft, and the head leaves the front of the fist. The elephant paws curl their ends over the
shafts. The faults that stay:

- The xylophone shafts leave the fists past the knuckles, under the curled claws, and not at the
  side of the thumb.
- At rest, the snare sticks and the cymbal mallets stand up and forward, and their heads show
  beside the shoulders from the back.
- The audit sheets show no new seam fault at the arm roots. The folded knuckle faces of section 6
  show as no dark line in the 3x crops.
