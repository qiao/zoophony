# The rest, the runs, and the butt ends of the percussion

Date 2026-10-25. Round `percussion-rest`. Decisions:
[`2026-10-25-percussion-rest.md`](../decisions/2026-10-25-percussion-rest.md). The probes and their
outputs are in [`2026-10-25-percussion-rest/`](2026-10-25-percussion-rest/). Each command runs
from the root of the tree, and the base is `main` at `cf42d8bf`. The pirates file is the steel
drum part of `~/Downloads/Disney_Themes_-_Pirates_Of_The_Caribbean.mid`, a file of the user.

## 1. The question

The manager gave four faults of the percussion players:

1. At rest and in the lift, the snare sticks and the cymbal mallets point up and forward, and
   their heads show beside the shoulders from the back.
2. The xylophone paws do not alternate in runs.
3. The butt ends of the right elephant mallet, the triangle beater, and the bass drum beater stay
   in the paw.
4. The xylophone shafts leave the fist past the knuckles (grasp 0% by the exit rule).

## 2. The sources

`docs/reference/percussion-technique.md` gives each fact with its source (36 to 39). Between
entrances, a snare drummer holds the sticks level across the waist (36), or the stick pair one
inch above the near rim (37). A scale takes alternate strokes (34), and a double stroke only
where the hands would cross (35). Green held the left mallet in front of the right (39). No
source gives the rest of a suspended cymbal player or a height step between the heads.

## 3. The rest

`rest-geo.ts` (`rest-geo.txt`) gives the sticks at rest. On `main`, each stick points up 49°
from the hanging paw, and its tip is 71 cm high, near the shoulders (60 cm). The set position
(`PercussionHold.set`) turns each paw palm down on the forearm of the hanging arm, so that the
stick points in across the body.

| Role | Stick | `main` up, tip height | Branch up, tip height | Branch tip above the instrument |
|---|---|---:|---:|---|
| Snare | L / R | 49°, 71.4 cm | 1° / 7°, 48.3 / 51.4 cm | 2.3 / 5.4 cm above the head, at the near rim |
| Cymbal | L / R | 49°, 71.4 cm | 4° / 11°, 55.1 / 59.0 cm | the yarn head about 2 cm above the plate |

The two sticks cross 2.4 cm apart in height. `pnpm body-probe --base main` gives equal play
poses: only the rest, the lift, and the lowering change.

## 4. The runs

`runs.ts` counts the fast pairs (two single strikes within 0.5 s) whose hands change, the strikes
within 5 mm of their bars, the least gap of the heads, and the samples at steps of 0.05 s in which
the two mallets touch (`runs-main.txt`, `runs-scan.txt`).

| File, measure | `main` | Branch |
|---|---|---|
| Test score, hand changes of the fast pairs | 3% | 35% |
| Test score, longest run in one paw | 29 | 22 |
| Test score, strikes within 5 mm, L / R | 100% / 93% | 100% / 96% |
| Test score, mallets touch, head gap min | 0%, 0.6 cm | 0%, 3.6 cm |
| Pirates, hand changes of the fast pairs | 14% | 74% |
| Pirates, longest run in one paw | 21 | 8 |
| Pirates, strikes within 5 mm, L / R | 100% / 100% | 100% / 100% |
| Pirates, mallets touch, head gap min | 4%, 1.6 cm | 1%, 2.0 cm |

The rules of the branch:

- A fast strike takes the other paw, and it can pass the last bar of the other paw by 3.5 cm
  (`PercussionHold.pass`). A wider leap takes a double stroke.
- The reach of 0.53 m counts from the shoulders of the side move (`HandRules.shift`): the spine
  lean moves both shoulders 4.2 cm to 4.6 cm at a lean of 10° and 5.0 cm to 5.5 cm at 12°
  (`shift.txt`), as the sine of the lean times the 26 cm from the spine joint to the shoulders.
- The spine leans up to 12°, in place of 10°.
- The right head lifts with twice the pitch of the left head between strikes
  (`PercussionHold.pitchR`).

The trades (`runs-scan.txt`, `runs-gate.txt`):

| Variant | Result |
|---|---|
| The pass alone | The heads hover 13 cm above the bars at one height and pass through each other: mallets touch 7%, head gap -1.1 cm |
| The left mallet farther (Green) | The left paw strikes 67% within 5 mm |
| The right head lower (`pitchR` 0.35 to 0.5) | No touch, but the right paw swing p95 59 (`main` 43), a margin fail |
| Reach 0.55 to 0.6 | The pirates part alternates 85% to 90%, but the right paw strikes 72% to 86% within 5 mm |
| Spine 14° | The left paw swing p95 70, the limit of the gate |

The outer runs of the test score stay in one paw, because the other paw does not reach them.

## 5. The butt ends

