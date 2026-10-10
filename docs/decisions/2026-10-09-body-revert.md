# Decisions of the revert of the animal bodies

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-09, the user asked to revert the models of the animals to their state of 2026-10-06
18:58, when `main` was at `d5869c21`. The user then gave the four decisions of the first four
rows. The agent of the body revert decided the other rows. The report
[`2026-10-09-body-revert.md`](../research/2026-10-09-body-revert.md) gives the method and the
images. The user can reverse each decision. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The user: the revert restores the parametric bodies, the skeletons, and the species colors of 2026-10-06 18:58. The 9 sculpts from Blender and the rigged red fox go out of the app. The crease normals and the baked occlusion of 19:49 to 20:22 on 2026-10-06 stay. The soft edge of the fur does not come back, because it never reached a pixel | 4.3, 4.4, 4.5 |
| The user: the polar bear stays a parametric species, and it stays the pianist | 4.3 |
| The user: the Blender tools stay (`tools/blender/`, `tools/build-sculpt.ts`, `tools/sculpt-rig.ts`, `tools/pack-rigged.ts`, `tools/spike/`, `pnpm sculpt`, and `pnpm pack-rigged`). The packed bodies and the app code that reads them go. The app reads no output of these tools | 4.4, 7.1 |
| The user: the newer pose features stay, for example the left hand of the conductor, the bow stick in the fingers, the rest clearance, the lap rests, and the seated feet on the floor. Their values change to fit the old bodies, so that the tests of the behavior stay green | 5 |
| The packed formats of a sculpt and of a rigged body move into `tools/sculpt-format.ts` and `tools/rigged-format.ts`. A module that a tool writes takes its type from there, and the tool makes the folder of the modules when it is not there | 4.4 |
| `pnpm sculpt --all` leaves out the recipe `fox_red.py` by name, because it gives only measures to the tan fox. This row replaces the row of the sculpt module of the red fox of `2026-10-08-fox-b-app.md` | 4.4 |
| The red fox has the default skeleton of the table (4.3). The option A row of the foxes went with their Blender bodies | 4.3 |
