# Decisions of the monkey mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user said: "after these are done, use the monkey model at
~/Downloads/Meshy_AI_monkey_remeshed_3k_tr_1020213010_texture.glb". The agent of the round
`mesh-monkey` decided the rows with no quote of the user, in phase 1 and phase 2. The round
`monkey-size` gave the size row. The report
[`2026-10-20-mesh-monkey.md`](../research/2026-10-20-mesh-monkey.md) gives the measures.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the trumpet monkeys get the mesh as a studio body (`tools/mesh-rigs/monkey.json`), with the pea eyes of the app (`SPECIES.monkey`). | 4.3, 4.4 |
| The user, 2026-10-20: "make the monkey 1.1x bigger". The whole monkey is 1.1 times the size of phase 1, the head top of the parametric monkey (`2026-10-19-mouse-size.md`): 1.1726 m for each unit, H 0.334 m, the skull top at 1.132 m (`app`). | 1, 4.4 |
| Question: the arm factor and the trumpet size (report "Arms and trumpet")? The user: "arms 1.5, trumpet at the scale 0.8". The arm factor is 1.5 (`armFactor`), and the trumpet scale is 0.8 (`trumpetScale`). | 4.4, 4.6 |
| Question: the seated monkey looks as if it stands in front of its low chair, so a chair or no chair? The user: "no chair". The monkey stands to play, as the mouse and the beaver do (`SpeciesParams.noChair`). | 4.4, 4.5 |
| Colors: the fur matches `SPECIES_COLORS.monkey` (hue 53° against 54°), so the config has no tone rule. The dark limit 0.02 keeps the hands and the feet a dark brown in place of a dark face (`colors.dark`). | 4.5 |
| Face: the user asks for happy faces. A smile band of 5 faces in a mid brown gives the smile line that the face colors lose, with the corners 1.9 cm up (`colors.smile`). A smile rule with its own color needs no patch rule (`rig_mesh.py`). The user: "keep the smile line" (`face-crops-smile.webp`). | 4.4 |
| The rest is the rest of `WIND_HOLDS.trumpet`: the trumpet turns down in front of the chest in both paws. No source gives the rest of a trumpet player (`docs/reference/wind-technique.md` 2.1). | 5.2 |
| The role `trumpeter` is in `SWEEP_ROLES`, `FOLD_ROLES`, `ROLE_VIEWS`, and `ACCEPTED_GRIPS`, with 5 open loops (`MONKEY_BODY_LOOPS`). | 9.3 |
| The first download grows by 25,991 B to 740,713 B with the monkey body (`pnpm size --base 14bc0436`). | 7.2 |
| Open: two thin faces across the wrists (329 and 1090) fold in each sample. Rigid weights and a ring move the fold to the next faces (report "Folds"). | 4.4, 9.3 |
