# Low-poly studio

The studio makes a rigged, animated, low-poly animal (one GLB file) from one reference sheet.
Each animal is a folder with a config file. A role pack says what the animal does (conduct,
later play the piano or the violin). The code is generic: a new animal is a new config, and a new
role is a new folder.

The app of this repository (`src/`) does not use the studio, and the lint of the repository skips
it. The first animal is the bear conductor (`animals/bear/`, see its README for the method and
the results with numbers).

![compare](animals/bear/out/compare/compare.png)

## Quick start

Run the commands in this folder (`lowpoly-studio/`). The studio needs python3 3.11 or later with
Pillow, Blender 5.2 or later (`blender` on the path, or the variable `BLENDER`), Node 24, and the
packages of the repository (`pnpm install --offline` in the repository root).

```bash
python3 studio build bear            # build, shots, measures, checks (about 65 s)
python3 studio view bear             # the viewer on a free port; Ctrl-C stops it
python3 studio regress bear          # build again and compare with the golden stats
python3 studio new fox --sheet ~/fox-views.png   # start a new animal
```

## Layout

```text
lowpoly-studio/
├── studio/              generic code and the CLI (python3 studio ...)
│   ├── __main__.py      the entry point (cli.py has the commands)
│   ├── config.py        loads animal.toml and role.toml, checks them against schema.py
│   ├── schema.py        every config field: kind, default, meaning
│   ├── build.py         the Blender build: the list of stages (stages.py runs them)
│   ├── intake.py        sheet -> masks and row profiles (Pillow)
│   ├── sdf.py field.py  distance primitives, lofts from the masks, the field grid
│   ├── remesh.py        warps, QuadriFlow with mirror, organic pass, cleanup, body object
│   ├── organic.py       mirrored edge collapses and flips, relax, sliver cleanup
│   ├── paint.py         face colors and baked occlusion
│   ├── details.py       eyes, brows, nose, mouth, ears, tail, claws
│   ├── props.py         the props of a role (a baton)
│   ├── weights.py       armature, bone heat, weight arrays, fold repair
│   ├── skinning.py      linear blend skinning, face normals, fold measures
│   ├── contacts.py      the contact and fold check of each clip
│   ├── ik.py bake.py    rotation math, two-bone IK; clip baking into actions
│   ├── roles.py         the interface to the role packs
│   ├── export.py        materials, join, shape keys, glTF export
│   ├── checks.py        the structured check report (checks.json)
│   ├── regress.py       golden stats and their compare
│   ├── views.py fit.py  sheet cameras, IoU of the field with no mesh
│   ├── measure_*.py     eyes, ears, shading (Pillow), GLB facets (Blender)
│   ├── viewer_config.py writes out/viewer.json for the pages
│   └── shoot.mjs        headless renders: compare, frames, viewer shot
├── templates/biped/     the body plan, the 31-bone rig, the solver, the weight rules,
│                        the correctives, the contact groups
├── roles/conductor/     role.toml, the clips (__init__.py, clips.py), shots.json,
│                        pattern.py (the 4/4 plot)
├── viewer/              viewer, compare page, frames page (three.js), read viewer.json
├── animals/bear/        animal.toml, golden.json, README.md, reference/, out/
├── docs/                handoff.md (the state of the work), retro/ (the retrospectives)
└── vite.config.js       the root of the pages is this folder
```

No module of `studio/` names an animal. The bear's numbers are in `animals/bear/animal.toml`,
and the numbers of the conductor are in `roles/conductor/`.

## How a build runs

`python3 studio build <animal>` runs these stages. The Blender stages run in one Blender process
for each seed. Each Blender stage is a function with named inputs and named outputs
(`studio/build.py`), and `studio/stages.py` writes its outputs and its time into
`out/stages/<nn>-<stage>/`.

```text
 sheet.png ──> intake ──> masks, measure.json
                                │
 animal.toml ─┐                 v
 role.toml ───┴─(bind pose)─> field ──> remesh ──> organic ──> paint ──> details
                                                                           │
               role.toml (props, correctives, clips) ──> rig ──> correctives ──> assemble
                                                                           │
                              clips ──> contacts (+ fold repair) ──> export: GLB, stats
                                │                                          │
             seed search: the next seed of facets.seeds while a gate fails ┘
                                                                           v
                                     shots (compare, frames, viewer, role plots)
                                                                           v
                                     measures (eyes, ears, shading, mesh) ──> checks
```

| Stage | Where | Inputs | Outputs | Time (bear) |
|---|---|---|---|---|
| intake | CLI, Pillow | sheet, `sheet.*` | masks, `measure.json` | 2.6 s |
| field | Blender | body parts of the template | dense mesh (surface nets) | 1.5 s |
| remesh | Blender | dense mesh, `facets.*`, seed | mirrored triangles | 2.0 s |
| organic | Blender | triangles, `facets.*`, seed | body mesh and object | 15.4 s |
| paint | Blender | body mesh, `paint.*`, `look.materials` | face colors, occlusion, body stats | 0.4 s |
| details | Blender | body mesh, `details.*` | detail meshes | 0.0 s |
| rig | Blender | body object, `rig.*`, role props | armature, weights | 0.1 s |
| correctives | Blender | weights, role `bind.correctives` | shape keys and their drivers | 0.1 s |
| assemble | Blender | details, role props | joined mesh, shape keys, tip markers | 0.0 s |
| clips | Blender | the role pack | actions, sampled poses | 3.9 s |
| contacts | Blender | clips, weights, role checks | contact and fold report, repaired weights | 23.1 s |
| export | Blender | all | `out/<id>.glb`, `out/<id>.stats.json` | 1.9 s |
| shots | CLI, node | GLB, `viewer.json` | `out/compare/`, `out/frames/` | 11.4 s |
| measures | CLI | renders, sheet, GLB | `eyes.json`, `ears.json`, `topology.json`, `mesh.json` | 1.7 s |
| checks | CLI | all outputs, limits | `out/checks.json` | 0.0 s |

The whole build of the bear takes 65.0 s (Blender 49.3 s with its start); the old `build.sh`
took 64.4 s. `out/stages/pipeline.json` and `out/stages/run.json` hold the times of each run.

The model stages (field to details) take one input from the role: the bind pose. Two roles with
the same bind pose give the same mesh.

## The CLI

