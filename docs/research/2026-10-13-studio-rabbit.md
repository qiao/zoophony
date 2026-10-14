# The studio rabbit in the app (2026-10-13)

On 2026-10-13 the user gave a new four-view sheet of a low-poly rabbit and asked: "create a
low-poly model for the rabbit following this reference image and replace the main-app's rabbit
by this new one". The studio built the rabbit violinist (`lowpoly-studio/animals/rabbit/`, round
1, round 2 `rabbit-look`, round 3 `rabbit-ears`, and round 4 with the longer arms). Round 3
changed only the ears. This report gives the measures of the branch `rabbit-app`, which puts the
studio rabbit into the app by route 3 of `AGENTS.md`. Sections 1 to 8 give the round 3 body, and
section 9 gives the longer arms of round 4. The decisions are in
[`2026-10-13-studio-rabbit.md`](../decisions/2026-10-13-studio-rabbit.md). The probes are in
[`2026-10-13-studio-rabbit/`](2026-10-13-studio-rabbit/). Run each probe from the root of the
repository with `node docs/research/2026-10-13-studio-rabbit/<probe>.ts`.

```text
 rabbit.glb (studio, seated bind pose, chair, held violin and bow)
     | pnpm studio-body rabbit: drop the violin, the bow, the chair, keep the legs
     v
 src/models/studio/rabbit.ts: seated body on a chair of its own depth, standing pose
     |                                   |
 studioRig(body, false): seated          studioRig(body, true): standingBody()
 (violin section, chair)                 (soloist, legs of the sheet, soles on the floor)
     |                                   |
     +--- poseStudioBones(): the violin hold of the app, the violin at the size of the rule ---+
```

## 1. The body

`pnpm studio-body rabbit --inspect` gives the facts of each GLB file. The export keeps the faces
of the fur and the gloss, and drops the violin (444 faces) and the bow (56 faces) with their
joints, and the chair.

| Measure | Round 1 (6e6acc13) | Round 2 (11720c96) | Round 3 (520bd6d8) |
|---|---:|---:|---:|
| Faces of the body | 2,716 | 3,252 | 3,012 |
| Head height `H` | 0.234 m | 0.230 m | 0.230 m |
| Seat height | 0.130 m | 0.133 m | 0.133 m |
| Chair depth (`chairDepth`) | 0.173 m | 0.190 m | 0.190 m |
| Scale | 1.198 m for each unit | 1.198 m for each unit | 1.198 m for each unit |
| Shoulder joints, standing | 0.581 m | 0.583 m | 0.583 m |

The parametric rabbit had `H` 0.38 m and 2,172 triangles. The scene of `perf-60.mid` has 164,502
triangles with the round 1 body, 167,718 with the round 2 body, and 166,278 with the round 3 body,
of its budget of 200,000
(`models/budget.test.ts`, with a print of `sceneTriangles()`).

## 2. The height against the red fox

The violin section of `docs/reference/orchestra-latest.png`, read on crops of 3 times with a
ruler of the pixel rows of the original image (`crop-rabbit.webp`, `crop-fox.webp`):

| Point | Rabbit (x 110 to 300) | Red fox (x 730 to 920) |
|---|---:|---:|
| Head top, no ears | 683 | 612 |
| Seat top | 793 | 745 |
| Floor at the front legs | 858 | 807 |
| Head top above the seat | 110 px | 133 px |
| Seat above the floor | 65 px | 62 px |

So the head top of the seated rabbit above its seat is 0.83 of that of the fox (0.76 with each
measure divided by the seat of its chair). `height-probe.ts` gives the app:

| Player | Seat | Shoulders | Head top, no ears | Ear tips |
|---|---:|---:|---:|---:|
| Red fox, chair | 0.285 m | 0.657 m | 1.159 m | 1.297 m |
| Studio rabbit round 2, chair | 0.133 m | 0.542 m | 0.883 m | 1.151 m |

The head top of the rabbit above its seat is 0.750 m, 0.86 of the 0.874 m of the fox (`height-probe.txt`). The round 1 body gave the same share. The
landmark of the standing shoulders thus stays. The chair of the rabbit is lower than the chair
of the fox, because the studio bent the short legs 55° at the hip and the knee for the seat. The
user rule of 2026-10-10 keeps the legs, and the chair fits them.

