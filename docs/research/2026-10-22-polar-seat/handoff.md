# Handoff of the round polar-seat

Brief: the scratchpad file `brief-polar-seat.md` of the manager. Start commit `3796be6d`.
Worktree `.claude/worktrees/polar-seat`, branch `polar-seat`.

## State

- Last finished step: the seat, the hold, the haunch ramp, the gates, the images, and the docs
  are committed.
- Next step: `tools/check-commits.sh --tip 3796be6d` with a clean tree, then the report.

## Facts

- `seat-probe.ts` measures the angles, the haunch gap, the soles, the center of mass, the knees,
  and the arms in the app. It takes `--glb`. `SEAT_ROOT=<root>` runs it on another tree.
- A lean from the hips in the bind (`studio.trunk.open` -12 or -18) folds both arms in each
  play sample: rejected. `lean-sit.patch` is the change of `rig_mesh.py` that the variant used.
- `pairs.py` joins the close views of the base and the round for each moment.
