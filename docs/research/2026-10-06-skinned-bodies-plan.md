# Plan: skinned, sculpted bodies (option B) and the rest of option A

Date: 2026-10-06. Code: commit `441d398` (`main`).

On 2026-10-06, the user looked at close shots of the animals and wrote: "the animals' polys are
all looking bad. How to improve them?" The user approved two options:

- **Option A (shading).** Part 1 is on `main`: crease normals, a baked occlusion, and a fur sheen
  (`src/models/shading.ts`, decision file `2026-10-06-fur-shading.md`). Part 2 is open: fewer
  and larger facets where the forms need them, smooth balls in place of the 12-vertex
  icosahedra, and a separate `fur` finish.
- **Option B (sculpted bodies).** One welded mesh for each body, with smooth skin weights at
  the joints (at most 2 bones for each vertex), and species forms: a neck, a shoulder line, a
  belly, a brow, cheeks, and a muzzle that grows out of the head. The approval of option B
  authorizes a change of the rule "a vertex follows exactly one bone" (design 4.4, 4.7).

This report is a plan. It gives the current structure with numbers, the target structure, the
effects and the risks, a sequence of stages that each merge alone, and the decisions for the
user. It changes no code.

The probe scripts of this report ran in Node 24 on the development Mac with the code of
`441d398`. They are outside the repository. Section 7 tells how to run them again.

## 1. Current structure

### 1.1 Parts and bones

`buildBiped()` (`src/models/biped.ts`) adds about 30 closed parts to one `MeshBuilder`. Each
part follows one bone. The parts overlap at the joints. Nothing joins two parts.

```text
                       earL/earR (plates)        eyeL/eyeR (ovals + lights)
                              \                  /
                     +---------------------------------+
   head bone ------> | head: loft 11 rings x 16 (288)  | <-- snout parts on `head`
                     +---------------------------------+     (cones, balls, discs)
                              | overlap
   neck bone ------> [ neck: tube 10 sides (80) ]  (hidden inside torso and head)
                              | overlap
   chest bone -----> +-----------------------+ <-- seam ring at 0.75 H (two lofts)
   spine bone -----> | torso: 2 lofts x 16   |
                     +-----------------------+
     shoulderL/R (no part)   |  hips (no part)     tail1/tail2 (tubes, box, ball)
          |                  |
   upperArm: dome + tube (120)        thigh: tube (80), sinks into the torso
   forearm:  tube (80)                knee: icosahedron (20) on shin
   hand:     icosahedron (20)         shin: tube (80), or 2 tubes with a sock (160)
   fingers:  icosahedron (20)         foot: loft 8 corners (64)
```

The skeleton has 38 bones (`BONE_NAMES` in `src/models/rig.ts`). A body uses 21 to 27 of
them. The instrument pieces use up to 6 more.

### 1.2 Triangles of each species

The probe built each species with the first instrument of its section. The counts are triangles.
"Hands" holds the hand and the fingers. "Shin" holds the knee ball and the sock.

| Species | Torso | Neck | Head + snout | Eyes | Ears | Tail | Upper arms | Forearms | Hands | Thighs | Shins | Feet | Body |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| rabbit | 416 | 80 | 432 | 144 | 112 | 20 | 240 | 160 | 80 | 160 | 200 | 128 | 2,172 |
| fox-red | 416 | 80 | 416 | 144 | 48 | 140 | 240 | 160 | 80 | 160 | 360 | 128 | 2,372 |
| bear | 416 | 80 | 432 | 144 | 80 | 20 | 240 | 160 | 80 | 160 | 200 | 128 | 2,140 |
| badger | 416 | 80 | 668 | 144 | 80 | 20 | 240 | 160 | 80 | 160 | 200 | 128 | 2,376 |
| elephant | 416 | 80 | 368 | 144 | 144 | 80 | 240 | 160 | 80 | 160 | 200 | 128 | 2,480 |

- The elephant also has 280 triangles of trunk. The badger head holds 252 triangles of face
  pattern.
- The bodies have 2,096 (pig) to 2,480 (elephant) triangles. The budget is 2,600 (design 4.5,
  `src/models/budget.test.ts`).
- The scene of `perf-60.mid` has 165,222 triangles (design 4.5). The budget is 200,000.
- A player model has 6,528 to 10,536 corners (three for each triangle). The weld of
  `shadeMesh()` joins them into 1,135 to 1,844 vertices.
- `buildPlayer()` took 1.9 to 10.5 ms for each model in this run, and `shadeMesh()` 2.0 to
  5.5 ms. The first calls are slower, before the JIT compiles the code.

### 1.3 The faults that the user saw

The user screenshots of 19:38 show the flat shading before option A part 1. The baseline
screenshots of `441d398` (species sheet, animal views, conductor and section shots) show the
crease normals of part 1. These faults remain:

| Place | Cause in the code |
|---|---|
| Shoulder | The dome of the upper arm and the torso are two closed parts that cross. A raised arm shows the line where they cross. |
| Elbow | The forearm overlaps the flat end of the upper arm (decision `2026-10-06-arm-and-hand-contact.md`). A bent elbow shows a notch. |
| Knee, shin top | The knee is an icosahedron of 20 faces on the shin, between two tubes with flat caps. |
| Sock edge | The sock is a second tube with its own cap. |
| Waist | The torso is two lofts that meet at the `chest` bone. A turn of `chest` opens a step in the outline. |
| Neck, head | A round ball sits on a tube in a pear. No line of the head continues into the body. |
| Muzzle | Each snout is a cone or a ball that sticks into the face. |
| Hands, puff tails | Icosahedra of 20 faces stay faceted under the crease angle of 60°. |

### 1.4 What depends on the rigid parts

