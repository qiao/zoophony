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
| Accepted: the upper arms of the pianist go up to 7 cm into the body in each set. The skin of the upper arm of the round studio polar bear runs inside the side of its belly to the elbow, and the forearms and the paws stay out at rest | 5.3, 9.3 |
| Accepted: the forearms and the upper arms of the conductor go up to 4 cm into the body when the arms lift and lower. The hanging arm of the rest pose touches the side of the round body (design 5.2). The sweep measures 3.7 cm | 5.2, 9.3 |
| The sweep checks the note targets of the pianist with the skeleton: each palm is at most 0.1 mm from its keys 0.02 s after each note start, in each demo | 5.3, 9.3 |
| The case of the piano leaves out each shell with an open loop: the 16 strings are flat strips under the lid | 9.3 |
