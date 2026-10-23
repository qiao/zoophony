# Handoff of the round `rhino-arm-2`

The worktree is `.claude/worktrees/rhino-arm-2` on the branch `rhino-arm-2`, from `afff590f`. The
brief: make both rhino arms read as round, clean arms at full size in the app.

## Step 1: the defects at full size

Images: `scratch/s1/at-e20/` and `scratch/s1/at-e40/` (`pnpm close-views play <dir> --demo
brahms-2 --time 283 --at rhino --azimuth 180 150 -150 -90 0 --elevation 20|40 --base b22a786c`).
`play-base-*` is `b22a786c` (the first patch), `play-*` is `main`. The rhino stands in seat 12.

- L1 (az180, az-150, e20 and e40): the left elbow and the back of the upper arm read as a flat
  angular slab with a sharp corner. At az180 e20 the elbow is a crumpled lump with a light flap.
  On `b22a786c`, dark facets of the patch show inside the lump (the "completely deformed" arm).
- L2 (az-150 e20): the left upper arm is a flat sheet with a long dark crease from the shoulder
  to the elbow, and a crumpled light sheet shows under the forearm beside the tuba.
- R1 (az150, az180): the right elbow is a sharp square corner with a large dark flat triangle at
  its back, and a jagged flap from az180.
- T1 (az-90): dark facets on the side of the trunk under the arm (the cap of the cut).

Both trees show L1, L2, and R1. The cause is the form of the whole arm: the outer side of the
coarse source arm bends at the elbow on long faces, and the inner side is a cap.

## State

- Commits from `afff590f`: the arm-own rule, the budget 4,600, the head floor, the copy
  `rhino-tubes.glb`, the rig, the arm-below fix, the mesh row, the trap, and the report.
- Done: each measure of the brief, the audit, the frame, the report, the decision file, TODO.
- Next step: `tools/check-commits.sh --tip afff590f`, then the report to the manager.
