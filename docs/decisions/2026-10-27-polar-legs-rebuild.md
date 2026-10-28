# Decisions of the polar bear leg rebuild

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the user said: "the polar bear's knee is still more bulky than expected. check the
original mesh for reference", and after the round `sixth-wolf-knee`: "the bear's knee is still
much bulkier than expected. it's not anatomically correct". The same round rebuilt each leg as a
quad tube. The report
[`2026-10-27-polar-legs-rebuild.md`](../research/2026-10-27-polar-legs-rebuild.md) gives the
measures. The rows replace the knee rows of the rounds `fifth-bears`, `fifth-legs`, `rigs3`, and
`sixth-wolf-knee`. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| The user: "it's not anatomically correct". Each leg gets a quad tube from the haunch line below the crotch to the ankle in a copy of the mesh (`polar-bear-limbs.glb`, `tools/blender/polar_bear_legs.py`): long source faces from the haunch to the heel made the seated leg a wedge. | 4.4 |
| The tube is built on the legs of the user, before `legFactor` 1.6: the rig stretches the legs only along their bones, so the rings keep their right angles, and the joints and the rules keep the units of the source. | 4.4 |
| The knees take the dual quaternion blend in the seated bind (`bind.knee`): with the linear blend, the knee front was a bevel at 0.83 of the round of the leg, and the knee 0.120 units deep, against 0.148 in the source. | 4.4 |
| The new leg vertices take the rule weights with the knee ramp 0.12 to 0.2 (`paintedLower`, `weights.knee`): the automatic weights of Blender gave a knee front at 0.81 of the round and a seat 8 mm lower, and wider ramps bent the whole thigh tube. | 4.4 |
| The back of each knee is smoothed in 4 rounds, and the calf back is faired (`kneeCrease`): with no smoothing, 43 and 45 edges turned more than 40°, and 12 rounds made the knee 0.115 units wide, against 0.131 in the source. | 4.4 |
| The knee rings, the leg flips, and the rounding of the knee front go (`refine.rings`, `refine.legFlip`, `kneeCrease.front`): the tube has no long face, and the rounding changed no measure of the round knee. | 4.4 |
| The faces near each knee keep the skin normals (`rootNormals.knee`, `rootNormals.kneeFront`): the crease and the front of the right knee keep edges that turn up to 58°. | 4.4 |
| The kept vertices keep the bone heat of `polar-bear-arms.glb` (`heatSource`): with the heat of the new mesh, the crotch weights moved by up to 0.23, the seat top went 7 mm down, and three faces folded in more samples. | 4.4 |
| Two thin faces of the right hip front take one mean of their weights (`weights.rigid`): they folded in each play sample of the pedal leg when the knee rings no longer cut them. | 4.4 |
