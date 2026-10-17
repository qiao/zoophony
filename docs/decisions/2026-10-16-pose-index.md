# Decisions of the round pose-index

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-16, the user asked: "should the poses be documented?" The manager answered that the
poses are in many places, and asked for one pose index at the top of design 5. The agent of the
branch `pose-index` decided the other rows. The user can reverse each decision. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: "should the poses be documented?" The manager answered that the poses are in many places. The play holds are in 5.3 and in the code, and the rest poses are in 5.2. The real-player sources are in about 15 decision files and research reports. Design 5 now starts with a pose index: a short intro and one table with one row for each role | 5 |
| A role is an instrument with the species of its section, or a species with a hold of its own (`SPECIES_HOLDS` of `pose/bowed-rig.ts`, `SPECIES_WIND_HOLDS` of `pose/winds.ts`). The cast has 23 roles: the 23 pairs of the species page of the gallery (`speciesItems()` of `gallery/items.ts`). No hold serves two species now, so the table has 23 rows | 5 |
| The percussion has one row for each hold of `PERCUSSION_HOLDS`, because each instrument has its own rule for the hands and its own elbows. With 23 rows, the table stays in the limit of about 25 rows of the manager | 5 |
| A soloist who stands shares the row of its seated role. Its support cell says "stands as a soloist", and its rest cell gives the standing rest when it differs | 5 |
| `BOWED_HOLDS.violin` and `WIND_HOLDS.flute` get no row, because no player of the cast uses them: the rabbit, the red fox, and the tan fox have holds of their own. One sentence under the table names them | 5 |
| A source cell gives the real player of the pose and the file that holds the source: a decision file, or a research report when no decision row names the source. The word "none" marks a role with no real player in the repository. The round read the decision files and the research reports, and searched no web page (manager brief) | 5 |
| 19 of the 23 roles have no real-player source: the conductor, the harp, the viola, the cello, the contrabass, the oboe, the clarinet, the bassoon, the horn, the trumpet, the trombone, the tuba, the timpani, the five percussion instruments of the badger, and the choir. The seated posture of 5.2 has sources for each seated role, and the source cells do not repeat them | 5 |
| The source of the rest of the rabbit and the red fox is the image of a seated violinist that the user gave on 2026-10-16 ([`2026-10-16-bow-rest.md`](2026-10-16-bow-rest.md)), with the violin upright on the left thigh and the bow upright at the right side. It replaces the cat violas of `2026-10-16-seat-rest.md` | 5 |
| A docs cell names the newest decision file whose rows change the pose of the role in 5.2 to 5.4. The round found the rows with a grep by the instrument and the species, and read each match. A row that only measures a pose or names a test does not count | 5 |
| A view cell gives `pnpm close-views <role> <dir>` for the five roles of `ROLE_VIEWS` of `tools/close-views.ts`, and the mode `species` for the other species. The mode `species` shows the first instrument of the badger, the bass drum. Thus the four other percussion instruments get a query of the gallery page with `only=<instrument>` and `body` (7.1) | 5, 7.1 |
| The intro states the rule: each new role and each new hold adds its row in the same commit. `AGENTS.md` gives the same rule in step 3 of route 3, where a new role adds its entry to `SWEEP_ROLES` | 5 |
| A pointer at the start of 5.3 names the index. 5.2 gets no pointer, because 5.3 holds the hold of each role, and 5.2 gives the rules that most roles share | 5 |
