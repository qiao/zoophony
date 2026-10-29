# Decisions of the rhino arms of the fifth review

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user said: "the rhino's arms are stretched / twisted in unnatural ways", and
"note that the previous decision files may be incorrect". The round `fifth-rhino` worked while the
user slept. The report
[`2026-10-26-fifth-rhino.md`](../research/2026-10-26-fifth-rhino.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| Three causes add up: the elbows out turned the left forearm to 84° of supination, the bind of the rig started each paw 78° pronated, and two forearm bones took 84° each. The rig fixes the bind and the skin, and the hold lowers the elbows. | 4.4, 5.3 |
| The arms of the rhino get quad tubes, Blender weights, and arm segments with the settings of the 2026-10-25 probe (`tools/blender/rhino_arms.py`, `rhino-apose-arms.glb`, and for the T-pose mesh since 2026-10-28 `tools/blender/rhino_tpose_arms.py`, `rhino-tpose-arms.glb`). The segments replace the twist bone of each upper arm (`upperTwist`). The user allowed this retopology on 2026-10-24. | 4.4 |
| The inner lower side of each upper arm and its shoulder loop move 0.015 units toward the arm axis after the bake (`flatten`). With no flatten, the upper arms went 2.6 cm into the belly. | 4.4 |
| The paws keep the rule weights of the rig (`paintedLower` with `hand` and `fingers`). With the Blender weights, the curl around the tubes folded 9 faces of the left paw in each sample, and the arm gate failed (13 and 11 folds, limit 8). | 4.4 |
| The seated bind bends each elbow forward (`studio.bindArms.forearm`, the bind forearm turned 68° about the bind upper arm), and the bind paw keeps its wrist bend in the frame of its palm. The bind paw then sits 13° pronated, near the 15° of the A-pose paw with a forward elbow. | 4.4 |
| The elbows point down and out (`poleL`, `poleR`, `restPoleL`, `restPoleR` of `RHINO_TUBA`), so that the left forearm turns 67° and the right 15° from neutral, in place of 84° and 57°. The real tubist keeps the elbows away from the rib cage. | 5.3 |
| The left grip moves 0.145 H toward the main branch (0.16 before), so that the left paw goes at most 1.9 cm into the branch with the lower elbow (2.3 cm with 0.16 H). With 0.13 H or less, the finger tips left the branch. | 5.3 |
| The accepted grips of the tubist are the medians of the new hold (`ACCEPTED_GRIPS` of `tools/arm-check.ts`), because the bind changed the zero of the paw twist. | 9.3 |
