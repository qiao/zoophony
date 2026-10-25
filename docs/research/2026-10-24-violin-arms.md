# The arms and the review of the rabbit violinist and the cat violist

Date 2026-10-24. Decisions:
[`2026-10-24-violin-arms.md`](../decisions/2026-10-24-violin-arms.md) and
[`2026-10-24-violin-review.md`](../decisions/2026-10-24-violin-review.md). The probes, their
outputs, and the images are in [`2026-10-24-violin-arms/`](2026-10-24-violin-arms/). Each command
runs from the root of the tree. "Before" is `main` for the arms and the branch tip before each fix
for the poses.

## 1. The questions

The user said: "note that there's significant twisting happening for the arms and wrists. add
loop edges and retopology and additional bones if needed to address them". The manager compared
the images with professional players and listed five faults (section 3).

## 2. The rebuilt arms of the rabbit

The route is the route of the polar bear (`2026-10-24-polar-bear-arms.md`), with its three generic
commits. `tools/blender/violin_arms.py` replays the Blender session: a headless run gives
`rabbit-arms.glb` and `rabbit-weights.json` byte for byte.

```text
 rabbit-apose.glb --> cut at the shoulder line and the wrist --> quad tube (15 rings x 16)
   --> wrap --> bridge the loops (the twist with the shortest edges) --> beautify the triangles
   --> UV, bake (512 px) --> normals --> slim and lengthen the arms (x 1.15)
   --> rabbit-arms.glb --> skeleton + 4 + 4 segments + elbow and wrist helpers
   --> automatic weights, paint fixes --> rabbit-weights.json --> pnpm rig-mesh rabbit
```

| Item | `main` | This branch |
|---|---|---|
| Arm bones that hold skin | upper arm, its twist bone, forearm, forearm twist, paw | 4 upper arm segments, elbow helper, 4 forearm segments, wrist helper, paw |
| Largest step between two arm bones | 83.7° (left forearm) | 42.1° (left forearm), 22.8° (upper arms) |
| Mean total twist of an arm, left and right | 152.9°, 163.7° | 153.2°, 159.5° |
| First download (gzip), `pnpm size --base main` | 743,904 B | 751,000 B (+7,096 B) |

The hold sets the total twist, so it stays. The upper arms meet the target of 25°. The forearms
do not: the left paw asks for about 150° in the play, so each of the 4 segments takes about 36°
(`twist-main.txt`, `twist-after.txt`). The largest skin twist per 0.1 of the forearm (p95) falls from 30° to
21° (left) and from 27° to 18° (right) (`twist-profile.txt`). The gate rings at 0.5 and 0.85 of the
forearm now see more of the twist, because the skin turns along the whole forearm and not at the
wrist: the forearm twist of the gate is 80° on the left arm (51° on `main`).

The cat rebuild did not pass. Its upper arm joins the trunk down to the elbow, and a cut at 0.8
of the upper arm folded 12 to 16 faces at each elbow (5 and 8 on `main`). The cat keeps its
arms.

## 3. The review fixes

| Fault | Change | Measure, before and after |
|---|---|---|
| The rabbit violin low, the jaw off the violin | `headDrop` 12°, the violin 0.08 H higher | head gap 1.7 cm to 0.0 cm, head depth 0.0 cm |
| The rabbit right paw twist in a lowering, with the violin at the jaw | the bow grip 0.4 H to the front in the moves | move twist 147° to 145° (142° on `main`) |
| The fold under the right armpit of the cat at the tip | the right elbow down at the tip (`poleTipR`) | narrowest ring 0.14 to 0.49 of its axis |
| The cat bow across the belly in the lift | the bow up and forward in the middle (`restBow.via`) | bow in the viola 1.3 cm to 0.0 cm, in the arms 2.7 cm to 0.4 cm |
| The creases of the rabbit right upper arm | the rebuilt arms (section 2) | `rabbit-crease.webp` |
| The cat rest viola with its back to the audience | the top plate 30° to the left of the front | left paw swing at rest 91° to 26° |

```typescript
interface BowedHold {
  /** The turn of the head down while the player plays, in radians. 0 keeps the head level. */
  readonly headDrop: number;
}
```

`chin-probe.ts` measures the play hold. The red fox gives the target: the strings rise 5°, the
violin points 64° to the left, and the head touches it with a depth of 0.1 cm.

```bash
node docs/research/2026-10-24-violin-arms/chin-probe.ts --every 40
```

A left turn of the rabbit head moved the jaw away from the chin rest, so the head only turns
down. The cat head touches the viola at 74° to the left, 1.2 cm deep. In a grid of 36 places
nearer to the red fox, the viola went up to 4.1 cm into the chest (2.4 cm now), the paw lost the
nut (`pnpm hold-reach cat --instrument viola`), or the paw swung past 70°. The cat hold stays.

