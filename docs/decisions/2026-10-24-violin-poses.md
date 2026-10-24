# Decisions of the violin poses of the rabbit and the cat

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-24, the user said: "the rabbit and cat does not look correct. please spin up a new
subagent with xhigh effort, take screenshots for all states across different angles, and fix
issues until the poses are professional and there's no issues with meshes". The agent of the
branch decided the rows below. The reports
[`2026-10-24-violin-poses.md`](../research/2026-10-24-violin-poses.md) (the rests) and
[`2026-10-24-violin-moves.md`](../research/2026-10-24-violin-moves.md) (the moves) give the
measures and the images. The user can reverse each decision. Then update its section, and remove
its row.

| Decision | Section |
|---|---|
| The user: "the rabbit and cat does not look correct". At rest, the rabbit violin stands at the knee joint (`rest.lap.along` 1, 1.1 before), and the left paw holds the upper neck (`restPlace` 0.1, 0.4 before), so the elbow bends to 123° (180° before). The palm is at 0.80 of the violin, above the mark 0.7 of `pnpm hold-fit`. | 5.2, 5.3 |
| The rabbit holds the bow 0.4 H out from the right knee and 0.8 H above it (`restBow.lap`), so the right elbow bends to 128° (180° before). In the moves, the grip moves 0.2 H up and 0.3 H to the front (`restBow.via.reach`): with 0.2 H, the right forearm went 2.2 cm into the body, and with no move up, the elbow opened to 163° (133°). | 5.2, 5.3 |
| In the middle of the moves, the cat viola turns its scroll toward the left shoulder (`liftTurn` of `CAT_HOLD`) and moves 0.2 H up (`liftReach`, 0.4 H before), so the left paw stays below the top of the head. The bow grip moves 0.4 H to the front: with 0.5 H, the right paw twisted 137°. | 5.2 |
| The cat viola stands 0.25 H in front of the knee (0.3 H before), and the left paw holds it at 0.4 of the fingerboard (0.5), so the paw swings 91° at rest (98°), with 8 folded faces of the left arm (7, limit 8). | 5.2, 5.3 |
| In the moves, the left paw of the rabbit carries the violin at the end of the fingerboard (`liftPlace` 1, `carryByPaw()`), as a player brings the violin up by its neck. With the tail end on the path, the left elbow straightened to 180° (now 137°, red fox 127°). | 5.2 |
| From 0.6 of the weight of the play, the violin goes smoothly back to the path of the tail end (`CARRY_FADE`): with the carry up to the play, the tail end went 2.3 cm into the rabbit chest. | 5.2 |
| The rabbit violin keeps its middle turn and moves 0.1 H up and 0.08 H to the front (`liftReach`): with no move to the front, it went 3.2 cm into the belly. The left paw rolls 45° further (`liftTiltL`), and the elbow points down and forward (`liftPoleL`): with neither, the paw swung 94° (62°). | 5.2 |
| Open: the left elbow of the rabbit and of the cat straightens for about 0.1 s in the middle of the lift, as on `main`. The cat left paw swings 91° at rest (limit 70), the rabbit right wrist stretches 0.37 in the play, and 7 faces of the rabbit right arm fold at rest (limit 8). | 9.3 |
