# Decisions of the size of the mouse

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "the mouse is way too big. make it the size of the previous
parametric model". The round `mouse-size` gave the mouse mesh the size of the parametric mouse,
and a smaller oboe that its arms reach. The round `mouse-chair` removed the chair of the mouse (the
last four rows). The report [`2026-10-19-mouse-size.md`](../research/2026-10-19-mouse-size.md)
gives the measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the standing skull top of the mouse is at 0.812 m, the head top of the parametric mouse of `ab002346`: 0.856045 m for each unit, H 0.272 m, seat 0.076 m, chair 0.120 m deep (`app` of `tools/mesh-rigs/mouse.json`, `ANIMALS`). | 4.4 |
| The manager: the arm factor stays 1.4 (arms 0.91 of the trunk), and the mouse plays a smaller oboe, as a child plays a fractional violin (`SpeciesParams.oboeScale`, `buildWoodwind()`). | 4.6 |
| The reed goes 0.23 H in place of 0.14 H behind the mouth of the bind pose, about half of the reed, 1.0 cm into the head (`lipShift`). The angle stays 40°, and the elbows keep their directions, which gave the smallest arm turns. | 5.3 |
| The rest shape of the left arm takes the mean turns of the new rest (`raise` of the rig config). The play, the rest, and the lift fold in no sample (`fold-probe-oboist.txt`). | 4.4 |
| The tail loop lies on the floor behind the mouse, and the footprint is 0.764 m deep. The stages of the demos with oboes are 2.1% to 6.3% smaller than on `ef456e07` (`rig-check.txt`). | 4.4 |
| The user, 2026-10-19: "just remove the chair for mouse". The app builds no chair under the mouse (`SpeciesParams.noChair`, `buildSupport()`). | 4.4, 4.5 |
| The manager: the mouse keeps its seated pose, its seat height of 0.076 m, and its feet on the floor, so it stands on its hind legs with bent knees. The bind pose, the hold, the legs, and the standing soloist do not change. | 4.4 |
| The rule is a field of the species, so another oboe species keeps its chair. `seatHeights()` copies it into `SeatHeights.noChair`, so the stage props, the footprint, and the gallery follow it through `buildSupport()`. | 4.5 |
| The footprint goes from 0.420 m to 0.406 m across and stays 0.764 m deep, because the oboe and the tail set its depth. No stage side and no pose changes (`form-chair.txt`, `body-probe-chair.txt`). | 4.4 |
