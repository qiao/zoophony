# Model work

This module of `AGENTS.md` gives the routes that give a species a body of its own, and their traps.

A species gets a body of its own by one of three routes (design 4.4). Prefer the GLB route when the
user gives a model: it takes minutes, and the code route takes hours. Use route 3 when the user
asks for an animal of `lowpoly-studio/` in the app, or gives a mesh with no skeleton.

**Route 1: a rigged GLB file.** The user gives a model in a T-pose with a Mixamo skeleton. Since
2026-10-11, the app has no code of a rigged body. Before step 3, bring back the code of
2026-10-10 with `git show 773e0a69:<path>`: `src/models/rigged-body.ts` with its test, the
dispatch in `buildBiped()` and `SpeciesParams.rigged`, the seat drop of a rigged body in
`seatHeights()` of `src/models/props.ts`, and the skin materials of
`src/scene/player-materials.ts` (design 4.4, rigged bodies).

```text
 <glb> --pnpm glb-init--> assets/models/<s>/ + tools/glb-bodies/<s>.json --> skin.png
                                                     ^                       bones.png
                                                     |                           |
                                                     +-- edit, pnpm rig-body <---+
                                                         <s> --preview <dir>
 src/models/rigged/<s>.ts + <s>-skin.webp --> SPECIES[<s>].rigged --> pnpm test --> pnpm snapshot
```

1. Run `pnpm glb-init <species> <glb> --preview <dir>`. It copies the file with its README and
   proposes the config.
2. Read `skin.png` and `bones.png`: the baked skin with the eyes and the nose, the ear bones, and
   the finger blocks. When a part is wrong, edit the config, and run
   `pnpm rig-body <species> --preview <dir>`. A model with a tail needs a reach for `tail1`. A
   model with no tail can get a ball (`tail` of the config). A skeleton with no Mixamo names
   needs a joint map by hand. The preview of `glb-init` keeps the colors of the file. The skin
   of `pnpm rig-body` takes the colors of the species.
3. Run `pnpm rig-body <species>`, and give the species `rigged` with the constant of the module.
4. Run `pnpm test`. Keep the mesh of the user as it is, and do not stretch its limbs, unless the
   user asks for the look of a reference image. Then give the config a `shape` (a scale for each
   joint), an `eyeLook`, or a `tail`, and compare the sheet page with
   `pnpm sheet-check <id> <dir>`. A wider body grows the stages. The paused test
   `models/layout-scene.test.ts` limits the growth, so run
   `pnpm test:paused src/models/layout-scene.test.ts` for a wider body. The seats fit its legs.
   Fix the tests of the new code.
   Remove each check of `pnpm test` that was tuned on the parametric bodies and fails on the
   reach or the size of the model, and list it in the commit message (user decisions of
   2026-10-10). A model round does not fix or remove a paused test.
5. Run `pnpm snapshot`, look at the play frame and the close view, and add a decision row. On a
   seat, look at the knees from the side. When the weights of the file put the haunch on the
   thigh, each seated thigh swings the haunch under it, and the knee stands up high. Give the
   haunch to the hips with `haunch`.

**Route 2: a body built in code**, as the foxes of 2026-10-10 and the penguin (design 4.4, 7.1).
The penguin has such a body now, in `src/models/penguin/`. It has no sheet, so
`pnpm choir-check <dir>` takes the place of steps 1 and 4: measure crops of the two newest
images, and compare the gallery penguin with them in each round:

```text
 <id>-views.png --make_matte.py + <id>.json--> tools/sheet-mattes/<id>.png --+
                                                                             v
 src/models/<species>/ --> views.html?sheet=<id> --> pnpm sheet-check --> IoU, row diffs,
         ^                                                                colors, rows.txt
         +-------------------------- edit, one round ---------------------------+
```

1. Add the sheet to `VIEW_SHEETS`: the scale, the floor, the turns, the shadows, and the light.
   Write the matte config, and check the matte with its check image.
2. Measure the sheet in head heights of the sheet animal: the head, the joints, the widths, and
   the depths. Set the skeleton (`proportions`) from these measures.
