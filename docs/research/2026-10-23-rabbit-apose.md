# The A-pose rabbit mesh

Date 2026-10-23. The user gave a new rabbit mesh with the arms in an A-pose and said: "replace the
model for rhino and rabbit and also don't split the arm". The user slept and asked for no
questions. The round rigged the mesh, and the rabbit of `main` stays in the app, because the
remaining fixes need a choice of the user. The probes and their outputs are in
[`2026-10-23-rabbit-apose/`](2026-10-23-rabbit-apose/).

## The mesh

The mesh has 3,118 triangles and 1,566 vertices after the weld (`sections-y.txt`). The arms go
out, down, and a little forward from the shoulder at (0.091, 0.484) to the paw tip at
(0.268, 0.326), apart from the trunk from y 0.33 to 0.43 (`arm-axis.txt`, `source-views.webp`).
The crotch is at y 0.16, the neck is narrowest at y 0.57, and the ears split above y 0.76. The old
eye and nose boxes find the eyes and the pink nose (`head-colors.txt`).

## The rig

`rabbit-apose-config.json` is the config of the trial. It keeps each face of the mesh: no cut, no
copy, no ring, and no smoothing of the source. It keeps the leg factor 1.75 and the standing
shoulders at 0.8513 m of `main`, and the arm factor 1.6225 gives the reach 0.5056 m of `main` for
the violin of 0.958 that the user chose on 2026-10-14. The seated pose looks as on `main`
(`main-and-apose.webp`, `main` in the top row).

## The arms

At this reach, the arms fold past the limit of the arm gate. `pnpm arm-check violinist --base
a655e122` (`arm-check.txt`) gives folds p95 of 10 and 11 faces against the limit 8 (1 and 0 on
`main`), and the bow arm reads as a flat white blade with dark shards from the front
(`apose-views.webp`). Most folded faces are near-flat slivers along the stretched arms, with a
corner of 169° to 175°.

Corrective shapes of the upper arm, the forearm, and the paw move the folds to other faces
(`raise-sets-folds.txt`). The line and sliver rules change little (`weight-rules-folds.txt`). With
the arm factor 1, most folds go (`arm-factor-folds.txt`), so the stretch of the long thin arm
faces causes them. With its own faces and no split, the rabbit needs shorter arms, and then a
smaller violin or a nearer hold.
