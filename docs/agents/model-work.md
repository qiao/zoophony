# Model work

This module of `AGENTS.md` gives the bodies of the app and the three routes that give a species a
body of its own (design 4.4). The reference images are the target of each body (`AGENTS.md`,
"Where the truth lives"). Prefer route 1 when the user gives a rigged model: it takes minutes, and
route 2 takes hours. Use route 3 when the user asks for an animal of `lowpoly-studio/`, or gives a
mesh with no skeleton. The traps of route 3 are in [`model-traps.md`](model-traps.md).

## Bodies and roles

Each body has its main decision file. `tools/decision-rows.sh <species>` lists the later rows. The
roles are the names that `pnpm fold-probe`, `pnpm hold-fit`, and `pnpm close-views` take. The
sweep of `pnpm pose-depth` takes the same names, but `violinist` sweeps the rabbit and the red
fox together.

| Species | Body | Main decision file | Role |
|---|---|---|---|
| bear | the studio bear (route 3) | `2026-10-12-studio-bear.md` | `conductor` |
| polar-bear | the studio polar bear (route 3) | `2026-10-12-studio-polar-bear.md` | `pianist` |
| rabbit | the mesh `assets/models/rabbit/rabbit-4.glb`, rigged by `pnpm rig-mesh rabbit` | `2026-10-13-mesh-rabbit.md` | `violinist` |
| fox-red | the mesh `assets/models/fox/fox.glb`, rigged by `pnpm rig-mesh fox`, with a tail of two bones | `2026-10-14-mesh-fox.md` | `fox-violinist` |
| fox-tan | the rig of the red fox with a tan palette | `2026-10-14-fox-flute.md` | `flutist` |
| cat | the mesh `assets/models/cat/cat.glb`, rigged by `pnpm rig-mesh cat` | `2026-10-16-mesh-cat.md` | `violist` |
| dog | the mesh `assets/models/dog/dog.glb`, rigged by `pnpm rig-mesh dog` | `2026-10-17-mesh-dog.md` | `cellist` |
| panda | the mesh `assets/models/panda/panda.glb`, rigged by `pnpm rig-mesh panda` | `2026-10-18-mesh-panda.md` | `trombonist` |
| hippo | the mesh `assets/models/hippo/hippo.glb`, rigged by `pnpm rig-mesh hippo`, standing at the contrabass | `2026-10-18-mesh-hippo.md` | `bassist` |
| mouse | the mesh `assets/models/mouse/mouse.glb`, rigged by `pnpm rig-mesh mouse`, with a long tail of two bones on the floor | `2026-10-19-mesh-mouse.md` | `oboist` |
| elephant | the mesh `assets/models/elephant/elephant.glb`, rigged by `pnpm rig-mesh elephant`, standing at the timpani, with the trunk on the head | `2026-10-19-mesh-elephant.md` | `timpanist` |
| penguin | an egg body in code, `src/models/penguin/` (route 2) | `2026-10-11-penguin-body.md` | none |

Each other species has the parametric body of 2026-10-06 18:58
(`docs/decisions/2026-10-11-body-revert.md`). `pnpm sheet-check <id> <dir>` compares it with its
sheet. The penguin has no sheet, so `pnpm choir-check <dir>` compares it with the choir of the two
newest reference images. The GLB files `assets/models/rabbit/rabbit.glb` and
`assets/models/bear/bear.glb` of the user stay for the tools of route 1. No species uses them.

## Route 1: a rigged GLB file

The user gives a model in a T-pose with a Mixamo skeleton. The app has no code of a rigged body
since 2026-10-11. Before step 3, bring back the code of 2026-10-10 with
`git show 773e0a69:<path>`: `src/models/rigged-body.ts` with its test, the dispatch in
`buildBiped()` and `SpeciesParams.rigged`, the seat drop in `seatHeights()` of
`src/models/props.ts`, and the skin materials of `src/scene/player-materials.ts`.

```text
 <glb> --pnpm glb-init--> assets/models/<s>/ + tools/glb-bodies/<s>.json --> skin.png
                                                     ^                       bones.png
                                                     |                           |
                                                     +-- edit, pnpm rig-body <---+
                                                         <s> --preview <dir>
 src/models/rigged/<s>.ts + <s>-skin.webp --> SPECIES[<s>].rigged --> pnpm test --> pnpm snapshot
```

1. Run `pnpm glb-init <species> <glb> --preview <dir>`. It copies the file and proposes the
   config.