3. Build the body with the shared parts: `ringLoft()` of `models/primitives.ts`, `addPainted()`
   of `models/painted.ts`, `limbTube()` of `models/limb-tube.ts`, and the plates of
   `models/face-plates.ts`. Select it with `SpeciesParams.body` and the dispatch of
   `buildBiped()`. `git show b9f71daf:src/models/fox/<file>` gives the fox body of 2026-10-10
   back as a second example.
4. In each round, run `pnpm sheet-check <id> <dir>`. Read the compare image, the rows with the
   most different pixels, and the colors. Change the largest difference, then run the tests of
   the area. To tune a pose, edit a hold, run `pnpm pose-probe <id>`, and repeat.
5. Record the measures in a research report and the decisions in a decision file.

These traps of route 2 each cost a round:

- The baked occlusion (design 4.5) draws a dark line where two body bones meet on a concave
  surface. Keep the regions that do not move against each other in one part, such as a torso on
  `spine` or a leg on `thigh`.
- In a side view, a far limb that is further forward shows in front of the near limb. Compare
  the runs in `<id>-rows.txt` before you move a joint.
- A sheet from an image model can disagree between its views. Measure each view, and choose the
  value that keeps each view close.
- The holds of a pose are in head heights. A new head height moves each hold, so scale the holds
  first, then tune them.
- The colors of the page pass through the light of the page. Change the light of a sheet page
  only when its sheet has a different light, such as the soft light of `bear-views.png`.
- A test that pins a tuned value fails on each retune and finds no fault. Test the behavior.

**Route 3: a studio body**, as the bear conductor and the polar bear pianist since 2026-10-12, the
rabbit violinist since 2026-10-13, the red violin fox since 2026-10-14, the viola cat since
2026-10-16, and the cello dog since 2026-10-17 (design 4.4). The studio
builds the GLB file, or `pnpm rig-mesh` rigs a mesh of the user into it, as for the rabbit and the
fox (below). The app keeps its own motion and drives the bones of the studio from the pose of the
player on each frame (`poseStudioBones()` of `src/models/studio-rig.ts`). A manager briefs the
implementation of a round from `docs/briefs/studio-body.md`.

```text
 python3 studio build <animal> --> lowpoly-studio/animals/<animal>/out/<animal>.glb
        | pnpm studio-body <animal> (no Blender)
        v
 src/models/studio/<animal>.ts --> STUDIO_BODIES of models/studio-body.ts --> SPECIES[<s>].body
        --> pnpm test --> pnpm close-views <role> <dir> --> pnpm snapshot
```

1. Run `pnpm studio-body <animal> --inspect` first. It prints the joints, the reach of each arm, the
   clips, the props, the seated drop, and the parts that the export refuses, with no write. For a
   violin or a viola, the manager compares the reach with the instrument before the round
   (`docs/briefs/studio-body.md`, section 1). The meters of `--inspect` and of `pnpm hold-reach`
   hold only at the scale of the entry of the animal in `ANIMALS` (below). Without an entry,
   `--inspect` assumes the shoulders at 1 m. With `--glb <file>`, both read another GLB file of an
   animal of `ANIMALS`, with no edit of the entry. Run `pnpm studio-body <animal>` after each build
   of the studio that changes the GLB file. Add an animal to `ANIMALS` of `tools/studio-body.ts`
   with the landmark of its scale and its height in the app: the shoulder joints of a standing role,
   or the keys of the piano of a pianist. Give it a crease angle for the smooth normals of its fur:
   the angle whose facet contrast is nearest to its reference crops
   (`docs/research/2026-10-14-rabbit-smooth.md`). When each render has less contrast than the
   references, as for the rabbit, the measure cannot choose, so compare the play frames. Mark a
   seated role: the export drops it onto its seat, and the seat fits its legs. A chair also takes
   the depth of the chair of the studio. A seated body with a wide haunch takes a wider chair
   (`seatWidth`). Mark a seated role that also stands (`soloist`), as the
   violinist: the export keeps its leg corrective shapes and the leg turns of its sheet, and the app
   stands it for a soloist.
