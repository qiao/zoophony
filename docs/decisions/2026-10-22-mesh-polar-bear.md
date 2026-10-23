# Decisions of the polar bear mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "replace the models of bear and polar bear by the following: [...]
~/Downloads/Meshy_AI_polar_bear_remeshed_3_1022064636_texture.glb Make sure that you take
screenshots and validate its motion from all 4 angles". The user slept, so the agent of the round
`mesh-polar-bear` chose the rows with no quote of the user by the measures and the user rules. The
report [`2026-10-22-mesh-polar-bear.md`](../research/2026-10-22-mesh-polar-bear.md) gives the
measures. Later the same day the user asked for the studio polar bear again ([`2026-10-22-studio-bears.md`](2026-10-22-studio-bears.md)), so the rows of the app went. The rows below hold for the rig config `tools/mesh-rigs/polar-bear.json`, which the app does not read now. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| Seat: the piano bench fits the short legs, and the soles touch the floor. The rig names its seat prop `bench` (`chair.prop`). The seat of `2026-10-22-polar-seat.md` gives the legs and the bench. | 4.4, 4.5 |
| The user chose "Keep 1.25x arms" over a larger polar bear and the arms of the file with more lean (2026-10-22). Arms: the factor 1.25 (reach 0.68 m, 0.55 m with 1), the smallest factor that reaches each note with the muzzle 5 cm from the lid. A cut frees each arm, and a twist bone keeps 0.55 of the roll (`armFactor`, `cut`, `upperTwist`). | 4.4, 4.7 |
| Shoulder skin: the clavicle fades out higher (`clavicleFrom`), two faces at the left shoulder move as one (`rigid`), and three shapes relax the faces that fold at the shoulders and the right elbow (`raise`). Then the arm gate passes. | 4.4 |
| Colors: the cream fur takes 1.045 of its lightness and 0.3 of its chroma, near the white of `polar-bear-views.png` (`colors.shift`). | 4.5 |
| Face: a dark line on the lower lip gives a small smile (`colors.smile`). | 4.5 |
| The tail ball takes the whole short tail (radius 0.07 u), so that the sit of the haunch pulls no spike from its root (`tailBall`). | 4.4 |
