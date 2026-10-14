# The studio rabbit in the app (2026-10-13)

On 2026-10-13 the user gave a new four-view sheet of a low-poly rabbit and asked: "create a
low-poly model for the rabbit following this reference image and replace the main-app's rabbit
by this new one". The studio built the rabbit violinist (`lowpoly-studio/animals/rabbit/`, round
1, round 2 `rabbit-look`, and round 3 `rabbit-ears`). Round 3 changed only the ears. This report gives the measures of the branch `rabbit-app`, which
puts the studio rabbit into the app by route 3 of `AGENTS.md`. The decisions are in
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
     +------- poseStudioBones(): the violin hold of the app, the violin at 0.3 size -------+
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

- Close views: `pnpm close-views violinist <dir>` on `119c63da` (`violinist-views.webp`).
- Snapshot: `docs/snapshots/2026-10-13-119c63da/`.
