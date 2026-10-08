# Blender models: the spike of the red fox, and the plan for all species

Date: 2026-10-07. Branch: `blender-fox-spike`, from `main` at `12c42eb`. Decision of the user:
option C, hand-made low-poly animal models made with Blender, because the parametric bodies
stayed "very different from the reference" after many rounds.

The targets are `docs/reference/orchestra-latest.png` and `docs/reference/orchestra-side.png` (our
own cast from two angles) and `docs/reference/lowpoly-animals.png` (the style). Design 1 gives
the paragraphs on these images.

## 1. Summary

- **The pipeline works from end to end for the red fox.** Blender builds the fox around the bones
  of our rig, a TypeScript tool packs it into a module of 17.7 KB after gzip, and `buildBiped()`
  uses it in place of the parametric parts. The app shows it in the gallery and in the default
  view.
- **All 2,045 unit tests pass** with the new fox, together with `pnpm lint`, `pnpm typecheck`, and
  `pnpm format:check`. The first fit failed 7 tests. Section 5 gives each failure and its cause.
- **The bones do not change.** The sculpt has the bones and the body points of the parametric
  body. Thus the poses, the IK, the holds, the shots, and the footprints keep their values. A test
  compares the bones of the sculpt with the current skeleton.
- **The build is repeatable.** A second build gives the same bytes. It takes 1.6 s without
  previews. The packed modules are in the repository, so CI needs no Blender.
- **Size.** The first download grows from 302,738 B to 322,825 B after gzip. All 19 species add
  about 340 KB, to about 640 KB of the limit of 1 MB.
- **Look.** The fox now has the long muzzle, the white cheek ruffs and bib, the pointed ears, the
  dark lower legs and hands, and the bushy tail with a white tip of the references, with large
  flat facets. The head is still longer and narrower than in `orchestra-side.png` (section 4).
- **Plan.** Five stages for the other 18 species, with at most 2 agents at the same time: about
  13.5 hours of wall time (section 7).

![The reference foxes, the Blender fox, and the fox in the app](2026-10-07-blender-models-plan/fox-side-by-side.png)

## 2. Pipeline

The parametric code stays the source of the skeleton. Blender builds the mesh around it.

```text
 src/models (parametric)        tools/                       Blender 5.2 (headless)
+-----------------------+   +----------------------+   +-----------------------------+
| buildBiped(): bones,  |-->| sculpt-rig.ts        |-->| build_sculpt.py             |
| palms, finger blocks, |   | <species>.rig.json   |   |  recipe: fox_red.py         |
| mouth, head center    |   | (2 stances, colors)  |   |  steps:  kit.py             |
+-----------------------+   +----------------------+   +--------------+--------------+
            ^                                                         | <species>.json
            |                                                         v (shells, skin,
+-----------+-----------+   +----------------------+   +-----------------------------+
| buildBiped(): mesh of |<--| src/models/sculpts/  |<--| build-sculpt.ts: check,     |
| the sculpt, bones of  |   | <species>.ts         |   | quantize, varint, base64,   |
| the parametric body   |   | (committed)          |   | oxfmt                       |
+-----------------------+   +----------------------+   +-----------------------------+
```

`pnpm sculpt <species> [--render <dir>]` runs the three steps. With `--render`, Blender also
writes preview images (Eevee, a warm key light) of each stance from the front, the side, the
back, and the head.

### 2.1 The method of one shell

A shell is a closed surface on one bone, or on a chain of bones. Each shell goes through the same
steps, so each species can use them.

```text
 hulls of spheres     voxel remesh      smooth        right half      decimate
 at the bones    -->  (5 mm)       -->  (4 steps) --> (x <= 0)   -->  (collapse) --+
                                                                                    |
 +----------------------------------------------------------------------------------+
 |
 v
 mirror and weld  -->  plane cuts for color   -->  cuts where the     -->  skin rule:
 the seam              borders, paint by           main bone changes      2 bones at most
                       the face centroid           (only bad faces)       for each vertex
```

- **Base forms.** A form is the convex hull of a few spheres or ellipsoids, placed at bones or
  body points with offsets in H. For example, the muzzle is the hull of a sphere at the face and a
  small sphere at the nose.
- **Remesh and decimate.** The voxel remesh joins the forms of one shell. The collapse decimate
  makes the large facets of `lowpoly-animals.png`. A shell on the middle plane is decimated as its
  right half, then mirrored, so the left half is the mirror image facet by facet, as in the
  parametric body.