## 4. The bow at the tip

`placeBow()` of `pose/bowed.ts` puts the bow in the plane of its string, and turns it in that
plane by the slant of the hold (`BowedHold.slant`), so that the frog comes nearer to the right
shoulder. Thus the bow stays in its string plane at the tip. `bow-tip.ts` measures the play
samples with the right paw farthest from the strings (`bow-tip.txt`):

| Player | Bow slope | In the front view | Out of the top plate | Slant |
|---|---:|---:|---:|---:|
| Rabbit | 60° | 67° | 23° | 5° |
| Cat | 37° | 44° | 8° | 20° |
| Red fox | 40° | 47° | 5° | 12° |

Two causes make the bow look steep from the front. The top plate rolls about 40° to the right,
and the string plane of a high string rolls further (section 2.2 of `string-technique.md`). The
violin points 64° to the left, so the level part of the bow points toward the camera, and the
front view makes it short. The rabbit is steeper than the red fox, because its tip samples play
mostly on the highest string: the bow leaves the top plate by 23°, near the outer plane. With the
slant of the red fox, the rabbit bow slope is 57°, and with its string turn 59°. The bow stays
off a right angle to the strings by the slant only. No change follows.

## 5. The gate, the depths, and the bodies

`pnpm arm-check --all --base main` (`main` ef1f1666, `gate.txt`). A cell gives the branch value and
the value of `main`. The other 20 roles do not change.

| Role, arm | Folds | Twist | Forearm twist | Flat | Paw swing | Stretch | Grip turn | Move twist | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Rabbit L | 7 (5) | 17 (19) | 80 (51) | 0.85 (0.58) | 57 (66) | 0.10 (0.21) | 12 (11) | 162 (162) | FAIL |
| Rabbit R | 3 (7) | 22 (32) | 50 (41) | 0.86 (0.80) | 48 (59) | 0.08 (0.37) | 19 (17) | 145 (142) | PASS |
| Cat L | 2 (8) | 24 (32) | 52 (52) | 0.61 (0.51) | 67 (91) | 0.17 (0.23) | 9 (9) | 153 (153) | PASS |
| Cat R | 4 (5) | 53 (53) | 33 (45) | 0.49 (0.14) | 69 (65) | 0.34 (0.33) | 32 (12) | 130 (133) | FAIL |
| Red fox L, R | no change | | | | | | | | as `main` |

The FAIL of the rabbit is the forearm twist of the gate rings (section 2). The FAIL of the cat is
its grip turn: the lower right elbow at the tip rolls the forearm, and the paw turns 32° from its
accepted grip. A new entry of `ACCEPTED_GRIPS` needs the acceptance of the 2x paw crops.

`pnpm body-probe --base main`: only the 5 rabbit bodies, the rabbit player, and the pose sets of
the rabbit violin and the cat viola change (`body-probe.txt`). `shares.txt` gives the depths at
each 0.1 of the moves: the bows go at most 0.1 cm into the instruments and the bodies. The rabbit
bow goes 2.5 cm into the arms near the grip (2.6 cm on the branch tip before this round).

`pnpm frame-compare main HEAD --runs 2 --no-frozen` (`frame.txt`) gives the cost of the 20 new
arm bones of the rabbit:

| Item | Main thread p50 / p95 | GPU p50 / p95 | Frame rate with no cap |
|---|---|---|---|
| `main` | 3.84 / 5.11 ms | 7.82 / 8.01 ms | 131.4 fps |
| This branch | 3.84 / 5.05 ms | 7.86 / 8.02 ms | 130.6 fps |

The change is inside the noise of two runs. The frame target of design 9.7 fails on both trees
(the main thread p95 and the GPU frames above 4 ms).

## 6. The images

Each sheet puts the row before the fix above the row after it, in 4 to 6 views.

- `rabbit-arms-play.webp` (1x) and `rabbit-arms-2x.webp`: rest, frog, tip, and crossing.
- `rabbit-arms-moves.webp`: each 0.1 of the lift and of the lowering.
- `rabbit-crease.webp`, `rabbit-chin.webp` (with the red fox): 2x crops.
- `cat-rest.webp` (with the red fox), `cat-tip.webp`, `cat-bow-lift.webp`, `cat-bow-lower.webp`.

The candy-wrapper twist of the forearms of `main` is gone from each view: the skin of the
rebuilt forearm turns along its length. No view shows a crease on the upper arms or a pointed
elbow.

## 7. The open faults

- The forearm twist steps of the rabbit stay above the target (section 2).
- The cat keeps the arms of `main` (section 2).
- The cat viola points 74° to the left, and its head goes 1.2 cm into it (section 3).
- The right paw of the cat turns 32° from its accepted grip with the elbow down at the tip.
- The rabbit bow goes up to 2.5 cm into its arms near the grip in a lowering (`shares.txt`).
