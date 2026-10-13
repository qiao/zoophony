# Decisions of the rest pose of the pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-13, the user said: "the default rest pose of the polar bear looks strange, fix it". The
agent of the round `pianist-rest` decided the other rows. The report
[`2026-10-13-pianist-rest.md`](../research/2026-10-13-pianist-rest.md) gives the measures and the
images. The user can reverse each decision. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The user: "the default rest pose of the polar bear looks strange, fix it". The app keeps its own motion and plays no clip of the studio. The target of the look, the rest lean, the paws, the elbows, and the head lift of the rest pose are rows of [`2026-10-13-pianist-lap.md`](2026-10-13-pianist-lap.md) | 5.2, 5.3 |
| The hold of the piano and the harp has a rest lean (`restLean` of `HANDS_HOLDS`). The pose mixes it with the play lean by the weight of the playing pose. The harp keeps a rest lean of 0, so its poses do not change | 5.2, 5.3 |
| Between the rest pose and the playing pose, the wrists of the pianist go 0.5 H out and 0.5 H up at the middle of the change (`restArc`). With the new rest place and 0.3 H out and 0.4 H up, the left claws went 1.9 cm into the case when the paws lowered after a stop (Bach, 95.4 s). Arcs that went back or higher put the claws up to 4.9 cm into the belly. With 0.5 H and 0.5 H, the claws go at most 0.9 cm into the case in the lowering and stay out of the body. The lift keeps 0.1 cm. This row replaces the row of `restArc` of [`2026-10-12-studio-polar-bear.md`](2026-10-12-studio-polar-bear.md). On a straight line, the paws went 2.6 cm into the belly | 5.3 |
