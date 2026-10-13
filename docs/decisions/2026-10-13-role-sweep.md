# Decisions of the sweep of each role

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-13, the user asked for changes that make the next tasks faster. The agent of the
branch `e2a-sweep` decided these rows. `pnpm pose-depth <role>` prints the measures. The user can
reverse each decision. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The sweep measures the arms against one closed body: the trunk, the head, the tail, the legs, and the shoulders, with a cap on the cut to each upper arm. With no shoulder bones, the triangles of the shoulders leave one open loop across the back, and a cap over it is false | 9.3 |
| A point belongs to the moving part of the main bone of its corner. A triangle of the upper arm can reach past the elbow, so the bone of its first corner gave false depths of the upper arm | 9.3 |
| Accepted: the forearms of the pianist go up to 9 cm into the body in a play. The row "Accepted limits" of [`2026-10-12-studio-polar-bear.md`](2026-10-12-studio-polar-bear.md) gives 6.0 cm for the trunk alone. With the shoulders in the body, the sweep measures 8.0 cm (Bach, 273.5 s, the middle of the right forearm) | 5.3, 9.3 |
| Accepted: the upper arms of the pianist go up to 4 cm into the body in a play. The skin of the upper arm of the round studio polar bear runs inside the side of its belly to the elbow. The sweep measures 2.9 cm in a play. At rest and in the lift, the upper arms stay within the contact depth: the sweep measures 0.0 cm with the rest lean of [`2026-10-13-pianist-rest.md`](2026-10-13-pianist-rest.md), and it measured 6.5 cm with the upright trunk of before. The cut to each upper arm is long and not flat: 28 to 34 edges, points up to 0.35 m from its middle, and up to 0.19 m off its plane. So a point of the upper arm near the cut has its depth to the fan cap, and its depth to the nearest triangle of the body can be larger | 5.3, 9.3 |
| Accepted: the forearms and the upper arms of the conductor go up to 4 cm into the body when the arms lift and lower. The hanging arm of the rest pose touches the side of the round body (design 5.2). The sweep measures 3.7 cm. The depth of an upper arm is to the fan cap of its cut when the cap is nearer: 3.5 cm to the cap is 6.5 cm to the nearest triangle of the body | 5.2, 9.3 |
| The sweep checks the note targets of the pianist with the skeleton: each palm is at most 0.1 mm from its keys 0.02 s after each note start, in each demo | 5.3, 9.3 |
| The case of the piano leaves out each shell with an open loop: the 16 strings are flat strips under the lid | 9.3 |
| The test of the conductor clearance runs the sweep of the conductor over a full play of each demo, and over the lift, the bow, and the lowering of the arms. Each point of the paws, the claws, the forearms, the upper arms, and the baton stays at most 1.5 cm in the closed body, the contact depth of the studio, or at most its accepted depth. The bear keeps 2 cm from its stand, and the left hand keeps 2 cm from the head and the right arm when the arms lift and lower. The sweep has six shard files, one demo in each. This row replaces the row of the test in [`2026-10-12-studio-bear.md`](2026-10-12-studio-bear.md) | 5.4, 9.3 |
| The test of the pianist clearance runs the sweep of the pianist over a full play of each demo with a piano, the lift, and the rest pose. Each point of the paws, the claws, the forearms, and the upper arms stays at most 1.5 cm in the closed body and in the closed case of the piano off the keyboard, or at most its accepted depth. The paws stay off the bench, and the body keeps 1 cm from the case. The sweep has two shard files, one demo each. This row replaces the row of the test in [`2026-10-12-studio-polar-bear.md`](2026-10-12-studio-polar-bear.md) | 5.3, 9.3 |
