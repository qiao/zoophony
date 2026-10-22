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
| bear | the mesh `assets/models/bear/bear-mesh.glb`, rigged by `pnpm rig-mesh bear` near the size of the studio bear, with the arms of the mesh, a cut of each arm seam, a tail ball, and the baton along the index finger, standing on the podium | `2026-10-22-mesh-bear.md` | `conductor` |
| polar-bear | the mesh `assets/models/polar-bear/polar-bear-mesh.glb`, rigged by `pnpm rig-mesh polar-bear` at the skull top of the studio polar bear, with arms 1.25, a cut of each arm seam, a twist bone of each upper arm, and a tail ball, on level thighs from hip joints in the haunch, on a piano bench that fits its legs | `2026-10-22-mesh-polar-bear.md` | `pianist` |
| rabbit | the mesh `assets/models/rabbit/rabbit-4.glb`, rigged by `pnpm rig-mesh rabbit` from a copy with a shallower notch under the right arm, rounder upper arms, and a round inner side of each arm (`rabbit-4-elbows.glb`) | `2026-10-13-mesh-rabbit.md` | `violinist` |
| fox-red | the mesh `assets/models/fox/fox.glb`, rigged by `pnpm rig-mesh fox`, with a tail of two bones | `2026-10-14-mesh-fox.md` | `fox-violinist` |
| fox-tan | the rig of the red fox with a tan palette | `2026-10-14-fox-flute.md` | `flutist` |
| cat | the mesh `assets/models/cat/cat.glb`, rigged by `pnpm rig-mesh cat` | `2026-10-16-mesh-cat.md` | `violist` |
| dog | the mesh `assets/models/dog/dog.glb`, rigged by `pnpm rig-mesh dog` | `2026-10-17-mesh-dog.md` | `cellist` |
| panda | the mesh `assets/models/panda/panda.glb`, rigged by `pnpm rig-mesh panda` | `2026-10-18-mesh-panda.md` | `trombonist` |
| hippo | the mesh `assets/models/hippo/hippo.glb`, rigged by `pnpm rig-mesh hippo`, standing at the contrabass | `2026-10-18-mesh-hippo.md` | `bassist` |
| mouse | the mesh `assets/models/mouse/mouse.glb`, rigged by `pnpm rig-mesh mouse` at the size of the parametric mouse, with a long tail of two bones on the floor, a smaller oboe, and no chair (`noChair`) | `2026-10-19-mesh-mouse.md` | `oboist` |
| elephant | the mesh `assets/models/elephant/elephant.glb`, rigged by `pnpm rig-mesh elephant`, standing at the timpani, with the trunk on the head | `2026-10-19-mesh-elephant.md` | `timpanist` |
| beaver | the mesh `assets/models/beaver/beaver.glb`, rigged by `pnpm rig-mesh beaver` at the size of the parametric beaver, with a broad tail of two bones on the floor, a smaller bassoon, and no chair (`noChair`) | `2026-10-19-mesh-beaver.md` | `bassoonist` |
| pig | the mesh `assets/models/pig/pig.glb`, rigged by `pnpm rig-mesh pig` from a copy with round upper arms free of the trunk (`pig-arms.glb`), at the size of the parametric pig, with a twist bone of each upper arm and a horn hold turned back toward the body | `2026-10-19-mesh-pig.md` | `hornist` |
| wolf | the mesh `assets/models/wolf/wolf.glb`, rigged by `pnpm rig-mesh wolf` 0.9 times as high and 1.2 times as wide as the mesh, with the head at the size of the red fox and the body 0.9422 times as large (`proportions`), with a bushy tail of two bones that hangs behind the seat, and a clarinet hold at 45° with the mouthpiece under the muzzle | `2026-10-20-mesh-wolf.md` | `clarinetist` |
| badger | the mesh `assets/models/badger/badger.glb`, rigged by `pnpm rig-mesh badger` at the size of the parametric badger, standing at each percussion instrument, with its own arms, a tail ball, and a suspended cymbal (`cymbalForm`) | `2026-10-20-mesh-badger.md` | `bass-drummer`, `snare-drummer`, `cymbalist`, `percussionist`, `xylophonist` |
| monkey | the mesh `assets/models/monkey/monkey.glb`, rigged by `pnpm rig-mesh monkey` at 1.1 times the size of the parametric monkey, with arms 1.5, a long tail of two bones with its curl on the floor, a smaller trumpet, and no chair (`noChair`), standing with its feet under its hips and its trunk leaned forward (`2026-10-21-monkey-stand.md`) | `2026-10-20-mesh-monkey.md` | `trumpeter` |
| rhino | the mesh `assets/models/rhino/rhino.glb`, rigged by `pnpm rig-mesh rhino` at the size of the parametric rhino, with the arms of the mesh, a free arm and a cut of the seam where each thick arm joins the trunk, a twist bone of each upper arm, and a tail ball, standing in each seat at a tuba with a longer lead pipe | `2026-10-21-mesh-rhino.md` | `tubist` |
| deer | the mesh `assets/models/deer/deer.glb`, rigged by `pnpm rig-mesh deer` at 1.2 times the size of the parametric deer, with arms 1.25, a puff tail ball, the ears and the antlers on the head, the whole haunch on the stool of the harp, and a smaller harp (`harpScale`) | `2026-10-21-mesh-deer.md` | `harpist` |
| penguin | the mesh `assets/models/penguin/penguin.glb`, rigged by `pnpm rig-mesh penguin` at the head top of the egg penguin, with the flippers of the mesh as arms, a jaw bone of the beak that `penguin-beak.glb` splits, and a tail ball, standing on its riser with the folder in front of the chest | `2026-10-21-mesh-penguin.md` | `singer` |

