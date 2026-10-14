# Decisions of the retro of the rabbit mesh rig

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, after the merge of the rabbit mesh of the user, the manager of the session chose
the items of the retro that are worth their cost (user rule of 2026-10-12). The agent of the branch
`retro-mesh-rig` decided the rows below. The user can reverse each decision. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The packed mesh of each studio body of `STUDIO_BODIES` has a gzip budget of 32,000 B (`STUDIO_MESH_GZIP_BUDGET` of `tools/studio-budgets.ts`), and `src/models/studio-size.test.ts` checks each body. Each studio body is in the first download (limit 1 MB). On 2026-10-14 the bodies are 17,299 B (bear), 16,597 B (polar bear), and 23,682 B (rabbit), so the budget keeps about one third of room above the largest. The first rig of the rabbit mesh, with one color for each face, was 53,969 B, and the test stops such a body. The test reads the packed mesh, so the budget does not depend on the format of the module text | 7.2 |
