# Decisions of the wind palms and the oboe hands

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the user asked if the animals hold the wind instruments in the opposite direction,
and then said: "look closer at the screenshot of the wind players, their palm are facing outwards
and thumbs downwards". The manager asked to move the left oboe paw up to the upper joint, and to
prove the cause of the palms with geometry. The report
[`2026-10-25-wind-palms.md`](../research/2026-10-25-wind-palms.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The palm hint of each rig is the true palm: on each paw with a thumb, the thumb lies at the side that the chirality of the hand gives, and the true palm is 4° to 26° from the hint in the play (`palm-probe.ts`). The rigs do not change. | 4.4 |
| The user: "their palm are facing outwards and thumbs downwards". Each woodwind paw holds its tube from the side of its own shoulder: each grip moves across the tube toward that shoulder, at rest too (`gripShiftL`, `restGripShiftL` of `MOUSE_OBOE`, `WOLF_CLARINET`, `BEAVER_BASSOON`). | 5.3 |
| The side aim is 0 on the mouse and 0.25 on the wolf and the beaver (`aimSide`), and the fingers curl 100° and 80° (mouse), 115° (wolf), and 100° (beaver) (`gripCurl`). With 0.5 and the grips behind the tube, each palm faced the audience and each thumb pointed down the tube. | 5.3 |
| The grip tool puts the middle of a woodwind paw at the side of the tube of its own arm (`ROLES` of `tools/wind-grip.ts`). Behind the tube, a palm on the tube faces the audience. | 9.8 |
| The left oboe paw holds the upper joint, 9.7 cm from the reed, and the right paw the lower joint, 20.9 cm from the reed, 6.0 cm apart (`gripShiftL`, `gripShiftR`). At rest, the left paw stays above the right paw. | 5.3 |
| The left oboe elbow points out and a little down in the play, as at rest (`poleL`, `restPoleL`). With the elbow down, out, and forward, the left paw folded 9 faces or turned 172° from its accepted grip. | 5.3 |
| The right trombone paw keeps its hold: its palm faces the audience (+0.93) and its thumb points down the slide. It is open in `TODO.md`. | 5.3 |
