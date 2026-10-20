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
| Bass drum: the drum moves 6 cm left and 3 cm back (`BASS_DRUM.center`), and the beater strikes 12 cm below the middle of the head, as a real player strikes off the middle. The beater keeps the angle of no paw twist, and stays over the drum at rest (`ready`). | 4.6, 5.3 |
| Snare drum: the drum moves from 0.55 m to 0.45 m in front and up to 0.46 m (`SNARE_DRUM`), so that the short arms reach each strike. The sticks leave the front of the fists (`malletTilt` 1.3) and make a V of 66°, 9° down at a strike, as in the matched grip. | 4.6, 5.3 |
| Small percussion: the left paw holds the triangle clip at the mouth, as near to the eye level of a real player as the arm reaches, keeps it up at rest (`ready`), and turns 40° less far on the forearm (`triangleClip`, `triangleHand`). The tambourine stand moves within reach (`TAMBOURINE.mount`). | 4.6, 5.3 |
| Stop, open: the cymbals (0.40 m) go 7.4 cm or more into the body and miss the crash at each arm factor up to 1.25 and each crash place (`cymbal-scan.txt`). The hold keeps its crash place, and only its elbows point down and out (`poleL`, `poleR`) for the arm gate. | 4.6, 5.3 |
| Stop, open: the short arms reach at most 81% of the xylophone strikes, at the factor 1.25 with the bars 0.22 m in front, so the xylophone keeps its place and size. Its mallets take the grip of the snare sticks (`XYLOPHONE.malletTilt`, `across`) for the arm gate. | 4.6, 5.3 |
