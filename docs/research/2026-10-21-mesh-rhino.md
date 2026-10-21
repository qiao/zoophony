# The rhino mesh of the user as the standing tubist

Date 2026-10-21. Round `mesh-rhino`. Decisions:
[`2026-10-21-mesh-rhino.md`](../decisions/2026-10-21-mesh-rhino.md). The probes and their outputs
are in [`2026-10-21-mesh-rhino/`](2026-10-21-mesh-rhino/). Each command runs from the root of the
tree, and the base is `a80d80bf`, the commit before the round.

## 1. The question

The user gave a textured mesh of a rhino with no skeleton (`assets/models/rhino/rhino.glb`), and
asked that the rhino stands and keeps a size similar to the parametric rhino. The tuba rhino gets
the mesh by route 3. The measures that decide are the head top against the base, the balance of
the standing body with the tuba, the reach of the grips, the clearance sweep, and the arm gate.

## 2. The measures

**Mesh.** One part of 1,557 vertices and 3,119 triangles (`facts.txt`). The rhino stands upright
on short thick legs, with a round belly, a large head low on a thick neck, a long muzzle with a
large horn, tall ears, and a thin tail (`source-views.webp`, `head-views.webp`, `sections-*.txt`).
Each thick arm joins the side of the trunk from the shoulder down to the paw, with a notch at its
front and its back (`arm-cuts.webp`). `make_config.py` writes the rig config.

**Size.** No reference image shows a rhino, so the skull top between the ears takes the standing
head top of the parametric rhino with the tuba (`landmark-probe.ts`):

| Measure | `main` (parametric) | Round |
|---|---|---|
| Standing head top | 1.462 m | 1.462 m (skull top, 0.0%) |
| Ear tops | 1.461 m | 1.553 m |
| H | 0.513 m | 0.420 m |
| Standing shoulder joints | 0.785 m | 0.893 m |
| Reach, shoulder joint to the middle of the palm | 0.734 m | 0.431 m (arm factor 1) |
| Support | chair | stand |

`landmark-probe.txt` gives `main`, and `landmark-round.txt` the round. `pnpm mesh-options rhino
<dir> --size small=1.418 --size skull=1.462 --size large=1.506 --arms 1,1.25,1.5 --instrument
tuba --species rhino` gave the rigs of 3% below and above the size (`options.md`).

**Free arm and cut.** A plane |x| = 0.19 u takes only the outer half of the arm, and a plane at
0.185 u or nearer joins the arm to the haunch (`arm-free.txt`). The rule `armFree` of
`tools/blender/rig_mesh.py` turns the plane 17° so that it passes through both notches, and
keeps the free arm within 0.085 u of the arm joints and above y 0.24 u: 154 vertices
(`arm-free.webp`). With no cut, the seam faces stretched into dark spikes beside the belly when
the arms moved to the tuba (`lineup0.webp`). The cut below 0.56 u removes 48 and 49 faces and
closes both holes (`check-cut.log`).

**Mouth.** With no gloss nose, the tip of the nose was the tip of the horn, 0.16 m above the lips.
`noseTop` 0.76 u of `ANIMALS` takes the front of the muzzle below the horn, and the mouth lies
0.08 H below it (`tubist-head-views.webp`).

**Tuba.** The mouthpiece is 0.51 m in front of the shoulder joints. With the tuba hold of the base,
each palm missed its grip by 0.27 m (`pnpm hold-reach rhino --instrument tuba --support stand`).
A tilt of the tuba toward the body turned the bell to the audience and over the face
(`hold-steps.webp`). A longer lead pipe moves the tuba back (`SpeciesParams.tubaPipe`,
`hold-reach-scan.txt`, `pose-depth-grip.txt`):

| Lead pipe back, left | Shoulders R, L | Spare L, R in the play | Deepest part |
|---|---|---|---|
| 0, 0 (base) | 0°, 0° | -26.7 cm, -26.7 cm | none in reach |
| 0.3 m, 0 | 20°, 20° | 2.6 cm, 0.4 cm | the bell over the horn |
| 0.25 m, 0.1 m, the lower end 25° right | 30°, 40° | 6.7 cm, 8.4 cm | the left paw 6.4 cm in the tube |
| the same, left grip 0.17 m out (chosen) | 30°, 40° | 8.4 cm, 8.2 cm | the left paw 2.1 cm in the tube |

The lower end turned 35° to the right put the tuba at a steep slant (`hold-roll.webp`).

**Arm gate.** With no twist bone, the left upper arm rolled 63° to 82° for each elbow, rest, and
grip of the scan (`arm-twist.txt`). The twist bone 0.4 gave 35°. `pnpm arm-check tubist --base
a80d80bf` (`arm-check.txt`):

| Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | paw swing p95 | paw jumps | stretch p95 | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| L | 2 | 35 | 27 | 0.72 | 110 | 36 | 0.0% | 0.05 | PASS |
| R | 5 | 27 | 49 | 0.65 | 134 | 42 | 0.0% | 0.07 | PASS |

The 2x crop pairs (`tubist-*-arms.webp`) show no twisted band.

**Sweep.** `pnpm pose-depth tubist --gaps` (`pose-depth.txt`): the left paw goes 2.1 cm into the
tube, the upper arms at most 1.1 cm and the forearms 0.9 cm into the body, and the mouthpiece
2.9 cm into the lips. Each note target is within 5 mm. `fold-probe.txt`: at most 9 faces fold in
a sample. Faces 38 and 2413, thin faces at the shoulders above the cut, and 396 and 727 at the
clavicles fold in each sample.

**Balance.** `balance.ts` takes the volume centroid of the posed body and an assumed tuba of 10 kg
against the support area of the soles, 29.7 cm deep and 63.5 cm wide (`balance.txt`):

| Sample | Front of the middle | Share of the depth from the heels | Inside the edge |
|---|---|---|---|
| rest | 3.1 cm | 60% | 11.4 cm |
| note, median | 2.7 cm | 59% | 11.9 cm |
| note, p5 (most forward) | 3.4 cm | 61% | 11.2 cm |
| note, median, no tuba | 1.3 cm | 54% | 13.3 cm |

**Colors.** `colors_probe.py` (`colors.txt`), Oklab L, hue, and chroma: the skin 0.586, 52°, 0.021
against 0.635, 78°, 0.010 of `SPECIES_COLORS.rhino`, and the belly 0.755, 69°, 0.039 against
0.714, 82°, 0.011. Both are near grays. The eyes are 17 dark faces in the eye box.

**Other bodies.** `body-probe.txt`: each body of the other species is equal. The poses of the
bear conductor in two demos and of the panda in `brahms-2` change, because the tuba of the
standing rhino grows its footprint by 4.5 cm and 20 cm (`check-cut.log`) and the back row moves.
`shots.txt`: the 5 shot tests that fail also fail on the base. `size.txt`: +31,235 B, 767,793 B.

## 3. The result

The mesh stands at the head top of the parametric rhino and keeps its arms and legs. The cut and
the twist bone keep the thick arms clean. The longer lead pipe, the shoulder turns, and the roll
of the tuba bring the grips into reach with 8 cm to spare. The arm gate passes, and the center of
mass lies 2.7 cm in front of the middle of the soles.
