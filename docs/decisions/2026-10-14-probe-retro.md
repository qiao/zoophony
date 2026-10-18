# Decisions of the retro of the form and neck rounds

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, after the merge of the higher bench of the polar bear (`961e3c4a`), the manager of
the session chose the probe items of the retro of the form round and of the neck round. The
agent of the branch `retro-probe` decided the rows below. The report
[`2026-10-14-probe-retro.md`](../research/2026-10-14-probe-retro.md) gives the times and the break
commands. The user can reverse each decision. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| `traceShots()` is a pure function beside `prepareShots()`, and `prepareShots()` keeps its signature. Both call one planner, which writes a trace only when it has one. The camera tests give their first refusal in place of a boolean, in the same order, so the plans of the 14 demos and the 4 chamber test files stay the same, byte for byte. | 5.6 |
| The trace of a camera that failed a kept test at an earlier cut takes the refusal of that test. The planner writes the refusal of each kept test at each cut, also outside the range, so the trace of a cut does not depend on the range. | 5.6 |
| A refusal by the distance gives the largest share of the default distance over the samples of the move and the aspects of the beam test. The planner calculates it only for a trace. | 5.6 |
| A trace counts the cameras farther from the front of the subject than its limit, and lists only the cameras that reach a test. A full search skips hundreds of such cameras at each cut. | 5.6 |
| `pnpm shot-trace` takes a demo or a chamber test file of the shot tests, because the two-shot of the form round was in the duo of the chamber test files. With `--base`, a commit with no `traceShots()` gives only its shots: the tool reads the export of the module of the commit at run time. | 9.3 |
| `pnpm hold-fit --grid` takes three numbers with the unit `deg` on all or on none. The limit of 40 variants holds for the product of the grids, and the variants of `--set` come before them. A run with a grid sorts the variants by the share of the play folds, then by the largest depth less its limit over the sample sets. The base row stays first. | 9.3 |
| The best variant of `pnpm hold-fit --faces` is the first variant of the sorted rows, also with no grid. | 9.3 |
| The bone of a fold is the bone whose turn from its parent changes the normal of the face most at the worst sample of the face: each corner takes the skin matrix of the parent of the bone in place of its own. The worst sample is the sample with the largest angle between the posed normal and the moved bind normal. | 4.4 |
| `pnpm fold-probe --base` gives a face the index of the other tree when the corners of both bodies are the same (a SHA-256 of the corners). Else the same face is the folded face of the other tree with the nearest middle in the bind pose, within 1 cm. A face with no partner is `new` or `gone`. | 4.4 |
| `pnpm hold-reach --size` grows the violin from its tail end along its axis in the playing pose, as the rule of a violin shop does. A column rebuilds the player at each scale as a check, and the rebuilt reach of the rabbit agrees within 1 mm. The arm factor of the rig comes from `armReach()` of `tools/rig-mesh.ts`, so the paw keeps its size. | 4.6 |
| The option `--size` comes out of the arguments of `pnpm hold-reach` before `parseReachOptions()`, so the usage line and the options of the flute round stay as they are. | 9.3 |
