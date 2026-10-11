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
"done" criterion is true, and, for a step with a review, after the review agent approves it
(design 9.8).

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
  the target of the animals (design 1). Since 2026-10-11, all species except the penguin have
  the parametric bodies of 2026-10-06 18:58 again (`docs/decisions/2026-10-11-body-revert.md`),
  and `pnpm sheet-check <id> <dir>` compares a species with its sheet. The penguins of the choir
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

`docs/research/` holds the facts behind the decisions, with sources. Keep these reports as the
record of their date. Put new research in a new report.

## Model work

A species gets a body of its own by one of two routes (design 4.4). Prefer the GLB route when the
user gives a model: it takes minutes, and the code route takes hours.

**Route 1: a rigged GLB file.** The user gives a model in a T-pose with a Mixamo skeleton. Since
2026-10-11, the app has no code of a rigged body. Before step 3, bring back the code of
2026-10-10 with `git show 773e0a69:<path>`: `src/models/rigged-body.ts` with its test, the
dispatch in `buildBiped()` and `SpeciesParams.rigged`, the seat fit of `src/models/props.ts`, and
the skin materials of `src/scene/player-materials.ts` (design 4.4, rigged bodies).

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
   `pnpm sheet-check <id> <dir>`. A wider body grows the stages, and
   `models/layout-scene.test.ts` limits the growth. The seats fit its legs. Fix the tests of the
   new code.
   Remove each check that was tuned on the parametric bodies and fails on the reach or the size
   of the model, and list it in the commit message (user decisions of 2026-10-10).
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
- **Work order.** Follow the steps in design 9.5. The largest risks come first.

## Commands

