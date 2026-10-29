# Decisions of the string models

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-29, the user said: "make the models of the string instruments more detailed,
polished, and realistic". The report
[`2026-10-29-string-models.md`](../research/2026-10-29-string-models.md) gives the real
proportions, the measures, and the images. The user can reverse each decision. Then update its
section, and remove its row.

| Decision | Section |
|---|---|
| The user: "more detailed, polished, and realistic". Each bowed string with its bow has a budget of 1,200 triangles in place of 800 (`INSTRUMENT_BUDGETS`). The corners, the scroll, the pegs, four strings, and a shaped bow need about 1,150. | 4.5 |
| The strings stay at `VIOLIN.stringHeight`, because the holds and the play targets read it. The board keeps the height and the end thickness of the base board: a thicker or higher board put the left paw of the hippo 1.9 or 2.4 cm deep in place of 1.5 cm (`FINGERBOARD`). | 4.6 |
| The neck under the first positions is open below the board, with two thin side walls, as the gap of the base box neck. A solid neck put the left wrist of the hippo 1.7 cm deep in place of 1.5 cm (`NECK_OPEN`). | 4.6 |
| The manager: "the instrument detail must not move the seats". The footprint counts a simple box model of each bowed string and its bow in place of its parts. The detailed footprint moved row 0, and the right arm of the conductor folded more (`addLayoutSpace()`, `InstrumentPiece.footprint`). | 4.5 |
| Four separate strings replace the strip. `VIOLIN.stringsWidth` is now the width of the four strings at the bridge, and the bow check of `pose-depth --targets` reads it. A play frame and close shots show no light bar (`STRINGS`). | 4.5 |
| The edges of the body have the darker wood color, and the ribs and the arches have the top color, so a dark band goes around the top as in `orchestra-latest.png` (`VIOLIN_LEVELS`). | 4.5 |
| The contrabass gets sloped shoulders, a flat back with a break, and brass machine heads, as a real double bass. The cello keeps the violin form and its depth, so that its back stays out of the chest of the dog (`BASS_HALF`, `BASS_BREAK`, `MACHINES`). | 4.6 |
| The varnish colors stay. In a play frame, the hue of the app top is at or below the hue of the reference (cello 19.4° to 19.0°, violin 16.6° to 20.3°), so the app is not more orange (`varnish.py` of the research folder). | 4.5 |
