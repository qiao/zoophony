# Decisions of the T-pose rhino

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, the user said: "use the rhino model at
/Users/xueqiaoxu/Downloads/Meshy_AI_rhino_tpose_3k_triang_1029050510_texture.glb", and then "yes"
to the hold fit. The report [`2026-10-28-rhino-tpose.md`](../research/2026-10-28-rhino-tpose.md)
gives the measures. The user can reverse each decision. Then update its section, and remove its
row.

| Decision | Section |
|---|---|
| The rig takes `rhino-tpose-arms.glb`: the T-pose mesh with quad arm tubes, Blender weights, and the fixes of `rhino_arms.py` for the paws and the neck (`tools/blender/rhino_tpose_arms.py`). This replaces the source rows of `2026-10-23-rhino-apose.md`. | 4.4 |
| The shoulder cut stands at 0.4 of the short upper arm, the clean of a cut loop collapses only an edge along the loop, and the wrap projects at most 0.03 units: with the steps of the bear, a shard ran from each arm root to the trunk. | 4.4 |
| The clavicles leave the chest inside \|x\| 0.09 and below y 0.5 (`step_chest()`): bone heat spread them from y 0.39 to 0.80. | 4.4 |
| Size: the head top stays 1.462 m: the shoulder landmark at 0.958199 m, 1.5331 m for each unit. The arms keep the mesh (factor 1), 0.3615 m from the shoulder joint to the palm. | 4.4 |
| The palm hint points down, (0, -1, 0). Down and back folded 16 and 19 faces, and down and forward turned the grips 58° to 79° from the accepted grip. | 4.4 |
| The paws keep half of the finger weight (`weights.fingers` 0.5), and 6 rounds smooth the arm tubes (`armSmooth`): the folds fall to 4 and 6 faces, and the crease share to 12.8% and 14.5%. | 4.4 |
| The mouthpiece moves 0.05 H from the mouth (`lipShift` of `RHINO_TUBA`): the tuba goes 2.7 cm into the rounder belly (3.8 cm on the A-pose mesh). | 5.3 |
| The paws go 2.4 cm into the tuba (limit 2.2 cm, 1.9 cm on the A-pose mesh), and the grips did not change it. The round stump sets the depth. | 9.3 |
| The sweep body has 3 open loops (`RHINO_BODY_LOOPS`): the two arm roots and one small loop at the head. | 9.3 |
