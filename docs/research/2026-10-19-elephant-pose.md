# The pose of the elephant timpanist from the reference images

Date 2026-10-19. Round `elephant-pose`. Decisions:
[`2026-10-19-elephant-pose.md`](../decisions/2026-10-19-elephant-pose.md). The probes and their
outputs are in [`2026-10-19-elephant-pose/`](2026-10-19-elephant-pose/). Each command runs from the
root of the tree, and the base is `a3755083`.

## 1. The question

The user said that the arms of the elephant were still twisted and deformed in the play. After
the refit of its arm skin, the upper arms pointed out to the sides, the forearms hung down, and
each paw bent down to hold its mallet straight down. The round measured the reference images,
showed three variants, and made the variant that the user chose.

## 2. The reference measures

The crops are 3 times `orchestra-latest.png` (x 1280 to 1600, y 330 to 620) and a crop of the same
elephant (`ruler.py`). H of the reference is the skull top to the chin: 95 px of
`orchestra-latest.png` and 108 px of `orchestra-side.png`. The app measures come from
`body-dims.ts`.

| Measure | Reference | App, base |
|---|---|---|
| Kettle hoop width | 1.38 to 1.40 H by the head, 1.6 H by the ear span | 0.73 to 0.90 H |
| Near rim above the floor | 0.37 to 0.40 of the standing height (0.71 to 0.78 m) | 0.72 m |
| Near rim below the chin | 0.55 to 0.62 H | 1.02 H |
| Paw | above the near rim of each kettle | 23 cm above the head plane, 10 to 12 cm outside the near rim |
| Mallet between strikes | 25° to 51° up, and out | 46° to 49° down |
| Arm | straight from the shoulder to the paw, 55° to 60° down in the image | elbow out, forearm level, paw bent down |

The head of the reference is larger in proportion to its body, so the claim "higher kettles" holds
against the head and the arms, but not against the floor. Real kettles of 32 inches are 1.36 H
wide, so the reference kettles have about the real size.

## 3. The variants of phase 1

V1 took the reference values, V2 a half step, and V3 the reference pose with the kettles of the
app (`variants-phase1.sh`, `look-phase1.txt`, `phase1-*.txt`). The user chose V1.

![The reference crops, the base, and the variants of phase 1](2026-10-19-elephant-pose/compare-phase1.webp)

## 4. The round

The geometry of V1 showed three problems, and four new fields of the hold and the kettles fix them
(`variants-round.sh`):

