# Decisions of the wrist twist in the lift and the lowering

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user wrote: "for some animals (e.g. rabbit), when they go from rest pose to
play pose (and vice versa), their wrist would sometimes twist too much. audit the motion and fix
it". The brief of the manager kept each rest pose and each play pose. The agent asked no question,
so each choice is a row. The report
[`2026-10-21-wrist-lift.md`](../research/2026-10-21-wrist-lift.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above. The bow mix takes its side from the bow at the play place, because the bow on the moving violin came near 180° from the rest bow, and the paw turned by about 170° in 0.01 s (`liftMix()` of `pose/bowed.ts`). | 5.2 |
| The baton turn of the lift keeps at most 60° of the paw twist on the forearm (`CONDUCTOR_HOLD.liftTwist`). The full turn twisted the paw past 180°. 0° pointed the baton across the face, and 70° gave a paw swing of 96°. | 5.2, 5.4 |
| The arm gate samples the lifts and the lowerings at steps of 0.01 s, with the limits 176° for the paw twist and 3,000°/s for the wrist turn rate (`MOVE_MEASURES`, `ARM_LIMITS` of `tools/arm-check.ts`). | 4.4, 5.2 |
| With `--base`, the commit runs the arm gate of the working tree, as `--states` does, so that a new measure has a value on the base (`GATE_SCRIPTS`). | 4.4 |
| The left paw of the violins and of the viola stays open: its rest twist and its play twist lie on the two sides of 180°, so each continuous move passes 180° on one bone. A fix moves the rest grip, which the brief kept. | 5.2 |
| The rabbit forearm goes 2.1 cm into the body for 0.2 s of the lowering at the song end of `bach-bwv1050` (1.0 cm on `39aa09c9`), because the bow no longer flips there. The flip is the larger fault. | 5.2 |
