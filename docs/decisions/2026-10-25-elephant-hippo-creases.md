# Decisions of the creases of the elephant timpanist and the hippo bassist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the manager asked for three fixes: the upper arms of the elephant timpanist 3.4 cm
in the belly, short light and dark creases at its inner elbows from the front, and a dark crease
under the left arm of the hippo bassist. The round first proved the cause of each crease. The
report [`2026-10-25-elephant-hippo-creases.md`](../research/2026-10-25-elephant-hippo-creases.md)
gives the measures and the images. The user can reverse each decision. Then update its section,
and remove its row.

| Decision | Section |
|---|---|
| The elbow creases of the elephant are a split of the smooth normals: the bind bends each elbow about 62°, and the colors probe and the fold probe show no dark face and no fold there. | 4.4 |
| The faces within 0.07 units of each elephant elbow joint take the skin normals (`rootNormals.elbow`, `root_rim()` of `tools/blender/rig_mesh.py`). With 0.055 and 0.06, light slivers stayed, and 0.08 smoothed more facets of the forearms. | 4.4 |
| The dark crease under the left arm of the hippo is the same split at the arm root: with no shadow, its hard edge stays, and the colors probe shows no dark face and the fold probe no fold of the left arm. | 4.4 |
| The hippo takes `rootNormals.radius` 0.1 units. With 0.14 and 0.18, the arms and the shoulders lost their facets at ±35°. The soft dark under the arm that stays is the shadow and the down-facing skin of a real armpit. | 4.4 |
| The timpani elbows point a little out: the pole x goes from 0.45 to 0.8 (`PERCUSSION_HOLDS.timpani`). The upper arms then go 2.9 cm into the belly (3.4 cm), and the back shows no gap. The mallets keep their targets and their strike directions, and turn at most 10° between strikes. | 5.3 |
| The elbow pole cannot bring the upper arms to 1.8 cm: the depth stays 2.7 cm or more up to the pole x 1.2, and with the elbows forward. The pole x 0.6 gave 3.1 cm, above the accepted 3.0 cm. | 5.3, 9.3 |
| Open: a soft dark patch stays at the inner left elbow of the hippo from the left side, also with no shadow. | 4.4 |
| Open: a short light sliver stays at the inner root of the right elephant arm, near the tusk. | 4.4 |
