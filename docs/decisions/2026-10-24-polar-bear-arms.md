# Decisions of the polar bear arms

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user saw the rebuilt arms of the Rigify rabbit and said: "now apply similar
techniques to the polars bear". The user was awake, and the round asked no questions. The report
[`2026-10-24-polar-bear-arms.md`](../research/2026-10-24-polar-bear-arms.md) gives the measures and
the images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "now apply similar techniques to the polars bear". Each arm takes a quad tube of 15 rings of 16 from the shoulder line (x 0.154) to the wrist, on the old surface, with the fur color baked onto it. The user file stays (`polar-bear-arms.glb`, `polar_bear_arms.py`). | 4.4 |
| The rig keeps the app route: no baked clip and no Rigify rig. Each arm part has 4 deform segments, and each elbow and wrist a helper. `poseArm()` turns them from the joints of the pose. They replace `upperTwist`. | 4.4, 4.7 |
| A segment takes the share of the twist at its middle, (k + 0.5) / 4. A helper turns halfway across its joint, as the Copy Rotation at 0.5 of the rabbit (`segmentShare()`, `driven_turns()`). | 4.7 |
| The arms, the clavicles, the neck, and the head take the automatic weights of Blender and 3 Weight Paint fixes (`paint_weights()`). The hips, the trunk up to the chest, the legs, and the tail keep the rule weights (`paintedLower`). | 4.4 |
| The rule weights stay on the trunk because Blender weights on spine and spine1 folded a V on the lower back over the bench, and on the chest cut a slit into each trunk side under the arm. | 4.4 |
| The rings of a joint stand 0.015 units (2.9 cm) apart, twice the gap of the rabbit, because the bear arm is about twice as thick. | 4.4 |
| The arm image goes into a strip of 1024 pixels on top of the atlas, so that the mesh keeps one material for `pnpm rig-mesh`. | 4.4 |
| The arms keep the length of `main` (`armFactor` 1), and the size, the seat, and the keys of `2026-10-24-polar-bear-seat.md` stay. | 4.4 |
| Open: the faces of the arm root between the trunk and the shoulder line stay the long faces of the user, and the shoulder top shows a flat facet at rest from the back. In the bind, 5 faces of spine1 turn over (2 on `main`). | 4.4, 9.3 |
