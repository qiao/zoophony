# Decisions of the size of the red fox and the rabbit

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the user saw the red violin fox in the app and said: "the fox is too small. make it
1.3x the size. also make the rabbit 1.2x the size". The manager of the session and the agent of
the branch `animal-size` decided the other rows. The report
[`2026-10-14-animal-size.md`](../research/2026-10-14-animal-size.md) gives the measures and the
images. The user can reverse each decision. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The user: the red fox is 1.3 times and the rabbit 1.2 times the size of the morning of 2026-10-14. The manager: a linear scale of the whole body, so each length of the fox grows by 1.3 and each length of the rabbit by 1.2. The arm factors stay, so the proportions of the bodies stay. The GLB files of `pnpm rig-mesh` keep their bytes, because they hold the units of the studio, and only the scale of the app changes | 4.4 |
| The red fox: `ANIMALS` puts its standing shoulder joints at 0.969 m (0.7454 m before), so the rig has 1.5504 m for each unit (1.1927 m before). The standing head top is at 1.408 m (1.083 m, the head top of the parametric fox), `H` is 0.323 m (0.249 m), the seat is 0.164 m high (0.126 m), and the chair is 0.326 m deep (0.250 m). Each arm reaches 0.4901 m with the arm factor 1.0782 (`app.reach` of `tools/mesh-rigs/fox.json`, 0.377 m before) | 4.4, 4.5 |
| The rabbit: `ANIMALS` puts its standing shoulder joints at 0.6972 m (0.581 m before, the shoulder joints of the parametric rabbit), so the rig has 1.4678 m for each unit (1.2232 m before). The standing head top is at 1.120 m (0.934 m), `H` is 0.323 m (0.269 m), the seat is 0.123 m high (0.103 m), and the chair is 0.225 m deep (0.195 m). Each arm reaches 0.4523 m with the arm factor 1.445 (`app.reach` 0.4524 m of `tools/mesh-rigs/rabbit.json`, 0.377 m before) | 4.4, 4.5 |
| On their chairs, the head top of a rabbit is 1.064 m above the floor, 0.826 of the 1.288 m of a red fox (0.895 before). Above their seats, the ratio is 0.837 (0.907 before). The violin section of `orchestra-latest.png` gives 0.76 to 0.90. The music stands keep their desk at 1.05 m, now 0.07 m below the eyes of the seated fox (1.124 m) and 0.13 m above the eyes of the seated rabbit (0.925 m) | 4.4, 4.5 |
| The red fox plays a violin of 0.56 of the app size (0.284 m, 0.43 and 0.218 m before), from the rule of a violin shop: `pnpm hold-reach fox-red` gives 0.563 at the new size. The left paw reaches the whole fingerboard, and the bow paw 0.030 to 0.250 m of the hair. The violin is still smaller than the smallest real violin (0.33 m). This row replaces the violin row of [`2026-10-14-mesh-fox.md`](2026-10-14-mesh-fox.md) | 4.6 |
| The meters in the rows of [`2026-10-13-mesh-rabbit.md`](2026-10-13-mesh-rabbit.md) and [`2026-10-14-mesh-fox.md`](2026-10-14-mesh-fox.md), and in their research reports, are at the sizes before this file, unless the row names this file. The units of the rigs, the angles, and the shares stay | 4.4 |
