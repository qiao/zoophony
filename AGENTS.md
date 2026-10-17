# AGENTS.md

Zoophony is a WebGL MIDI player. Low-poly animals play orchestral music on a small
stage. The stack is Three.js, TypeScript, Vite, and pnpm. The app is a static site on GitHub
Pages.

## Design

The design is the single source of truth for the product and design decisions. Sections 1 to 9
are the files `docs/design/01-*.md` to `09-*.md`, one file for each section. A pointer "design
X.Y" names the heading "X.Y" in the file whose number is X. The index `docs/design.md` lists the
files and holds section 10. Read only the design files of your area. Before you change an area,
read its section. If a change conflicts with the design, ask the user when the user is
available. When the user is not available, follow the newest decision of the user and the
reference images, and record the conflict as a row in your decision file. Then update the design
file in the same commit as the change.

Take the next task from `TODO.md`, and follow the rules at its top. A step is done only when its
"done" criterion is true and its review is done (design 9.8). The manager reviews each round from
the report and the images. No round gets a review agent since 2026-10-16.

A decision file in `docs/decisions/` holds the details that one agent session decided after the
design session (section 10 of `docs/design.md`). Treat each row as decided, unless a newer
decision of the user or a newer row replaces it. Record a new decision as a row in a new decision
file of your session. When a decision is reversed or replaced, update its design section and
remove the old row in the same commit.

Open these files for these kinds of work:

- 3D scene, models, or motion: look at the reference images
  `docs/reference/orchestra-latest.png` and `docs/reference/orchestra-side.png` (the newest
  target, from two angles), `docs/reference/mockup.png` and
  `docs/reference/scene.png` (the target of the look), `docs/reference/lowpoly-animals.png`
  (the forms and the facets of the animals), and `docs/reference/animals.webp` (the front,
  side, and back views). The model sheets `docs/reference/*-views.png` show single species.
  The reference images win over the values in the code that design 4.5 to 4.7 names. These
  values describe the current models, and they are no targets. Design 1 says which image wins
  where they differ. The bodies of 2026-10-06 18:58 are the start point, and these images stay
  the target of the animals (design 1). Since 2026-10-11, all species except the penguin and the
  bear have the parametric bodies of 2026-10-06 18:58 again
  (`docs/decisions/2026-10-11-body-revert.md`), and `pnpm sheet-check <id> <dir>` compares a
  species with its sheet. Since 2026-10-12, the bear conductor has the studio bear of
  `lowpoly-studio/` (route 3 below, `docs/decisions/2026-10-12-studio-bear.md`), and the polar
  bear pianist has the studio polar bear (`docs/decisions/2026-10-12-studio-polar-bear.md`).
  Since 2026-10-13, the rabbit violinist has the mesh of the user
  `assets/models/rabbit/rabbit-4.glb`, rigged by `pnpm rig-mesh rabbit` into the format of a
  studio body (`docs/decisions/2026-10-13-mesh-rabbit.md`), in place of the studio rabbit of the
  same day (`docs/decisions/2026-10-13-studio-rabbit.md`): its form and colors follow the mesh,
  and its violin pose follows a real violinist. Since 2026-10-14, the red violin fox has the mesh
  of the user `assets/models/fox/fox.glb`, rigged by `pnpm rig-mesh fox` with a tail of two bones
  (`docs/decisions/2026-10-14-mesh-fox.md`). The tan flute fox has the same rig with a tan
  palette of the faces, and the flute hold of a real flutist with a head turn
  (`docs/decisions/2026-10-14-fox-flute.md`). Since 2026-10-16, the viola cat has the mesh of the
  user `assets/models/cat/cat.glb`, rigged by `pnpm rig-mesh cat` with the size, the reach, and
  the leg factor of the red fox, and its viola hold puts the nut in reach of the left paw
  (`docs/decisions/2026-10-16-mesh-cat.md`). The seated cat curls its tail on the seat around the
  left side of its haunch, and its fur moves toward the gray of its sheet under the stage light
  (`docs/decisions/2026-10-16-cat-seat.md`). The cat has the trunk of the red fox and longer legs
  with a higher chair, at the same ear tips (`docs/decisions/2026-10-16-cat-trunk.md`).
  `pnpm close-views conductor <dir>`, `pnpm close-views pianist <dir>`,
  `pnpm close-views violinist <dir>`, `pnpm close-views fox-violinist <dir>`,
  `pnpm close-views violist <dir>`, and `pnpm close-views flutist <dir>` show them close at the
  beats of a bar, at the chords of the keys, at the frog and the tip of a bow, and at a note of
  the flute. The penguins of the choir
  have an egg body of their own, built in code in `src/models/penguin/` after the choir of the two
  newest images (design 4.4). They have no sheet, so `pnpm choir-check <dir>` puts the gallery
  penguin beside one penguin of each image. The GLB files
  `assets/models/rabbit/rabbit.glb` and `assets/models/bear/bear.glb`, models of the user, stay
  for the tools of route 1, and no species uses them. `pnpm rig-body <species>` packs each one
  with a skin baked from the texture of the file, in the colors of the reference images (design
  4.4). The configs keep the forms of 2026-10-10: the bear keeps the form and the limb lengths
  of its model, and the rabbit takes the form of `rabbit-views.png` through the `shape` and the
  `haunch` of its config.
- UI: open `docs/prototype/ui.html` in a browser, or read its screenshots in `docs/prototype/`.
  Design 2.8 gives the tokens and the exact message texts.
- Demo files: `demos/README.md` gives the sources, the licenses, the checksums, and the reason
  for each program change.
- SoundFont: `assets/soundfont/README.md` gives its source and checksum.
- Hall reverb: `assets/hall/README.md` gives the source, the license, the checksums, and the
  steps that made the impulse response.
- Low-poly studio: `lowpoly-studio/` is a separate project that the user asked for on
  2026-10-11 (first as `bear-studio/`). It builds rigged low-poly animals from a reference sheet,
  with one config for each animal and one role pack for each role, such as the bear conductor.
  It is outside the rules of this file. Run its CLI in that folder:
  `python3 studio build|compare|report|view|new|regress <animal>`, `python3 studio log`, and
  `python3 studio cache info|clean`. The lint skips it. The app uses two outputs of it: the GLB
  files of the bear and of the polar bear, through `pnpm studio-body bear` and
  `pnpm studio-body polar-bear` (route 3 below). The studio keeps its rabbit as a regression
  animal, and the app rabbit comes from `pnpm rig-mesh rabbit`. The app imports no studio code. Its `README.md` gives the layout, the commands, the config, and the role packs.

`docs/research/` holds the facts behind the decisions, with sources. Keep these reports as the
record of their date. Put new research in a new report.

## Model work

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
rabbit violinist since 2026-10-13, the red violin fox since 2026-10-14, and the viola cat since
2026-10-16 (design 4.4). The studio
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
   the depth of the chair of the studio. Mark a seated role that also stands (`soloist`), as the
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
2026-10-14, and the cat `assets/models/cat/cat.glb` of 2026-10-16. `pnpm rig-mesh <animal>` rigs it into
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

These traps of route 3 each cost a round:

- The hands of the player turn freely at the wrist, and the skin of the studio bends well only
  near its clips. The retarget turns each paw in the plane of its palm toward the forearm.
- The baton keeps its length, and the holds are in head heights. A smaller head moves the wrist
  down and back along the baton, so set the point of the baton from the wrist that you want.
- A long muzzle turns into the paws when the head turns to a section. The paused test of the
  conductor clearance finds the frame, and the close views show it.
- A round belly takes the room of the forearms. The pianist needed the keys further in front, a
  lean, a reach limit for each paw, and a curved path from the knees to the keys. The paused test
  of the pianist clearance finds each contact with the frame.
- The depth of an open part is false near its open edge. A trunk with no arms is open at the
  shoulders, so the sign of its nearest face gave depths at the limit of the search. Measure in
  a closed part (`closedPart()` with the count of its open loops), as the sweep does.
- A cap closes a cut with a fan from its middle. The cuts to the upper arms of the studio bears
  are long and not flat, so a point of an upper arm near its cut has its depth to the cap. The
  depth to the nearest triangle of the body can be twice as large. Read the depths of the upper
  arms as depths behind the cap.
- A role whose instrument moves, such as the violin to the rest place, needs the offsets of the
  pose in `poseStudioBones()`. Before 2026-10-13 the retarget dropped them, and the violin of
  the rabbit stayed at its bind place at the chin.
- Short arms do not reach the instrument of the app. Size the instrument by the rule of real
  players, and keep the limbs of the studio (user rule of 2026-10-10). Make the arms longer in
  the studio only when the user asks, as for the rabbit on 2026-10-13, and for the full violins of
  the rabbit and the red fox on 2026-10-14. When the user sets the size of an instrument, as for
  the violins of the rabbit and the red fox after their shorter arms of 2026-10-14
  (`SpeciesParams.violinScale`), the size stays, and the hold moves the instrument until the paws
  reach it: the violins moved back toward the neck, so that the left paws reach the nut.
- A round belly can cover short thighs, so the lap place of a hold lands on the belly. The rabbit
  rested the violin at its side (`BowedHold.restAtSide`) until its longer legs of 2026-10-14 gave
  it a lap. Short arms on a long trunk may not reach the thighs: before its longer arms of
  2026-10-14, the paws of the red fox hung 0.16 m above them. Since 2026-10-16, the rabbit and the
  red fox rest as a seated violinist, with the violin upright on the left thigh and the bow upright
  at the right side. The long arm of the red fox reaches its thigh only nearly straight, and the
  line from the shoulder to the top of the thigh passes through the side of the belly, so its paw
  holds the frog at the outer side of the thigh. The belly of the rabbit is widest below its
  elbow, so its hanging right arm holds the frog at the outer side of the knee: a paw on the belly
  over the thigh bent the arm out as a wing and turned 20 faces of the arm over. The rest columns
  of `pnpm hold-fit` give the right elbow against the trunk and the angle of the upper arm.
- The sweep measures a part by the corners of its triangles. The stick of the bow is one long box,
  so its middle went 6.3 cm into the body of the red fox in the rest with no depth in the sweep.
  The rest columns of `pnpm hold-fit` take a point at each 1 cm along the bow (`bowPoints()` of
  `tools/lap-rest.ts`), and `docs/research/2026-10-16-bow-rest/bow-path.ts` does the same for the
  lift and the lowering.
- A bow that rests upright and plays across the strings turns its tip from up to the left. A
  direct mix of the two bows turned the tip through the head, and the bow went 14.8 cm into the
  body while the arms lowered. A via of the rest bow (`BowVia` of `pose/bowed-rig.ts`) turns the
  tip through the front.
- A new body changes the footprints, so the layout of a section, the looks of the other players,
  and the cues of the conductor change with it. `pnpm body-probe --base main` names them.
- The shot test of `src/shots/prepare.test.ts` reacts to moves of the footprints of about 2 cm.
  A change that moves a body, such as a seat, a rig, or a hold, runs `pnpm test src/shots/` before
  its commit. When a shot drops out, `pnpm shot-trace <demo> --base main --from <s> --to <s>`
  gives the test that refuses each camera of the cut, such as the distance share of a two-shot.
- Bone heat gives a part of the arm weight to the side of the trunk when the arm of a mesh hangs
  near it. The raised bind arms then drag the trunk, and the fold probe finds folds at the
  shoulder. Keep the arm weights on the free arm (`armSplit` of the config of `pnpm rig-mesh`).
  Inside that plane, the side of the rabbit trunk below the armpit keeps 0.72 of the upper arm
  weight. A rule that gave it to the trunk folded the long faces between the trunk and the arm
  in each play sample.
- A mesh of an image model has many thin faces (335 of the 3,065 faces of the rabbit have a corner
  angle below 10°). A thin face with corners of different weights turns over at a bent joint.
  The `sliver` and `line` rules of the config of `pnpm rig-mesh` remove some of these folds.
  Read `pnpm fold-probe` after each change of a hold, because a more bent elbow folds more faces.
- The long thin faces of an image mesh fold at the joints of the arms. A face of the rabbit ran
  from the shoulder over the elbow to the forearm, and the bent elbow of the bind made it thin.
  It folded in 45% of the play samples, and weight rules made it worse. A ring of new vertices
  at the joint fixes it (`refine.rings` of the config of `pnpm rig-mesh`). Put a ring only where
  `pnpm fold-probe` finds folds, and run the sweep (`pnpm pose-depth <role>`) after it: a ring at
  an elbow that does not fold can pull the inner elbow into the trunk.
