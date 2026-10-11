# Decisions of the body proportions

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the report [`2026-10-07-proportions.md`](../research/2026-10-07-proportions.md)
measured the model sheets `fox-views.png`, `rabbit-views.png`, `dog-views.png`, and
`polar-bear-views.png` against our skeleton, and gave three options. The user chose option A. The
agent of stage P0 (the seam) decided the other rows below, the agent of stage P1 the rows of
the foxes, and the agent of stage P2 the rows of the dog family. The images of stage P1 (`fox-views.png` beside the red fox before and after, and the
second violins of the default view) are in
[`2026-10-07-proportions-p1/`](../research/2026-10-07-proportions-p1/). The agent of stage P3
decided the rows of the polar bear, the bear, and the panda, and its note and images are in
[`2026-10-08-bears.md`](../research/2026-10-08-bears.md). The agent of stage P4a decided the
rows of the hippo, and its note and images are in
[`2026-10-08-cat-hippo.md`](../research/2026-10-08-cat-hippo.md). The user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Stage P0 moves no bone. Each species gets the table `BodyProportions` (`models/proportions.ts`) in `SpeciesParams.proportions`, and `proportionsOf()` fills each missing value with the constant of before. The frame of the body holds the table, and the trunk, the arms, and the legs read it | 4.3, 4.4 |
| The head height `H` of the table is in meters, as the report asks. Its default stays `0.38 m × size`. A species that gives its own `H` keeps it for each size, so a test that changes the size of such a species also changes the table | 4.3 |
| The table also holds the standing base (0.77 H), because the bear conductor of stage P3 stands taller in the references | 4.3 |
| The map adds moves of 0 for the default skeleton, so each height of the default skeleton stays exact to the bit. A probe of each species with each instrument and support, and of 1,200 body variants, gave byte-identical meshes, skeletons, and body points after each commit | 4.3 |
| The chest of a subject of the shots is the `chest` bone of the bind pose. The point 1 H below the head center of before is in the neck of a long torso | 5.6 |
| A wide variant from the side (the zoom 1.1) arcs and does not push in. Its push-in to the zoom 1.01 put a stage corner of K. 525 out of a view of the aspect 1.6 when the fox skeleton changed the seeded plan | 5.6 |
| The test of the high shots counts the shots of the seeds 1, 2, and 3 of each demo (more than 15). One seed gave 5 to 8 high shots, and the rabbit skeleton moved the count of the test seed from 8 to 5 | 9.3 |
| The hippo keeps the high stool (decision D4 of the anatomy plan). The scenes show it standing, but a standing hippo failed 12 of 2,180 tests: the head touched the neck of the contrabass, the bow went 0.013 m into the right forearm, the rest bow went into the hips, and the bow hand turned faster than 1,000° a second in the lift. The layout pins passed | 4.3, 4.6 |
