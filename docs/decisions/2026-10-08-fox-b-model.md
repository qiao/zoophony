# Decisions of the route B fox model

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-08, the agent of branch `fox-b-model` decided the details below. The work improves
the route B fox of the spike and changes no app code. The report
[`2026-10-08-fox-b-model.md`](../research/2026-10-08-fox-b-model.md) gives the method and the
measures. The user can reverse each one. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The tools stay in `tools/spike/fox-gated/`. A move to `tools/models/fox/` waits until the branch `fox-b-app` is merged, because that branch works on the same fox at the same time | 4.4 |
| The low-poly pass makes even triangles with an isotropic remesh, then snaps groups of about 5 faces (8 on the body) to shared planes with a strength of 0.75 (`tools/spike/fox-gated/facets.py`) | 4.4 |
| The facet targets: an area ratio p90 / p10 of 3 or less, and the planes counted with an angle of 8 degrees in the face and the thigh regions (`facet_metrics.py`) | 4.4 |
| The contour fit moves the outline of the front and side views to the sheet fox: 3 passes before the planes and 1 after, at most 15 mm for each pass. It skips the tail and the vertices within 6 px of an ignored pixel | 4.4 |
| The current matte of `fox-views.png` is `docs/research/2026-10-08-fox-b-model/fox-matte.png`, with bow lines 8 px wider and the thin fox lines at ignored edges ignored. It replaces the matte row of `2026-10-08-spike-fox-gated.md` for new runs | 4.4 |
| The proportion measure skips the model pixels on ignored pixels of the matte, as the gate does | 4.4 |
| The head keeps its width. The 45 mm gap of the spike came from the bow hair in the matte | 4.4 |
| The thighs stay oval cones (1.45 lower than wide). Rounded box thighs merged into one block in the front view | 4.4 |
