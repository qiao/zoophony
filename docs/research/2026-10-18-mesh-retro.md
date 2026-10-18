# The retro of the panda mesh round

Date 2026-10-18. Round `mesh-retro`. Decisions:
[`2026-10-18-mesh-retro.md`](../decisions/2026-10-18-mesh-retro.md). The probes and their outputs
are in [`2026-10-18-mesh-retro/`](2026-10-18-mesh-retro/). Each command runs from the root of the
tree.

## 1. The question

The panda round (`2026-10-18-mesh-panda.md`) took about 95 minutes in phase 1 and 210 minutes in
phase 2. Four more meshes of the user are expected, and three of them play a wind instrument. The
manager chose three items of the retro: the early checks of a new body (item 1), the probes of the
real body in phase 1 (item 4), and a saved tool of the mid-report (item 6). The measures that
decide are the time of each step that a tool replaces, and the numbers of the panda round that the
tools give again.

## 2. The measures

`prepanda.sh` builds the tree of `7a83caac`, before the panda had a studio body, with the tools of
this round, the rig config of a commit, and the GLB files of `f65da87a`. Thus `ANIMALS` has no
panda, and the species panda has the parametric body.

**Item 4.** `pnpm hold-reach --instrument` takes each wind instrument, and prints the slide reach
of a trombone. `--glb` takes a species with no studio body when its rig config exists. On the tree
with the config of `f65da87a`, one command gives the slide reach of the real body with the trombone
hold of `main` (`hold-reach-prepanda.txt`):

```bash
node tools/hold-reach.ts panda --instrument trombone --glb assets/models/panda/panda.rig.glb
```

| Measure | Parametric panda | Panda mesh (`--glb`) | Panda round |
|---|---|---|---|
| Arm, shoulder joint to the middle of the palm | 0.652 m | 0.578 m | 0.578 m |
| Right shoulder joint to the grip of the first position | 0.483 m | 0.588 m | 0.588 m |
| `slideReach` with the hold of `main` | 0.170 m | 0.000 m | 0.17 m and 0 |
| Run time of the probe | 0.30 s | 0.62 s | no probe in phase 1 |

**Item 6.** `pnpm mesh-options` ran on the tree with the first config of phase 1 (`49b32148`), as
`sizes.ts` of the panda round read it (`mesh-options-phase1.log`, `options-phase1.md`,
`options-phase1.webp`):

```bash
node tools/mesh-options.ts panda <dir> --size main=1.3 --size bear=1.483 --size fox=1.57 \
  --legs 1,2,1.5 --arms 1.497,1.704,1.987,2.753 --instrument trombone
```

| Variant | Mid-report: head top, H, seat | `pnpm mesh-options` |
|---|---|---|
| Parametric panda | 1.300, 0.456, 0.342 m | 1.300, 0.456, 0.342 m |
| main, legs 1 | 1.300, 0.410, 0.103 m | 1.300, 0.410, 0.103 m |
| bear, legs 1 | 1.483, 0.468, 0.117 m | 1.483, 0.468, 0.117 m |
| fox, legs 1 | 1.570, 0.496, 0.124 m | 1.570, 0.496, 0.124 m |
| main, legs 1.5 | 1.300, 0.391, 0.149 m | 1.300, 0.391, 0.149 m |
| bear, legs 1.5 | 1.483, 0.446, 0.170 m | 1.483, 0.446, 0.170 m |
| fox, legs 1.5 | 1.570, 0.472, 0.180 m | 1.570, 0.472, 0.180 m |
| fox, legs 2: seat, chair | 0.221 m, 0.28 m | 0.221 m, 0.285 m |

The shoulder joints (0.8029 m to 0.9987 m) and the ear tips (1.318 m to 1.592 m) agree with
`sizes.txt` to its last digit, and the chair depths agree with `check-variants.log` within 1 mm. The scale differs
by 0.0015%, because the tool reads the skull top as 0.98601 u in place of 0.986.

| Arm factor at fox, legs 1.5 | Reach, arm/trunk (mid-report) | Reach, arm/trunk (tool) | `slideReach`, hold of `main` |
|---|---|---|---|
| 1 | 0.403 m, 0.63 | 0.403 m, 0.63 | 0.000 m |
| 1.497 | 0.578 m, 0.91 | 0.578 m, 0.91 | 0.000 m |
| 1.704 | 0.651 m | 0.651 m, 1.02 | 0.050 m |
| 1.987 | 0.750 m, half the slide | 0.750 m, 1.18 | 0.165 m |
| 2.753 | 1.020 m, the whole slide | 1.020 m, 1.61 | 0.450 m |

On the tree of this round, the same tool gives the final slide reach of 0.155 m at the arm factor
1.497 with the hold of the panda (`options-main.md`).

**Times.**

| Step | Panda round | This round |
|---|---|---|
| Sizes script and mid-report image of phase 1 | about 20 min (dog and panda) | 95 s for 13 rigs, about 7 s each |
| Slide reach of the real body | none in phase 1, an estimate of about 0.09 m | 0.62 s for each rig |
| Shot test after the body commit | found at the end of phase 2 | 11 s (`pnpm test:paused src/shots/`) |
| Body probe after the body commit | found at the end of phase 2 | 17 s (`pnpm body-probe`) |

## 3. The result

The three items work on the state before the panda. One command of 95 s gives each number of the
mid-report of the panda within 1 mm, with the image, in place of about 20 minutes of scripts and
hand work. It also gives the slide reach of the real body for each arm factor, which phase 1 had
to estimate. The geometry of the parametric panda had put half of the slide travel at the arm
factor 1.987. The real body reaches 0.165 m there with the hold of `main`, because the big head
puts the mouth 0.40 m in front of the shoulder joints. With this table, the user can choose the
arms with the reach that the hold of `main` gives, and the round knows before phase 2 that the
hold must turn. The early checks cost about 28 s on one tree after the commit of the body. The gain in time of a
whole round shows only in the next mesh round.

The probes of a role (`pnpm hold-fit`, `pnpm pose-depth`, and `pnpm fold-probe`) still need the
role in `FOLD_ROLES` and `SWEEP_ROLES`, which a new role does not have in phase 1.
