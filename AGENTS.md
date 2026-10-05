# AGENTS.md

Animal Orchestra is a WebGL MIDI player. Low-poly animals play orchestral music on a small
stage. The stack is Three.js, TypeScript, Vite, and pnpm. The app is a static site on GitHub
Pages.

## Design

`docs/design.md` is the single source of truth for the product and design decisions. Before you
change an area, read its section there. If a change conflicts with the design, ask the user. Then
update `docs/design.md` in the same commit as the change.

Section 10 of the design lists the open details. Decide each one with the user in the step that
needs it, then move the decision into the correct section.

`docs/research/` holds the facts behind the decisions, with sources. Keep these reports as the
record of their date. Put new research in a new report.

## Rules

- **Pure core.** `midi/`, `score/`, `pose/`, `models/`, and the block scheduler of the worklet
  are pure: they get all inputs as arguments, read no clock, use only seeded randomness, and touch
  no DOM and no Three.js object. Each one has Vitest tests.
- **Stateless poses.** `poseAt()` calculates each pose only from the score, the song time, the
  wall time, the transport, and the seed. Thus seek, pause, and speed changes are always correct.
- **One score.** The sound and the visuals both come from one `Score`. Put each MIDI rule in
  `score/`, so that the synth and the animals follow the same rule.
- **Size budget.** The first download is less than 1 MB after gzip (design 7.2). Load the audio
  code, the Worker, the worklet, and the SoundFont files with a dynamic import or a fetch after
  the first frame. Explain or fix an unexpected size change. Raise the limit only with the
  approval of the user.
- **Licenses.** Before you add a MIDI file, a score, a SoundFont, or a dependency, check the rules
  in design 8.1 and 7.3. Add each new dependency to the third-party license file.
- **Work order.** Follow the steps in design 9.5. The largest risks come first.

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
for different goals, with its cost and scope. Base it on the work order (design 9.5) or the open
details (design 10). When the task is finished, or when you answer a direct question, give no
next step.
