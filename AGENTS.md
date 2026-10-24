# AGENTS.md

Zoophony is a WebGL MIDI player. Low-poly animals play orchestral music on a small stage. The stack
is Three.js, TypeScript, Vite, and pnpm. The app is a static site on GitHub Pages.

This file holds the rules that each agent needs in each round. The modules in `docs/agents/` hold
the details (see "Modules" at the end). Read a module when your work needs it.

## Where the truth lives

- **Design.** The design is the single source of truth for the product and design decisions. The
  index `docs/design.md` lists the files `docs/design/01-*.md` to `09-*.md`, one for each section,
  and holds section 10. A pointer "design X.Y" names the heading "X.Y" in the file whose number is
  X. Read only the design files of your area, and read its section before you change an area.
- **Conflicts.** When a change conflicts with the design, ask the user when the user is available.
  Else follow the newest decision of the user and the reference images, record the conflict as a
  row in your decision file, and update the design file in the same commit as the change.
- **Decisions.** A decision file in `docs/decisions/` holds the details that one agent session
  decided (section 10 of `docs/design.md`). Treat each row as decided, unless a newer decision of
  the user or a newer row replaces it. Record a new decision as a row in a new decision file of
  your session. When a decision is reversed or replaced, update its design section and remove the
  old row in the same commit.
- **Tasks.** Take the next task from `TODO.md`, and follow the rules at its top. A step is done
  when its "done" criterion is true and its review is done (design 9.8). The manager reviews each
  round from the report and the images. No round gets a review agent since 2026-10-16.
- **Research.** `docs/research/` holds the facts behind the decisions, with sources. Keep each
  report as the record of its date. Put new research in a new report.

Open these files for these kinds of work:

- **3D scene, models, or motion.** The reference images `docs/reference/orchestra-latest.png` and
  `docs/reference/orchestra-side.png` (the newest target, from two angles),
  `docs/reference/mockup.png` and `docs/reference/scene.png` (the target of the look),
  `docs/reference/lowpoly-animals.png` (the forms and the facets of the animals), and
  `docs/reference/animals.webp` (the front, side, and back views). The model sheets
  `docs/reference/*-views.png` and `*-turnaround.png` show single species. The reference images win over the values in
  the code that design 4.5 to 4.7 names: these values describe the current models, and they are no
  targets. Design 1 says which image wins where they differ. The bodies of the app are in the
  table "Bodies and roles" of [`docs/agents/model-work.md`](docs/agents/model-work.md).
- **Motion of the string players** (the left hand, the fingers, and the bow arm of the violin, the
  viola, the cello, and the double bass). `docs/reference/string-technique.md` is the target, with
  a source for each fact. A change of the string motion updates its section 3 "Use in the app" in
  the same commit.
- **Motion of the wind and brass players** (the hold, the trombone slide, the hands, the breath,
  and the rest). `docs/reference/wind-technique.md` is the target, with a source for each fact. A
  change of the wind motion updates its section 4 "Use in the app" in the same commit.
- **Motion of the percussion players** (the grip, the mallet direction, the stroke, and the
  playing spot of the timpani, the drums, the cymbals, the triangle, and the xylophone).
  `docs/reference/percussion-technique.md` is the target, with a source for each fact. A change
  of the percussion motion updates its section 10 "Use in the app" in the same commit.
- **UI.** Open `docs/prototype/ui.html` in a browser, or read its screenshots in
  `docs/prototype/`. Design 2.8 gives the tokens and the exact message texts.
- **Assets.** `demos/README.md` gives the sources, the licenses, the checksums, and the reason for
  each program change of the demo files. `assets/soundfont/README.md` and `assets/hall/README.md`
  give the source and the checksums of the SoundFont and of the hall reverb.
- **Low-poly studio.** `lowpoly-studio/` is a separate project, outside the rules of this file.
  Route 3 of [`docs/agents/model-work.md`](docs/agents/model-work.md) gives its use in the app.

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
    Thus a test can compare it, and the rule "Stateless poses" holds. A point or a rotation at a
    module boundary is a `Vec3` or a `Quat` tuple of `models/tuples.ts` (design 7.1).
  - A module scratch object holds no state: each call writes it before it reads it.