- **Color borders.** A plane cut gives a straight border, as `splitByField()` of
  `models/mesh.ts` does. A test of the face centroid then gives each triangle its region. A cut
  only touches the faces in a zone near its border, because each cut adds triangles.
- **Skin.** A rule gives each vertex its main bone, its second bone, and the weight of the
  second bone (design 4.7). The trunk uses a field: the height below the chest, and the height
  tilted to the front above it. A chain rule gives the tail. The hands, the eyes, the ears, the
  arm capsules, and the paws are rigid.
- **One joint for each triangle.** A large facet across a short bone, such as the neck, can touch
  three bones. `split_joints()` cuts only those triangles along the planes where the main bone
  changes. A corner on such a plane gets the weight 0.5, so its main bone is the parent.

### 2.2 The arms

A remeshed arm tube had long thin facets from the hand to the shoulder. One such facet with a
`forearm` corner reached the shoulder, and the arm test counted that corner as a forearm point
inside the torso. Ring cuts fixed it, but each ring crossed all the long facets: the arm grew from
80 to 260 triangles. The sculpt now has two rigid faceted capsules on each arm: the upper arm with
a ball of 0.19 H around the shoulder joint, and the forearm with a ball of 0.15 H around the elbow
joint. They overlap at the elbow, as the half balls of the parametric arm, and need no filler.

## 3. Files and data

```text
tools/
  sculpt-rig.ts            the rig of a species as JSON (bones, points, colors)
  build-sculpt.ts          runs Blender, packs the output, writes the module
  blender/
    kit.py                 the shared steps: forms, remesh, decimate, mirror, cuts, skin
    build_sculpt.py        the entry script of Blender
    fox_red.py             the recipe of the red fox
src/models/
  sculpt.ts                decodePacked(), decodeSculpt(), placeSculpt()  (pure)
  sculpts/fox-red.ts       FOX_RED_SCULPT, written by `pnpm sculpt fox-red`
  species.ts               SPECIES['fox-red'].sculpt
  biped.ts                 the mesh of the sculpt in place of the parametric parts
```

The data of a sculpt:

```typescript
export interface Sculpt {
  /** The head height H that the sculpt was built for, in meters. */
  readonly h: number;
  /** The color regions. A triangle holds the index of its region. */
  readonly regions: readonly SculptRegion[];
  /** The packed mesh of the parts above the legs, in the axes of the first stance. */
  readonly body: string;
  /** The legs of each stance. */
  readonly stances: readonly SculptLegs[];
}

export interface SculptLegs {
  /** Seated on a seat of `seatHeight` (0.35 m) with the feet on the floor, or standing. */
  readonly stance: { kind: 'seated'; seatHeight: number } | { kind: 'standing' };
  /** The body bones that the build used. A test compares them with the current skeleton. */
  readonly bones: Readonly<Record<string, Vec3>>;
  /** The move of the body to this stance: the move of the hips. */
  readonly bodyOffset: Vec3;
  /** The packed mesh of the legs and the paws. */
  readonly legs: string;
}

export interface SculptRegion {
  /** The base color as a CSS hex color in sRGB (design 4.5). */
  readonly color: string;
  /** The finish: 'fur', 'matte', 'lacquer', and the other finishes of design 4.5. */
  readonly finish: Finish;
}
```

A packed mesh is base64 text of these bytes:

```text
+-----------+-----------+------------------------+------------------+-------------+--------+
| vertices  | triangles | positions: zigzag      | skin: bone,      | corners:    | region |
| (varint)  | (varint)  | varint differences in  | second bone,     | 0 = next    | 1 byte |
|           |           | steps of 0.25 mm, in   | weight (0..255   | new vertex, | each   |
|           |           | the order of first use | = 0..0.5), bytes | else varint | tri    |
+-----------+-----------+------------------------+------------------+-------------+--------+
```

### 3.1 Where the data lives, and its size

Each species has one TypeScript module in `src/models/sculpts/`. `species.ts` imports it, so it
is in the first download, and the first frame has the sculpt. `buildPlayer()` stays pure and
synchronous, and the app needs no glTF loader.

| Item | Size |
|---|---|
| First download on `main` (2026-10-07) | 302,738 B |
| With the fox sculpt and the decoder | 322,825 B (+20,087 B) |
| Fox module | 36,905 B, 17,734 B after gzip |
| Raw bytes of the packed fox, and their gzip | 28.2 KB, 17.3 KB (base64 adds 14% after gzip) |
| Estimate for 19 species | about 340 KB, total about 640 KB of 1,000,000 B |

