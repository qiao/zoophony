# Decisions of the depth of the thick upper arms of the elephant and the rhino

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager gave two faults: the upper arms of the elephant timpanist went 2.9 cm
into the belly, and the upper arms of the rhino tubist 1.8 cm to 2.0 cm into the body (goal
1.5 cm). The manager asked to prove each cause first, then to fix it with the plain Blender tools
or a small pose change, and to keep the strike spots, the mallet directions, and the grasp of
each paw. The report [`2026-10-25-thick-arm-depth.md`](../research/2026-10-25-thick-arm-depth.md)
gives the measures and the images. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| The elbow helper does not push the elephant upper arm into the belly. The deepest corner has no helper weight, and a helper turn of 0 or 1 leaves it at 2.9 cm. With all of its weight on one upper arm segment, it goes 3.0 cm in. | 4.4 |
| The elephant depth comes from the form: the thick upper arm turns down from the bind toward the round belly as one rigid part, and linear skinning does not press its flesh. | 4.4 |
| The inner front of each elephant upper arm is 0.009 units flatter, with a smooth falloff (`step_flatten()` of `tools/blender/elephant_arms.py`). The upper arms go 1.2 cm to 1.3 cm into the belly. 0.008 gave 1.5 cm, and 0.010 folded more faces of the left arm. | 4.4 |
| The accepted depth of 3.0 cm of the elephant upper arms goes (`TIMPANIST_SWEEP`): the contact limit 1.5 cm holds again. | 9.3 |
| The rhino play depth lies at a root corner of the right arm with 59% trunk weight, 1.0 cm in the body already in the bind pose. The rest depth lies at a corner that follows the arm as a rigid part. So no weight fix helps. | 4.4, 5.3 |
| The right rhino shoulder turns 45° forward (30°), and the right elbow points (1, -0.2, -0.25) in the play and at rest (`RHINO_TUBA`), as the arms of a real player stay away from the rib cage. The upper arms go 1.4 cm to 1.5 cm in. | 5.3 |
| The rhino change fails the margin of the right move twist max: 148° against 133° on `main`, inside the limit 176°. It equals the paw twist of the hold, and the move turn max goes from 171 to 29. The manager decides. | 9.3 |
| Open: the twist step of the right rhino forearm grows from 66.5° to 74.1° (target 25°). | 9.3 |
