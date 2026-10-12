# Handoff: lowpoly-studio, phase 1 (generic studio core)

Branch `studio-core`, worktree `.claude/worktrees/studio-core`, from main c528ca2e.

## Last finished step

Step 3 (core): the Blender build reads the config (`animals/bear/animal.toml`, checked by
`studio/schema.py`) and the role pack (`roles/conductor/role.toml`), and runs in stages
(`studio/build.py`, `studio/stages.py`). Run it by hand:

    python3 studio/intake.py bear --out $S/t1
    blender -b --factory-startup --python studio/build.py -- bear --seed 3 --out $S/t1

The GLB and the stats of seed 3 are byte-identical to main.

The user added a requirement during the work (2026-10-12): the animals will play other roles
(piano, violin, and so on). The role is now a pack under `roles/` (stance, bind pose,
correctives, props, clips, role checks). The model stages take only the bind pose from the role.

## Next step

Make the other tools config-driven (`studio/fit.py`, `views.py`, the `measure_*` tools,
`roles/conductor/pattern.py`, `studio/shoot.mjs`, `viewer/`), then the checks module, the CLI
(`python3 studio ...`), the golden stats and `studio regress bear`, the README, and AGENTS.md.
`build.sh` is stale until the CLI replaces it.

## Phase 3 note

Phase 3 adds a `pianist` role pack and tests it on a polar bear (a standing four-view sheet,
then seated at a piano). The role interface must fit a seated player (bind pose with hip_flex
and knee_flex about 90 degrees, a "legs_straight" corrective that the biped template does not
have yet), a large scene prop (a piano and a bench: props with attach.bone = "scene" and a seat
height that fits the legs, not built yet), and two hand targets per note.

## Baseline (main c528ca2e, seed 3)

- Two builds give the same GLB bytes, and they match the committed `out/bear.glb`
  (sha256 in `animals/bear/golden.json` once it exists).
- Full `./build.sh --seed 3`: 64.4 s wall. GLB only (`--no-shots`): 52.7 s wall.
- IoU front 0.9468, side 0.9596, back 0.9495, 3/4 0.9154.
- Scratch copies of main: `/Users/xueqiaoxu/.claude/jobs/dae62c98/tmp/studio/base1` (full
  build with shots) and `base2` (GLB only).

## Open problems

None yet.
