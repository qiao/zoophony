# Decisions of the fifth review of the strings

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent four issues of the violin and viola players: bent cat arms, tense bow
arms at rest, a left paw that clips the instrument at rest, and an instrument that turns against
the wrist in the lift and the lowering. The report
[`2026-10-26-fifth-strings.md`](../research/2026-10-26-fifth-strings.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the violin/viola are rotating in the different direction than their player's wrist/arm". The instrument hangs from the paw that the viewer sees and turns with it (`carryLift()`). No fast step turns the two in opposite senses (all on `57849ac5`). | 5.2 |
| In a move, the bow goes to the strings of the instrument on its short path (`instrumentAt()`), and the carried instrument meets it at the play: on the carried strings, the cat right paw twisted 163° (136°). | 5.2 |
| A play elbow nearer to the middle put the play grip on the other side of 180°, but the play skin folded and flattened (flat 0.31 on the cat). A twist zero of the move range twisted the play forearm 107° to 113° (limit 80). | 5.2 |
| The user: "bow hand close to their belly / lap". The bow paws rest low at the front of the lap with straight wrists (`restBow.lap`, `restPoleR`): the rabbit paw 0.33 H out (0.48 H), the cat paw 0.56 H above the hip (1.04 H), the cat elbow at 111° (76°). | 5.2 |
| The round belly keeps each cat elbow 35° to 48° from the vertical: lower elbows went 2.2 cm to 4.1 cm into the belly. The red fox elbow points back, (0.5, -1, -0.2): with (0.4, -1, 0), its upper arm went 3.0 cm into the body. | 5.2 |
| The wrist via is (0.15, 0.15, -0.15) H on the rabbit (`liftReach`): the old via put the violin 2.8 cm into the body near the jaw. | 5.2 |