2. Read `skin.png` and `bones.png`. When a part is wrong, edit the config, and run
   `pnpm rig-body <species> --preview <dir>`. A tail needs a reach for `tail1`. A model with no
   tail can get a ball (`tail`). A skeleton with no Mixamo names needs a joint map by hand.
3. Run `pnpm rig-body <species>`, and give the species `rigged` with the constant of the module.
4. Keep the mesh of the user as it is, and do not stretch its limbs, unless the user asks for the
   look of a reference image. Then use `shape`, `eyeLook`, or `tail` of the config, and compare
   with `pnpm sheet-check <id> <dir>`. A wider body grows the stages, so run
   `pnpm test:paused src/models/layout-scene.test.ts`. Remove each check that was tuned on the
   parametric bodies and fails on the model, and list it in the commit message (user,
   2026-10-10).
5. Run `pnpm snapshot`. Look at the play frame, the close view, and the knees from the side, and
   add a decision row. When the weights of the file put the haunch on the thigh, the knee stands up
   high. Give the haunch to the hips with `haunch`.

## Route 2: a body built in code

The penguin has such a body. `git show b9f71daf:src/models/fox/<file>` gives the fox body of
2026-10-10 as a second example. For the penguin, `pnpm choir-check <dir>` takes the place of steps
1 and 4.

```text
 <id>-views.png --make_matte.py + <id>.json--> tools/sheet-mattes/<id>.png --+
                                                                             v
 src/models/<species>/ --> views.html?sheet=<id> --> pnpm sheet-check --> IoU, row diffs,
         ^                                                                colors, rows.txt
         +-------------------------- edit, one round ---------------------------+
```

1. Add the sheet to `VIEW_SHEETS`: the scale, the floor, the turns, the shadows, and the light.
   Write the matte config, and check the matte with its check image.
2. Measure the sheet in head heights of the sheet animal: the head, the joints, the widths, and the
   depths. Set the skeleton (`proportions`) from these measures.
3. Build the body with the shared parts: `ringLoft()` of `models/primitives.ts`, `addPainted()` of
   `models/painted.ts`, `limbTube()` of `models/limb-tube.ts`, and the plates of
   `models/face-plates.ts`. Select it with `SpeciesParams.body` and the dispatch of `buildBiped()`.
4. In each round, run `pnpm sheet-check <id> <dir>`, and change the largest difference first. Tune
   a pose with `pnpm pose-probe <id> --set <changes>`.
5. Record the measures in a research report and the decisions in a decision file.

The traps of route 2:

- The baked occlusion (design 4.5) draws a dark line where two body bones meet on a concave
  surface. Keep the regions that do not move against each other in one part, such as a torso on
  `spine`.
- In a side view, a far limb that is further forward shows in front of the near limb. Compare the
  runs in `<id>-rows.txt` before you move a joint.
- A sheet from an image model can disagree between its views. Measure each view, and choose the
  value that keeps each view close.
- The holds are in head heights, so a new head height moves each hold. Scale the holds first, then
  tune them.
- The colors of a sheet page pass through its light. Change that light only for a sheet with a
  different light, such as the soft light of `bear-views.png`.

## Route 3: a studio body

The studio builds the GLB file, or `pnpm rig-mesh` rigs a mesh of the user into that format
(below). The app keeps its own motion. It drives the bones of the studio from the pose of the
player on each frame (`poseStudioBones()` of `src/models/studio-rig.ts`). A manager briefs a round
from `docs/briefs/studio-body.md`.

`lowpoly-studio/` is a separate project that builds rigged low-poly animals from a reference
sheet, with one config for each animal and one role pack for each role. It is outside the rules of
`AGENTS.md`, and the lint skips it. Run its CLI in its folder, such as
`python3 studio build <animal>`. Its `README.md` gives the commands. The app imports no studio
code.

```text
 python3 studio build <animal> --> lowpoly-studio/animals/<animal>/out/<animal>.glb
        | pnpm studio-body <animal> (no Blender)
        v
 src/models/studio/<animal>.ts --> STUDIO_BODIES of models/studio-body.ts --> SPECIES[<s>].body
        --> pnpm test --> pnpm close-views <role> <dir> --> pnpm snapshot
```