- One color for each face of a texture gives one palette entry for each face, and the module of
  the rabbit was 54 KB after gzip. The palette in Oklab and the walk order of `pnpm rig-mesh`
  made it 24.7 KB. Measure the parts of the packed mesh before you cut one.
  `src/models/studio-size.test.ts` limits the gzip size of each packed mesh.
- The texture of an image mesh has black gaps between its islands. A face at the edge of an
  island took them into the mean of its samples, and 136 fur faces of the rabbit were 10% to 40%
  darker than the cream. A face that is not dark now takes the mean of its samples that are not
  dark. Read `colors.py` of `docs/research/2026-10-14-rabbit-smooth/` after a change of the
  color rules.
- Each open edge of a mesh opens a loop in the closed body of the sweep: the open edges of the
  whiskers of the rabbit and the cuts to the arms give 4 loops. The eye fans gave 2 more loops
  until the export dropped them for the pea eyes on 2026-10-15. Give the role its own count for
  `closedPart()`, and check that each extra loop is small.
- A long thigh needs a seat of its own (`studio.legTurns` and `weights.haunch` of the config). The
  seat of the studio rabbit turns the thigh 57°, and with the haunch ramp of the rabbit, the long
  thighs of the fox stood upright on the chair. A large tail needs two bones (`tail_tip`): one
  stiff bone sticks out level behind the chair.
- A level seat under thighs that slope down meets the thighs before the haunch. Then the seat top
  is the underside of the thighs near the knees, and the haunch hangs up to 6 cm above it. End the
  seat where the thighs leave the seat top at the haunch (`chair.front`). The seat of the app
  reaches `seatBack` of `ANIMALS` past the chair of the rig, so a short seat needs no `seatBack`:
  move the back edge of the chair of the rig forward by the old move (`chair.back`), and the body
  keeps its place.
- A turn of the trunk in the seated bind (`studio.trunk`) gives the standing body two blends in a
  row: `standingBody()` skins the seated bind with the standing turns, and a pose then skins the
  arm shapes, which the rig solved in the seated axes. A vertex with the weights of the trunk and
  of an arm missed the source by 3.5 mm. The export writes the arm turns of the clip
  (`StudioStanding.armTurns`), and `standingArmCorrectives()` solves the arm shapes again for the
  standing bind. `pnpm rig-mesh --check` prints the worst standing vertex with its bones.
- Bone heat can give one corner of a small face a bone that the bow arm turns far, such as the
  right clavicle, and the face folds in most play samples. `pnpm fold-probe` gives the main bones
  of the folds. Look at the weights of the corners of the faces that fold most often before you
  add a ring or a smoothing: for the fox, the rules `clavicleFrom` and `armTop` helped, and a
  smoothing of the shoulder weights folded more faces.
- A face that folds in one region of the poses of an arm, such as the front of the right shoulder
  of the red fox with the bow arm out to the side and down, needs a corrective shape when no weight
  rule or ring removes the fold (`raise` of the config of `pnpm rig-mesh`). The whole turn of the
  upper arm finds the region: all play samples within 5° of the mean turn of the folded samples
  folded, and the direction of the upper arm alone separated them less. Run
  `docs/research/2026-10-15-fox-rig2/arm-dirs.ts` and `raise-turn.py` for the mean turn. A rule
  that relaxed more faces in the pose of the shape (`raise.below` 0.5 and 0.7 against 0.3) folded
  more play samples.
- A linear stretch of the upper arm moves each vertex by its upper arm weight. With the longer arms
  of 2026-10-14, a throat face of the red fox with 0.09 of each upper arm weight went across the
  middle, and the trunk below the right armpit folded in 30% of the play samples. The upper arm now
  stretches only on the free arm and from the shoulder joint out (`outward_stretch()` of
  `tools/blender/rig_mesh.py`). A ring at a joint (`refine.rings`) reaches a fixed distance, so
  longer arms can put the corners of the long faces beyond it: give the ring a larger radius.
- Bone heat gives the top of a narrow shoulder next to a thin neck to the upper arm, as on the cat
  mesh: 0.93 of the weight of a vertex beside the neck. A face from such a vertex to the neck turns
  over with each lowered arm, in each sample of the role. A lower `armTop` gives the outer top of
  the shoulder to the neck and folds a face there. Fade the upper arm weight over the top of the
  shoulder toward the clavicle (`shoulderRamp` of the config of `pnpm rig-mesh`).
- A big head over a thin neck faces its underside down into the shadow of the head. The app shows
  a black band under the head from the back and the sides, and a dark line under the chin, while
  a render with a flat light shows none. Smooth the neck and the bottom of the head with a box that
  ends behind the chin (`smooth` of the config): a box that holds the chin moved the head height H
  of the cat from 0.339 m to 0.352 m, and with it each hold.
- The root of a hanging tail pulls a few vertices of the haunch down, and they set the seat top of
  the sit. A tail that curls on the seat lifts them, and the seat of the cat rose 0.8 to 1.2 cm.
  Give the sit the seat top of the old tail (`sit.top`). The root vertices share their weight with
  the hips, so the sit moved them by half of its drop, and the side view of the haunch of the cat
  stayed 5.2 cm above the seat: count them as the haunch (`sit.root`).
- The idle sway turns the tail bones around the vertical (`pose/pose-at.ts`). It suits a tail that
  hangs, but the front of the tail of the cat curled on the seat moved 12.3 cm across and went
  5.3 cm into the left thigh. A seated tail that lies on the seat does not sway
  (`OwnBodyParams.seatedTail`). Measure a seated tail over one sway period, 5.5 s.
- A hold can trade the folds against the clearance. A larger slant of the bow removed folds of the
  right shoulder of the fox, but put the right forearm into the chest at the end of the lift.
  Count the folds of hold changes in memory (`docs/research/2026-10-14-fox-rig/fold-set.ts`), and
  check each candidate with `pnpm pose-depth --set` before you write it.
- The values of the pose in meters do not change with the size of a body. The size round of
  2026-10-14 tried five hold variants for 25 minutes. Then it found that the free hair of the bow
  stays 0.03 m on the larger rabbit. These values stay in meters:
  - the bow: the free hair of each hold (`freeHair` of `BowedHold`, `src/pose/bowed-rig.ts`), and `pluckHeight` and `pluck` of `BOWED_HANDS` (`src/pose/bowed.ts`),
    `BOW_STEP` (`src/pose/bowed-rig.ts`), and `lift` and `tremoloAmplitude` of `BOW_MOTION`
    (`src/pose/strokes.ts`);
  - the hands and the head: `lift` and `pull` of `HAND_MOTION` (`src/pose/hand-notes.ts`), the
    `sizes` of each hold of `src/pose/percussion-rig.ts`, `scale` of `CONDUCTOR_MOTION`
    (`src/pose/conductor-notes.ts`), and `eyeHeight` of the cues (`src/pose/cues.ts`);
  - the sweep: `CONTACT`, the `depth` of each accepted depth, and the `targetError` of each role
    (`src/pose/test-sweep-roles.ts`), `PIANIST_GAP` (`src/pose/test-pianist-clearance.ts`), and
    `GAP` (`src/pose/test-conductor-clearance.ts`).

  Compare the folds and the depths in H first, with `pnpm hold-fit <role> --base main` and
  `pnpm pose-depth <role> --base main`. Then probe these values before a fit of a hold.

## Rules

- **Pure core.** `midi/`, `score/`, `pose/`, `models/`, `shots/`, and the block scheduler of the
  worklet are pure: they get all inputs as arguments, read no clock, use only seeded randomness,
  and touch no DOM. Each one has Vitest tests.
  - A pure module can use the math classes of Three.js: `Vector3`, `Quaternion`, `Matrix4`, and
    the other classes of `three/src/math/`. These classes are plain JavaScript with no DOM. They
    run in Node, and Three.js is already in the first download.
  - A pure module uses no scene-graph object of Three.js: no `Object3D`, `Mesh`, `Bone`,
    `SkinnedMesh`, geometry, material, or renderer.
  - The data that a pure module returns stays plain: typed arrays, tuples, or plain objects.
    Thus a test can compare it, and the rule "Stateless poses" holds. A point or a rotation
    at a module boundary is a `Vec3` or a `Quat` tuple of `models/tuples.ts` (design 7.1).
  - A module scratch object holds no state: each call writes it before it reads it.
- **Stateless poses.** `poseAt()` calculates each pose only from the score, the scene layout,
  the song time, the wall time, the transport, the audibility of the seats, and the seed. Thus
  seek, pause, speed, mute, and solo changes are always correct. `cameraAt()` follows the same
  rule: it calculates the camera only from the shot plan, the song time, the transport, and the
  view (design 5.6).
- **One score.** The sound and the visuals both come from one `Score`. Put each MIDI rule in
  `score/`, so that the synth and the animals follow the same rule.
- **Size budget.** The first download is less than 1 MB after gzip (design 7.2). Load the audio
  code, the Worker, the worklet, and the SoundFont files with a dynamic import or a fetch after
  the first frame. Explain or fix an unexpected size change. A change that moves the size by
  more than 5 KB states the reason in its commit message. Raise the limit only with the approval
  of the user.
- **Licenses.** Before you add a MIDI file, a score, a SoundFont, or a dependency, check the rules
  in design 8.1 and 7.3. Add each new dependency to the third-party license file.
- **Privacy.** Keep the personal data of the user out of each request to an outside service.
  The email address, the name, and other personal data go into no header, User-Agent, URL, or
  payload. When an API asks for contact data in the User-Agent, send a neutral value such as
  `zoophony-build/1.0`.
- **Frame time.** The user paused this rule on 2026-10-14, until the user starts the sweep of
  the performance work (`docs/decisions/2026-10-14-test-pause.md`). Until then, a change of
  `src/scene/`, of a shader, or of the post effects does not run `pnpm frame`. After the pause,
  each such change runs `pnpm frame` before its report, and gives the table in the report or the
  commit message. CI has no GPU, so this check is local (design 9.7).
- **Work order.** Follow the steps in design 9.5. The largest risks come first.

## Commands

