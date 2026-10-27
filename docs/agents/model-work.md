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
| bear | the T-pose mesh `assets/models/bear/bear-tpose.glb` with its own faces and quad tubes on the arms (`bear-arms.glb`, `tools/blender/bear_arms.py`), rigged by `pnpm rig-mesh bear` with Blender weights, arm segments and helpers, with the size of the studio bear, a crease angle of 40°, and the color blend of the fur, standing on the podium, with the baton along the index finger | `2026-10-22-studio-bears.md`, `2026-10-23-bear-tpose.md`, `2026-10-26-arm-fixes.md`, `2026-10-26-fifth-review-bears.md` | `conductor` |
| polar-bear | the T-pose mesh `assets/models/polar-bear/polar-bear-tpose.glb` with its own faces, quad tubes on the arms (`polar-bear-arms.glb`, `tools/blender/polar_bear_arms.py`), and quad tubes on the legs (`polar-bear-limbs.glb`, `tools/blender/polar_bear_legs.py`), rigged by `pnpm rig-mesh polar-bear` with Blender weights, arm segments and helpers, dual quaternion knees in the seated bind (`bind.knee`) with a smoothed crease at the back of each knee, the bone heat of the copy before the leg rebuild (`heatSource`), and the leg factor 1.6, on the bench of the rig, at 0.85 of the size of the studio polar bear, upright at a piano of `PIANO_SCALE` near the keys, with the claws on the key tops and the right foot on the damper pedal in the play and the paws on the thighs at rest, a crease angle of 40°, and the color blend of the fur | `2026-10-22-studio-bears.md`, `2026-10-24-polar-bear-tpose.md`, `2026-10-24-polar-bear-seat.md`, `2026-10-24-polar-bear-arms.md`, `2026-10-24-pianist-pose.md`, `2026-10-24-piano-pedals.md`, `2026-10-26-fourth-review.md`, `2026-10-26-fifth-review-bears.md`, `2026-10-27-polar-legs-rebuild.md` | `pianist` |
| rabbit | the A-pose mesh of the user with quad arm faces and arms 1.15 times longer (`assets/models/rabbit/rabbit-arms.glb`, `tools/blender/violin_arms.py`), rigged by `pnpm rig-mesh rabbit` with Blender weights, arm segments, and a bind left paw supinated 100° (`bindSupination`), and a violin of 0.83 | `2026-10-13-mesh-rabbit.md`, `2026-10-23-rabbit-arms.md`, `2026-10-24-rabbit-hold.md`, `2026-10-24-violin-arms.md`, `2026-10-26-fourth-review.md`, `2026-10-27-left-paw-bind.md` | `violinist` |
| fox-red | the mesh of the user with quad arms 1.21 times longer (`fox-arms.glb`, `tools/blender/fox_arms.py`), rigged by `pnpm rig-mesh fox` with arm segments, a bind left paw supinated 110° (`bindSupination`), and a tail of two bones | `2026-10-14-mesh-fox.md`, `2026-10-25-fox-arms.md`, `2026-10-27-left-paw-bind.md` | `fox-violinist` |
| fox-tan | the rig of the red fox with a tan palette | `2026-10-14-fox-flute.md`, `2026-10-25-fox-arms.md`, `2026-10-27-left-paw-bind.md` | `flutist` |
| cat | the mesh of the user with quad arm faces, a side wall under each arm, and arms 1.10 H long, the upper arm 0.92 and the forearm 0.78 as long as on the mesh (`assets/models/cat/cat-arms.glb`, `tools/blender/cat_arms.py`), rigged by `pnpm rig-mesh cat` with Blender weights on the arms, arm segments, a flipped quad diagonal at the inner right elbow (`refine.pointFlip`), a bind upper arm nearer to the hanging arm, the skin normals of the arm roots (`rootNormals`), and a bind left paw supinated 120° (`bindSupination`), and a 1/2 viola (`violaScale` 0.87) | `2026-10-16-mesh-cat.md`, `2026-10-25-cat-arms.md`, `2026-10-26-third-review.md`, `2026-10-27-left-paw-bind.md`, `2026-10-27-cat-fox.md`, `2026-10-27-cat-fox2.md` | `violist` |
| dog | the mesh `assets/models/dog/dog.glb`, rigged by `pnpm rig-mesh dog` from a copy with a round inner side of each arm (`dog-arms.glb`), with a cut of each arm seam and a chest share of the inner arm root (`weights.armRoot`) | `2026-10-17-mesh-dog.md` | `cellist` |
| panda | the mesh `assets/models/panda/panda.glb`, rigged by `pnpm rig-mesh panda` | `2026-10-18-mesh-panda.md` | `trombonist` |
| hippo | the mesh of the user with a seam cut, a side wall, quad arm faces, and arms 1.5 times longer (`assets/models/hippo/hippo-arms.glb`, `tools/blender/hippo_arms.py`), rigged by `pnpm rig-mesh hippo` with Blender weights, arm segments, and the skin normals of the arm roots and the elbows (`rootNormals`), standing at the contrabass, with eyes of 0.8 of the pea eye size | `2026-10-18-mesh-hippo.md`, `2026-10-25-elephant-hippo-creases.md`, `2026-10-25-hippo-skin.md`, `2026-10-25-hippo-arms.md`, `2026-10-26-third-review.md` | `bassist` |
| mouse | the mesh of the user with quad arm faces and arms 1.25 times longer (`assets/models/mouse/mouse-arms.glb`, `tools/blender/wind_arms.py`), rigged by `pnpm rig-mesh mouse` at the size of the parametric mouse, with Blender weights and arm segments, with a long tail of two bones on the floor, a smaller oboe, and no chair (`noChair`) | `2026-10-19-mesh-mouse.md`, `2026-10-25-wind-arms.md` | `oboist` |
| elephant | the A-pose mesh of the user with quad arm faces, flatter inner upper arms, and the arm length of the mesh (`assets/models/elephant/elephant-arms.glb`, `tools/blender/elephant_arms.py`), rigged by `pnpm rig-mesh elephant` with Blender weights, arm segments, and the skin normals at the elbows (`rootNormals`), no cut and no split, standing at the timpani, with the trunk on the head and eyes of 0.6 of the pea eye size | `2026-10-19-mesh-elephant.md`, `2026-10-23-elephant-apose.md`, `2026-10-25-elephant-arms.md`, `2026-10-25-elephant-hippo-creases.md`, `2026-10-25-thick-arm-depth.md` | `timpanist` |
| beaver | the mesh `assets/models/beaver/beaver.glb`, rigged by `pnpm rig-mesh beaver` at the size of the parametric beaver, with the skin normals at the arm roots (`rootNormals`), a broad tail of two bones on the floor, a smaller bassoon, and no chair (`noChair`) | `2026-10-19-mesh-beaver.md`, `2026-10-25-beaver-rhino-arms.md` | `bassoonist` |
| pig | the mesh `assets/models/pig/pig.glb`, rigged by `pnpm rig-mesh pig` from a copy with round upper arms free of the trunk (`pig-arms.glb`), at the size of the parametric pig, with a twist bone of each upper arm and a horn hold turned back toward the body | `2026-10-19-mesh-pig.md` | `hornist` |
| wolf | the mesh of the user with quad arm faces and arms 1.178 times longer (`assets/models/wolf/wolf-arms.glb`, `tools/blender/wind_arms.py`), rigged by `pnpm rig-mesh wolf` 0.9 times as high and 1.2 times as wide as the mesh, with the head at the size of the red fox and the body 0.9422 times as large (`proportions`), with Blender weights, arm segments, a bind elbow bent forward, and bind paws supinated 109.5° (left) and 100.5° (right) (`bindArms`, `bindSupination`), with a bushy tail of two bones that hangs behind the seat, and a clarinet hold at 30° with the mouthpiece under the muzzle and the bell against the right knee at rest | `2026-10-20-mesh-wolf.md`, `2026-10-25-wind-arms.md`, `2026-10-27-wolf-knee.md`, `2026-10-27-wolf-bind.md` | `clarinetist` |
| badger | the mesh `assets/models/badger/badger.glb`, rigged by `pnpm rig-mesh badger` at the size of the parametric badger, standing at each percussion instrument, with its own arms, a tail ball, and a suspended cymbal (`cymbalForm`) | `2026-10-20-mesh-badger.md` | `bass-drummer`, `snare-drummer`, `cymbalist`, `percussionist`, `xylophonist` |
| monkey | the mesh `assets/models/monkey/monkey.glb`, rigged by `pnpm rig-mesh monkey` at 1.1 times the size of the parametric monkey, with arms 1.2, a long tail of two bones with its curl on the floor, a smaller trumpet, and no chair (`noChair`), standing with its feet under its hips and its trunk leaned forward (`2026-10-21-monkey-stand.md`) | `2026-10-20-mesh-monkey.md` | `trumpeter` |
| rhino | the A-pose mesh of the user with quad arm faces and flatter inner upper arms (`assets/models/rhino/rhino-apose-arms.glb`, `tools/blender/rhino_arms.py`), rigged by `pnpm rig-mesh rhino` with Blender weights, arm segments, the rule weights on the paws, a bind elbow bent forward, the skin normals at the arm roots (`rootNormals`), and a tail ball, at the size of the parametric rhino, standing in each seat at a tuba with a longer lead pipe | `2026-10-21-mesh-rhino.md`, `2026-10-23-rhino-apose.md`, `2026-10-25-beaver-rhino-arms.md`, `2026-10-26-fifth-review-rhino.md` | `tubist` |
| deer | the mesh of the user with a side wall under each arm, quad arm faces, and arms 1.25 times longer (`assets/models/deer/deer-arms.glb`, `tools/blender/deer_arms.py`), rigged by `pnpm rig-mesh deer` with Blender weights, arm segments, the skin normals of the arm roots (`rootNormals`), and a bind upper arm nearer to the hanging arm, at 1.2 times the size of the parametric deer, with a puff tail ball, the ears and the antlers on the head, the whole haunch on the stool of the harp, and a smaller harp (`harpScale`) leaned back onto its right shoulder, on a box | `2026-10-21-mesh-deer.md`, `2026-10-25-harp-lean.md`, `2026-10-26-fifth-review-deer.md` | `harpist` |
| penguin | the mesh `assets/models/penguin/penguin.glb`, rigged by `pnpm rig-mesh penguin` at the head top of the egg penguin, with the flippers of the mesh as arms, a jaw bone of the beak that `penguin-beak.glb` splits, and a tail ball, standing on its riser with the folder in front of the chest, a crease angle of 60°, and the color blend 0.7, so that its sides look round | `2026-10-21-mesh-penguin.md`, `2026-10-26-second-review.md` | `singer` |

No species has the parametric body of 2026-10-06 (`docs/decisions/2026-10-11-body-revert.md`).
The penguin has no sheet, so `pnpm choir-check <dir>` compares it with the choir of the two newest
reference images. The GLB files `assets/models/rabbit/rabbit.glb` and `assets/models/bear/bear.glb`
of the user stay for the tools of route 1.

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
2026-10-10. The route: add the sheet to `VIEW_SHEETS` with a matte config, measure the sheet in
head heights, build the body with `ringLoft()`, `addPainted()`, `limbTube()`, and the face plates
of the egg penguin, and compare it with `pnpm sheet-check <id> <dir>` in each round.
`git show 4c3d3f7e:docs/agents/model-work.md` gives its steps and its traps in full.

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
of route 3 follow. When the arms twist or fold, rebuild them in Blender with
[`rig-blender.md`](rig-blender.md): quad arm faces, Blender weights, and arm segments.

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