## 3. The chair

On the chair of the app (0.4 m deep), the rabbit sat at its front edge: the legs come forward
from the haunch, so a body further back puts its shins over the seat. The chair of the studio is
0.147 m deep at the scale of the app. `chairDepthOf()` of `tools/studio-body.ts` grows it until
the back posts keep 0.01 m behind the trunk: 0.173 m (round 1) and 0.190 m (round 2). The chair
keeps the back of the chair of design 4.5. A chair of that depth centered on the seat changed the
layout: the second desk of the first violins of Beethoven 8 moved from (-4.36, 2.60) on main to
(-4.53, 3.38), and the head point of the first violin stood 3.5 px outside the free area of the
default view (`shots/shot-frames-2.test.ts`). With the back in place, that desk is at (-4.39,
2.70), and the test passes (`layout-probe.ts`: `layout-main.txt`, `layout-centered-chair.txt`,
and `layout-branch.txt`; run it with the root of a source tree as its argument, and a demo file
as a second argument for a demo other than Beethoven 8).

## 4. The standing body

`standingBody()` turns the legs by the turns of the first key of the clip `reference`, gives the
leg shapes their full weight, and puts the lowest point on the floor. With the lift of the
export alone, the round 2 body stood 2 mm into the floor (`pose/rest-clearance.test.ts` before
the fix `e87bef4a`). `stand-probe.ts` gives the round 2 body (`stand-probe.txt`): the lowest point
of each stance at 0, the standing hips at 0.241 m, the thigh and the shin straight under the
hip, and no folded face of the standing legs against the turn of their main bone.

The demos have no standing rabbit. A solo violin with one player for each part stands the rabbit
(chamber form `solo`, `castScore()` of `models/cast.ts`).
`pose/violinist-standing-clearance.test.ts` sweeps it with `SOLO_VIOLIN` of
`pose/test-violinist-clearance.ts`: quarter notes across the strings, a whole bow on each string,
and pizzicato. `standing-sweep.ts` prints its deepest pairs (`standing-sweep.txt`). In the lift,
the right paw goes 1.9 cm and the right forearm 1.5 cm into the round belly, at the wall time
10.60 s: the arm lifts the bow from the side rest across the side of the belly. Each other pair
stays within the contact depth of 1.5 cm. Until the arms of round 4 (section 9), a sweep of its
own accepted 2.5 cm for the paws and the forearms in the lift of a standing rabbit only. Since
round 4, the standing rabbit has the limits of the seated rabbits (`VIOLINIST_SWEEP` of
`pose/test-sweep-roles.ts`).

Open problem: the standing rabbit has a dark pinch behind each knee, under the haunch. The review of
the branch found it in the "stand" tiles of the close views on `119c63da` (`violinist-views.webp`
of that commit).
`stand-knee-pinch.webp` holds the crops: the back view on the left, and the left view on the right,
with dark horizontal streaks between the haunch and the shins, and a dark notch behind the knee. The
fold test of the standing skin passes: no face flips, and the faces near the haunch pinch. The
likely cause is the leg shapes `legs_straight_*` of the studio near the haunch. The app keeps the
body, and the item is open for the studio (`lowpoly-studio/docs/handoff.md`). No demo has a standing
rabbit, so only the gallery view `stand` and a file of a user show it. `pnpm fold-probe` covers the
demos only.

## 5. The size of the violin

