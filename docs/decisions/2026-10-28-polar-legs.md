# Decisions of the legs of the polar bear pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user looked at the polar bear pianist from its left front and said: "the polar
bear's leg is too long, making it like a human instead of polar bear. Find the original mesh for
the polar bear and do not make deviate too far from it. You can reduce the height of the bench if
needed." Phase 1 made the leg factors 1.0, 1.2, and 1.4. The user slept, so the manager chose 1.2.
The report
[`2026-10-28-polar-legs.md`](../research/2026-10-28-polar-legs.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The thighs and the shins take the leg factor 1.2 (`legFactor`, no `shinFactor`), so that the shin keeps 0.67 of the thigh, as on the mesh. On `main`, the shin was 1.35 of the thigh. This replaces the factor rows of `2026-10-22-polar-legs.md` and `2026-10-27-polar-bench.md`. | 4.4 |
| The thighs slope 10° down, the shins stand vertical, and the feet stand flat (`studio.legTurns`): the bench top is 0.166 m. Level thighs gave 0.133 m and 5 turned knee faces in the bind. This replaces the bench row of `2026-10-27-polar-bench.md`. | 1, 4.4 |
| The body keeps the scale of `main`, 1.4389 m for each unit. The head top is 1.31 m in the play and 1.32 m at rest. This replaces the size row of `2026-10-27-polar-bench.md`. | 1, 4.4 |
| The calf fair covers 0.012 to 0.065 units down the shin (`kneeCrease.fair`): the band of `main` reached past the ankle of the short shin. | 4.4 |
| Two more pairs of thin faces of the right groin take one mean of their weights (`weights.rigid`): with the short legs and the near pedal, they folded in each play sample. | 4.4 |
| Conflict: design 1 puts the bench top at 0.28 of the seated head top, as `polar-bear-views.png` does. The newest words of the user win: the legs of the mesh give 0.13. | 1 |
