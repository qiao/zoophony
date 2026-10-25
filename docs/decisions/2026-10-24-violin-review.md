# Decisions of the review of the violin poses

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user asked the manager to compare the images of the rabbit violinist and the
cat violist with professional poses and to fix each other fault. The manager listed the faults,
and the agent of the branch decided the rows below. The report
[`2026-10-24-violin-arms.md`](../research/2026-10-24-violin-arms.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The manager: "a dark wedge fold opens under the right armpit" of the cat at the tip. The right elbow points down, out, and forward at the tip (`poleTipR`, up before): the right paw turns 90° on its forearm (116°), and the narrowest arm ring keeps 0.49 of its axis (0.14). | 5.3 |
| The user: "why in the rest mode, the cat's viola's back is facing the audience". The rest viola faces 30° to the left of the front (`rest.top`), 0.15 H in front of the knee, and turns its top plate to the body in the moves (`liftTurn`). The left paw swings 26° at rest (91°). With the top to the front, the right paw turned 7,437°/s in a lowering. | 5.2, 5.3 |
| The manager: in the cat lift, "the bow goes horizontally across the belly". In the middle, the bow points up and forward, and the grip moves 0.45 H out, 0.4 H up, and 0.4 H forward (`restBow.via`). The bow goes 0.0 cm into the viola (1.3 cm) and 0.4 cm into the arms (2.7 cm). | 5.2 |
| The manager: "the instrument sits too low", and "the chin does not touch the chinrest". The rabbit head turns 12° down in the play (`headDrop`), and the violin sits 0.08 H higher (`playShift`). The jaw touches the violin in each probe sample, as on the red fox (a gap of 1.7 cm before). | 5.3 |
| The manager: at the tip, "the bow falls steeply from the strings to the paw". The bow stays in its string plane (`placeBow()`). The roll of the top plate, the plane of the high string, and the violin 64° to the left give 60° on the rabbit and 40° on the red fox. No change. | 5.3 |
| The manager accepted the 2x paw crops of the cat on 2026-10-24. The lower right elbow at the tip rolls the forearm, so the violist entry of `ACCEPTED_GRIPS` takes the new medians (L 147°, R -62°, before 156° and -93°). | 9.3 |
