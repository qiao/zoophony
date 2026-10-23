# The A-pose elephant mesh

Date 2026-10-22 to 2026-10-23. The user gave a new elephant mesh with the arms in an A-pose and
said: "replace the elephant model by the one at
@~/Downloads/Meshy_AI_elephant_apose_3k_tri_1023061408_texture.glb note that do not cut its arm
or create a dent in the arm". The decisions are in
[`2026-10-23-elephant-apose.md`](../decisions/2026-10-23-elephant-apose.md). The probes and
their outputs are in [`2026-10-22-elephant-apose/`](2026-10-22-elephant-apose/).

## The mesh

The mesh has 3,113 triangles and 1,559 vertices after the weld (`sections-y.txt`). The arms
hang about 45° down and out (`source-views.webp`). The height cuts show each arm apart from the
trunk from y 0.43 to y 0.55, and the arm joins the trunk only at the shoulder, at y 0.57. The cuts
across the arm axis (`arm-axis.txt`) give a round arm of about 0.105 u, from the shoulder at
(0.16, 0.605) to the paw tip at (0.343, 0.441). The crotch is at y 0.19, the chin at y 0.745, and
the skull top at y 1.0 (`measures.txt`). The source has one open edge pair of 2.7 cm at the left
side of the head (`loops-probe.txt`).

The faces of the arms are long and thin. Each arm has about 30 edges longer than 0.1 u, and the
longest is 0.22 u, the length of the whole arm. So some faces run from the shoulder to the paw.

## Size, joints, and colors

The skull top stays at 1.920 m, the height of the elephant of `main`, so one unit is 1.92 m and
the shoulder landmark is 1.1616 m. The arm from the shoulder joint to the middle of the palm is
0.387 m, against 0.451 m for the old mesh. The palm of the old config turns with the arm, from
the hanging arm onto the arm of the A-pose. The eyes lie at y 0.854 to 0.878 (`head-colors.txt`).
The fur has the hue 43° to 61° (`fur-colors.txt`), so the tone rows move it to the species colors,
as for the old mesh. The ear flaps below y 0.76 hang apart from the head. At the cut 0.77 the
right flap joined the shoulder.

## The long arm faces

With the line rule of the other meshes (angle 150°), the middle corner of each long thin face
takes the mix of the weights of its two far corners. On this mesh, 5 vertices of the left arm
then took trunk weight and forearm or paw weight together (`weights-line-150.txt`). At 170°, the
rule takes only 19 corners, and no vertex mixes them (`weights.txt`).

A copy with each long arm edge split at its middle, on the edge, gave clean weights and clean
bends, with 4,107 triangles. The user asked "why are you remeshing while rigging?" and chose "No
split, original faces". The sliver rule then made a wedge at the back of the left shoulder of that
copy, because a chain of the new thin faces took one weight set (`split-wedge.webp`, top row). The
copy is not in the tree.

## Folds and the arm gate

On the original faces, with the line rule at 170° and two shapes of raised arms
(`pnpm raise-fit timpanist --faces ... --side R|L`), one to three thin faces fold in each sample
(`pnpm fold-probe timpanist`). On `main`, one face folded in one sample. Shapes of bent elbows, a
`rigid` rule on the folded faces, and bind arms nearer to the A-pose each gave more folds
(`pnpm rig-mesh elephant --check --set ...`).

`pnpm arm-check timpanist --base a655e122` gives no value over a limit: folds p95 2 of 8, flat
share 0.71 and 0.87 against 0.55, and move twist 20° of 176°. Its verdict is FAIL against the old
mesh, which had a flat share of 0.96 and a move twist of 5°. `pnpm arm-look timpanist` passes:
crease share 6.0% and 7.2% against the limit 14.6%.

The views at rest (`rest-views.webp`) show the open problem: dark shards on the bent arms from the
front, and a slit under the left forearm from the back. `crease-edges.txt` lists the edges whose
fold angle changes most: they lie along the long faces of both arms. A flat triangle that runs
past the elbow cannot bend with it, so weights and shapes cannot remove these shards.

## Eyes

The user said that the eyes are too big. A pea eye is 0.18 of the head height that shows, and the
large head of the elephant gives eyes of about 0.107 m. The reference elephant has eyes of about
0.045 of its head height. The lineup (`eye-lineup.webp`, rows 1, 0.8, 0.6, and 0.45) gives 0.6 as
the middle step.

## Checks

`pnpm size --base a655e122`: 729,514 B, 156 B less than the base.
