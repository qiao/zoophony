# Decisions of the shape of the wolf

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-20, the user said: "make the wolf 0.9x shorter while keeping its width", then "actually,
make the wolf 1.2x the width, for it to have similar body ratio as the fox", then "both change".
The round `wolf-shape` gave the wolf mesh 0.9 of its height and 1.2 of its width. The report
[`2026-10-20-wolf-shape.md`](../research/2026-10-20-wolf-shape.md) gives the measures. The user can
reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user, quotes above: the wolf source, except the head, takes 1.2 of its width and 0.9 of its height before the joints (`proportions` of `tools/mesh-rigs/wolf.json`). The manager kept the depth. | 4.4 |
| A mesh rig config can scale its source on each axis after the scale to 1 unit high (`proportions`, `load_mesh()` of `tools/blender/rig_mesh.py`). The meters for each unit stay, so `app.shoulders` and the height of `ANIMALS` take the height factor. | 4.4 |
| Conflict with design 1: the seated wolf is 1.470 m high, 1.01 times the seated dog cellist, below the range 1.03 to 1.16 of the orchestra images. The newer request of the user wins, and design 1 names it. | 1, 4.4 |
| The joints, the weight heights, the boxes, and the rigid points of round `mesh-wolf` take the factors, and the places of the head take the map of the head keep (`wolf-head/head_config.py`). The cuts of the scaled source check the arm joints, and the palm normal and the leg turns are measured again (`shape_config.py`, `arm-axis.txt`, `paw.txt`). | 4.4 |
| The arm factor goes from 1.17 to 1.178, which keeps the reach of 0.508 m (`armFactor`). | 4.4, 4.6 |
| The legs keep the factor 1. The chair fits them: seat 0.307 m, front edge `chair.front` at z 0.06 u, behind the shins at z 0.074 u, and a half width of 0.18 u for the wider haunch (`chair`). | 4.4, 4.5 |
| The tail root goes 40° in place of 45° below the level. At 45°, it went 2.0 cm into the seat at rest, and at 40° it goes 0.6 cm (`studio.tailBind`, `tail-variants.txt`). | 4.4 |
| Faces 229 of the right shoulder, 69 and 148 and 76 of the right forearm, and 2093 of the left shoulder take the mean of their corner weights. No rest, play, or lift sample folds (`weights.rigid`, `check-rigid3.log`). | 4.4 |
| The clarinet hold of round `mesh-wolf` stays, with the mouthpiece 0.12 H below the mouth and 1.3 cm into the kept head. At 0.1 H, it went 1.8 cm (`lipShift` of `WOLF_CLARINET`, `wolf-head/fit1.txt`). | 5.3 |
| The user, 2026-10-20: "don't modify the head of the wolf". The head (the skull, the muzzle, the ears, and the eyes) keeps the form and the size in meters of round `mesh-wolf`, and moves with the top of the neck (`proportions.keep`). | 4.4 |
| With `keep` set to `head`, each vertex above the upper height of `blend` takes no factor, and a smoothstep joins the scaled neck to the head (`proportioned()` of `tools/blender/rig_mesh.py`). With no `keep`, each rig keeps its bytes. | 4.4 |
| The blend zone goes from y 0.74 u, the narrow neck above the shoulders, to the head line at 0.775 u, before the factors. From the neck joint at 0.70 u, one face of the right shoulder top folded in each rest sample (`wolf-head/check-0.70.log`). | 4.4 |
| The head weights of the shoulders take the width factor 1.1 of the middle of the blend zone (`weights.shoulderHead`). | 4.4 |
| Open: show the user the lineup beside the dog and the fox, and the play frame (`compare.webp`), and the grip medians -97° and 79° against the accepted -86° and 67° (`ACCEPTED_GRIPS`). | 4.4, 9.3 |
