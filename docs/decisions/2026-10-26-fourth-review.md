# Decisions of the fourth review of 2026-10-26

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-26, the user sent issues with images: "the cat's arm is bent in unusual ways", "the
polar bear's knee is unexpectedly bulky", "the rabbit's knee is cut", and a faulty hold of the
violins and the viola at rest and in the moves to the play. The manager worked alone on `main`.
The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The rabbit thigh keeps its weight up to 0.02 units above the knee (`weights.haunch` 0.12 to 0.19, the ramp of the fox): the ramp from the knee gave the hips the whole thigh, and the seated bind sheared a V into each knee. | 4.4 |
| The polar bear legs split the weight of the thigh and the shin by height from 0.12 to 0.2 units, across the knee joint at 0.15 (`weights.knee`), and the hips take the thigh only from 0.2 to 0.3 (`weights.haunch`, 0.17 to 0.28 before): bone heat gave the shin the knee front and the thigh underside, so the seated knee stood as a hump over a slab. The bench is 2.7 cm lower. | 4.4 |
| At rest, the cat bow elbow hangs down, a little out, and a little back, (0.65, -1, 0.2), and the grip rests over the lap, 0.35 H out, 0.25 H up, and 0.2 H forward at 0.5 of the thigh: with the elbow out, (1, -0.6, 0), and the grip 0.6 H up, the elbow stood 14 cm out as a wing. The upper arm meets the belly 1.7 cm deep near the elbow (limit 1.5); a lower elbow went 2.6 cm to 5.4 cm in. | 5.2 |
| At rest, the left paws of the rabbit, the red fox, and the cat twist 0.5 rad on the forearm (`restTwistL`, 1.5 before), so that each paw closes around the neck from the inner side, as on 2026-10-25: with 1.5, the palm faced the body, and the fingers lay over the strings. With 0, the twist of the move reached 180°, and the paw flipped at about 17,900°/s. | 5.2 |
| In the middle of the lift and the lowering, the cat bow grip moves 0.4 H out (`restBow.via.reach`, 0.85 H before), so that the elbow stays bent: with 0.85 H, the arm reached stiffly straight out to the side. The right upper arm goes in no deeper than at rest (1.7 cm). | 5.2 |
