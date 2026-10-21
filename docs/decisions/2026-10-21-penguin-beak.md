# Decisions of the beak of the penguin

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "make the penguins able to open the beak". The agent of the round
`penguin-beak` chose the rows with no quote of the user, and asked no question. The report
[`2026-10-21-penguin-beak.md`](../research/2026-10-21-penguin-beak.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the beak of each choir penguin opens with each note on a jaw bone of its studio body. This replaces the closed beak and the row "no jaw bone" of `2026-10-21-mesh-penguin.md`. | 4.4, 4.7, 5.3 |
| A copy of the mesh splits the beak along the level plane at the height of its tip, and closes each part with a cap of `#4d2312`, the mouth color of the egg penguin (`beak_split.py`, `penguin-beak.glb`). The file of the user stays. | 4.4, 4.5 |
| The edit runs in a headless Blender from a script, so that it gives the same file again. | 4.4 |
| The jaw is an optional bone after the other studio bones, at the middle of the corners of the mouth, so each other body keeps its bone indices (`OPTIONAL_STUDIO_BONES`, `weights.jaw`). | 4.7 |
| The jaw keeps 50° at a gesture size of 1, as the singing penguins of `orchestra-side.png`, which open about 60° to 75° (`CHOIR_MOTION.jaw`). | 5.3 |
| The head lift at the full opening goes from 22° to 15°, its earlier value, because the open beak is now the main cue (`CHOIR_MOTION.headLift`). | 5.3 |
