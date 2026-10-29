# Decisions of the follow-up fixes of 2026-10-28

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-28, after the round of the tails, the bench, and the arm lumps, the user gave more
images and notes. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| A run of at least 4 notes of one pitch, each shorter than 0.09 s, is a measured tremolo: each stroke moves the bow 1.2 cm and back (`BOW_MOTION.measured`). The user said: "the red fox's bow arm is going up and down too rapidly", at 25.8 s and 37.4 s of `boulanger-matin`. | 5.3 |
| A face of the penguin whose texture samples spread over 0.3 of Oklab lightness takes the larger of its light and dark halves (`colors.split`). The user said: "the penguine's head has unnatural gradient between black and white". The edge is a zigzag along the faces, because the rig gives each face one color. | 4.4 |
