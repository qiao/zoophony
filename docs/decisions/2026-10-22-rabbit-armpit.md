# Decisions of the rabbit armpit dent

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "Note that the rabbit's arm is not yet fixed", then "I mean there's a
dent near the armpit of the rabbit". The agent of the round `rabbit-armpit` decided the rows while
the user slept. The report [`2026-10-22-rabbit-armpit.md`](../research/2026-10-22-rabbit-armpit.md)
gives the measures. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| The user: "I mean there's a dent near the armpit of the rabbit". The rabbit rig reads a copy of the mesh with the trunk notch at the front of the right arm root filled toward the hull of the trunk (`tools/arm-roots/rabbit.json`, `rabbit-4-roots.glb`). | 4.4 |
| The user: "do not worry about triangle budget, you have plenty budget". The round adds no triangle (3,165). The splits of the long edges (6 more) gave no clear change in the crops (p5 against p1), so the rig keeps the faces of the source. | 4.4 |
| The dent is the front notch of the right arm root, with no shoulder ball. Of its depth growth in the play, about 84% comes from the bend of the bind arm and 16% from the twist of the play (`decomp-base.txt`). | 4.4 |
| The round takes the fill (h1) over the push of the front of the root (p5). The fill removes the dark pocket at rest and with the arm down. The push only softens the V crease in the play. | 4.4 |
| Each push of the front of the root on top of the fill made the shapes of the right arm fail (62% folds of the play). The V crease in the play stays open (`TODO.md`). | 4.4 |
| The round reached its time box before step 3, so commit `b1e270f0` of the paused round `rabbit-depth` stays on its branch. It changes the pose of the lift and the lowering, and needs its own gate run and images. | 5 |
