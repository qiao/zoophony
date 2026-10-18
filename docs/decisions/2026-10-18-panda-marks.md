# Decisions of the dark marks on the torso of the panda

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "there's unexpected black marks on the torso. fix that". The user did
not say which marks. The agent of the branch `panda-marks` decided the rows. The report
[`2026-10-18-panda-marks.md`](../research/2026-10-18-panda-marks.md) gives the six marks, their
faces, the probes, and the images. The user can reverse each decision. Then update its section, and
remove its row.

| Decision | Section |
|---|---|
| The user: "there's unexpected black marks on the torso. fix that". The 7 faces at the lower border of the black band under the arms with less than half dark texture samples take the color of the nearest light fur face, so that the black wedges go (`colors.border` of `tools/mesh-rigs/panda.json`). | 4.4, 4.5 |
| The manager: trunk weights at the seam with a fix of the folds, then new vertices. Both failed, so the gray streaks stay: the corners that join the forearm to the belly also top the streak faces (`docs/research/2026-10-18-panda-seam.md`). | 4.4 |
| The user: "Move vertices, open a gap (Recommended)", in place of the rule of 2026-10-10 for the seam vertices of the panda. A gap of 1 cm to 2 cm keeps the faces that join the forearm to the belly and their folds, so no vertex moves (section 4 of the seam report). | 4.4 |
| The manager: ship the trunk weights at the seam when the faces that they turn over do not show. A visibility probe finds faces 93 and 2115 in up to 190 pixels at 1440 x 900, so the weights do not ship (section 5 of the seam report). | 4.4 |
| The dark band across the belly in the front view of the play pose and the other dark areas beside the arms are cast shadows of the arms and paws, and they stay. | 4.4 |
