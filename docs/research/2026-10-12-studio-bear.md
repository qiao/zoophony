# The studio bear in the app

On 2026-10-12, the user decided: "use the studio bear in the app". This report gives the facts
behind the decisions of [`2026-10-12-studio-bear.md`](../decisions/2026-10-12-studio-bear.md):
the source file, the comparison of the two routes, the scale, the fit of the conductor motion,
the measures of the skin, the tests, the size, and the images. The measures come from the branch
`app-studio-bear` on 2026-10-12. The script `2026-10-12-studio-bear/measure-skin.ts` gives the
numbers of section 3 again (`node docs/research/2026-10-12-studio-bear/measure-skin.ts` in the
root of the repository).

## 1. The source

`lowpoly-studio/animals/bear/out/bear.glb` (sha256 `5eecaa19…`, 1.43 MB) is the bear conductor of
the studio, on the golden build of its seed 3. It holds:

| Part | Content | In the app |
|---|---|---|
| Mesh | One skinned mesh: the fur (1,688 faces, 860 places), the gloss of the eyes, the nose, and the 16 claws (1,080 faces, 590 places), and the baton (66 faces). One color for each face, with the baked occlusion of the studio. | The fur and the gloss: 2,768 faces. The baton of the studio goes. |
| Skin | 31 joints: the 30 body bones of the biped template, with a twist bone in each forearm, and the bone of the baton. Up to four bones for each vertex. | The 30 body bones, and two eye bones that the export adds. |
| Corrective shapes | `arm_down_L` and `arm_down_R`: the skin of each shoulder in the pose of the sheet, as morph targets. | Both, with the driver of the studio. |
| Clips | 11 conducting clips, about 750 kB. | None: the app keeps its own motion (5.4). |

The bind pose of the studio raises the arms to the middle of the conducting range of the studio
(shoulder flex 40°, abduct 10°, elbow 25°), because linear skinning deforms well only near the
bind pose.

## 2. The two routes

Both routes keep the motion of the app as the driver: `poseAt()` gives the local rotations of the
38 bones of the player on each frame (5.1).

- **Route A, the rigged route of 2026-10-10** (`docs/decisions/2026-10-10-bear-glb.md`): map each
  bone of the studio to a bone of the player, keep the two bones of the player with the largest
  weights for each vertex, and bind the mesh in the bind pose of the player (the arms down). The
  scene draws it as each other player. It has no twist bone and no corrective shape.
- **Route B, the retarget:** keep the skeleton, the skin of four bones, the twist bones, and the
  corrective shapes of the studio, and calculate the bones of the studio from the pose of the
  player on each frame.

```text
 poseAt(): local rotations of the 38 bones of the player
        |
        v
 forward kinematics of the skeleton of the player (arms straight down in its bind pose)
        |
        +--> trunk, head, ears, legs, tail: each studio bone moves as its bone of the player
        |
        +--> each arm: posed shoulder, elbow, wrist of the player
        |        upper arm, forearm: align (bone of the studio, elbow axis of the studio)
        |                            with (bone of the player, normal of the plane of the arm)
        |        paw: hand of the player x turn in the plane of the palm x paw mapping
        |        forearm twist: forearm x half of the twist of the paw
        |        fingers: paw x curl of the player about the axis of the studio
        |
        +--> corrective weight of each arm: the place of the upper arm between the bind pose
        |    of the studio and the pose of its sheet, in the axes of the chest
        v
 StudioPose: 32 studio bones + 38 bones of the player (the instrument), 2 weights
        |
        v
 one SkinnedMesh: the body in the bind pose of the studio, four bones and two morph targets
```

```typescript
/** The module of a studio body (`models/studio-format.ts`). */
interface StudioBody {
  source: string; // the GLB file
  sha256: string;
  /** Meters for each unit of the studio: 1.510574 for the bear. */
  scale: number;
  /** The head of each studio bone in the bind pose of the mesh, in the model axes. */
  heads: Record<StudioBone, Vec3>;
  /** The palm normal of each hand and the claw tip of each finger block. */
  palms: Record<'L' | 'R', Vec3>;
  fingerTips: Record<'L' | 'R', Vec3>;
  /** The upper arm in the axes of the chest in the pose of the sheet: the corrective driver. */
  sheetArms: Record<'L' | 'R', Vec3>;
  headHeight: number; // 0.313243 m
  headCenter: Vec3;
  nose: Vec3;
  /** The welded places, the skin, the faces, the palette, and the corrective moves. */
  mesh: string;
}

/** The bones of a frame (`models/studio-rig.ts`). */
interface StudioPose {
  /** 16 numbers for each bone: the studio bones, then the bones of the player. */
  matrices: Float32Array;
  /** The weight of the corrective shape of the left and of the right arm. */
  correctives: Float32Array;
}
```

