# Decisions of the bind of the left paw

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the round `fifth-bind` gave the rabbit, the red fox, and the cat a new bind of the
left paw, so that the left forearm skin does not pass 180° of twist in the lift and the lowering
of the violin and the viola. The report
[`2026-10-27-left-paw-bind.md`](../research/2026-10-27-left-paw-bind.md) gives the measures. The
user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the violin/viola are rotating in the different direction than their player's wrist/arm". The bind left paw turns about its forearm toward supination (`studio.bindSupination`): 100° on the rabbit, 110° on the red fox, and 120° on the cat. The rest and play twists then lie on one side of 180°. | 4.4, 5.2 |
| The bind paw turns about the forearm, and the forearm segments share the turn in the bind (`paw_supination()`). A turn of the bind elbow, as on the rhino, also turns the upper arm roll: the play roll would reach 72° to 94° (gate limit 55°, `bind-scan.txt`). | 4.4 |
| The rabbit takes 100°: with 60° and 120°, the faces of the left wrist folded in the play as with no turn, and with 80°, the forearm twist p95 of the arm gate was 67 (58 with 100°). | 4.4 |
| The red fox takes 110°: the forearm twist p95 was 75, 65, and 55 on the violin and 26, 35, and 45 on the flute with 80°, 100°, and 120° (67 and 48 with no turn). The tan fox flute paw then twists -5° in the play (-115°). | 4.4 |
| The cat takes 120°: the forearm twist p95 was 64, 60, 55, and 50 with 90° to 120° (66 with no turn), and each angle removed the folds of the left paw. With 90°, the play twist reached -152°. | 4.4 |
| The accepted left grips of the violinist, the fox violinist, the violist, and the flutist move by the bind angle of their rig (`ACCEPTED_GRIPS` of `tools/arm-check.ts`): the holds keep their grips, and the grip turns stay 17°, 3°, 22°, and 5°. | 9.3 |
| No unwind: the forearm segments share the whole twist (`TWIST_FADE_BAND`, `skinTwist()`, `twistFadeL`, and `carryFade()` removed). The left forearm twist changes at most 9.6° in 0.05 s in each move (58.1° with the unwind), and the left arms pass the gate against `57849ac5`. | 4.4, 5.2 |
