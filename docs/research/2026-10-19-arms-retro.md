# Retro of the elephant arm rounds

Date 2026-10-19. Round `retro-arms`, base `395f3f8a`. Decisions:
[`2026-10-19-arms-retro.md`](../decisions/2026-10-19-arms-retro.md). The probes and their outputs
are in [`2026-10-19-arms-retro/`](2026-10-19-arms-retro/). Each command runs from the root of the
tree.

## 1. The question

The elephant arm rounds lost time in four steps: a hand patch of the material for each probe of a
dark area, many drag values for a stage camera at one player, two probe scripts for the paw turns
and the phase of the deepest sample, and a long commands module. The measure is the time of each
new mode against the step that it replaces, with the same values as the old probes.

## 2. The measures

| Step | Before | After | Output |
|---|---|---|---|
| Face colors, normals, and no shadow of the timpanist | 3 runs of 20.9 s (62.7 s), each after a hand patch of `src/scene/player.ts` | 1 run of 56.5 s with `--probe colors,normals,noshadow`, and no patch | `probe-times.txt`, `probe-rows.webp` |
| The elephant from its right side on the stage of `beethoven-9` | 14.2 s for each drag value that the agent tried | 13.2 s for one run with `--at elephant --azimuth 90` | `at-times.txt`, `drag-vs-at.webp` |
| The same from both sides, with the base above | one drag search for each side | 46.9 s for one run with `--azimuth 90 --azimuth -90 --base 395f3f8a` | `at-times.txt`, `at-elephant.webp` |
| Twist and swing of each paw on its forearm | a probe script, then 1.5 s for `twist.ts` | 0 s more: the turn column of the `pnpm hold-fit` row that a round runs | `hold-fit.txt`, `old-probes.txt` |
| Time to the next strike and lift of the deepest sample | a probe script, then 1.2 s for `wait.ts` | 0 s more: each deepest point of `pnpm pose-depth` | `pose-depth.txt`, `old-probes.txt` |
| Words of `docs/agents/commands.md` | 3,066 | 3,009, with each option and the new options | `wc -w` |

**Probes.** `pnpm close-views timpanist <dir> --probe colors,normals,noshadow` renders one grid for
each probe. `probe-rows.webp` shows the first row of the grid with no probe, then of each probe:
the face colors with no light, the normals as colors, and the body with no shadow on it. The
kettles keep their look. One run with three probes builds the site one time, so it takes less than
three runs of the old step, and it needs no patch of the source.

**Camera at one player.** `pnpm close-views play <dir> --demo beethoven-9 --time 60 --at elephant
--azimuth 90 --zoom 0.6 --elevation 20` puts the elephant in the middle of the frame, seen from its
right side (`drag-vs-at.webp`, below the drag `-300,-40,14` of the elephant round). With `--base
395f3f8a`, the commit gets the same camera (`at-elephant.webp`), so the frames compare. At the zoom
1 and the elevation 10°, the hippo and the panda in front of the timpanist hid most of its body, so
the default elevation is 20°.

**Twist and swing.** `pnpm hold-fit timpanist --demo beethoven-1` gives `87°, 64° (40°, 51°) /
87°, 59° (-37°, 47°)`: the upper arm, the paw, and the twist and the swing of the paw, left and
right. These are the values of `twist.ts` of the elephant round on the final rig.

**Phase.** `pnpm pose-depth timpanist --demo beethoven-8-4 --times <254 s to 263.95 s> --bones handL
--into body --set 'timpani.home=0,-0.1,-0.3'` gives the depth of round 1 of the elephant round
(4.7 cm, 7.0% of the samples over 1.5 cm), and the phase of its sample: the next note in 0.16 s,
at a lift of 14.5 cm. `wait.ts` gave a lift of 14.8 cm at 261.84 s and the next strike at 261.96 s.

**Values to keep.** `pnpm body-probe --base 395f3f8a` gives 95 of 95 bodies, 23 of 23 players,
and 1492 of 1492 pose sets equal, and `src/models/studio/` does not change. `pnpm size --base
395f3f8a` gives 45 B more in the first download (`body-size.txt`).

## 3. The result

Each of the four items works. The probe modes and the camera at one player each replace a hand
step with one command, and the turns and the phase come with the runs that a round already makes.
The 45 B come from `MeshNormalMaterial` of three.js in the chunk that the app and the gallery share.
`--at` takes the players of the layout only, so it does not aim at the conductor.