| Command | What it does |
|---|---|
| `python3 studio build <animal>` | intake, the Blender build with the seed search (the seeds of `facets.seeds` in order, the first seed whose clips pass the gates), shots, measures, checks. Exits 1 when no seed passes or a gate fails. |
| `--seed N` | One seed only. |
| `--no-shots` | Stop after the GLB and the checks of the stats (no renders, no measures). |
| `--out DIR` | Another output folder (default `animals/<id>/out`). Keep it under `lowpoly-studio/` when you want shots: the page server serves only this folder. |
| `--until STAGE` | Stop the Blender build after this stage (no GLB), for example `--until organic` to look at the mesh stages. |
| `--clips a,b` | Bake only these clips. |
| `python3 studio compare <animal>` | Renders the existing GLB beside the sheet, the frames, and the viewer shot, then the measures and the checks. No new build. |
| `python3 studio view <animal> [--port N]` | Writes `out/viewer.json`, starts Vite on a free port (never 5173 or 5190), and prints the URLs of the viewer and the compare page. Ctrl-C stops the server. |
| `python3 studio new <animal> --sheet <png> [--role R] [--like A]` | Makes `animals/<animal>/` with the sheet in `reference/`, an `animal.toml` with "TODO" fields, and prints the intake checklist. It finds the background and the four view columns of the sheet. `--like bear` fills the TODO fields with the bear values and marks them "TODO: measure", so `fit` and a first build run at once. |
| `python3 studio fit <animal> [--rows]` | Scores the field against the masks with no mesh (about 5 s with the intake). `--rows` prints the edges of each row. |
| `python3 studio regress <animal>` | Builds with the golden seed into `out/regress/` and compares with `golden.json`. `--no-build` compares the last regression build. `--write --from DIR --note TEXT` writes a new `golden.json` from a build. |
| `python3 studio schema [--role] [--readme]` | Prints the config reference (or the role reference) as Markdown. `--readme` writes both into this README. |

Debug prints: `STUDIO_DEBUG=1` makes the build print each face that points into the body, each
face that the fold repair smooths, and each face that stays folded, with its place and weights.

The Blender log of each seed is `out/stages/blender-seed<N>.log`.

## Add a new animal

1. Get a sheet that follows the intake checklist (`python3 studio new` prints it): four views of
   one pose (front, side facing right, back, 3/4 front-right) on one plain background, one
   ground line, the arms a little away from the body, at least 500 px of figure height.
2. Settle the style with the user before the first build, each claim with a crop of the sheet:
   the facet size, the light and the contrast, the palette, the eyes, the head, the snout, the
   ears, symmetry, "no folds at any seed".
3. `python3 studio new <id> --sheet <png> --role conductor --like bear`.
4. Measure the sheet in animal heights and replace each "TODO: measure" value. Start with
   `sheet.views`, the trunk and head lofts, and the joints. Run `python3 studio fit <id> --rows`
   after each change of the field: it takes seconds.
5. Build one seed: `python3 studio build <id> --seed 3`. Look at `out/compare/compare.png`, the
   face and facet crops, `out/frames/`, and `out/checks.json`.
6. Tune, build again, and when the look is right, run the seed search (`build` with no
   `--seed`) so that all seeds pass.
7. Write the golden stats: `python3 studio regress <id> --write --from animals/<id>/out --note
   "..."`, then commit the config, the sheet, `out/`, and `golden.json`.

## Role packs

A role pack says what the animal does. It is one folder under `roles/`:

| File | Content |
|---|---|
| `role.toml` | The data: the stance, the bind pose and its correctives, the props with their attachment, the clip notes, the body of the IK targets, the role checks, the review outputs. `studio/config.py` checks it against the `ROLE` schema. |
| `__init__.py` | `make(ctx)` returns the pack object: `fps`, `clips`, `performance`, `blend`. |
| more | The clip code, the review shots (`shots.json`), review scripts (`pattern.py`). |

The studio calls nothing else of a pack, so a new role is a new folder and no change of the studio
code. The pack object has this shape:

```typescript
/** The pack object that make(ctx) returns (roles/<name>/__init__.py). */
interface RolePack {
  /** Frames per second of the baked clips (role.toml [clips] fps). */
  fps: number;
  /** The clips in the order of the GLB. The first clip is 'reference', from
   *  ctx.reference_clip(): the pose of the sheet, for the compare and the correctives. */
  clips: Record<string, [(t: number) => PoseSpec, number]>;
  /** Segments [clip, start time in the clip, duration] of a clip "performance", or []. */
  performance: Array<[string, number, number]>;
  /** Blend time at the joins of the performance, in seconds. */
  blend: number;
}

/** What a pack gets from the studio (studio/roles.py Context). */
interface RoleContext {
  cfg: AnimalConfig;            // cfg.role is the role.toml
  body: TemplateBody;           // arm_pose(pose), leg_pose(pose), parts, reference_spec
  rest_skeleton(): [Skeleton, BoneLayout];   // the solver without Blender
  prop_points(name: string, pose?: string): [Vec3, Vec3];   // grip and tip of a hand prop
  reference_clip(): [(t: number) => PoseSpec, number];
  /** Moves a wrist target from the body of role.toml [targets] onto this body (the shoulder
   *  of the side, scaled by the arm reach). The identity for the body of the targets. */
  place(side: 'L' | 'R', p: Vec3): Vec3;
  unplace(side: 'L' | 'R', p: Vec3): Vec3;
}
```

A pose spec is the input of the template solver (`templates/biped/solver.py`): relative bone
rotations, a hips offset, IK targets of each arm (wrist, elbow pole, hand direction, palm, twist
share), forward kinematics of the arms or the legs, the scale of each prop (`<prop>_scale`), and
planted legs.

### Add a role

1. Copy `roles/conductor/` to `roles/<name>/`.
2. Edit `role.toml`: the stance, the bind pose in the middle of the motion range of the role,
   the props, the clip notes, the checks, and the review outputs.
3. Write the clips in `__init__.py` (and modules beside it): functions of time that return pose
   specs. Make the IK targets on one body, and put that body in `[targets]`.
4. Set `role = "<name>"` in an animal config and build.

### What a seated role needs (phase 3: a pianist)

Phase 3 adds a `pianist` pack and tests it on a polar bear (a standing four-view sheet, then
seated at a piano). The seams for it exist. These parts do not exist yet:

| Need | Seam now | Missing |
|---|---|---|
| Seated bind pose | `[bind] hip_flex`, `knee_flex`: the biped body bends the thighs and the shins, moves the feet, toes, and foot claws, and the layout uses the bent legs. The sheet pose clip straightens the legs with `leg_fk`. | A whole-body drop onto the seat height, and tests on a seated build. |
| Correctives from the bind pose to the sheet pose | `[bind] correctives`; the template lists its kinds (`KINDS`). | A `legs_straight` corrective. |
| Scene props (piano, bench) | `props.attach.bone = "scene"` and `attach.seat_height` are in the schema. | Their geometry kinds (a mesh file), the export as separate nodes, and the seat at the height of the knees. |
| Two hand targets per note | A pack computes any wrist target in its clip functions; `ctx.place` maps targets onto the body. | A score-driven clip generator, and a role check "hands within a distance of their targets". |
| Role checks | `[checks] contact_depth` and `contact_tests` (the groups of `templates/biped contact_spec`). | Body against instrument and seat contacts. |

## The biped template

