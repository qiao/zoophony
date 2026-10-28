# Decisions of the badger mesh of the user

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user said: "after the wolf, use the badger model at
~/Downloads/Meshy_AI_badger_remeshed_3k_tr_1020070728_texture.glb". The user sleeps and asked for
no questions, so the agent of the round `mesh-badger` took each choice by the rules of the brief.
The report [`2026-10-20-badger-mesh.md`](../research/2026-10-20-badger-mesh.md) gives the
measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quote above: the percussion badgers get the mesh as a studio body (`tools/mesh-rigs/badger.json`, `SPECIES.badger`), with the pea eyes of the app. | 4.3, 4.4 |
| The rule of the user for the mouse: "make it the size of the previous parametric model". No reference image shows a badger, so the skull top stands at 1.038 m, as the parametric badger: H 0.244 m (`app`, `ANIMALS`). | 1, 4.4 |
| Arms and legs keep the mesh (factor 1): the reach 0.273 m meets each strike of the bass drum, the snare drum, and the small percussion. No arm factor up to 1.25 clears the cymbals or reaches the xylophone (`armFactor`). | 4.4, 4.6 |
| Colors: the texture hues match `badger-turnaround.png` (front fur 23° against 25°), so no `colors.tone`. The mesh is darker (L 0.28 against 0.40). The dark limit 0.01 keeps the pupils and the smile line dark. | 4.5 |
| Face: the face reads calm to happy. The smile shows at 60°, and the white stripe and the eye stripes show from the stage camera (`faces.webp`), so no face rule changes it. | 4.4 |
| Four thin faces take rigid weights (`weights.rigid`), and two shapes relax the raised right arm of the bass drum and the raised left arm of the triangle (`raise`). | 4.4 |
| No demo has a snare drum or a xylophone, so the probes also read a percussion test score with each part (`tools/probe-demos.ts`). It is no demo. | 9.3 |
| The sweeps accept the upper arms 2.5 cm in the side of the body, where the mesh arm lies (`BADGER_UPPER_ARMS`). | 9.3 |
| The first download grows by 29,644 B to 713,403 B (`pnpm size --base 24e47a7e`). The deer is the new sample body of the parametric tests (`models/test-body.ts`). | 7.2, 9.3 |
| Snare drum: the drum moves to 0.45 m in front and 0.46 m high (`SNARE_DRUM`), within reach. The sticks leave the front of the fists (`malletTilt`) in a V of 66°, 9° down, as the matched grip. | 4.6, 5.3 |
| Small percussion: the left paw holds the triangle at the mouth, as near to eye level as it reaches, also at rest (`triangleClip`, `triangleHand`). The tambourine stand moves within reach (`TAMBOURINE.mount`). | 4.6, 5.3 |
| Stop, open: the arms reach at most 85% of the xylophone strikes (factor 1.25, bars 0.22 m in front), so the xylophone keeps its place. Its mallets take the snare grip, for the arm gate. | 4.6, 5.3 |
| The agent accepted the paw crops while the user slept (`arms-*.webp`), and set the five grips to their play medians (`ACCEPTED_GRIPS`). | 4.4, 9.8 |
