# Decisions of the anatomy track

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user said that the lower bodies of the animals are too human: "legs too long,
too thick", with no animal traits. The plan `docs/research/2026-10-07-animal-anatomy-plan.md`
measured the references and split the work into the stages A1 to A5 of the anatomy track. It
assumed the decisions D1 to D10 of its sections 7 and 9. The agent of the anatomy track decided
the details below. The user can reverse each one. Then update the section that holds it, and
remove its row.

| Decision | Section |
|---|---|
| Each species has a leg group (`SpeciesParams.legs`): hare (rabbit), digitigrade (foxes, wolf, cat, dog), hoofed (deer), pillar (bear, polar bear, panda, hippo, elephant, rhino, pig, beaver, badger), small-paw (mouse, meerkat, monkey), and webbed (penguin), as the plan. The group gives the haunch, the lower leg, the knee, and the foot of the seated leg | 4.3, 4.5 |
| The hip joint keeps its place 0.3 H above the seat, and no bone is new. The haunch reaches 0.31 H below the hip, so it lies on the seat. The prototype of the plan raised the hip to 0.34 H | 4.5, 4.7 |
| The knee is 0.66 H in front of the hip (0.68 H for pillar) and 0.22 H above the seat (0.24 H for pillar). The plan had 0.55 H and 0.60 H. With the knees there, the bow of the violin in the rest pose lay inside the round belly, which reaches about 0.74 H forward, and the reference rabbits have a haunch of about 1.5 H. The toes reach 1.00 to 1.06 H in front of the hip, within the 1.11 H that keeps the music stands clear | 4.5 |
| The pillar lower leg is an oval, 0.56 H wide and 0.73 H deep below the knee. Section 9 of the plan asked for a radius of 0.35 to 0.4 H for the bears and the panda. With the hip joints 0.64 H apart, legs of 0.34 H radius touched each other. They also moved the panda of the trombones into the lone stand of a contrabass: the arc from the contrabass to the trombone grew from 1.57 m to 1.63 m before the spread, past the limit of 1.6 m. With the oval leg, it is 1.59 m | 4.5 |
| The knee rings of the pillar leg are round, and only the rings of the lower shin have the depth of 1.3. With the depth on the knee rings, the knee cap of the pig went forward, and the bell of the horn came 0.016 H into its right shin | 4.5 |
| The hare foot is 0.81 × 0.27 H and 0.15 H high, with its heel 0.40 H behind the ankle, so that the toes reach 1.10 H in front of the hip (limit 1.11 H). The plan had a foot of 0.86 H with the heel 0.36 H back, but with a knee 0.55 H in front of the hip. The heel lies under the front edge of the seat | 4.5 |
| The rest places move for the lower laps: the violin and the viola stand at 0.85 of the way to the knee, the bow grip is 0.18 H out and 0.08 H above the knee, the right elbow of the violin and the viola points (1, -0.9, -0.5), and the rested bow tip points 0.3 to the front. The palms of the pianist rest at 0.7 of the way, and the left palm of the harp player at 0.85 of the way, 0.13 H above the leg. The rest and play clearance tests keep their bounds | 5.3 |
| A thin body (the girth 0.75 of the meerkat) has its haunch 0.025 H above the seat, because the hip height does not scale with the girth. The round leg was 0.045 H above the seat. No section of the cast plays the meerkat | 4.5 |
| The digitigrade leg has a hock 0.34 H above the foot rest and 0.14 H behind the knee, as the plan. The `foot` bone is at the hock, and the long bones of the foot (a tube 0.18 H wide) and the paw are rigid on it. The paw is 0.28 × 0.36 H, 0.06 H in front of the knee. The lap at the knee of the fox drops from 0.378 H to 0.364 H, because the lower leg slants back | 4.5, 4.7 |
| The deer has its own leg group, hoofed: the digitigrade leg with a hoof of 0.20 × 0.26 H and 0.18 H high. The plan put the deer in the digitigrade group with a hoof in place of the paw | 4.3, 4.5 |
| A standing pillar leg grows with the plump factor of the species, as the torso does, so the bear and the elephant stand on legs 0.75 H wide and the badger on legs 0.60 H wide, each pair as wide as its torso. The knees stand 0.34 H times the plump factor from the middle, out from the hip joints at 0.32 H, so that the two legs keep 0.1 H apart. The hip joints keep their places | 4.5 |
| The standing soloists of the small species get thin legs: a straight leg for the hare and small-paw groups, and a leg with the knee forward and a hock back for the digitigrade and hoofed groups, on the feet of their seated legs | 4.5 |
| The penguin gets its own leg group, webbed (decision D9): no leg tube, a hem of the torso on `hips` down to 0.12 H above the floor, and paddle feet 0.16 H in front of the knees. With the belly of the torso in the hem and the feet under the knees, the hem hid the feet from the camera above, so the lower hem has a flat front and narrows to its bottom | 4.5 |
| The seated legs of the bears and the panda keep the oval lower leg of 0.56 × 0.73 H. A seated leg that grows with the plump factor needs a wider hip spread, and the hip joints are the contract of `body-frame.ts`. The hippos keep their high stools (decision D4), although `orchestra-side.png` shows them standing | 4.5 |
| The red and the tan foxes get accent lower legs (a new accent part, `lower-legs`: the leg from the knee down) and accent hands, with their accent colors `#453334` and `#755035`, as decision D7 of the plan. The colors stay. The plan named the red foxes, and the tan fox gets the same trait of the species in its own accent color | 4.5 |
