# Handoff: lowpoly-studio

Branch `studio-core`, worktree `.claude/worktrees/studio-core`, from main c528ca2e.

## Last finished step

Phase 1 (generic studio core) is done:

- `bear-studio/` moved to `lowpoly-studio/` with `git mv` and the new layout (`studio/`,
  `templates/biped/`, `roles/conductor/`, `viewer/`, `animals/bear/`).
- All bear constants are in `animals/bear/animal.toml`, checked by `studio/schema.py`. All
  conductor constants are in `roles/conductor/` (role.toml and the clip code).
- The user added a requirement during the work (2026-10-12): the animals will play other roles
  (piano, violin, and so on). The role is a pack under `roles/` (stance, bind pose, correctives,
  props, clips, role checks). The model stages take only the bind pose from the role.
- The CLI: `python3 studio build|compare|view|new|regress|fit|schema` (run in `lowpoly-studio/`).
- The Blender build runs in explicit stages (`studio/build.py`, `studio/stages.py`). The checks
  write one report (`studio/checks.py`, `out/checks.json`).
- Regression: `python3 studio regress bear` builds seed 3 and compares with
  `animals/bear/golden.json` (from the main build). Result: PASS, the GLB is byte-identical.
- README, `animals/bear/README.md`, and the AGENTS.md line are up to date.

## Next step (phase 2: speed and diagnostics)

1. A stage cache keyed by input hashes (see "Seams for a faster loop" in the README). The live
   outputs (Blender objects) must be made again from the saved outputs. The edge order of a mesh
   made again can change the weight smoothing in the last bits: run `regress` and expect "float
   noise" at most.
2. Parallel seeds: one Blender process for each seed with `--out animals/<id>/out/seeds/<n>`.
3. The two slow stages: `contacts` (23 s, two check passes) and `organic` (15 s, Python loops).
4. Located failures (the faces, bones, and frames of each failed check) and one look-report page.

## Phase 3 note

Phase 3 adds a `pianist` role pack and tests it on a polar bear (a standing four-view sheet, then
seated at a piano). The role interface must fit:

- a seated player: `[bind] hip_flex` and `knee_flex` of about 90 degrees exist in the template
  (the legs bend in the field and the layout, and the sheet pose straightens them with `leg_fk`),
  but no build has used them yet. A "legs_straight" corrective and a body drop onto the seat are
  missing;
- a large scene prop (a piano and a bench): `props.attach.bone = "scene"` and
  `attach.seat_height` are in the schema, but no prop kind other than "stick" is built;
- two hand targets per note: a pack can compute any wrist target. A check "hands within a
  distance of their targets" is missing.

The README section "What a seated role needs" lists these gaps.

## Baseline (main c528ca2e, seed 3)

- Two builds of main give the same GLB bytes.
- Old `./build.sh --seed 3`: 64.4 s. New `python3 studio build bear`: 65.0 s (intake 2.6, Blender
  49.3, shots 11.4, measures 1.7). The measures stage is new.
- IoU front 0.9468, side 0.9596, back 0.9495, 3/4 0.9154.

## Open problems

- Three look checks fail on the bear, the same on main: `fur_value.back`,
  `eye_rim.three_quarter.0`, `eye_outline.three_quarter.1` (limits of the sheet, see
  `animals/bear/README.md`).
- The retarget of the wrist targets (`Context.place`) and the seated bind pose have no test on a
  second body yet.
