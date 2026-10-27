# Decisions of the violin and viola lift and the bow rest

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the user said: "the violins / violas are rotated by nearly 360 degress when
transitioning from rest mode to playing mode and vice versa", and "the cat's pose of holding the
bow is unnatural when in rest mode". On 2026-10-26, the user rejected a rest across the lap: the
instruments rest "vertically placed on their lap, with the strings facing the audience", and "their
bow hand should also be resting on or near the lap". The manager worked alone on `main`. The
report [`2026-10-26-violin-lift.md`](../research/2026-10-26-violin-lift.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| No hold turns the instrument through a turn of the middle (the field `liftTurn` is gone). The middle turn of `main` rolled the upright instrument a full turn around its long axis: 252° to 282° of turn, against a short turn of 117° to 140°. | 5.2 |
| At rest, the left paw of the rabbit, the red fox, and the cat holds the neck with a straight wrist and its own twist on the forearm (`restTwistL`). In the lift, its twist and its bend go to the playing grip on a line (`carryLift()`, `mixTwist()` of `pose/bowed.ts`). The playing grip carried to the upright rest needs 227° of forearm turn, more than a real forearm turns. | 5.2 |
| The retarget fades the palm turn of a paw out where the forearm passes behind the palm (`PAW_TURN.back` of `models/studio-rig.ts`, from 150°). There, the angle jumped from π to -π, and the paw turned 140° in one frame. | 4.4 |
| Gate against `main` (`pnpm arm-check`): each value inside its limit. The left move turns fall from 531, 824, and 840 °/s to 240, 236, and 172 °/s, and the cat right twist from 49 to 24. Margins of the red fox: left twist 52 (27, limit 55), right flat 0.78 (0.86), right move twist 149 (145). | 9.3 |
| The left paw of the rabbit and the cat carries the instrument by the nut in the move (`liftPlace` 0, the end of the fingerboard before), the left elbow of the rabbit and the cat points out in the middle, as at rest (`liftPoleL`), and the rabbit violin moves 0.35 H up and 0.2 H to the front (`liftReach`). In the re-grip, the heel of the paw went up to 2.5 cm into the viola and 2.0 cm into the violin. Gate against `main`: each arm passes. | 5.2 |
| In the middle of the move, the bow tip points forward and a little out and up, (0.4, 0.3, -1), and the grip of the rabbit and the red fox moves 0.3 H out (`restBow.via`). With the tip up, the bow stood in front of the face, and the right elbow of the red fox went 4.3 cm into the body in a lowering. | 5.2 |
