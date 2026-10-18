# Decisions of the retro of the panda mesh round

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, after the merge of the panda mesh, the manager of the session chose three of the
seven items of the retro (user rule of 2026-10-12, `docs/briefs/studio-body.md`, section 6). The
first four rows give the choices of the manager. The agent of the branch `mesh-retro` decided the
other rows. The report [`2026-10-18-mesh-retro.md`](../research/2026-10-18-mesh-retro.md) gives
the times and the measures. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| The manager chose items 1, 4, and 6: the early checks of a new body, the probes of the real body in phase 1, and a saved tool of the mid-report (`docs/briefs/studio-body.md`, section 7, `tools/glb-swap.ts`, `pnpm mesh-options`). | 9.8 |
| Items 2 (a warning for a seat set by the thighs) and 3 (a warning for an eye in a dark patch) come after the fold round of the panda, because they change the same rig files. | 9.8 |
| Item 5 (fold tools) waits for the result of the fold round of the panda. | 9.8 |
| Item 7 (a script that moves the probes into the research folder) is not worth its cost. | 9.8 |
| A species with no studio body takes the body of `--glb` when `tools/mesh-rigs/<species>.json` exists. The copy adds the module, its entry of `STUDIO_BODIES`, the body of the species, and a scratch entry of `ANIMALS` from `app.shoulders` (`addScratchBody()`). | 4.4 |
| The scratch entry is the seated soloist of `pnpm rig-mesh --check`, with the crease angle 0 (`scratchSettings()`), so the swap and the check export one body. The angle changes only the normals, which no probe reads. | 4.4 |
| `pnpm hold-reach --instrument` takes each wind instrument, and a trombone prints `slideReach`. Three of the four next meshes play a wind instrument (`windReachLines()`, `slideReach()`). | 4.6 |
| A size of `pnpm mesh-options` is the standing skull top: the highest vertex within 0.03 u of the middle plane (`HEAD_STRIP`), as the head top of the panda round. The ears stay out. | 4.4 |
| `pnpm mesh-options` calls `blenderArgs()` and `measureRig()` of `pnpm rig-mesh --check` in place of the command, so that it keeps the GLB file of each variant for `pnpm hold-reach --glb`. | 4.4 |
| The round gives no `--glb` to `pnpm hold-fit`, `pnpm pose-depth`, and `pnpm body-probe`. A new role has no entry of `FOLD_ROLES` or `SWEEP_ROLES` in phase 1, and the fold round of the panda can change these tools. | 9.8 |