| Reader | File | What it reads |
|---|---|---|
| Footprint | `models/footprint.ts` | One box for the triangles of each bone in each band of 0.2 m, in the bind pose. It reads the bone of the first corner of each triangle. |
| Chair clearance | `models/player.ts` (`chairForward()`), `models/bounds.ts` | The back of the torso, by bone, in the bind pose. |
| Occlusion bake | `models/shading.ts` | Discs keyed by the bone of each triangle. The bone table `relatedBones()` says which bones shade each other. |
| GPU skin | `scene/player.ts` (`createPlayerGeometry()`) | `skinIndex.x` = the bone, `skinWeight.x` = 1. |
| IK and holds | `pose/*.ts`, `models/instruments/hold.ts` | The bind positions of the bones and the points of `BodyBones` (palms, finger blocks, mouth, head center). They read no mesh. |
| Shot planner | `shots/clearance.ts`, `shots/subjects.ts` | The footprints, `body.headCenter`, and `body.headHeight`. |
| Test kinematics | `pose/test-kinematics.ts`, `pose/test-clearance.ts` | A posed triangle follows the bone of its first corner. |
| Silhouettes | `models/test-silhouettes.ts`, `scene/hidden-heads.test.ts` | The bind mesh, with the bone of each triangle. |
| Budgets | `models/budget.test.ts` | The bone of each triangle: body or instrument. |

The IK and the holds read no mesh data. If no bone moves and no point of `BodyBones` moves, the
pose code needs no change.

### 1.5 Joint turns in the poses

The second probe posed the gallery cast with the test notes of the gallery (the rest pose, then
every 0.1 s from 0 to 4.5 s). It split the turn of each bone against its parent into a swing of
the bone axis and a twist around it. The largest values:

| Joint | Swing | Twist | Animal |
|---|---|---|---|
| hips to spine | 9.7° | 15.0° | dog (cello lean), bear |
| spine to chest | 1.0° | 15.0° | bear |
| chest to neck | 8.5° | 20.0° | penguin, bear |
| neck to head | 12.7° | 30.0° | penguin, bear |
| chest to shoulderR (clavicle) | 45.0° | 0° | panda (trombone) |
| shoulder to upper arm | 118° (left), 97° (right) | 0° | hippo (contrabass), bear (baton) |
| upper arm to forearm (elbow) | 146° (right), 130° (left) | 0° | bear (baton), penguin |
| forearm to hand (wrist) | 135° | 179° | dog, hippo, cat |
| hand to fingers | 60° | 0° | bear, badger |
| hips to tail1, tail1 to tail2 | 8° | 12° | deer |

The look at the conductor can turn the neck and the head by 1.2 rad together (design 5.1), so
the neck and the head can twist by 28° and 41°. No layer turns the hips, the thighs, the shins,
the feet, or the trunk (design 5.1, 4.7).

These numbers set the joint rules of section 2.3:

- **Wrist.** A twist of 179° collapses any blend of two bones to a point. The hand stays rigid.
- **Elbow.** A linear blend of two bones keeps `cos(θ / 2)` of the thickness on the ring with
  the weights 0.5 and 0.5. At 146°, that is 0.29 of the thickness. The elbow needs a filler.
- **Shoulder.** The swing of 118° and the clavicle turn of 45° act on a short span. This joint
  has the largest risk.
- **Waist, neck.** Turns of 30° or less keep 0.97 of the thickness. A plain blend is enough.

### 1.6 The GPU cost of skin weights

The vertex shader of three.js r186 always blends four bone matrices
(`ShaderChunk/skinning_vertex.glsl.js` and `skinnormal_vertex.glsl.js`): it reads 16 texels of
the bone texture for each vertex and adds four products, also when three weights are 0. The
players already send a `skinIndex` and a `skinWeight` of 4 values. Thus a second weight adds no
shader work, no attribute, and no memory. The shadow pass uses the same chunks. The CPU work of
a frame (the bone matrices) depends on the bones only.

## 2. Target structure

### 2.1 Method

The plan keeps the parametric biped of design 4.3 and its bone positions. It replaces the
crossed parts of the trunk and the arms with a few welded surfaces:

```text
   rigid: ears, eyes, teeth,          +--------------------------------+
   horn, beak, antlers, face   ---->  |  TRUNK GRID (one ring grid)    |
   patches (sink into the grid)       |  crown                         |
                                      |  head rings (brow, cheeks)     |
          muzzle loft <== port =====  |  jaw                           |
          (head, rigid)               |  neck ring                     |
                                      |  shoulder line                 |
  arm chain <== port ===============  |  chest                         |  === port ==> arm chain
  (skinned:                           |  waist                         |      (mirror)
   cap, upper arm,                    |  belly                         |
   elbow, forearm)                    |  pelvis                        |
         |                            +--------------------------------+
    mitten (rigid)                        ^ port            ^ sink
                                          |                 |
                                    tail sweep        leg sweeps (static):
                                                      thigh-knee-shin-ankle,
                                                      foot loft (rigid)
```

- **Trunk grid.** One loft from the bottom of the pelvis to the crown: the torso rings, a neck
  ring, and the head rings of `head.ts` without its bottom point. All rings have 16 corners, as
  now. The ball head and the hidden neck tube go away.
- **Ports.** A port removes the faces around a few grid vertices. Its boundary is a loop of
  exactly as many vertices as the branch has sides (8). The branch starts with that loop, so
  the weld is exact: the branch and the grid share vertices, and the mesh stays closed. No
  geometric cut and no loop stitching are necessary. The ports are the shoulders, the muzzle,
  the root of a long tail, and the root of the trunk of the elephant.
- **Arm chain.** One swept tube of 8 sides along a bent path: out of the shoulder port, around
  the shoulder joint, down the upper arm, through the elbow, down the forearm to a cuff at the
  wrist. It replaces the dome, the upper arm, and the forearm.
