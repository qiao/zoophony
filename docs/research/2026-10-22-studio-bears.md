# The smooth studio bears

Date 2026-10-22. Round `studio-bears`, start `d7f4e76e`. Decisions:
[`2026-10-22-studio-bears.md`](../decisions/2026-10-22-studio-bears.md). The probes, the scripts,
the logs (`logs/`), and the images are in [`2026-10-22-studio-bears/`](2026-10-22-studio-bears/).
Each command runs from the root of the tree. The probes `color-gaps.ts`, `normals-same.ts`, and
`tris.ts` run from `scratch/`.

## 1. The question

The user said: "for bear and polar bear, i want you to revert to previous studio-generated bears,
but add more triangle to them to make them more smooth", and then: "do not exceed 3000 meshes".
The goal: both studio bears back, smooth and round from the stage, with at most 3,000 faces in
each GLB, sharp face features, and the gates of the brief. The old studio polar bear also read as
almost standing at the piano.

## 2. The measures

Three levers make a body smooth within 3,000 faces:

- An even spread of the facets in the studio: no warp of the belly and the soles, no squeeze of
  the trunk, and no jitter (`animal.toml` of each bear). The large belly facets of the low-poly
  look go.
- The crease angle of the smooth normals (`crease` of `ANIMALS`). `crease.sh` renders 15°, 60°,
  and 70° (`stage-bear-crease.webp`). The manager preview gave 15°, 45°, and 70°.
- The color blend of the fur (`studioCornerColors()`). Each face of a studio body has one color
  with the baked occlusion, so a smooth normal still shows a facet of color.
  `color-gaps.ts` measures the steps between neighbor fur faces of the bear: p50 0, p90 0.024,
  p95 0.055, p99 0.18 in each sRGB channel. The muzzle edge is 0.3 or more. `blend.sh` renders
  the blends 0, 0.06, and 0.12 (`bear-blend-front.webp`).

| Measure | `d7f4e76e` (mesh bears) | Round |
|---|---|---|
| Bear GLB faces (fur + gloss) | 2,768 studio before the meshes | 1,744 + 1,080 = 2,824 |
| Bear app triangles (`tris.ts`) | | 2,448 |
| Polar bear GLB faces | 2,608 studio before the meshes | 1,624 + 1,080 = 2,704 |
| Polar bear app triangles | 3,267 | 2,328 |
| Crease angle, color blend | 15°, none | 70°, 0.12 |
| Bear seed, polar bear seed | | 2, 3 |
| Conductor folds play / lift (`fold-conductor.txt`) | 2.7% / 7.5% | 0.8% / 2.2% (seed 2, hold at 0.93) |
| Pianist folds rest / play / lift (`fold-pianist.txt`) | 100% / 28.1% / 73.4% | 0% / 33.9% / 60.5% |
| Pianist note targets within 5 mm, worst (`targets-pianist.txt`) | 3,924 of 3,931, 10.4 mm | 100%, 3.8 mm |
| Arm gate of all roles (`arm-check-all.txt`) | | FAIL only in the conductor and the pianist |

The `FAIL` cells of the conductor and the pianist come from the margin against the mesh bears of
the base. Each value is below its limit: the conductor forearm twist 33 (limit 80), the paw swing
44 (70), the move twist 60 to 79 (176), the move turn 2,597°/s (3,000), the pianist stretch 0.19
to 0.21 (0.35), and the move twist 53 to 56 (176). `pnpm body-probe --base d7f4e76e` changes the
10 bodies of the two bears, their two players, and 600 of 1,492 pose sets of the demos with a
conductor or a piano (`body-probe.txt`).

The seeds of the bear (`pnpm arm-check conductor --glb`): the arm skin of seed 5 stretched 0.49
and of seed 6 0.42 in the play (limit 0.35), and of seed 2 0.15 (`arm-check-seed*.txt`).

The baton hold of the studio bear (`arm-check-hold-*.txt`, `pose-depth-conductor-out.txt`):

| Hold | Right paw move turn | Claws into the muzzle |
|---|---|---|
| Mesh hold in `H` | 3,735°/s FAIL | |
| Mesh hold at 0.93 of its meters | 1,935°/s | 7.0 cm (limit 4.5) |
| The same, tip 0.3 H out (round) | 2,597°/s | 1.2 cm |

The seat of the polar bear. A knee 0.047 or 0.022 units lower in the field, for a longer thigh,
failed the remesh or the contact gate on most seeds and looked the same
(`polar-thigh-variants.webp`). The pianist role with the hips and the knees bent 88° (70° before)
gives near level thighs and upright shins (`polar-level-thighs.webp`, `polar-views.webp`).
The keys of the studio piano then stand at 0.4176 units, so the landmark of the keys moves from
the key top plus 0.13 m to plus 0.0539 m, and the bear keeps 1.805 m for each unit.

## 3. The result

Both bears are the studio bodies with even facets, the crease angle 70°, and the blend 0.12. From
the stage (`stage-pair-default.webp`, `play-30.webp`, `play-75.webp`), the fur shows no facet, and
the polar bear sits with bent knees. The muzzle, the brows, the eyes, the nose, and the claws stay
sharp (`bear-head.webp`, `polar-head.webp`). The dark patches on the chest of the bear at beat 1
are cast shadows of the raised paws: with `--probe noshadow`, they go (`bear-noshadow.webp`).

Open items:

- The left upper arm of the bear goes 2.4 cm into the body in Mozart K. 315 at 125.15 s (limit
  1.5 cm, 2.3% of the samples). Seed 3 gave 0 cm. A left elbow further out changed nothing
  (`pose-depth-conductor-pole.txt`).
- The upper arms of the polar bear go up to 7.2 cm into the belly in a play and 7.5 cm in the
  lowering (accepted 4 cm for the studio polar bear of 2026-10-13). Elbows at (±1, -0.3, 0.3)
  give 5.8 cm and 6.0 cm (`pose-depth-pianist-poles.txt`).
- The thighs of the polar bear stay short, so its lap is small.
- The head crops of the bear show a few facets on the cheeks and the brow. A wider smile of the
  studio changed little (`bear-smile-variant.webp`).
