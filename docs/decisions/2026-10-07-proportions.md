# Decisions of the body proportions

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the report [`2026-10-07-proportions.md`](../research/2026-10-07-proportions.md)
measured the model sheets `fox-views.png`, `rabbit-views.png`, `dog-views.png`, and
`polar-bear-views.png` against our skeleton, and gave three options. The user chose option A. The
agent of stage P0 (the seam) decided the other rows below. The user can reverse each row. Then
update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The skeletons follow the model sheets (option A of the report, the choice of the user): a smaller head in meters (fox × 0.86, rabbit × 0.77, dog × 0.79, polar bear × 0.98), a longer torso in H, and the shoulder joints just under the chin. The height of each body stays near the height of today | 4.3, 4.5 |
| Stage P0 moves no bone. Each species gets the table `BodyProportions` (`models/proportions.ts`) in `SpeciesParams.proportions`, and `proportionsOf()` fills each missing value with the constant of before. The frame of the body holds the table, and the trunk, the arms, and the legs read it | 4.3, 4.4 |
| The head height `H` of the table is in meters, as the report asks. Its default stays `0.38 m × size`. A species that gives its own `H` keeps it for each size, so a test that changes the size of such a species also changes the table | 4.3 |
| The table also holds the standing base (0.77 H), because the bear conductor of stage P3 stands taller in the references | 4.3 |
| The seated knee of each leg group moves from `SEATED_LEGS` of `models/legs.ts` to `SEATED_KNEES` of `models/proportions.ts`. Thus the table module imports no body part, and the frame reads it with no import cycle | 4.3 |
| A height map moves the torso with the table. Below the shoulder joints, each height of the torso (the rings, the `hips`, `spine`, and `chest` bones, the blend bands, and the shoulder band of accent arms) scales with the joints. Above the joints, a height (the top ring and the `neck` bone) keeps its part of the way from the joints to the neck ring. The neck ring and the `head` bone stay 0.5 H below the head center, and the head keeps its form | 4.3, 4.7 |
| The map adds moves of 0 for the default skeleton, so each height of the default skeleton stays exact to the bit. A probe of each species with each instrument and support, and of 1,200 body variants, gave byte-identical meshes, skeletons, and body points after each commit | 4.3 |
| A neck ring that is not above the shoulder joints throws an error. A table with a head center less than 0.5 H above the joints makes no body | 4.3 |
| The torso depth of the table scales the front and the back of the torso rings and of the hem of the penguin. The arms, the legs, and the head keep their depth | 4.3 |
| The test `skeleton-snapshot.test.ts` pins a SHA-256 hash of the skeleton of each species: the bones and the body points of its player with each instrument, on the support of the instrument and on the stand of a soloist, rounded to 1e-9 m. A species stage copies the new hashes of its species from the diff of the failed test | 9.3 |
| The tests that pin a skeleton value (`H`, the head top, the arm segments, the shoulder spread, the standing base, and the hips) read it from the table. The trunk tests of the rabbit still pin the profile of the default torso | 9.3 |
| The rig JSON of the Blender build (`tools/sculpt-rig.ts`) carries the table of the species, so that a recipe can read the heights of the torso | 4.4 |
| Stage P1 gives the red fox and the tan fox the option A row of the report: H 0.327 m, the head center 2.05 H, the shoulder joints 1.47 H high and 0.35 H from the middle, the arms 0.81 and 0.75 H (the meters of before), and the hip joints 0.38 H from the middle. The arms stay longer than the arms of the sheet (0.90 and 0.83 Hv against 0.72 and 0.63 Hv), so that the holds keep their reach | 4.3 |
| The seated knee of the foxes is 0.78 H in front of the hip and 0.12 H above the seat. The report gave 0.90 H, but then the toes were 1.22 H in front of the hip, past the 1.11 H that keeps the music stands clear. 0.78 H is 0.255 m, and the haunch keeps its length in meters of the sheet within its error | 4.3 |
| The tan fox has the skeleton and the measures of the red fox. No model sheet shows the tan fox, so it follows `fox-views.png` | 4.3, 4.4 |
| `canine.py` moves each height of the torso forms (the base, the pear, the yoke, the neck, and the bib) with the map of `torsoHeights()` (`Frame.torso()`). The yoke follows the shoulder spread, and the color zones of the face end at the `neck` bone. The default skeleton keeps each height exactly, so the wolf sculpt keeps its bytes until stage P2 | 4.4 |
| The tail of the red fox goes back through the open chair back and hangs on the right side behind the chair, at most 0.333 m behind the seat center. A brush on the seat as in `fox-views.png` (0.58 m high), or a depth of 0.345 m, moved the harp row of Boulanger, and the flute solos needed cameras above 40°: 48 of 81 close shots were low, below the 60% of N4 | 4.4 |
| The chest of a subject of the shots is the `chest` bone of the bind pose. The point 1 H below the head center of before is in the neck of a long torso | 5.6 |
| A wide variant from the side (the zoom 1.1) arcs and does not push in. Its push-in to the zoom 1.01 put a stage corner of K. 525 out of a view of the aspect 1.6 when the fox skeleton changed the seeded plan | 5.6 |
