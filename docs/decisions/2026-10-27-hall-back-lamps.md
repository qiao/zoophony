# Decisions of the lamps behind the stage

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the user sent an image of the default view, where the low lamps of the hall stopped
at the sides and the wall behind the orchestra stayed dark, and said: "add lights to the back of
the stage as well". The manager made the change on `main`. The user can reverse each decision.
Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "add lights to the back of the stage as well". The low lamps of the hall go all around the wall, also behind the stage (`HALL.wallLamps` of `src/scene/hall.ts`). The gap of 60° around the back (40° before) goes, with its rows in `2026-10-07-scene-details.md` and `2026-10-07-scene-latest.md`: lamps there stood above the orchestra and near the title of the first screen. | 4.5 |
