# Decisions of the rabbit arms with a short stretch

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-23, the user said: "use the new rabbit model and stretch the arm a little bit". The
main session decided the rows below. The report
[`2026-10-23-rabbit-arms.md`](../research/2026-10-23-rabbit-arms.md) gives the measures and the
images. The user can reverse each decision. Then update its section, and remove its row.

| Decision | Section |
|---|---|
| The rabbit takes the A-pose mesh `rabbit-apose.glb` with its own faces: no cut, no copy, no ring, and no split. The arm factor is 1.3 (1.63 before): the arms reach 0.4094 m, 0.320 m with no stretch. With the old reach (1.6225), 10 and 11 arm faces folded (limit 8). | 4.4 |
| The violin is 0.83 of the app violin (0.958 before), so that the left paw reaches the nut with the gap of the old rabbit. With the factor 1.4, the violin 0.90 folded 9 and 11 faces. This replaces the rabbit values of rows 1 and 2 of `2026-10-14-arms-rest.md`. | 4.6 |
| The right elbow at the frog points less down, (1.8, -0.3, -1): 7 right folds (9 before). | 5.3 |
| The left elbow points further down, (-1, -1.4, -0.3): the left upper arm keeps 0.55 of its round shape in the lift (just below before). | 5.3 |
| The bow grip at rest is 0.45 H above the knee (0.3 H): the right wrist stretches 0.35 (0.36, limit 0.35). | 5.3 |
| Corrective shapes and weight rules do not stay: they moved the right folds to other faces. | 4.4 |
| Open: the long arm faces show dark shards on the bent arms. A crease of 60° or 80° does not remove them, so the crease stays 35°. Only a split removes them. | 4.4 |
| The arm gate against `main` says FAIL: each value is in its limit, but the old rabbit with split faces had better values. | 9.3 |