The first packing (int16 positions in the order of Blender, a full mesh for each stance) gave
45.7 KB after gzip. The order of first use, the varint differences, and the shared body gave the
factor 2.6.

If the budget gets tight, two steps can help. A dynamic `import()` of the sculpts of the species
of the score before the scene builds keeps the other species out of the first download. The
Boulanger demo uses nearly all species, so this step helps less on the first screen. Fewer
triangles also help: the size follows the triangle count, at about 7 B for each triangle after
gzip.

## 4. Results of the spike

| Check | Result |
|---|---|
| `pnpm test` | 2,045 passed (178 files and 3 new files) |
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check` | pass |
| Triangles of the fox body | 2,496 seated, 2,476 standing (budget 2,600). The parametric fox has 1,882 |
| Trunk shell | 640 after the decimate, 1,332 after the color and joint cuts |
| Build time | 1.6 s for the rig, Blender, and the pack, without previews |
| Repeat build | the same bytes |
| `pnpm size` | 322,825 B, pass |

The fox looks like the foxes of the references in the default view: the color regions and the
silhouette match. These gaps stay:

- The head is longer and narrower than the heads of `orchestra-side.png`, and the forehead is
  flatter. The reference has a higher round skull and white cheeks that cover more of the face.
- The thighs are large blocks, and the shins are long. The shins come from the skeleton: the
  knee is 0.30 m above the hock on the chair.
- The preview lights in Blender differ from the lights of the app, so the colors of the previews
  are darker. Only the app screenshots count for the look.

## 5. What failed in the first fit, and why

The first sculpt failed 7 of 2,027 tests. Each failure came from a form or a skin rule, and each
test was correct. These rules apply to each species.

| Test | Failure | Cause | Fix |
|---|---|---|---|
| Body budget (`budget.test.ts`, `species.test.ts`) | 2,774 triangles | The color cuts added 680 triangles, and the joint cuts 670 | Cuts only in the zone of each border, joint cuts only on bad faces, lower decimate targets |
| Stage side (`layout-scene.test.ts`) | 13.489 m against 13.45 m, then 11.272 against 11.28 | The tail reached 0.377 m back (parametric 0.346 m), then 0.338 m | A tail tip at the depth of the parametric tail |
| Shoulder joints (`arm-joints.test.ts`) | 0.02 H in the torso, then NaN | The torso was 0.41 H wide at the joints (0.5 H needed). Flat triangles from the cuts gave NaN | A shoulder yoke 0.5 H wide. Vertices within 0.3 mm merge after each cut, and the packer drops flat triangles |
| Bent elbow (`arm-joints.test.ts`) | 0 of the arm radius | The linear blend of one tube folds the outer side of the elbow in | Rigid capsules that overlap at the elbow |
| Rest clearance (`rest-clearance.test.ts`) | forearm 0.05 to 0.075 H in the trunk | The test reads the trunk without the triangles of `hips`, so the shell is open at the bottom. The tilted skin field put the opening low at the front, and a ray from a point under the belly counted as inside. Long arm facets also put shoulder corners in forearm triangles | Level borders below the chest at the heights of the parametric torso, and the arm capsules |
| Play clearance (`play-clearance.test.ts`) | bow forearm 0.013 H into the trunk | The jaw hung 2 cm lower than the parametric head (0.853 m against 0.874 m) | A higher jaw |

The diagnostics are short scripts that use the helpers of `pose/test-*.ts` to print the worst
point and the bind place of the nearest trunk triangle. Each later agent can use the same
method.

## 6. Risks

- **Bone fit.** A sculpt must fit bones that it cannot move: the palms, the finger blocks, the
  mouth, the eyes, and the shoulder and hip joints. A form that the reference wants can break a
  hold or a clearance. Example: a shorter muzzle moves the nose, but the mouth point of a wind
  player stays (the flute of the tan fox). Change a body point only in the parametric code, then
  build the sculpt again.
- **Clearance tests.** The tests measure the arms against the trunk without `hips`, by the parity
  of ray crossings. The bottom of the trunk shell must stay low and level, or the tests count
  points under the belly as inside. Large species have plump bellies and arms on them (the hippo
  bow arm already goes 0.25 H into the belly, design 5.3).
- **Footprints and the layout.** `layout-scene.test.ts` pins the stage side to 5 mm. A sculpt that
  is deeper or wider than its parametric body moves the rows. Keep the boxes of each bone near
  the boxes of the parametric body, or ask the agent of the layout to change the pinned values.
- **Shot planner stability.** The shots read the head centers (unchanged) and the obstacles of the
  layout, which come from the footprints. A changed footprint can change a shot plan. All shot
  tests passed with the fox. Each stage runs `pnpm test` and checks the shots of the default
  demo.
- **Hidden heads.** `hidden-heads.test.ts` renders the default view. Larger ears or heads can hide
  the heads behind them. The polar bear and the hippo are the largest risks.
- **Budget of triangles.** The cuts add about 700 triangles to the trunk. A species with a face
  pattern (the panda, the badger, the cat) needs more borders. Oval patches need a separate thin
  part on the head, because a plane cut gives only straight borders.
- **Stances.** A sculpt has seated legs for a drop of 0.35 m and standing legs. The polar bear
  sits on the bench of the piano (0.45 m) and needs a third stance. The penguin stands on risers.
  The hippo sits on the high stool, which has the drop of a chair.
- **Special bones.** The penguin opens its beak on `jaw` (the choir). The elephant has `trunk1`
  to `trunk3`. The deer has antlers. Each needs its own skin rule and a test.
- **Blender version.** A new Blender can change the remesh or the decimate. The outputs are in the
  repository, so only a new build sees the change. Use Blender 5.2.

## 7. Stages for all species

At most 2 agents work at the same time (the limit of the user). Each stage ends with `pnpm test`,
`pnpm size`, the screenshots of design 9.8, and a review against the references. The costs are
estimates from the spike: about 1.5 hours for the first species of a family, and 45 minutes for
each next species of the same family.

| Stage | Work | Agents | Wall time |
|---|---|---|---|
| S1 Kit | Make the fox recipe a canine family with parameters (`canine.py`), add the tan fox and the wolf. Add a test that loops over each species with a sculpt (the bones, the rigid parts, the budget). Add `pnpm sculpt --all`. | 1 | 2 h |
| S2 Front rows | A: the rabbit (long ears, hare legs) and the cat (feline head, forehead stripes). B: the dog (floppy ears, the cap and the blaze). | 2 | 2.5 h |
| S3 Large species | A: the bear, the polar bear, and the panda (an ursine family, the bench stance, the eye patches). B: the hippo, the elephant (a trunk chain on `trunk1` to `trunk3`), and the rhino. | 2 | 3.5 h |
| S4 Other species | A: the pig, the beaver, the badger, and the deer (antlers, hooves). B: the mouse, the monkey, the meerkat, and the penguin (a beak that opens on `jaw`, the webbed stance). | 2 | 3.5 h |
| S5 Cleanup | Extract a pure `bodyBones()` that gives the bones and the body points with no mesh. Then remove the parametric mesh code that no species uses, and the tests that pin its geometry. Update design 4.3 to 4.7. | 1 | 2 h |

The total is about 13.5 hours of wall time, or 11 hours if S5 starts while S4 is in review.

```text
 S1 kit (1) --> S2 front rows (2) --> S3 large species (2) --> S4 other species (2) --> S5 cleanup (1)
     2 h            2.5 h                  3.5 h                    3.5 h                   2 h