Node 24 or later, and pnpm from the `packageManager` field of `package.json`.

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 preset files into `public/sf/`, the changed demo files into `public/demos/` (design 8.3), and `perf/perf-60.mid` (design 9.5), then starts the Vite dev server. The audio spike is at `/spike.html`, the model gallery at `/gallery.html`, and the animal views at `/views.html` (design 7.1). `/#demo=<id>` shows another demo, and `/#demo=perf-60` shows `perf-60.mid`. |
| `pnpm build` | Writes the SF3 preset files and the demo files, then builds the site into `dist/`, with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. With `ZOOPHONY_BASE=/zoophony/`, the build and `vite preview` use the base path of GitHub Pages (design 9.2). |
| `pnpm size` | Prints the gzip size of the first download, and fails above 1 MB (design 7.2). Run it after `pnpm build`. |
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load] [--shots]` | Builds the site, serves `dist/` with `vite preview`, and writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900, the default demo at 390 × 844, the two gallery pages, the animal views, and the five model sheet pages (design 7.1). `--sheet` adds `species-sheet.webp`, a close view of each gallery model. `--play` adds the default demo and the Beethoven 9 demo at 1440 × 900, and the default demo at 390 × 844, after 6 s of play. `--ui` adds the first screen and the open drawer during play, `--drawer` adds the seat list, the settings, the credits, and the drop overlay, and `--load` adds the first screen during the load, the load failure, and the full-page message with no WebGL2, at both sizes of the prototype screenshots. `--shots` adds a frame of each kind of camera shot of each demo at both sizes (design 9.8). It uses headless Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time), and it stops the server at the end. |
| `pnpm snapshot` | Builds the site and saves screenshots of the current state into `docs/snapshots/<commit date>-<short hash>/`: the default demo during play at 1440 × 900, with the drawer closed, in the default view of "Reset view", 3.5 s after a seek to 30 s, and a close view of each gallery model. It writes a `README.md` with the commit, and a note when the working tree has changes. The folder and the file names depend only on the commit, so a second run on the same commit writes the same files again. The play frame can differ by a few milliseconds of song time and of the idle motion. It uses the browser of `pnpm screenshots`, and it stops the server and the browser at the end. |
| `pnpm sheet-check <sheet> <dir>` | Builds the site and compares a model sheet page of `views.html` with its sheet in `docs/reference/` (design 7.1). It writes into `<dir>` the page at the size of the sheet, the silhouette of the body (`?sheet=<id>&matte`), and the sheet above the page. With a matte in `tools/sheet-mattes/<id>.png`, it also prints the silhouette IoU of each view, the top and the bottom rows, the five rows with the most different pixels on each side of the seat, and the color medians and the value percentiles of the sheet and of the page. It writes the difference image and `<id>-rows.txt`, the runs of each second row of the sheet and of the page. `tools/sheet-mattes/make_matte.py <id>.json` makes each matte from the config of its sheet: the foreground rule, the props to ignore, and the rows of the labels. It stops the server and the browser at the end. |
| `pnpm pose-probe <sheet> [--time <s>]...` | Prints the posed elbow, wrist, and palm of each arm of the sheet pose of a model sheet (design 7.1), in head heights from each shoulder joint (out, up, forward), and the direction of the tip of the instrument. `--time` takes the song time of the pose in place of the time of the sheet. It runs in about 1 s with no build, so a tuning round is: edit a hold, run the probe, and repeat. |
| `pnpm choir-check <dir>` | Builds the site and compares the penguin of the gallery with one penguin of each of the two newest reference images (design 4.4, 7.1). It writes into `<dir>` the gallery penguin at the front camera of `orchestra-latest.png` with a closed beak, and at the right side camera of `orchestra-side.png` with an open beak, and `choir-compare.png` and `choir-compare.webp`: the crop of each reference image beside its render. It stops the server and the browser at the end. |
| `pnpm body-probe [--out <file>]` | Prints stable JSON with the rest joints and a hash of the body mesh (places, colors, bones, blend weights, and finishes) of each species on each support and standing, and the skeleton and a mesh hash of each player of the section cast and of the conductor. The output of the same code is the same byte for byte. `pnpm body-probe --compare <base.json> <new.json>` prints the counts of equal bodies and players and a line for each difference, and fails on a difference. To check a commit, run the tool in a temporary worktree of that commit with `tools/body-probe.ts` copied in. It runs in about 2 s with no build. |
| `pnpm test:e2e [--project=chromium]` | Runs the Playwright tests of `e2e/*.e2e.ts` on the built site with `vite preview`, in Chromium, Firefox, and WebKit. The smoke test of design 9.3 (`e2e/smoke.e2e.ts`) plays the default demo for 4 s, and checks that the song time increases after the count-in, that the canvas shows the scene, and that the page has no errors and no failed requests. Run `pnpm build` first. `--project` selects one browser (`pnpm exec playwright install <browser>` one time). |
| `pnpm smoke` | Runs the smoke test of design 9.3 on the Vite dev server in headless Chromium, with the checks that need the dev hook: the bow arm of a violin and the camera modes. It writes the files of `pnpm dev` first, and it stops the server and the browser at the end. |
| `pnpm keyboard` | Builds the site, serves `dist/` with `vite preview`, and checks each control with the keyboard alone in headless Chromium at 1440 × 900 and at 390 × 844 (design 9.5, step 6). It prints a Markdown table of the controls, the keys, and the results, and fails on a failed check. It stops the server and the browser at the end. |
| `pnpm glb-init <species> <glb> [--force] [--preview <dir>]` | Starts the rigged GLB body of a species (design 4.4): copies the file to `assets/models/<species>/<species>.glb` with a README of its checksum, inspects it with `tools/blender/inspect_glb.py`, and writes the proposed config `tools/glb-bodies/<species>.json`. The proposal maps the Mixamo joints, takes the palette from clusters of the face colors, finds the eyes, the nose, the ears, and the finger blocks, and scales the body to the head center of the current body of the species. The tail gets no vertex. `--force` writes over an existing config and README. `--preview` also writes the images of `pnpm rig-body --preview`. |
| `pnpm rig-body <species> [--preview <dir>]` | Prepares the rigged GLB body of a species with Blender (design 4.4) and writes `src/models/rigged/<species>.ts`. `tools/glb-bodies/<species>.json` gives the source file, the height, the map from its joints to the bones of the player, the bones that the file does not have, the color rules, and the triangle budget. `tools/blender/rig_body.py` welds the mesh, measures the eyes and the nose from the texture, collapses the mesh to the budget, adds the eye plates, keeps two bones for each vertex, and bakes the texture into the skin `src/models/rigged/<species>-skin.webp`, with the fur and the accent in the colors of the species. With `--preview`, `tools/blender/preview_rig.py` also writes `skin.png` and `bones.png` into `<dir>`: the skin and the main bone of each face. Blender 5.2 or later comes from the variable `BLENDER`, or from the path. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |
| `pnpm test` | Runs the Vitest tests once, except the speed tests. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). Each one compares the time of a work with a reference work in the same run. Heavy load on the machine can make them fail. |
| `tools/merge-branch.sh <branch> [worktree]` | Rebases `<branch>` onto `main` in `<worktree>`, or in a temporary worktree. It runs `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, and the unit tests that the changes of the commit reach (`pnpm test --changed HEAD~1`) on each commit, and checks that the commit hashes did not change. Then it runs the full `pnpm test` one time on the last commit, and `pnpm build`, `pnpm size`, and `pnpm test:e2e --project=chromium`. It skips the last three checks for a branch that changes only `docs/` and Markdown files. It prints the time of each step. Then it fast-forwards `main` and removes the worktree and the branch. At the first failure, it stops and keeps them. Run it from the main worktree, with `main` checked out. |

CI (`.github/workflows/ci.yml`) runs `pnpm install`, then all commands above except `pnpm dev`,
`pnpm format`, `pnpm screenshots`, `pnpm snapshot`, `pnpm sheet-check`, `pnpm pose-probe`, `pnpm choir-check`, `pnpm keyboard`,
`pnpm smoke`, `pnpm glb-init`, `pnpm rig-body`, and `tools/merge-branch.sh`. It runs `pnpm test:e2e` in one job for each browser, and only the Chromium job blocks a merge
(design 9.2).
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
- `docs/research/` is a historical record. Keep each report as it was on its date.
- `AGENTS.md` is in scope. Update it when one of its statements becomes wrong.

### Commits

Make one logical change per commit, and keep every commit green. After the project skeleton
exists (design 9.5, step 0), every commit passes `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
A commit that can change the speed of `score/`, `pose/`, or the synth engine also passes
`pnpm test:perf`. If it fails under a heavy load, run it again when the load is lower.

- Commit each verified change. Leave no verified work in the working tree.
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
  - Rebase onto `main` with no `--force-rebase`, then check each commit:
    `git rebase main --exec 'pnpm -s lint && pnpm -s typecheck && pnpm -s test --changed HEAD~1 --passWithNoTests && pnpm -s format:check'`.
    Each commit runs only the tests that its changes reach through the imports. The parent of
    the commit passed the other tests. The full `pnpm test` runs one time on the last commit.
  - Run `git merge --ff-only` only in a script with `set -euo pipefail`. A pipe such as
    `git merge --ff-only <branch> | tail` hides a failed merge. Then the next command can delete
    a branch that is not merged.
- A rebase is finished when the folder `$(git rev-parse --git-path rebase-merge)` does not exist.
  `REBASE_HEAD` can stay after a finished rebase, so it does not show the state.
- Let the agent that wrote a branch do a long rebase, because it knows the intent of each commit.
- Put a new decision in a new decision file of `docs/decisions/`. Two branches then add two
  files, and their merge has no conflict.
- After a merge or a rebase, make each generated report again with its tool, for example the
  table of `docs/reviews/step-6/keyboard-check.md` with `pnpm keyboard`. Do not merge the
  conflict lines of a report by hand.
- Stop each dev server, preview server, and browser that you start, before you end your turn.
  `pgrep -fl 'vite|playwright|chrome-headless'` shows the processes that remain.

### Tests

- Ship the tests in the same commit as the change of behavior.
- Confirm that a new test fails without the change. Break the code that it covers, watch the test
  fail, then restore the code. A test that passes both ways pins nothing.
- Test behavior: no clipping, the bow on the strings, the hidden heads, the budgets. Do not pin an
  exact tuned value, a hash, or the geometry of a look. Each deliberate change of the look then
  edits such a test, and the test finds no fault.
- Leave no known red test on `main`, also in `pnpm test:perf`. Fix the cause, or change the test
  with the reason in the same session.
- A unit test goes beside its module, as `<name>.test.ts`.
- Build test inputs with the real `midi/` and `score/` modules. A hand-made `Score` copies the
  rules of design section 3, and it can drift from them.
- A model that the user gives can fail checks that were tuned on the parametric bodies, such as
  the reach of an instrument hold. Remove such a check, and fix the checks of the new code (user
  decision of 2026-10-10). Remove the tests and the test helpers of a body or a part that no
  species uses.

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
