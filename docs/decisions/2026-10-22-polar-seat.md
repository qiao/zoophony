# Decisions of the seat of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "also the polar bear's pose is very wrong now", with a screenshot of
the pianist from the side and above. The user slept, so the agent of the round `polar-seat`
chose the rows by the measures, the brief of the manager, and the user rules. The report
[`2026-10-22-polar-seat.md`](../research/2026-10-22-polar-seat.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the hip joints lie in the haunch and the knees at the bottom of the round body, so the thighs take the lower haunch and turn forward. The root of the tail stays on the hips (`joints`, `weights.haunch` of `tools/mesh-rigs/polar-bear.json`). | 4.4 |
| Seat: the thighs 5° down and 15° out, and the shins vertical, so the knee angle is 95° and the hip angle 90° at rest, as a real pianist sits (`studio.legTurns`). Thighs 30° out showed no more of the knees from above and folded more at rest. | 4.4, 5.2 |
| Bench: its front edge 1 cm behind the calves, under the thighs, and 0.95 × 0.39 m, so that it holds the whole haunch. Its top fits the legs: 0.153 m (`chair`, `PIANO_BENCH`). | 4.4, 4.5 |
| The legs keep the length of the mesh (brief of the manager), so the bench is low and the shoulders 10 cm lower. Longer legs need a decision of the user. | 4.4 |
| No lean from the hips in the seated bind: `studio.trunk.open` -12 and -18 folded both arms in each play sample. The play lean bends the spine. | 4.4, 5.3 |
| Hold: a lean of 24° and the lap places 0.6 H in front of the lap, for the lower shoulders (`HANDS_HOLDS.piano`). | 5.3 |
