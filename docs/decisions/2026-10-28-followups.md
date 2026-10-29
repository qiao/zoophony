# Decisions of the follow-up fixes of 2026-10-28

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, after the round of the tails, the bench, and the arm lumps, the user gave more
images and notes. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| A run of at least 4 notes of one pitch, each shorter than 0.09 s, is a measured tremolo: each stroke moves the bow 1.2 cm and back (`BOW_MOTION.measured`). The user said: "the red fox's bow arm is going up and down too rapidly", at 25.8 s and 37.4 s of `boulanger-matin`. | 5.3 |
| A face of the penguin whose texture samples spread over 0.3 of Oklab lightness takes the larger of its light and dark halves (`colors.split`). The user said: "the penguine's head has unnatural gradient between black and white". The edge is a zigzag along the faces, because the rig gives each face one color. | 4.4 |
| The dog tail takes weights within 0.065 units of its bone line (0.085 before), moves by its tail share from 0.45 to 0.65, and shrinks to 0.55 over 0.14 units around the root, with 6 rounds. The user said: "it's too bulky at the root". The chair is 2 cm deeper, and the cat violist and the conductor of `bach-bwv1048` and `mozart-k525` move a little. This replaces the dog row of `2026-10-28-tails.md`. | 4.4 |
| The hippo bow arm takes a shape of `raise` at the mean rest turns that smooths the tube from the second upper arm segment to the wrist with 10 rounds (`smooth`, `smoothBones`), and fades out 25° from the rest turn. The user said: "the hippo's arm is still not fixed". The root segment stays out: with it, the root folded at rest. | 4.4 |
| The arm gate of the bassist gives `FAIL` on the right stretch p95 (0.22 against 0.16, limit 0.35), and the round accepts it: the gate counts from the rest sample, whose inner elbow edge the shape shortens, and the play stretch from the bind stays 0.084. | 4.4 |
| Each close view of `pnpm close-views` has a light of 2 lux from the camera (gallery query `fill`). The user said: "when taking screenshots, remember to cast a fill light". | 9 |
| The red fox bow arm takes the rest shape of the hippo bow arm, with a fade of 8° to 18°, so that the rest of the tan fox flutist (22.6° away) keeps its skin. The user said: "the cat's elbow has an area that's too bright", with an image of the red fox at rest. | 4.4 |
