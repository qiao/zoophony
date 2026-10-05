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
  the first frame.
- **Licenses.** Before you add a MIDI file, a score, a SoundFont, or a dependency, check the rules
  in design 8.1 and 7.3. Add each new dependency to the third-party license file.
- **Work order.** Follow the steps in design 9.5. The largest risks come first.
