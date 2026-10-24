# Decisions of the lap pose of the pianist

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-13, the user looked at the rest pose of
[`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md) in the app and asked for the pose of
a real pianist before a performance. The agent of the round `pianist-lap` decided the other rows.
The report [`2026-10-13-pianist-lap.md`](../research/2026-10-13-pianist-lap.md) gives the facts,
the measures, and the images. The user can reverse each decision. Then update the section that
holds it, and remove its row.

| Decision | Section |
|---|---|
| The user: "the pose is still strange. Identify what's the common pose for real pianist when they're preparing for a performance". The target of the rest pose is the rest position of a pianist before the first note: the trunk sits tall with a slight lean toward the piano, the head is up, and the hands rest in the lap. The lift of the count-in brings the paws to the keys. The `ready` clip of the studio (`clip_ready()` of `lowpoly-studio/roles/pianist/clips.py`) gives the lean. The rest clip of the studio is no longer the target | 5.2, 5.3 |
| The pianist leans 8° forward at rest (`restLean`), and 20° in a play. The line from its hips to its neck then leans 10.4° from the vertical in the Bach demo and 11.0° in the Boulanger demo, and 9.4° in the `ready` clip at 1.5 s. With the rest lean of 22° of before, it leaned 20.8° | 5.2 |
| The head of the pianist lifts 8° at rest (`restHeadLift`), as much as the rest lean. The forward axis of the head then pitches -0.1° in the Bach demo and -1.6° in the Boulanger demo, so the gaze is level. The front close view shows both eyes over the lid | 5.2 |
| A rest hand of the kind `lap` has the side of its palm (`palm` of `RestingHand`). The fingers keep only their part in the plane of the palm | 5.3 |
| The elbows of the pianist hang by the sides at rest, out, down, and back, (±1, -1, 0.77). Each elbow is 0.11 m out, 0.32 m down, and 0.11 m forward of its shoulder joint, and the upper arm is 19.6° from the trunk axis in the back view (49.9° with the elbows out and back of the studio rest clip, 35.8° and 50.2° in the `ready` clip). The back view shows no wing arms. This row replaces the row of the rest elbows of [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md) | 5.3 |
| Accepted at rest and in the lift: the forearms and the upper arms of the pianist go up to 3 cm into the body (`PIANIST_SWEEP` of `pose/test-sweep-roles.ts`). The arms are short, and the paws in the lap and the elbows by the sides lay them on the belly. The sweep measures 2.8 cm for the forearms and 1.5 cm for the upper arms | 5.3, 9.3 |
| The test "brings the shoulders of the pianist forward over its thighs at rest" becomes "sits the pianist more upright at rest than in a play": the lean of the line from the hips to the neck is more than 0 at rest, and less than in a play. The test "rests the palms on the thighs or on a string" becomes "rests the palms in the lap or on a string". For the pianist, it needs a gap of 1.5 cm at most from the lap and a palm nearer to the middle line than the knee. Before, it accepted a gap of 0.5 H. A new test keeps the rest paws of the pianist 5 cm from the case of the piano (review of 2026-10-13) | 9.3 |