- **Leg sweeps.** One swept tube of 10 sides from the hip through a bent knee to the ankle, with
  the sock as a color band of rings. It sinks into the pelvis, as the thigh does now. No pose
  turns a leg, so the legs need no port and no blend. The knee ball, the shin cap, and the sock
  cap go away.
- **Rigid parts.** The parts that a pose moves on their own bone stay separate and rigid: the
  eyes (blinks scale them), the ears, the beak halves (the jaw opens), the teeth, the horn, the
  antlers, the face patterns, the hands (the wrist twist), and the feet.

**Alternatives that the plan rejects:**

| Method | Why not |
|---|---|
| Rigid parts kept, with 2-bone weights only at the joints | It removes the elbow notch and the waist step. The shoulder and the muzzle keep the line where two closed parts cross. Section 5, decision D2, keeps it as the fallback of the shoulder. |
| A signed-distance body, a surface net, and a decimation | It gives the smoothest unions. A grid of 64³ samples and a quadric decimation take about 50 to 150 ms for each model (the current build takes 2 to 10 ms), the decimation is about 400 lines of new code in the first download, and the facets come out irregular, with no mirror symmetry and no clean color bands. |
| Dual quaternion skinning | It keeps the volume at the elbow and the wrist. It needs a patch of the skinning chunks of three.js, a second bone texture of dual quaternions for each frame, and the same patch in the depth material of the shadow pass. The filler balls of 2.3 cost less. |
| A bind pose with the arms out (an A pose) | The weld of the shoulder is easier in an A pose. Design 4.7 fixes the bind pose with hanging arms, and the holds, the bows, and the mallets use it. The change touches all pose code. |

### 2.2 New data types

`MeshData` keeps its corner lists, so that the footprint, the bounds, the silhouettes, the
budgets, the weld, and the occlusion keep their readers. `bones` becomes the **main bone** of
each corner: the bone with the larger weight. Two new arrays hold the second bone.

```typescript
/** The geometry data of one mesh (design 4.4, 4.5). */
export interface MeshData {
  /** x, y, z of each corner, in meters. Three corners for each triangle. */
  readonly positions: Float32Array;
  /** Linear r, g, b of each corner. */
  readonly colors: Float32Array;
  /** The main bone of each corner: the bone with the larger weight. 0 for a static mesh. */
  readonly bones: Uint8Array;
  /** The second bone of each corner. It is equal to `bones` for a rigid corner. */
  readonly blendBones: Uint8Array;
  /** The weight of the second bone, from 0 to 0.5. The main bone has 1 minus this weight. */
  readonly blendWeights: Float32Array;
  /** The finish of each triangle, as an index in `FINISH_ORDER`. */
  readonly finishes: Uint8Array;
}

/** The bones of one corner of a skinned part (design 4.7). */
export interface CornerSkin {
  readonly bone: number;
  /** The second bone, or `bone` for a rigid corner. */
  readonly blendBone: number;
  /** The weight of `blendBone`, from 0 to 0.5. */
  readonly blendWeight: number;
}

/** Gives the skin of a corner from its bind position, in the model axes. */
export type SkinRule = (point: Vec3) => CornerSkin;
```

`PartOptions` gets an optional `skin: SkinRule`. A part with no rule follows its `bone` with the
weight 1. `createPlayerGeometry()` writes `(bone, blendBone, 0, 0)` and
`(1 - blendWeight, blendWeight, 0, 0)`.

The ring grid and the ports:

```typescript
/** A closed loft as a grid of vertices: rings from the bottom up, corners around. */
export interface RingGrid {
  /** x, y, z of the vertex of ring `r` and corner `c` at `(r × corners + c) × 3`, in H. */
  readonly vertices: Float32Array;
  readonly rings: number;
  /** The corner count of each ring. Even, so that the left half mirrors the right half. */
  readonly corners: number;
  /** The turn of each ring: 0 or 0.5 of a segment (design 4.5, facets). */
  readonly turns: readonly number[];
}

/** An opening in a ring grid where a branch starts (a shoulder, a muzzle, a tail root). */
export interface Port {
  /** The vertices of the boundary loop, counterclockwise from outside. */
  readonly loop: readonly Vec3[];
  /** The middle of the loop. */
  readonly center: Vec3;
  /** The mean unit normal of the faces that the port removed. */
  readonly normal: Vec3;
}

/** One ring of a swept tube: a place on its path, the direction of the path, and a size. */
export interface SweepRing {
  readonly at: Vec3;
  readonly axis: Vec3;
  readonly radius: number;
  /** The scale of the ring across the path, up and down. 1 gives a circle. */
  readonly flat: number;
  /** The turn of the ring, 0 or 0.5 of a segment. */
  readonly turn: number;
}
```

`openPort(grid, ring, corner, sides)` removes the faces around the vertices near
`(ring, corner)` and gives the loop. `sweep(rings, sides, start?)` builds a tube through the
rings. With a `start` port, the first ring of the tube is the loop of the port.

```text
  trunk grid near the shoulder          after openPort()         after sweep(start = port)
  (rings r-1..r+1, corners c-1..c+2)

   o---o---o---o                         o---o---o---o              o---o---o---o
   | / | / | / |                         | /       \ |              | / \ arm / |
   o---o---o---o        ---->            o    hole   o   ---->      o  ( 8-ring ) o
   | / | / | / |                         | \       / |              | \ / tube\ |
   o---o---o---o                         o---o---o---o              o---o---o---o
                                         loop = 8 vertices          tube shares the loop
```

### 2.3 The skin weight rule

