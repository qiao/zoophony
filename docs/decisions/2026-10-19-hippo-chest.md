# Decisions of the chest of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the hippo's chest is clipping when playing", with a screenshot of
the hippo bassist from the front and a little above. The user had asked for no questions on the
hippo, so the round `hippo-chest` chose. The report
[`2026-10-19-hippo-chest.md`](../research/2026-10-19-hippo-chest.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the clip is the upper bout of the contrabass in the chest under the chin, and the hold moves it out (`HIPPO_HOLD`). | 5.3 |
| The trunk leans 12° (15° before): the top plate went at most 1.5 cm into the chest (5.6 cm before). The place of the end pin follows `2026-10-21-hippo-bass.md`. | 5.3 |
| The clavicle weights fade out toward the middle plane, from 0.25 u to 0.05 u (`weights.clavicleMiddle`): faces 617 and 618 under the chin folded in each play sample. | 4.4 |
| `weights.rigid` on face 323 of the back of the neck. The shape of the bow arm went with the rebuilt arms of `2026-10-25-hippo-arms.md`. Faces 617, 618, 323, and 338 fold in no sample. | 4.4 |
| Rejected: a higher `clavicleFrom` and a narrow middle fade moved the folds to the next faces. A roll of 20° put the top plate 6.2 cm into the chest. A lean of 8° put a forearm 8.2 cm into the body. | 4.4, 5.3 |
| Open: the top edge of the upper bout touches the chest under the chin, and a few skin teeth show over it in a close view (`chest-compare.webp`). | 5.3, 9.3 |
| The round `hippo-arms` brings the arms back and keeps the chest fix. The right shoulder turns 50° forward (45° before, `HIPPO_HOLD.reach`): the bow arm was straight in its deepest samples, so no right elbow pole changed them. | 5.3 |
| The left paw tilts 55° over the neck, as the paw of the dog (`HIPPO_HOLD.tiltL`, 30° before): the left arm goes at most 5.6 cm into the body (6.9 cm with 30°, `arms/lf-final.txt`). | 5.3 |
| Rejected: a shoulder turn of 55° folded faces 514, 456, and 616 of the shoulder and of the chest under the chin in 94% to 100% of the play samples. A `raise` rule for faces 477 and 461 at the turns of the new hold kept 13 faces turned. | 4.4, 5.3 |
| Accepted: against the hold before the chest fix, the left forearm goes 2.2 cm deeper into the contrabass in the play, and the right arm up to 2.4 cm deeper in the lowering (`arms/pose-depth-final.txt`). | 5.3, 9.3 |
| Open: in the high positions, the thick left forearm crosses the upper bout (7.4 cm). No left elbow, tilt, or place of the contrabass that keeps the chest fix changed it (`arms/lf-a.txt`, `arms/lf-b.txt`). | 5.3, 9.3 |
