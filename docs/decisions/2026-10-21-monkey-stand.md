# Decisions of the stand of the trumpet monkey

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user rejected each chair for the monkey and said: "ok, no chair now. make the
monkey stand, but fix its pose so that the center of the gravity of the monkey is natural". The
user slept, so the manager chose the variant by the measures. The reports
[`2026-10-20-monkey-stand.md`](../research/2026-10-20-monkey-stand.md) and
[`2026-10-20-monkey-chair.md`](../research/2026-10-20-monkey-chair.md) give the measures, and the
lineup stays in the research folder. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the monkey keeps no chair (`SpeciesParams.noChair`). Its center of mass must be over the middle of its soles, where a real stand is most stable (Asai 2020: the center of foot pressure at 30% to 60% of the foot length). | 4.4, 4.5 |
| Manager, variant C': the thighs 65° down and the shins 20° back, so that the feet stand under the hips (`studio.legTurns`). The center of mass is at 51% of the soles at a note and 45% at rest, against 17 cm behind them on `74ad085a`. | 4.4, 5 |
| Manager: the trunk leans forward, because the short legs alone left the center of mass 10 cm behind the middle. The hip angle closes by 14° (`studio.trunk.open` -14), the pelvis turns 18.7° forward, and the head stays about level. | 4.4, 5 |
| The trunk rule of the rig also solves a forward lean for a negative `open` (`trunk_turn()` of `tools/blender/rig_mesh.py`). | 4.4 |
| The monkey has no sit rule, so its haunch keeps its form. The trunk step lifts a haunch onto the rig chair only with a sit rule (`rig_mesh.py`): the lean turned the haunch down, and the lift flattened it by up to 6 cm. | 4.4 |
| Tail: the root goes back and down 63°, and the tip keeps the direction of the source, so that the curl stands on the floor 0.2 cm above the soles (`studio.tailBind`). The rig chair ends at -0.05 u, behind the shins (`chair.front`). | 4.4 |
| The hold stays. The arm gate passes, with the grip turn 8° and 9° against 1°, and the palms reach the grips with 7.6 cm and 6.3 cm to spare. Each note target is within 5 mm. The first download grows by 3 B. | 5.3, 7.2 |
