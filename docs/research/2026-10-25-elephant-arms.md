# The rebuilt arms of the elephant timpanist

Date 2026-10-25. Decisions:
[`2026-10-25-elephant-arms.md`](../decisions/2026-10-25-elephant-arms.md). The outputs, the
probes, and the images are in [`2026-10-25-elephant-arms/`](2026-10-25-elephant-arms/). Each
command runs from the root of the tree. "main" is `6dda4069`.

## 1. The question

On `main`, the elephant timpanist showed dark slits and long dark shards on both upper arms, from
each side in each moment, the rest too, and from the front. The long faces of the A-pose mesh
cross the whole upper arm, so linear skinning folds them. The manager asked for the arm rebuild of
`docs/agents/rig-blender.md`, and for a check of the strokes, because the moments "left" and
"right" of the close views looked almost the same.

## 2. The route

`tools/blender/elephant_arms.py` replays the session headless with the steps of `wind_arms.py`. Two
runs give `elephant-arms.glb` and `elephant-weights.json` byte for byte (SHA-256 in
`assets/models/elephant/README.md`).

```text
 elephant-apose.glb (user) --> Merge by Distance
   --> Bisect at 0.4 of the upper arm (no tilt) and at 0.3 of the paw --> Delete Faces
   --> Collapse Edges at the cut loops (24) and under the armpits (cleanPit, 25)
   --> quad tube: 13 rings x 16 (2 upper, 3 at the elbow, 6 forearm, 2 at the wrist)
   --> Shrinkwrap --> Bridge Edge Loops --> Beautify Faces --> Collapse Edges (21)
   --> UV, bake of the fur color, Data Transfer of the normals (length and thickness kept)
   --> skeleton + 4 + 4 segments + helpers --> automatic weights --> Limit Total 4
   --> Weight Paint: Remove From Group on the trunk, Smooth on the root and the shoulder top,
       Smooth on the arms --> elephant-weights.json
```

The arm is about 0.1 units thick, about half of its length. This changes three settings of the
other animals:

```text
      shoulder joint                     a tilted cut plane leans 1.8 cm across the radius,
           o------ cut 0.4 ---|---|      but the first ring stands only 1.1 cm away, so the
                              |   |      bridge crosses the ring and turns faces over.
       tilt 20°: plane  /     |   |      No tilt: the plane stays a right angle to the bone.
```

- The shoulder cut has no tilt. With 20°, the bridge faces turned over at the front of each arm
  root. `bridge_probe.py` counts the bridge faces whose normal points to the arm line: with the
  wrist cut at 0.2, 2 faces at the left wrist, and at 0.3, none.
- The wrist cut lies at 0.3 of the paw. At 0.1 and 0.2, the wrist ring and the cut plane crossed
  on the top of the wrist, and a hole showed in the bind.
- The elbow rings stand 0.026 units (5 cm) from the joint.

## 3. The tries

`variants.sh` builds each row with `run_variant.py` (the settings of each row in `variants.txt`,
the elbow helper twice the elbow gap) and rigs it with `pnpm rig-mesh elephant --check --set
source=...;paintedWeights=...`. Each rig then goes through
`pnpm arm-check timpanist --glb <rig> --base main` and `pnpm pose-depth timpanist --glb <rig>`. "Root" is the Smooth box of the root band: narrow is
|x| 0.13 to 0.21 and the height 0.52 to 0.66 units, wide is |x| 0.11 to 0.24 and 0.5 to 0.75.

| Variant | Elbow gap u | Pit clean | Root | Folds L / R | Flat R | Upper arm / forearm depth cm |
|---|---:|---|---|---|---:|---|
| `main` | | | | 2 / 1 | 0.87 | 1.8 / 0.0 |
| a0 | 0.016 | no | narrow | 10 / 8 | 0.93 | 2.6 / 1.5 |
| g22 | 0.022 | no | narrow | 6 / 9 | 0.83 | 2.5 / 1.4 |
| pit | 0.016 | yes | narrow | 8 / 3 | 0.84 | |
| pg | 0.022 | yes | narrow | 4 / 5 | 0.75 | |
| q2 | 0.026 | yes | narrow | 3 / 4 | 0.74 | 3.4 / 1.1 |
| v1 | 0.026 | yes | narrow, shoulder top | 3 / 3 | 0.82 | 3.4 / 1.1 |
| y2 | 0.024 | yes | wide | 3 / 1 | 0.77 | 3.2 / 2.4 |
| **u3 (chosen)** | 0.026 | yes | wide | 3 / 2 | 0.76 | 3.4 / 1.5 |

Rejected in the images:

- Five rings at the elbow (one more ring halfway on each side): the creases of the inner elbow
  became sharper.
- A Smooth of 16 to 24 rounds at the elbows (`paint.elbow` of `wind_arms.py`): no change, or
  11 left folds.
- The trunk side fix of the mouse (`paint.side`): no change.

A wider elbow gap folds fewer faces of the inner elbow, but the elbow helper then takes more of the
inner upper arm and turns it halfway toward the forearm, into the belly. No variant kept both the
folds within the margins and the upper arms within 1.5 cm.