Each corner of a welded surface follows at most 2 bones: a parent and its child. A band around
each joint blends them. The weight of the child is `smoothstep(-b, b, d)`, where `d` is the
distance of the corner past the joint along the chain, and `b` is the half width of the band.
The main bone is the bone with the larger weight. The rule reads the ring of the corner on its
chain. It reads no distance to a bone, because the hanging arms of the bind pose pass inside the
torso, and a distance rule would give arm weights to the torso.

| Joint | Parent to child | Band center | Half width `b` | Note |
|---|---|---|---|---|
| Waist | hips to spine | 0.4 H above the seat | 0.15 H | The pelvis below follows `hips`, which no pose turns. Now the lower torso turns with `spine` around 0.45 H, and its base swings against the thighs. |
| Chest | spine to chest | 0.75 H | 0.15 H | Replaces the seam of the two lofts. |
| Neck | chest to neck | 1.1 H | 0.1 H | |
| Head | neck to head | 1.32 H | 0.08 H | The jaw rings follow `head`. |
| Shoulder line | chest to shoulderL/R | the port loop and the torso around it | falls off over 0.15 H from the port | The clavicle turn of 45° moves the shoulder forward with the arm. |
| Shoulder | shoulderL/R to upperArmL/R | the shoulder joint | 0.08 H | The cap rings of the arm. |
| Elbow | upperArm to forearm | the elbow | 0.06 H | A narrow band keeps the collapse to one ring. |
| Wrist, fingers | none | | | The hand and the fingers stay rigid on `hand` and `fingers`. The cuff of the forearm overlaps the mitten. |
| Tail root | hips to tail1 | the port | 0.05 H | |
| Tail joint | tail1 to tail2 | the joint | 0.08 H | |
| Legs, trunk | none | | | No pose turns them. Each ring follows the bone of its segment. |

```text
  weight of the child bone along a chain

  1.0 |                    ___________
      |                  /
  0.5 |- - - - - - - - -*- - - - - - -   <- main bone changes here
      |               /
  0.0 |_____________/
      +-------------+---+---+-------->  distance along the chain
                   -b   0   +b
                       joint
```

**Fillers.** Two rigid balls stay inside the skin, where a blend loses volume. In the bind pose
they are hidden:

- The shoulder ball: the dome of today, radius 0.17 H × girth on `upperArm`, around the shoulder
  joint. In a raised arm, it keeps the shoulder round. The arm-joint test of today still holds
  for it.
- The elbow ball: radius 0.14 H × girth on `forearm`, around the elbow. At 146°, the blended
  ring keeps 0.29 of the thickness, and the ball fills the outer side of the bend.

Each filler is a `ball()` of 8 segments and 4 rings (48 triangles), with the crease normals.

### 2.4 Heads and muzzles

- The head rings of `head.ts` become the top of the trunk grid. The head keeps 1.0 H of height,
  1.26 H of width, and its top 2.3 H above the seat. Thus the holds, the hidden-heads test, and
  the shot subjects keep their numbers.
- The bottom point of the head goes away. A neck ring joins the torso top to the jaw ring. The
  head turns at the `head` bone (1.3 H above the seat), and the blend of 2.3 keeps the jaw on
  `head`.
- `headSurface()` reads the head rings of the species (2.5) in place of the fixed
  `HEAD_CORNERS`. Thus the eyes, the face patterns, and the color splits of the face follow the
  brow and the cheeks.
- A muzzle grows from a port on the front of the head, below the eyes. The port loop is the
  first ring of the muzzle loft. The muzzle keeps its profile of design 4.5 and its tip. The
  mouth point (`MOUTHS` in `snouts.ts`) does not move, so the wind instruments keep their
  holds.

| Snout | Today | Target |
|---|---|---|
| long, blunt, pointed, roman | a lathe cone on `head` | a loft from the port, with the same profile and tip, and the fur top split |
| broad, flat-nose, buck-teeth (muzzle), horn (muzzle) | a ball, a disc, or an icosahedron on `head` | a short loft from the port. The nostrils, the teeth, and the horn stay rigid. |
| short | two cheek balls under the nose | two bulges of the cheek rings of the head. The nose ball stays rigid. |
| trunk | 3 tubes and 2 icosahedra | one sweep of 3 segments from a port, on `trunk1` to `trunk3` with no blend. The tusks stay rigid. |
| beak | two cones on `head` and `jaw` | no change: the jaw opens the lower half (design 4.7) |

### 2.5 Species forms

The forms are new optional parameters of design 4.3. The defaults give the body of today, so a
species with no values does not change. Each value has a limit that keeps the envelope of 2.6.

```typescript
/** The forms of the welded body of a species (design 4.3, 4.5). All values are in H. */
export interface BodyForm {
  /** The half width of the neck ring between the torso top and the jaw. Default 0.3. */
  readonly neck?: number;
  /** The half width of the torso at the shoulder joints, before the girth. Default 0.45. */
  readonly shoulders?: number;
  /** The forward bulge of the belly, as a factor of the half width. Default 1.08. */
  readonly belly?: number;
  /** The forward move of the ring above the eyes. Default 0, at most 0.08. */
  readonly brow?: number;
  /** The extra half width of the cheek ring, inside the head width of 1.26. Default 0. */
  readonly cheeks?: number;
}
```

Start values from `animals.webp`, `mockup.png`, and `scene.png`. The agent of the trunk tunes
them with the species sheet, and records the final values in design 4.3.

