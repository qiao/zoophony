# Decisions of the second revert of the animal bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-11, the user asked to "revert all models back to the program generated version on
10-06", and then gave the decisions of the first three rows. The agent of the revert decided the
other rows. The report [`2026-10-11-body-revert.md`](../research/2026-10-11-body-revert.md) gives
the method and the probe result. The user can reverse each decision. Then update the section
that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: each species has the parametric body of 2026-10-06 18:58 again, with its default skeleton and its colors of that day, as after the revert of 2026-10-09. This covers the rabbit and the bear, which had rigged bodies from GLB files, and the two foxes, which had a body built in code after `fox-views.png`. The base of the bodies is `561be141`, the last commit before the fox body | 4.3, 4.4, 4.5 |
| The user: the app loses the body code that no species uses: the fox body, the rigged bodies, and their skins. The tools stay, so that a later body can come back: the GLB files of `assets/models/`, `pnpm glb-init`, `pnpm rig-body`, the scripts of Blender, `pnpm sheet-check`, `pnpm pose-probe`, the sheet mattes, and the sheet pages of the views page | 4.4, 7.1 |
| The user: the newer props and pose features stay, for example the podium of `bear-views.png`, the conductor stand out of the podium, the thicker baton with the bent tip, the raised paws and the elbows of the conductor, and the violin hold of the rabbits on the left shoulder. Their values change only where the parametric bodies need it, so that the tests of the behavior stay green | 4.6, 5 |
| The red fox has the colors of 2026-10-06 again. This row replaces the color row of `2026-10-10-fox-body.md` | 4.5 |
| `pnpm body-probe` prints the rest joints and a mesh hash of each species on each support, and the skeleton of each player. Its compare mode proves that each body equals the base. The revert of 2026-10-09 did this check with two scripts outside the repository | 4.4 |
