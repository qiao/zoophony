# Handoff of the round `rabbit-armpit` (2026-10-22)

The brief is `brief-rabbit-armpit.md` in the scratchpad of the manager. The worktree is
`.claude/worktrees/rabbit-armpit` on the branch `rabbit-armpit`, from `b22a786c`. The round paused
at the request of the user (an urgent rhino round), before the cause and before each variant.

## State

- Last finished step: step 1 of the brief started. The base images exist, but they are outside
  the tree (the scratchpad of the manager, folder `ra/`): the audit sheets of
  `pnpm close-views audit <dir> --roles violinist` (no `--base`, the tree equals `b22a786c`), and a
  lineup of each moment from az35, az60, the right, the front, az150, and the back at the
  elevation 20 (`pnpm close-views violinist <dir> --lineup --moments
  frog,tip,crossing,rest,lift50,lower50,stand --views 35,60,right,front,150,back --elevation 20`).
  A fresh agent makes them again: 10 to 30 minutes.
- No cause is found yet, no variant is made, and no file of `src/`, `tools/`, or `assets/` has
  changed.
- `scratch/` of the worktree (ignored by git) holds the probes of the bear rounds, ready to run:
  `src-elbows.npz` (`dump.py` of `rabbit-4-elbows.glb`, 1,564 welded vertices, 3,101 triangles),
  `rig-base/base.glb` with `base.corners.json` (`pnpm rig-mesh rabbit --check --keep
  scratch/rig-base`, folds play 0.0%, lift 5.8%, rest 0.0%, 3,165 triangles), and
  `base-all.bin` / `.json` (`SPECIES=rabbit node scratch/with-glb.ts scratch/rig-base/base.glb
  dump-all.ts violinist $PWD/scratch/base-all --step 4 --every 2`, 791 samples).
  `scratch/with-glb.ts` reads the species from `SPECIES`.

## What the images show so far

In the audit sheet at the elevation 20, the frog from the front shows a dark hollow on the chest
under the right upper arm, where the arm crosses the body. From az35 (the right front, the view of
the user) at the frog, a dark hollow shows below the right arm root. The crops at 3x are not made
yet. az35 is the right front: the rabbit seems to face to the right of the image.

## News from the manager (2026-10-22)

- The user said: "do not worry about triangle budget, you have plenty budget". The rig may go
  above 3,200 triangles when more vertices at the right armpit make the root rounder. Record the
  quote and the new count as a decision row, and give the line of `pnpm size --base b22a786c`
  (the first download stays below 1,000,000 B, about 734,000 B now).
- The rhino left arm was "completely deformed" after its round patch, and the manager reverted
  it. Check the rabbit result also at full size from the stage camera
  (`pnpm close-views play` with the default camera and `--at rabbit:violin`), not only in crops.

## Next step

1. Render the 3x crops of the right armpit at each moment, from az35, az60, the right, the front,
   az150, and the back, at the elevations 20 and 40 (`--crop 3 --box <x>,<y>,<w>,<h>`, shares of
   the cell from its top left; at the frog from az35 the armpit lies near x 0.4 to 0.65, y 0.45
   to 0.65).
2. Name the faces of the hollow (`faces.py` of `2026-10-22-bear-armpit/`), and measure the depth
   of each arm root vertex below the hull of its neighbors in the pose (`vdepth.py` of
   `2026-10-22-arm-roots/` with `scratch/base-all` and `src-elbows.npz`).
3. Write `tools/arm-roots/rabbit.json` (source `rabbit-4-elbows.glb`, a new output file) and try
   `push`, `split`, `fair`, and `hull` of `tools/blender/arm_root.py`. With the new budget, try a
   `split` of the long edges in the notch, so that the hollow gets more vertices.
4. Then the rest of the brief: the gates, the paused `rabbit-depth` via commit `b1e270f0`, the
   docs, and `tools/check-commits.sh --tip b22a786c`.
