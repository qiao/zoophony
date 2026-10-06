# AGENTS.md

Zoophony is a WebGL MIDI player. Low-poly animals play orchestral music on a small
stage. The stack is Three.js, TypeScript, Vite, and pnpm. The app is a static site on GitHub
Pages.

## Design

`docs/design.md` is the single source of truth for the product and design decisions. Before you
change an area, read its section there. If a change conflicts with the design, ask the user. Then
update `docs/design.md` in the same commit as the change.

Take the next task from `TODO.md`, and follow the rules at its top. A step is done only when its
"done" criterion is true, and, for a step with a review, after the review agent approves it
(design 9.8).

Section 10 of the design lists the decisions that an agent made after the design session. Treat
them as decided. When the user changes one, update its section and remove its row.

Open these files for these kinds of work:

- 3D scene, models, or motion: look at the reference images `docs/reference/orchestra.webp`
  (the scene) and `docs/reference/animals.webp` (the front, side, and back views of the
  animals), and use the values of design 4.5 to 4.7.
- UI: open `docs/prototype/ui.html` in a browser, or read its screenshots in `docs/prototype/`.
  Design 2.8 gives the tokens and the exact message texts.
- Demo files: `demos/README.md` gives the sources, the licenses, the checksums, and the reason
  for each program change.
- SoundFont: `assets/soundfont/README.md` gives its source and checksum.
- Hall reverb: `assets/hall/README.md` gives the source, the license, the checksums, and the
  steps that made the impulse response.

`docs/research/` holds the facts behind the decisions, with sources. Keep these reports as the
record of their date. Put new research in a new report.

## Rules

- **Pure core.** `midi/`, `score/`, `pose/`, `models/`, and the block scheduler of the worklet
  are pure: they get all inputs as arguments, read no clock, use only seeded randomness, and touch
  no DOM. Each one has Vitest tests.
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
  seek, pause, speed, mute, and solo changes are always correct.
- **One score.** The sound and the visuals both come from one `Score`. Put each MIDI rule in
  `score/`, so that the synth and the animals follow the same rule.
- **Size budget.** The first download is less than 1 MB after gzip (design 7.2). Load the audio
  code, the Worker, the worklet, and the SoundFont files with a dynamic import or a fetch after
  the first frame. Explain or fix an unexpected size change. Raise the limit only with the
  approval of the user.
- **Licenses.** Before you add a MIDI file, a score, a SoundFont, or a dependency, check the rules
  in design 8.1 and 7.3. Add each new dependency to the third-party license file.
- **Work order.** Follow the steps in design 9.5. The largest risks come first.

## Commands

Node 24 or later, and pnpm from the `packageManager` field of `package.json`.

| Command | Action |
|---|---|
| `pnpm install` | Installs the dependencies. |
| `pnpm dev` | Writes the SF3 preset files into `public/sf/`, the changed demo files into `public/demos/` (design 8.3), and `perf/perf-60.mid` (design 9.5), then starts the Vite dev server. The audio spike is at `/spike.html`, and the model gallery at `/gallery.html` (design 7.1). `/#demo=<id>` shows another demo, and `/#demo=perf-60` shows `perf-60.mid`. |
| `pnpm build` | Writes the SF3 preset files and the demo files, then builds the site into `dist/`, with the third-party license file (design 7.3). `pnpm vite preview` serves `dist/`. |
| `pnpm size` | Prints the gzip size of the first download, and fails above 1 MB (design 7.2). Run it after `pnpm build`. |
| `pnpm screenshots <dir> [--sheet] [--play] [--ui] [--drawer] [--load]` | Builds the site, serves `dist/` with `vite preview`, and writes the review screenshots of design 9.8 into `<dir>` as WebP files of at most 300 kB: each demo at 1440 × 900, the default demo at 390 × 844, and the two gallery pages. `--sheet` adds `species-sheet.webp`, a close view of each gallery model. `--play` adds the default demo and the Beethoven demo at 1440 × 900, and the default demo at 390 × 844, after 6 s of play. `--ui` adds the first screen and the open drawer during play, `--drawer` adds the seat list, the settings, the credits, and the drop overlay, and `--load` adds the first screen during the load, the load failure, and the full-page message with no WebGL2, at both sizes of the prototype screenshots. It uses headless Chromium with ANGLE on Metal (`pnpm exec playwright install chromium` one time), and it stops the server at the end. |
| `pnpm smoke` | Runs the smoke test of design 9.3 on the Vite dev server in headless Chromium: it plays the default demo for 4 s, and checks that the song time increases, that the bow arm of a violin moves, that the canvas shows the scene, and that the console has no errors. It writes the files of `pnpm dev` first, and it stops the server and the browser at the end. |
| `pnpm keyboard` | Builds the site, serves `dist/` with `vite preview`, and checks each control with the keyboard alone in headless Chromium at 1440 × 900 and at 390 × 844 (design 9.5, step 6). It prints a Markdown table of the controls, the keys, and the results, and fails on a failed check. It stops the server and the browser at the end. |
| `pnpm typecheck` | Runs `tsc` with no output files. |
| `pnpm lint` | Runs `oxlint --type-aware .` with the anti-slop plugin. |
| `pnpm format` | Formats the paths of design 9.5 with oxfmt. |
| `pnpm format:check` | Checks the format of the same paths. CI runs it. |
| `pnpm test` | Runs the Vitest tests once, except the speed tests. |
| `pnpm test:perf` | Runs the speed tests (`*-speed.test.ts`) one file at a time (design 9.3). Each one compares the time of a work with a reference work in the same run. Heavy load on the machine can make them fail. |

CI (`.github/workflows/ci.yml`) runs `pnpm install`, then all commands above except `pnpm dev`,
`pnpm format`, `pnpm screenshots`, `pnpm keyboard`, and `pnpm smoke`. Step 7 adds the smoke test
to CI.

## Workflow

### Simplicity over compatibility

Nobody depends on this code yet, so simplicity outranks compatibility. Rename, move, and delete
symbols freely, and update all call sites in the same commit. Make each change directly, with no
deprecation shims, legacy branches, or compatibility aliases.

### Keep the docs true

- A change that alters behavior updates `docs/design.md` in the same session.
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

### Tests

- Ship the tests in the same commit as the change of behavior.
- Confirm that a new test fails without the change. Break the code that it covers, watch the test
  fail, then restore the code. A test that passes both ways pins nothing.
- A unit test goes beside its module, as `<name>.test.ts`.
- Build test inputs with the real `midi/` and `score/` modules. A hand-made `Score` copies the
  rules of design section 3, and it can drift from them.

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
grep -c $'\u2014' AGENTS.md docs/design.md          # em dashes
grep -nE '[a-z]; [a-z]' AGENTS.md docs/design.md     # semicolon splices
grep -nE ', not [a-z]' AGENTS.md docs/design.md      # antithesis tics
```

### TSDoc

- Each exported class, interface, type, function, and constant carries TSDoc.
- A function or method comment starts with a verb phrase, such as "Calculates" or "Creates".
- A type, interface, variable, or constant comment starts with a noun phrase.
- Use `@param`, `@returns`, and `@throws`, with no hyphen: `@param name Description`.
- Each `{@link Symbol}` target exists.
- Each doc comment comes directly before a code member.
