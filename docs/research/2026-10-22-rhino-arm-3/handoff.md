# Handoff of the round `rhino-arm-3`

The worktree is `.claude/worktrees/rhino-arm-3` on the branch `rhino-arm-3`, from `502f7a75`. The
brief: give each rhino arm a round shoulder, and remove the dark gashes and the color patches of
the trunk fill.

## Step 1: the defects at full size (done)

- D1, the dark gashes: in `noshadow` (no cast shadow), a black V above the right arm root, and
  dark wedges behind the left arm root. The `colors` probe shows no dark color there, so the
  cause is the form.
- D2, no shoulder: from az-90, az90, az-150, and az150 at e20 and e40, each tube leaves the side
  of the chest at mid height. The trunk above it is flat.
- D3, the color patches: the `colors` probe shows dark gray and light beige faces with jagged
  edges in the fill under each arm.

The stage pairs of the report show them (`stage-*.webp`, `root3x-*.webp`, left image).

## State

- Done: the copy `rhino-shoulders.glb` (variant s7 of `variants.txt`), the budgets 5,600
  triangles and 34,000 B, the rig, the measures, the images, the report, the decision rows.
- Next step: the TODO items, then `tools/check-commits.sh --tip 502f7a75`, then the report to the
  manager.