### 2.1 The measures of the skin

The script poses both routes with the same poses of the conductor: a full play of each demo every
0.25 s, and the lift, the bow, and the lowering of the arms every 0.05 s of wall time, 6,968
samples in all. A face is **folded** when its posed normal is more than 90° from its normal moved
by the mean of the skin matrices of its corners (the test of the studio). A face is
**collapsed** when its area falls below a quarter of its area in the bind pose of its route. The
faces of the eyes do not count, because a blink scales them on purpose.

| Route | Most folded faces in a sample | Samples with a fold | Most collapsed faces | Samples with a collapse | Smallest area ratio |
|---|---:|---:|---:|---:|---:|
| A: two bones of the player | 38 | 100% | 23 | 99.0% | 0.001 |
| B: the retarget | 9 | 52.4% | 10 | 87.7% | 0.005 |

The folded faces of each route, summed over all samples, by the main bone of the player:

| Route | Upper arms | Forearms | Hands | Shoulders | Trunk |
|---|---:|---:|---:|---:|---:|
| A | 84,955 | 41,690 | 27,125 | 3,944 | 39,476 |
| B | 784 | 3,517 | 35 | 75 | 679 |

Route A folds the skin of the shoulders and the upper arms in nearly each raised pose, because
its bind pose has the arms down and it has no corrective shape for a raised arm. Route B folds
from 1 to 9 faces in half of the samples. Of its folded faces of all samples, 85% are on the
forearms and the upper arms, 13% on the spine and the hips, and 2% on the shoulders and the
hands. Most of them are on the left forearm, at the inner
side of the elbow, in poses where the elbow bends further than in the clips of the studio. On the
right arm, the same kind of faces spanned from the underside of the forearm to the upper arm and
the chest, so the default view from behind does not show them. The other choice of the retarget is the decision of the route: route B.

### 2.2 The wrists

The first retarget gave each paw the rotation of the hand of the player. The hand of the player
holds the baton across the palm, and points the fingers of the left hand along the places of 5.4,
so the paws stood far from the line of the forearm. The clips of the studio bend the wrist by 12°
to 48°. The bend is the angle between the forearm and the paw, every 0.5 s of a play:

| Wrist | Clips of the studio | Hand of the player (Boulanger) | With the turn in the plane of the palm (Boulanger, Beethoven 9, Mozart K. 525) |
|---|---|---|---|
| Left | 12° to 45° | 45° to 115°, median 87° | 0° to 57°, medians 20° to 22° |
| Right | 32° to 48° | 92° to 151°, median 114° | 40° to 67°, medians 48° to 50° |

The retarget now turns each paw around the normal of its palm toward the forearm, by up to 70°.
The turn keeps the palm, the baton across it, and the curl of the fingers. With the hand of the
player, route B had up to 19 folded faces, most at the right wrist. The forearm twist bone takes
half of the twist from the forearm to the paw, as the clips of the studio do. With 65% or 80% of
the twist, the folds did not change.

### 2.3 Faults that the measures found

- **The nose on the eye bones.** The first export took each gloss face of the head with a middle
  more than 0.01 units from the middle plane as a part of an eye. Some faces of the nose went to
  the eye bones, so a blink moved a part of the nose, and a cue swung it with the eyes. The export
  now takes the gloss shells of the head, and an eye is a shell with its middle 0.02 units or more
  from the middle plane.
- **The checks of a hanging paw.** The hanging arm of 5.2 checked the paw at 0.08 H and 0.16 H
  below the wrist, a third and two thirds of the paws of the parametric bodies (0.24 H). The paw
  of the studio bear is 0.57 H long. The checks now follow the paw length of the mesh. This
  change alone kept the hanging arms of the parametric bodies. The larger smallest swing of
  section 4 (16° in place of 8°) then moved the hanging wrist of each standing parametric species
  from 0.335 H to 0.350 H out of the shoulder joint, 5 mm to 8 mm (the badger, the elephant, the
  standing rabbit, and the standing tan fox). Each test of the parametric bodies passes with it.

## 3. The scale

The studio animal is 1.0 unit high. The scale must keep a landmark that the scene depends on:

