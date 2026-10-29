# Handoff: lowpoly-studio

Read this file first. It gives the state of the studio, the open decisions, and the next
steps. The other handoff files are the record of each round, in this order: `handoff-speed.md`
and `handoff-diag.md` (phase 2), `handoff-pilot.md` (phase 3), `handoff-intake.md`,
`handoff-runtime.md`, and `handoff-props.md` (rounds A, B, and C). For the commands and the
config, read `README.md`. For the workflow, load the user skill `lowpoly-animal-studio`.

## State (branch studio-lean, 2026-10-12)

```text
 sheet --> new --like --> calibrate --> fit --> build (seed pool, gate) --> report --> fix
                                                  |                                    |
                                                  +--> role build + model build <------+
                                                  +--> seed report (seeds.require)
```

- **Animals.** `bear` (conductor), `polar-bear` (pianist), and `rabbit` (violinist, from
  2026-10-13). The app uses the bear and the polar bear. Since the evening of 2026-10-13, the app
  rabbit is a mesh of the user that `pnpm rig-mesh rabbit` rigs in the format of the studio, and
  the studio rabbit stays here. Each is a regression animal: `python3 studio regress <animal>` compares a build
  with `animals/<animal>/golden.json`.
- **Roles.** `conductor` (standing, baton, 4/4 pattern, cues), `pianist` (seated on a bench at a
  grand piano, 4 digits for each paw, keys that go down), `violinist` (seated on a chair, a
  violin in the left paw under the chin, a bow in the right paw), and `model` (standing, no
  props: the build that the compare and the look checks use for every role).
- **Props.** `props/`: a grand piano with keys, a bench, a chair, a music stand, a violin, a
  cello, and a bow. The sizes come from the body. A violin stands in the scene or sits in a paw.
  No role uses the cello or the music stand yet.
- **Speed.** One stage cache for all worktrees (`<git common dir>/lowpoly-studio/cache/`). A
  cached seed takes about 4 s, also in a new worktree. A paint or detail change takes about 5 s.
  An empty cache takes about 52 s for one seed. `tests/test_cache.py` fails when a cache key
  holds a worktree folder.
- **Frame cache.** The contact stage keeps the record of each frame of each clip in the stage
  cache (`contacts.Frames`, README "The frame cache of the contact check"). A change of one clip
  of the bear takes 10.7 s (40.7 s before), or 12.8 s for a clip of the performance (34.7 s
  before). A role check of the bear after a comment in its clip file takes 20.4 s.