1. Run `pnpm studio-body <animal> --inspect` first. For a violin or a viola, the manager compares
   the reach with the instrument before the round (the brief template, section 1). The meters hold
   only at the scale of the entry of the animal in `ANIMALS` of `tools/studio-body.ts`. Add the
   animal to `ANIMALS` with:
   - the landmark of its scale: the shoulder joints of a standing role, or the keys of a pianist;
   - a crease angle for the smooth normals of its fur: the angle whose facet contrast is nearest
     to its reference crops (`docs/research/2026-10-14-rabbit-smooth.md`). When each render has
     less contrast than the references, compare the play frames;
   - the mark of a seated role: the export drops it onto its seat, which fits its legs, with the
     depth of the chair of the studio. A wide haunch takes a wider chair (`seatWidth`);
   - `soloist` for a seated role that also stands: the export keeps its leg shapes and leg turns.
2. Run `pnpm studio-body <animal>` after each change of the GLB file. Add the module to
   `STUDIO_BODIES`, and give the species the body.
3. Fit the holds in the `H` of the new body, because the pose drives the arms by their joints. A
   new role adds its entries in the same commit:
   - `SWEEP_ROLES` of `pose/test-sweep-roles.ts`: its moving parts, its obstacles with the shells
     of its instrument, its sample sets, and its limits. After the test pause, it also adds its
     shard files `pose/<role>-clearance-<k>.test.ts`, as `pose/test-pianist-clearance.ts` does;
   - `FOLD_ROLES` of `tools/fold-probe.ts`, and `ROLE_VIEWS` of `tools/close-views.ts` with the
     camera `{ kind: 'body', zoom: 1, elevation }`;
   - its row in the table "Bodies and roles" above, and in the pose index of design 5.

   Then tune with the probes of [`commands.md`](commands.md): `pnpm hold-fit <role> --set` for
   each variant, `pnpm hold-reach <species>` for a violin, a viola, or a wind instrument, and
   `pnpm pose-depth <role>` when the arms, the paws, the instrument, or the body move. Add
   `--gaps` near the head or the paws. Run `pnpm body-probe --base main` after a change of shared
   pose or model code: the poses of the other players do not change.
4. Run `pnpm snapshot`. Record the measures in a research report and the decisions in a decision
   file.

### A mesh with no skeleton into route 3

`pnpm rig-mesh <animal>` rigs a textured mesh of the user with no skeleton into the GLB format of a
studio body. Name the rigged file in `glb` of the entry of the animal in `ANIMALS`. Then the steps
of route 3 follow.

```text
 assets/models/<s>/<file>.glb + tools/mesh-rigs/<animal>.json
        | pnpm rig-mesh <animal> --preview <dir> (Blender)
        v
 <output>.glb (fur, gloss, chair, 30 joints, 4 or 5 shapes, clip reference) --> pnpm studio-body
```

1. Measure the joints on cuts of the mesh, as `docs/research/2026-10-13-rabbit-mesh/sections.py`
   does, and write them in the config with a note on each measure. The right side mirrors the
   left side. Start with the arm factor 1, the leg factor 1, and the rule of the thin faces
   (`check.thin`). The first line of `pnpm rig-mesh <animal> --check` gives the arm factor of the
   target reach (`app.reach`).
2. Make the mid-report with one command:
   `pnpm mesh-options <animal> <dir> --size <label>=<head top>... --legs <f>,... --arms <f>,...
   --instrument <id>`. Take each size from the head top of a body of `main`, and each arm factor
   from a target, such as the reach of the body of `main` or the arm to trunk ratio of another
   mesh. The table gives the reach of the hold on the real body for each arm factor. Fix each
   warning of the rigs before the question. A seat warning gives a `chair.front` that puts the
   seat under the haunch, because the thighs set the seat top. An eye warning means that the eye
   box takes most of a dark patch, so make the box hold only the eye. Ask the user
   about the size, the arms, and the legs with `options.md` and `options.png`, then set them. To
   probe a rig of `<dir>/rigs/` further, such as with
   `pnpm hold-reach <species> --instrument <id> --set <changes> --glb <file>`, set `app.shoulders`
   of the config to the value of its row first. With no `--check`, `pnpm rig-mesh` stops when the
   reach misses the target by more than 1%.
3. Look at the seated bind, the standing body, the knees, and the main bones with
   `--check --preview <dir>`. Before a change of a weight rule, read the weights of the faces that
   fold with `pnpm fold-probe <role> --faces <n>`. Try each variant with
   `--check --set <path>=<value>`.
4. Run `--check` after each change of the config or the script, and before the first docs commit.
   The triangles stay in the budget, the packed mesh in its gzip budget, and the standing body
   within 1 mm of the long-armed source. Read the seat, the violin rule, the folds, and the lowest
   point of each leg and of the tail. Probe a rig with `--glb <file>` before the swap. Only the
   last commit of a series of rig commits writes the GLB file again.
