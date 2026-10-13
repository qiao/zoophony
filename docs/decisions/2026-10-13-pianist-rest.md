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
| The user: "the default rest pose of the polar bear looks strange, fix it". The app keeps its own motion and plays no clip of the studio. The target of the look, the rest lean, the paws, the elbows, the head lift, and the arc of the paws of the rest pose are rows of [`2026-10-13-pianist-lap.md`](2026-10-13-pianist-lap.md) | 5.2, 5.3 |
| The hold of the piano and the harp has a rest lean (`restLean` of `HANDS_HOLDS`). The pose mixes it with the play lean by the weight of the playing pose. The harp keeps a rest lean of 0, so its poses do not change | 5.2, 5.3 |