Node 24 or later, and pnpm from the `packageManager` field of `package.json`.

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 preset files into `public/sf/`, the changed demo files into `public/demos/` (design 8.3), and `perf/perf-60.mid` (design 9.5), then starts the Vite dev server. The audio spike is at `/spike.html`, the model gallery at `/gallery.html`, and the animal views at `/views.html` (design 7.1). `/#demo=<id>` shows another demo, and `/#demo=perf-60` shows `perf-60.mid`. |
| `pnpm build` | Writes the SF3 preset files and the demo files, then builds the site into `dist/`, with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. With `ZOOPHONY_BASE=/zoophony/`, the build and `vite preview` use the base path of GitHub Pages (design 9.2). |
| `pnpm size [--base <ref>]` | Prints the gzip size of the first download, and fails above 1 MB (design 7.2). Run it after `pnpm build`. With `--base <ref>`, it also extracts the commit, a branch, or a tag into a temporary folder, runs `pnpm build` of the commit there, and prints the total of the commit, the total of the working tree, and the difference. It removes the folder at the end, also after a failure and after Ctrl-C. The build of the commit takes about 3 s. |
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Builds the site, serves `dist/` with `vite preview`, and writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900, the default demo at 390 × 844, the two gallery pages, the animal views, and the five model sheet pages (design 7.1). `--sheet` adds `species-sheet.webp`, a close view of each gallery model. `--play` adds the default demo and the Beethoven 9 demo at 1440 × 900, and the default demo at 390 × 844, after 6 s of play. `--ui` adds the first screen and the open drawer during play, `--drawer` adds the seat list, the settings, the credits, and the drop overlay, and `--load` adds the first screen during the load, the load failure, and the full-page message with no WebGL2, at both sizes of the prototype screenshots. `--shots` adds a frame of each kind of camera shot of each demo at both sizes (design 9.8). It uses headless Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time), and it stops the server at the end. |
| `pnpm snapshot` | Builds the site and saves screenshots of the current state into `docs/snapshots/<commit date>-<short hash>/`: the default demo during play at 1440 × 900, with the drawer closed, in the default view of "Reset view", 3.5 s after a seek to 30 s, and a close view of each gallery model. It writes a `README.md` with the commit, and a note when the working tree has changes. The folder and the file names depend only on the commit, so a second run on the same commit writes the same files again. The play frame can differ by a few milliseconds of song time and of the idle motion. It uses the browser of `pnpm screenshots`, and it stops the server and the browser at the end. |
| `pnpm sheet-check <sheet> <dir>` | Builds the site and compares a model sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1). It writes into `<dir>` the page at the size of the sheet, the silhouette of the body (`?sheet=<id>&matte`), and the sheet above the page. With a matte in `tools/sheet-mattes/<id>.png`, it also prints the silhouette IoU of each view, the top and the bottom rows, the five rows with the most different pixels on each side of the seat, and the color medians and the value percentiles of the sheet and of the page. It writes the difference image and `<id>-rows.txt`, the runs of each second row of the sheet and of the page. `tools/sheet-mattes/make_matte.py <id>.json` makes each matte from the config of its sheet: the foreground rule, the props to ignore, and the rows of the labels. It stops the server and the browser at the end. |
| `pnpm pose-probe <sheet> [--time <s>]... [--set <changes>]...` | Prints the posed elbow, wrist, and palm of each arm of the sheet pose of a model sheet (design 7.1), in head heights from each shoulder joint (out, up, forward), and the direction of the tip of the instrument. `--time` takes the song time of the pose in place of the time of the sheet. `--set` changes values of a hold in memory, as `pnpm pose-depth` does, and prints each variant after the base. It runs in about 1 s with no build, so a tuning round is: change a hold with `--set`, run the probe, and repeat. Then write the value into the source file. |
| `pnpm pose-depth <role> [--demo <id>]... [--soloist <species>] [--set <changes>]... [--bones <list>] [--into <list>] [--times <list>] [--gaps] [--base <ref>] [--json <file>]` | Runs the sweep of a role (`conductor`, `pianist`, `violinist`, `violist`, or `flutist`) over each demo with the role (design 9.3). The violinist sweep takes the first seated rabbit and the first seated red fox of each demo, and each standing soloist of the two species, and its note targets put the bow hair on the strings. The violist sweep takes the first seated cat of each demo with violas, and each standing cat soloist. The flutist sweep takes the first seated tan fox of each demo with flutes, and each standing tan fox soloist, and its note targets put each palm on its grip at the start of each phrase. Each player gets its own sample sets. It poses the skin of the GPU, and prints the deepest point of each moving part in each obstacle of the role, with its time, its bone, its place along the bone, and its limit, and the largest note-target error of each hand. `--set` changes values of a hold in memory, such as `piano.lean=16deg` or `piano.restL.lap.offset=-0.75,0.1,0`. The root `<instrument>@<species>` changes the own hold of a species (`SPECIES_HOLDS` of `pose/bowed-rig.ts`, `SPECIES_WIND_HOLDS` of `pose/winds.ts`), such as `violin@rabbit.lean=12deg` or `flute@fox-tan.lipShift=0,-0.05,0`. The root of the instrument (`violin`) does not change it. Two holds can share an object or a list through a spread, such as `violin.restBow` and `viola.restBow`, or the bow tip of the rest of the rabbit and the red fox. A change with the root of an instrument changes the shared object, and the text of the variant names the other paths that the change moves too. A change with the root `<instrument>@<species>` first copies each object and list of its path in memory, so that it changes only that species (`copyPath()` of `tools/hold-sets.ts`). It stops on an unknown key. A value that is `null`, an object, or a list that is not a list of numbers takes JSON text with the keys and the kinds of the old value, such as `viola@cat.restBow.via={"tip":[-0.3,0.3,-1],"hair":[0,-1,0],"reach":[0,0,-0.4]}`, and a number in it can have the unit `deg`. A field that is `null` takes the keys of its entry in `NULL_FIELDS` of `tools/hold-sets.ts` (`BowVia`, the rest of a bowed hold, `standBow`, and `restFreeL`), and a field of that table also takes `null`. A key that the old value does not have stops the run, and so does a missing key. A path below a field that is `null` stops the run with a message that names the field and its keys. Each `--set` is one variant, with its changes separated by `;`, and the run prints one table with one row for each variant. `--bones` measures one part for each bone, with the limits of the part of the role that holds the bone. `--into` selects the obstacles. `--times` takes song times of a play in place of the sample sets, with the wall times and the limits of a play. `--gaps` also prints the smallest gap in each sample set from the head to each obstacle except the body, such as the case of the piano. It also prints the smallest gap from each paw to the body. Each gap has its time and its bone. A gap is the distance of the nearest points of the posed skin and the closed obstacle, and 0 when they touch (`surfaceGap()` of `pose/test-clearance.ts`). The table gives the smallest gap over the demos. With `--bones forearmL,forearmR,handL,handR --into body`, one variant of the pianist over both demos takes about 6 s, and all parts take about 18 s, or 37 s with `--gaps`. One time takes less than 1 s. The label of each player names its species, such as `violinist 4 (fox-red, chair)`. No demo has a standing violin soloist. `--soloist <species>` sweeps the species as the standing soloist of the violin and piano duo of the chamber test files in place of the demos (`soloistScene()` of `pose/test-sweep-roles.ts`): the species takes the place of the violinist with the instrument of the role. The `violinist` takes `rabbit` or `fox-red`, and the `violist` takes `cat`. The bow then takes a point at each 1 cm along each edge in place of its corners (`bowSweep()` of `tools/bow-sweep.ts`). The rows give the depth of the bow in each obstacle and in the upper arms and the forearms (`arms`), and the lowest point of the bow above the floor as the gap `bow~floor`. The label of the player starts with `violin-piano`, such as `violin-piano violist 0 (cat, stand)`. The option does not go with `--demo`. On 2026-10-16, one species took 8 s to 10 s, and its rest gave the values of `docs/research/2026-10-16-cat-seat/stand-bow.txt`. `--json <file>` writes the rows of each variant as JSON. `--base <ref>` sweeps a commit, a branch, or a tag and the working tree at the same time, each in a child process (`probeBeside()` of `tools/ref-tree.ts`). The commit runs the base with no change, and the working tree runs each variant. A role that the commit does not have stops the run before the probes with the message "The ref <ref> has no role <role>". After the output of the working tree, the tool prints one compare for each variant. It has one row for each species, sample set, and pair, with the deepest point of both trees in cm and in the H of each body. A mark `GROWS` follows a depth whose value in H grows by more than one step of the print (0.1 cm). The JSON of each side holds the format version of its tool and the field `since`: the oldest version that its version only adds fields to (`ProbeFormat` of `tools/ref-tree.ts`, `ROWS_SINCE`). Two versions compare when the newer version only adds fields to the older version. Then the tool prints a note. When the working tree is newer, the compare gives `-` for each new field on the side of the commit. When the commit is newer, the compare shows the fields of the version of the working tree. Else the compare stops with both versions in the message (`formatNote()`): each side runs its own tool, so a changed field gives false differences. The JSON of the commit goes into a cache by tree, `probe-cache/` in the common folder of git, which each worktree shares (`baseCacheFile()` of `tools/ref-tree.ts`). Its key holds the trees of `PROBE_PATHS` of the commit, the scripts of the working tree that the probe copies, the arguments of the commit, Node, and the lockfile. A second run with the same key prints `base: cached`, and runs only the working tree. `PROBE_NO_CACHE=1` runs the commit again. On 2026-10-16, `pnpm pose-depth violist --demo bach-bwv1050 --base main` took 13.5 s with 27.9 s of CPU, and 13.0 s with 13.8 s of CPU and `base: cached`, because the two sides run at the same time. A commit whose tool does not know an option of the run, such as `--soloist` before 2026-10-16, stops the run with the message of its tool. The folder goes away at the end, also after a failure and after Ctrl-C. With `--base main`, the violinist took 304 s over 14 demos at a load average of 27, and 16 s over one demo. The source files do not change. |
| `pnpm hold-reach <species> [--instrument <i>] [--support <s>] [--set <changes>]... [--size <scale>[,<scale>]...] [--glb <file>]` | Measures the reach of the arms of a species against its violin or viola (`--instrument viola`) in the playing pose of its hold, with no idle motion (design 4.6). It prints the arm of each side from the shoulder joint to the middle of the palm, and the distance from the left shoulder joint to the scroll. It also prints the reached part of the fingerboard (`stopRange`) and of the bow hair (`bowRange`). Then it gives the scale of the rule of a violin shop: with the left arm extended, the scroll lies in the middle of the palm. For a violin, it compares the length of the rule with the real sizes, 0.33 m (1/32) to 0.59 m (4/4). It also rebuilds the player with that `violinScale` in memory, as a check. The app has no scale of the viola. With `--instrument flute`, it prints the arm of each side and the distance from each shoulder joint to the grip of its palm on the flute, in the playing pose and in the rest pose of the flute hold of the species (`windHoldOf()` of `pose/winds.ts`), and the miss of a palm that does not reach its grip. A paw that leaves its grip in the rest pose (`WindHold.restFreeL`) has no rest grip. On the chair, its line gives the distance from the shoulder joint to the middle of the palm at its rest place on the thigh, its share of the arm, and the mark `out of reach` above 1 (`freeRestReach()`). Standing, its arm hangs. The player sits on a chair, or stands with `--support stand`. `--set` changes values of a hold in memory, with the syntax, the JSON values, and the copies of `pnpm pose-depth --set`. Each `--set` is one variant, and the tool prints the report of the base, then the report of each variant. `--glb <file>` gives the species the studio body that the export makes from the file (below). `--size <scale>[,<scale>]...` adds the sizes of the violin to the report. For each scale of the violin (`violinScale`, a factor of the violin of the app), it prints the violin length and the reach that puts the scroll in the middle of the palm of the extended left arm in the playing pose of the hold. The tail end stays in its place, and the violin grows along its axis. A column gives the reach with the player rebuilt at the scale, as a check. The arm factor of the mesh rig config `tools/mesh-rigs/<animal>.json` that gives the reach comes from `armReach()` of `tools/rig-mesh.ts`: the upper arm and the forearm take the factor, and the paw keeps its size. The last column gives the factor of the current upper arm and forearm. With `--glb <file>`, the body of the file gives the arm, so that factor is 1 at the size that the arm of the file fits. The copy of `--glb` holds the rig configs, so that table also gives the arm factor of the rig. `--size` takes the violin only. It runs in less than 1 s with no build. |
| `pnpm hold-fit <role> [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--sets <set>[,<set>]...] [--faces <n>] [--demo <id>\|all]... [--step <s>] [--base <ref>] [--json <file>]` or `pnpm hold-fit <role> --scan [--walls <s>[,<s>]...] [--set <changes>]... [--grid <path>=<a>:<b>:<step>]... [--demo <id>\|all]...` | Fits a hold of a role of `FOLD_ROLES` of `tools/fold-probe.ts` in one run (route 3). For the base and each variant of `--set`, it gives one row of a table. A row gives the play folds and the lift folds of `pnpm fold-probe`, as the share of the samples, at a play step of 1 s by default (`--step`), and the most folded faces of one rest sample split into the left, the right, and the middle by the main bone. It gives the deepest point of each sample set of the sweep of `pnpm pose-depth` (play, lift, rest, and lower), with its part and its limit: the pair with the largest depth less its limit. For a role that holds its instrument in its paws (a violin, a viola, or a wind instrument), the sweep also measures the instrument (`HELD_PART`), and the row gives its deepest point in the body with its set and the mark `OVER` above its limit. For a wind role whose hold frees a paw in the rest pose (`WindHold.restFreeL`), the row gives the gap of that paw to the body in the rest, the largest over the seated players, and the reach share of its rest place on the chair (`freeRestReach()` of `pnpm hold-reach`), with the mark `OVER` above 1. For a violin role, the row also gives the scale of the rule of a violin shop, the violin length, `stopRange`, and `bowRange` of `pnpm hold-reach`. A run with the rest set gives the lap rest of a role whose seated players rest the instrument on the lap: a violin, a viola, or a wind hold of `LEG_RESTS` (the flute of the tan fox, upright on the right leg). `probeLaps()` of `tools/lap-rest.ts` poses each seated body of the role in the rest before the first play of each demo, at the wall times of `REST_WALLS` (10 s, 13.7 s, 21.1 s, and 29.3 s). The lower end of the instrument is each corner less than 2 cm above its lowest corner, and in parentheses the row gives the depth of its deepest corner in the body. For the flute, the row gives the largest gap of the lower end to the skin of the thighs and the hips, with the mark `OVER` above 2 cm. A violin role gets the upright rest of `docs/decisions/2026-10-16-bow-rest.md`, with the mark `OVER` outside each goal: the height of the lower end above the left side of the top of the lap (above 2 cm, or 1 cm into the body), the deepest corner of the violin in the body (above 1 cm), the tilt of the violin from the vertical (above 15°), the place of the left palm along the violin from its lower end (outside 0.45 to 0.7), the tilt of the bow (above 15°), the height of the frog end above the right side of the top of the lap (above 3 cm, or 1 cm into the body), the deepest point of the bow in the body and in the upper arms and the forearms (above 0.5 cm), and the right elbow of `docs/decisions/2026-10-16-rabbit-arm.md`: its height above the right shoulder joint (above 0), its distance behind the back of the trunk at its height (above 5 cm), its distance out from the right side of the trunk at its height, seen from the front (above 8 cm), and the angle of the right upper arm from the vertical (above 35°). The trunk at the height of the elbow is the skin of the hips, the spine, and the chest, each triangle moved by its main bone alone (`armRest()` of `tools/lap-rest.ts`), because the raised arm drags the skin under the armpit out. The top of the lap is the skin of the thighs, the shins, the hips, and the spine, as `lapPoint()` finds it, and a frog or an end that is not over it gets `Infinity`. The depths of the bow take a point at each 1 cm along each edge of the bow. A mark `OVER` follows a depth over its limit and play folds over 1% of the samples. Before the table, each variant prints the deepest point of each set with its demo, its player, and its time, and the sample of each largest value of the lap rest. The syntax of `--set` is the syntax of `pnpm pose-depth --set`, such as `violin@fox-red.slant=-20deg`, or `viola@cat.restBow.via=null` for the direct mix of the rest bow and the playing bow. The tool finds the sweep role whose players are bodies of the role, and sweeps only these bodies, so a new role needs no entry in the tool. A role with no sweep gives the folds only. With no `--demo`, it takes the demos of `FIT_DEMOS` that have the role: the demos of the deepest points of the red fox. One variant of `fox-violinist` then takes about 70 s, and `--demo all` takes all demos of the role (173 s). `--sets <set>[,<set>]...` takes only the named sample sets of `FIT_SETS` (`play`, `lift`, `rest`, and `lower`) for the folds and the sweep, and the table gives `-` for a fold set that the run skips. The folds have no lowering. The rest mode `--sets lift,rest,lower` skips the play samples: on 2026-10-16, one variant of `fox-violinist` on `FIT_DEMOS` took 5.2 s, and 68.7 s with all sets. It goes with `--set`, `--grid`, `--demo`, and `--base`. `--json <file>` writes the demos and the rows as JSON. `--base <ref>` fits a commit, a branch, or a tag and the working tree at the same time, each in a child process, as `pnpm pose-depth --base` does. The commit runs the base with no change, on the tools of the commit. A role that the commit does not have stops the run before the probes with the message "The ref <ref> has no role <role>". The table then starts with the row of the commit, and one compare of the depths in the H of each body follows for each variant. The JSON of each side holds the format version of its tool and the field `since`: the oldest version that its version only adds fields to (`ProbeFormat` of `tools/ref-tree.ts`, `FIT_SINCE`). Two versions compare when the newer version only adds fields to the older version. Then the tool prints a note. When the working tree is newer, the compare gives `-` for each new field on the side of the commit. When the commit is newer, the compare shows the fields of the version of the working tree. Else the compare stops with both versions in the message (`formatNote()`): each side runs its own tool, so a changed field gives false differences. On 2026-10-16, the version 7 of the right arm compared with the version 6 of `56704f33~1` (`--sets rest --demo bach-bwv1050`) in 3.7 s, with `-` in the four columns of the right elbow of the commit. The JSON of the commit goes into a cache by tree, `probe-cache/` in the common folder of git, which each worktree shares (`baseCacheFile()` of `tools/ref-tree.ts`). Its key holds the trees of `PROBE_PATHS` of the commit, the scripts of the working tree that the probe copies, the arguments of the commit, Node, and the lockfile. A second run with the same key prints `base: cached`, and runs only the working tree. `PROBE_NO_CACHE=1` runs the commit again. On 2026-10-16, `pnpm hold-fit violinist --sets lift,rest,lower --set 'violin@rabbit.restBow.lap.along=0.9' --base main` took 15.2 s with 27.7 s of CPU, and 15.1 s with 17.1 s of CPU and `base: cached`: the working tree runs two variants, and the commit one. A commit whose tool does not know an option of the run, such as `--sets` before 2026-10-16, stops the run with the message of its tool. With `--base main`, `fox-violinist` took 44 s, about the time of one variant alone. A compare with `--sets lift,rest,lower` and one variant took 15 s. It runs with no build, and the source files do not change. `--grid` adds one variant for each value of a hold from `<a>` to `<b>` at each `<step>`, with both ends, such as `violin@fox-red.lean=10deg:20deg:5deg`. A value with `deg` is an angle in degrees, and the three numbers all have the unit or none has it. A path can name one number of a list by its index, such as `piano.restL.lap.offset.1`. Several `--grid` options give the product of their ranges. The tool states the count, and it stops above 40 variants of the grids on all `--set` variants (`GRID_LIMIT`), because one variant takes 45 s to 90 s. With `--set`, the grids go on top of each `--set` variant: each `--set` variant takes the product of the ranges, with the changes of the grid after its own changes, and the run has no row of a `--set` variant alone. With no `--set`, the grids go on top of the base. On 2026-10-16, `pnpm hold-fit violist --set 'viola@cat.restBow.via=null' --set 'viola@cat.lean=10deg' --grid 'viola@cat.slant=-20deg:-15deg:5deg' --sets lift,rest,lower` gave the base and 4 variants in 35 s. With a grid, the table keeps the base first and sorts the variants by the share of the play samples with a fold, then by the deepest point: the largest depth less its limit over the sample sets. `--faces <n>` prints the face table and the corner table of `pnpm fold-probe --faces` for the base and for the best variant, the first sorted variant. With `--base`, the commit runs with no `--set` and no `--grid`, its row is the base of the faces, and the face table of the working tree with no change follows it. One variant of the flutist on `FIT_DEMOS` took 24 s. `--scan` scans variants of the rest of a role with a lap rest in one rest sample: the first seated body of the role in the first demo of the run at the wall time 21.1 s (`SCAN_WALL` of `tools/lap-rest.ts`), or one sample at each wall time of `--walls` in each demo of `--demo`. For each variant, it builds only the rig of that player again (`scanRest()` of `tools/lap-rest.ts`), and the scene of each demo stays. It prints its samples, and one row for each variant and sample: the folded faces of the studio skin by side, the goals missed (the cells with the mark `OVER`), and the cells of the rest columns. The values are the values of the rest columns and of the rest folds for the same sample. It goes with `--set`, `--grid` (up to 1000 variants, `SCAN_GRID_LIMIT`), and `--demo`, and with none of `--base`, `--json`, `--faces`, `--sets`, and `--step`. With a grid, it sorts the variants by the goals missed, then by the folded faces. It prints its time. On 2026-10-16, 101 variants of the `violinist` (a grid 10 × 10 of `violin@rabbit.restBow.lap`, `docs/decisions/2026-10-16-retro-arm.md`) took 5.6 s with one sample, and 14.9 s with the four samples of `REST_WALLS`. The same 101 variants as `--set` options with `--sets rest --demo bach-bwv1050` took 69.7 s. |
| `pnpm choir-check <dir>` | Builds the site and compares the penguin of the gallery with one penguin of each of the two newest reference images (design 4.4, 7.1). It writes into `<dir>` the gallery penguin at the front camera of `orchestra-latest.png` with a closed beak, and at the right side camera of `orchestra-side.png` with an open beak, and `choir-compare.png` and `choir-compare.webp`: the crop of each reference image beside its render. It stops the server and the browser at the end. |
| `pnpm body-probe [--out <file>] [--no-poses]` or `pnpm body-probe --base <ref>` | Probes the rest joints and a hash of the body mesh of each species on each support and standing, and the skeleton and a mesh hash of each player of the section cast and of the conductor. The mesh hash covers the places, the colors, the bones, the blend weights, and the finishes, and for a studio body the corrective shapes and the smooth normals. Each of these fields also has a hash of its own. It also gives a hash of the poses of each player and of the conductor of each demo in four sample sets. The sets are the rest pose, the lift, the play at a step of 0.5 s, and the lowering after a pause and after the song end. Each set has a hash of all its poses and a short hash of each sample, from the rotations, the offsets, and the blink in micro-units. `--out <file>` writes the probe as JSON of about 2.6 MB. The JSON of the same code is the same byte for byte. With no `--out`, the tool prints only a summary: the counts of the species, the bodies, the players, the demos, and the pose sets, and the SHA-256 of the JSON. `--no-poses` probes only the bodies and the players. `pnpm body-probe --compare <base.json> <new.json>` prints the counts of equal bodies, players, and pose sets, and a line for each difference, and fails on a difference. A line of a body or of a player names the fields of the mesh that changed, such as `mesh differs (colors, normals)`. A line of a pose names the player and each set that changed, with the first sample that differs. `pnpm body-probe --base <ref>` extracts `src/`, the demo files, and `tools/` of a commit, a branch, or a tag into a temporary folder. The folder also gets the scripts of `tools/` of the worktree that the commit does not have (`withProbeTree()` of `tools/ref-tree.ts`), and the `node_modules` of the worktree. Thus the probe of the commit runs on the tools of the commit. A child process probes that folder while the tool probes the working tree. Then the tool prints the compare of `--compare`. It removes the folder at the end, also after a failure and after Ctrl-C. The JSON holds the format version of the tool (`PROBE_FORMAT`), and `--base` and `--compare` stop with both versions in the message when the two versions differ. It runs in about 6 s with no build, also with `--base`. |
| `pnpm shot-trace <demo> [--from <s>] [--to <s>] [--cameras] [--base <ref>]` | Prints the choice of the shot planner at each cut of a time range, all cuts by default (design 5.6). The choice comes from `traceShots()` of `src/shots/prepare.ts`, with the seed of the app. `<demo>` is a demo of `demos/src`, with or without `.mid`, or a chamber test file of the shot tests: `piano-solo`, `violin-piano`, `string-quartet`, or `wind-quintet`. The tool prints the shots that start in the range. Then, for each cut, it prints the end of the choice, each candidate that a rule drops with the rule (rules 1 to 3c), and the other candidates in the order of the search, with their scores, their ranks, and their tries in each elevation band. The candidate whose try found the camera of the shot has the mark `chosen` (`CutTrace.chosen`). Each try gives the counts of the refusals of its cameras: a jump cut, a repeat of the last framing, a head or an object in the foreground, the beam edge or the other beam side, the distance share against `CLOSE_DISTANCE_SHARE`, and a blocked camera, sight line, or line to the target. The nearest refusal by the distance gives its share and its camera. `--cameras` lists each tested camera with its refusal. With `--base <ref>`, the commit and the working tree run at the same time (`probeBeside()`), and the tool prints both. A row of a shot of the working tree that the commit does not have ends with `changed`. A commit with no `CutTrace.chosen` gives no mark `chosen`. The JSON of each side holds the format version of its tool, and two versions stop the compare with both versions in the message (`checkFormat()` of `tools/ref-tree.ts`): each side runs its own tool, so two formats give false differences. A commit with no `traceShots()` gives only its shots. A run takes less than 1 s, also with `--base`. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site with `vite preview`, in Chromium, Firefox, and WebKit. The smoke test of design 9.3 (`e2e/smoke.e2e.ts`) plays the default demo for 4 s, and checks that the song time increases after the count-in, that the canvas shows the scene, and that the page has no errors and no failed requests. Run `pnpm build` first. `--project` selects one browser (`pnpm exec playwright install <browser>` one time). `ZOOPHONY_E2E_PORT` sets the port of `vite preview` (4182 when it is not set, as in CI). An agent sets a free port, so that its run does not stop on the port of another run. |
| `pnpm smoke` | Runs the smoke test of design 9.3 on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. It writes the files of `pnpm dev` first, and it stops the server and the browser at the end. |
| `pnpm keyboard` | Builds the site, serves `dist/` with `vite preview`, and checks each control with the keyboard alone in headless Chromium at 1440 × 900 and at 390 × 844 (design 9.5, step 6). It prints a Markdown table of the controls, the keys, and the results, and fails on a failed check. It stops the server and the browser at the end. |
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts the rigged GLB body of a species (design 4.4): copies the file to `assets/models/<species>/<species>.glb` with a README of its checksum, inspects it with `tools/blender/inspect_glb.py`, and writes the proposed config `tools/glb-bodies/<species>.json`. The proposal maps the Mixamo joints, takes the palette from clusters of the face colors, finds the eyes, the nose, the ears, and the finger blocks, and scales the body to the head center of the current body of the species. The tail gets no vertex. `--force` writes over an existing config and README. `--preview` also writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Prepares the rigged GLB body of a species with Blender (design 4.4) and writes `src/models/rigged/<species>.ts`. `tools/glb-bodies/<species>.json` gives the source file, the height, the map from its joints to the bones of the player, the bones that the file does not have, the color rules, and the triangle budget. `tools/blender/rig_body.py` welds the mesh, measures the eyes and the nose from the texture, collapses the mesh to the budget, adds the eye plates, keeps two bones for each vertex, and bakes the texture into the skin `src/models/rigged/<species>-skin.webp`, with the fur and the accent in the colors of the species. With `--preview`, `tools/blender/preview_rig.py` also writes `skin.png` and `bones.png` into `<dir>`: the skin and the main bone of each face. Blender 5.2 or later comes from the variable `BLENDER`, or from the path. |
| `pnpm rig-mesh <animal> [--preview <dir>] [--check [--set <changes>]... [--roles <list>] [--step <s>] [--demo <id>]... [--faces <n>]]` | Rigs a textured mesh with no skeleton into the GLB format of a studio body (design 4.4) with Blender, so that `pnpm studio-body` reads it. `tools/mesh-rigs/<animal>.json` gives the source file, the output file, the joints in the units of the studio, the arm factor and the reach of the app, the leg factor, the head factor, the neck factor, and the trunk factor, the seat and the bind arms of the studio, the drop of the haunch onto the seat, the pose of the shape of a raised arm, the weight rules, the rings and the flips of the arms, the color rules, and the chair. The radius of a ring is `radius` in units, or `part` of the arm part that ends at its joint (0.75 with neither), so that it grows with the arm factor. The tool first checks that the arm factor gives the reach, within 1%. `tools/blender/rig_mesh.py` welds and scales the mesh, gives each face one color from the texture (the mean of its samples that are not dark), gives the weights with bone heat and the rules, smooths the vertices inside a box (`smooth` of the config) and writes the move of the head center back to the head before the smoothing, makes the free arms longer from the shoulder joints out, makes the thighs and the shins longer (each between its joints, and the body rises so that the soles stay on the floor), grows the head around the neck joint, shortens the neck between its joints, shortens the trunk between the hips joint and the neck joint (the head, the arms, the legs, and the tail move with it and keep their sizes), adds the rings of new vertices at the joints of the arms and flips the long edges of the faces that are thin in the bind, poses the seated bind, curls the seated tail along a curve (`studio.tailCurl`), relaxes the faces that the bind turns over, lowers the underside of the haunch behind the hip joints onto the seat (`sit` of the config, with the root of the tail as the haunch, `sit.root`, and a fixed seat top, `sit.top`), turns the trunk upright around the head of the hips with a share of the turn for each trunk bone and lifts the haunch back onto the seat top (`studio.trunk`), smooths the bind across the crease of the belly and the thighs (`crease`), adds a gloss shell over each eye as the mark of the eye for `pnpm studio-body`, gives the faces of each old eye and each patch of dark faces near it (`darkReach` of `eyeShell`) the color of the fur around it after the palette, moves the faces of the plain fur in Oklab (`colors.tone`), finds the corrective shapes and the shape of a raised arm (`raise` of the config), and writes the GLB file with its own code. A second run writes the same bytes. With `--preview`, it also writes the seated and the standing body from four sides, the knees, the neck from the side, the front, and the back, the main bones, and `source-long-arms.obj` into `<dir>`. With `--check`, the rig goes into a temporary folder, and the tool writes no file into the repository. The first line gives the shoulder joint, the reach with no factor, and the factor of the target reach. The check goes on when the factor of the config misses the target. It stops when the triangles are above the budget of a studio body. It prints the size and the SHA-256 of the rig, so that a rig with the bytes of the GLB file of the repository shows its hash. It prints the module of `pnpm studio-body` and its gzip size. It prints the gzip size of the packed mesh against its budget (`tools/studio-budgets.ts`). It prints the scale, H, the seat height, the seat of the legs (the export with no seat of `ANIMALS`), the chair depth, and the reach of each arm. It prints the lowest point above the floor of each leg and of the tail (the vertices whose largest weight is on a bone of the chain), in the seated bind with the seat height, and in the standing body. It prints the largest error of the standing body of the app against the long-armed source, with a limit of 1 mm, and the vertex of that error: its index in the packed mesh, its error, and its bones with their weights. It lists the thin faces near the joints of the arms and the legs as candidates for a ring. `check.thin` of the config gives their corner angle, the length of their longest edge, and their distance to the joint. Before these lines, the log of Blender lists each face whose normal turns more than 45° from the source to the long-armed source or whose shortest edge keeps less than half of its length, and each long thin face of `check.thin` across the plane of an arm joint that no ring cuts, with the index of the face in the module. Then the tool runs `pnpm hold-reach <species>` for a violinist role with the body of the rig. It also runs `pnpm fold-probe <role>` for each role of the app with the body of the animal, and `tools/rig-form.ts`, which measures the form of each player of the animal and the stage side of each demo. `tools/rig-form.ts` of the working tree also runs one time in a probe tree of `main`, before the first rig: it imports only the code of the app and the demo patches, so both form tables have one format. `pnpm rig-mesh rabbit --check` takes about 50 s, most of it for the folds of 14 demos. `--roles <role>[,<role>]...` limits the fold probes, the reach, and the form tables to these roles of the animal, and a role that the animal does not have stops the tool before the first rig. `--step <s>` and `--demo <id>...` go to `pnpm fold-probe`. With `--roles fox-violinist --step 1`, one variant of the fox took 19 s, and 75 s with no option. Each `--set` of `--check` is one variant of the config, with its changes separated by `;`, such as `weights.haunch.height=0.2,0.27;armFactor=1.08`. The path names the keys of the config, and the index of an item of a list is a key too. The new value has the kind of the old value. A list of numbers takes numbers separated by commas, and another list or an object takes JSON text. A variant can add the optional rules `sit.root`, `sit.top`, `studio.tailCurl`, and `colors.tone`, which the config may not have (`OPTIONAL_VALUES` of `tools/rig-mesh.ts`). An unknown path stops the tool before the first rig. So do an empty variant (`--set ''` or `--set ';'`) and a path that changes only printed text: `output`, `app.reach`, a note, and `app.shoulders` of an animal of `ANIMALS`, whose scale comes from its entry in `ANIMALS` of `tools/studio-body.ts`. A variant keeps the meters for each unit of the base: the landmark height of `ANIMALS` and `app.shoulders` move with the standing shoulder joints of the variant (`keptHeight()`), so a longer leg raises the body and a shorter trunk lowers it, and the trunk, the head, and the arms keep their meters. The tool reads the config file one time, at the start. Each check writes the text of the base or of its variant into its temporary folder, and the config file of the repository does not change. After the base and each variant, the tool prints one table with one row for each variant: the triangles, the gzip size of the packed mesh, the scale, the seat, the seat of the legs, the chair depth, the reach of each arm, the error of the standing body, the play, lift, and rest folds of each role of the animal, and the 3 main bones of the folded faces of each role with their face-samples. `--faces <n>` adds a column of each role with the `n` faces that fold in the most samples. Three tables against `main` follow. The first gives the seat, the visible head, the standing and the seated head tops, and the footprint of each player of the animal. The second gives the hold anchors of each seated player (the head center, the head height H, the nose, and the box of the instrument), each with its move in mm and the mark `MOVED` above 1 mm. The third gives the stage side of each demo with the largest change of each variant. A variant that fails gives its message in its row, the next variant runs, and the exit code is 1. With `--preview`, each variant writes its images into `<dir>/base`, `<dir>/variant-1`, and so on. Each check removes its temporary folder at the end, also after a failure and after Ctrl-C. One variant of the fox takes about 75 s, with its two roles. Blender 5.2 or later comes from the variable `BLENDER`, or from the path. |
| `pnpm studio-body <animal> [--inspect [--glb <file>]]` | Writes `src/models/studio/<animal>.ts` from the GLB file of an animal of the studio, `lowpoly-studio/animals/<animal>/out/<animal>.glb`, or from the file of `glb` of its entry in `ANIMALS`, such as the rig of `pnpm rig-mesh rabbit` (design 4.4), with no Blender: the welded mesh with no eyes of the mesh, the skin of up to four bones, the places of the pea eyes of the app on their eye bones (`StudioBody.eyes`), the arm-down corrective shapes, the shape of a raised arm of a mesh rig with its pose, and the bind pose of the bones of the studio, turned to face -z and scaled by the landmark of the animal (`ANIMALS`: the shoulder joints of the bear at 1.0 m, the keys of the studio piano of the polar bear at 0.83 m, 0.13 m above the keys of the app since its longer shins, the standing shoulder joints of the rabbit at 0.6972 m, those of the red fox at 0.969 m, and those of the cat at 1.16494 m). The four digits of a paw become its one finger bone. A seated role drops until its soles are on the floor, with the front edge of its studio seat at the front edge of the seat of the app, and gets the height of a flat seat under it. With `seat` of its entry, it then rises until its seat is at that height, and its feet hang above the floor. With `seatBack` of its entry, it moves back on its chair, up to the gap of the chair back, and the chair grows forward under it by the rest of the move. A file with a head factor of `pnpm rig-mesh` keeps the head height and the head center of the head before the growth for the holds, and a file with a neck factor puts that head center on the short neck. A file with a smoothing of `pnpm rig-mesh` keeps the head center of the head before the smoothing. A chair also gets the depth of the chair of the studio (`chairDepth`). A seated role that also stands (`soloist`) keeps the leg corrective shapes and the leg turns of the clip `reference` (`standing`), and for a rig that turns the trunk, the trunk turns and the arm turns of that clip. It drops the props of the studio: the baton, the violin and the bow in the paws, the bench, the chair, and the piano. Run it after `python3 studio build <animal>` or `pnpm rig-mesh <animal>` changes the GLB file. With `--inspect`, it writes no file, and it prints the facts of the GLB file that a new body needs. These are the scene nodes, the faces of each material, the morph targets, and the joints of the skin. The joints show the digits of each paw and the joints that the export drops or refuses. It also prints the clips with the hips at their first key, the hips of the bind pose, the length of each arm from the shoulder joint to the middle of the palm along the joints, and the lowest point of the skin. The props show their boxes, the bench top, the key top, and the key front. Each length is in studio units and in meters at the scale of `ANIMALS`. An animal that is not in `ANIMALS` gets the shoulder joints at 1 m. `--inspect --glb <file>` inspects another file with the settings of the animal. `pnpm hold-reach` and `pnpm fold-probe` also take `--glb <file>`. Each one makes the studio body of the animal from the file in memory. It writes the module into a copy of `src/` in a temporary folder (`tools/glb-swap.ts`). Then it runs the probe there in a child process. `ANIMALS` and `src/` do not change. |
| `pnpm close-views <role> <dir> [--url <url>] [--base <ref>]`, `pnpm close-views lineup <species,...> <dir> [--url <url>] [--base <ref>]`, `pnpm close-views species <species,...> <dir> [--views <view,...>] [--moment <play\|rest>] [--zoom <n>] [--elevation <deg>] [--url <url>] [--base <ref>]`, `pnpm close-views play <dir> [--demo <id>] [--time <s>] [--camera <name>\|<dx>,<dy>,<wheel>]... [--url <url>] [--base <ref>]`, or `pnpm close-views batch <dir> [--species <species,...>] [--moments <moment,...>] [--views <view,...>] [--zoom <n>] [--elevation <deg>] [--role <role>]... [--lineup] [--camera <name>\|<dx>,<dy>,<wheel>]... [--demo <id>] [--time <s>] [--url <url>] [--base <ref>]` | Builds the site and writes close views of a role from the gallery into `<dir>`, and the grid of all views (`<role>-views.png` and `.webp`). `conductor`: the bear from the front, the right side, and the back, at the four beats of a bar of the test notes, between two beats, and in the rest pose. `pianist`: the polar bear from the front, both sides, and the back, at a chord in each paw, between chords, and in the rest pose. `violinist`: the rabbit from the front, both sides, and the back, at the frog and the tip of a whole bow, at a string crossing, in the rest pose, and standing at the frog (the gallery query `stand`). `fox-violinist`: the red fox in the views and the moments of the violinist, with its tail on the chair in the side views and the back view. `violist`: the cat in the views and the moments of the violinist, with a whole bow on the A string and a crossing from the C string. `flutist`: the tan fox from the front, both sides, and the back, at a long note, between two phrases, in the rest pose, and standing at the note. The open lid and the muzzle hide the paws in the front view and in each view from above. So a fifth view is low from the left, 15° to the front. It shows the left paw on the keys, and the right paw stays behind the body. The camera of the pianist turns around the box of its body, with the azimuth 0 at its front (the gallery query `body`, design 7.1). The conductor keeps its fixed line. A new role adds one entry to `ROLE_VIEWS` of `tools/close-views.ts`. The entry gives its species, its views, its moments, and its test notes, with the camera `{ kind: 'body', zoom: 1, elevation }`. It needs no other camera value. `--url` renders a running site, such as the dev server, in place of the built site. `--base <ref>` also builds the commit, a branch, or a tag in a temporary folder, as `pnpm size --base` does, and serves it. It writes each cell of the commit as `<role>-base-<moment>-<view>.png`, and the grid of the commit above the grid of the working tree as `<role>-base-views.png` and `.webp`. The label of each cell starts with the commit or with `working tree`. The folder goes away at the end, also after a failure and after Ctrl-C. With `--base main`, the violinist takes about 31 s with both builds. Its servers start at port 4300 and move up to a free port, so they never take 4182. `lineup` writes the named species standing side by side in the rest pose, low from the front, as `lineup.png` and `.webp` at 1440 × 720. The camera has one fixed distance (the gallery query `distance`, design 7.1). The tool reads the box of the models of each site, and chooses one camera that shows the tallest model and the widest row of both trees whole. With `--base`, the build of the commit takes `src/gallery/` of the working tree when the two galleries differ, so that an older gallery gets the same camera code. Then the tool writes `lineup-base.png`, and the lineup of the commit above the lineup of the working tree as `lineup-base-views.png` and `.webp`. A lineup with `--base main` takes about 7 s with both builds. `species` writes each named species of the gallery alone on the support of its instrument, with the camera around its body. The views of `--views` are in `SPECIES_VIEWS`: `front`, `front35` (35° to its right side), `left`, `side` (its right side), `back`, and `above35` (35° down from the front). The side views are 3° above the floor, so that the knees and the seat show. The front and back views are 10° above it. The default views are `side` and `front35`. `--zoom <n>` takes the camera nearer to the middle of the box of the body (1 or more, 1 by default), such as 2.5 for the armpits and the lap of a seated player, and `--elevation <deg>` gives each view one angle above the floor (0 to 89). The label of each cell gives both. On 2026-10-16, `species rabbit --zoom 2.5 --elevation 15 --views front,front35,side --moment rest` took 5.2 s with the build. `--moment play` (the default) gives the playing pose at the time 0 of the default test notes, and `--moment rest` the rest pose. The tool writes each cell as `species-<species>-<moment>-<view>.png`, and the grid with one row for each species and one column for each view as `species-views.png` and `.webp`. With `--base`, it writes each cell of the commit as `species-base-<species>-<moment>-<view>.png`. The grid `species-base-views.png` and `.webp` puts the row of the commit directly above the row of the working tree for each species. `play` writes the play frame of a demo at 1440 × 900 for each `--camera`, as `play-<camera>.png`. `--demo` takes a demo of the app, the default demo by default. A camera is `default` (the default view of "Reset view"), `violins` (low from the front left, close to the violins, the camera of the frame of the user of 2026-10-16), or `<dx>,<dy>,<wheel>`. That is a drag in CSS pixels and wheel steps of a zoom in, from "Reset view" (`PLAY_CAMERAS`). The tool plays the demo, closes the drawer, moves the camera, and seeks to 4 s before `--time` (6 s by default). It takes the frame when the seek bar reaches the time and the bar hides, and prints the song time of the bar. The grid `play-views.png` and `.webp` has one column for each camera. With `--base`, it writes each frame of the commit as `play-base-<camera>.png`, and the row of the commit above the row of the working tree as `play-base-views.png` and `.webp`. Each label of a grid is white on a dark box. On 2026-10-16, `species fox-red,rabbit` took 5 s, or 11 s with `--base main`. `play --camera default --camera violins` took 21 s, or 45 s with `--base main`. These times include the builds. `batch` makes the image set of a model round in one run. It builds the working tree one time and the commit of `--base` one time, and one server and one browser serve each tree. Each part is the command line of a single mode, and it writes the files of that mode into its own folder of `<dir>`. `--species` gives the mode `species` at each moment of `--moments` (`play,rest` by default), at `--views`, and with `--zoom` and `--elevation`, into `species-<moment>/`. Each `--role` gives the close view of the role, into `<role>/`. `--lineup` gives the lineup of the species of `--species`, into `lineup/`. The `--camera` options give the mode `play` with `--demo` and `--time`, into `play/`. `--url` and `--base` go to each part. When `src/gallery/` differs between the working tree and the commit, the lineup gets a second build of the commit with the gallery of the working tree, and the tool prints a line. A name that comes two times also stops the tool before the build. So do `--moments`, `--views`, `--zoom`, `--elevation`, or `--lineup` with no `--species`, and `--demo` or `--time` with no `--camera`. On 2026-10-16, the image set of the round `cat-trunk` (`batch <dir> --species cat,fox-red,rabbit --role violist --lineup --camera default --camera violins --base main`) took 90 s in one batch and 115 s in five runs. The script of `package.json` runs the tool with `--check` before the build. An unknown role, species, view, moment, demo, camera, option, or commit then stops it before the build, and the message lists the correct names. So does a time of the mode `play` below 4 s, the seek lead, or at or after the end of the demo. It stops the browser and the servers at the end. |
| `pnpm fold-probe <role> [--demo <id>]... [--step <s>] [--faces <n>] [--turns <face>] [--json <file>] [--glb <file>]` or `pnpm fold-probe <role> --base <ref> [--faces <n>]` | Counts the folded faces of the skin of the studio body of a role (`conductor`, `pianist`, `violinist` for the rabbit, `fox-violinist` for the red fox, `violist` for the cat, or `flutist` for the tan fox) over each demo with the role (design 4.4). Each role of a player names its species, because two species with studio bodies play the violin. It poses the first player of each model of a demo, with the support of the player. A face is folded when its posed normal is more than 90° from its bind normal, moved by the mean skin matrix of its corners. It prints one row for each sample set. The sets are the rest pose, the play at each step of 0.25 s by default, and the first 3 s of the arm lift. Each row gives the samples, the samples with a fold, their share, the most folded faces of one sample split by the side of their main bone (`_L`, `_R`, and the middle, `sideSplit()`), and the worst sample. Then it prints the folded faces by the main studio bone. `--faces <n>` then prints the `n` faces that fold in the most samples: the index, the share of the samples of each set, the mark `ALL` for a face that folds in each sample of each set with samples (`foldsInAll()`), the main bone, the middle in meters, and the three corner angles. A second table gives each corner of these faces in the worst fold of its face (`cornerSamples()`): the vertex, its place in the bind pose and in the posed skin in meters, the move of each corrective shape at its full weight in millimeters with the weight of the shape in the sample, the move of all shapes in the sample, and the bones and the weights of the corner. On 2026-10-16, `pnpm fold-probe violist --faces 6` took 39 s on 14 demos, and 41 s before the corner table. `--turns <face>` then prints the turn probe of the face: the mean turn of the upper arm of the side of the face in the bind axes of the chest over the samples in which the face folds, the mean direction of the upper arm in these samples (out, up, forward), and the share of the samples with a fold in each bin of 10° of the angle from that turn. For face 389 of the red fox violinist at a step of 1 s, it took 12 s. `--json <file>` also writes the samples, the samples with a fold, and the most folded faces with their split of each set, and each folded face with its main bone, into the file, for the table of `pnpm rig-mesh --check`. `--demo` takes the file name with or without `.mid`. `--glb <file>` gives the role the studio body that the export makes from the file, as `pnpm studio-body` describes. A new role adds one entry to `FOLD_ROLES` of `tools/fold-probe.ts`. On 2026-10-14, a run with no build takes about 10 s for the pianist on 4 demos. It takes 32 s for the conductor and 36 s for the violinist on 14 demos. `--base <ref>` runs the probe on a commit, a branch, or a tag and on the working tree at the same time, each in a child process (`probeBeside()` of `tools/ref-tree.ts`), and prints the share of the samples with a fold and the most folded faces of one sample with their split of each set on both trees. A role that the commit does not have stops the run before the probes with the message "The ref <ref> has no role <role>". The JSON of each side holds the format version of its tool and the field `since`: the oldest version that its version only adds fields to (`ProbeFormat` of `tools/ref-tree.ts`, `FOLD_SINCE`). Two versions compare when the newer version only adds fields to the older version. Then the tool prints a note. When the working tree is newer, the compare gives `-` for each new field on the side of the commit. When the commit is newer, the compare shows the fields of the version of the working tree. Else the compare stops with both versions in the message (`formatNote()`): each side runs its own tool, so a changed field gives false differences. The JSON of the commit goes into a cache by tree, `probe-cache/` in the common folder of git, which each worktree shares (`baseCacheFile()` of `tools/ref-tree.ts`). Its key holds the trees of `PROBE_PATHS` of the commit, the scripts of the working tree that the probe copies, the arguments of the commit, Node, and the lockfile. A second run with the same key prints `base: cached`, and runs only the working tree. `PROBE_NO_CACHE=1` runs the commit again. On 2026-10-16, `pnpm fold-probe fox-violinist --demo mozart-k525 --step 1 --base main` took 2.2 s, and 1.2 s with `base: cached`. `--faces <n>` adds a table of the faces: the `n` faces that fold most on the working tree, then the `n` faces of the commit that the rows do not hold yet. Each row gives the face on each tree, the share of each set on both trees, the mark `new` (no fold on the commit) or `gone` (no fold on the working tree), the main bone, and the worst fold. Two bodies with the same corners keep the index of each face. Else the faces of the two trees pair one to one by the distance of their middles in the bind pose, the nearest pair first, within 1 cm (`sameFaces()`). The face table of `--faces` with no `--base` also gives the worst fold of each face: the sample in which its normal turns farthest, the angle, and the studio bone whose turn changes the normal most (`turnBone()`). That bone gives the skin matrix of its parent to each corner, and the normal of the face turns farthest. `--base` goes with none of `--glb`, `--json`, and `--turns`. With `--base main`, the red fox violinist on one demo takes about 1.5 s. |
| `pnpm docs-species <species> [--all]` | Prints each place of the docs checklist of section 8 of `docs/briefs/studio-body.md` that does not name a species yet: a new studio body, a new role, and a new hold. Each line gives the file with the lines of the place, the heading of the row, and the line of the row in the brief. A place names the species when its text holds the id of the species, the id of its own body, or one of its English names in the docs (`DOC_NAMES` of `tools/docs-species.ts`), such as `fox-red`, `studio-fox`, "red fox", and "foxes". The name of another species that holds one of these names, such as "polar bear" for the bear, does not count. Section 8 gives the rules of the cells that find each place. The column "Not for" of a row names the species that the place is right not to name, such as a species with no sheet page for the list of the sheet pages, and the tool skips the place for them. A place that the tool cannot find, such as a heading that a round renamed, prints `not found` with the part of the cell that it did not find. `--all` also prints the places that name the species. The tool exits with 1 when a place misses the species or is not found. It runs in less than 1 s with no build. |
| `pnpm frame [--demo=<id>] [--free] [--scale=<n>] [--max-cpu=<percent>] [--wait=<s>] [--no-metal] [--gpu-only] [--keep=<dir>] [--headed]` | Measures the frame target of design 9.7 on the development Mac. The rule "Frame time" of the Rules, which runs it before each report of a scene change, is paused since 2026-10-14. It measures `perf-60.mid` in Google Chrome at 1440 × 900 and the device scale 2, from a Vite dev server on port 4191 or higher. It writes the files of `pnpm dev` first. The main-thread phase starts when the CPU use of all cores over 5 s is at most 40% (`--max-cpu`). It waits up to 300 s for that (`--wait`), then refuses with the exit code 2. The 1-minute load average is for information. The first phase plays at 60 fps: the timer query of each frame for 10 s, then a seek to 32 s and a Chrome trace of the main thread for 10 s. The second phase plays with no frame cap, so that the GPU runs at its highest clock: the timer query for 10 s, then a seek to 16 s and a Metal System Trace of all processes for 3 s (`xcrun xctrace` of Xcode). Each trace thus lies in one section shot with the depth of field. The GPU phase has no CPU gate. It is valid when the GPU is in its "Maximum" state for at least 90% of the state time of the trace, the rows of "Maximum" cover at least 60% of the span of the GPU intervals, and other processes use the GPU in at most 10% of the trace. Else the tool records the GPU phase one more time, and then exits with 2. `--gpu-only` skips the phase at 60 fps. The tool prints the CPU use, the loads, the frame rates, the GPU states, the cover of the "Maximum" rows, the share of other GPU work, the guard, the song times of each trace (for the Metal trace, the song times of the messages of `xctrace` at the start and at the end of the record, which bracket the record), the self-check of the GPU row, the console warnings and errors of the pages with a count of each text, and a Markdown table with p50, p95, the max, and the part of the frames within 4 ms. The target rows are the main-thread tasks and the WebGL frames of the Metal trace. A WebGL frame starts at the command buffer with the clear of the drawing buffer. The trace sometimes gives no label to the clear. Then a frame also starts at a write of the canvas after the final pass. A command buffer with the clear or a write of the canvas counts. Each other command buffer that reads or writes a surface of another size than the drawing buffer is compositor work, and does not count. The tool reads that size from the page and prints it. The self-check uses only the sizes of the surfaces. It prints the WebGL frames against the count that the canvas writes of the whole trace give (two in each frame, less the writes of the partial frames at the ends), the frames with more than two writes of the canvas, and the time of the canvas buffers and of the other buffers that the filter dropped in each frame. The GPU row fails with a note when the filter gives no frame, when the dropped canvas buffers take more than 0.1 ms in each frame, when the count is more than 2% off, or when a frame holds more than two writes of the canvas. The frame rate of the page in the middle half of the record gives a second count for information: the page drew 1% to 3% more frames than the trace holds. It exits with 1 when a target row fails. `--no-metal` skips the Metal trace, and then the tool does not check the GPU. The timer queries are for information. `--keep` writes the Chrome trace, the tables of the Metal trace, and `run.json` into `<dir>` for the probes of `docs/research/2026-10-13-frame-time/`. `run.json` gives the commit, a flag for a working tree with changes, the drawing buffer size, the song times, the loads, the CPU use, the GPU states, the share of other GPU work, and the count of GPU records. A value flag with no value, a switch with a value, or `--gpu-only` with `--no-metal` or with no `xctrace` stops it with the exit code 2. It stops its browsers, `xctrace`, and the server at the end, also after a failure. After Ctrl-C, it waits for the close of each child process (a kill after 3 s), removes its temporary folders, and exits with 130. A run takes about 3 minutes, or 2.5 minutes with `--gpu-only`, most of it for the save of the Metal trace. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |
| `pnpm test` | Runs the Vitest tests of the project `unit` once: all tests except the speed tests and the paused tests (design 9.3). Since 2026-10-16, all tests are paused (`ALL_TESTS_PAUSED` of `vite.config.ts`), so it runs no test and passes. |
| `pnpm test:paused [--base <ref>] [<path>]...` | Runs the paused tests of the project `paused` once, for information (design 9.3, `docs/decisions/2026-10-14-test-pause.md`), with `tools/test-paused.ts`. They check the look, the fit, and the clearance of the bodies, and the layout from their footprints. `PAUSED_TESTS` of `vite.config.ts` lists them. Since 2026-10-16, all tests are paused, and it runs each unit test (`docs/decisions/2026-10-16-all-tests-pause.md`). A path runs only its file, such as `pnpm test:paused src/models/layout-scene.test.ts`. `pnpm test`, CI, `tools/check-commits.sh`, and `tools/merge-branch.sh` do not run them. The typecheck and the lint still read them. `--base <ref>` runs the paused tests on a temporary copy of a commit, a branch, or a tag and on the working tree at the same time, each in a child process with the reporter of the tool (`tools/paused-reporter.ts`). The reporter writes the title path of each failed test, each error of a test file or a suite outside its tests, such as an `afterAll` hook that throws, and each unhandled error. A run that ends with a code other than 0 and gives no failed test and no error counts as an error too. The copy holds `PAUSED_PATHS` of the commit (the source, the tools, the demos, the design and the decision files, and the config files), a link to the `node_modules` of the working tree, and a config file with a cache folder in the copy. The tool prints the count of the failed tests and errors of each tree, and only the tests that fail and the errors that come on the working tree alone. It counts each issue by its title path, so a test that fails one time more on the working tree shows. It exits with 1 when such an issue exists. When one run cannot start, the other run ends first. It removes the copy at the end, also after a failure and after Ctrl-C. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). Each one compares the time of a work with a reference work in the same run. Heavy load on the machine can make them fail. While all tests are paused, no check runs them. |
| `tools/merge-branch.sh [--check-only] <branch> [worktree]` | Rebases `<branch>` onto `main` in `<worktree>`, or in a temporary worktree. It checks each commit with `tools/check-commits.sh main` from its own folder, with the cache by tree. A commit that an agent checked before prints `hit` and runs no check. `MERGE_NO_CACHE=1` runs each check again. Then it checks that the commit hashes did not change. It runs the full `pnpm test` on the last commit with no cache, as a second guard. Then it runs `pnpm build`, `pnpm size`, and `pnpm test:e2e --project=chromium`. It skips these three checks for a branch that changes only `docs/` and Markdown files. While all tests are paused, it skips the end-to-end tests, and `MERGE_E2E=1` runs them. Before the end-to-end tests, it waits until the 1-minute load average is at most `MERGE_E2E_MAX_LOAD` (20). It also waits until the port of `ZOOPHONY_E2E_PORT` (4182) is free. The wait takes at most `MERGE_E2E_WAIT` seconds (900), and the script prints its cause. After a failure, the end-to-end tests run one more time. It prints the time of each step. Then it fast-forwards `main` and removes the worktree and the branch. At the first failure, it stops and keeps them. `--check-only` runs each check and does not merge. Run it from the main worktree, with `main` checked out. |
| `tools/check-commits.sh [--tip] [--no-cache] <base>` | Checks each commit of `<base>..HEAD` in place with `git rebase --exec`, from a copy of the script in a temporary folder. A commit that changes code runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the unit tests that its changes reach (`pnpm test --changed HEAD~1`). A commit that changes only `docs/` and Markdown files runs `pnpm format:check` and the tests that read a docs path. A commit that changes code and docs also runs these tests. `--tip` also runs the full `pnpm test` on the last commit. While all tests are paused, `pnpm test` runs no test. The script keeps each passed result in `$(git rev-parse --git-common-dir)/check-cache/`, which each worktree shares. For each commit, it prints `hit` or the time of each check. The key of a result holds the tree of the commit, the tree of its parent, and the check commands. It also holds the hash of the script and of `tools/check-cache.ts`, the versions of Node and pnpm, `ZOOPHONY_BASE`, and the hash of the installed lockfile. Only the script writes an entry, after each check of the commit passes on an unchanged tree. `--no-cache` reads no entry. The script refuses a working tree with changes or untracked files, and a range with a merge commit. A failure or a stop (Ctrl-C or `kill`) aborts its rebase and keeps the branch as it was. CI does not run it. |
| `tools/decision-rows.sh [--diff <base>] [<term>...]` | Prints each table row of `docs/decisions/*.md` that holds a term, with the file and the line. A term of the command line matches with no regard to case. With `--diff <base>`, the identifiers and the string literals that the diff of `<base>..HEAD` removes outside `docs/` are terms too. They match as whole names in the code spans of a row. A person reads the list. It stops no merge. CI does not run it. |
| `tools/break-test.sh '<perl expr>' <file> <test files>...` | Applies one temporary break to `<file>` with `perl -0pi -e`, prints the diff of the break, runs the named test files with Vitest, restores the file with `git checkout -- <file>`, and prints each test that fails, or "No test fails". A test file that does not load counts as a failure. Run it from the root of the worktree. It refuses a file that git does not track or that has changes that are not committed. It restores the file at the end, also after a failure and after Ctrl-C. It stops when the expression changes nothing. It exits with 0 when a test fails, 1 when no test fails, 2 for a refused call or a run with no report, and 130 after Ctrl-C. A copy of `tools/break-test.ts` from before the break reads the JSON report of Vitest. CI does not run it. |

