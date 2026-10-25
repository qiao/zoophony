# Decisions of the rebuilt arms of the elephant timpanist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user allowed loop edges, retopology, and extra bones for the arm and wrist
twist ("add loop edges and retopology and additional bones if needed to address them"). On
2026-10-23, the user had said about this mesh: "do not cut its arm or create a dent in the arm",
and asked "why are you remeshing while rigging?". The permission of 2026-10-24 is newer, so this
round follows it, and the new faces keep the surface of the arm. The manager asked to rebuild the elephant arms with the method of the rabbit, the mouse, the
wolf, and the cat, because dark slits and shards showed on both upper arms in each moment. The
report [`2026-10-25-elephant-arms.md`](../research/2026-10-25-elephant-arms.md) gives the
measures and the images. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The elephant gets quad arm tubes in a copy of its mesh (`elephant-arms.glb`, `tools/blender/elephant_arms.py`), Blender weights, and arm segments. The tubes lie on the arms of the mesh with their length and thickness: no cut into the arm surface and no dent. They replace `upperTwist` and the `raise` shapes. | 4.4 |
| The shoulder cut lies at 0.4 of the upper arm with no tilt, and the wrist cut at 0.3 of the paw. A tilt of 20° and wrist cuts at 0.1 and 0.2 crossed the nearest ring on this thick arm and turned bridge faces over. | 4.4 |
| The elbow rings stand 0.026 units from the joint (helper 0.052). With 0.016, the left arm folded 10 faces in the gate (limit 8). With 0.022, the right arm folded 9. | 4.4 |
| Collapse Edges cleans the thin faces under each armpit (`cleanPit`), and the root Smooth spans the top of the shoulder (`paint.root`): the long source faces there folded in each pose. | 4.4 |
| Only the toes keep the colors of the source (`colors.tone.keep`): with the fingers kept, the tops of the paws showed the warm pink of the texture. | 4.5 |
| The arm gate gives the right flat p5 0.76 (0.87 on `main`, limit 0.55), past the margin of 0.05, at the shoulder ring. The left arm goes from 0.71 to 0.83, so the worse arm improves. The manager decides. | 9.3 |
| Open: the upper arms go 3.4 cm into the belly (1.8 cm on `main`, accepted 3.0 cm), at the inner side near the elbow. Each tube variant gave 2.4 cm or more. The elbows of `PERCUSSION_HOLDS.timpani` decide it. | 5.2, 9.3 |
| Open: short light and dark creases show at each inner elbow from the front, where the thick arm bends about 90°. Five elbow rings made them sharper. | 4.4 |