| Species | neck | shoulders | belly | brow | cheeks | Look in the references |
|---|---|---|---|---|---|---|
| rabbit | 0.26 | 0.42 | 1.06 | 0.02 | 0.03 | a slim neck, round cheeks |
| fox-red, fox-tan, wolf | 0.24 | 0.42 | 1.0 | 0.04 | 0.05 | a slim chest, a white ruff on the cheeks |
| cat | 0.26 | 0.42 | 1.04 | 0.03 | 0.04 | |
| dog | 0.28 | 0.45 | 1.06 | 0.04 | 0.02 | |
| deer, meerkat | 0.22 | 0.4 | 1.0 | 0.02 | 0 | a long thin neck |
| mouse | 0.26 | 0.4 | 1.06 | 0 | 0.04 | |
| monkey | 0.26 | 0.44 | 1.06 | 0.06 | 0.02 | a strong brow |
| bear, polar bear, panda | 0.34 | 0.5 | 1.14 | 0.05 | 0.02 | no visible neck, a broad shoulder line, a round belly (`scene.png` 05) |
| hippo, rhino, elephant, pig, beaver, badger | 0.34 | 0.48 | 1.12 | 0.03 | 0.04 | heavy, no visible neck |
| penguin | 0.4 | 0.44 | 1.12 | 0 | 0 | the head merges into the body |

### 2.6 The envelope rule

Each stage keeps these values of the bind pose, so that the layout, the holds, and the shots
change as little as possible:

- The bind position of each bone, and each point of `BodyBones`: equal to `main`. The pose code
  then needs no change.
- The head: 1.0 × 1.26 H, top 2.3 H above the seat, center 1.8 H above the torso base.
- The torso: at most 1.28 H × girth wide, the depth of the back 0.72 of the half width (the
  chair clearance of `chairForward()`).
- The muzzle tip and the mouth: within 0.01 H of `main`.
- The foot, the sole, and the toes: equal to `main` (the music stands of design 4.5).

A changed footprint is still possible: the box of a bone changes when a triangle changes its main
bone. The stage sides of design 4.5 then change in the second decimal. Section 3.2 gives the
steps.

### 2.7 Triangle budget

The budget of a body stays 2,600 triangles, and the scene of `perf-60.mid` stays at most
165,222 + 2% = 168,500 (design 9.7 leaves a small GPU margin: 3.77 ms of 4 ms in Cinematic mode
on 2026-10-06). Estimate of the target body:

| Part | Target | Today |
|---|---|---|
| Trunk grid: about 21 rings × 16 corners, with the ports and their loops | 680 | 784 (torso, neck, head) |
| Muzzle loft | 40 to 120 | 72 to 144 (with the nose) |
| Eyes | 144 | 144 |
| Ears | 0 to 144 | 0 to 144 |
| Arms: 2 × (sweep of 8 sides, about 12 rings, 176) + 2 fillers (96) | 2 × 272 = 544 | 400 (upper arms and forearms) |
| Hands: 2 × mitten loft of 8 corners (rigid) | 2 × 56 = 112 | 80 |
| Legs: 2 × sweep of 10 sides, about 10 rings | 2 × 190 = 380 | 360 to 520 |
| Feet | 128 | 128 |
| Tail | 0 to 120 | 0 to 140 |
| Elephant trunk and tusks | 260 | 360 |

The largest body (the elephant) comes to about 2,450 triangles, the rabbit to about 2,200. If a
stage passes 2,600, it first removes rings in the flat parts (the back, the sides of the belly,
the straight shins), as option A part 2 asks.

### 2.8 Option A part 2 in this plan

| Item of part 2 | Where |
|---|---|
| A `fur` finish | Stage 2 (below): `Finish` gets `fur` (roughness 0.85, sheen 1, crease 60°). `matte` keeps roughness 0.85 and gets the sheen 0. The body parts use `fur`. The instruments, the props, and the cloth of the folder keep `matte`. The decision row of `2026-10-06-fur-shading.md` that names this later work goes away. |
| No 12-vertex icosahedra | The knees go away with the leg sweeps (B1), the hands become mitten lofts (B2), the trunk balls go away (A4), the puff tail becomes a `ball()` of 10 segments and 5 rings (B3). The nostrils of `flat-nose`, the round ears of `ears.ts`, and the ovals of `face-patterns.ts` become `ball()` parts in stage F. |
| Fewer and larger facets where the forms need them | Stage F: 8 sides on the arms, rings at the changes of a form (shoulder, elbow, knee, crown, cheeks) and fewer rings on the flat back and the shins. The alternate turn of the rings stays, so the outlines keep the triangle facets of `animals.webp`. |

## 3. Effects and risks

### 3.1 Pose code

No bone moves and no point of `BodyBones` moves (2.6). `poseAt()`, the IK, the holds, the
looks, and the cues read only these values, so they do not change. The scene copies the same
rotations to the same bones. A probe of each stage compares `model.body` and
`model.skeleton.positions` of all models with `main`: each value must be equal.

### 3.2 Footprints, layout, and shots

- A welded body changes the main bone of some triangles near a joint, so a footprint box can
  grow or shrink by a few centimeters. `playerFootprint()` still holds each vertex.
