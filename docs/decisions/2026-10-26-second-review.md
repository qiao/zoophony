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
