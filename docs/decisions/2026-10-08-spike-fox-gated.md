# Decisions of the gated fox spike (route B)

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-08, the agent of route B of the fox spike decided the details below. The spike tests a
new way to make the animal models and changes no app code. The report
[`2026-10-08-fox-spike-gated.md`](../research/2026-10-08-fox-spike-gated.md) gives the method and
the measures. The user can reverse each one. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| The silhouette gate of a model compares a render on the camera of its sheet with a matte of the sheet, pixel for pixel, and gives the IoU of each view. The matte has three values: fox (255), ignored (128: the chair, the instrument, and the bow), and background (0). The gate counts no ignored pixel | 4.4 |
| The matte of `fox-views.png` is `docs/research/2026-10-08-fox-spike-gated/fox-matte.png`. The chair is the gold hue below row 515 with an edge of 3 px, and the violins and the bows are hand-read polygons (`tools/spike/fox-gated/sheet_matte.py`) | 4.4 |
| When the views of a sheet disagree, one view rules each part: the back view of `fox-views.png` carves only the head and the body, and no view carves the tail | 4.4 |
