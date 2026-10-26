# Decisions of the second review of 2026-10-26

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent five issues with images: "the bear is not holding the baton in a
natural way", "the cat's arm is bent in an unatural way", "the cat and rabbit's bow arms are not
resting in a natural pose when in rest mode. they should be more relaxed and closer to the body /
lap", "the meshes for the penguine are too faceted on the side. make it round", and "the elephants
wrists are twisting in unnatural way when hitting the drum". The manager worked alone on `main`.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The rabbit and the cat rest the bow paw on the lap at the front of the right thigh: the grip is 0.35 H out from the thigh top, 0.7 H up, and 0.5 H to the front (`restBow.lap`), with the elbow bent and the bow upright beside the body. The cat elbow points out and a little back, (1, -1, 0.3) (`restPoleR`). Before, the grip was 0.65 H and 0.7 H out, and the arm hung straight at the side. The arm gate passes against `main`, and the right upper arm of the cat stays at 1.3 cm in the body at rest. | 5.2 |
| The bow elbow of the cat at the frog points out to the side, level, and a little forward, (2, 0, -0.5) (`poleR`), so that it comes near the height of the hand, as on a real violist. With (1.2, -0.5, -1), the upper arm hung down the side, and the forearm folded up to the chin. The arm gate passes against `main` (grip turn 30, base 18, limit 45), and the depths do not change. | 5.3 |
| The right paw of the bear rolls 0.84 rad around the baton (`batonRoll`), so that the claws curl around it and the palm faces down; the baton points 25° up (30° before), the lowering turns it out and a little down, (1, -0.3, 0), and the turn keeps no paw twist (`liftTwist` 0). With no roll, the paw faced the players with the claws up. The arm gate passes against `main`, and the six conductor clearance tests pass. | 5.4 |
| The penguin body takes the crease angle 60° (35° before) and the color blend 0.7 (none before), so that its sides look round: the hard facets and the sawtooth of white, tan, and black faces along the belly fade. With the blend 1.0, the beak blurred into the head. | 4.5 |
