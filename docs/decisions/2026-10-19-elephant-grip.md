# Decisions of the grip of the elephant timpanist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user sent two screenshots of the elephant timpanist: "the elephant's arms are
squeezed / twisted" (from the back), and "the elephant is holding the drum stick in the reverse
direction" (from the front). The manager gave the round `elephant-grip`. The report
[`2026-10-19-elephant-grip.md`](../research/2026-10-19-elephant-grip.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| [`docs/reference/percussion-technique.md`](../reference/percussion-technique.md) is the target of the timpani motion. It is current: a round that changes the timpani motion updates its section 5 "Use in the app" in the same commit, and each new fact gets its source. | 5.3 |
| The user: "the elephant is holding the drum stick in the reverse direction". The head of each timpani mallet leaves the front of the fist, and the shaft slants 1.3 rad down in the bind pose, along the thumb (`TIMPANI.malletTilt`). It replaces `TIMPANI.malletBack` of `2026-10-19-elephant-pose.md`. | 4.6, 5.3 |
| The real range of the scan: each mallet 10° to 45° in from forward (a V of 20° to 90°), 10° to 25° down at a strike, and not below the level between strikes (`percussion-technique.md` 2, 3). Tilt 1.3 gives the smallest paw turn in it: 39° / 44° in the play. | 5.3 |
| Between strikes, the paw keeps the angle of no twist (`across.rest` -1.2), and the wrist lifts the head 0.65 rad with no twist (`MalletAcross.lift`): 7° / 1° above the level, 16° / 14° in. The reference mallets point higher, but a real mallet does not go far up. | 5.3 |
| The homes stand 0.1 H out from the shoulders, and the strikes move 0.1 m in (`offsetL`, `offsetR`), so that each mallet points forward at a strike (1° / 8° in). The left paw stays out of the belly in beethoven-1 (0.0 cm). | 5.3 |
| The user: "the elephant's arms are squeezed / twisted". A ring at the right shoulder (`refine.rings` of `tools/mesh-rigs/elephant.json`) rounds the right shoulder (flat p5 0.65 to 0.78) and removes the sharp wedge at the front of the right armpit. The three shapes stay, with 0.0% folds. | 4.4 |
| Open: the arm gate fails on the grip turn (28° / 32°) until the manager accepts the new grip. The proposed entry of `ACCEPTED_GRIPS` is L -2, R -6. | 4.4, 9.8 |
| Open: the stretch of the left arm counts from the lifted rest (0.22, base 0.09). Against the bind, the forearm and the paw stretch less than the base. A lift of 0.3 passes, but puts the mallets 9° to 16° below the level, so the round keeps 0.65. | 4.4, 5.3 |
