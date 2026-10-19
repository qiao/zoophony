# Decisions of the mouse mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-18, the user said: "use the mouse model at
@~/Downloads/Meshy_AI_mouse_remeshed_3k_tri_1019060744_texture.glb" and "do not ask me any
questions". So the agent of the branch `mesh-mouse` took the options that the user chose for the
cat, the dog, the panda, and the hippo, and decided the other rows. The report
[`2026-10-19-mouse-mesh.md`](../research/2026-10-19-mouse-mesh.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quotes above: the oboe mice get the mesh as a studio body (`tools/mesh-rigs/mouse.json`, `SPECIES.mouse`), with the pea eyes of the app. | 4.3, 4.4 |
| The arm factor 1.4 gives arms of 0.91 of the trunk, as the red fox (`armFactor`). | 4.4 |
| The legs keep the mesh, and the seat height fits them. The thighs slope 25° down and turn 15° out (`studio.legTurns`, `chair`). | 4.4, 4.5 |
| A nose box gives the pink nose the gloss, because the front-most fur vertex of the head is a whisker tip, and the mouth lay 0.33 m to the right (`colors.noseBox`). | 4.4 |
| Each plain face takes the hue and the chroma of `SPECIES_COLORS.mouse` with its own lightness (`colors.tone`), as the user chose the reference white of the panda. | 4.5 |
| The long tail has two bones that turn rigidly (`studio.tailBind`): it goes back from the haunch and lies flat on the floor behind the body, and it sways. | 4.4, 5.1 |
| The large round ears follow the head, the crease angle is 35°, and the mouse stands as the oboe soloist (`ANIMALS`). | 4.4 |
| The reed sits in the mouth under the long muzzle (`lipShift`), and the oboe hangs 40° from the vertical, as Cline gives (`MOUSE_OBOE`). | 5.3 |
| Both elbows point down, out, and forward (`poleL`, `poleR`). With the right elbow out and level, the upper arms twisted into flat bands. | 5.3 |
| The oboe does not rest on a leg, because the round belly covers the short thighs. | 5.2 |
| Two raise rules of the left arm and one rigid face of the left shoulder remove the folds of the play and the rest (`raise`, `weights.rigid`). | 4.4 |
| The role `oboist` is in `SWEEP_ROLES`, `FOLD_ROLES`, and `ROLE_VIEWS`. The closed body has 14 open loops (`MOUSE_BODY_LOOPS`). | 9.3 |
| The first download grows by 27,231 B to 563,246 B with the arm shapes (`pnpm size --base main`). | 7.2 |
| Open: the paws hold the oboe at the height of the shoulders, higher than a real oboist, because the big head puts the reed high above the shoulder joints. | 5.3 |
