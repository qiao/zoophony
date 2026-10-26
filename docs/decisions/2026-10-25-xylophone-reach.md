# Decisions of the reach, the runs, and the soles of the xylophone badger

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager asked for three fixes of the badger xylophonist: each bar in reach,
the hands in runs, and flat soles. The user prefers a smaller instrument over longer arms. The
round `xylophone-reach` measured each change. The report
[`2026-10-25-xylophone-reach.md`](../research/2026-10-25-xylophone-reach.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user prefers a smaller instrument over longer arms. Cause: the short arms reach the bars only in a band about 0.12 m deep. Nearer bars put the paws into the belly, and the arms do not reach farther bars (`pd-*.txt`). | 4.6 |
| The bars are 3 cm wide and 12 cm to 8 cm long, the sharp row starts 0.5 cm behind the natural row, and the near edge stands 0.42 m in front (`XYLOPHONE`). At 0.40 m, the left wrist bent 64° at the lowest bar. | 4.6 |
| A mallet strikes a sharp bar 2 cm from its near edge (`XYLOPHONE.sharpStrike`), as a real player strikes it (`docs/reference/percussion-technique.md` 9). The mallet heads are 12 mm in radius, as the bars are smaller. | 4.6 |
| The mallets strike 2 cm off the middle of a bar (`offsetL`, `offsetR`), in place of 3 cm: with 3 cm, the left wrist bent 53° at the lowest bars, over the margin of the arm gate. | 5.3 |
| A bar out of the reach of its paw, 0.53 m from the shoulder joint on the floor plane, goes to the other paw (`PercussionHold.reach`). The right paw no longer reaches across the body. | 5.3 |
| A later strike (0.5 s or more after the strike before) within 2 cm of the last bar of the other hand stays in one hand (`PercussionHold.gap`). With 1 cm, the mallets touched in 1.3% of the samples of the test score, where a run goes over to the other paw. | 5.3 |
| The hips keep their place (`SideMove.hips` 0), and the spine takes the whole side move. A hip move of 2 cm sank the soles 3.7 mm to 5.8 mm into the floor and lifted a sole corner 8.8 mm. | 5.3 |
