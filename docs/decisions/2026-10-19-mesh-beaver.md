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
| Question: arms 1.6 with a bassoon of about 0.85, or arms 1.4 with 0.75? The user: "Arms 1.5, bassoon ~0.8". The arm factor is 1.5 (`armFactor`), and the hold fit sets the bassoon scale (`bassoonScale`). | 4.4, 4.6 |
| Question: the seat of the legs is 0.072 m, so keep the chair? The user: "No chair, as the mouse". The app builds no chair under the beaver (`SpeciesParams.noChair`), and the broad tail lies on the floor behind it. | 4.4, 4.5 |
| The legs keep the mesh, with the thighs 25° down and 15° out (`studio.legTurns`). The small ears follow the head, the dark nose takes the gloss, and the crease angle is 35°. | 4.4, 4.5 |
| The two tail bones turn rigidly, 10° and 25° below the level, so that the tail end lies at the height of the soles (`studio.tailBind`, report "Tail"). | 4.4 |
| The mesh keeps the orange-brown colors of its texture, with no tone rule (`colors`). Open: the tone rule of the hippo, the mouse, and the elephant. | 4.5 |
| The reed sits under the front teeth (`lipShift` of `BEAVER_BASSOON`, report "Reed and bocal"). | 5.3 |
| The bocal rises to its top, then comes down to the reed nearly level in the play turn (`bassoonParts()`, report "Reed and bocal"). | 4.6, 5.3 |
| The right shoulder bone turns 15° and the left 20° forward, because the front of the left shoulder folds at 15° (`BEAVER_SHOULDER_TURN`, report "Hold"). | 5.3 |
| Both elbows point down, out, and forward, the smallest arm turns of 3 elbow directions (`poleL`, `poleR`, `hold-fit-poles.txt`). | 5.3 |
| The bassoon scale is 0.82, the largest at which each paw has 3 cm to spare in the play and in the rest (report "Hold"). | 4.6 |
| The role `bassoonist` is in `SWEEP_ROLES`, `FOLD_ROLES`, and `ROLE_VIEWS`, with 9 open loops (`BEAVER_BODY_LOOPS`). The sweep accepts 1.6 cm of the paws in the bassoon in the lift and the lowering, where the left paw closes on the wing joint (`BASSOONIST_SWEEP`, report "Clearance"). | 9.3 |
| The first download grows by 30,153 B to 624,160 B with the beaver body (`pnpm size --base 9a4613b4`). | 7.2 |
| Both armpits take the cut of the panda below 0.6 source units, because no ring, flip, or rigid weight removed the play folds of the thin faces between the upper arm and the chest (`cut`, report "The arm cut"). | 4.4 |
| One shape of the left arm on the cut mesh removes each play fold with the same hold, and the right arm needs no shape (`raise`, report "The arm cut"). | 4.4 |
| Open: three faces of the left arm fold in each rest sample and in 13% of the lift, as before, and a dark slot shows at the cap of the cut (`fold-probe-arm.txt`). | 4.4, 9.3 |
