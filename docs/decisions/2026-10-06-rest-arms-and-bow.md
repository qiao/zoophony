# Decisions of the rest arms and the bow hand

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user sent three views of the app. Before play, the violins hung from the chin
with the scroll down near the knee, and the arms hung straight down beside the chairs: "by default
the animals' arms are drooping". In a close view of a dog with a cello, the bow stick went through
the right hand and the forearm. The agent of the rest arms and the bow decided the details below.
The user can reverse each one. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The rest pose keeps the violin and the viola down, as design 5.2 asks: a real orchestra lifts the instruments only when the conductor signals the start. The violin and the viola stand on the left thigh, scroll up, with the left fingers on the strings. The other choice, the violin under the chin with the bow arm up, makes the lift of the count-in almost invisible | 5.2, 5.3 |
| The pose moves the instrument bone with an instrument offset, as it moves the trombone slide. The bone of the violin is at the tail end under the chin, so a turn alone cannot put the violin on the lap | 5.1 |
| The right hand holds the bow on the right thigh in the rest pose: across the knees to the left for the violin and the viola, and to the front for the cello and the contrabass. A bow that hangs down from the knee went through the shin | 5.3 |
| The pianist and the harp player rest the palms on the thighs. The right fingers of the harp player point in, because the harp stands at the right knee | 5.3 |
| The standing percussion players keep the arms down with the mallets in the rest pose. A standing player who waits lets the arms hang, and only the seated players drooped | 5.3 |
| The bow stick lies in the fingers: in the crease between the palm ball and the finger ball, 0.02 H from each, with the fingers curled 45°. The mitten has no thumb, so the stick cannot lie between a thumb and the fingers | 4.6, 5.3 |
| The right hand rolls around the stick so that its back points to the elbow, from -120° to 100°, and the elbow turns to the back of the hand. The roll and the elbow follow each other three times in each frame. A fixed roll for each instrument left the frog end of the stick up to 0.13 H in the forearm of the cello players | 5.3 |
| The direction of the right elbow of the hold is back and out: (0.5, -1, 0.5) for the violin and the viola, and (0.5, 0, 1) for the cello and the contrabass. It counts only when the back of the hand is near the line of the arm | 5.3 |
| In one change to pizzicato of the cello in the Boulanger demo, the frog end of the stick touches the forearm 0.003 m deep for less than 10 ms. The test samples the default demo every 0.1 s and does not see it | 5.3 |
| The gallery has no query for the rest pose. The rest views of the review came from a local change that is not in the branch, because `src/gallery/` belongs to another agent | 7.1 |
