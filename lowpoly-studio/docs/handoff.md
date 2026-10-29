# Handoff: lowpoly-studio

Read this file first. It gives the state of the studio, its rules, the open problems, and the
next steps. For the commands, the config, and the file formats, read `README.md`. For the
workflow, load the agent skill `lowpoly-animal-studio`.

## State

```text
 sheet --> new --like --> calibrate --> fit --> build (seed pool, gate) --> report --> fix
                                                  |                                    |
                                                  +--> role build + model build <------+
                                                  +--> seed report (seeds.require)
```

- **Animals.** `bear` (conductor), `polar-bear` (pianist), and `rabbit` (violinist). Each one is
  a regression animal: `python3 studio regress <animal>` compares a build with
  `animals/<animal>/golden.json`. `out/build.json` of each animal names its kept role seed and
  its model seed.
- **Roles.** `conductor` (standing, a baton, a 4/4 pattern, cues), `pianist` (seated on a bench
  at a grand piano, 4 digits on each paw, keys that go down), `violinist` (seated on a chair, a
  violin in the left paw under the chin, a bow in the right paw), and `model` (standing, no
  props: the build that the compare and the look checks use for each role).
- **Props.** `props/`: a grand piano with keys, a bench, a chair, a music stand, a violin, a
  cello, and a bow. The sizes come from the body. A violin stands in the scene or sits in a paw.
  No role uses the cello or the music stand yet.
- **Sizes of the bodies.** The polar bear has shins 0.072 units longer than its sheet
  (`field.lift`), so that its feet stand on the floor when it sits on a bench of 0.25 m. The arms
  of the rabbit reach 0.29 animal heights (`reach` of `roles/violinist/role.toml`), and its
  violin is 0.234 long. The violin is shorter than the size chart of a violin shop gives for this
  arm (ratio 0.589), by a decision of the repository owner.
- **Speed.** One stage cache serves all worktrees (`<git common dir>/lowpoly-studio/cache/`). A
  cached seed takes about 4 s, also in a new worktree. A paint or detail change takes about 5 s,
  and a change of one clip about 11 s. An empty cache takes about 52 s for one seed.
- **Outputs in git.** Git keeps only the GLB, its stats, `build.json`, `checks.json`,
  `seed-report.json`, `sheet-check.json`, and `report/review.webp` of each animal (README, "The
  outputs that git keeps"). A build makes the other outputs again.
- **Diagnostics.** Each failure names its clip, frame, bone, and region, with a crop. Each build
  writes `out/report/index.html` and `out/report/review.png`. `out/sheet-check.json` marks the
  failures that the sheet can cause. `studio log` gives the real times of each build.

## Rules

- The model does not depend on the role. The animals are orchestra players: most of them sit and
  hold an instrument.
- A pure refactor keeps every GLB byte-identical. An improvement may change an existing animal
  when it is measurably closer to its sheet and no gate gets worse. Give a before and after
  table, look at the review image, and commit the new golden file alone with the reason.
- `seeds.require = "kept"` is the default: the kept seed must pass all gates, and the other seeds
  are a robustness report in `out/seed-report.json`. `"all"` makes each seed pass.
- The app uses no GLB file of the studio. Its bodies are rigged meshes in the GLB format of the
  studio (`docs/agents/rigging.md` of the repository). A change of the format of the studio (the
  bone names, the shape keys, the clip `reference`) needs a change of `pnpm rig-mesh` and
  `pnpm studio-body` of the app. A GLB of the studio goes into the app only by a decision of the
  repository owner.

## Open problems

### Models and seeds

- The bear fails `fur_value.back`, `fur_saturation.back`, and the 3/4 eye checks. The views of
  its sheet disagree there. Its nose, muzzle, and claw checks fail for real look differences.
- The polar bear fails the IoU of three views, some ear checks, and the belly checks of the model
  build: the class `light` finds few pixels on the standing body. The views of its sheet disagree
  on the ears.
- The rabbit fails the IoU of each view: its arms are longer than the arms of its sheet, and the
  two side ears of the sheet disagree. Its nose checks of the side view fail because the measure
  region starts above the bottom of the nose of the model.
- The seed report of the polar bear is not robust: 2 seeds fail the remesh gate, and 2 seeds fold
  1 or 2 faces in the rest, the chord, or the reference clip. The rabbit has 6 of 8 seeds that
  fail the remesh gate (slivers at the crown and at the trunk bottom, slits at the right leg and
  the trunk bottom), and one seed fails the seat gap. Two bear seeds fail the slit check.
- The standing rabbit has a dark pinch behind each knee, under the haunch, in the back and the
  left views. No face folds. The likely cause is the shapes `legs_straight_*` near the haunch.
- A thin face of the rabbit near each armpit turns about 98 degrees in the seated clips (the fold
  limit is 120). The rest clip keeps the wrist places of shorter arms, so the elbows bend more
  and turn out.

### Roles and props

- The clips play white keys only, and no clip generator reads a MIDI score (the app does this in
  `src/score/`).
- A claw tip slides about 0.8 cm along its key while it presses, because the digits point 45
  degrees down. A hand that points the digits more forward would press straight down.
- The key animation costs 127 kB of the polar bear GLB. A morph for each pressed key would cost
  about 30 kB, but the keys would then be no nodes by name.
- No check measures the bow on the strings.
- The tailpiece and the chin rest of the violin read as small black boxes at the low end.

### Tools

- `calibrate` fits the fur color in the front view only. Its light improves the front view and
  makes the other views worse, so the bear and the polar bear keep their hand-tuned light.
- A clip change still runs the clips stage (3.4 s: it solves every clip) and the export (2.0 s).
  A cache of each clip needs a code key for each clip function. The clip files share module
  constants, so a file is the smallest code key today.
- The frames of a clip in the performance run twice in each round of the fold repair: once in
  the clip, once in the performance.
- The role key uses the bytes of each file of the role pack, so a comment change starts a role
  check. A key from the code objects (as for `build.py`) would keep the entries.
- `build.json` and `checks.json` change in each build (the run), so each round commits them.
- The look report of a build can show the step times of the build before it, because the build
  writes `pipeline.json` after the report.
- A model build is one more Blender process beside the seed pool. A new animal pays one more cold
  build.
- The old renders stay in the history of git (about 77 MB of the pack). Only a rewrite of the
  history can make the pack smaller, and the repository owner must decide it.

## Next steps

1. **Calibrate on all views.** Fit the palette of `calibrate` on the fur pixels of all four
   views (`studio/calibrate.py` and the runs of `shoot.mjs calibrate`). Then try the calibrated
   light and palette on the bear and the polar bear with a before and after table.
2. **Robust seeds.** Fix the folds of the polar bear seeds and the remesh faults of the rabbit
   at their places (`out/seeds/<n>/checks.json` of `build <id> --all-seeds`), then consider
   `seeds.require = "all"`.
3. **Clips from a score.** A role can read the notes of a MIDI score, as the app does in
   `src/score/`.
4. **A cello role.** The props exist and are sized from the body. The cello stands between the
   knees as a scene prop.