- **Outputs in git.** Git keeps only the GLB, its stats, `build.json`, `checks.json`,
  `seed-report.json`, `sheet-check.json`, and `report/review.webp` of each animal (README, "The
  outputs that git keeps"). A round of both animals adds 8 files and 3.2 MB in place of 70 files
  and 18.0 MB. A build makes the other outputs again.
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
- The app (`src/`) uses the GLB files of the bear and of the polar bear since 2026-10-12, when the
  user asked for them. It used the GLB file of the rabbit for a part of 2026-10-13, until the rigged
  mesh of the user took its place (item 5 below). After a change of `animals/bear/out/bear.glb` or
  `animals/polar-bear/out/polar-bear.glb`, run `pnpm studio-body <animal>` and `pnpm test` in the
  root of the repository (`docs/agents/rigging.md`). The clearance tests of the
  conductor and of the pianist check the arms and the paws against the body and the piano of the
  app. A change of the studio rabbit needs no step in the app. Another GLB of the studio goes into
  the app only when the user asks.

## Next steps

1. **A violinist role.** Done on 2026-10-13 (`docs/handoff-rabbit.md`): the rabbit from the
   sheet of the user plays `roles/violinist/` on a chair. The left paw holds the violin at the
   neck (a hand prop, `studio/props.py` `held_violin`), so the studio needs no attachment to the
   chest or the head. Open: a check of the bow on the strings, and the IoU of the rabbit
   model below the bar (the sheet ears disagree between the views).
2. **Clips from a score.** The pianist plays fixed white keys. A role can read the notes of a MIDI
   score, as the app does in `src/score/`.
3. **The studio bear in the app.** Done on 2026-10-12. The app retargets its conductor pose to
   the bones of the studio bear on each frame, with the skin of four bones, the twist bones, and
   the corrective shapes (`docs/research/2026-10-12-studio-bear.md` of the repository). The app
   drives the wrists further than the clips of the studio, so it turns each paw in the plane of
   its palm toward the forearm.
4. **The studio polar bear in the app.** Done on 2026-10-12
   (`docs/research/2026-10-12-studio-polar-bear.md` of the repository). The app scales the bear by
   the keys of its studio piano, drops it onto a bench that fits its legs, and gives the four
   digits of each paw to one finger bone. Up to 15 faces fold at the neck and the head in the
   pianist poses of the app: a neck corrective shape of the studio could help. Since 2026-10-14,
   the bear sits on a bench of 0.25 m, its shins are 0.072 units longer than the sheet
   (`field.lift`), so its feet stand on the floor, and the studio keeps seed 6, whose faces fold
   least in the poses of the app (`docs/decisions/2026-10-14-polar-fix.md` of the repository).
5. **The studio rabbit in the app.** Done on 2026-10-13, and replaced the same day by the rigged
   mesh of the user (`docs/decisions/2026-10-13-mesh-rabbit.md` of the repository). The facts
   below hold for the studio rabbit
   (`docs/research/2026-10-13-studio-rabbit.md` of the repository). The app scales the rabbit by
   the standing shoulders of the parametric rabbit, seats it on a chair with the depth of the chair
   of the studio, stands it as a soloist with the leg corrective shapes, and gives it a violin
   sized by the rule of a violin shop: 0.55 of the app size (0.28 m) for the arms of round 4,
   which reach 0.377 m to the middle of the palm. The body of round 4 has 2,920 faces, within the
   app budget of 3,100. Open for the studio: in the side rest of the app, the right arm hangs, and
   one face of the right upper arm folds in each rest sample (`pnpm fold-probe violinist`, round 3:
   none). It is face 248 of `upper_arm_R`, at the front of the right armpit: the exact mirror of
   face 805, the thin face near the left armpit that the near check of round 4 found (smallest
   angle 15.8°, area 3.25 cm²). In the rest, it turns 101.8°. In the lift of the app, it turns
   up to 168.1°, more than the fold limit of 120°. With the weights of the arm corrective shapes
   at 0, it turns 80.9° and does not fold, so the arm-down corrective shape of the right arm makes
   the fold. The studio fix is the thin face at the armpit, or the corrective shape. No hold
   value of the rest in the app removes it. The `HANG` constants of `src/pose/hang.ts` can, with
   120 more changed pose sets (design 5.2), as a later choice
   (`docs/research/2026-10-13-studio-rabbit.md` section 9 of the repository). Also open for the
   studio: the standing rabbit has
   a dark pinch behind each knee, under the haunch, in the back and the left views of the stand
   (`docs/research/2026-10-13-studio-rabbit/stand-knee-pinch.webp` of the repository). No face
   folds: the faces near the haunch pinch. The cause is likely the shapes `legs_straight_*`
   near the haunch.

## Open problems

- The old renders stay in the history of git (about 77 MB of the 197 MB pack), because main is
  pushed. Only a rewrite of the history can make the pack smaller, and the user must decide it.
- A clip change still runs the clips stage (3.4 s: it solves every clip) and the export (2.0 s).
  A cache of each clip in the clips stage needs a code key for each clip function, and the clip
  files share module constants, so a file is the smallest code key today.
- The frames of a clip in the performance run twice in each round of the fold repair: once in
  the clip, once in the performance. A change of `clip_hush` measures 248 frames in each of the
  2 rounds of the bear (the clip and its part of the performance): 3.6 s.
- `build.json` and `checks.json` change in each build (the run), so each round commits them.
- `calibrate` fits the fur color in the front view only. Its light improves the front view and
  makes the other views worse, so both animals keep their hand-tuned light.
- A claw tip slides about 0.8 cm along its key while it presses.
- The key animation costs 127 kB of the polar bear GLB.
- The bear fails `fur_value.back` and two 3/4 eye checks, and the polar bear fails some ear and
  belly checks. The sheet check shows that the views of each sheet disagree there.
- Bear seeds 2, 4, and 8 fail the remesh gate (real mesh faults). The bear keeps seed 3.
