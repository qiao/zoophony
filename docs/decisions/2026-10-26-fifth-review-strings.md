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
| The left paw supinates from the rest grip to the playing grip (`mixTwist()`). The playing grip lies near 180° from the bind of the mesh, so the forearm segments unwind in the last 30° before 180° (`skinTwist()`). With a pronation, the instrument turned nearly a full turn. | 4.4, 5.2 |
| The skin passes one twist step of 180° in each move, so the left arm in the moves is worse than on `57849ac5` on the gate, within each limit: lift flat p5 0.72 to 0.76, move turn up to 2,197°/s, move twist up to 151°. The play skin stays. | 5.2, 9.3 |
| In a move, the bow goes to the strings of the instrument on its short path (`instrumentAt()`), and the carried instrument meets it at the play: on the carried strings, the cat right paw twisted 163° (136°). | 5.2 |
| A play elbow nearer to the middle put the play grip on the other side of 180°, but the play skin folded and flattened (flat 0.31 on the cat). A twist zero of the move range twisted the play forearm 107° to 113° (limit 80). | 5.2 |
| The user: "in rest mode the violin / viola are clipping with their hand". The rest grip is the playing grip, turned around the top normal (`restTurnL`), curled (`restCurlL`), and off the neck (`restGapL`). The paws go 0.4 cm to 0.8 cm into the instrument. | 5.2 |
| The cat viola rests 0.12 H further in and 0.03 H back on the knee, held at 0.55 of the fingerboard, with the left elbow (-1.2, -1, 0.1): the left elbow bends to 123° (143°). Further in, the viola went 2.6 cm into the body. | 5.2 |
| The user: "bow hand close to their belly / lap". The bow paws rest low at the front of the lap with straight wrists (`restBow.lap`, `restPoleR`): the rabbit paw 0.33 H out (0.48 H), the cat paw 0.56 H above the hip (1.04 H), the cat elbow at 111° (76°). | 5.2 |
| The round belly keeps each cat elbow 35° to 48° from the vertical: lower elbows went 2.2 cm to 4.1 cm into the belly. The red fox elbow points back, (0.5, -1, -0.2): with (0.4, -1, 0), its upper arm went 3.0 cm into the body. | 5.2 |
| The cat bow via moves the grip 0.45 H out, 0.35 H up, and 0.05 H forward (`restBow.via.reach`): the bow elbow stays bent from 74° to 98°. With 0.4 H forward, it went straight, and with 0.3 H out, the arm went 7.2 cm into the belly. | 5.2 |
| The wrist via is (0.15, 0.15, -0.15) H on the rabbit and (0, 0, -0.1) H on the red fox (`liftReach`): the old vias put the violin 2.8 cm and 2.6 cm into the body near the jaw. | 5.2 |
