# Decisions of the timpani mallets and the rest of the pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager gave the round `timpani-piano-rest` from the visual audit of the roles
(`docs/audits/2026-10-25-role-visual-audit.md`, faults 1, 3, and 4): the right timpani mallet lay
level across the belly between strikes, the timpani moments looked the same, and the paws of the
pianist hung in front of the chest at rest. The report
[`2026-10-25-timpani-piano-rest.md`](../research/2026-10-25-timpani-piano-rest.md) gives the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| Between strikes and at rest, each timpani mallet keeps its strike direction, and the wrist lifts the head 2 cm to 7 cm above its spot (`MalletAcross.pitch` 0.1), as the set position of a real timpanist. The turn across the forearm laid the right mallet level across the belly. | 5.3 |
| Before a strike, the wrist lifts the timpani head up to 11 cm to 22 cm (`sizes.lift` 0.2, `sizes.rest` 0.03, `MalletAcross.peak` 8), as the full stroke of a real player. The paws turn at most 10° in 0.01 s (`main` 43°). | 5.3 |
| The timpani paws take the roll of the snare paws (`strikeRoll`), and the pitch stays at 0.1, so that the shafts stay in the closed paws: 94% to 100% grasps. With no roll or a pitch of 0.2, the shafts left the paws 80° from the thumb side. | 5.3 |
| The timpani homes stand 0.45 H out from the shoulders (`home`), so that each mallet points 22° to 30° in, a V of about 50° (American grip). At 0.3 H, the left grasps fell to 10%. | 5.3 |
| The left timpani mallet keeps its strike 8 cm toward the middle (`offsetL`), so that it points in as far as the right mallet. This replaces the reason of the offset row of `2026-10-25-percussion-grip.md`. | 5.3 |
| The pianist paws rest in the lap on the lower belly, 1 cm to 2 cm in front of it (`restL`, `restR` of `HANDS_HOLDS.piano`), as a pianist rests the hands in the lap (Suzuki). The arms reach no part of the thighs past the belly. The palms are 9 cm (left) and 5 cm (right) lower than on `main`. | 5.3 |
| The right rest paw stays 2 cm higher than the left paw: a lower right paw folded up to 6 more faces at the right shoulder. The left shoulder folds about 20 faces in each rest pose that the scan tried, as on `main`. | 5.3 |
