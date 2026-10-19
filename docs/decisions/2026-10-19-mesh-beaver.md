# Decisions of the beaver mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-19, the user said: "use the beaver model at
@~/Downloads/Meshy_AI_beaver_remeshed_3k_tr_1019165549_texture.glb". The agent of the branch
`mesh-beaver` asked the user about the arms, the bassoon, and the seat in the mid-report, and
decided the other rows. The report
[`2026-10-19-beaver-mesh.md`](../research/2026-10-19-beaver-mesh.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the bassoon beavers get the mesh as a studio body (`tools/mesh-rigs/beaver.json`, `SPECIES.beaver`), with the pea eyes of the app. | 4.3, 4.4 |
| The size rule of the user ("make it the size of the previous parametric model", `2026-10-19-mouse-size.md`): the standing skull top is at 1.029 m, the head top of the parametric beaver of `9a4613b4` (`app` of the rig config). | 4.4 |
| Question: arms 1.6 with a bassoon of about 0.85, or arms 1.4 with 0.75? The user: "Arms 1.5, bassoon ~0.8". The arm factor is 1.5, arms of 0.81 of the trunk (`armFactor`), and the hold fit sets the bassoon scale (`bassoonScale`). | 4.4, 4.6 |
| Question: the seat of the legs is 0.072 m, so keep the chair? The user: "No chair, as the mouse". The app builds no chair under the beaver (`SpeciesParams.noChair`), and the broad tail lies on the floor behind it. | 4.4, 4.5 |
