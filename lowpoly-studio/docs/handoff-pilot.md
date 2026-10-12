# Handoff: the polar bear pilot (phase 3)

Branch `studio-pilot`, worktree `.claude/worktrees/studio-pilot`, from main 3ea5896e. Another
agent writes the skill and `docs/brief-template.md` and `docs/sheet-spec.md` in another
worktree: do not edit those files. The retro with the times and the lessons is
`docs/retro/pilot-polar-bear.md`.

## Last finished step

Both parts are done and committed. The branch is ready for `tools/merge-branch.sh studio-pilot`.

- Part A, the model (conductor role, seed 1): IoU front 0.9442, side 0.9554, back 0.9414,
  3/4 0.9291. 72 of 81 checks pass, and all gates pass.
- Part B, the pianist role (`roles/pianist/`, seed 1): all gates pass in all 6 clips. The polar
  bear config now names the pianist role. `out/` holds the pianist build, `golden.json` its
  stats, and `python3 studio regress polar-bear` passes.
- `python3 studio regress bear` passes (the GLB is byte-identical).
- README: the pianist role, the scene checks, the new config fields, the traps.

## Next step

Choose one, by goal:

1. Robust rest clip (about 30 min): the rest clip passes on seed 1 only. Seeds 2, 3, 4, 5, 7,
   and 8 fail it by 1.7 to 2.3 cm at the right elbow skin against the lower belly (located in
   `out/seeds/<n>/checks.json` of `build polar-bear --all-seeds`). Keep the arms more bent: for
   example a rest with the paws higher on the outer knees and a deeper lean, then run
   `build polar-bear --all-seeds --no-shots` until every seed with a clean mesh passes.
2. Look round with a human review (about 30 to 60 min): the head reads wider and flatter at the
   cheeks than the sheet, the muzzle is less round, and the ears fail in the side and back
   views (the sheet views disagree).

## Open problems

- The sheet pose of the seated build: IoU side 0.912 (the knees of the straightened legs bulge
  forward). The conductor build of the same config has 0.9554. The `legs_straight` corrective
  removes the inverted faces but does not move the knee skin far enough.
- Seed 6 fails the remesh gate with a real crease (six slit faces, gap 0.15 px, at
  (-0.105, 0.150, 0.023) where the seated thigh meets the trunk bottom) and 1.18% slivers.
- The bench is low (top at 0.048): the polar bear has short legs and a low trunk, so the trunk
  sits on the bench and the thighs stay about 4 cm above it. The seat check measures the trunk
  and the thighs together.
- The scene props are rigid bones of the GLB armature under the root. The export makes no
  separate prop nodes yet. The keys do not move, and each paw has one finger bone.
- Failing look checks of the model: the 3/4 eyes (sheet turns the head), the ears in the side
  and back views, `nose_width.side` (20% short), `belly_height.front` (the light patch is
  short).
- `out/frames/` keeps the frames of an earlier role when the role changes (deleted by hand).
- The scaffold of `studio new --like` is long (1534 lines). A copy of the like config was
  faster.
