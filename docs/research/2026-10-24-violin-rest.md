# The violin rest of the rabbit and the cat

Date 2026-10-24. The user said: "the cat and the rabbit are not holding the violin right when in
rest mode" and "the violinists like rabbit and cat should use similar poses and motion as the fox".
The decisions are in [`2026-10-24-violin-rest.md`](../decisions/2026-10-24-violin-rest.md). The
probes and the images are in [`2026-10-24-violin-rest/`](2026-10-24-violin-rest/).

## The faults

The rabbit violin stood on the round belly, so the scroll came up to the chin, and the left paw
held the neck at the mouth. It went 4.8 cm into the belly. The cat viola stood beside the hip, and
went 7.4 cm into the belly. The red fox holds its violin upright on the knee, with the left arm
hanging to the neck (`violinist-views.webp` and `violist-views.webp`, the commit before in the top half).

## The rest place

`hold-fit --scan` measured places near the knee (`rabbit-top-scan.txt`, `cat-place-scan.txt`).
A place outside the knee misses the skin, and the lap rule then takes the height of the knee
joint, so the violin hangs beside the shin. The rabbit violin stands on the top of the knee, and
the cat viola on the front of the knee.

## The lift

From the knee, a direct turn to the play crossed one of two faults on the rabbit. With the top
plate to the front, as on the fox, the paw twist on the forearm passed 180°, the twist bone of
the forearm jumped by 180°, and the forearm showed a flat band (`rabbit-crossing.webp`, the
fox top in the bottom row). With the top turned back, the wrist bent past 90° in the middle of
the lift, and the paw turn rule jumped. No elbow pole and no move of the via removed either
fault. The fox has the first fault on `main` (`OPEN`, 17,985°/s).

A new field `liftTurn` gives the turn of the instrument in the middle of the move. With the
violin upright in front of the chest, the twist goes through 0° and not through 180°, as on the
fox, the arms bend, and the instrument stays near the chest. The turn to the playing place
(`turnToPlay()`) now goes through that turn: its short turn jumped in a lowering. The rabbit bow
also turns with the hair to the back (`turn-scan.txt`).

## The result

`arm-check.txt` gives the gate against the commit before. The cat: 7 folds of the left arm
(12 before), the flat share 0.51 (0.43), the move turn 973°/s (1,034°/s), and the rest paw swing
98° (87°). The viola goes 2.6 cm into the belly in the moves (7.7 cm). The rabbit: each value is
in its limit except the right stretch of 0.37, as before. The left paw swing is 68° (45°), and
the move turns are 1,256°/s and 1,274°/s (147°/s and 167°/s), because the path from the knee is
longer. The violin goes 1.9 cm into the body in the moves (4.7 cm). The poses of the other
species do not change (`pnpm body-probe --base main`). `rabbit-hold.webp` and `cat-hold.webp`
show the paws on the instruments at rest, at the frog, and at the tip.
