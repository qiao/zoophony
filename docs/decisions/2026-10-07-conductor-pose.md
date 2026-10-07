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
| The tip of the baton at beat 1 is 0.94 H up, 1.58 H forward, and 0.39 H out from the right shoulder joint. The pivot is 0.16 H down, 0.1 H forward, and 0.67 H out. The baton points up 37° and a little inward, and the wrist is about 0.4 H up, 0.7 H forward, and 0.55 H out at beat 1. This replaces the beat point of `2026-10-06-ux-audit-camera-stage.md` (0.45 H up and 1.3 H forward, the pivot 0.1 H up and 0.3 H forward), which kept the wrist at the pivot in front of the mouth | 5.4 |
| The beat plane is square to the baton at beat 1: its x axis is level, and its y axis points up and back. The pivot is 0.84 H behind the wrist, so the wrist follows 0.45 of the motion of the tip, and the arm beats with the baton. With the old pivot, the wrist followed about 0.12 of it, and the beat read as a motion of the wrist (UX audit 2026-10-06, AM1). In an upright plane, the arcs of a raised baton moved the wrist along the baton and out of the reach of the arm | 5.4 |
| The arcs, the lift of a baton cue, and the lift of the count-in after a pause rise in the beat plane | 5.4 |
| The beat plane turns by half of the turn of the upper body to a cued section. With the full turn of 30° to the left, the right hand went 0.19 H behind the outline of the head in the conductor shot. This changes the row "The beat plane turns with the upper body" of `2026-10-05-conductor-cues.md` | 5.4 |
| The elbows point out to the sides and a little back, (±1, -0.1, 0.25), level with the shoulders. With (±1, -0.5, 0.3), the elbows hung below the hands, and the bear seemed to raise its hands in surrender | 5.4 |
| The places of the left hand, in `H` from the left shoulder joint (out, up, forward): quiet 0.45, 0.4, 0.7, mirror 0.5, 0.5, 0.8, swell 0.4, 0.9, 0.65, fade 0.6, 0.05, 0.65, and hold 0.4, 0.55, 1.0. The fingers and the curls do not change. This replaces the places row of `2026-10-06-conductor-left-arm.md` | 5.4 |
| The mirror moves the left wrist by 0.45 of the motion of the tip, the part that the right wrist follows (0.6 before). This replaces the mirror row of `2026-10-06-conductor-left-arm.md` | 5.4 |
| A cue of the left hand points at least 25° to the left of the front of the bear, and still no further right than the front of the upper body. At the front of the upper body, a cue to a section in the middle or at the right put the hand 0.3 H behind the outline of the head | 5.4 |
| In the ready gesture of a count-in, the left hand points 40° up and 25° outward (5° inward before). At 15° outward, the hand came 0.01 H from the outline of the head in the conductor shot | 5.4 |
| `pose/conductor-view.test.ts` checks the view from behind in each sample of a full play of each demo, at 10° and 34°: no hand inside the outline of the head, a median distance of at least 0.2 H for each hand, and a median height of at least 0.35 H above the shoulder joint for each wrist. It fails on `main` | 5.4, 9.3 |
| The test "beats in front of the chest" of `pose/conductor.test.ts` kept the right hand 0.25 m below the middle of the head. It now keeps the hand in front of the body, 0.2 H out and 0.3 H up from the shoulder joint, and the tip above the desk | 5.4 |
