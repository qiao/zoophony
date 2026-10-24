# The T-pose bear mesh

Date 2026-10-23. The user gave a new bear mesh and said: "also use the new bear model [...] note
that this is a T-pose". The decisions are in
[`2026-10-23-bear-tpose.md`](../decisions/2026-10-23-bear-tpose.md). The probes and the images are
in [`2026-10-23-bear-tpose/`](2026-10-23-bear-tpose/). The probe scripts are those of
[`2026-10-23-rabbit-apose/`](2026-10-23-rabbit-apose/): `dump.py`, `sections.py`, `arm_axis.py`,
and `head_colors.py`.

## The mesh

The mesh has 3,142 triangles and 1,573 vertices after the weld, in one part with no open edge
(`assets/models/bear/README.md`). It is a round brown bear with a tan muzzle, painted eyes, round
ears, black claws, and a ball tail (`source-views.webp`). The legs part below y 0.18
(`sections-y.txt`). The arms of the T-pose go out to the sides and a little down. They are free
of the trunk beyond x 0.18, from y 0.58 to 0.75 (`sections-x.txt`). The cuts across the arm axis
give the middle line of the arm, from the root at x 0.19 to the paw at x 0.40 and the claw tips
at x 0.50 (`arm-axis.txt`). `head-colors.txt` finds the painted eyes (9 and 6 dark faces) and the
dark nose (19 faces).

## The rig

`make_config.py` writes `tools/mesh-rigs/bear.json`. The rig keeps each face of the mesh, with no
cut, no copy, no ring, and no split. The free arms of the T-pose need no cut: the plane of the
arm split and a radius around the arm joints free them, above the belly (`weights.armFree`).

The bear keeps the size of the studio bear: the shoulder joints at 1.0 m. The skull top is then
at 1.454 m (1.483 m on the studio bear). The arms keep the length of the mesh: 0.396 m from the
shoulder joint to the middle of the palm (0.540 m on the studio bear).

## The arm gate

`gate-variants.txt` gives each variant. With the elbow halfway to the wrist (x 0.29) and the palm
down, the left arm stretched 0.51 (limit 0.35). Three long faces under the upper arm run from the
armpit at x 0.18 to x 0.33, past the elbow, so the bend of the elbow stretched them
(`pnpm arm-check conductor --explain stretch`). With the elbow at x 0.31 or 0.33, the stretch is
0.17 or less. The palm direction sets the paw twist: down gave 113° and 105°, down and back gave
157°, and down and forward gave 53° to 70°.

The elbow at x 0.31 with the palm down and forward, (0, -0.5, 0.85), gives the paw twists 53° and
47° (59° and 49° on the studio bear). Each value is in its limit (`arm-check.txt`). Against
`main`, the gate says FAIL only where the smooth studio bear had better values.

## The depths and the look

`pose-depth.txt` compares the depths with `main`. The upper arms go 3.5 cm into the round body
while the arms move (1.4 cm on `main`). In the play, the depths are 1.2 cm or less.

The bear conducts with the baton in its right paw, and each arm bends cleanly in each beat
(`views.webp`, and `base-views.webp` for `main`). The 2x crops (`arm-crops.webp`, `main` on the
left) show some long sharp facets on the bent upper arms, from the side and from the back. At
rest, the arms stand out about 35° from the body, around the wide belly, where the studio bear
held its paws at its hips (`rest-and-beat.webp`: `main`, the new bear at rest, and a beat).
