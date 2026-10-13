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
| The user: "the default rest pose of the polar bear looks strange, fix it". The rest clip of the studio polar bear (`clip_rest()` of `lowpoly-studio/roles/pianist/clips.py`) is the target of the look, because the studio made it for this body. The app keeps its own motion and plays no clip of the studio | 5.2, 5.3 |
| The hold of the piano and the harp has a rest lean (`restLean` of `HANDS_HOLDS`). The pose mixes it with the play lean by the weight of the playing pose. The harp keeps a rest lean of 0, so its poses do not change | 5.2, 5.3 |
| The pianist leans 22° forward at rest, and 20° in a play. The line from its hips to its neck then leans 20.8° from the vertical, and 20.6° in the rest clip at 2.95 s. The studio adds 30° to its spine bones, but it spreads them over three bones. A rest lean of 30° leaned the line 26.9°, and the upright rest of before 4.4° | 5.2 |
| The paws of the pianist rest on the outer tops of the knees: 0.8 H out, 0.1 H down, and 0.35 H forward from the top of the leg at the knee (`restL` and `restR` of `HANDS_HOLDS`). The wrist is then 0.29 m out, 0.22 m up, and 0.09 m forward of the knee joint, and 0.30 m, 0.21 m, and 0.09 m in the rest clip. Before, the wrist was 0.04 m behind the knee and 0.09 m higher. The top of the lap of a studio body stays the top of its hips, its belly, and its legs. This row replaces the row of the rest beside the knees of [`2026-10-12-studio-polar-bear.md`](2026-10-12-studio-polar-bear.md) | 5.3 |
| The elbows of the pianist point out and back at rest, (±1, 0, 0.4), as `REST_POLE` of the studio. With the elbows down and forward, the back view showed 81% of the upper arms. With the elbows out and back, it shows 61%, and the rest clip 59% to 60% | 5.3 |