`templates/biped/` is the interface between the studio and a standing body plan:
`Body(cfg, views, bind)`, `bone_order`, `layout`, `rest_skeleton`, `Skeleton` (the solver),
`weights`, `correctives`, `contact_spec`.

```text
root
└─ hips ─┬─ spine ─ spine1 ─ chest ─┬─ neck ─ head ─┬─ ear_L
         │                          │               └─ ear_R
         │                          ├─ clavicle_L ─ upper_arm_L ─ forearm_L ─ forearm_twist_L
         │                          │               └─ hand_L ─ fingers_L (+ L hand props)
         │                          └─ clavicle_R ─ upper_arm_R ─ forearm_R ─ forearm_twist_R
         │                                          └─ hand_R ─ fingers_R (+ R hand props)
         ├─ thigh_L ─ shin_L ─ foot_L ─ toes_L
         ├─ thigh_R ─ shin_R ─ foot_R ─ toes_R
         └─ tail
```

30 body bones plus one bone for each hand prop (31 for the conductor: `baton`). The bind pose
comes from the role. The weight rules (`rig.py`) take their places from `rig.weights` of the
animal config: trunk bands along the spine, owned parts of the arm, chain limits, throat and
shoulder tops to the neck, head rigidity, ears to the head, the crotch to the hips. The solver
has two-bone IK for the arms and planted legs, the twist split (the forearm twist bone takes a
share of the paw twist), and the clavicle follow (`rig.clavicle`). The correctives are the
arm-down shapes.

## Checks

`out/checks.json` holds one entry for each check. The contact and fold checks of each clip are
gates: a failed gate fails the seed and the build. The other checks are reported.

```typescript
/** out/checks.json (studio/checks.py). */
interface CheckReport {
  animal: string;
  role: string;
  seed: number;
  /** All gate checks pass. */
  gate_pass: boolean;
  /** All checks pass. */
  pass: boolean;
  failed: string[];
  checks: Array<{
    name: string;               // for example 'contact.bow', 'iou.front', 'eye_rim.front.0'
    value: number | number[];   // a pair [model, sheet] for a compare with the sheet
    op: '<=' | '>=' | 'in' | 'abs<=' | 'rel<=';
    limit: number | number[];
    pass: boolean;
    gate: boolean;
    /** The place of a failure when the check knows it (clip, side, part, time). */
    where?: Record<string, string | number>;
  }>;
}
```

| Check | Limit (config) | Gate |
|---|---|---|
| `contact.<clip>` | role `checks.contact_depth` | yes |
| `folds.<clip>` | `checks.folded_faces` | yes |
| `rest_inward_faces`, `unpaired_vertices`, `body_triangles`, `slivers` | `checks.*` | no |
| `iou.<view>` | `checks.iou.<view>` | no |
| `fur_hue`, `fur_saturation`, `fur_value` of each view | `checks.fur_color` | no |
| `eye_outline`, `eye_rim` of each eye | `checks.eye_outline`, `checks.eye_rim` | no |
| `ear_width`, `ear_height` of each ear | `checks.ear_size` | no |
| `facet_contrast` | `checks.facet_contrast` | no |

The bear passes 58 of 61 checks. The three failures are known limits of the sheet (see
`animals/bear/README.md`): the back view of the sheet is darker (`fur_value.back`), and the 3/4
view of the sheet turns the head more (`eye_rim.three_quarter.0`,
`eye_outline.three_quarter.1`).

## Regression

`animals/<id>/golden.json` holds the golden stats of one build:

- the sha256 and the size of the GLB, and the counts (vertices, triangles, bones, morph targets,
  clips, materials, nodes);
- for each accessor of the meshes and the skin, and for each clip: a sha256, the sums, the min
  and max, and 64 block checksums;
- the rest transforms of the nodes, the stats file, the IoU, the measures, and the check results.

`python3 studio regress <id>` builds the animal with the golden seed into `out/regress/` and
compares. Each group gets one verdict: identical (the same bytes), float noise (the bytes differ,
and each block checksum agrees within 2e-6 of its block: about one float32 step of each value),
or different. IoU may differ by 0.0005. A 1-ulp change of a vertex reads as float noise, and a
change of 0.001 of one vertex reads as different.

The golden stats of the bear come from the build of main c528ca2e (the old
`bear-studio/build.sh --seed 3`). The build of the studio gives the same GLB bytes, the same
stats, the same IoU (front 0.9468, side 0.9596, back 0.9495, 3/4 0.9154), the same measures,
and the same check results.

## Seams for a faster loop

These parts are ready for a stage cache, parallel seeds, and a look report:

- **Stages.** `studio/build.py` lists the stages with their named inputs and outputs, and
  `out/stages/` holds the outputs of each stage (`arrays.npz`, `data.json`, `stage.json` with
  the time). A cache can hash the inputs of a stage (the config sections it reads, the files
  of the stages before it, and the seed) and load the outputs. The outputs of kind "live" (the
  Blender objects, the field parts) must then be made again from the saved outputs. For
  example, the body object comes from `verts` and `tris` of the organic stage. The edge order of
  a mesh made again can differ, and the weight smoothing reads the neighbors in that order, so
  expect float noise there (the regression shows it).
- **Parallel seeds.** Every path comes from `--out`, so one Blender process for each seed can
  write its own folder (`animals/<id>/out/seeds/<n>/`), and the CLI can keep the first seed in
  the order of `facets.seeds` that passes.
- **Located failures.** Each check has a `where` field. The contact and fold checks fill it with
  the clip, the side, the part, and the time. The folded faces of all frames are in
  `ContactCheck.folded`.
- **Look report.** `out/compare/` and `out/frames/` hold all crops, and `checks.json` holds
  every measure with its limit: one page can show them side by side.

## Method, in short

The sheet is the only input of the model. The intake makes a mask of each view. The template
builds measured parts that blend into one signed distance field: a trunk loft and a head loft
whose sections come from the masks, and primitives for the snout, the limbs, the ears, and the
tail. Surface nets mesh the field. Radial warps and QuadriFlow with symmetry make quads that
follow the forms. Then the warps are undone, the vertices go onto the field and into mirror
pairs, and each quad splits toward the center line. The organic pass collapses and flips
mirrored edges, so the triangles vary. The cleanup removes slivers and inward faces. The faces
get colors and baked occlusion. Small pieces (eyes, nose, claws) sit on the facets. The rig
takes bone heat and the weight rules. The correctives fix the skin between the bind pose and
the sheet pose. The IK solver solves the clips of the role, and the build bakes them. The
contact and fold check skins the mesh at each frame and repairs single folded faces. `animals/bear/README.md` gives the reasons and the numbers.

## Known traps

- The shell is zsh: it does not split `$var` into words. Use arrays in a loop over variants.
- macOS has no `timeout` command.
- A remesh seed can leave slivers or turn the whole mesh inward. The cleanup handles both, but
  do not tune the look on one seed only.
