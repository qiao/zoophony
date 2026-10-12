# Handoff: lowpoly-studio

Read this file first. It gives the state of the studio, the open decisions, and the next
steps. The other handoff files are the record of each round, in this order: `handoff-speed.md`
and `handoff-diag.md` (phase 2), `handoff-pilot.md` (phase 3), `handoff-intake.md`,
`handoff-runtime.md`, and `handoff-props.md` (rounds A, B, and C). For the commands and the
config, read `README.md`. For the workflow, load the user skill `lowpoly-animal-studio`.

## State (main a9aeb4aa, 2026-10-12)

```text
 sheet --> new --like --> calibrate --> fit --> build (seed pool, gate) --> report --> fix
                                                  |                                    |
                                                  +--> role build + model build <------+
                                                  +--> seed report (seeds.require)
```

- **Animals.** `bear` (conductor) and `polar-bear` (pianist). Both are regression animals:
  `python3 studio regress <animal>` compares a build with `animals/<animal>/golden.json`.
- **Roles.** `conductor` (standing, baton, 4/4 pattern, cues), `pianist` (seated on a bench at a
  grand piano, 4 digits for each paw, keys that go down), and `model` (standing, no props: the
  build that the compare and the look checks use for every role).
- **Props.** `props/`: a grand piano with keys, a bench, a chair, a music stand, a violin, a
  cello, and a bow. The sizes come from the body. No role uses the violin, the cello, or the
  chair yet.
- **Speed.** One stage cache for all worktrees (`<git common dir>/lowpoly-studio/cache/`). A
  cached seed takes about 4 s, also in a new worktree. A paint or detail change takes about 5 s.
  An empty cache takes about 52 s for one seed. `tests/test_cache.py` fails when a cache key
  holds a worktree folder.
- **Diagnostics.** Each failure names its clip, frame, bone, and region, with a crop. Each build
  writes `out/report/index.html` and `out/report/review.png`. `out/sheet-check.json` marks the
  failures that the sheet can cause. `studio log` gives the real times of each build.
- **Measured speed.** The bear took about 5.7 h in 5 rounds. The polar bear pilot took 67 min: a
  new animal 27.7 min and the new pianist role 34.3 min (`docs/retro/pilot-polar-bear.md`).

## Rules from the user

- The model does not depend on the role. The animals are orchestra players: most of them sit and
  hold an instrument (user, 2026-10-12).
- A pure refactor keeps every GLB byte-identical. An improvement may change an existing animal
  when it is measurably closer to its sheet and no gate gets worse: give a before and after
  table, look at the review image, and commit the new golden file alone with the reason
  (user, 2026-10-12).
- `seeds.require = "kept"`: the kept seed must pass all gates, and the other seeds are a
  robustness report in `out/seed-report.json`. The manager chose this default, and the user can
  change it to `"all"`.
- The app (`src/`) does not use the studio. A GLB of the studio goes into the app only when the
  user asks.

## Next steps

1. **A violinist role.** Most of the orchestra plays strings. The violin needs an attachment to
   the chest and the chin, a bow in the right paw, and checks for the bow on the strings. Test it
   on a rabbit from a new four-view sheet (see `docs/sheet-spec.md`). Estimate: 1 to 2 h.
2. **Clips from a score.** The pianist plays fixed white keys. A role can read the notes of a MIDI
   score, as the app does in `src/score/`.
3. **The studio bear in the app.** Not decided by the user. The app drives its players from the
   score each frame, so the studio GLB needs a retarget of the app pose to its bones, and the app
   needs a skinned-mesh path again.

## Open problems

- `calibrate` fits the fur color in the front view only. Its light improves the front view and
  makes the other views worse, so both animals keep their hand-tuned light.
- A claw tip slides about 0.8 cm along its key while it presses.
- The key animation costs 127 kB of the polar bear GLB.
- The bear fails `fur_value.back` and two 3/4 eye checks, and the polar bear fails some ear and
  belly checks. The sheet check shows that the views of each sheet disagree there.
- Bear seeds 2, 4, and 8 fail the remesh gate (real mesh faults). The bear keeps seed 3.
