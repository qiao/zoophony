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
  with a higher chair, at the same ear tips (`docs/decisions/2026-10-16-cat-trunk.md`). Since the
  round `cat-form`, its trunk is 0.8 of that trunk and wider and deeper, its neck is shorter, and it
  sits with the thighs 25° down and vertical shins on a wider chair
  (`docs/decisions/2026-10-16-cat-form.md`). Since 2026-10-17, the cello dog has the mesh of the
  user `assets/models/dog/dog.glb`, rigged by `pnpm rig-mesh dog` with the head height of the red
  fox, the leg factor 1.5, and the knees spread 30° around the lower bout of the cello. Its hold
  puts the cello between the knees against the chest, as real cellists hold it, and the bow
  stands over the right knee in the rest (`docs/decisions/2026-10-17-dog-rest.md`). Its hanging ears do not twitch
  (`docs/decisions/2026-10-17-mesh-dog.md`). Since round `dog-arms`, it has the arm factor 1.35, a
  1/2 cello, and a tail that hangs down behind the seat (`docs/decisions/2026-10-17-dog-arms.md`),
  thin since round `dog-tail` (`docs/decisions/2026-10-17-dog-tail.md`). Since that round, the cello
  leans back 25° (`docs/decisions/2026-10-17-dog-rest.md`).
  `pnpm close-views conductor <dir>`, `pnpm close-views pianist <dir>`,
  `pnpm close-views violinist <dir>`, `pnpm close-views fox-violinist <dir>`,
  `pnpm close-views violist <dir>`, `pnpm close-views cellist <dir>`, and
  `pnpm close-views flutist <dir>` show them close at the beats of a bar, at the chords of the
  keys, at the frog and the tip of a bow, and at a note of the flute. The penguins of the choir
  have an egg body of their own, built in code in `src/models/penguin/` after the choir of the two
  newest images (design 4.4). They have no sheet, so `pnpm choir-check <dir>` puts the gallery
  penguin beside one penguin of each image. The GLB files
  `assets/models/rabbit/rabbit.glb` and `assets/models/bear/bear.glb`, models of the user, stay
  for the tools of route 1, and no species uses them. `pnpm rig-body <species>` packs each one
  with a skin baked from the texture of the file, in the colors of the reference images (design
  4.4). The configs keep the forms of 2026-10-10: the bear keeps the form and the limb lengths
  of its model, and the rabbit takes the form of `rabbit-views.png` through the `shape` and the
  `haunch` of its config.
- Motion of the string players (the left hand, the fingers, and the bow arm of the violin, the
  viola, the cello, and the double bass): read `docs/reference/string-technique.md`, the target of
  the string motion, with a source for each fact. A change of the string motion updates its section
  3 "Use in the app" in the same commit (`docs/decisions/2026-10-17-string-hands.md`).
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

[`docs/agents/model-work.md`](docs/agents/model-work.md) gives the three routes that give a species a body of its own, and their traps.

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

[`docs/agents/commands.md`](docs/agents/commands.md) lists each command, its options, and the checks of CI.

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
- Before your report, run `tools/check-commits.sh --tip <base>` one time, with a clean tree.
  `<base>` is `main` on a branch, or the commit of `main` where your work started when you work on
  `main` (see "Parallel work"). It checks each commit and the full suite on the last commit. It keeps
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

By default, an agent that works alone commits on `main` in the main checkout, so that the user can
check each commit at once in the running app (user, 2026-10-17). It needs no merge. It pushes
nothing, and it runs the check script on the commits of its round. An agent uses its own branch and
worktree only when another agent works on the repository at the same time.

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
