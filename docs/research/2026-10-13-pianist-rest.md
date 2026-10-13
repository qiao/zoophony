# The rest pose of the pianist (2026-10-13)

On 2026-10-13, the user said: "the default rest pose of the polar bear looks strange, fix it".
The rest pose is the pose before the first play, 3 s after a pause, and at the end of a song
(design 5.2). The first screen of the app shows it. The target of the look is the rest clip of
the studio polar bear at 2.95 s of 3 s (`clip_rest()` of `lowpoly-studio/roles/pianist/clips.py`),
because the studio made it for this body. The app plays no clip of the studio.

This report gives the measures of the rest pose on `main` (`b3caf0cd`), on the branch, and in
the rest clip of the studio. The decisions are in
[`2026-10-13-pianist-rest.md`](../decisions/2026-10-13-pianist-rest.md).

## 1. The faults on main

The manager measured four faults in the close views and the first screen:

1. The trunk sat upright. The play lean of the hold was 0 at rest, and the rest clip leans the
   spine bones further than its play clips.
2. In the back view, the arms stood out from the trunk like wings, and the paws hung beside the
   bench. The palms rested 0.75 H to the outer side of the top of the lap.
3. The elbows pointed down and forward. The rest clip points them out and back (`REST_POLE`).
4. A dark line ran down the outer side of each upper arm in the side views. The upper arms went
   6.5 cm into the body at rest, and 4 faces folded in each rest sample.

## 2. Method

Each measure poses the skin of the studio body, as the GPU does. On the app side, the probe
poses the pianist of the Bach demo in the rest pose (`NOT_STARTED`, wall time 10 s). It then
moves the studio bones with `poseStudioBones()`, and moves the vertices with `skinStudioMesh()`.
On the studio side, the probe reads `lowpoly-studio/animals/polar-bear/out/polar-bear.glb`. It
samples the clip `rest` at 2.95 s and moves the vertices with the four joints of each vertex,
with no corrective shapes. A length of the studio is in meters at the scale of the app (1.805 m
for each unit).

- **Upper arm seen from the back.** The share of the vertices of the upper arm (main bone
  `upper_arm_L` or `upper_arm_R`) that a far camera straight behind the body sees. A vertex is
  hidden when a triangle of the rest of the skin lies between it and the camera. The triangles
  of the same arm do not count. This measure shows the wings: an upright trunk shows the whole
  upper arm, and a trunk that leans forward hides a part of it behind the back.
- **Upper arm angle.** The angle of the line from the shoulder joint to the elbow joint from the
  line from the neck joint to the hips joint, in the back view. Positive is out.
- **Trunk lean.** The angle of the line from the hips joint to the neck joint from the vertical,
  in the side view.
- **Wrist from the knee** and **elbow from the shoulder.** The joint of `hand_L` from the joint of
  `shin_L`, and the joint of `forearm_L` from the joint of `upper_arm_L`, in meters: out to the
  side, up, and forward.

The first try of a wing measure took the outermost skin of the arm at the height of the elbow,
less the outermost skin of the trunk. It did not show the wings: the studio scored 20 cm and main
26 to 29 cm, but the trunk narrows at the height of a low elbow, so the value followed the height
of the elbow.

## 3. Measures

| Measure | main | branch | studio |
|---|---:|---:|---:|
| Upper arm seen from the back, left and right | 93.5%, 93.2% | 60.9%, 61.4% | 58.7%, 60.2% |
| Forearm seen from the back, left and right | 95.5%, 95.5% | 95.5%, 95.5% | 100%, 92.5% |
| Upper arm angle, left and right | 18.5°, 18.6° | 49.9°, 49.8° | 45.7°, 45.7° |
| Trunk lean | 4.4° | 20.8° | 20.6° |
| Wrist from the knee (out, up, forward) | 0.27, 0.29, -0.04 m | 0.29, 0.22, 0.09 m | 0.30, 0.21, 0.09 m |
| Elbow from the shoulder (out, down, forward) | 0.10, 0.29, 0.18 m | 0.27, 0.23, 0.04 m | 0.25, 0.24, 0.06 m |

In the default demo (Boulanger), the branch shows 58.7% and 59.1% of the upper arms, and the
trunk leans 21.5°.

The elbows of the rest clip point further out than the elbows of main: the upper arm angle is
45.7° against 18.5°. The back of the rest clip still hides about 40% of each upper arm, because
the trunk leans forward and the shoulders come forward over the knees. The angle alone thus does
not show the wings.

## 4. The variants

Each variant changed the hold in memory (`pnpm pose-depth pianist --set`, and the probe of
section 2 with the same changes). The depths are the deepest point in the body at rest and in
the lift.

