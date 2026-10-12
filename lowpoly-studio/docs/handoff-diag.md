# Handoff: lowpoly-studio diagnostics (phase 2b)

Branch `studio-diag`, worktree `.claude/worktrees/studio-diag`, from main 3d56d2d6. Another agent
works on phase 2a (speed: a stage cache, parallel seeds, a remesh gate) in another worktree. This
file is the handoff of phase 2b only. `docs/handoff.md` is the handoff of the whole studio.

## Tasks

1. Located failures: each failing or near check fills `where`, with a crop and a fold debug list.
2. A generic feature measure that replaces `measure_eyes.py` and `measure_ears.py`.
3. A look-report page per build (`out/report/index.html`, `python3 studio report <animal>`) and
   one review image.
4. `python3 studio regress bear` passes (the GLB does not change).

## Last finished step

All four tasks are done.

- **Feature measure.** `studio/measure_features.py` measures each feature of `measure.features`
  (color classes, a region box per view, the methods "blobs", "area", and "bump") on the sheet
  and on the render, into `out/compare/features.json`. The eye and ear values of the bear are
  the same as before (96 of 96 values). The bear also declares the nose, the muzzle, the belly,
  and the claws.
- **Located failures.** `ContactCheck` records the place of each contact, closest approach, and
  turned face. The new Blender stage "diagnostics" (after "export", 0.05 s) returns them from
  `contacts.JOURNAL`. `studio/locate.py` writes `out/diag/folds.json` (the fold debug list),
  `out/diag/contacts.json`, and one crop of each place (a flat-shaded render in pure Python).
  `checks.py` fills `where` of each failing or near check, and marks "near" checks.
- **Look report.** `studio/report.py` writes `out/report/index.html` and `review.png` after the
  checks. `python3 studio report <animal>` writes it and serves `out/` on a free port.
- **Regression.** `python3 studio regress bear`: PASS, every group identical. The golden
  `measures` hold `features.json`, and the golden `checks` hold the new checks (71 of 82 pass).

## Changes outside the files of this task

The two changes in the files of phase 2a (the stage entry in `build.py` and the line in
`run_build`) are marked `studio-diag` in the code:

- `studio/build.py`: one entry "diagnostics" at the end of `STAGES`, and one doc line.
- `studio/cli.py`: in `run_build`, the checks of the last seed run before the stop when no seed
  passes. `step_checks` also writes the look report. `step_measures` calls the feature measure.
  The new command `report`, and a fix of the scaffold of `new` (values that differ from a
  default are kept).
- `studio/regress.py`: `collect` reads `features.json` in place of `eyes.json` and `ears.json`.
- `studio/schema.py`: `measure.classes`, `measure.features`, `measure.background_diff`. The old
  `measure.eyes`, `measure.ears`, `checks.eye_outline`, `checks.eye_rim`, and `checks.ear_size`
  are gone (the limits are in the feature checks).
- `templates/biped/__init__.py`: `region_name` and `REGIONS` (the body region of a place).

## Notes for the merge with phase 2a

- The stage "diagnostics" reads `contacts.JOURNAL`, an input that the stage list does not name.
  A stage cache must run "contacts" and "diagnostics" together, or cache both.
- `checks.py` reads `out/stages/<nn>-diagnostics/data.json` (found by the stage name). A cache
  must keep the JSON outputs of a cached stage in its `data.json`, and a parallel seed run must
  bring the `stages/` folder of the kept seed into `out/`. Else the checks have no `where` for
  the contacts and the folds, and the report says "No diagnostics".
- The build writes the checks of the last seed when no seed passes. A parallel seed search
  needs the same: the outputs of one failed seed in `out/`.

## Example of a located failure

A test bear with paws of radii `[0.115, 0.115, 0.1]` (scratch config, not committed) fails the
gate of the bow with seed 3:

```text
  GATE FAIL contact.bow: 0.0249 <= 0.01
      at clip=bow time_s=1.7 frame=51 side=L part=paw bone=hand_L into_bone=spine
      region=belly, front, right position=[-0.0076, 0.356, 0.2289] depth=0.0249
      crop=diag/contact-bow.png
```

## Open problems

- The new feature checks fail on the bear for real look differences: the nose (2.5 cm high in
  the front view, 1.8 cm forward in the side view), the muzzle (shorter), and the claws (they
  touch, so they read as one blob). These are look items for a model round, not tool faults.
- The limits of the new features (nose, muzzle, belly, claws) come from one sheet. A second
  animal will show if they are right.
- The crop renders are flat-shaded and cut at a radius of 0.12 around the place. A fold deep in
  a crease can hide behind other faces, so the crop also shows a side view and a ring.
- The stage "diagnostics" depends on `contacts.JOURNAL` in the same Blender process (see the
  merge notes).