- No hold put the mallet head up between strikes, so phase 2 turned it up around the grip
  (`cock`, replaced in phase 3). A paw above the near rim and a mallet of 0.3 m reach 0.25 m in
  from the rim, so the strike moves there (`rim`). A real timpanist strikes "about 3 inches in
  from the edge of the bowl and directly in front of the player"
  ([freepercussionlessons.com](https://freepercussionlessons.com/where-is-the-best-playing-spot-on-timpani)).
- At the real size, the third kettle stood at -119°, behind the left shoulder, and cut 8.8 cm into
  the body (`body-kettle.ts`). In beethoven-8-4, the left hand played only that kettle
  (`kettle-use.ts`), and the mallet pointed back from the paw. Each note now plays on a front
  kettle, split at the middle key of the part (`pair`), and the outer kettles stand 0.95 m out
  (`TIMPANI.side`).
- The hanging left paw went 3.7 cm into the front left kettle in the rest (`rest-paw.ts`). The
  mallets now stay over the kettles in the rest pose (`ready`).

The scans of `pnpm hold-fit timpanist --demo beethoven-9 --set` chose the other values:

| Scan | Result | File |
|---|---|---|
| Top of the grip `up` against `shoulder` | the paw turn falls by 3° to 4° only, and the swing grows | `hold-fit-top.txt` |
| Cock out 0, -0.4, 0.5 rad | the paw turns 122°, 104°, 147° | `hold-fit-cock.txt` |
| Home 0.25 to 0.35 H below the shoulder | the paws go 1.3 to 2.7 cm into the kettles | `hold-fit-home.txt` |
| Heads at 0.84, 0.76, 0.72 m | the forearms point 0°, 18° to 23°, and 30° down | `hold-fit-height.txt`, `look.ts` |

The heads stand at 0.76 m, in the reference range by the height of the elephant.

With no corrective shape, faces 235 and 832 at the front of the armpits folded in each play
sample, and face 181 at the back of the right paw in 15% (`rig-old-shapes.txt`). Three fits of
`pnpm raise-fit timpanist --json` replace the four old shapes (`shapes.json`): the right and the
left arm at a strike, and the bent right wrist. `pnpm rig-mesh elephant --check` gives 0.0% folds
in each set (`rig-shapes.txt`). Then the home rose from 0.4 H to 0.37 H below the shoulder,
because the paws went 1.6 to 1.8 cm into the kettles at the near rims.

| Measure | base `a3755083` | round |
|---|---|---|
| Largest kettle | 0.90 H wide | 1.36 H wide |
| Heads above the floor | 0.72 m (1.20 H) | 0.76 m (1.27 H) |
| Near rims of the front kettles from the middle | 0.45 to 0.50 m | 0.37 to 0.41 m |
| Grip above the head plane, against the near rim | 23 cm, 10 to 12 cm outside | 10 to 12 cm, 0 to 1.3 cm outside |
| Forearm below the level | 5° to 12° | 15° to 21° |
| Mallet at a strike, and between strikes | 49° to 53° down, 46° to 49° down | 20° to 23° down, 40° up and 28° to 31° out |
| Forearm to mallet at a strike | 38° to 48° | 19° to 29° |
| Strikes within 5 mm, 4 demos | 100% of 2,225 | 100% of 2,225 |
| Trunk gap to the kettles | 9.1 cm | 8.2 cm |
| Deepest part, other than the ball of a mallet | 0.4 cm, forearms in the body | 1.0 cm, paws in the kettles |
| Twist p50, L / R | 21° / 24° | 30° / 26° |
| Flat p50, L / R | 0.89 / 0.75 | 0.79 / 0.67 |
| Paw turn on the forearm, L / R | 96° / 81° | 139° / 133° |
| Play / lift folds | 0.1% / 0.8% | 0.1% / 0.0% |

The rows of the grip, the forearm, and the mallet are for beethoven-9 (`look-round.txt`). The other
rows come from `targets.txt`, `pose-depth.txt` (`phase1-gaps.txt` for the base trunk gap),
`arm-shape.txt` (`arm-shape-base.txt`), and `hold-fit.txt`.

![The reference crops, the base, and the round at azimuth 0, 60, and -60](2026-10-19-elephant-pose/compare-round.webp)

![The arms of the base and the round at azimuth 0 and -60](2026-10-19-elephant-pose/arms.webp)

## 5. The stage

`pnpm body-probe --base a3755083` (`body-probe.txt`): 90 of 95 bodies are equal, and the five
supports of the elephant differ by its new shapes. 22 of 23 players and 1,401 of 1,492 pose sets
are equal. The larger kettles move the players near the timpani in the four demos with timpani:
the hippos, the beavers, the pigs, the monkey, the panda, the badgers, the penguins of
beethoven-9, and the conductor. `pnpm test:paused src/shots/` passes 311
tests, and `--base a3755083` finds no new failure (`shots.txt`, `shots-base.txt`). The first
download grows by 321 B to 652,182 B (`size.txt`).

## 6. The result

The elephant takes the pose that the user chose: kettles of the real size at 0.76 m, paws above
the near rims, forearms forward and down, and mallets up and out between strikes. After phase 3,
the paws turn 36° on the forearms, each strike reaches its target, and the play folds are 0.1%.
The right arm skin stays flat (0.70 of the bind), an open item of `TODO.md`.

## 7. Phase 3: the paws

The manager saw crumpled paws, a spike, a squeezed wedge, and dark slots in close crops of phase 2:
each paw turned about 135° on its forearm, almost all as a twist (`paw-turn.ts`). The
studio skin turns its forearm in the frame of the elbow hinge, so the paw has no twist when the
mallet points in that frame as in the bind pose. On this mesh, that direction is level and in,
across the front of the body (`paw-turn-scan.txt`). A mallet up and out with its head out of the
front of the fist costs about 130° of twist.

The fix lets the head of each timpani mallet leave the back side of the fist
(`TIMPANI.malletBack`), so that level and out has no twist. Between strikes, the paw holds the
mallet across the forearm, at an angle from that direction (`PercussionHold.across`), with the
top of the grip along the forearm. The strike keeps the grip and the target of phase 2.

| Rest angle | Paw turn at rest, L / R | Mallet at rest |
|---|---|---|
| -0.8 rad, head at the front | 33° / 32° | 5° to 10° up, about 90° in |
| 1.3 rad, head at the back | 45° / 45° | 37° up, 45° out |
| 1.5 rad, head at the back (chosen) | 36° / 36° | 27° to 30° up, 52° to 55° out |
| 1.7 rad, head at the back | 29° / 29° | 17° to 21° up, 58° to 63° out |

The three shapes of phase 2 give 0.3% play folds with this hold (`phase3-rig-shapes.txt`), so no
shape changes. The left paw went 2.9 cm into the belly beside the largest kettle of beethoven-1,
so the left strike moves 0.1 m out (`offsetL`, `phase3-offset.txt`).

| Measure | base `a3755083` | phase 2 | phase 3 |
|---|---|---|---|
| Paw turn on the forearm, L / R | 96° / 81° | 139° / 133° | 36° / 34° |
| Twist and swing of the paw, L | 91°, 32° | -137°, 37° | 26°, 25° |
| Strikes within 5 mm | 100% | 100% | 100% |
| Play / lift folds | 0.1% / 0.8% | 0.1% / 0.0% | 0.1% / 0.8% |
| Arm twist p50, L / R | 21° / 24° | 30° / 26° | 28° / 28° |
| Flat p50, L / R | 0.89 / 0.75 | 0.79 / 0.67 | 0.87 / 0.70 |
| Trunk gap | 9.1 cm | 8.2 cm | 8.2 cm |
| Deepest part, other than the ball of a mallet | 0.4 cm | 1.0 cm | 1.3 cm, a paw on the belly |

The phase 3 rows come from `phase3-hold-fit.txt`, `phase3-arm-shape.txt`, `phase3-targets.txt`,
and `phase3-gaps.txt`.

![The reference crops, the base, phase 2, and phase 3 at azimuth 0](2026-10-19-elephant-pose/compare-phase3.webp)

![The paws of the base, phase 2, and phase 3 at azimuth 0, 35, -35, and -60, song 90.38 s](2026-10-19-elephant-pose/paws-90.38.webp)

![The same paws at song 91.29 s](2026-10-19-elephant-pose/paws-91.29.webp)

The crops show closed fists with the mallets out of the side. The right forearm still looks thin
at azimuth 35, where its skin stays flat (0.70 of the bind).