A violin shop sizes a violin by the arm. Ellis Music: "Have the player stand with left arm fully
extended to the side, then measure the distance from the neck to the middle of the palm", and
"When supporting the instrument under the chin in playing position, if the instrument is the
proper size, the palm and fingers of the left hand should be able to comfortably cup the scroll"
([Ellis Music, string instrument sizing](https://www.ellismusic.com/t-StringInstrumentSizing.aspx)).
The sizes of a violin teacher give the total length of each size against that arm length
([Violin Lounge, violin size chart](https://violinlounge.com/tools/size-chart)):

| Size | Arm length | Total length |
|---|---:|---:|
| 4/4 | 58.5 cm | 59 cm |
| 1/2 | 51 cm | 52 cm |
| 1/16 | 35.5 cm | 36 cm |
| 1/32 | under 35 cm | 33 cm |

`violin-rule.ts` measures the play position of the hold of the app: the distance from the left
shoulder joint to the scroll, against the arm from the shoulder joint to the middle of the palm.
The red fox with the violin of the app: 0.506 m to the scroll and 0.543 m of arm, so the violin
of the app meets the rule. The round 2 rabbit with the tuned hold (`violin-rule.txt`):

| Violin scale | Violin length | Shoulder to scroll | Arm to palm | Reached part of the fingerboard |
|---:|---:|---:|---:|---|
| 1 | 0.507 m | 0.597 m | 0.269 m | none (only its end) |
| 0.5 | 0.253 m | 0.355 m | 0.269 m | 0.69 to 1 |
| 0.4 | 0.203 m | 0.309 m | 0.269 m | 0.27 to 1 |
| 0.3 | 0.152 m | 0.265 m | 0.269 m | 0 to 1 |

`violin-solve.ts` solves the scale of the rule for each turn of the violin (`violin-solve.txt`):
0.310 at 45° to the left of the front (the turn of the hold), 0.322 at 50°, 0.336 at 55°, and
0.351 at 60°. On the round 1 body with the lean of 10° of the old hold, the same probe gave 0.296
at 45°, and the scale of 0.3 came from it. The chin of the rabbit is 0.13 m in front of its
shoulder joint, so the violin starts far in front of the shoulder, and the rule gives a small
violin. The studio gave its violin 0.17 animal heights (0.20 m) with the paw at 0.68 of its
length. At the scale of 0.3, the scroll is 4 mm short of the middle of the palm, and
`pose/bowed.test.ts` keeps it within 1 cm.

## 6. The hold

`pnpm pose-depth violinist` sweeps the first seated rabbit of each demo. The tuning of the
shoulder hold on the round 1 body, in cm in the body, the largest value over the demos of each
run (the logs `depth-elbow-30.txt`, `depth-elbow-45.txt`, and `depth-tuned.txt`):

| Variant | Lift forearms | Lower forearms | Play forearms | Play upper arms |
|---|---:|---:|---:|---:|
| Elbow (1.5, 0.2, -1), shoulder turn 30° | 1.6 | 2.5 | 2.5 | 2.9 |
| Elbow (1.5, 0.2, -1), shoulder turn 45° | 1.6 | 1.7 | 1.0 | 0.8 |
| Elbow (1.5, 0.6, -1), shoulder turn 45° | 1.1 | 1.4 | 1.0 | 0.8 |

With the elbow of the chin hold, (1, -1, -1), the right forearm went 3.2 cm into the belly in the
lift of the K. 525 demo (`pnpm pose-depth violinist --demo mozart-k525`, before the fix of the
offsets below).

The play depth of 2.5 cm and 2.9 cm is the last note of the Boulanger demo, a pizzicato on the E
string at 280.45 s: the bow paw reaches across the chest to the violin at the left. The turn of
the shoulder of 45° frees it. The lap rest of the chin hold put the violin on the top of the belly
(the lap point at 0.417 m, under the chin) and the bow 7.3 cm into the body. The side rest
(`restAtSide`) holds the violin at the left side: 0.36 m to 0.42 m above the floor, out of the
left shoulder joint.

Before the fix of `poseStudioBones()`, the violin of the GPU skin stayed at its bind place in the
rest pose: the violin box at rest was 0.60 m to 0.66 m high, at the chin, though the instrument
bone was at 0.384 m (`rest-probe.ts`).

## 7. The results

| Measure | main | branch |
|---|---:|---:|
| First download (`pnpm build && pnpm size`) | 344,961 B | 364,645 B |
| `pnpm test` | 27.4 s to 28.3 s (`2026-10-13-route-3-retro.md`) | 40.7 s (`tools/check-commits.sh --tip main`) |
| `pnpm pose-depth violinist`, the deepest pair over the contact depth | no role | none (paws in the lowering 1.9 cm, accepted 2.5 cm, `depth-round3.txt`) |
| `pnpm fold-probe violinist` | no role | 0.3% of the play samples, at most 1 face (`fold-round3.txt`) |
| `pnpm pose-depth pianist`, forearms and upper arms in play | 8.0 cm, 2.9 cm | 8.0 cm, 2.9 cm |
| `pnpm pose-depth conductor`, arms | 3.7 cm, 3.5 cm | 3.7 cm, 3.5 cm |
| `pnpm fold-probe pianist` | 20.7%, at most 8 faces | 20.7%, at most 8 faces |
| `pnpm fold-probe conductor` | 52.1%, at most 9 faces | 52.1%, at most 9 faces |
| `pnpm sheet-check rabbit`, silhouette IoU against the old sheet | parametric | front 0.483, side 0.293, back 0.446 (`sheet-check.txt`) |

The shards of the violinist clearance take 21 s, 16 s, and 15 s of file time.

`pnpm body-probe --base main` (`body-probe.txt`: 90 of 95 bodies, 22 of 23 players, and 555 of 672 pose sets equal): the bodies and the player of the rabbit change. The
other changes come from the layout. The layout fits the footprints of the new rabbit. In
Beethoven 8 and K. 315, it moves the rabbits 2 and 3 (the second desk of the first violins) and the
red foxes 6 and 7 of the second violins a little, and the looks of the foxes at the conductor change
(`layout-main.txt` and `layout-branch.txt` for Beethoven 8, `layout-main-k315.txt` and
`layout-branch-k315.txt` for K. 315, with the argument `mozart-k315.mid`). The cue center of a seat
is the middle of the places of its players, at the fixed eye height of the cues (`cueSeats()` of
`pose/plan.ts`). It reads no eye of a player. The layout moves players of both violin seats, so the
cue centers of the two seats move, and the cues of the conductor change in these two demos.

## 8. Images

- Close views: `pnpm close-views violinist <dir>` on `9ed4c683`, the round 4 body
  (`violinist-views.webp`).
- Snapshot: `docs/snapshots/2026-10-13-9ed4c683/` (the round 4 body).

## 9. The longer arms of round 4

With the short arms of rounds 1 to 3, the rule of section 5 gave a violin of 0.15 m, and it was
almost hidden on the stage. The manager offered: "B. Longer arms, real small violin: the arms
become about 1.4 times as long as on your sheet, and the rabbit holds a 1/16 violin (about
0.36 m)". The user answered "B". The rule needs about 1.7 times the arm for a violin of 0.36 m,
so the manager corrected the estimate and asked again. The user chose: "Arms x1.4, violin 28 cm".
The studio round 4 made the reach from the shoulder joint to the middle of the palm 1.4 times as
long, with the same shoulder joints, and remeshed the body with the role seed 8.

`pnpm studio-body rabbit --inspect` and `pnpm studio-body rabbit` on the GLB file of round 4
(sha256 29a682d8):

| Measure | Round 3 (520bd6d8) | Round 4 (29a682d8) |
|---|---:|---:|
| Faces of the body | 3,012 | 2,920 |
| Head height `H` | 0.230 m | 0.224 m |
| Seat height | 0.133 m | 0.126 m |
| Chair depth (`chairDepth`) | 0.190 m | 0.167 m |
| Triangles of the scene of `perf-60.mid` | 166,278 | 165,726 (`scene-triangles.ts`) |
| First download (`pnpm build && pnpm size`) | 364,645 B | 363,294 B |

The size of the violin (`violin-round4.txt`, the output of `violin-rule.ts rabbit 0.3,0.5,0.55`
and of `violin-solve.ts`):

| Measure | Round 3 | Round 4 |
|---|---:|---:|
| Arm from the shoulder joint to the middle of the palm | 0.269 m | 0.377 m (1.40 times) |
| Scale of the rule at 45° to the left of the front | 0.310 | 0.549 |
| Scale of the rule at 50°, 55°, and 60° | 0.322, 0.336, 0.351 | 0.563, 0.579, 0.595 |
| `violinScale` of the rabbit | 0.3 | 0.55 |
| Violin length | 0.152 m | 0.279 m |
| Bow length | 0.171 m | 0.314 m |

At the scale of 0.55, the scroll lies 0.377 m from the left shoulder joint, at the middle of the
palm. The violin of 0.28 m is smaller than the 1/32 violin of the table of section 5 (33 cm).

The hold. With the arms of round 4, the paws and the forearms stay out of the body in each sample
set of each demo, with each hold below. `pnpm pose-depth violinist --set ...` gives the depths
(`depth-round4-variants.txt`), and `fold-set.ts` gives the folds of the studio skin
(`fold-round4.txt`). The depths are the largest values over the demos, in cm:

| Right arm of the hold | Play upper arms in body | Lowering upper arms in body | Lift forearms in violin | Play samples with a fold |
|---|---:|---:|---:|---:|
| Shoulder hold of round 3: elbow (1.5, 0.6, -1), tip elbow (1, -1, -1), turn 45° | 0.2 | 0.3 | 1.3 | 0% |
| Chin hold: elbow (1, -1, -1), tip elbow (0.5, 1, -1), turn 30° | 0.2 | 0.5 | 1.3 | 1.3%, at most 2 faces |
| Chosen: elbow (1, -1, -1), tip elbow (1, -1, -1), turn 30° | 0.4 | 0.5 | 1.3 | 0% |

The chosen hold keeps the elbow and the shoulder turn of the chin hold, as the red fox plays, and
the elbow of the tip of the old shoulder hold. With the tip elbow up, one or two faces of the right
upper arm folded in a play. `depth-round4.txt` gives the sweep of the chosen hold with `--gaps`:
each pair stays within the contact depth of 1.5 cm, and the bow target error is 0.00 mm. The gap
of the head to the violin is 0.0 cm (0.9 cm in round 3): the jaw rests on the larger violin. The
head goes 0.1 cm into the violin (`depth-round4-head.txt`, `pnpm pose-depth violinist --bones
head,neck,chest --into violin`).

The accepted limits of rounds 1 to 3, measured again on the chosen hold:

| Limit | Round 3 | Round 4 | Result |
|---|---:|---:|---|
| Paws in the body in the lowering (accepted 2.5 cm) | 1.9 cm | 0.0 cm (`depth-round4.txt`) | removed |
| Paws and forearms in the body in the lift of the standing rabbit (accepted 2.5 cm) | 1.9 cm, 1.5 cm | 0.0 cm, 0.0 cm (`standing-sweep-round4.txt`) | removed |
| Turn of the bow paw in the lift of the Boulanger demo (1,500° a second on a studio body) | 1,030° a second | 764° a second (`limits-round4.txt`) | the limit of 1,000° a second for each player |
| Rest bow in the trunk and the arms (touch of 1 mm on a studio body) | 0.3 mm | 0.53 mm in the arms, 0 in the trunk (`limits-round4.txt`) | kept |

With the shoulder hold of round 3 on the round 4 body, the bow paw turns 730° a second
(`limits-round4-old-hold.txt`). The finger block of the studio paw still stays under the plane of
the strings: with the rabbit in the finger block check of `pose/bowed.test.ts`, its highest point
is 3.8 mm under the plane (the check asks 5.5 mm above). The palm checks keep the rabbit.

Open problem: the test of the bow turn limit runs only the Boulanger demo. In Bach and Beethoven
9, the bow paw of the rabbit turns about 3.6° in one step of 1 ms, at wall 0.249 to 0.250 s of the
lift. That is 3,678° and 3,590° a second with the song held at 0, and 3,593° a second with the
real count-in. Only this one step is above 1,000° a second (`turn-profile.txt`). A second rabbit
of Bach (seat index 2) turns 3,633° a second at wall 0.145 s. The rabbits of the other demos turn
764° to 828° a second (`turn-all-demos.txt`). On `796e9278`, before the arms of round 4, the
rabbits of Bach and Beethoven 9 turn 3,704° to 3,795° a second (`turn-profile-796e9278.txt`,
`turn-all-demos-796e9278.txt`). Thus the longer arms did not cause the jump, and the removed limit
of 1,500° a second did not hold in these two demos either. A later round finds the switch at wall
0.25 s, and runs the test of the limit on each demo with a rabbit. The commands are
`node docs/research/2026-10-13-studio-rabbit/turn-profile.ts` and
`node docs/research/2026-10-13-studio-rabbit/turn-all-demos.ts`. For `796e9278`, extract
`src/`, `tools/`, `demos/`, and `package.json` of the commit with `git archive` into a folder,
link `node_modules` of the worktree into it, copy both probes to the same path in it, and run
them there.

`pnpm fold-probe violinist` on the chosen hold: no fold in the play samples, and one face of the
right upper arm folds in each rest sample and in 22.6% of the lift samples (`fold-round4.txt`).
Round 3 had no fold in the rest and the lift. The fold is in the hanging right arm of the side
rest, so it comes from the remesh of round 4. It is open for the studio.

The folded face is face 248 of `upper_arm_R`, at the front of the right armpit, with the bind
centroid (0.107, 0.497, -0.052) m. It is a thin face: its smallest angle is 15.8°, and its area is
3.25 cm². It is the mirror of studio face 805 of `upper_arm_L` (0.0 mm off), the thin face that
the near check of round 4 found. In the rest of Bach, the face turns 101.8° from its bind normal.
With the weights of the arm corrective shapes at 0, it turns 80.9° and does not fold. Thus the
arm-down corrective shape of the right arm (weight 0.62 in the rest) makes the fold. In the lift,
the face turns 114.1°, 129.4°, 146.5°, and 168.1° at 0.3, 0.4, 0.5, and 0.6 s, more than the fold
limit of the studio (120°). The rest row of `violinist-views.webp` shows no fault at the right
armpit. `rest-fold.txt` gives these values, from
`node docs/research/2026-10-13-studio-rabbit/rest-fold.ts` with the variants below as arguments.

No hold value of the rest removes the fold. `standingRest()` of `pose/bowed-rig.ts` replaces
`restPoleR` and `restBow` with `hangingArm()`. Thus `violin@rabbit.restPoleR=1,-0.3,0` and
`violin@rabbit.restBow.tip=-1,0,0.3` keep the fold, and `violin@rabbit.reach=45deg` changes only
the lift. The `HANG` constants of `src/pose/hang.ts` can remove it. `HANG.forward=30deg` and
`HANG.bend=80deg` give no fold in the rest of Bach (`rest-fold.txt`). The review measured
`forward` 30° with a temporary edit of `src/pose/hang.ts`, then `pnpm fold-probe violinist`,
`pnpm fold-probe conductor`, `pnpm pose-depth violinist`, and `pnpm body-probe --base HEAD`:

| Measure | `forward` 20° (now) | `forward` 30° |
|---|---:|---:|
| Violinist rest samples with a fold | 100% (`fold-round4.txt`) | 0% (`hang-forward30-fold-violinist.txt`) |
| Violinist lift samples with a fold | 22.6% | 4.3% |
| Conductor rest samples with a fold | 100% (`fold-conductor-round4.txt`) | 0% (`hang-forward30-fold-conductor.txt`) |
| Conductor lift samples with a fold | 9.7% | 3.2% |
| Deepest part of the violinist in an obstacle | 1.3 cm (`depth-round4.txt`) | 1.3 cm (`hang-forward30-depth.txt`) |
| Pose sets that change against the tip (`pnpm body-probe --base HEAD`) | 0 of 672 | 120 of 672 (`hang-forward30-body-probe.txt`) |

The 120 changed pose sets are the rest, the lift, and the lowering of 40 players: the rabbits,
the conductor in each demo, the badgers, and the elephant timpani. The `HANG` constants are a
change of design 5.2 for each player that hangs its arms, so this is a later choice. The fix of the
studio is the thin face at the armpit, or the corrective shape.

`pnpm body-probe --base main` (`body-probe-round4.txt`): 90 of 95 bodies, 22 of 23 players, and
555 of 672 pose sets equal. These are the counts of round 3. The pose sets of the other players
that change are the same as in section 7: the red foxes 6 and 7 and the conductor in Beethoven 8
and K. 315, from the layout.
