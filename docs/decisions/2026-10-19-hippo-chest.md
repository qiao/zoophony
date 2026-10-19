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
| The trunk leans 12° (15° before), and the end pin stands 2 cm further forward: the top plate goes at most 1.5 cm into the chest (5.6 cm before). | 5.3 |
| The clavicle weights fade out toward the middle plane, from 0.25 u to 0.05 u (`weights.clavicleMiddle`): faces 617 and 618 under the chin folded in each play sample. | 4.4 |
| One shape of `raise` for the bow arm in the play, and `weights.rigid` on face 323 of the back of the neck. Faces 617, 618, 323, and 338 fold in no sample, and the folded face samples fall by 27%. | 4.4 |
| Accepted: faces 477 (93%), 461 (34%), 68 (25%), 248, 249, and 1356 of the upper arms fold in more play samples (`fold-probe-base.txt`). | 4.4, 9.3 |
| Accepted: the arms go up to 4.8 cm deeper into the body and the contrabass, most in the lowering, and the paws up to 2.1 cm less (`pose-depth-base.txt`). | 5.3, 9.3 |
| Rejected: a higher `clavicleFrom` and a narrow middle fade moved the folds to the next faces. A roll of 20° put the top plate 6.2 cm into the chest. A lean of 8° put a forearm 8.2 cm into the body. | 4.4, 5.3 |
| Open: the top edge of the upper bout touches the chest under the chin, and a few skin teeth show over it in a close view (`chest-compare.webp`). | 5.3, 9.3 |
