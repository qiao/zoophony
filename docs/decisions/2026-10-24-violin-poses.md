# Decisions of the violin poses of the rabbit and the cat

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user said: "the rabbit and cat does not look correct. please spin up a new
subagent with xhigh effort, take screenshots for all states across different angles, and fix
issues until the poses are professional and there's no issues with meshes". The agent of the
branch decided the rows below. The report
[`2026-10-24-violin-poses.md`](../research/2026-10-24-violin-poses.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the rabbit and cat does not look correct". At rest, the rabbit violin stands at the knee joint (`rest.lap.along` 1, 1.1 before), and the left paw holds the upper neck (`restPlace` 0.1, 0.4 before), so the elbow bends to 123° (180° before). The palm is at 0.80 of the violin, above the mark 0.7 of `pnpm hold-fit`. | 5.2, 5.3 |
| The rabbit holds the bow 0.4 H out from the right knee and 0.8 H above it (`restBow.lap`), so the right elbow bends to 128° (180° before). In the moves, the grip moves 0.3 H to the front (`restBow.via.reach`): with 0.2 H, the right forearm went 2.2 cm into the body. | 5.2, 5.3 |
| In the middle of the moves, the cat viola turns its scroll toward the left shoulder (`liftTurn` of `CAT_HOLD`) and moves 0.2 H up (`liftReach`, 0.4 H before), so the left paw stays below the top of the head. The bow grip moves 0.4 H to the front: with 0.5 H, the right paw twisted 137°. | 5.2 |
| The cat viola stands 0.25 H in front of the knee (0.3 H before), and the left paw holds it at 0.4 of the fingerboard (0.5), so the paw swings 91° at rest (98°), with 8 folded faces of the left arm (7, limit 8). | 5.2, 5.3 |
| The rabbit keeps the middle turn and the move of `2026-10-24-violin-rest.md`. A turn with the scroll to the left put the paw twist through 180°, and a move toward the body put the violin 5 cm to 6 cm into the belly. | 5.2 |
| Open: the left elbow of the rabbit and of the cat straightens for about 0.1 s in the middle of the lift, as on `main`. The cat left paw swings 91° at rest (limit 70), the rabbit right wrist stretches 0.37 in the play, and 7 faces of the rabbit right arm fold at rest (limit 8). | 9.3 |
