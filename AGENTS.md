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

[`docs/agents/workflow.md`](docs/agents/workflow.md) gives the rules of the docs, the commits, the parallel work, the tests, and the audits.

## Code

[`docs/agents/code.md`](docs/agents/code.md) gives the compiler options, the lint rules, and the code style.

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
