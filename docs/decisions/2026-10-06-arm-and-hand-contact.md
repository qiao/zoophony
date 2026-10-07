# Decisions of the arm and hand contact

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user sent two close views of the app. The upper arm did not join the torso at
the shoulder, and the left hand of a violin floated under the end of the neck. The agent of the
arms decided the details below. The user can reverse each one. Then update the section that holds
it, and remove its row.

| Decision | Section |
|---|---|
| The upper arm starts in a dome around the shoulder joint, so that the arm holds a ball of its radius around the joint in each turn. A separate ball part would need 80 triangles for each arm, and a move of the joint into the torso would change the reach of each hold. The domes add 80 triangles to each body (2,480 for the elephant) | 4.5 |
| The elbows keep the flat ends of the limbs. The forearm overlaps the upper arm at the elbow, so a bent elbow shows a notch and no gap. Two more domes would add 80 more triangles to each body | 4.5 |
| The middle of the left finger block presses the strings at the place of the note. The palm was the target before, but a mitten has no fingers to reach from the palm to the strings | 5.3 |
| The left fingers point up from the strings, tilted 30° over the neck, and the palm faces the neck from below, as the left hands of `scene.png` (06). The fingers curl 40° | 5.3 |
| The press of a note curls the fingers 15° more, but the hand keeps its place. Thus the press shows as a motion of the fingers, and the middle of the block stays within 0.015 H of the strings | 5.3 |
| The places of the notes map evenly into the part of the fingerboard that the left arm reaches with 97% of its length, as the positions of the trombone slide. The hippo reaches 0.13 to 1 of the contrabass. The hold of the contrabass does not change, because a new hold moves the footprint and the seat rows | 5.3 |
| In the rest pose, the left fingers stay on the strings at 0.4 of the fingerboard: the place of the old grip of the palm (0.39) | 5.3 |
| The instrument models keep the grip of the left palm under the neck as a nominal hold, as the piano and the harp keep theirs. The pose of the bowed strings no longer reads it | 4.6 |
