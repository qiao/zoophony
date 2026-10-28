# Decisions of the lamps behind the stage

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the user sent an image of the default view, where the low lamps of the hall stopped
at the sides and the wall behind the orchestra stayed dark, and said: "add lights to the back of
the stage as well". The manager put the low lamps all around the wall. Later the same day, the
user said: "actually, remove the first-level stage lights at the back". The manager made both
changes on `main`. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| The user: "actually, remove the first-level stage lights at the back". The first level is the low row of hall lamps (`HALL.wallLamps` of `src/scene/hall.ts`), below the two balcony rails. It keeps its gap of 60° around the back (`backGap`), with the rows of `2026-10-07-scene-details.md` and `2026-10-07-scene-latest.md`. The lamps of the balcony rails stay all around. | 4.5 |
