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
| The user: "the arms for hippo and elephant seem twisted and deformed". The elephant gets a new mallet grip, the arm cut, and a ring, so that its arms stay round in the play, the lift, and the rest. | 4.4, 5.3 |
| The other percussion holds keep the top up, so no other player moves. | 5.3 |
| Both armpits take the arm cut below 0.64 source units (`cut` of `tools/mesh-rigs/elephant.json`). At 0.6 and 0.62, the rest and the lift kept their folds, and at 0.55 the cut failed. | 4.4 |
| A ring at the left elbow (`refine.rings`). | 4.4 |
| The sweep of the timpanist counts 5 open loops: the cut leaves a loop of 3 edges and 19 cm at the front of the right armpit (`ELEPHANT_BODY_LOOPS`). | 9.3 |
