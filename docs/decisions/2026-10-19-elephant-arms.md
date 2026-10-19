# Decisions of the elephant arms

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the arms for hippo and elephant seem twisted and deformed", with a
screenshot of the app from the right side of the stage. The round `arms-elephant` fixed the arms of
the elephant timpanist, and another round fixed the hippo. The report
[`2026-10-19-elephant-arms.md`](../research/2026-10-19-elephant-arms.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the arms for hippo and elephant seem twisted and deformed". The elephant gets a new mallet grip, the arm cut, a ring, a rigid face, and four new corrective shapes, so that its arms stay round in the play, the lift, and the rest. | 4.4, 5.3 |
| Each timpani mallet turns around its own axis so that the top of the grip points toward the shoulder joint (`PercussionHold.top`). With the top up, each paw turned 168° to 173° on its forearm, almost all of it as a twist, and the twist bone took half. | 5.3 |
| The other percussion holds keep the top up, so no other player moves. | 5.3 |
| Each timpani mallet points from 0.4 H in front of its shoulder, in place of 0.3 H (`home`). With the new grip, the lift over the kettle beside the player put the left paw 4.7 cm into the body. | 5.3 |
| Both armpits take the arm cut below 0.64 source units (`cut` of `tools/mesh-rigs/elephant.json`). At 0.6 and 0.62, the rest and the lift kept their folds, and at 0.55 the cut failed. | 4.4 |
| A ring at the left elbow (`refine.rings`). Three thin faces take the mean of their weights (`weights.rigid`): the outer left elbow, a sliver of the left paw, and its neighbor at the wrist. | 4.4 |
| Four new shapes replace the shapes of the old grip: the right and the left arm at a strike, the bent left wrist, and the bent left elbow of the waiting arm (`raise`). The waiting elbow folds in at most 0.1% of the play, so its shape stays. | 4.4 |
| The elbow poles stay out and back. A lower elbow turns the paws further on the forearms, and a higher elbow turns the upper arms further (report, "Hold"). | 5.3 |
| The sweep of the timpanist counts 5 open loops: the cut leaves a loop of 3 edges and 19 cm at the front of the right armpit (`ELEPHANT_BODY_LOOPS`). | 9.3 |
| Open: face 235 of the right armpit folds in 9.7% of the lift. In the gallery, the raised right arm casts a shadow on the chest that is darker than the base (report, section 5). | 4.4, 9.3 |
