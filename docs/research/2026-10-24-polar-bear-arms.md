# The arms of the polar bear pianist

Date 2026-10-24. Round `polar-bear-arms`. Decisions:
[`2026-10-24-polar-bear-arms.md`](../decisions/2026-10-24-polar-bear-arms.md). The images and the
twist probe are in [`2026-10-24-polar-bear-arms/`](2026-10-24-polar-bear-arms/). Each command runs
from the root of the tree.

## 1. The question

The user saw the rebuilt arms of the Rigify rabbit (`docs/research/2026-10-24-rigify-rabbit.md`,
sections 8 and 9, branch `rigify-rabbit`) and said: "now apply similar techniques to the polars
bear". The rabbit plays one baked clip. The polar bear is the pianist of the app, and the pose code
turns its bones on each frame for each song. So the techniques must keep the app route. The user
asked for images, with no programmatic model checks.

## 2. The route

```text
 polar-bear-tpose.glb --> Merge by Distance --> Bisect at the shoulder line and the wrist
   --> Delete Faces --> quad tube (15 rings x 16) --> Shrinkwrap --> Bridge Edge Loops
   --> UV, bake of the fur color (1024 px) --> Data Transfer of the normals
   --> strip of the arm image on top of the atlas --> polar-bear-arms.glb
   --> studio skeleton + 4 segments per arm part + elbow and wrist helpers
   --> automatic weights, Limit Total 4, Normalize All, 3 Weight Paint fixes
   --> polar-bear-weights.json                     (live Blender, MCP, polar_bear_arms.py)
   --> pnpm rig-mesh polar-bear (painted weights, rule weights on paintedLower, seated bind)
   --> pnpm studio-body polar-bear --> poseStudioBones() turns the segments on each frame
```

A headless replay of `tools/blender/polar_bear_arms.py` gave the source mesh and the weights file
of the session byte for byte. `rig-mesh` reads the painted weights with the port of `84486b66`
from the branch `rigify-polar-bear`. That branch rigged an older mesh, so its mesh and its weights
stay out.

| Item | `main` | This round |
|---|---|---|
| Arm faces | the long thin triangles of the user | 15 quad rings of 16: 5 on the upper arm, 3 at the elbow, 8 on the forearm, 2 at the wrist next to the cut loop of the paw |
| Triangles of the body | 3,154 | 4,152 |
| Arm bones that hold skin | upper arm, its twist bone (share 0.55), forearm, forearm twist, paw | 4 upper arm segments, elbow helper, 4 forearm segments, wrist helper, paw |
| Weights | rules of `rig-mesh` | Blender on the arms, the clavicles, the neck, and the head. Rules on the hips, the trunk up to the chest, the legs, and the tail |
| First download (gzip) | 733,796 B | 742,022 B (+8,226 B) |

The rings of a joint stand 0.015 units (2.9 cm) apart, twice the gap of the rabbit, because the
bear arm is about twice as thick. The shoulder line is at x 0.154, where the T-pose arm is free of
the trunk. The arm keeps the length of the user (`armFactor` 1).

## 3. The bones

Each new bone is an optional studio bone. The app turns it from the joints that the pose code
already sets (`poseSegments()` of `src/models/studio-rig.ts`), and `driven_turns()` of
`tools/blender/rig_mesh.py` turns it the same way in the seated bind and in the clip `reference`.

```typescript
/** The arm segments and the helpers of one arm, as indices in `STUDIO_BONES`. */
interface StudioArmSegments {
  /** 4 segments. Segment k takes (k + 0.5) / 4 of the roll of the upper arm from the chest. */
  readonly upper: readonly number[];
  /** 4 segments. Segment k takes (k + 0.5) / 4 of the twist from the forearm to the paw. */
  readonly fore: readonly number[];
  /** Halfway from the upper arm to the forearm, around the elbow. */
  readonly elbow: number;
  /** Halfway from the forearm with all of the twist to the paw, around the wrist. */
  readonly wrist: number;
}
```

```text
 chest --> clavicle --> upper_arm (drives) --+-- upper_arm_seg0..3 (roll 1/8 .. 7/8)
                                             +-- elbow helper (half of upper -> fore)
                        forearm (drives) ----+-- forearm_seg0..3 (twist 1/8 .. 7/8)
                        forearm_twist -------+-- wrist helper (half of fore+twist -> paw)
                        hand (skin) --> fingers (skin)
```

## 4. The twist

The probe turns the pianist through the rest, the lift, and the play samples of all demos at a
step of 0.25 s, and gives the twist between two neighbor arm bones around the bind axis of the arm
part (`twist-steps.ts`, outputs `twist-main.txt` and `twist-after.txt`). It is a diagnosis only.

```bash
node docs/research/2026-10-24-polar-bear-arms/twist-steps.ts 0.25
```

| Item | `main` | This round |
|---|---|---|
| Largest step between two arm bones | 41.7° (clavicle to upper arm twist bone) | 18.9° (upper arm segments) |
| Mean step on the upper arm | 34.1° and 27.9° | 7.6° at the shoulder, then 15.3° |
| Mean step on the forearm | 7.2° to 9.1° | 1.9° to 4.8° |
| Mean total twist of an arm, left and right | 76.5°, 80.3° | 72.0°, 76.1° |

The holds set the total twist, so it stays. The skin now takes it in 11 small steps in place of 5
steps, of which 2 are large.

## 5. The weights

| Variant | Lower back over the bench | Trunk side under the arm |
|---|---|---|
| Blender weights on the trunk, rules on the hips, the legs, and the tail | a V of folded faces | a slit in the play |
| Rules also on spine and spine1 | clean | a slit in the play |
| Rules also on the chest (chosen) | clean | as on `main` |

The Weight Paint fixes, in order: Remove From Group of the arm bones inside |x| 0.14 from y 0.45
to 0.8, Smooth on the band of the arm root, and Smooth on the vertices with at least 0.6 on the
arm bones.

## 6. The images

`views.png` (zoom 1), `crops.png` (zoom 2), `high.png` (az 150 and az -150 at elevation 40),
`keys.png`, and `normals.png` show `main` above this round at a chord, between two chords, and at
rest. `chord-full.png` shows a chord from the keys and from the back. `topology.png` shows the new
arm faces in Blender.

The slivers along the upper arms of `main` and its shard at the back of the left shoulder go. No
view shows a spiral crease, a sharp elbow, a collapsed inner elbow, a seam, or a flap on the arms.
The paws reach the keys, the bear sits on its bench, and the face and the colors stay.

## 7. The open faults

- The faces of the arm root between the trunk and the shoulder line are the long faces of the
  user. At rest from the back, the left shoulder top shows a flat facet (`crops.png`, rest, back).
- In the bind, 5 faces of spine1 turn over (2 on `main`, log line `crease`). No view shows them.
- The trunk side keeps the facets of the user mesh below the arms (`crops.png`, chord, left).
