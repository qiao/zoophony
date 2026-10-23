# Decisions of the retro of the rabbit mesh rig

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, after the merge of the rabbit mesh of the user, the manager of the session chose
the items of the retro that are worth their cost (user rule of 2026-10-12). The agent of the branch
`retro-mesh-rig` decided the rows below. The report
[`2026-10-14-rabbit-mesh-retro.md`](../research/2026-10-14-rabbit-mesh-retro.md) gives the times
and the measures. The user can reverse each decision. Then update the section that holds it,
and remove its row.

| Decision | Section |
|---|---|
| The packed mesh of each studio body of `STUDIO_BODIES` has a gzip budget (`STUDIO_MESH_GZIP_BUDGET` of `tools/studio-budgets.ts`, 34,000 B since `2026-10-22-rhino-arm-3.md`), and `src/models/studio-size.test.ts` checks each body. Each studio body is in the first download (limit 1 MB). The first rig of the rabbit mesh, with one color for each face, was 53,969 B, and the test stops such a body. The test reads the packed mesh, so the budget does not depend on the format of the module text | 7.2 |
| `--glb <file>` of `pnpm hold-reach` and `pnpm fold-probe` runs the probe in a child process on a copy of `src/` in a temporary folder, with the module of the animal written from the file (`tools/glb-swap.ts`), as `pnpm body-probe --base` does. The copy also holds `package.json` and the scripts of `tools/`, with links to `node_modules/` and `demos/`. A change of `STUDIO_BODIES` or of the cache of the rigs in memory would put state into the pure core. The copy takes about 0.3 s | 4.4 |
| The animal of `--glb` comes from the code: the studio body `studio-<animal>` of the species for `pnpm hold-reach`, and the species of the role for `pnpm fold-probe` (`roleAnimal()`). A test checks that each studio body has its entry in `ANIMALS` and its module `src/models/studio/<animal>.ts`. The settings of the export are the entry of the animal in `ANIMALS` | 4.4 |
| `pnpm studio-body` takes `--glb` only with `--inspect`, so that no module in `src/` comes from a temporary file | 4.4 |
| `pnpm rig-mesh --check` rigs into a temporary folder and writes no file into the repository, also not the GLB file of the config. A check then leaves no changed GLB file in the tree, which keeps the rule "only the last commit of a series of rig commits writes the GLB file". The check runs Blender one time more than a plain rig (2 s) | 4.4 |
| `--check` goes on when the arm factor misses the target reach, and it prints the shoulder joint, the reach with no factor, and the factor of the target. The manager asks the user about the arms with that factor. With no `--check`, the tool stops on a miss, as before | 4.4, 4.6 |
| `--check` stops after the line of the triangles when the rig is above the budget of a studio body. `STUDIO_TRIANGLE_BUDGET` of `tools/studio-budgets.ts` copies `STUDIO_BODY_BUDGET` of `src/models/budget.test.ts`, which this round does not own. Its TSDoc names the test | 4.5 |
| The thin faces of `--check` come from `check.thin` of the config: a corner angle, a length of the longest edge, and the distance from that edge to a joint of the arms or the legs. The brief named a corner angle and a length, and the distance says which joint is near. The rabbit takes the sliver angle (10°), and the shortest edge (0.08 u) and the radius (0.1 u) of its ring at the left elbow. The check reads the bind mesh of the export, so the face numbers are the faces of the module | 4.4 |
| The app checks of `--check` run `pnpm hold-reach <species>` for a violinist and `pnpm fold-probe <role>` for each role with the body of the animal, through the copy of `--glb`. With no entry in `ANIMALS` or no species with the body, they do not run, and the measures of the export take a seated role that also stands at the shoulders of the config | 4.4 |
| The module size of `--check` is the gzip size of the module after the formatter of the repository (`writeStudioModule()`), at the default level of Node zlib, as `pnpm size` measures. The packed mesh gets its own line against the budget of the test | 7.2 |
| The section of a mesh with no skeleton goes at the end of `docs/briefs/studio-body.md` as section 7, so that the pointers to its sections 1 and 5 stay true | 9.8 |
| The research report gives a decision for each retro item. Where the brief of the manager names none, the agent records the round of the task that did the item, or the reason to skip it | 9.8 |