- `layout-scene.test.ts` pins the stage sides to 0.005 m ("keeps the stage side of the packed
  rows"), and `beam.test.ts` reads some sides. A stage that moves a side updates the pins and
  design 4.5 in the same commit, with the old value in the comment, as the earlier rounds did.
- The planner tests of `shots/prepare.test.ts` move each player by 2 cm and need 90% of the cuts
  and 75% of the shots (decision `2026-10-06-planner-stability.md`). They test the planner, so
  they stay. A pinned shot (the horn entry, the early solo of K. 315, the first voice of the Ode
  to Joy) can still flip after a change of the boxes. Then the agent treats it as a fault of
  the planner, as the planner agent did, and does not tune a body to pass it.

### 3.3 Occlusion bake

- The bake stays in the bind pose and keys its discs by the main bone. A welded corner has one
  position and one main bone, so the weld of the normals and the bake need no change.
- The neck becomes a real concave fold under the jaw. The bake darkens it, as it darkens the
  overlap of today. The shoulder line on `shoulderL/R` is a free bone (`FREE_BONES`), so a raised
  arm leaves no dark stripe.
- The filler balls are inside the skin in the bind pose. The bake must skip them as occluders,
  or a filler darkens the skin around it. The filler gets its own flag in the part options, or
  the bake skips the triangles that are inside a closed part.

### 3.4 GPU, CPU, and size

| Cost | Effect | Check |
|---|---|---|
| Vertex shader | No change: three.js always blends 4 bones (1.6). | `tools/measure-frame.ts` in stage G |
| Triangles | About equal (2.7). | `budget.test.ts`, and the frame measure |
| Model build | The grid and the sweeps replace the lofts and the tubes. The ports add a loop of 8 vertices each. Estimate: less than 1 ms more for each model. | A probe of `buildPlayer()` for the 22 models of `perf-60.mid`: at most 1.5 times `main` |
| Shading | Same triangle count, same weld. | `models/shading-speed.test.ts` (90 ms limit of 9.7) |
| First download | `models/` is in the first download. New code: the grid, the ports, the sweeps, the skin rules, and the forms, about 600 lines, less the old limb and dome code. Estimate: 3 to 6 kB after gzip. Now 283,931 B of 1,000,000 B. | `pnpm size`. A change of more than 5 kB states its reason in the commit. |

### 3.5 Tests

**Stay as they are** (they read bones, body points, or footprints, and each value stays):
`pose/ik.test.ts`, `bowed.test.ts` (except the line below), `winds.test.ts`, `hands.test.ts`,
`conductor*.test.ts` (except the helper below), `pose-timing.test.ts`,
`instruments/hold.test.ts`, `footprint.test.ts` ("holds each vertex"), `hidden-heads.test.ts`,
`budget.test.ts`, `shading.test.ts`, `shading-speed.test.ts`, `shots/*.test.ts`, the e2e smoke
test.

**Change:**

| Test | Change |
|---|---|
| `biped.test.ts` "makes each part rigid" (line 229), `species.test.ts` (line 253), `player.test.ts` "merges ... rigid parts" (line 81) | New rule: each corner follows at most 2 bones, a parent and its child, with the second weight from 0 to 0.5. The rigid parts (eyes, ears, hands, feet, instrument pieces) still follow one bone. |
| `biped.test.ts` torso, neck, head, snout, and limb tests (lines 242, 263, 505 to 594, 893, 905) | Keep the sizes of 2.6. Read the trunk grid in place of the separate parts. |
| `mesh.test.ts` | Add: the skin arrays of a skinned part, and a rigid part with the weight 0. |
| `scene/player.test.ts` | Add: `skinIndex` and `skinWeight` hold the two bones, and the weights add up to 1. |
| `pose/test-kinematics.ts`, `pose/test-clearance.ts`, `conductor-clearance.test.ts` (`posedParts`) | Pose each corner with its two bones: `(1 - w) × M(bone) p + w × M(blendBone) p`. A new test compares this helper with `SkinnedMesh.applyBoneTransform()` of three.js. |
| `bowed.test.ts` line 262 (heights of the left finger block) | Stays, because the fingers stay rigid. Check the mitten keeps the block of 0.12 × 0.08 × 0.09 H. |
| `arm-joints.test.ts` | Keep the ball test for the shoulder filler. Replace "sinks the ball into the torso" with: in each pose, the shoulder joint is inside the posed skin, and the elbow joint is at least 0.6 of the elbow radius from the outer side of the posed skin. |
| New: `models/ring-grid.test.ts`, `models/sweep.test.ts` | The welded trunk and arms are closed: each edge has 2 triangles. The left half mirrors the right half. A port loop has the vertex count of its branch. |
| `layout-scene.test.ts`, `beam.test.ts` | New stage sides if a stage moves a footprint (3.2). |

### 3.6 Risks

| Risk | Effect | Mitigation |
|---|---|---|
| R1. The shoulder weld (118° swing, 45° clavicle turn on a span of about 0.15 H) | The skin pinches on top or webs below the arm, and shows a hole or a spike. | Stage S (a spike) before the other stages. The fallback of D2: the dome overlaps the torso, with a blend of its cap rings only. |
| R2. The elbow collapse at 146° | A thin wrist-like elbow in the baton and the choir poses. | A narrow band (0.06 H) and the elbow filler. The new arm-joint test measures it. |
| R3. The wrist twist of 179° | A blend collapses the wrist to a point. | No blend at the wrist (2.3). |
| R4. Footprints and stage sides move | Pins in tests and design 4.5, new shot plans. | The envelope rule (2.6), the steps of 3.2. |
| R5. The head of the species changes `headSurface()` | The eyes and the face patterns move, the color splits change. | The tests of the eyes and the patterns (biped tests at lines 285, 673 to 879) stay. The probe compares the eye bones with `main`. |
| R6. Triangles grow | The GPU p95 of Cinematic mode passes 4 ms. | The budget of 2.7, and a frame measure in stage G. |
| R7. Merge conflicts of two parallel tracks | The stage side pins, the body table of design 4.5, the budget paragraph. | The second track to merge measures the pins again after its rebase (`AGENTS.md`, parallel work). Only stage G edits the budget paragraph. |
| R8. Mirror errors at a port | A port on the left side with a wrong winding turns its faces inside out. | The port and the branch of the left side are the mirror image of the right side, with the corner order of `MeshBuilder.add()` for a mirror scale. The closed-mesh test catches a wrong loop. |
| R9. Arm weights on the torso | The hanging arm of the bind pose passes inside the torso. A distance rule moves the torso with the arm. | The weights come from the ring of a corner on its chain (2.3). |

## 4. Stages

Each stage is one branch of small commits. Each commit passes `pnpm lint`, `pnpm typecheck`,
`pnpm test`, and `pnpm format:check`. A stage that changes a body also passes
`pnpm test:perf`, `pnpm build`, and `pnpm size`, and goes to a review agent with screenshots
(design 9.8). Each stage merges with `tools/merge-branch.sh`.

**Screenshots.** Before each stage, the agent takes the baseline on `main` into its scratch
folder: `pnpm screenshots <dir> --sheet --shots`. The comparison set is the species sheet, the
animal views (`views.html`, against `animals.webp`), the conductor shot of the Boulanger demo
(the back of the bear, as the third user screenshot and `scene.png` 05), the section and side
shots (the rabbits and the strings, as the second user screenshot and `scene.png` 06), and the
default view of the Boulanger demo (as `mockup.png`). A stage that changes the arms also records
a GIF of 10 s of the gallery with the test notes, because the joints show only in motion.

```text
   S0 skin data ---> S1 split files ---> S2 fur finish ---+--> Track A (trunk agent) --+
         |                                                |    A1 A2 A3 A4             |
         +---> S  shoulder spike (scratch, no merge) -----+--> Track B (limbs agent) --+--> W --> F --> G
                                                               B1 B2 B3                    weld  facets  close
```

| Stage | Work | Files | Done when | Screenshots | Cost |
|---|---|---|---|---|---|
| **S0. Skin data** | `MeshData.blendBones` and `blendWeights`, `CornerSkin`, `SkinRule`, the `skin` option of `MeshBuilder.add()`, the two weights in `createPlayerGeometry()`, the posing helper of the tests. Design 4.4 and 4.7 get the new rule: "a corner of the body follows at most 2 bones, a parent and its child". | `models/mesh.ts`, `scene/player.ts`, `pose/test-kinematics.ts`, `pose/test-clearance.ts`, `pose/conductor-clearance.test.ts`, design 04 | The mesh data of each species with each support is equal to `main` (a probe). The helper agrees with `SkinnedMesh.applyBoneTransform()` within 1e-6 m in 3 poses of a test part of two bones. | The species sheet (no change) | 2 h |
| **S. Shoulder spike** | In a scratch branch: the ring grid of the torso, a port on each side, and the arm sweep of 8 sides with the weights of 2.3, for the rabbit and the bear. Pose them with the extremes of 1.5. | scratch only | A written result in a decision file of the spike agent: in the bear baton pose (97°), the contrabass pose (118°), and the trombone pose (45° clavicle), the skin has no hole, no face turns inside out, and the shoulder outline has no spike. Else decision D2. | Gallery close views of the two animals, front and back, in the three poses | 3 h |
| **S1. Split the biped** | Move the code of `biped.ts` into `trunk.ts` (torso, neck, head colors), `arms.ts` (arms and hands), and `legs.ts` (legs and feet). Split `biped.test.ts` the same way. No change of behavior. | `models/biped.ts`, new files, tests | The mesh data of each model is equal to `main`. | none | 1.5 h |
| **S2. Fur finish** | The `fur` finish of 2.8. | `models/mesh.ts`, `scene/geometry.ts`, the body files, design 4.5, the fur-shading decision file | The body corners have `fur`. The instruments and the props keep `matte` with no sheen. The finish table test covers 5 finishes. | The species sheet, the conductor shot (the matte wood of the instruments loses its edge light) | 1 h |
| **A1. Trunk grid** | `RingGrid`, `loftGrid()` with the vertices of `loft()`, the torso as one grid with the waist and chest blends of 2.3. | `models/ring-grid.ts` (new), `models/trunk.ts`, tests | The torso is closed and mirrors. The waist and chest blends follow 2.3. The torso box and the chair clearance equal `main` within 0.005 m. | The conductor shot (the waist of the bear), the side shot | 2 h |
| **A2. Neck and head** | The head rings join the trunk grid with a neck ring. The neck tube and the ball head go away. `headSurface()` reads the grid. | `models/trunk.ts`, `models/head.ts`, `models/face-patterns.ts`, tests | The head keeps the sizes of 2.6. The eye bones equal `main`. The hidden-heads test passes. | The species sheet, the views, the conductor shot | 3 h |
| **A3. Species forms** | `BodyForm` of 2.5 in `SpeciesParams`, with the values of the species. | `models/species.ts`, `models/trunk.ts`, design 4.3 and 4.5 | Each value keeps the envelope of 2.6. The review agent compares each species with the references. | The species sheet, the views, `mockup.png` against the default view | 3 h |
| **A4. Muzzles and the trunk** | `openPort()`, and the muzzle lofts and the elephant trunk of 2.4 from ports. | `models/ring-grid.ts`, `models/snouts.ts`, tests | The mouth points equal `main`. Each muzzle tip is within 0.01 H of `main`. The head stays closed. | The species sheet (all 11 snouts), the section shot | 4 h |
| **B1. Sweeps and legs** | `SweepRing`, `sweep()`, the leg sweep of 2.1 with the sock band, the foot unchanged. | `models/sweep.ts` (new), `models/legs.ts`, tests | The knee balls are gone. The feet and the ankles equal `main`. Each leg is closed. | The species sheet, the views (seated and standing) | 2 h |
| **B2. Arm chain** | The arm as one sweep from the shoulder dome to the cuff, with the elbow blend and the filler, and the shoulder dome as today. The mitten loft. | `models/arms.ts`, `pose/arm-joints.test.ts` | The new arm-joint tests pass in each pose of the gallery cast. The palms and the finger blocks equal `main`. | The section and side shots, the GIF of the gallery | 3 h |
| **B3. Tails** | The bushy, thin, and flat tails as sweeps on `tail1` and `tail2` with the joint blend. The puff tail as a `ball()`. | `models/tails.ts`, tests | The tail lengths and the floor gap of design 4.5 stay. | The views (backs) | 1.5 h |
| **W. Shoulder weld** | The arm sweep starts at a shoulder port of the trunk grid, with the shoulder-line blend. Needs A1 and B2. | `models/arms.ts`, `models/trunk.ts`, tests | The trunk and the arms are one closed mesh. The arm-joint tests pass. The result of S holds for all 19 species. | All of the set, the GIF | 4 h |
| **F. Facets** | The facet pass of 2.8: 8 sides on the arms, the rings at the form changes, the last icosahedra. | the body files | Each body is at most 2,600 triangles, the `perf-60.mid` scene at most 168,500. | The species sheet, the conductor and section shots | 2 h |
| **G. Close** | Budgets, design 4.4, 4.5 (the body table, the facets and budgets), 4.7, the decision rows that changed (the dome and the elbow rows of `2026-10-06-arm-and-hand-contact.md`), a frame measure of `perf-60.mid` in both camera modes, the final review. | design 04, 09, decisions, `budget.test.ts` | The frame target of 9.7 passes. The review agent approves. | The full set with `--play`, `--shots`, `--sheet` | 2 h |

The costs are estimates of agent time without the review rounds. In all, about 34 hours. With
two tracks in parallel, about 22 hours pass from S0 to G.

**Parallel split.** After S2, two agents work with no shared source file:

- The trunk agent owns `trunk.ts`, `head.ts`, `snouts.ts`, `face-patterns.ts`, `ears.ts`,
  `species.ts`, `ring-grid.ts`, and their tests.
- The limbs agent owns `arms.ts`, `legs.ts`, `tails.ts`, `sweep.ts`, `pose/arm-joints.test.ts`,
  and their tests.
- `biped.ts` only calls the three area files after S1. Neither track changes it.
- Each agent records its decisions in its own decision file. The design file 04 has one row for
  each part in the body table of 4.5, so the two tracks edit different lines. Only stage G edits
  the paragraph of the budgets.
- The stage side pins of `layout-scene.test.ts` are the one shared risk (R7). The second track
  to merge measures them again after its rebase.

Stage W needs both tracks, and one agent does it. Stage S can run in parallel with S1 and S2,
because it changes no file of the repository.

## 5. Decisions for the user

**D1. Deploy each stage, or deploy the set.** `pages.yml` deploys each merge to `main` to GitHub
Pages. Each stage changes the look of a part of the body, so for some days the public site
shows a mix (for example welded limbs under the old head).

- Recommendation: merge and deploy each stage. Each stage is better than the state before it,
  each one has a review with screenshots, and `AGENTS.md` asks for small changes on `main`.
- The other choice: keep the stages on one branch and merge them after stage G. This delays all
  improvements, and the long branch makes the rebases of the other agents harder.

**D2. Only if the shoulder spike fails: the fallback of the shoulder.** If stage S shows a hole,
a spike, or a deep pinch in the extreme poses, two fallbacks remain:

- Recommendation: the hybrid shoulder. The dome of the arm overlaps the torso, and only the cap
  rings blend from `shoulder` to `upperArm`. The line where the arm meets the torso stays in a
  raised arm, and the rest of option B is not affected. The cost is small.
- The other choice: dual quaternion skinning (2.1). It also helps the elbow. It patches the
  skinning chunks of three.js and the shadow pass, and costs about one more day of work and a
  second bone texture each frame.

No other point needs the user. The agents decide the details in their decision files, as the
earlier rounds did.

## 6. Design sections that change

| Section | Change |
|---|---|
| 4.3 | `SpeciesParams` gets `form?: BodyForm`, with the values of each species. |
| 4.4 | "Each vertex follows exactly one bone" becomes: a corner of the welded body follows at most 2 bones, a parent and its child. The rigid parts follow one bone. One draw call for each player stays. |
| 4.5 (materials) | The `fur` finish. The weld of the normals now also joins the ports. The fillers have no occlusion. |
| 4.5 (body proportions) | The rows of the head, the torso, the neck, the arms, the legs, the snouts, and the tails. |
| 4.5 (facets and budgets) | The ring grid, the sweeps, the new counts. |
| 4.7 | The rule of 4.4, the blend bands of 2.3, and the fillers. The bones and their bind positions do not change. |
| 9.7 | No new target. Stage G adds the measure of the frame. |

## 7. How to repeat the numbers

The probes ran from a scratch folder with Node 24, and imported the modules of `src/` by their
absolute paths.

- **Triangles (1.2).** For each species, `buildPlayer(species, firstInstrumentOfSection)`, then
  count the triangles by the bone of the first corner (`mesh.bones[t * 3]`), grouped as in the
  table. `weldCorners(mesh)` gives the vertex count, and `performance.now()` around
  `buildPlayer()` and `shadeMesh()` gives the times.
- **Joint turns (1.5).** `galleryPlan()` of `src/gallery/plan.ts` with the cast of
  `arm-joints.test.ts` and `DEFAULT_TEST_NOTES`. For each pose (the rest pose at wall time 10,
  then every 0.1 s from 0 to 4.5 s), `poseSkeleton()`, then for each joint the relative rotation
  `qParent⁻¹ × qChild`. The swing is the angle of the bone axis after this rotation. The twist is
  `2 × atan2(|q.xyz · axis|, |q.w|)`. The bone axis is down for the arms and the hands, up for
  the trunk, and out for the clavicles.
- **Shader cost (1.6).** `node_modules/three/src/renderers/shaders/ShaderChunk/skinning_vertex.glsl.js`
  of three.js 0.186.1.
- **Size (3.4).** `pnpm build`, then `pnpm size` on `441d398`.
