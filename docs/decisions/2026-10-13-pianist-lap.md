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
| A rest hand of the kind `lap` has the side of its palm (`palm` of `RestingHand`). The fingers keep only their part in the plane of the palm. The harp player keeps the palm down, so its poses do not change | 5.3 |
| The paws of the pianist rest on the front of the belly over the thighs: 0.14 H to the middle line, 0.22 H up, and 0.59 H forward from the top of the leg at the knee (`restL` and `restR` of `HANDS_HOLDS`). The palm faces in and back to the belly, (±0.95, 0.1, 1), and the fingers point down and in along it, (±0.4, -1, 0.34). The palm is 0.23 m from the middle line (the knees are at 0.28 m), 0.66 m above the floor, and 0.3 cm to 0.8 cm from the body. The round belly covers the thighs, and the arms are short. A random search of the hold found no lower lap within the contact depth: palms at 0.60 m put the forearms 1.8 cm into the belly, and at 0.56 m 3.7 cm. This row replaces the row of the paws beside the knees of [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md) | 5.3 |
| The elbows of the pianist point out and a little forward at rest, (±1, 0, -0.26), as arms that hold a ball. Each upper arm is 31° from the trunk axis in the back view (49.9° with the elbows out and back of before, 35.8° and 50.2° in the `ready` clip). The forearms lie on the belly and go 0.6 cm into the body at most, and the back view shows no wing arms. This row replaces the row of the rest elbows of [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md) | 5.3 |
| The arc of the paws stays (`restArc` of [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md)). With the new rest place, the forearms go 0.6 cm into the body in the lift, the claws 0.1 cm into the case, and the lowering keeps the depths of a play. No face folds at rest or in the lift | 5.3 |
| The test "brings the shoulders of the pianist forward over its thighs at rest" becomes "sits the pianist more upright at rest than in a play": the lean of the line from the hips to the neck is more than 0 at rest, and less than in a play. The test of the rest paws of the pianist needs a gap of 1.5 cm at most from the lap and a palm nearer to the middle line than the knee. Before, it accepted a gap of 0.5 H | 9.3 |
