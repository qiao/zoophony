# Decisions of the shorter arms of the mouse and the monkey

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the user said: "the mouse and monkeys' arms are too long". The manager worked
alone on `main`. The rule of the user stays: no arm stretch past what an instrument needs, and a
smaller instrument before longer arms. The user can reverse each decision. Then update its
section, and remove its row.

| Decision | Section |
|---|---|
| The arms of the monkey are 1.2 times the arms of its mesh (`armFactor` of `tools/mesh-rigs/monkey.json`), not 1.5: the reach falls from 0.469 m to 0.384 m. With 1.1, no trumpet down to 0.5 reached the right grip. | 4.4 |
| The monkey plays a trumpet of 0.65 (0.8 before), the bell 15° below the level (10° before), and each shoulder bone turns 34° forward (`reach` of `MONKEY_TRUMPET`), as the shoulder blade of a real player slides forward. The paws reach their grips with about 2 cm to spare. The left fingers curl 130° (109°) around the thin casings. | 5.3 |
| The arms of `mouse-arms.glb` are 1.25 times the arms of the mesh (`factor` of `tools/blender/wind_arms.py`), not 1.4, with the arm joints of the config scaled to them: the reach falls from 0.325 m to 0.293 m. With 1.15, the arms folded 11 and 12 faces at rest for each rest that was tried. | 4.4 |
| The mouse plays an oboe of 0.45 (0.5 before). At rest, the oboe stands 0.45 H below the mouth (0.3 H), and the left elbow points out, a little down, and a little forward. The right fingers curl 110° (80°) around the thinner tube. Both paws grasp the oboe in each set (`pnpm wind-grip oboist`). | 5.3 |
| Gate margins against `main`, each inside its limit: the oboist left flat 0.63 (0.68), left paw twist 143 (122), and the trumpeter move twist max 123 and 134 (116 and 124). | 9.3 |