CI (`.github/workflows/ci.yml`) runs `pnpm install`, then all commands above except `pnpm dev`,
`pnpm format`, `pnpm screenshots`, `pnpm snapshot`, `pnpm sheet-check`, `pnpm pose-probe`, `pnpm pose-depth`, `pnpm hold-reach`, `pnpm hold-fit`, `pnpm choir-check`,
`pnpm body-probe`, `pnpm keyboard`, `pnpm smoke`, `pnpm glb-init`, `pnpm rig-body`, `pnpm rig-mesh`, `pnpm studio-body`,
`pnpm close-views`, `pnpm fold-probe`, `pnpm shot-trace`, `pnpm docs-species`, `pnpm frame`, `pnpm test:paused`,
`tools/merge-branch.sh`, `tools/check-commits.sh`, `tools/decision-rows.sh`, and `tools/break-test.sh`. It runs `pnpm test:e2e` in one job for each browser, and only the Chromium job blocks a merge
(design 9.2). While all tests are paused, the step of `pnpm test:perf`, the job of
`pnpm test:e2e`, and the end-to-end test of the Pages workflow have `if: false`.
`.github/workflows/pages.yml` deploys the site to GitHub Pages under `/zoophony/` after CI passes
on `main`.

## Workflow

### Simplicity over compatibility

