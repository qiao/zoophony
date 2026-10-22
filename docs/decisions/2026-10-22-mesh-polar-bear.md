# Decisions of the polar bear mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-22, the user said: "replace the models of bear and polar bear by the following: [...]
~/Downloads/Meshy_AI_polar_bear_remeshed_3_1022064636_texture.glb Make sure that you take
screenshots and validate its motion from all 4 angles". The user slept, so the agent of the round
`mesh-polar-bear` chose the rows with no quote of the user by the measures and the user rules. The
report [`2026-10-22-mesh-polar-bear.md`](../research/2026-10-22-mesh-polar-bear.md) gives the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the polar bear pianist gets the mesh as a studio body (`tools/mesh-rigs/polar-bear.json`) in place of the studio polar bear of `lowpoly-studio/`. The files of the studio stay. | 4.3, 4.4 |
| Size: 1.929 m for each unit, so the standing skull top is 1.923 m, as on the studio polar bear. Seated, the head top is 1.83 m (+4%) (`app`). | 4.4 |
| Seat: the piano bench fits the short legs, 0.17 m, and the soles touch the floor. The rig names its seat prop `bench` (`chair.prop`). | 4.4, 4.5 |
| The user chose "Keep 1.25x arms" over a larger polar bear and the arms of the file with more lean (2026-10-22). Arms: the factor 1.25 (reach 0.68 m, 0.55 m with 1), the smallest factor that reaches each note with the muzzle 5 cm from the lid. A cut frees each arm, and a twist bone keeps 0.55 of the roll (`armFactor`, `cut`, `upperTwist`). | 4.4, 4.7 |
| Shoulder skin: the clavicle fades out higher (`clavicleFrom`), two faces at the left shoulder move as one (`rigid`), and three shapes relax the faces that fold at the shoulders and the right elbow (`raise`). Then the arm gate passes. | 4.4 |
| Hold: the keys 1.5 H + 0.05 m in front of the floor point, a lean of 28°, the palm 0.12 m in front of the keys and 0.09 m above them, and the elbows out and a little down (`PIANO_FRONT_H`, `HANDS_HOLDS.piano`). | 4.6, 5.3 |
| Colors: the cream fur takes 1.045 of its lightness and 0.3 of its chroma, near the white of `polar-bear-views.png` (`colors.shift`). | 4.5 |
| Face: a dark line on the lower lip gives a small smile (`colors.smile`). | 4.5 |
| The crease angle is 15°, the angle of a bear (`ANIMALS`). | 4.4 |
| Accepted limits: the upper arms go up to 10 cm into the sides of the belly in a play and 12 cm in the lowering, and the left paw 3 cm into the belly front in the lowering (`PIANIST_SWEEP` of `pose/test-sweep-roles.ts`). | 5.3, 9.3 |
| The accepted grip of the pianist is the median of the new grip: 48° and 47° (`ACCEPTED_GRIPS`). | 9.3 |
| The tail ball takes the whole short tail (radius 0.07 u), so that the sit of the haunch pulls no spike from its root (`tailBall`). | 4.4 |
