# Decisions of the carry of the violin and the viola

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-27, the round `fifth-strings2` worked on two faults that the round `fifth-strings` left
in the lift and the lowering of the rabbit, the red fox, and the cat: the grip in the left paw
changed by 56° to 79°, and the forearm skin unwound fast near 180°. The report
[`2026-10-27-violin-carry.md`](../research/2026-10-27-violin-carry.md) gives the measures. The user
can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The user: "the violin/viola are rotating in the different direction than their player's wrist/arm". At rest, the left paw takes its own turn in the plane of its palm (`restPawTurnL`, 20° to 42°) in place of the retarget turn, so the grip in the paw changes 22° to 27° in a move (56° to 79°). | 4.4, 5.2 |
| In a move, the paw takes the retarget turn plus the rest difference times `(1 - weight)²` (`carryLift()`): with `1 - weight`, the cat claws went 2.4 cm into the viola in a lowering (1.8 cm). A linear mix of the two turns put the viola 2.7 cm into the body. | 5.2 |
| The user: "in rest mode the violin / viola are clipping with their hand". The rest grip is the playing grip, curled, off the neck, and turned a little around the top normal (`restYawL`: -5° rabbit, 0° red fox, 10° cat, 30° to 45° before). Larger turns add to the grip change. | 5.2 |
| The red fox holds the neck at 0.37 of the fingerboard, and the cat 11 mm off the neck (0.4 and 3 mm): at the old values with the rest turn, the fox forearm went 0.2 cm and the cat claws 0.9 cm into the instrument at rest (0 cm and 0.3 cm). | 5.2 |
| The left paw supinates from the rest grip to the playing grip (`mixTwist()`). | 5.2 |