| Landmark | Scale | Height of the bear | Shoulder joints | Arm reach (97%) | `H` |
|---|---:|---:|---:|---:|---:|
| Parametric bear of 2026-10-11 | | 1.62 m | 1.00 m | 0.671 m | 0.513 m |
| Shoulder joints at 1.0 m (chosen) | 1.511 | 1.51 m | 1.00 m | 0.472 m | 0.313 m |
| Height of the parametric bear | 1.618 | 1.62 m | 1.07 m | 0.505 m | 0.335 m |
| Arm reach of the parametric bear | 2.15 | 2.15 m | 1.42 m | 0.671 m | 0.445 m |

The shoulder joints are the landmark: the desk of the conductor stand has its top edge at the
shoulders (4.5), the places of the hands are measured from the shoulder joints (5.4), and the
beat must stay above the desk. The height of the parametric bear moves the shoulders 7 cm above
the desk. The arm reach of the parametric bear would keep the motion in meters, but the bear
would be 2.15 m high. The studio bear has shorter arms for its height than the parametric bear:
its arms are 0.32 of its height, and the arms of the parametric bear 0.43. Thus no scale keeps
both the shoulders and the reach, and the motion needs a fit (section 4).

## 4. The fit of the conductor motion

The places of the hands are in `H` of the bear of the cast, which is now 0.313 m. The places of
the left hand and the elbows keep their values in `H`, so they scale with the head of the studio
bear. The arm of the studio bear is 1.51 H long, and the arm of the parametric bear was 1.31 H,
so these places stay in reach. The baton keeps its length of 0.51 m, so the places of the baton
needed new values. The table gives each change, in the order of the work:

| Change | Measure before | Measure after |
|---|---|---|
| Point and pivot of the baton for the ready wrists | Ready right wrist 0.09 H below the shoulder, 0.39 H forward | 0.40 H up, 0.89 H forward, as the left wrist |
| Eye shells (2.3) | 12 samples with a paw 1.5 to 2.9 cm in the head | 3 samples, in K. 525 |
| Beat point 0.1 H lower | 3 samples with the right claws 1.6 to 2.5 cm in the muzzle | none |
| Conductor stand 5 cm further forward | Eyes 0 cm from the desk in the bow | at least 2 cm (the test) |
| Hanging paw checks along the paw, at least 16° out | Left paw 2.2 cm in the belly at rest | less than 1.5 cm |
| Hanging arms follow half of the bend of the bow | Left paw 2.8 cm in the belly (whole bend), or 0 cm from the stand (no bend) | less than 1.5 cm, and clear of the stand |
| Right wrist up and out for the view from behind | Right paw hidden behind the body from behind | Right paw beside the head (image 7) |
| Beat plane turns with the whole turn to the right | Right claws 2.95 cm in the muzzle (K. 525, 135.1 s) | 1.98 cm |
| Right wrist 0.15 H further out | 1.98 cm | less than 1.5 cm |
| Left ready hand 34° up and 44° out | Left paw 0.23 H lower than the right paw | both paws 0.63 H up, the right paw 0.31 H further out |

The final hold, from the probe (`pnpm pose-probe bear`), in `H` from each shoulder joint (out,
up, forward):

| Moment | Right wrist | Left wrist |
|---|---|---|
| Ready gesture (sheet time) | 0.96, 0.63, 0.62 | 0.65, 0.63, 0.67 |
| Soft beat 1 (time 0 of the sheet scene) | 0.85, 0.35, 0.90 | 0.65, 0.63, 0.67 (ready) |

The baton points up 49° and 22° inward at beat 1, and the pivot is 1.03 m from the tip: 0.47 m
behind the wrist, as for the parametric bear. The beat plane keeps `beatRight.x` at 0.93 (the
test needs more than 0.9). The chin of the studio bear is 0.52 H above the shoulder joints, so
the wrist of beat 1 is a little below the chin.

Steps that did not work:

- A head that pitches down 10° in place of 25° in the cues changed no depth of a paw in the
  muzzle.
- A smaller turn of the head (at most 30° in place of 50°) changed no sample of K. 525.
- Twist shares of 65% and 80% gave the same folds as 50%.

## 5. Tests

Before the branch, `pnpm test` ran 1,985 tests in 192 files. After it, `pnpm test` runs 2,036
tests in 200 files: 2,016 pass, and 20 skip. The skipped tests are the checks of the parametric
biped that a studio body does not have (`it.runIf`). `pnpm test:perf` passes. Each test of the conductor passes: the
beat plane, the ready gesture, the rest arms, the bow, the cues, the stand, the left hand, and
the sheet pose of the bear.

New behavior tests:

