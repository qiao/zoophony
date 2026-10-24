# The rabbit arms with a short stretch

Date 2026-10-23. The A-pose rabbit mesh of the user stayed out of the app, because with its own
faces and the reach of the old rabbit, the arms folded past the arm gate
([`2026-10-23-rabbit-apose.md`](2026-10-23-rabbit-apose.md)). The user then said: "use the new
rabbit model and stretch the arm a little bit". The decisions are in
[`2026-10-23-rabbit-arms.md`](../decisions/2026-10-23-rabbit-arms.md). The probes and the images
are in [`2026-10-23-rabbit-arms/`](2026-10-23-rabbit-arms/).

## The reach and the violin

The arm factor of the mesh sets the reach from the shoulder joint to the middle of the palm
(`reach.txt`). With no stretch, the reach is 0.320 m. The factor 1.6225 gives the old reach of
0.5056 m, 1.4 gives 0.439 m, 1.3 gives 0.409 m, and 1.2 gives 0.380 m. With the violin of 0.958,
the shorter arms do not reach the nut: the left paw reaches the fingerboard from 0.10 (1.4), 0.26
(1.3), and 0.43 (1.2) of its length.

The old rabbit plays with the scroll 3.8 cm beyond its extended left arm. A violin with the same
gap is 0.90 of the app violin for the factor 1.4, and 0.83 for the factor 1.3. With the factor 1.3
and the violin 0.83, the left paw reaches the whole fingerboard.

## The arm gate

`gate-variants.txt` gives the arm gate of each variant. With the old hold, the factor 1.4 folds 9
and 11 faces (limit 8), and the factor 1.3 folds 5 and 9. The factor 1.3 is the smaller stretch,
so the rest of the round fits it.

Weights and shapes did not lower the folds of the right arm:

- Corrective shapes of the right upper arm and the right forearm (`pnpm raise-fit`) moved the
  folds to other faces: 12, 16, and 15 folds.
- The line rule at 155° and 140°, and longer slivers, gave 9 to 14 folds.

The pose of the hold did:

- The right elbow at the frog points less down, (1.8, -0.3, -1): 7 folds.
- The left elbow points further down, (-1, -1.4, -0.3): the left upper arm keeps 0.55 of its
  round shape in the lift (just below 0.55 before).
- The bow grip at rest is 0.45 H above the knee, 0.15 H higher: the edges of the right wrist in
  the rest are 0.35 shorter than in the play (0.36 before, limit 0.35).

With these changes, each value is in its limit (`arm-check.txt`). Against `main`, the gate says
FAIL because the old rabbit had split arm faces and better values: for example, 7 right folds
against 0. The left move twist of 180° is the same as on `main`.

## The depths

`pose-depth.txt` and `pose-depth-soloist.txt` compare the depths with `main`. The seated rabbit
keeps each depth at 2.4 cm or less. The left forearm goes 2.0 cm into the violin in the play
(0.0 cm on `main`), and the upper arms no longer go into the body in the lift, the rest, and the
lowering (up to 5.9 cm on `main`). Standing, the violin goes 3.4 cm into the body in the lift and
the lowering (3.1 cm on `main`).

## The look

The rabbit sits and plays as on `main` (`play-views.webp` and `rest-views.webp`, `main` in the odd
rows), with a smaller violin. The 2x crops (`arm-crops.webp`, `main` on the left) show the open
fault: dark shards on the long faces of the arms. At rest, they show on both arms. At the frog
and at the tip, the bow arm reads as a flat sheet with a dark slash. The dark stripe down the side
of the trunk at rest is mostly the shadow between the hanging arm and the body, which `main` also
shows.

A larger crease angle does not remove the shards: at 60° and 80°, the slashes stay
(`crease-lineup.webp`, 35°, 60°, and 80° from the left). The long faces of the mesh cause them, and
only a split of those faces removes them, which the user does not allow.
