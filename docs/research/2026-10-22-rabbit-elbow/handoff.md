# Handoff of the round rabbit-elbow (2026-10-22)

Start commit: `7c1747ed`. Branch `rabbit-elbow` in the worktree of the same name. The manager
merges.

## Last finished step

The rig reads `assets/models/rabbit/rabbit-4-elbows.glb`, the copy with a round patch over the
inner side of each arm (`rabbit_elbows.py`, variant e7 of `variants.txt`). The rig commit wrote
`rabbit-4.rig.glb` and `src/models/studio/rabbit.ts`. The gates of the report are in this folder.

- `rabbit_elbows.py` writes the copy with its defaults:
  `blender -b --python rabbit_elbows.py -- tools/mesh-rigs/rabbit.json
  assets/models/rabbit/rabbit-4-arms.glb <out.glb> [<options JSON>]`.
- `bind_elbow.py` renders the elbow of a rig bind from seven views. `pairs.py` makes the crop
  pairs of `close-views --lineup`. `section_density.py` compares two section ratios of a posed
  OBJ of `elbow-look.ts --dump`.
- To probe a variant, point `source` of `tools/mesh-rigs/rabbit.json` at the variant copy, and run
  `pnpm rig-mesh rabbit --check --keep <dir>`, then `elbow-look.ts --glb` and `pnpm arm-look
  --glb`.

## Next step

The three open items of the rabbit in `TODO.md`: the section of the right upper arm of `pnpm
arm-look` (0.60, base 0.74), "upper arms in body" of `pnpm pose-depth` (5.9 cm in the lowering,
0 on the base), and the dark lower face of the bow elbow from azimuth 150. A first step: a patch
whose push toward the trunk fades with the distance to the trunk wall of the source, measured
with `pnpm pose-depth violinist --glb <kept glb>`.