- Small details (ears, tail) must sink into the body: quads of the facet size cannot hold them.

## Config reference

`python3 studio schema --readme` writes this section from `studio/schema.py`. "measure" means a
required field that `studio new` leaves as "TODO": measure it on the sheet. A field with a default
can be left out.

<!-- config-reference:begin -->

#### `[animal]`

Who the animal is.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `id` | str | measure | Short id: the folder name under animals/. |
| `name` | str | measure | Display name. The GLB mesh node gets this name, the armature this name plus "Rig". |
| `template` | str | `"biped"` | The body plan, the rig, and the weight rules: a package under templates/. |
| `role` | str | measure | The role pack under roles/: the stance, the bind pose, the props, the clips, and the role checks. The model (field, facets, paint, details) takes only the bind pose from it. |

#### `[sheet]`

The reference sheet: four views of one pose on one plain background.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `image` | str | required | Path of the sheet, from the animal folder. |
| `background` | rgb | measure | Color of the plain background. |
| `axis_rows` | vec2 | `[0.2, 0.3]` | Heights (0..1) of the rows whose single run gives the axis column. |
| `side_axis_height` | num | `0.1` | Height of the shin rows that give the axis of a "shin" view. |
| `side_axis_halfband` | num | `0.004` | Half height of that band of rows. |

#### `[sheet.foreground]`

The rule that tells an animal pixel from the background.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `min_saturation` | int | `14` | A pixel with max(rgb) - min(rgb) of at least this is on the animal. |
| `max_dark_sum` | int | `390` | A pixel with r + g + b under this is on the animal (dark eyes, nose, claws). |

#### `[sheet.views.<name>]`

The views, in this order. The names front, side, back, and three_quarter are the ones that the compare and the checks know.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `columns` | ivec2 | measure | Pixel columns of the view on the sheet: [x from, x to). |
| `azimuth` | num | measure | Camera azimuth in degrees: 0 in front, 90 at the right of the animal. |
| `label` | str | required | Button label of the view in the viewer. |
| `axis` | str | `"hips"` | How the axis column of the view is found: "hips" (the middle of the hip rows) or "shin" (the middle of the shin at side_axis_height, the z origin of a side view). |
| `flip` | bool | `false` | The view shows the back, so its x runs the other way. |

#### `[sheet.camera]`

The far, level cameras of the sheet views (weak perspective).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `distance` | num | `10.0` | Distance from the animal, in animal heights. |
| `height` | num | `0.5` | Height of the camera and of its target. |
| `fov` | num | `7.4` | Vertical field of view in degrees. |

#### `[field]`

The body field: measured parts that blend into one signed distance field (template "biped").

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `step` | num | `0.004` | Grid step of the field for the dense mesh (surface nets). |

#### `[field.trunk]`

The trunk: a vertical loft of egg-shaped sections. The width comes from the front and back masks, the depth from the side mask.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `heights` | range3 | measure | Heights of the loft sections: [from, to, step]. "from" is also the bottom of the trunk and "to" its top. |
| `width_measured_to` | num | measure | Up to this height the half width is measured on the masks. Above it the arms hide the sides, so width_points give it. |
| `width_measure_floor` | num | measure | Below this height the width of this height is used. |
| `width_points` | pairs | measure | Half width [height, half width] above width_measured_to. |
| `side_measure_floor` | num | measure | The side mask is read no lower than this height. |
| `front_measured_to` | num | measure | Up to this height the front (z) comes from the side mask. |
| `front_points` | pairs | measure | Front z [height, z] above front_measured_to (the neck). |
| `smooth` | num | `0.012` | Gaussian width that removes the pixel steps of the masks. |
| `bottom_cap` | vec2 | measure | Heights over which the width and the depth close at the bottom (a keel between the thighs). |
| `top_cap` | num | measure | Height over which the trunk closes at its top (inside the head). |
| `top_cap_min` | num | `0.05` | Smallest scale of the top cap. |
| `widest` | pairs | measure | [height, share]: where the section is widest, as a share of the depth from the back. |
| `front_power` | pairs | measure | [height, power] of the superellipse of the front half. Below 2 the front gets a ridge. |
| `back_power` | num | measure | Superellipse power of the back half. |
| `box` | box | measure | Box of the trunk part. |

#### `[field.head]`

The head ball: a loft of its own, so the head reads as a ball above the shoulders.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `bottom` | num | measure | Height of the chin, where the head closes below. |
| `cheek` | vec2 | measure | [height, half width] of the widest point (the cheeks). |
| `temple` | num | measure | Height up to which the width follows the masks. |
| `cap` | num | measure | Height above which the width and the depth shrink together (a round dome). |
| `top` | num | measure | Height of the top of the dome. |
| `blend` | num | measure | Blend width with the trunk: a soft groove under the head. |
| `step` | num | `0.0025` | Height step of the head sections. |
| `face_points` | pairs | measure | Front z [height, z] of the face beside the snout. |
| `face_join` | num | measure | Height where the face joins the side mask. |
| `forehead_top` | num | measure | Height up to which the front follows the side mask. |
| `dome_front` | num | measure | Front z of the middle of the dome. |
| `back_points` | pairs | measure | Back z [height, z] of the skull in front of the hump line. |
| `back_join` | num | measure | Height where the back joins the side mask. |
| `back_top` | num | measure | Height up to which the back follows the side mask. |
| `dome_back` | num | measure | Back z of the middle of the dome. |
| `smooth` | num | `0.004` | Gaussian width of the head sections. |
| `front_power` | num | `2.0` | Superellipse power of the front half. |
| `back_power` | num | `2.1` | Superellipse power of the back half. |
| `widest` | num | `0.5` | Where the head is widest, as a share of its depth from the back. |
| `box_x` | num | measure | Half width of the box of the head part. |
| `box_z` | vec2 | measure | Back and front z of the box of the head part. |
| `box_pad` | num | `0.01` | Padding of the box above and below. |

#### `[field.brow]`