Nobody depends on this code yet, so simplicity outranks compatibility. Rename, move, and delete
symbols freely, and update all call sites in the same commit. Make each change directly, with no
deprecation shims, legacy branches, or compatibility aliases.

### Keep the docs true

- A change that alters behavior updates its file in `docs/design/` in the same session.
- A design file states the rules, the intent, and the reasons. It does not copy a value that
  lives in code and changes with each tuning, such as a color, a size, a stage width, or a test
  result. Name the code file instead, and put the measures of a tuning in its research report.
- When you move or delete code, update all pointers, comments, and TSDoc references. Grep for the
  old names before you finish.
- A commit that changes the value of a setting, or the reason for it, updates these in the same
  commit: its decision row, its design text, the line of its decision file in `docs/design.md`,
  and the TSDoc of the setting. Before the commit, grep `docs/`, `src/`, and `tools/` for the
  words of the old reason. Commit `18cd7e3b` changed the crease angle of the rabbit from 10° to
  35° with no docs, and three old claims stayed.
- `docs/research/` is a historical record. Keep each report as it was on its date.
- Each measured number of a research report names its log or the command of its probe. Keep the
  probe in the research folder of the report.
- `AGENTS.md` is in scope. Update it when one of its statements becomes wrong.

### Commits

Make one logical change per commit, and keep every commit green. After the project skeleton
exists (design 9.5, step 0), every commit passes `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
A commit that can change the speed of `score/`, `pose/`, or the synth engine also passes
`pnpm test:perf`. If it fails under a heavy load, run it again when the load is lower. While all
tests are paused (below), `pnpm test` runs no test, and the rule of `pnpm test:perf` waits for
the end of the pause.

- Commit each verified change. Leave no verified work in the working tree.
- Before your report, run `tools/check-commits.sh --tip main` one time in your worktree, with a
  clean tree. It checks each commit of the branch and the full suite on the last commit. It keeps
  each passed result in the cache by tree. Then the merge gets a `hit` for each commit. Only the
  script writes an entry, and a claim in a report is no entry.
- After a commit that moves code between files, or a commit made while other changes are
  stashed, run `tools/check-commits.sh HEAD~1` before the next commit. It checks that one commit
  and writes its cache entry. The fox round checked such a commit with the lint and the
  typecheck only, and the full check failed at it later, which cost a rebase and a second run.
- Run the check script in the background, because a run with no cache can take more than the
  10-minute limit of a Bash call. Do not edit the worktree while it runs. An edit gives no entry,
  and the rebase abort after a failure removes the edits of the tracked files.
- A stop of the check script (Ctrl-C or `kill`) aborts its rebase. When a stop leaves the
  worktree in a rebase, for example after `kill -9`, run `git rebase --abort`.
- Write the subject as a Conventional Commit: `type(scope): subject`. Use the imperative mood,
  lower case, and no full stop at the end. Wrap the body at 75 characters.
- The types are `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, and `ci`.
- The scope names the area that changed: a module (`midi`, `score`, `pose`, `models`, `scene`,
  `audio`, `ui`, `app`), or `demos`, `tools`, `ci`, `design`, `research`, `audits`, or `agents`.
  Reuse the spelling that the log already holds.
