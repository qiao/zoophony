# Handoff of the round rabbit-elbow

Start commit: `51161830`. The agent worked alone on `main` in the main checkout.

## Last finished step

The round stopped at the limit of its fix variants (`../2026-10-21-rabbit-elbow.md`, section 4).
No change of the rig, the config, or a GLB file is on `main`. The open item is in `TODO.md` under
the rabbit items.

- The cause: the flat cap of the arm cut (`cut_seam()` of `tools/blender/rig_mesh.py`) closes the
  inner side of each arm from the middle of the upper arm to the forearm. The right faces of the
  sheet are 92 and 93 of the module.
- `dome.patch` holds the rule `cut.dome` of variants d1 to d2b. Apply it with `git apply` to probe
  it again. Its images failed: jagged facets at azimuth 150 and a lump from the right side.
- `elbow-look.ts` is the measure of the elbow. Copy it into `scratch/` and run it with
  `node scratch/elbow-look.ts violinist [--glb <kept glb>]`.

## Next step

Ask the user to approve a remodel of the inner side of each arm in a copy of the mesh (a round
tube from the middle of the upper arm to the forearm, as `pig_arms.py` does). Then rig the copy,
and check the cut rules of the armpit again.