The brow ridge: an ellipsoid on the head.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | required | Center (in the frame of the part, see the doc of the part). |
| `radii` | vec3 | required | Radii x, y, z. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.snout]`

The snout: a round cone from its base to the center of its front.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `base` | vec3 | measure | Center of the base. |
| `tip` | vec3 | measure | Center of the round front. |
| `radii` | vec2 | measure | Radius at the base and at the front. |
| `squash` | num | `0.95` | Scale of the section along y (below 1: flatter). |
| `blend` | num | measure | Blend width. |
| `box_pad` | num | `0.06` | Padding of the box around the region. |

#### `[field.snout.region]`

The snout region that moves only with the head (rig) and sets the box.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | measure | Center. |
| `radii` | vec3 | measure | Radii. |

#### `[field.ears]`

The left ear: a flat ellipsoid with a hollow on its front face. The surface leaves the ears out, details make them as separate pieces.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | measure | Center. |
| `radii` | vec3 | measure | Radii in the frame of the ear (z is the normal of its front face). |
| `yaw` | num | measure | Turn of the front face out to the side. |
| `roll` | num | measure | Lean of the top out to the side. |
| `lift` | num | `0.15` | Up component of the ear normal before it is made unit. |
| `hollow_offset` | vec3 | `[0.0, -0.002, 0.9]` | Center of the hollow in the ear frame (z is a share of the z radius). |
| `hollow_scale` | vec3 | `[0.65, 0.65, 0.55]` | Radii of the hollow as shares of the ear radii. |
| `hollow_blend` | num | `0.006` | Blend of the hollow cut. |
| `blend` | num | `0.012` | Blend width. |
| `box_pad` | num | `0.07` | Padding of the box. |

#### `[field.tail]`

The tail: an ellipsoid that points a little down.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | measure | Center. |
| `radii` | vec3 | measure | Radii. |
| `tilt` | num | `-15.0` | Turn about x (negative points the end down). |
| `blend` | num | `0.008` | Blend width. |
| `box_pad` | num | `0.06` | Padding of the box. |

#### `[field.arm]`

The left arm in the pose of the sheet ("reference"). The bind pose turns it.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `palm` | vec3 | measure | Direction that the palm faces in the sheet pose. |

#### `[field.arm.joints]`

Joint centers in the sheet pose.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `clavicle` | vec3 | measure | Inner end of the clavicle. |
| `shoulder` | vec3 | measure | Shoulder joint. |
| `elbow` | vec3 | measure | Elbow joint. |
| `wrist` | vec3 | measure | Wrist joint. |
| `knuckle` | vec3 | measure | Knuckles: the end of the paw bone. |

#### `[field.arm.upper]`

The upper arm: a round cone from the shoulder to the elbow.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `radii` | vec2 | required | Radii: start and end of a round cone |
| `squash` | num | required | Stretch of the section toward the front. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.arm.deltoid]`

The deltoid bulge, in the upper-arm frame from the shoulder.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | required | Center (in the frame of the part, see the doc of the part). |
| `radii` | vec3 | required | Radii x, y, z. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.arm.forearm]`

The forearm: a round cone from the elbow to the wrist.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `radii` | vec2 | required | Radii: start and end of a round cone |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.arm.forearm_bulge]`

The forearm bulge, in the forearm frame from the elbow.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | required | Center (in the frame of the part, see the doc of the part). |
| `radii` | vec3 | required | Radii x, y, z. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.arm.paw]`

The paw: an ellipsoid between the wrist and the knuckles, in the hand frame.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `radii` | vec3 | required | Radii x, y, z. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.leg]`

The left leg (the same in all poses).


#### `[field.leg.joints]`

Joint centers.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `hip` | vec3 | measure | Hip joint. |
| `knee` | vec3 | measure | Knee joint. |
| `ankle` | vec3 | measure | Ankle joint. |
| `ball` | vec3 | measure | Ball of the foot. |
| `toe` | vec3 | measure | Tip of the toes. |

#### `[field.leg.thigh]`

The thigh: a round cone from the hip to the knee.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `radii` | vec2 | required | Radii: start and end of a round cone |
| `squash` | num | required | Stretch of the section toward the front. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.leg.shin]`

The shin: a round cone from the knee to the ankle.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `radii` | vec2 | required | Radii: start and end of a round cone |
| `squash` | num | required | Stretch of the section toward the front. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.leg.foot]`

The foot: an ellipsoid cut flat at the ground.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | required | Center (in the frame of the part, see the doc of the part). |
| `radii` | vec3 | required | Radii x, y, z. |
| `sole_blend` | num | required | Blend of the flat sole cut. |
| `blend` | num | required | Width of the smooth union with the parts before it. |
| `box_pad` | num | required | Padding of the box where the part is sampled. |

#### `[field.leg.toes]`

The toes: small ellipsoids in a row at the front of the foot.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `x` | num | required | x of the middle of the row. |
| `offsets` | nums | required | x offset of each toe from the middle. |
| `spread` | num | required | Scale of the offsets. |
| `y` | num | required | Height of the toe centers. |
| `z` | num | required | z of the middle toes. |
| `z_drop` | num | required | How much the outer toes sit further back (times the offset). |
| `radii` | vec3 | required | Radii of each toe. |
| `sole_blend` | num | required | Blend of the flat sole cut. |
| `blend` | num | required | Blend width. |
| `box_pad` | num | required | Padding of the box. |

#### `[facets]`

The low-poly facets: QuadriFlow remesh with mirror, then the organic pass.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `quads` | int | `900` | Target quad count of QuadriFlow (it gives about 790 to 1200). |
| `seeds` | ints | `[3, 1, 5, 6, 2, 4, 7, 8]` | Remesh seeds in the order that the build tries them. The build keeps the first seed whose clips pass the gate checks. |
| `offset` | num | `0.004` | The vertices sit this far outside the field, so the flat facets cut the smooth surface and keep the silhouette. |
| `collapse_share` | num | `0.3` | Share of the half vertices that collapse in the organic pass. |
| `flip_share` | num | `0.8` | Share of the half edges that try a flip. |
| `relax` | num | `0.12` | Share of the way to the middle of the neighbors in each relax round. |
| `relax_rounds` | int | `2` | Relax rounds. |
| `jitter` | num | `0.005` | Sigma of the mirrored move along the surface. |
| `jitter_seed` | int | `11` | Seed of the jitter. |
| `dense_faces` | int | `60000` | The dense mesh is decimated to this face count before QuadriFlow. |

#### `[facets.squeeze]`

The trunk warp: x and z shrink near the trunk, so the belly quads come out wider than tall.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `factor` | num | required | Scale of x and z at the center. |
| `center` | vec3 | required | Center. |
| `radii` | vec3 | required | Gaussian radii in x, y, z. |

#### `[[facets.warps]]`

The radial warps, applied in this order after the squeeze.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | optional | Center of the warp (give this or "at"). |
| `at` | str | optional | A named point of the template in place of a center: "paw" (the middle of the paw in the bind pose). |
| `radius` | num | required | Radius of the warp. |
| `factor` | num | required | Scale at the center. |
| `mirror` | bool | `false` | Also add the mirrored warp (x -> -x) right after this one. |

#### `[facets.protect]`

The skin that the organic pass leaves alone (it bends far, or it must stay round).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `joints.<name>` | num | map | Radius of the protected ball around each named joint of the bind pose (shoulder, elbow, wrist). |

#### `[facets.protect.box]`

A box on the center line (the crotch).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `half_x` | num | required | Half width. |
| `y` | vec2 | required | Low and high height. |

#### `[facets.protect.near]`

The skin near a named part of the field.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `part` | str | required | Name of the part (for example "snout"). |
| `within` | num | required | Distance from the part surface. |

#### `[paint]`