2. Add the module to `STUDIO_BODIES`, and give the species the body.
3. Run `pnpm test`. The pose of the player drives the arms by their joints, so a new body needs
   a fit of the holds in its `H`. Probe a hold with `pnpm pose-probe <sheet>`, and look at the
   close views. For a violin or a viola, `pnpm hold-reach <species>` gives the reached parts of
   the fingerboard and the bow, and the violin scale of the rule of a violin shop. The clearance
   tests read the skin of the studio (`posedCorner()`). They are paused tests
   (`pnpm test:paused`), so `pnpm test` does not run them.
   A new role adds its entry to `SWEEP_ROLES` of `pose/test-sweep-roles.ts`: its moving parts,
   its obstacles with the shells of its instrument, its sample sets, and its limits. Add its
   shard files `pose/<role>-clearance-<k>.test.ts`, each with a call of
   `describeRoleClearance()` of `pose/test-role-clearance.ts` for its shard, as
   `pose/test-pianist-clearance.ts` does, and a check of the files in `src/test-shards.test.ts`.
   The shard files match the paused list of `vite.config.ts`.
   Tune each hold with `pnpm pose-depth <role> --set <changes>`. Fit each variant of a hold
   with `pnpm hold-fit <role> --set <changes>`: one table gives the folds, the deepest point of
   each sample set, and, for a violin, the reach. Run `pnpm pose-depth <role>`
   when the change moves the arms, the paws, the instrument, or the body of the role. Add
   `--gaps` when the change moves the head or the paws near the instrument or the body. Run
   `pnpm body-probe --base main` when the change touches shared pose or model code, to show that
   the poses of the other players do not change.
   A new role or a new hold adds its row to the pose index of design 5 in the same commit.
4. Run `pnpm snapshot`, and record the measures in a research report and the decisions in a
   decision file.

**A mesh with no skeleton into route 3.** The user gives a textured mesh with no skeleton, as the
rabbit `assets/models/rabbit/rabbit-4.glb` of 2026-10-13, the fox `assets/models/fox/fox.glb` of
2026-10-14, the cat `assets/models/cat/cat.glb` of 2026-10-16, and the dog
`assets/models/dog/dog.glb` of 2026-10-17. `pnpm rig-mesh <animal>` rigs it into
the GLB format of a studio body, and the steps of route 3 follow. Name the rigged file in `glb`
of the entry of the animal in `ANIMALS`.

```text
 assets/models/<s>/<file>.glb + tools/mesh-rigs/<animal>.json
        | pnpm rig-mesh <animal> --preview <dir> (Blender)
        v
 <output>.glb (fur, gloss, chair, 30 joints, 4 or 5 shapes, clip reference) --> pnpm studio-body
```

1. Measure the joints on cuts of the mesh, as `docs/research/2026-10-13-rabbit-mesh/sections.py`
   does, and write them in the config with a note on each measure. The right side mirrors the
   left side.
2. Give the first config the arm factor 1 and the rule of the thin faces (`check.thin`). Then run
   `pnpm rig-mesh <animal> --check`. Its first line gives the shoulder joint, the reach with no
   factor, and the factor of the target reach. Ask the user about longer arms with this measured
   factor, and then set it. With no `--check`, the tool stops when the reach misses the target of
   the config by more than 1%.
3. Run `pnpm rig-mesh <animal> --check --preview <dir>`, and look at the seated bind, the standing
   body, the knees, and the main bones. It writes no file into the repository. The log gives the
   faces that the bind turns over, the smallest determinant of the skin of the clip, and the
   triangles. Before a change of a weight rule, read the weights of the corners of the faces that
   fold with `pnpm fold-probe <role> --faces <n>`. Try each variant of a rule with
   `--check --set <path>=<value>`, which does not change the config file.
4. Run `pnpm rig-mesh <animal> --check` after each change of the config or of the script, and
   before the first docs commit. The triangles must stay in the budget, the packed mesh in its
   gzip budget, and the standing body within 1 mm of the long-armed source. Read the seat, the
   violin rule, the folds, and the thin faces near the joints. Read the seat height and the
   lowest point of each leg and of the tail before a plan of the tail. Probe a rig with `--glb <file>` of
   `pnpm studio-body --inspect`, `pnpm hold-reach`, and `pnpm fold-probe`, with no edit of
   `ANIMALS`. Only the last commit of a series of rig commits writes the GLB file again.

The traps of route 3 are in [`model-traps.md`](model-traps.md).