`pnpm wind-grip` gives the butt length behind the paw (`grip-main.txt`, `butt-scan.txt`). A
longer shaft behind the grip (`malletButt`) moves no pose.

| Role, paw | `main` butt | Branch shaft behind the grip | Branch butt (play) |
|---|---:|---:|---:|
| Timpanist L / R | 0.8 / 0.0 cm | 6 cm | 2.3 / 1.8 cm |
| Bass drummer R | 0.0 cm | 6 cm | 2.0 cm |
| Percussionist R (triangle beater) | 0.0 cm | 7 cm | 2.0 cm |

## 6. The exit of the xylophone shafts

`exit-scan.txt` scans the tilt of the mallet in the paw, the roll at the strike, and the rest
angle across the forearm. Each cell gives the share of the play samples that grasp, L / R.

| Variant | Grasps | Gate or jumps |
|---|---|---|
| `main` | 0% / 0% | |
| Tilt 0.52 or 0.79 | 0% / 0% | |
| The roll at the strike, tilt 0.52 | 14% / 5% | |
| Rest angle 0.6 | 5% / 81% | Left folds 11, paw twist 178, grip turn 73 and 70 (limits 8, 170, 45) |
| Rest angle 0.6, the roll, tilt 0.52 | 43% / 76% | 20 and 46 turns over 30° in 0.01 s, largest 109° |

No variant passes the limits of the round, so the xylophone keeps the grip of `main`.

## 7. The gates

`pnpm arm-check --all --base main` (`arm-check-all.txt`): each role but the snare drummer passes.
Only the percussion roles change. The values give the tree and `main` in parentheses.

| Role | Arm | Value | Reason |
|---|---|---|---|
| snare-drummer | L | stretch p95 0.20 (0.14), limit 0.35, `FAIL` on the margin | The gate counts the stretch from the rest sample, and the new rest is nearer to the bind. From the bind, the left play stretch is 0.32 on both trees, and the play poses are equal (`set-gate.txt`). |
| snare-drummer, cymbalist | L, R | paw twist p95 22 to 32 (102) | The palms turn down at rest. |
| xylophonist | L | folds 8 (7), paw swing 68 (66), limits 8 and 70 | The wider side lean. |
| xylophonist | R | paw swing 50 (43) | The higher right head. |

- `pnpm arm-check xylophonist --base main --midi <pirates>` (`runs-gate.txt`): each value passes.
- `pnpm clip-probe --base main --jobs 4` (`clip-probe.txt`): each demo and the test score pass.
  The pirates file (`clip-pirates.txt`): held across 0.4% (`main` 0.0%), limit 1%.
- `pnpm wind-grip <the six roles>` (`grip-main.txt`, `grip-branch.txt`): the snare and the
  cymbal paws grasp in 100% of the rest samples. The xylophone grasps stay at 0% in the play.
- The jumps (`probes-branch.txt`, `jumps.ts` of `2026-10-25-percussion-grip/`): no paw turns
  more than 30° in 0.01 s. The xylophone paws turn at most 11° (L) and 22° (R) in one step
  (`main` 11° and 11°). The lifts and the lowerings give the move turn of the arm gate.
- The eye line, the balance, and the soles of the xylophonist keep the values of `main`: eye line
  at most 3.0° and 4.6°, the center of mass 9.6 cm inside the soles, and no sole sinks.

## 8. The images

`pairs/` holds the pair images, `main` above the tree. The role sheets come from
`pnpm close-views <role> <dir> --views front,back,left,right,35,-35 --zoom 2 --elevation <20|40>
--base main` and `pairs.py`, and the 3x paw crops (`*-crop3.webp`) from `pnpm close-views <role>
<dir> --lineup --views front,back,left,right --crop 3 --base main`. `xylophone-run-strip.webp`
comes from `pnpm close-views play <dir> --midi <test score> --strip 3.3:0.15:16 --at
badger:xylophone --azimuth 35 --elevation 35 --zoom 1.6 --base main`.

- At rest and in the lift, the snare sticks and the cymbal mallets lie across the waist. From
  the back, no stick and no mallet head shows beside the shoulders. The paws close on the
  shafts.
- The butt ends of the bass drum beater, the triangle beater, and the elephant mallets show
  behind the paws. No other part changes.
- In the run strip, the paws alternate. Where one paw passes the other, the two shafts show as
  an X from above, at two heights, with no touch. Source 27 gives two mallets that do not cross
  (open).
- Between strikes, the right xylophone head stands up to 13 cm above the right shoulder joint,
  and at the moment "lowest" it shows beside the right shoulder from the back. A real player
  keeps the stroke 2 to 3 inches high (source 39). A lower right head bent the right wrist over
  the margin, and a lower left head bent the left wrist over its limit (open).
