# Decisions of the piano pedals

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user looked at close-ups of the polar bear pianist and said: "the piano is
missing the pedals". The round asked no questions. The report
[`2026-10-24-piano-pedals.md`](../research/2026-10-24-piano-pedals.md) gives the sizes, the
measures, and the images. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The user: "the piano is missing the pedals". A lyre and three brass pedals (soft, sostenuto, damper) come under the keys, in the sizes of real grand pianos, times `PIANO_SCALE` (`PIANO_PEDALS`). | 4.6 |
| The pedal tips stand 5 cm behind the front edge of the keys, and the box front under the front of the case. No source gives this distance, and pedals further back are out of the reach of the short legs. | 4.6 |
| The pedals stand 7.2 cm apart: a third of the box of a real lyre, 21.6 cm wide (derived). | 4.6 |
| The pedals take `INSTRUMENT_COLORS.brass` with the `metal` finish, as the trombone. No new color. | 4.5 |
| The damper pedal is a second piece on the `slide` bone, so that it goes down with `slideOffset`. It goes straight down 2.3 cm times the scale, where a real pedal turns around its pin. | 4.6, 5.3 |
| The right heel stays on the floor, and the ball of the foot lies at the front of the damper pedal (`posePedalFoot()`). The heel is the back of the sole: a higher pivot lifted the heel 2 cm. | 5.3 |
| The paw is 24 cm wide, so the pedal lies under its inner edge, and the paw stays 1 cm right of the sostenuto pedal (`pedalFoot()`). | 5.3 |
| In the lift, the foot first turns up in place, then moves onto the pedal. A mix of the bone rotations put the sole 6 mm into the edge of the pedal. | 5.3 |
| The sustain pedal of the score (CC 64 of 64 or more, CC 121 lifts it) presses the damper pedal (`sustainPedals()`). Each change ramps in 0.1 s from the level that it finds (`pedalMotion()`). | 5.3 |
| With no pedal data, the foot rests on the pedal in the play. At rest, both feet stand flat. The left foot keeps the bind, left of the soft pedal. | 5.3 |
| The pedals grow the floor footprint of the piano, so the stage of `bach-bwv1050` moves 1 cm, and its hippos and conductor change pose sets through their places. | 4.2 |
| Open: the case shades the pedals in the gallery light. From the stage camera at elevation 40, the bear and the keys hide the pedals and the feet. No demo has CC 64 on the piano. | 9.3 |
