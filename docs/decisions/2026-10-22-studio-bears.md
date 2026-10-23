# Decisions of the smooth studio bears

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "for bear and polar bear, i want you to revert to previous
studio-generated bears, but add more triangle to them to make them more smooth". The user slept,
so the agent of the round `studio-bears` chose the rows with no quote of the user by the measures
and the user rules. The report [`2026-10-22-studio-bears.md`](../research/2026-10-22-studio-bears.md)
gives the measures and the images. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| The user: "revert to previous studio-generated bears, but add more triangle to them to make them more smooth". The bear conductor and the polar bear pianist get the studio bodies of `lowpoly-studio/` again. The mesh files of the user stay in `assets/models/`. | 4.3, 4.4 |
| The user: "do not exceed 3000 meshes". Each bear GLB keeps at most 3,000 faces (fur and gloss). The smoothness comes from the crease angle, the color blend, and an even spread of the facets. | 4.5 |
| The bear facets spread evenly: no warp of the belly and the soles, no squeeze, no jitter (`animals/bear/animal.toml`). The GLB has 1,744 fur and 1,080 gloss faces (2,824), against 1,688 and 1,080 before. The app body has 2,448 triangles. | 4.5 |
| The bear keeps seed 2. The arm skin of seed 5 stretched 0.49 and of seed 6 0.42 in the arm gate (limit 0.35), seed 2 0.15. | 4.4 |
| The bear fur takes the crease angle 70° (`crease` of `ANIMALS`). At 15°, 45°, 60°, and 70°, 70° shows no facet from the stage and in the close views. | 4.5 |
| The fur colors of the bear blend at each vertex when they differ by at most 0.12 in each sRGB channel (`colorBlend`, `studioCornerColors()`). The muzzle, the brows, and the claws stay sharp. | 4.5 |
| The baton lies along the index finger (`BATON_ALONG`). Its point and pivot keep the direction of the mesh bear hold at 0.93 of its meters, 0.3 H further out (`CONDUCTOR_HOLD`). The hold in `H` turned the right paw 3,735° per second, and with no move out, the claws went 7 cm into the turned muzzle. | 4.6, 5.4 |
| The bow at the song end bends 32° again (`END_BOW`). | 5.4 |
| The accepted grip of the conductor is the median of the new grip: -54° and -5° (`ACCEPTED_GRIPS`). | 9.3 |
| The polar bear facets spread evenly as for the bear, with 960 quads (780 before): 1,624 fur and 1,080 gloss faces (2,704). Seed 3 passes each gate. The app body has 2,328 triangles. | 4.5 |
| The polar bear fur takes the crease angle 70° and the blend 0.12, as the bear. | 4.5 |
| The brief: the studio polar bear read as almost standing. The pianist of the studio binds with the hips and the knees bent 88° (70° before), so the thighs are near level and the shins near upright (`roles/pianist/role.toml`). A lower knee in the field failed the gates on most seeds (report). | 4.4, 5.2 |
| The polar bear keeps its size, 1.805 m for each unit: the landmark of the keys is `PIANO.keyTop + 0.0539` (0.13 before), because the level thighs seat the body lower. `H` is 0.368 m (0.361 m before). | 4.4 |
| The pianist leans 28° (27° before): with 27°, a left paw stayed 10.2 mm short of its key. With 28°, the worst note target is 3.8 mm (`HANDS_HOLDS.piano.lean`). | 5.3 |
| Manager: the gate accepts the values of the studio bears that fail only the margin against the mesh bears of the base: the conductor forearm twist 33° (limit 80°) and move turn 2,597°/s (limit 3,000°/s), and the pianist stretch 0.19 to 0.21 (limit 0.35) and move twist 53° to 56° (limit 176°). The audit crops show no twist. | 9.3 |
