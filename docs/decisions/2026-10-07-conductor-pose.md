# Decisions of the conductor pose

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked for a look and feel of the animals and the scene that matches
`mockup.png`. The review of `main` against the mockup (`docs/reviews/2026-10-07-mockup-match.md`)
ranked the conductor first: from behind, both hands of the bear were at the height of the mouth,
0 to 10 px from the outline of the head, and the bear seemed to hold its head. In `mockup.png` and
in views 02 and 05 of `scene.png`, the arms go up and out, with the elbows out and both hands
beside the head. The agent of the conductor pose decided the details below. The user can reverse
each row. Then update the section that holds it, and remove its row.

The measures look at the bear from behind, at 10° above the level (the conductor shot) and at 34°
(the default view at the podium), every 0.1 s of a full play of the six demos. The distance of a
hand is the distance of its mesh from the outline of the head mesh with the ears in the image
plane, in head heights `H`. A negative distance is inside the outline. The mockup values come
from a crop of the bear in `mockup.png` (head 55 to 58 px wide) and in view 05 of `scene.png`.

| Measure | `mockup.png` | View 05 | `main` (10°, 34°) | Now (10°, 34°) |
|---|---|---|---|---|
| Left hand from the outline of the head, median | about 0.15 H | 0 to 0.08 H | 0.09 to 0.14 H, -0.04 to 0.01 H | 0.23 to 0.24 H, 0.25 to 0.28 H |
| Right hand from the outline of the head, median | about 0.6 H | about 0.75 H | 0.06 to 0.11 H, -0.11 to -0.08 H | 0.36 to 0.46 H, 0.40 to 0.48 H |
| Samples with the left hand inside the outline | none | none | 21% to 31%, 48% to 68% | 0%, 0% |
| Samples with the right hand inside the outline | none | none | 2% to 18%, 89% to 100% | 0%, 0% |
| Left wrist above the shoulder joint, median | | | 0.17 to 0.32 H | 0.41 to 0.50 H |
| Right wrist above the shoulder joint, median | | | 0.24 to 0.29 H | 0.50 to 0.54 H |
| Elbows apart, in head widths, median | about 2.1 | about 2.4 | 1.77 to 1.79 | 1.85 to 1.86 |

The elbows cannot go much wider: the upper arm is 0.7 H long, and the shoulders of the bear are
0.81 head widths apart. The mockup bear has a wider body.

| Decision | Section |
|---|---|
| The arcs, the lift of a baton cue, and the lift of the count-in after a pause rise in the beat plane | 5.4 |
| The beat plane turns by half of the turn of the upper body to a cued section. With the full turn of 30° to the left, the right hand went 0.19 H behind the outline of the head in the conductor shot. This changes the row "The beat plane turns with the upper body" of `2026-10-05-conductor-cues.md` | 5.4 |
| The mirror moves the left wrist by 0.45 of the motion of the tip, the part that the right wrist follows (0.6 before). This replaces the mirror row of `2026-10-06-conductor-left-arm.md` | 5.4 |
| A cue of the left hand points at least 25° to the left of the front of the bear, and still no further right than the front of the upper body. At the front of the upper body, a cue to a section in the middle or at the right put the hand 0.3 H behind the outline of the head | 5.4 |
| `pose/conductor-view.test.ts` checks the view from behind in each sample of a full play of each demo, at 10° and 34°: no hand inside the outline of the head, a median distance of at least 0.2 H for each hand, and a median height of at least 0.35 H above the shoulder joint for each wrist. It fails on `main` | 5.4, 9.3 |
| The test "beats in front of the chest" of `pose/conductor.test.ts` kept the right hand 0.25 m below the middle of the head. It now keeps the hand in front of the body, 0.2 H out and 0.3 H up from the shoulder joint, and the tip above the desk | 5.4 |
