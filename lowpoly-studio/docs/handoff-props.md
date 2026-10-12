# Handoff: the props round

Branch `studio-props`, worktree `.claude/worktrees/studio-props`. It started from main 1274c780.
Before the first commit, the work moved onto main c0f1b861 (rounds A and B merged), so the
branch needs no rebase now. Another agent worked on the intake items (round A) in another
worktree.

## Items and ownership

| # | Item | State | Commits |
|---|---|---|---|
| 1 | Prop library, scene props as nodes, props gallery | done | 60d0eb3b, 0b5a03d0, ff3d274c, 6a0964f3, 4a9057ed |
| 2 | Moving keys | done | 0b5a03d0, c24d492e, 72d76ae8 |
| 3 | Finger bones (`[rig] fingers = 1 \| 4`) | done | 5d796dc7, c24d492e |
| 4 | Pianist fixes: the thighs on the bench, the rest clip on every seed | done | ec3e2e89, c24d492e |
| - | Outputs, golden, README | done | 326ea357, 8b18269c, c9fc967a, 51895233, 76d36c32 |

56605e75 (cut parts of the field) and 2d039a9a (their removal) are a tried and dropped seat
design (see "Decisions").

This round owns `studio/props.py`, the library `props/`, `templates/biped/` (the digits and the
seat), `roles/pianist/`, the viewer support for props (`viewer/props.*`, the wire copy of
`viewer/frames.js`, the props switch of the viewer), `studio/gallery.py`, and the command
`props`. Small changes in shared files:

- `studio/build.py`: the stages assemble (scene nodes), clips (scene poses), and the scene check
  (the seat of the rump and of the thighs, the claw tip of each digit).
- `studio/bake.py`: scene nodes in the samples, `write_node_actions`.
- `studio/export.py`: `add_prop_nodes`.
- `studio/schema.py`, `studio/config.py`: the prop tables, `[rig] fingers`, `bench.fit`,
  `chair.fit`, `load_props`, the docs of the role checks.
- `studio/details.py`: the bone of each hand claw comes from the body.
- `studio/cli.py`, `studio/shoot.mjs`: the command `props`.
- `studio/viewer_config.py`, `viewer/index.html`, `viewer/main.js`: the switch "Scene props".
- `studio/field.py`: no change at the end (a cut part was added and removed).

## What each item does

1. **Prop library.** `props/` holds the kinds: `piano` (case with a bentside, open lid on its
   stick, soundboard, plate, strings, white and black keys, key bed, cheeks, fallboard, music
   desk with a sheet, three legs, lyre, three pedals), `bench`, `chair`, `music_stand`,
   `violin`, `cello` (with its end pin), and `bow`. `studio/props.py` sizes them from the body:
   the keyboard 6 cm below the elbows of the seated pose, the white key as wide as the claw
   tips are apart (2.26 cm on the polar bear), the case from the keyboard width, the bench and
   the chair on the seat of the body, the stand below the eyes, a violin of 1.1 arm reaches, a
   cello to the eyes. A scene prop is a mesh node of its own in the GLB with no bone. A hand
   prop (stick, bow) keeps a bone of its own under the hand. `python3 studio props <animal>`
   builds the gallery (`out/props/gallery.glb`, `props.png`), and `viewer/props.html` shows it.
2. **Moving keys.** The keys that the pack presses (`pack.pressed_keys`, 10 on the pianist) are
   nodes under the piano, with their pivot far back under the fallboard. A pose spec gives the
   press share of each key (`spec['keys']`). `props.ScenePose` turns the shares into node
   rotations, and `bake.write_node_actions` writes them on NLA tracks with the clip names. A key
   goes down by the key dip (0.95 cm on the polar bear) when a claw tip pushes it.
3. **Finger bones.** `[rig] fingers = 4` gives each paw the digits `finger1_<s>` (inner) to
   `finger4_<s>`, from 2.5 cm behind the base of each claw inside the paw to its claw tip. Each
   claw is rigid on its digit. `digit_weights` gives the front of the paw to the digits. The
   pianist plays the melody with single digits of the right paw, two-digit chords with the left
   paw, and a big chord with three digits of each paw. The hands gate measures the claw tip of
   each pressing digit against its key. The bear keeps one finger bone.
4. **Pianist fixes.** `Body.seat` gives the seat of a seated bind pose and a height map of the
   lowest body point over it, up to the plane of the thighs. The pad of the bench takes this form
   (a soft pad under a heavy body), so the rump and the thighs rest on it. The seat check
   measures the rump and the thighs apart. The rest clip puts the paws on the outer tops of the
   knees (out 2.1, forward 1.3 knee radii), turns the elbows out and back in the first half of
   the way down, and leans the trunk further.

## Measures

Before: main c0f1b861, polar bear seed 1. After: this branch, polar bear seed 3 (the first seed
of `facets.seeds` that passes every gate now).

| Measure | Before | After |
|---|---|---|
| seeds that pass every clip (of the 7 that pass the remesh gate) | 1 | 7 |
| rest clip, deepest contact over the seeds | 1.0 to 1.9 cm on 6 seeds | 0.00 cm |
| seat gap of the rump | 0.20 cm | 0.05 cm |
| seat gap of the thighs (the skin out from the hip joints) | 2.23 cm | -0.05 cm |
| hands gate | 0.00 cm (knuckles) | 0.00 cm (claw tips of the digits) |
| scene gate (deepest body point in a prop) | 0.19 cm | 0.17 cm |
| folds | 0 | 0 |
| look checks (the model build, the same GLB as main) | 71 of 84 | 71 of 84 |
| IoU front, side, back, 3/4 | 0.9465, 0.9543, 0.9452, 0.9332 | the same |
| bones, nodes | 32, 34 | 36, 50 |
| triangles (all) | 3284 | 4480 |
| role GLB | 888,184 bytes | 1,105,972 bytes |