## 4. The colors

`colors.tone.keep` of `main` kept the colors of the source on the fingers and the toes. The
Blender weights put the top of each paw on the `fingers` bone, so the top of each paw showed the
warm pink of the texture. The fingers left the list. The cream nails keep their color by the
lightness limit of the rule.

## 5. The strokes

`mallet-heights.ts` samples the lowest corner of each mallet and each paw joint at steps of 0.05 s
(`mallet-heights.txt`, `beethoven-1.mid` 140 to 142 s).

| Time s | Left mallet m | Left paw m |
|---:|---:|---:|
| 140.80 (rest) | 0.881 | 0.896 |
| 140.90 (strike) | 0.764 | 0.913 |
| 141.00 (rebound) | 0.878 | 0.897 |

The head lifts out of the drum head within 0.1 s, and the paw joint moves 1 to 2 cm while the head
moves 12 cm, so the wrist leads, as section 4 of the percussion reference gives. The close-view
moments "left" (0.5 s) and "right" (1.5 s) are note starts: in each, one head touches its kettle,
and the other waits about 12 cm higher. From the front at 30°, this difference is small, so the
cells look alike. The motion is correct, and it does not change.

## 6. The measures

`pnpm arm-check --all --base main` (`gate.txt`, main in brackets). The other roles do not change.

| Arm | Folds | Twist | Forearm twist | Flat | Paw twist | Paw swing | Stretch | Grip turn | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| L | 3 (2) | 18 (14) | 9 (4) | 0.83 (0.71) | 20 (20) | 43 (43) | 0.08 (0.20) | 7 (7) | PASS |
| R | 2 (1) | 20 (13) | 5 (6) | 0.76 (0.87) | 10 (10) | 28 (28) | 0.02 (0.07) | 4 (4) | FAIL |

The FAIL is the margin of the right flat share (0.05) at the shoulder ring, inside the limit 0.55.

The twist probe `node docs/research/2026-10-24-violin-arms/twist-steps.ts timpanist 0.25` gives
the largest step between two neighbor arm bones: 11.7° on the left upper arm and 10.4° on the
right (`twist-after.txt`, goal 25°).

`pnpm pose-depth timpanist --base main` (`pose-depth.txt`, cm, main in brackets):

| Pair | Play | Lift | Rest | Lowering |
|---|---|---|---|---|
| Upper arms in the body | 3.4 (1.8) | 3.3 (1.7) | 3.3 (1.7) | 3.3 (1.7) |
| Forearms in the body | 1.5 (0.0) | 1.4 (0.0) | 1.4 (0.0) | 1.4 (0.0) |
| Mallets in the kettles | 1.6 (1.6) | | | |

The deepest upper arm corners lie on the inner side of the right upper arm, from 0.65 of its
length to the elbow, against the round belly (`--where upperArmR beethoven-8-4:565.34`).

`pnpm body-probe --base main` (`body-probe.txt`): only the 5 elephant bodies and the timpanist
player change, and all 1,492 pose sets stay equal.

## 7. The size and the frame

`pnpm size --base main` (`size.txt`): 774,500 B, 5,887 B more than main (768,613 B), below the
limit of 1,000,000 B. The arms have 783 more triangles, and the module holds the heads of 20 more
bones.

`pnpm frame-compare main HEAD --runs 1` (`frame.txt`, ms, one run of each item under
`tools/measure-lock.sh`, load average 8 to 12 from other agents):

| Item | Main thread p50 / p95 | GPU p50 / p95 | Frame rate with no cap |
|---|---|---|---|
| main | 3.82 / 5.06 | 7.90 / 8.09 | 130.3 fps |
| branch | 3.88 / 5.10 | 7.83 / 8.03 | 131.3 fps |

The 20 more bone matrices of the elephant body (8 segments and 2 helpers on each arm) cost no measurable time.
Both items fail the frame target of design 9.7, as on `main`. The frozen shots of the play and
the section give the same pixels.

## 8. The images

`views.webp` and `views-main.webp`: the moments "left", "right", and rest from the front, each
side, the back, and ±35° at the zoom 2, at the elevation of the role. `views-e40.webp` and
`views-e40-main.webp`: the same moments at the elevation 40 with az150 and az-150 in place of
±35°. `rebuild.webp`: the left arm of the source (top) and of the copy (bottom) in the bind, in
Blender with backface culling, from the front, the left side, and the back. The long shards and slits of `main` are gone from
each side, the back, and ±35°. The paws hold the mallets as on `main` (grip turn 7° and 4°).

## 9. The open faults

- The upper arms go 3.4 cm into the belly (accepted 3.0 cm). The elbows of
  `PERCUSSION_HOLDS.timpani` decide it, and the round did not change the hold.
- Short light and dark creases show at each inner elbow from the front.
- The right flat share is 0.76 (main 0.87).
- A short dark notch at the top front of the right arm root shows from the right side, as on
  `main`. It lies in the faces of the user above the shoulder cut.
