# Decisions of the face of the panda

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

The user said on 2026-10-18: "the panda look very sad. make it smile/ more positive". After the
mock of the round `panda-smile` (phase 1), the user chose "1: Round patches, no smile" and "Thin
smile line". The agent of the branch `panda-smile` decided the other rows. The report
[`2026-10-18-panda-face.md`](../research/2026-10-18-panda-face.md) gives the measures, the probes,
and the images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the panda look very sad. make it smile/ more positive", then "1: Round patches, no smile" and "Thin smile line". The manager reads the two answers together: the round patches of variant 1, plus a thin smile line in place of the wide smile of the mock. | 4.4, 4.5 |
| The patches become round by a recolor: the 18 dark faces of the sharp inner points take the color of the nearest light fur face (`colors.patch`). No vertex moves, and the pea eyes keep their places. | 4.4 |
| The smile line has two bands (`colors.smile`): the top of the lower lip along the crease, and the underside of the upper lip at the corners, so that the corners rise 4.4 cm and show beside the mouthpiece. The first band alone hides behind the mouthpiece. | 4.4, 4.5 |
| The smile takes the dark of the eye patches, so the palette of the mesh gets no new color. | 4.5 |
