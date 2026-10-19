# Decisions of the retro of the elephant arm rounds

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

After the merge of the elephant arm rounds, the manager asked their agent what would make the next
round faster. The tool round `retro-arms` built the four items of the brief. The report
[`2026-10-19-arms-retro.md`](../research/2026-10-19-arms-retro.md) gives the times and the
outputs. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| After the merge of the elephant arm rounds, the manager asked their agent what would make the next round faster (user rule of 2026-10-12), and chose the items of the brief. | 9.8 |
| The gallery takes the query `probe=colors`, `normals`, or `noshadow`: each body with its face colors and no light, with its normals as colors, or with no shadow on it. The instrument keeps its look (`applyProbe()` of `src/gallery/probe.ts`). | 7.1 |
| `pnpm close-views <role> --probe <probe,...>` renders one grid for each probe from one build. With `--base`, the build of the commit takes `src/gallery` of the working tree (`probeViews()`). | 9.8 |
| The probe adds 45 B to the first download: the class `MeshNormalMaterial` of three.js goes into the chunk that the app and the gallery share. | 7.2 |
| `pnpm close-views play --at <seat\|species>` aims the stage camera at the middle of the body of the player, from each `--azimuth` (0 is the front of the player), at `--zoom` (1 shows the whole body) and `--elevation` (`aimPose()`). | 9.8 |
| The camera of `--at` comes from a plugin of the build of the tool, which makes `StageCamera` follow the camera of the query `aim`. The app gets no camera query, so the app and its first download stay the same (`aimPlugin()`). | 2.5, 9.8 |
| The elevation of `--at` is 20° by default. At 10°, the players in front of the elephant timpanist hid most of its body (`AIM_ELEVATION`). | 9.8 |
| The turn column of `pnpm hold-fit` gives the twist and the swing of the mean turn of each paw on its forearm, around the bind axis of the forearm, as `twist.ts` of the elephant round did (`pawAngles()`, format 14). | 9.8 |
| Each deepest point of `pnpm pose-depth` gives the time to the next note start of its hand and the height of a mallet head above its target, as `wait.ts` of the elephant round did. The bone of the point gives the hand (`pairPhase()`, format 4). | 9.3 |
| Shorter rows of six commands keep each option and bring `docs/agents/commands.md` from 3,066 to 3,009 words. | 9.6 |
