# Decisions of the wind grips of the wolf, the mouse, and the tan fox

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user said about the round of
[`2026-10-24-wind-holds.md`](2026-10-24-wind-holds.md): "the wind players are obviously not fixed.
they are not even holding the instrument". The manager asked for a fix of the rest and the play
with no questions. The report [`2026-10-24-wind-grips.md`](../research/2026-10-24-wind-grips.md)
gives the measures and the images. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| A wind hold round measures the grip with `pnpm wind-grip`: a paw holds as a fist (the tube within 1 cm of the middle of the paw and in it, the rule of the bow grip) or as a wrap (the skin and the finger tips on the instrument). The arm gate passed while the paws missed the tube. | 5.3, 9.8 |
| Each woodwind palm faces from its grip to the axis of the tube. The up axis of the bone faced the palms of the hanging oboe and clarinet up, because their keys face the body. | 5.3 |
| A hold can move each grip around the tube (`WindHold.gripShiftL`, `gripShiftR`), and at rest (`restGripShiftL`, `restGripShiftR`), so that the tube goes through the closed paw. The lift and the lowering slide the paw between the two grips. | 5.2, 5.3 |
| A hold can keep the aim and the roll of the play at rest (`WindHold.restAim`). The wolf and the mouse take 1: with the roll of the shoulder, the rest paw of the mouse turned 177° on its forearm and flipped in the lowering. | 5.2, 5.3 |
| The wolf grips move past the axis, the left grip 0.2 H down the tube: at its grip of the instrument, 8.5 cm above the shoulder joint, the retarget turned the paw up along the tube. | 5.3 |
| At rest, the wolf stands the clarinet bell on the front of the seat between the knees, 20° forward, with both paws on its upper half. Each other rest put the arms into the body. | 5.2 |
| The wolf and the mouse get a twist bone of each upper arm with half of the roll (`upperTwist` of their mesh rig configs). The wolf right twist at rest fell from 69° to 43°. `armSegments` needs painted Blender weights and the arm factor 1, which these bodies do not have. | 4.4 |
| The mouse oboe hangs 10° from the vertical, and the grips move 0.2 H down it, so that the elbows bend near the body (manager review: "the left arm reaches far forward as a long flat plank"). The right elbow points out and forward: down and in, the right arm folded. | 5.3 |
| At rest, the mouse holds the oboe upright in front of the right side of the body, about 10 cm off the belly, the left paw closed on it. On the belly, the right arm folded 11 to 17 faces, also with the twist bone. | 5.2 |
| The right grip of the tan fox moves toward and past the axis of the flute, in the play and at rest. At rest, the flute stands 10° from the vertical at the right side in the closed right paw, after George, with the foot joint beside the knee: on the knee and across the lap, the arms failed the gate. | 5.2, 5.3 |
