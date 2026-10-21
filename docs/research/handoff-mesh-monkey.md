# Handoff of the round mesh-monkey

The round gives the trumpet monkeys the mesh of the user
(`assets/models/monkey/monkey.glb`) by route 3. The start commit is `32136c6e`.

- **Last finished step.** Phase 2 is done: the body, the role `trumpeter`, the trumpet hold, the
  docs, and the open items in `TODO.md`.
- **Early checks.** `pnpm test:paused src/shots/`: 5 tests fail, and the same 5 fail on
  `32136c6e`: `writeKeyPosition` (the default view for the azimuth 0° and the elevation 33°),
  `prepareShots()` (the high shots from the front, and the low section and solo cameras), and
  `defaultView` (the camera on the audience axis, and the portrait camera). `pnpm body-probe
  --base 32136c6e`: the bodies of the other species are equal. The poses of the players of
  bach-bwv1047 and beethoven-9 change, because the stage side of these demos moves by -0.7% and
  +1.4% (`phase2/body-probe.txt` of `docs/research/2026-10-20-mesh-monkey/`).
- **Next step.** None. The last commit removes this file.
