# Decisions of the frame performance

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "optimize the web performance of this repo". The manager of the
session `zoophony-30` gave the time of each frame to the round `perf-frame`, and the load to the
round `perf-load`. The agent of `perf-frame` decided the other rows. The report
[`2026-10-21-frame-performance.md`](../research/2026-10-21-frame-performance.md) gives the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user on 2026-10-14: "we can do a sweep of performance improvements later". The manager: this round is that sweep, so the rule "Frame time" of `AGENTS.md` is back. It replaces the last row of `2026-10-14-test-pause.md`. CI has no GPU, so the check stays local (`pnpm frame`). | 9.2, 9.7 |
| The stage computes the world matrices and the bone matrices one time before the first render of a frame, and `FrameSkeleton` keeps them until its end, so three.js does not compute them in each of its three renders (`holdSkeletons()` of `scene/player.ts`). | 4.5 |
| Each program variant of the players (the skin, the morph targets, the attributes) gets its own copy of the shared material, a depth material for the shadow maps, and one for the depth passes, so no draw looks up its program again (`VariantMaterials` of `scene/variants.ts`). | 4.5 |
| `VariantMaterials.opaqueSort()` sorts the copies by the id of the shared material, so the players keep their order of draws. The order of the ids of the copies changed 1 or 2 pixels of each frozen frame. | 4.5 |
| The haze cone has one material for each side, with one group each over all faces. three.js changed the side of one material with both sides two times in each frame, and looked up its program each time (`createBeam()`). | 4.5 |
| Each pass draws a player only when its view or shadow camera sees the sphere of the pose of the frame (`fitPoseSphere()` of `scene/bounds.ts`). The sphere holds each bone sphere of the bind pose with the morph moves, moved by the bone matrix. | 4.5 |
| The bones of each player hang in a hidden group at the origin of the mesh, so three.js does not visit them in each pass. A product with the identity matrix is exact, so the bone matrices do not change (`createBoneGroup()` of `scene/player.ts`). | 4.5 |
| The changes of the look stay out of the code until the user chooses: the patches and their images are in `docs/research/2026-10-21-frame-performance/options/`. | 9.7 |
| A window at 50 Hz or 30 fps keeps the tier while 90% of its kept intervals lie in the band of the rate, with their mean within 10% of it, and the trimmed mean is at most 1.08 times the interval, as at 60 Hz (`slowWindow()`). | 2.6 |