```

## 8. License

The models are our own work. The recipes in `tools/blender/` and the packed modules use the MIT
license of the repository, and they use no outside asset. Blender (GPL) is a build tool. Its
license does not cover the files that it makes: "Whatever you create with Blender is your sole
property" (https://www.blender.org/about/license/). The first download gets no new dependency, so
the third-party license file does not change.

## 9. Decisions that the spike assumes

- **D1.** A sculpt fits the skeleton of the parametric body. The parametric code stays the source
  of the bones and the body points until stage S5 extracts them.
- **D2.** The packed modules are in the repository, one TypeScript module for each species, with a
  static import. CI and the other machines need no Blender.
- **D3.** A sculpt has the seated legs of a drop of 0.35 m and the standing legs. Another seat
  keeps the parametric body until a stage adds its legs.
- **D4.** Rules give the skin weights. The rules are repeatable and testable, and they can keep
  each triangle on one joint. The automatic (heat) weights of Blender need bone tails, which our
  rig does not have, and a second step to keep two bones for each vertex.
- **D5.** The arms of a sculpt are two rigid capsules that overlap at the elbow.
- **D6.** Plane cuts give the color borders, so each border is straight, as in design 4.3.
- **D7.** The coordinates are packed in steps of 0.25 mm, with the same rounding on each side of
  the middle plane.
- **D8.** The previews of Blender are for the recipe author. The look is judged in the app.
