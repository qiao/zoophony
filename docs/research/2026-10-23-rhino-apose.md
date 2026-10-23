# The A-pose rhino mesh

Date 2026-10-23. The user gave a new rhino mesh with the arms in an A-pose and said: "replace the
model for rhino and rabbit and also don't split the arm". The decisions are in
[`2026-10-23-rhino-apose.md`](../decisions/2026-10-23-rhino-apose.md). The probes and their
outputs are in [`2026-10-23-rhino-apose/`](2026-10-23-rhino-apose/).

## The mesh

The mesh has 3,113 triangles and 1,547 vertices after the weld (`sections-y.txt`). The arms hang
about 45° down and out (`source-views.webp`). The height cuts show each arm apart from the trunk
from y 0.39 to y 0.53, and the arm joins the trunk at y 0.55. The cuts across the arm axis
(`arm-axis.txt`) give an arm of about 0.11 u by 0.13 u, from the shoulder at (0.158, 0.59) to the
paw tip at (0.373, 0.399). The skull top between the ears is at 0.9448 u, nearly the height of the
old mesh (0.9415 u). The eyes lie at y 0.811 to 0.824 (`head-colors.txt`).

## The rig

The rig takes the faces of the mesh as they are. The tube rules of the old copy go, and the line
rule takes the angle 170, as for the A-pose elephant. The scale keeps the head top of 1.462 m.
`pnpm rig-mesh rhino --check` gives a standing body within 0.37 mm of the source, and the arm gap
check gives each arm a join from 0.35 to 0.84 of the upper arm on the left and from 0.51 to 0.72
on the right, with gaps of 21.2 cm and 17.8 cm below. The left join is past the limit 0.79, because
a few faces of the armpit carry trunk weight. The audit views show no flap or dent there.

## The tuba

`pnpm hold-reach rhino --instrument tuba` (`hold-reach.txt`) gives each palm 3 mm to 47 mm of
spare reach to its grip. `pnpm pose-depth tubist` (`pose-depth.txt`, `pose-depth-main.txt`)
gives the upper arms 1.8 cm in the body, against 16.0 cm on `main`, where the ball of each tube
lay inside the trunk. The tuba goes 3.8 cm into the belly, against 2.9 cm on `main`.

## The arm gate and the look

`pnpm arm-check tubist --base a655e122` (`arm-check.txt`) keeps each value inside its limit: folds
p95 3 and 4 of 8, twist 43° and 26° of 55°, forearm twist 48° and 62° of 80°, flat share 0.77 and
0.63 against 0.55, and paw twist 129° and 149° of 170°. The grip turn of 19° and 16° from the old
median comes from the paw frame of the new body, so the accepted grip takes the new median.
`pnpm arm-look tubist` passes, with a crease share of 13.3% and 9.1% against 14.6%.

The views (`tubist-views.webp`) and the seam audit at the camera height 40°
(`audit-note-e40.webp`, `audit-zoom.webp`, the old body in the top row) show round arms on the
tuba from each side, with no shard and no dent. The dark band around the neck is the collar fold of
the mesh, and the old body shows it too.

## Checks

`pnpm size --base 12116547`: 718,358 B, 11,160 B less than the base, because the old copy had
4,457 triangles.
