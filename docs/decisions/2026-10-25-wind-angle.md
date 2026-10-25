# Decisions of the wind angle

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager asked to bring the oboe of the mouse and the clarinet of the wolf
nearer to the angle of a real player, with correct grips and clean arms. The user prefers a
smaller instrument to longer arms. The report
[`2026-10-25-wind-angle.md`](../research/2026-10-25-wind-angle.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The manager: the oboe goes to the largest angle from 25° to 40° that passes all gates. The mouse oboe hangs 40° from the vertical, as a real oboist holds it (`MOUSE_OBOE_FORWARD`). | 5.3 |
| The user prefers a smaller instrument to longer arms. The mouse oboe is 0.5 of the oboe of the app, 0.275 m (`oboeScale`). On the oboe of 0.62, the arms reached forward straight at 35° and 40°. At 0.55, the left arm failed the gate at rest. | 4.6 |
| The left fingers curl 80°, so that the left paw grasps (`gripCurl`). The decisions `2026-10-25-oboe-hands.md` give the left grip. | 5.3 |
| The right grip moves 0.15 H down the oboe in place of 0.2 H, so that the right paw holds the lower joint above the bell (`gripShiftR`). | 5.3 |
| The rest grips keep their places of main on the oboe, 13.2 cm and 15.6 cm from the reed (`restGripShiftL`, `restGripShiftR`). With the rest grips before, the right arm folded 11 faces at rest. | 5.2, 5.3 |
| The manager: the reference images win, so the clarinet goes to their angle. The wolf of the images shows the clarinet at 28° and 24°, and a render of the app from their camera shows 30° as 25°. The clarinet hangs 30° from the vertical (`WOLF_CLARINET_FORWARD`). | 5.3 |
| The left clarinet grip moves 0.15 H down the tube in place of 0.2 H, with a left curl of 100°, so that the left paw grasps at 30° (`gripShiftL`, `gripCurl`). | 5.3 |
