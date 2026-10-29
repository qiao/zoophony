# Decisions of the smoothing of the rebuilt arm tubes

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "the hippo's arm has lumps / dents", "the wolf's arm has unexpected
dents / bends", and "the cat's arm has unexpected lumps". The report
[`2026-10-28-arm-smooth.md`](../research/2026-10-28-arm-smooth.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| A rig can smooth the source vertices of its arm tubes after the weights with Taubin rounds (`armSmooth`, `arm_smooth()`), because the rebuilt tubes took the ridges between the big faces of the user mesh. | 4.4 |
| The wolf smooths both tubes with 6 rounds. With 12, the root of the right upper arm folded. | 4.4 |
| The cat smooths the tube of the bow arm with 4 rounds. With 8, the bow paw folded. | 4.4 |
| The hippo smooths only the middles of its tubes with 6 rounds: its elbow rings keep a gap for the helper bone, and its root joins the side wall, so a smoothing of the whole tube folded both. | 4.4 |