The role GLB grew by 218 kB: the 8 digits add 94 kB of bone animation, the 10 key nodes add
127 kB of node animation (the exporter samples a moving node channel at each frame), and the
meshes add 38 kB. The model GLB (532,836 bytes, 41a16640291a) and the bear GLB (1,434,224
bytes, 5eecaa19adb9) do not change. The gallery GLB is 239,564 bytes.

The rest clip was tuned with a probe that runs the contact stage of the build
(`build.stage_contacts`, with the fold repair) on the stored meshes of each seed, for chosen
clips and chosen values of the clip constants: 10 to 55 s for 7 seeds in parallel, in place of
about 3 min for a seed pool. The probe scripts are in the scratch folder of the round only. Each
variant and its result:

| Variant | Seeds that pass rest (of 7) |
|---|---|
| knee rest of main, the new clips | 3 (1, 2, 4) |
| out 2.0, forward 1.0 | 2 |
| out 1.9, forward 1.3, lean 1.2 | 5 (seeds 5 and 8 fold) |
| out 1.9, forward 1.3, lean 1.8 | 5 |
| out 1.9, forward 1.6, lean 1.5 | 1 (the paws go 1.1 to 1.5 cm into the key bed) |
| out 2.1, forward 1.3, lean 1.5 | 6 (seed 8 folds 2 faces at the left shoulder) |
| the same, lift (0.03, 0.09, -0.02) | 6 |
| the same, the elbows out and back in the first half (pole timing 0.5, pole back 0.4) | 7 |

## Decisions

- The seat. A cut of the trunk by the seat plane (the body flattens on the seat) changed the
  field of every seed: with a blend of 2 cm, 6 of 8 seeds passed the remesh gate (main: 7), with
  4 cm only 3. The pad that fits the body keeps the field and the meshes of main.
- The keys. Only the pressed keys are nodes (10 nodes, not 49). A morph per key would make the
  key animation about 30 kB in place of 127 kB, but the keys would no longer be nodes by name.
- The claw tip is the strike point. It slides about 0.8 cm along its key while the digit curls
  down, so the target of a digit is its key, at the depth of the key, on the front part of the
  key.
- The chord rises 12 cm (was 20) with the fingers tilted down: a rise of 20 cm bent the left
  wrist past 90 degrees and folded its skin on seed 2.

## Times

From `date`: start 08:14:55. Baseline regressions on 1274c780 at 08:20 (bear 18 s, polar bear
17 s). Move onto main c0f1b861 at 08:40, regressions of main 16 s each. First build with prop
nodes 08:43 (123 s). Digits and new clips on seed 1 at 08:53. Gallery at 08:56 (8 s). Seed pools
with the cut seat at 09:00 and 09:17 (both dropped). Seed pool with the fitted pad at 09:26 (166
s). Rest tuning with the probe 09:29 to 09:34. Final build 09:35 to 09:37 (94 s: seed pool 81 s,
shots 8.6 s). Golden at 09:40. Viewer switch at 09:42. Final regressions 09:42 to 09:45.

## Regressions

Final runs on 76d36c32, each PASS with every group identical:

| Command | Wall time | GLB | Model GLB |
|---|---|---|---|
| `regress bear` | 47 s | identical (5eecaa19adb9, 1,434,224 bytes) | identical (785130e1b18c) |
| `regress polar-bear` | 54 s | identical (cc2e3a7a1852, 1,105,972 bytes) | identical (41a16640291a) |
| `regress polar-bear --no-cache` | 73 s | identical | identical |

The bear passed `regress bear` with an identical GLB after each group of studio changes (08:44
found one difference: an exporter option that kept constant node channels, removed at once).
`pnpm -s lint`, `pnpm -s typecheck`, and `pnpm -s format:check` pass in the worktree root.

## Last finished step

All four items, the outputs, the golden, and the README are committed.

## Next step

No item of this round is open. Two options:

1. A violin or a cello role (about 1 to 2 h): the props exist and are sized from the body. A
   violin needs an attachment to the chest or the head (no such attachment yet), and the bow a
   bow arm on the strings. The cello can stand between the knees as a scene prop.
2. Smaller key animation (about 30 min): a morph per pressed key on one keys mesh, or sparse
   keys in the exporter, would cut the 127 kB of key animation to about 30 kB.

## Open problems

- The skill `lowpoly-animal-studio` (`references/roles.md`: the props table, the walkthrough of
  the pianist, the open limits) describes the props as bones and one finger bone. I did not edit
  the skill. Update it from the README.
- The claw tips slide about 0.8 cm along their keys while they press (the digits point 45
  degrees down). A hand that points the digits more forward would press straight down.
- The clips play white keys only, and no clip generator reads a MIDI score.
- The bench of the polar bear is 8.5 cm high (short legs): its apron and legs are small.
- The violin model is the model of the app: its tailpiece and chin rest read as small black
  boxes at the low end.