- Split a refactor of several steps into separate commits. For example, add the new path or move
  the tests first, then remove the old code.

### Parallel work

Follow these rules when another agent works on the repository at the same time.

- Work in your own git worktree, on your own branch.
- Stage each path by its name: `git add <path>`. `git add -A` and `git add .` also stage the
  files of the other agents, so use neither.
- Merge a branch with `tools/merge-branch.sh <branch> [worktree]`. It does the steps below and
  stops at the first failure.
  - Rebase onto `main` with no `--force-rebase`, then check each commit with
    `tools/check-commits.sh main`. Each commit runs only the tests that its changes reach through
    the imports, and the tests that read a docs path when it changes docs. The parent of the
    commit passed the other tests. A tree that passed before prints `hit`, so this step takes
    seconds after the check of the agent. The full `pnpm test` runs one time on the last commit,
    with no cache.
  - Run `git merge --ff-only` only in a script with `set -euo pipefail`. A pipe such as
    `git merge --ff-only <branch> | tail` hides a failed merge. Then the next command can delete
    a branch that is not merged.
- A rebase is finished when the folder `$(git rev-parse --git-path rebase-merge)` does not exist.
  `REBASE_HEAD` can stay after a finished rebase, so it does not show the state.
- Let the agent that wrote a branch do a long rebase, because it knows the intent of each commit.
- A rebase with `--exec` runs its command in the tree of each commit. An old commit has an old
  copy of a script or none. Copy a script of the branch to a temporary path first, and run the
  copy. `tools/check-commits.sh` does this.
