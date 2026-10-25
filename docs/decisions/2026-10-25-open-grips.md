# Decisions of the open grips of the winds

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager listed seven grip faults that stayed open after the round `grips`: the
right paw of the panda off the slide brace, the short slide travel, the right finger tips of the
wolf off the clarinet, the left tuba paw of the rhino, the trumpet angle, the tan fox flute in the
lift and the lowering, and the open grip turns of the beaver. The report
[`2026-10-25-open-grips.md`](../research/2026-10-25-open-grips.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The right panda paw holds the slide brace from the right of the slide with its finger tips, the middle of the paw behind the brace, and the fingers curl 110° (`gripShiftR`, `aimSide` 0.8, `gripCurl` of `PANDA_TROMBONE`). The tips were 2 cm off, at the left of the brace. | 5.3 |
| The grip at the finger tips gives the slide 0.17 m of travel at 45° (0.075 m before). A real seventh position needs 0.57 m. A shoulder turn at the far positions gave 0.195 m, but bent the wrist 76° to the side (limit 70°). | 5.3 |
| The trombone keeps the play hold at rest (`restAim` 1), and the right elbow points (1, -0.5, 0): else the right wrist flipped in the lowering, or bent 73° to the side. | 5.2, 5.3 |
| `pnpm wind-grip` measures the trombone places in the axes of the slide (`placeAxes`), so that the place turns with the slide. | 9.8 |
| The side aim of a wind paw takes its sign once in the playing pose (`WindSide.aimSign`): the sign of each frame flipped the trombone paw in the lowering. | 5.3 |
| The trumpet of the monkey points 10° below the level, about 80° to the face, as a real player angles it "slightly down" (`MONKEY_TRUMPET`). The left grip lies 0.03 H low, so the mouth shows in the front view. It replaces the 20° of `2026-10-25-grips.md`. | 5.3 |
| The left rhino palm faces the main branch at its back left, as a tubist grips the tubing at the side of a rotary tuba (`RHINO_TUBA`, wind-technique 3). Both paws keep the play hold at rest (`restAim` 1): else the left paw flipped in the lowering. | 5.3 |
| The tan fox flute keeps its hold. The right paw stays within 0.7 cm of the flute in each step of the lift and the lowering, and the flute stays out of the body (`flute-lines.txt`). | 5.3 |