The face colors of the body, and the palette of all pieces.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `palette.<name>` | rgb | map | Named sRGB colors. The body uses fur, belly, and muzzle. The details use ear, ear_inner, eye, eye_outline, sclera, catchlight, nose, mouth, brow, and claw. |

#### `[paint.belly]`

A lighter belly: a soft ellipse on the front of the trunk.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center_y` | num | measure | Height of the center. |
| `radii` | vec2 | measure | Radii in x and in y. |
| `edge` | vec2 | `[0.2, 1.2]` | Smoothstep of the ellipse distance: full inside, none outside. |
| `facing` | vec2 | `[-0.1, 0.6]` | Smoothstep of the normal z: only faces that face forward. |
| `min_z` | num | `-0.05` | Only faces in front of this z. |

#### `[paint.under]`

A darker underside.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `dark` | num | `0.08` | How much darker at the lowest height (0.08 = 8%). |
| `heights` | vec2 | measure | Smoothstep from no darkening to full darkening. |
| `floor` | num | measure | No darkening below this height. |

#### `[paint.muzzle]`

The muzzle color on the faces near a part (the snout).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `part` | str | `"snout"` | Name of the part. |
| `near` | num | required | All corners of the face are this near the part surface. |
| `min_z` | num | required | All corners are in front of this z. |
| `min_y` | num | required | All corners are above this height (the chin). |
| `lift` | num | `0.22` | Faces that point down get up to this much lighter. |
| `occlusion` | num | `0.2` | Share of the baked occlusion that the muzzle keeps. |

#### `[paint.occlusion]`

Ambient occlusion baked from the field.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `strength` | num | `0.6` | Darkening at full occlusion. |
| `ramp` | vec2 | `[0.05, 0.6]` | Smoothstep of the occlusion value. |
| `moving` | num | `0.3` | Share of the occlusion that the faces of a moving part group (the arms) keep from their own part. |
| `rays` | int | `24` | Rays per face. |
| `reach` | num | `0.16` | Length of each ray. |
| `steps` | int | `7` | Samples along each ray. |
| `seed` | int | `3` | Seed of the ray directions. |

#### `[details]`

Small low-poly pieces on the body (template "biped").


#### `[details.eyes]`

Each eye in four flattened layers along the look direction: a dark outline, a white sclera, the iris, and a highlight.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec2 | measure | [x, height] of the left eye. |
| `radius` | num | measure | Radius of the sclera. |
| `look` | vec3 | `[0.18, 0.02, 1.0]` | Look direction of the left eye (x is mirrored). |
| `ray_z` | num | `0.4` | z where the ray onto the face starts (in front of the face). |

#### `[details.eyes.outline]`

The outline layer.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `sink` | num | `0.0005` | Depth into the facet. |
| `scale` | num | `1.14` | Radius as a share of the eye radius. |
| `depth` | num | `0.45` | Thickness as a share of the eye radius. |

#### `[details.eyes.sclera]`

The white layer.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `lift` | num | `0.001` | Lift from the outline. |
| `depth` | num | `0.62` | Thickness as a share of the eye radius. |

#### `[details.eyes.iris]`

The iris layer.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `lift` | num | `0.0035` | Lift from the outline. |
| `scale` | num | `0.86` | Radius as a share of the eye radius. |
| `depth` | num | `0.5` | Thickness as a share of the eye radius. |
| `inward` | num | `0.12` | Shift toward the nose as a share of the eye radius. |

#### `[details.eyes.catchlight]`

The highlight.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `offset` | vec3 | `[0.24, 0.28, 0.42]` | Offset from the iris in eye radii (x is mirrored). |
| `scale` | num | `0.2` | Radius as a share of the eye radius. |
| `depth` | num | `0.12` | Thickness as a share of the eye radius. |

#### `[details.brows]`

A thin dark arc above each eye.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `x_offset` | num | `0.002` | Shift of the middle out from the eye. |
| `half_width` | num | measure | Half width of the arc. |
| `lift` | num | measure | Height of the ends above the eye center. |
| `arch` | num | `0.0045` | Extra height of the middle. |
| `out` | num | `0.0012` | Lift off the facets. |
| `radius` | num | `0.0011` | Tube radius at the ends. |
| `radius_arch` | num | `0.0004` | Extra tube radius in the middle. |

#### `[details.nose]`

The nose: a rounded triangle, wide at the top.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `at` | vec2 | measure | [x, height] of the nose on the face. |
| `ray_z` | num | `0.45` | z where the ray onto the snout starts. |
| `size` | vec3 | measure | Half sizes x, y, z. |
| `taper` | num | `0.5` | Widening toward the top. |
| `taper_clip` | vec2 | `[0.55, 1.3]` | Limits of the widening. |
| `tilt` | num | `0.006` | Forward lean of the top. |
| `sink` | num | `0.01` | Depth into the snout. |

#### `[details.mouth]`

A short philtrum and a closed smile, pressed onto the muzzle.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `out` | num | `0.0012` | Lift off the facets. |
| `philtrum` | vec2 | measure | Top and bottom of the philtrum below the nose. |
| `philtrum_radius` | num | `0.0022` | Tube radius of the philtrum. |
| `smile_half_width` | num | measure | Half width of the smile. |
| `smile_sag` | num | `0.0045` | Sag of each half of the smile. |
| `smile_sag_span` | num | `0.8` | Share of a half wave in each half. |
| `smile_lift` | num | `0.004` | Lift of the corners. |
| `smile_radii` | vec2 | `[0.0021, 0.0012]` | Tube radius at the middle and at the corner. |

#### `[details.ears]`

The ear shells (their size and place come from field.ears).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `hollow_depth` | num | `1.8` | Depth of the hollow in z radii. |
| `hollow_radius` | num | `0.88` | Radius of the hollow as a share of the ear (also the dark inner color). |

#### `[details.hand_claws]`

Four claws on each paw, in the hand frame.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `offsets` | nums | measure | x offset of each claw. |
| `base_y` | num | measure | Base along the paw from the paw center. |
| `base_drop` | num | `0.25` | How much the outer claws sit back (times the offset). |
| `base_z` | num | `0.012` | Base toward the back of the paw. |
| `direction` | vec3 | `[0.6, 1.0, 0.25]` | Direction (x is a factor of the offset). |
| `length` | num | measure | Length. |
| `radius` | num | measure | Base radius. |

#### `[details.foot_claws]`

Four claws on each foot, at the toes of field.leg.toes.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `base` | vec3 | `[0.1, -0.006, 0.018]` | Base from the toe center (x is a factor of the offset). |
| `direction` | vec3 | `[1.2, -0.3, 1.0]` | Direction (x is a factor of the offset). |
| `curl` | vec3 | `[0.0, -1.0, 0.2]` | Direction of the curl. |
| `length` | num | measure | Length. |
| `radius` | num | measure | Base radius. |
| `min_y` | num | `0.002` | The tips stay this high above the ground. |

#### `[rig]`

The skeleton and the skin weights of the template.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `tail_bone` | box | measure | Head and tail of the tail bone. |
| `ear_bone` | box | measure | Head and tail of the ear bone, from the ear center (x is mirrored). |
| `fingers_length` | num | measure | Length of the finger bone past the knuckles. |
| `leg_pole` | vec3 | `[0.15, 0.0, 1.0]` | Knee direction of the planted-leg IK (x is mirrored). |

#### `[rig.spine]`

[height, z] of the spine joints on the center line.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `hips` | vec2 | measure | The hips joint. |
| `spine` | vec2 | measure | The spine joint. |
| `spine1` | vec2 | measure | The spine1 joint. |
| `chest` | vec2 | measure | The chest joint. |
| `neck` | vec2 | measure | The neck joint. |
| `head` | vec2 | measure | The head joint. |
| `head_end` | vec2 | measure | The head_end joint. |

#### `[rig.weights]`

The weight rules after bone heat. Each [from, width] is a linear ramp.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `joints.<name>` | num | map | More smoothing within this radius of each named joint of the bind pose. |

#### `[rig.weights.throat]`

Clavicle weight of the front of the neck moves to the neck bone.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `x` | vec2 | measure | A pair [from, width] of a linear ramp. Out from the center line. |
| `y` | vec2 | measure | A pair [from, width] of a linear ramp. Up from this height. |

#### `[rig.weights.shoulder_tops]`

Head weight of the shoulder tops moves to the neck bone.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `y` | vec2 | measure | A pair [from, width] of a linear ramp. Down from this height. |
| `x` | vec2 | measure | A pair [from, width] of a linear ramp. Out from the center line. |

#### `[rig.weights.armpit]`

More smoothing under each shoulder.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `x_scale` | num | `1.08` | x of the center as a share of the shoulder x. |
| `drop` | num | measure | Center below the shoulder. |
| `radii` | vec3 | measure | Radii. |

#### `[rig.weights.crotch]`

The crotch moves only with the hips.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `half_x` | vec2 | measure | A pair [from, width] of a linear ramp. Inward from this half width. |
| `top` | vec2 | measure | A pair [from, width] of a linear ramp. Down from this height. |
| `low` | vec2 | measure | A pair [from, width] of a linear ramp. Up from this height (at the sides). |
| `keel_x` | vec2 | measure | A pair [from, width] of a linear ramp. Inward: the keel on the center line. |
| `keel_y` | vec2 | measure | A pair [from, width] of a linear ramp. Up from this height (the keel). |

#### `[rig.weights.head]`

The face and the muzzle move only with the head.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `muzzle_scale` | num | `1.25` | Scale of the snout region. |
| `skull_from_y` | vec2 | measure | A pair [from, width] of a linear ramp. The skull rule starts at this height. |

#### `[rig.weights.head.skull]`

The skull region.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `center` | vec3 | measure | Center. |
| `radii` | vec3 | measure | Radii. |

#### `[rig.weights.trunk]`

The trunk takes bands along the spine, except the limbs, the tail, and the head.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `head_from_y` | vec2 | measure | A pair [from, width] of a linear ramp. The head keeps bone heat above this height. |
| `below` | vec2 | measure | A pair [from, width] of a linear ramp. Everything below this height keeps bone heat. |

#### `[rig.weights.trunk.legs]`

The legs keep bone heat inside the thigh and the shin.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `thigh_top` | num | measure | Top of the thigh region. |
| `shin_top` | num | measure | Top of the shin region. |
| `radius` | num | measure | Radius around the leg bones. |
| `ramp` | num | `0.04` | Ramp of the radius. |
| `top_ramp` | num | `0.05` | Ramp below the tops. |

#### `[rig.weights.trunk.crotch]`

The crotch takes the trunk bands.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `half_x` | vec2 | measure | A pair [from, width] of a linear ramp. |
| `top` | vec2 | measure | A pair [from, width] of a linear ramp. |

#### `[rig.clavicle]`

The clavicle follows a raised arm.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `share` | num | `0.25` | Share of the arm swing that the clavicle takes. |
| `max` | num | `15.0` | Largest clavicle turn. |
| `lift` | vec2 | measure | A pair [from, width] of a linear ramp. Wrist height where the follow starts. |

#### `[look]`

The look of the GLB materials and of the renders.


#### `[look.materials.<name>]`

Materials by name: fur (body, ears, mouth) and gloss (eyes, nose, claws). Each role prop has a material of its own.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `roughness` | num | required | Roughness. |
| `specular` | num | required | Specular IOR level. |

#### `[look.light]`

The soft studio light of the renders and of the viewer.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `hemi` | num | `1.4` | Hemisphere light level. |
| `key` | num | `3.8` | Key light level. |
| `fill` | num | `0.9` | Fill light level. |
| `rim` | num | `0.35` | Rim light level. |
| `key_dir` | vec3 | `[-1.2, 3.5, 3.5]` | Key direction in camera space (right, up, back). |
| `fill_dir` | vec3 | `[3.0, 0.5, 4.0]` | Fill direction in camera space. |
| `rim_dir` | vec3 | `[4.0, 2.5, -6.0]` | Rim direction in camera space. |
| `sky` | rgb | `[251, 250, 248]` | Sky color of the hemisphere light. |
| `ground` | rgb | `[138, 125, 116]` | Ground color of the hemisphere light. |
| `key_color` | rgb | `[255, 251, 244]` | Key color. |
| `fill_color` | rgb | `[246, 246, 248]` | Fill color. |
| `rim_color` | rgb | `[232, 238, 255]` | Rim color. |
| `center_y` | num | `0.55` | Height that the lights aim at. |
| `shadow` | num | `0.3` | Strength of the soft key shadow. |

#### `[compare]`

The compare of the renders with the sheet (viewer/compare.js).

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `rows` | ivec2 | measure | Sheet rows of the compare tiles: [from, to). |
| `fur_band` | vec2 | `[0.25, 0.7]` | Heights of the fur color measure (no head, no feet). |
| `head_share` | num | `0.3` | Height of the head crop as a share of the view height. |
| `facet_crops.<name>` | rect | map | Crops of the front view [x0, y0, x1, y1] in model units, the sheet beside the render. |

#### `[measure]`

The image measures of the eyes, the ears, and the facet shading.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `mesh_belly` | rect | measure | Belly box [x0, y0, x1, y1] of the edge-direction measure of the GLB facets (studio/measure_mesh.py). |

#### `[measure.eyes]`

Eyes: blobs of near-black and near-white pixels in a band of heights.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `band` | vec2 | measure | Low and high height of the band. |
| `white_min` | int | measure | A white pixel has max(rgb) above this (above the background). |
| `white_spread` | int | `45` | A white pixel has max - min under this. |
| `dark_max` | int | `100` | A dark pixel has max(rgb) under this. |
| `max_blob` | int | `600` | Larger blobs are not eyes. |

#### `[measure.ears]`

Ears: measured on the silhouette.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `search` | num | `0.15` | Rows below the top that the ear search reads (share of the height). |
| `notch_span` | num | `0.2` | Rows below the top where the notch can be. |
| `notch_top` | num | `0.08` | Rows below the top where the outer edge is furthest out. |
| `background_diff` | int | `24` | A render pixel differs from the background by more than this sum. |

#### `[measure.shading]`

Facet shading of the front view: the belly contrast and the chords between shading edges.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `belly_box` | rect | measure | Belly crop of the contrast measure. |
| `belly_rows` | nums | measure | Heights of the horizontal chord lines. |
| `belly_half_width` | vec3 | measure | Half width of a chord line below the split, above it, and the split height. |
| `belly_columns` | nums | measure | x of the vertical chord lines. |
| `belly_column_span` | vec2 | measure | Low and high height of the vertical lines. |
| `arm_line` | seg | measure | [[x, y], [x, y]]: the ends of the arm chord line. |
| `arm_offsets` | nums | measure | x offsets of the parallel arm lines. |
| `direction_boxes.<name>` | rect | map | Boxes of the edge-direction histograms. |
| `jump` | num | `3.0` | Smallest luminance step of a shading edge. |

#### `[checks]`

The limits of the checks (studio/checks.py). The fold check is a gate: it fails the build. The role adds its own gate checks (role.toml [checks]). The others are reported.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `iou.<name>` | num | map | Smallest silhouette IoU of each view. |
| `folded_faces` | int | `0` | Most faces folded past 120 degrees in one frame (gate). |
| `rest_inward_faces` | int | `0` | Most faces that point into the body in the rest mesh. |
| `unpaired_vertices` | int | `0` | Most body vertices with no mirror partner. |
| `body_triangles` | vec2 | `[600, 2000]` | Smallest and largest body triangle count. |
| `slivers` | num | `0.01` | Largest share of body faces with an angle under 15 degrees. |
| `fur_color` | vec3 | `[1.0, 0.02, 0.03]` | Largest difference of the fur median from the sheet: hue (degrees), saturation, value. |
| `eye_outline` | num | `0.08` | Largest relative difference of the eye width. |
| `eye_rim` | num | `0.0003` | Largest difference of the white rim width. |
| `ear_size` | num | `0.1` | Largest relative difference of the ear width and height. |
| `facet_contrast` | num | `0.15` | Largest relative difference of the belly fine spread. |

<!-- config-reference:end -->

## Role pack reference

The fields of `roles/<name>/role.toml`.

<!-- role-reference:begin -->

#### `[role]`

The role.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `name` | str | required | Name: the folder name under roles/. |
| `template` | str | `"biped"` | The rig template that the clips need. |
| `stance` | str | required | "standing" or "seated". |
| `doc` | str | required | One line on what the role does. |

#### `[bind]`

The bind pose of the role: joint turns from the pose of the sheet. The mesh is built and bound in this pose, and skinning bends well only near it, so it sits in the middle of the motion range of the role.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `shoulder_flex` | num | required | Forward raise of the upper arms. |
| `shoulder_abduct` | num | required | Outward raise of the upper arms. |
| `elbow_flex` | num | required | Extra bend of the elbows. |
| `hip_flex` | num | `0.0` | Forward raise of the thighs (about 90 for a seated player). |
| `knee_flex` | num | `0.0` | Bend of the knees (about 90 for a seated player). |
| `correctives` | strs | `["arm_down"]` | Corrective shapes of the template between the bind pose and the sheet pose. The biped template has "arm_down". |

#### `[[props]]`

The props of the role, in the order of the joined mesh.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `name` | str | required | Name of the prop, of its bone, and of its material. |
| `kind` | str | `"stick"` | Geometry kind: "stick" (a handle and a tapered shaft). Later kinds: a mesh file of an instrument, a chair, a bench, a stand. |
| `tip_marker` | str | optional | Name of the empty node at the tip (the viewer draws its path). |
| `grip` | vec3 | required | Grip point in the hand frame, from the middle of the paw. |
| `direction` | vec3 | required | Direction of the shaft in the hand frame. |
| `length` | num | required | Length from the grip to the tip. |
| `cast_shadow` | bool | `true` | False for a thin prop: its shadow reads as a line on the body. |
| `contact` | str | `"none"` | The piece of the prop that the contact check tests against the body ("shaft"), or "none". |
| `hidden_in_reference` | bool | `true` | The sheet pose hides the prop (scale 0). |

#### `[props.attach]`

Where the prop attaches.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `bone` | str | required | "hand": a bone of its own, a child of the hand of "side". "scene": a separate node in the scene (a piano, a chair), not skinned. |
| `side` | str | `"R"` | "L" or "R" (for a hand prop). |
| `seat_height` | str | optional | For a seat in the scene: "legs" puts the seat at the height of the bent knees of the bind pose. |

#### `[props.handle]`

The handle: a tube from behind the grip to just past it.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `back` | num | required | Length behind the grip. |
| `steps` | vec2 | required | Second point after the back, third point after the grip. |
| `radii` | vec3 | required | Radius at the three points. |
| `sides` | int | required | Sides of the tube. |
| `color` | rgb | required | Color. |

#### `[props.shaft]`

The shaft: a tapered tube from the grip to the tip.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `start` | num | required | Start after the grip. |
| `middle` | num | required | Middle point after the grip. |
| `radii` | vec3 | required | Radius at the start, the middle, and the tip. |
| `sides` | int | required | Sides of the tube. |
| `color` | rgb | required | Color. |

#### `[props.material]`

The material of the prop.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `roughness` | num | required | Roughness. |
| `specular` | num | required | Specular IOR level. |

#### `[clips]`

The clips.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `fps` | int | `30` | Frames per second of the baked clips. |
| `notes.<name>` | str | map | A short note on each clip (the viewer shows it). |

#### `[targets]`

The body that the IK targets of the clips were made on. On another body the wrist targets move with its shoulders and scale with its arm reach.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `shoulder` | vec3 | required | Left shoulder joint of that body (sheet pose). |
| `reach` | num | required | Arm reach of that body: shoulder to elbow plus elbow to wrist. |

#### `[checks]`

The gate checks of the role: a clip fails above a limit.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `contact_depth` | num | `0.01` | Deepest contact of a test part in any frame, in animal heights. |
| `contact_tests` | strs | `["paw", "forearm", "claws", "props"]` | Parts of each arm that are tested against the rest of the body: paw, forearm, claws, props. |

#### `[review]`

Review outputs of the role.

| Field | Kind | Default | Meaning |
|---|---|---|---|
| `shots` | str | optional | JSON file of the review frames (studio/shoot.mjs frames). |
| `blender` | strs | optional | Blender scripts of the role that the shots stage runs (for example a plot of a baton path). |

<!-- role-reference:end -->
