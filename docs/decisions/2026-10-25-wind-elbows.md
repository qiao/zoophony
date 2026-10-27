# Decisions of the wind elbows, the trombone palm, and the bassoon rest

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the user said that the wind players hold the instruments with "their palm are
facing outwards and thumbs downwards". The round `wind-palms` fixed the woodwind paws. The manager
then asked to lower the left oboe elbow, which read as a raised wing, to fix the right trombone
palm from sources, and to put the right bassoon paw on the boot joint at rest. The report
[`2026-10-25-wind-elbows.md`](../research/2026-10-25-wind-elbows.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The left oboe elbow points down and a little out in the play, and the upper arm hangs 32.5° below the level, in place of 3.5° (`poleL` of `MOUSE_OBOE`). Real oboists let the arms hang loosely, with the elbows a little free from the body. | 5.3 |
| The user: "their palm are facing outwards and thumbs downwards". The right trombone paw holds the low part of the brace from the right side of the panda, with the palm to the left and the thumb up (`gripShiftR` of `PANDA_TROMBONE`). | 5.3 |
| The right trombone elbow points down, a little out, and a little forward, in the play and at rest (`poleR`, `restPoleR`). With the elbow out, the side palm turned the paw 166° on its forearm. | 5.3 |
| The slide reach drops from 0.17 m to 0.105 m, 18% of a real slide, because the right paw lies at the far side of the brace. A right shoulder turn of 55° gives 0.125 m and a flatter upper arm, so the shoulder keeps 45°. | 5.3 |
| At rest, the bassoon moves 0.15 H forward and takes its bind turn, the lower end 10° back toward the body (`BEAVER_REST`, `restShift`), so that the right paw holds the boot joint. No source gives the rest of a bassoonist. | 5.2 |
| The left bassoon elbow points down, out, and a little back, in the play and at rest (`poleL`, `restPoleL` of `BEAVER_BASSOON`). Each link of the left forearm twists 55.4° in place of 64.6°. | 5.3 |
| The accepted grips of the left oboe paw and the right trombone paw take the medians of the new holds, -85° and -85° (`ACCEPTED_GRIPS` of `tools/arm-check.ts`). | 9.8 |
