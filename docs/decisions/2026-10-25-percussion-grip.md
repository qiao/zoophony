# Decisions of the grip of the percussion paws

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-25, the user said: "the badger doesnt seem to be 'holding' the stick. can we have it
'hold' the stick? same applies to other percussion animals". The manager gave the round
`percussion-grip`. The report
[`2026-10-25-percussion-grip.md`](../research/2026-10-25-percussion-grip.md) gives the cause and
the measures. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the badger doesnt seem to be 'holding' the stick". Each mallet lies on the palm side of its paw, under the curled fingers, and leaves the front of the fist at the side of the thumb (`MalletSpot` of each instrument, `PAW_SPOT`). | 4.6, 5.3 |
| The badger shafts lie 60° from the fingers in the bind pose (`PAW_TILT`), the xylophone mallets 30°, the triangle beater 33°, the bass drum beater 90° (no clip of the left paw), and the elephant shafts 45° (`TIMPANI.malletTilt`). This replaces the tilt 1.3 of `2026-10-19-elephant-grip.md`, which put the shaft along the fingers. | 4.6, 5.3 |
| The fingers curl 90° on the badger, 100° on the elephant, and 75° with the triangle, also at rest and in the lift (`PercussionHold.curl`). At 120°, 11 to 20 knuckle faces turned over. | 5.3 |
| The snare, cymbal, and bass drum paws roll around the shaft until they have no side bend at the strike, and keep that roll through the stroke (`gripRoll()`, `PercussionHold.strikeRoll`). | 5.3 |
| The timpani, the xylophone, and the triangle beater keep the roll of `main` (`strikeRoll` false): the roll that removes the side bend turned their paws by up to 180° in 0.01 s where the shaft passes the line of the forearm. | 5.3 |
| The elephant mesh is not symmetric, so each elephant paw has its own grip (`TIMPANI.malletSpotL`, `malletSpotR`). | 4.6 |
| The manager: mallets of 0.30 m or shorter, the homes of `main`, and the paws low in front of the belly. The shaft leaves the closed paw under the claws, and the bars are 11 cm to 7 cm long, so that 93% of the right strikes stay within 5 mm (`XYLOPHONE`). | 4.6, 5.3 |
| The left timpani mallet strikes 8 cm toward the middle (`PERCUSSION_HOLDS.timpani.offsetL`), so that the left paw turns at most 29° in 0.01 s in the rolls (33° with no offset). | 5.3 |
| The manager accepted the 3x paw crops of the snare drum, the cymbal, the bass drum, the triangle beater, and the timpani, and set their play medians (`ACCEPTED_GRIPS`): the timpanist L -21, R -7. | 4.4, 9.8 |
| `pnpm wind-grip` measures the mallet grips: the shaft through the closed paw, the tips on it, the butt, and the exit at most 60° from the thumb side, with the paw axes of the visible paw. | 9.3 |