| Variant | Upper arm seen | Trunk lean | Upper arms in the body | Forearms in the body |
|---|---:|---:|---:|---:|
| main | 93.5% | 4.4° | 6.5 cm | 0.8 cm |
| rest lean 30° | not measured | 26.9° | 7.9 cm | 0.0 cm |
| rest lean 30°, elbows out and back | not measured | 26.9° | 0.0 cm | 0.0 cm |
| rest lean 30°, paws 0.5 H out and 0.2 H forward, elbows out and back | not measured | 26.9° | 0.0 cm | 1.7 cm |
| rest lean 30°, paws 0.4 H out and 0.3 H forward, elbows out, a little down, and back | not measured | 26.9° | 0.0 cm | 0.0 cm |
| rest lean 22°, paws of the rest clip, elbows down and forward | 80.4%, 81.8% | 20.8° | not measured | not measured |
| rest lean 30°, paws of the rest clip, elbows down and forward | 67.4%, 70.5% | 26.9° | not measured | not measured |
| rest lean 22°, paws of the rest clip, elbows out and back (branch) | 60.9%, 61.4% | 20.8° | 0.0 cm | 0.0 cm |

The paws of the rest clip are 0.8 H out, 0.1 H down, and 0.35 H forward from the top of the leg
at the knee. These values put the wrist 0.29 m out, 0.22 m up, and 0.09 m forward of the knee
joint, as in the rest clip. A rest lean of 22° gives the trunk lean of the rest clip. The studio
adds 30° to its three spine bones, but the line from the hips to the neck turns less than the
sum, because each bone turns only the part above it.

## 5. The lift and the lowering

The sweep of the pianist samples the lift at the play start. A probe sampled the lowering after
a stop at 29 song times of the Bach demo and 25 of the Boulanger demo, and at the song end, at
each 0.05 s of wall time from 3 s to 6 s after the stop. The first samples of the lowering are
still near the playing pose, so the forearms and the upper arms show the depths of a play.

| Arc of the wrists (`restArc`) | Claws in the case | Claws in the body | Upper arms in the body |
|---|---:|---:|---:|
| main (0.3 H out, 0.4 H up, old rest place) | 0.1 cm | 0.0 cm | 7.6 cm |
| 0.3 H out, 0.4 H up | 1.9 cm (Bach, 95.4 s, left paw) | 0.4 cm | 2.7 cm |
| 0.3 H out, 0.4 H up, 0.2 H back | 0.1 cm | 4.9 cm | 2.7 cm |
| 0.3 H out, 0.6 H up | 0.1 cm | 3.3 cm | 2.7 cm |
| 0.5 H out, 0.4 H up | 2.1 cm | 0.0 cm | 2.7 cm |
| 0.4 H out, 0.5 H up | 0.8 cm | 0.5 cm | 2.7 cm |
| 0.5 H out, 0.5 H up (branch) | 0.9 cm | 0.0 cm | 2.7 cm |

With the arc of the branch, the lift keeps 0.1 cm of the claws in the case, and the forearms,
the upper arms, and the paws stay out of the body.

## 6. The sweep and the folds

`pnpm pose-depth pianist`:

| Set | Part | main | branch |
|---|---|---:|---:|
| play | forearms in the body | 8.0 cm | 8.0 cm |
| play | upper arms in the body | 2.9 cm | 2.9 cm |
| play | claws in the case | 0.1 cm | 0.1 cm |
| lift | forearms in the body | 0.8 cm | 0.0 cm |
| lift | upper arms in the body | 6.5 cm | 0.0 cm |
| lift | claws in the case | 0.1 cm | 0.1 cm |
| rest | forearms in the body | 0.8 cm | 0.0 cm |
| rest | upper arms in the body | 6.5 cm | 0.0 cm |

The paws and the claws stay out of the body in each set, and the note-target error stays
0.00 mm.

`pnpm fold-probe pianist`:

| Set | Samples | With a fold, main | With a fold, branch | Most faces, main | Most faces, branch |
|---|---:|---:|---:|---:|---:|
| rest | 2 | 2 | 2 | 4 | 2 |
| play | 2446 | 520 | 520 | 8 | 8 |
| lift | 62 | 7 | 6 | 4 | 2 |

A hash of the rotations and the offsets of each other player of each demo, at rest, in the
lift, and at a sample of each 7.3 s of a play, is equal on main and on the branch. The harp
keeps a rest lean of 0.

## 7. Images

`rest-views.webp`: the rest views of the pianist. The rows are the rest clip of the studio at
2.95 s, main, and the branch. The columns are the front, the left, the right, the back, and the
keys (low from the left).

![The rest views of the studio, main, and the branch](2026-10-13-pianist-rest/rest-views.webp)

`first-screen.webp`: the polar bear in the first screen of the default demo, enlarged 4 times.
Main is on the left, and the branch on the right.

![The pianist in the first screen of main and of the branch](2026-10-13-pianist-rest/first-screen.webp)
