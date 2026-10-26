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
| [`docs/reference/percussion-technique.md`](../reference/percussion-technique.md) is the target of the timpani motion. It is current: a round that changes the timpani motion updates its section 10 "Use in the app" in the same commit, and each new fact gets its source. | 5.3 |
| Between strikes, the paw keeps the angle of no twist (`across.rest` -1.2), and the wrist lifts the head 0.65 rad with no twist (`MalletAcross.lift`): 7° / 1° above the level, 16° / 14° in. The reference mallets point higher, but a real mallet does not go far up. | 5.3 |
| The homes stand 0.1 H out from the shoulders, and the strikes move 0.1 m in (`offsetL`, `offsetR`), so that each mallet points forward at a strike (1° / 8° in). The left paw stays out of the belly in beethoven-1 (0.0 cm). | 5.3 |
| The user: "the elephant's arms are squeezed / twisted". A ring at the right shoulder (`refine.rings` of `tools/mesh-rigs/elephant.json`) rounds the right shoulder (flat p5 0.65 to 0.78) and removes the sharp wedge at the front of the right armpit. The three shapes stay, with 0.0% folds. | 4.4 |
| The manager accepted the paw crops while the user slept (`crops.webp`), and set the accepted grip of the timpanist to L -2, R -6 (`ACCEPTED_GRIPS`). The user asked for this grip. | 4.4, 9.8 |
| The manager kept the lift of 0.65. The stretch of the left arm counts from the lifted rest (0.22, base 0.09, limit 0.35). Against the bind, the forearm and the paw stretch less than the base. A lift of 0.3 passes, but puts the mallets 9° to 16° below the level. | 4.4, 5.3 |