- **Stateless poses.** `poseAt()` calculates each pose only from the score, the scene layout, the
  song time, the wall time, the transport, the audibility of the seats, and the seed. Thus seek,
  pause, speed, mute, and solo changes are always correct. `cameraAt()` calculates the camera only
  from the shot plan, the song time, the transport, and the view (design 5.6).
- **One score.** The sound and the visuals both come from one `Score`. Put each MIDI rule in
  `score/`, so that the synth and the animals follow the same rule.
- **Size budget.** The first download is less than 1 MB after gzip (design 7.2). Load the audio
  code, the Worker, the worklet, and the SoundFont files with a dynamic import or a fetch after the
  first frame. Explain or fix an unexpected size change. A change that moves the size by more than
  5 KB states the reason in its commit message. Raise the limit only with the approval of the user.
- **Licenses.** Before you add a MIDI file, a score, a SoundFont, or a dependency, check the rules
  in design 8.1 and 7.3. Add each new dependency to the third-party license file.
- **Privacy.** Keep the personal data of the user out of each request to an outside service. The
  email address, the name, and other personal data go into no header, User-Agent, URL, or payload.
  When an API asks for contact data in the User-Agent, send a neutral value such as
  `zoophony-build/1.0`.
- **Frame time.** Each change of `src/scene/`, of a shader, or of the post effects runs
  `pnpm frame` before its report, and gives the table in the report or the commit message. CI has
  no GPU, so this check is local (design 9.7).
- **Work order.** Follow the steps in design 9.5. The largest risks come first.

## Work rules

- **Where.** An agent that works alone commits on `main` in the main checkout (user, 2026-10-17).
  An agent that works beside another agent works in its own worktree and branch. Push nothing.
- **Commits.** Make very fine-grained commits: one logical change in each, with a Conventional
  Commit subject. Stage each path by its name, never with `git add -A` or `git add .`.
- **Checks.** Each commit passes `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`. Before
  your report, run `tools/check-commits.sh --tip <base>` one time in the background, with a clean
  tree.
- **Tests.** All tests are paused since 2026-10-16. A change adds no test and runs no break test.
  A change that needs a check runs one file with `pnpm test:paused <path>`.
- **Docs.** A change of behavior updates its design file in the same session. Write all prose in
  ASD-STE100 Simplified Technical English, with no em dashes, and run the prose checks of
  [`writing.md`](docs/agents/writing.md).
- **Length.** Keep each doc in its limit of [`writing.md`](docs/agents/writing.md): `AGENTS.md`
  about 2,500 words, a module about 3,000, a decision file about 600 with rows of about 50, and a
  research report about 1,000 words of prose. A design section holds no history and no tuned value.
- **Processes.** Stop each server and browser that you start, and no other process.

## Modules

| Module | It holds | Read it |
|---|---|---|
| [`docs/agents/workflow.md`](docs/agents/workflow.md) | the docs rules, the commits, the place of the work and the merges, the tests, the probes, the audits, and the end of a turn | at the start of each round |
| [`docs/agents/writing.md`](docs/agents/writing.md) | Simplified Technical English, the tells to avoid, the prose checks, and TSDoc | before you write a doc, a comment, or a commit message |
| [`docs/agents/code.md`](docs/agents/code.md) | the compiler options, the lint rules, and the code style | before you write TypeScript |
| [`docs/agents/commands.md`](docs/agents/commands.md) | each command with its usage, its main options, its output, and its run time, and the steps of CI | before you run a tool that you do not know |
| [`docs/agents/model-work.md`](docs/agents/model-work.md) | the bodies and their roles, and the three routes that give a species a body of its own | before work on a body, a role, or a hold |
| [`docs/agents/look-work.md`](docs/agents/look-work.md) | the loop of a round of the light, the colors, or the grade, the look override of the dev server, and the traps of the look measures | before a round of the light, the colors, or the grade |
| [`docs/agents/model-traps.md`](docs/agents/model-traps.md) | the traps of route 3, in groups | before you plan a rig, a hold, a seat, or a fix of a fold |
| [`docs/agents/rig-blender.md`](docs/agents/rig-blender.md) | the rebuild of the arms in the live Blender: quad faces, Blender weights, arm segments, helpers, and their traps | before you fix a twisted or folded arm of a mesh rig |
| [`docs/briefs/studio-body.md`](docs/briefs/studio-body.md) | the brief template of a round of route 3, and the docs checklist of a new body, role, or hold | when you brief or run such a round |
