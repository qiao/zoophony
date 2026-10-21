# Decisions of the monkey mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user said: "after these are done, use the monkey model at
~/Downloads/Meshy_AI_monkey_remeshed_3k_tr_1020213010_texture.glb". The agent of the round
`mesh-monkey` decided the rows with no quote of the user, in phase 1. The app does not use the
body yet. The report [`2026-10-20-mesh-monkey.md`](../research/2026-10-20-mesh-monkey.md) gives
the measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the trumpet monkeys get the mesh as a studio body (`tools/mesh-rigs/monkey.json`), with the pea eyes of the app. Phase 2 puts it into the app after the answers of the user. | 4.3, 4.4 |
| Size: no reference image shows a monkey, so the standing skull top under the tuft of hair takes the head top of the parametric monkey, 1.029 m (`2026-10-19-mouse-size.md`): 1.066 m for each unit, H 0.303 m (`app`). The user: "keep the size of phase 1". | 1, 4.4 |
| Question: the arm factor and the trumpet size (report "Arms and trumpet")? The user: "arms 1.5, trumpet at the scale 0.8". The arm factor is 1.5 (`armFactor`), and the trumpet scale is 0.8 (`trumpetScale`). | 4.4, 4.6 |
| Legs: the legs keep the mesh, with the thighs 25° down and 15° out (`studio.legTurns`). The seat of the legs is 0.132 m, with the front edge of the rig chair at 0.03 u, behind the shins (`chair`). | 4.4, 4.5 |
| Question: the seated monkey looks as if it stands in front of its low chair, so a chair or no chair? The user: "no chair". The monkey stands to play, as the mouse and the beaver do (`SpeciesParams.noChair`). | 4.4, 4.5 |
| Tail: two bones that turn rigidly. The root goes back and down 47° over the seat, and the tip keeps the direction of the source, so that the curl stands on the floor 0.07 cm above the soles (`studio.tailBind`). | 4.4 |
| Colors: the fur matches `SPECIES_COLORS.monkey` (hue 53° against 54°), so the config has no tone rule. The dark limit 0.02 keeps the hands and the feet a dark brown in place of a dark face (`colors.dark`). | 4.5 |
| Face: the user asks for happy faces. A smile band of 5 faces in a mid brown gives the smile line that the face colors lose, with the corners 1.9 cm up (`colors.smile`). A smile rule with its own color needs no patch rule (`rig_mesh.py`). The user: "keep the smile line" (`face-crops-smile.webp`). | 4.4 |