No species has the parametric body of 2026-10-06 18:58 since the meshes of the rhino and the deer
(`docs/decisions/2026-10-11-body-revert.md`). `pnpm sheet-check <id> <dir>` compares a parametric
body with its
sheet. The penguin has no sheet, so `pnpm choir-check <dir>` compares it with the choir of the two
newest reference images. The GLB files `assets/models/rabbit/rabbit.glb` and
`assets/models/bear/bear.glb` of the user stay for the tools of route 1. No species uses them.

## The arm gate

Five rounds met their own arm measure and shipped a twisted arm (`2026-10-19-arm-gate.md`). Each
round that changes a hold, a rig, a pose, an instrument size, or a seat runs
`pnpm arm-check <roles> --base <start> --views <dir>` before its report, and puts the table and the
crop pairs into the report. A `FAIL` makes the round not done, and a better number with a worse
look is not done. To find a fast turn of a paw, `pnpm arm-check <role> --trace <demo>:<from>-<to>`
gives the paw angles at steps of 0.01 s in about 1 s. To compare old commits, use
`pnpm arm-check <role>... --states <ref>,...`. The merge of a branch that changes `src/pose/`, `src/models/`, or
`tools/blender/` runs the gate of all roles (`tools/merge-branch.sh`).

The grip turn compares each paw with its accepted grip (`ACCEPTED_GRIPS` of `tools/arm-check.ts`).
A role with no entry gets no grip check, so a new role adds its entry, and a round that changes a
grip on purpose updates its entry. Add or change an entry only after the manager accepts the 2x
paw crops at a strike and at rest.

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

No species has such a body since 2026-10-21. `git show c4951160:src/models/penguin/<file>` gives
the egg penguin of 2026-10-11, and `git show b9f71daf:src/models/fox/<file>` the fox body of
2026-10-10.

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
3. Build the body with the shared parts of the egg penguin, which `git show c4951160:<path>` gives
   back: `ringLoft()` of `src/models/primitives.ts`, `addPainted()` of `src/models/painted.ts`,
   `limbTube()` of `src/models/limb-tube.ts`, and the plates of `src/models/face-plates.ts`.
   Select it with `SpeciesParams.body` and the dispatch of `buildBiped()`.
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
     depth of the chair of the studio. A wide haunch takes a wider chair (`seatWidth`). A small
     body can keep its seated pose with no chair (`SpeciesParams.noChair`);
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
   `pnpm pose-depth <role>` when the arms, the paws, the instrument, or the body move. Scan the
   reach of the note targets with `pnpm pose-depth <role> --targets --set <changes>` first. Add
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
   target reach (`app.reach`). When the user asks for a body that is shorter or wider than the
   mesh, give `proportions` a factor for each axis. The joints and the rules are then in the units
   of the scaled source, and a height factor also scales `app.shoulders` and the height of
   `ANIMALS` (`shape_config.py` of `docs/research/2026-10-20-wolf-shape/`). When the head must
   keep its form, add `"keep": "head"` and `blend`, the heights of a blend zone on the neck before
   the factors, and `head` for a head of another size. Put the zone above the tops of the
   shoulders, because a zone there can fold them, and map the places with `size_config.py` of
   `docs/research/2026-10-20-wolf-face/`. A larger head grows `H`, so fit the holds again.
   A sharp crease of the source that shades as a sad brow takes `soften`: the vertices of its
   edges in a box move toward their neighbors, at most `most` units. A color rule cannot remove
   such a line (`docs/research/2026-10-20-wolf-brows.md`).
2. Make the mid-report with one command:
   `pnpm mesh-options <animal> <dir> --size <label>=<head top>... --legs <f>,... --arms <f>,...
   --instrument <id>`. Take each size from the head top of a body of `main`, and each arm factor
   from a target, such as the reach of the body of `main` or the arm to trunk ratio of another
   mesh. The table gives the reach of the hold on the real body for each arm factor. Fix each
   warning of the rigs before the question. A seat warning gives a `chair.front` that puts the
   seat under the haunch, because the thighs set the seat top. An eye warning means that the eye
   box takes most of a dark patch, so make the box hold only the eye. A colors warning means that
   dark fur takes the color of its dark samples, so set the `colors.dark` that it gives. Ask the user
   about the size, the arms, and the legs with `options.md` and `options.png`, then set them. To
   probe a rig of `<dir>/rigs/` further, such as with
   `pnpm hold-reach <species> --instrument <id> --set <changes> --glb <file>`, set `app.shoulders`
   of the config to the value of its row first. With no `--check`, `pnpm rig-mesh` stops when the
   reach misses the target by more than 1%.
3. Look at the seated bind, the standing body, the knees, and the main bones with
   `--check --preview <dir>`. Before a change of a weight rule, read the weights of the faces that
   fold with `pnpm fold-probe <role> --faces <n>`. Its column of the source middles gives the
   points of `weights.rigid`. Fit each corrective shape with
   `pnpm raise-fit <role> --faces <list> --side <side> --json <file>`, and try its entry with
   `--check --set 'raise+=@<file>'`. Try each other variant with `--check --set <path>=<value>`.
4. Run `--check` after each change of the config or the script, and before the first docs commit.
   The triangles stay in the budget, the packed mesh in its gzip budget, and the standing body
   within 1 mm of the long-armed source. Read the seat, the violin rule, the folds, and the lowest
   point of each leg and of the tail. Probe a rig with `--glb <file>` before the swap. Only the
   last commit of a series of rig commits writes the GLB file again.