- `models/studio-rig.test.ts`: the trunk moves with the bones of the player, the elbow and the
  wrist of the studio are on the joints of the player with the elbow axis square to the plane of
  the arm, the twist bone has half of the twist of the paw, a paw turns in the plane of its palm
  by at most the limit, the corrective weight is 0 in the bind pose of the studio and 1 in the
  pose of its sheet, and the eyes scale for a blink.
- `models/studio-body.test.ts`: the faces and the colors of the studio, the paws below the
  shoulders in the bind pose of the player, and the render mesh.
- `scene/player.test.ts`: the GPU skin of the studio body matches `posedCorner()` within
  1e-5 m, with the morph targets, and the baton hides.
- `pose/test-conductor-clearance.ts`: no point of a paw, a claw, or the baton more than 1.5 cm
  under the skin of the trunk and the head, in each sample of a play of each demo and of the
  lift, the bow, and the lowering. With the hanging arms of 8°, it failed at 2.2 cm.
- `tools/studio-body.test.ts` and `tools/conductor-views.test.ts`.

Checks that the studio bear failed, because they were tuned on the parametric bodies:

- `models/legs.test.ts`: the short standing legs (1.28 H for the studio bear, limit 0.6 H): the
  bear is out of the check, because the studio fitted its legs to its sheet.
- `models/player.test.ts`: the chair back: a studio body stands on each support, and the cast
  gives the bear only the stand.
- `models/species.test.ts`: the one bone for each triangle, the colors of 4.5, and the budget of
  2,600: a studio body has the skin of the studio, the colors of its file, and a budget of 3,000.
  The bear row of the shape table of 4.3 went.
- `models/budget.test.ts`: the budget of 3,000 for a studio body.
- `scene/geometry.test.ts`: the test of the baked occlusion uses the rabbit, because the studio
  bear has the occlusion of the studio.
- `scene/player.test.ts`: the turn of the head of the conductor comes from the matrix of the
  studio bone.

The test of the conductor clearance took about 25 s for each of its 3 shard files with the skin
of the studio. The depth now measures only the triangles near the paws, and the sweep has 6 shard
files with one demo each, about 7 s each.

## 6. Size

`pnpm build && pnpm size` gives the first download after gzip:

| State | Size |
|---|---:|
| `main` (1782014b) | 302,805 B |
| Before the scene path of the studio body | 302,866 B |
| After the scene path (the packed bear, its rig, its skin) | 326,216 B |
| End of the branch | 327,356 B |

The packed studio bear is 18 kB after gzip (40 kB of TypeScript). The limit is 1,000,000 B.

## 7. Images

- [`studio-and-app.webp`](2026-10-12-studio-bear/studio-and-app.webp): the render of the studio
  (front and side, the pose of the sheet, the light of the studio) beside the app (front and
  side, the rest pose, the light of the gallery stage), each scaled to the same height. The mesh,
  the facets, the face colors, the eyes, the ears, the claws, and the tail are the same. The
  colors look warmer and darker in the app, because the light of the stage is warm and the grade
  of the stage darkens the shadows. The poses of the arms differ: the app has no pose of the
  sheet of the studio.
- [`flat-before-after.webp`](2026-10-12-studio-bear/flat-before-after.webp): close views of the
  chest and the raised arms at beat 1 before and after the flat shading of the review of the
  branch. With the shared material, the GPU skin turned the three normals of a flat face by
  different blends of four bones, and 30 to 50 faces of the arms and the chest showed soft
  gradients. A copy of the material with flat shading keeps each face flat, as in the studio.
  The nose and the eyes are flat too, as the normals of the GLB file are.
- [`conductor-views.webp`](2026-10-12-studio-bear/conductor-views.webp): `pnpm conductor-views`
  at the four beats of a bar, between two beats, and in the rest pose, from the front, the right
  side, and the back. From behind, both paws show beside the head at each beat.
- The snapshot of the branch in `docs/snapshots/` shows the default view during play and the
  close view of each gallery model.

## 8. Open problems

- Up to 9 faces fold in half of the samples, mostly at the inner elbows (2.1). A weight repair of the
  studio for the poses of the app could remove them: the studio repairs folds only in its own
  clips.
- The right paw of the ready gesture is 0.31 H further out than the left paw, because a right paw
  further in met the long muzzle in the cues to the right.
- The colors of the studio are lighter in its own light. The app shows them under the stage
  light with no change.
- The studio bear does not sit. A seated role needs a seated bind pose of the studio and a seat
  fit.
- The clips of the studio stay unused. The app could read its conducting clips only with a
  change of the motion of 5.4.
