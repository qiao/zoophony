# Decisions of the bow grip of the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "also the hippo's arm is messed up. fix it", with a close image of
the bow arm from the right, and "always take screenshots from all angles and validate them to
ensure things are fixed and no new regressions are introduced". After the paw round of
[`2026-10-28-hippo-paw.md`](2026-10-28-hippo-paw.md), the paw slid on the stick over a stroke,
and the stick ran up to 2.4 cm from the middle of the paw. This file replaces the row of that
file that kept the bow grip. The report
[`2026-10-28-hippo-grip.md`](../research/2026-10-28-hippo-grip.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The bow hand of the hippo turns in the plane of its palm around the grip, so that the forearm keeps 45° in that plane (`HIPPO_HOLD.stickTurnR`, `turnOnStick()` of `pose/bowed.ts`). The paw keeps one turn on the hand and a straight wrist, and the bow turns in the paw, as on `main`. | 5.3 |
| The grip of the hippo lies in the middle of the closed paw (`SpeciesParams.bowGrip`), so that the hand turns around the middle of the paw: the stick stays within 0.35 cm of it in each sample (2.43 cm on `main`). | 4.6, 5.3 |
| The turn goes up to 90° to each side. In the lowering after a pizzicato, the forearm turns up to 79° past 45°, so the bow turns in the paw by up to 79° there (the paw bent up to 82° on `main`). | 5.3 |
| In pizzicato, the bow tip of the hippo points up, square to the strings, and the elbow points out and up (`pizzicatoTip`, `polePizzicato`). With the tip up, left, and forward, the forearm came to the hand at 100° to 109°, past the 70° limit of `PAW_TURN`, and the paw swung up to 41°. | 5.3 |
| With the tip up, forward, and a little out and the elbow a little up, the straight paw twisted 159° on its forearm in the lowering after a pizzicato (the move twist of the arm gate, 144° on `main`, 140° now). | 5.3 |
| The right elbow of the hippo points a little up at the tip (`poleTipR`): level, the right upper arm went 3.0 cm into the body (2.8 cm on `main` and now). With the elbow of the frog, face 443 of the right forearm folded in 0.3% of the play. | 5.3 |
| The rest grip of the bow paw lies 0.1 H further out (`restBow.lap.offset`): at the place of `main`, faces 469 and 470 of the inner right elbow folded at rest, and 0.1 H lower, the right upper arm went 6.2 cm into the body (6.1 cm on `main`, 5.7 cm now). | 5.3 |
| Rejected: a share of the turn that the bow takes with the hand in a lift or a lowering. With the share 1 - weight³, the bow went 4.1 cm into the contrabass in the lowering after a pizzicato. | 5.3 |