- Before the report, run `tools/decision-rows.sh --diff main`. It lists the decision rows that
  name an identifier or a string literal that the branch removes. Update or remove each row that
  the change makes wrong.
- Run `pnpm test:e2e` with `ZOOPHONY_E2E_PORT` set to a free port, because the merge script and
  other agents use port 4182.
- Put a new decision in a new decision file of `docs/decisions/`. Two branches then add two
  files, and their merge has no conflict.
- After a merge or a rebase, make each generated report again with its tool, for example the
  table of `docs/reviews/step-6/keyboard-check.md` with `pnpm keyboard`. Do not merge the
  conflict lines of a report by hand.
- Stop each dev server, preview server, and browser that you start, before you end your turn.
  `pgrep -fl 'vite|playwright|chrome-headless'` shows the processes that remain.

### Tests

Since 2026-10-16, all tests are paused (`docs/decisions/2026-10-16-all-tests-pause.md`). The user
asked for the pause, because the tests took too long while the project changes fast. `pnpm test`
runs no test, and no check runs a test. Until the user ends the pause, a change adds no test and
runs no break test. The rules below that add, break, or run a test wait for the end of the pause.
A change that needs a check runs one file with `pnpm test:paused <path>`. A change that breaks the
typecheck or the lint of a test file fixes that file, because both checks still read it.

