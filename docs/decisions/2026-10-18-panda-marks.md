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
| The gray streaks under the arms stay. The app skins the normals of the seam corners with their upper arm weight, so a corrective shape of the trunk side does not remove them, and trunk weights at the seam fold faces in each sample (section 4 of the report). | 4.4 |
| The dark band across the belly in the front view of the play pose and the other dark areas beside the arms are cast shadows of the arms and paws, and they stay. | 4.4 |
