# Decisions of the left shoulder folds and the fur white of the panda

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

After the images of the round `panda-mesh` on 2026-10-18, the user chose "Merge now, fix folds next
(Recommended)" and "Reference white (Recommended)". The agent of the branch `panda-folds` decided
the other rows. The report [`2026-10-18-panda-folds.md`](../research/2026-10-18-panda-folds.md)
gives the measures, the probes, and the images. The user can reverse each decision. Then update
its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "Merge now, fix folds next (Recommended)" and "Reference white (Recommended)". A short round fixes the folds of the left shoulder, and the white fur moves to the white of `SPECIES_COLORS.panda`. | 4.4, 5.3 |
| The white fur takes the full step: its faces get the chroma and the hue of `SPECIES_COLORS.panda`, with the lightness of the mesh (`colors.tone` of `tools/mesh-rigs/panda.json`). At the same lightness, the gallery renders match the parametric panda of that color. | 4.4, 4.5 |
| The dark band across the belly in the gallery front view of the first position is the shadow of the left arm: with no received shadows, it goes. It stays, and the left turn of `2026-10-18-trombone-fit.md` makes it larger. | 4.4 |
