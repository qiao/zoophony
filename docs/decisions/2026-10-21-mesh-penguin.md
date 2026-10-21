# Decisions of the penguin mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-21, the user said: "use the following models: [...] 3. penguine: ...penguin...glb [...]
make the rhino and penguine stand. make sure the size of these models are similar to that of the
previous parametric model". The user slept, so the agent of the round `mesh-penguin` chose the rows
with no quote of the user by the measures and the user rules. The report
[`2026-10-21-mesh-penguin.md`](../research/2026-10-21-mesh-penguin.md) gives the measures, and its
folder keeps the variants and `options.md`. The user can reverse each decision. Then update its
section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the choir penguin gets the mesh as a studio body (`tools/mesh-rigs/penguin.json`), and stands on its riser. This newest decision replaces the egg body of `2026-10-11-penguin-body.md`, so the egg body code leaves. | 4.3, 4.4 |
| Size: the crown takes the head top of the egg penguin, 1.043 m (`2026-10-19-mouse-size.md`): 1.043 m for each unit, H 0.218 m. The standing head top is 1.044 m, +0.1% (`app`). | 1, 4.4 |
| Flippers: the arm bones of the route, with the factor 1 (reach 0.238 m), by the rule of 2026-10-10. Each flipper is free of the body below its root, so the split plane at 0.226 u frees it with no cut (`armSplit`). | 4.4, 4.7 |
| The upper arm of the bind points 40° below the level. With the bind arm of the other meshes, 13 faces at the roots of the flippers folded in each sample, and 4 now (`studio.bindArms`). | 4.4 |
| The folder comes to the flippers: 1.25 H below and 1.1 H in front of the head center, with covers of 0.22 m. Its middle is 0.37 of the body height below the crown, against 0.51 to 0.56 in the reference images (`CHOIR_FOLDER`, `options.md` B). | 4.6, 5.3 |
| Colors: the pale yellow throat takes the chroma of the white belly, as the penguins of the reference images. The black, the white, and the orange keep the texture (`colors.shift`). | 4.5 |
| Balance: the center of mass is 2.9 cm behind the middle of the soles at a note, at 34% of the support depth from the heels, and 6.4 cm inside the edge (`balance.txt`). | 4.4 |
| The role `singer` is in `SWEEP_ROLES`, `FOLD_ROLES`, `ROLE_VIEWS`, and `ACCEPTED_GRIPS`, with each palm on its grip at each note start (`singerTargets()`). | 9.3 |
| The crease angle is 35°, the angle of the other meshes, with no facet probe against the reference crops (`ANIMALS`). | 4.4 |
