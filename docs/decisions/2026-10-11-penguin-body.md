# Decisions of the penguin body

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-11, after the second revert of the bodies, the user said: "make these animals look more
like the reference images ... penguin looks off". The manager gave the penguin a body of its own,
built in code after the choir of `orchestra-latest.png` and `orchestra-side.png`. The agent of the
penguin body decided the other rows. The report
[`2026-10-11-penguin-body.md`](../research/2026-10-11-penguin-body.md) gives the measures, the
rounds, and the images. The user can reverse each decision. Then update the section that holds it,
and remove its row. On 2026-10-21, the mesh of the user replaced the egg body
([`2026-10-21-mesh-penguin.md`](2026-10-21-mesh-penguin.md)), so the rows of the egg body left. The
code of the egg body is in the history (`git show c4951160:src/models/penguin/penguin-body.ts`).

| Decision | Section |
|---|---|
| The `beak` snout and the `eye-rings` face pattern leave the parametric biped with their code, because no species uses them, as the user decided for the body code that no species uses (`2026-10-11-body-revert.md`). `SpeciesParams` is now a species of the biped (`BipedParams`) or a species with a body of its own (`OwnBodyParams`). The penguin has no shape parameters, and the shape table of 4.3 has no row for it. `git show 383deb64:src/models/snouts.ts` and `face-patterns.ts` give the two parts back | 4.3, 4.5 |
| A gallery page with no bear has no conductor, and its players play alone. The queries `azimuth` and `elevation` turn and tilt the camera of a close view. `pnpm choir-check <dir>` uses them to compare the penguin with one penguin of each of the two images, because the penguin has no model sheet | 7.1 |