- Ship the tests in the same commit as the change of behavior.
- Confirm that a new test fails without the change. Break the code that it covers, watch the test
  fail, then restore the code. A test that passes both ways pins nothing.
- The report of a new pure function gives one break command for each rule that its TSDoc
  states. Run each command with `tools/break-test.sh '<perl expr>' <file> <test files>`, and
  give the test that fails. Read the diff of the break that the script prints: a break that
  changes only a comment tests nothing. The weight by the corner angle of `studioNormals()` had
  no test until the review of 2026-10-14.
- Test behavior: the same pose after a seek, the note times of a pose, and the size budget of
  design 7.2. The tests of the clearance and of the fit of a body, such as no clipping and the
  bow on the strings, are paused (below). Do not pin an exact tuned value, a hash, or the
  geometry of a look. Each deliberate change of the look then edits such a test, and the test
  finds no fault.
- A test compares no value of one body with a value of another body, such as "the fox arm is
  shorter than the wolf arm". Each form change of one body breaks such a test, and the test finds
  no fault. Test each body against its own rule, such as the reach of its instrument.
- Leave no known red test of `pnpm test` or `pnpm test:perf` on `main`. Fix the cause, or change
  the test with the reason in the same session.
- Since 2026-10-14, the tests of the look, the fit, and the clearance of the bodies, and of the
  layout from their footprints, are paused (`docs/decisions/2026-10-14-test-pause.md`).
  `PAUSED_TESTS` of `vite.config.ts` lists them. `pnpm test` skips them, so a paused test that
  fails stops no commit and no merge. Do not fix a paused test in a model round. When a change
  needs a paused check, run its file with `pnpm test:paused <path>`. Put each new test of the
  look, the fit, or the clearance of a body into the list. To bring a test back, remove it from
  the list, make it pass, and update the decision file.
- A unit test goes beside its module, as `<name>.test.ts`.
- The lint refuses `vi.mock` (`anti-slop/no-module-mocking`). Thus a class that makes a
  `WebGLRenderer`, such as `StageScene`, moves the logic under test into a function with plain
  values, as `renderScenePass()` of `scene/stage-scene.ts` does, and the test calls the function.
- A tool that filters measured data prints what it drops, and checks its count against an
  independent count. For example, the GPU row of `pnpm frame` prints the time of the buffers that
  its filter drops, and compares its frames with the canvas writes of the trace.
- Build test inputs with the real `midi/` and `score/` modules. A hand-made `Score` copies the
  rules of design section 3, and it can drift from them.
- A model that the user gives can fail checks of `pnpm test` that were tuned on the parametric
  bodies. Remove such a check, and fix the checks of the new code (user decision of 2026-10-10).
  A model round does not fix or remove a paused test. Remove the tests and the test helpers of a
  body or a part that no species uses.
- Put a probe script in `scratch/` of your worktree. Git ignores the folder, and the lint, the
  typecheck, and the format check skip it. Run the probe with `node scratch/<name>.ts`. It
  imports `three` through the `node_modules` of the worktree, and the source modules by relative
  paths such as `../src/models/species.ts`. `pnpm test` skips the test files in `scratch/`.
- Run an image probe in Python with
  `uv run --no-project --with pillow --with numpy --with scipy python -I <script>`. The Python of
  Homebrew and the Python of the system have no numpy, and the Python of Blender has no Pillow.
- Vitest hides the `console.log` output of a passing test. A probe in a test writes its values
  into a file.
- In the shell of an agent, `grep` is a shell function that runs ugrep with `--ignore-files`.
  It skips the files that git ignores, such as `scratch/` and `node_modules/`. `command grep`
  runs the grep of the system. The `sed -i` of macOS needs a suffix argument, so make a
  temporary edit of a file with `perl -0pi -e`.

### Audits

- Write a codebase audit in `docs/audits/`, in a file whose name starts with the date. Give the
  file and the line of each finding. Put each finding that you could not confirm under an
  `Unverified` heading, with the steps to reproduce it.
- When you fix findings of an audit, add a `Status` section to that audit before the session
  ends. Give each finding that you touched a verdict (`fixed`, `partly fixed`, `rejected`, or
  `open`), the commit hashes, and one line on what is left. Put the status in one
  `docs(audits)` commit after the fixes, because a commit cannot name its own hash.

### Ending a turn

When work remains open, end the turn with the next concrete step. Give one recommendation, or two
for different goals, with its cost and scope. Base it on the work order (design 9.5). When the
task is finished, or when you answer a direct question, give no next step.

## TypeScript

- **Compiler options.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, `isolatedModules`, `noImplicitOverride`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`,
  and `noPropertyAccessFromIndexSignature` are on.
- **Erasable syntax.** Declare a field and assign it in the constructor. Use a union of string
  literals in place of an `enum`. Write no constructor parameter properties.
- **Index signatures.** Read a key of an index signature with brackets: `counts['violin']`.
- **Oxlint.** `pnpm lint` runs `oxlint --type-aware .`, which needs `oxlint-tsgolint`. The
  `correctness`, `suspicious`, and `perf` categories are errors. Use `toSorted()` in place of
  `sort()`. `.oxlintrc.json` lists each rule that is off, and the commit that turned it off
  gives the reason. The
  anti-slop plugin in `tools/oxlint/anti-slop/` adds 15 rules. For example, a symbol name must
  not contain "shape", and only an I/O boundary may use a `typeof` check.
- **Record types.** Give the exact keys when you know them. When the keys are dynamic, type the
  values. Use a specific value type in place of `Record<string, unknown>`.
- **Casts.** Narrow a type with a `value is T` type guard or a generic. The anti-slop rules
  refuse a double cast (`as unknown as T`), also in a test. At one boundary conversion, a single
  cast with a `SAFETY:` comment is permitted.
- **Pure ESM.** Use `import type` for an import of types only.
- **Naming.** Follow the [Google TypeScript Style Guide](https://ts.dev/style/). Use no
  underscore prefixes.
- **Initialisms.** Write a standalone initialism in upper case (`MIDI`, `GM`, `SF3`). Use
  camelCase inside a compound identifier (`MidiFile`, `parseSmf`).

## Code style

- **Format.** oxfmt formats TypeScript with `.oxfmtrc.json`: a print width of 100, 2 spaces,
  semicolons, and single quotes. CI checks the format.
- **Blank lines.** Put one empty line between top-level declarations. Use blank lines or
  separate files for structure, with no banner comments and no divider comments.
- **Code blocks.** Inside a function body, put one empty line between the logical steps. For
  example, put it between the input checks, the calculation, and the return of the result. A
  step is a group of statements that does one task.
- **Braces.** All `if`, `else`, `for`, and `while` blocks use curly braces.
- **Conditional members.** Add a conditional property inside an explicit `if` statement. Spread
  only valid objects or arrays, never `cond && value`.
- **Presence checks.** Use `if (foo)` or `if (!foo)` for objects, arrays, and instances. Use
  `!== undefined` or `!== null` only when `0`, `''`, `NaN`, or `false` is a valid value.
- **Readonly.** Use `readonly` for immutable properties, parameters, and arrays (`readonly T[]`).
- **Getters.** A public read accessor with no arguments is a getter. A method that makes a new
  instance or does an action stays a method.
- **Visibility.** Make class members private by default. Write a private member as an ES
  `#private` member, because the minifier renames a `#` name and keeps a TypeScript `private`
  name whole. Keep TypeScript `private` for a member that a test reads with element access,
  such as `engine['synth']`.

## Writing

Write all prose in ASD-STE100 Simplified Technical English: the docs, `AGENTS.md`, comments,
commit messages, and UI text.

- Lead with the fact. Put the subject first. Use the active voice, the present tense, and
  concrete nouns. Define a term on first use, then use the same term each time.
- Write procedural sentences of at most 20 words and descriptive sentences of at most 25 words.
- Show a mechanism or a number in place of a subjective word.

### Tells to avoid

- **Em dashes.** Use a full stop, a comma, a colon, or parentheses.
- **Semicolon splices.** Write separate sentences.
- **Antithesis tics.** State the positive fact, with no reflexive "X, not Y".
- **Appositive tails.** Cut a dangling explanation at the end of a sentence, or make it a
  separate sentence.
- **Throat-clearing.** Remove filler such as "It is worth noting", "Importantly", "Note that",
  and "In summary".
- **Colon fanfare.** State a reason directly, with no "The reason is:".
- **Rule-of-three padding.** List only the items that exist.
- **Bold lead-ins.** Keep them for lists of term definitions, such as this one.
- **Banned words.** delve, leverage, utilize, facilitate, underscore (as a verb), testament,
  landscape, realm, tapestry, holistic, myriad, plethora, crucial, pivotal, game-changing,
  unlock, empower, streamline, "dive into", "at its core", "the beauty of". No emoji.

Check the prose before you finish. Each command must print a count of 0 or no lines. The
semicolon check also prints TypeScript type literals, such as `{ port: number; channel: number }`.
These matches are correct.

```bash
grep -rc $'\u2014' AGENTS.md docs/design.md docs/design docs/decisions | grep -v ':0$'  # em dashes
grep -rnE '[a-z]; [a-z]' AGENTS.md docs/design.md docs/design docs/decisions  # semicolon splices
grep -rnE ', not [a-z]' AGENTS.md docs/design.md docs/design docs/decisions   # antithesis tics
```

### TSDoc

- Each exported class, interface, type, function, and constant carries TSDoc.
- Each member of a class, an interface, or an object type carries TSDoc: each field, property,
  method, getter, setter, and function-typed property. This rule includes private members and
  the members of types that are not exported.
- A function or method comment starts with a verb phrase, such as "Calculates" or "Creates".
- A type, interface, variable, or constant comment starts with a noun phrase.
- Use `@param`, `@returns`, and `@throws`, with no hyphen: `@param name Description`.
- Each `{@link Symbol}` target exists.
- Each doc comment comes directly before a code member.
