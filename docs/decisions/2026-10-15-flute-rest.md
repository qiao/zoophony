# Decisions of the flute rest of a real flutist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-14, the manager listed the faults on `main`, and the user said: "fix them after this
round". One fault: the flute rest of the tan fox did not follow its source. The manager of the
session and the agent of the branch `flute-rest` decided the rows. The report
[`2026-10-15-flute-rest.md`](../research/2026-10-15-flute-rest.md) gives the measures and the
images. The user can reverse each decision. Then update the section that holds it, and remove its
row.

| Decision | Section |
|---|---|
| The source of the rest: Patricia George, "Solving the Problem of Rests", The Instrumentalist, December 2018: the flute stands "vertically on the right leg with the right hand on the right-hand keys". The wind pose kept both palms on their grips, so each upright rest put the left arm across the belly, 2.5 cm to 3.2 cm into the body | 5.2, 5.3 |
| A wind hold can free the left paw in the rest pose (`WindHold.restFreeL`, a `FreePaw` of `pose/winds.ts`): a place on the left thigh, the side of the palm, the direction of the fingers, and an arc. A seated player rests the palm on the thigh (`lapHand()` of `pose/lap.ts`), and a standing player hangs its left arm (`hangingArm()`). The lift and the lowering move the left wrist and the hand between the rest place and the grip by the weight of the playing pose, the weight that also moves the instrument, so the pose stays stateless. Each other hold has `null`: `pnpm body-probe --base main` gave the same poses for each other player | 5.3 |
| The arc of the free paw: the wrist moves away from the straight line between the rest place and the grip by `4 w (1 - w)` of `FreePaw.arc`, out to the left, up, and forward. With no arc, the left forearm and upper arm of the tan fox went up to 5.4 cm into its round belly in the lift | 5.3 |
| The foot joint stays at the outer side of the knee. On the top of the knee, 4° from vertical, the best fit put the right upper arm 1.6 cm into the body (limit 1.5 cm) | 5.3 |
| The elbows point down at rest. With the elbows out to the side, the paws rested on the hips, and the left upper arm folded 9 to 11 faces of the skin. With the elbows down and the arms nearly straight, it folds 1 to 3 faces. The fold measure of the rest is the count of folded faces in the worst rest sample, because `main` folds in each rest sample (10 of 10) | 5.3 |
| `lapHand()` of `pose/lap.ts` finds the hand bone of a paw on a thigh. The rest of the piano (`pose/hands.ts`) and the free paw of the winds share it. The move gave the same poses (`pnpm body-probe --base main`) | 5.3 |
| Two paused tests of `pose/winds.test.ts` now fail for the tan fox: "puts the palms on their grips while the player plays and in the rest pose", because the left palm leaves its grip at rest, and "reaches each palm grip with at most 97% of the arm length", because the left arm hangs straight at rest. A pose round does not fix a paused test, so they stay paused and unchanged | 9.3 |
