# Handoff of the round mesh-polar-bear

Brief: the scratchpad file `brief-polar-bear.md` of the manager. Start commit `141bc67a`, rebased
onto `48257648` after the merge of the bear round.

## State

- Last finished step: the body, the hold, the tail, the images, and the docs are committed. The
  arm gate of all roles passes against `141bc67a`.
- Next step: `tools/check-commits.sh --tip 48257648`, then the report.

## Facts

- The rig names its seat prop `bench` (`chair.prop`, a change of `tools/blender/rig_mesh.py`),
  so that `pnpm studio-body` puts the body on the piano bench.
- The scale: 1.929 m for each unit, the standing skull top of the old body (1.923 m).
- `pnpm hold-reach` has no piano. The note-target errors of `pnpm pose-depth pianist` give the
  reach of the keys.
- `scan2.sh` sweeps a temporary `PIANO_FRONT_H`. Run no other tool while it runs.
