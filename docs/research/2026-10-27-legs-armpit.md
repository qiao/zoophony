# The polar bear shins and the deer armpit

Date 2026-10-27. Round `fifth-legs`. Decisions:
[`2026-10-27-legs-armpit.md`](../decisions/2026-10-27-legs-armpit.md). The probes and their
outputs are in [`2026-10-27-legs-armpit/`](2026-10-27-legs-armpit/). Each command runs from the
root of the tree. "Main" is `8a58282b`. A probe of `main` runs in a tree of `git archive main`.

## 1. The question

The rounds `fifth-bears` and `fifth-deer` left a groove on the left shin of the polar bear, light
wedges on its calf backs from az 150 to 180, and a dark left armpit of the deer from behind. The
goal is the cause of each fault with a measure, and a fix that no view shows worse than `main`.

## 2. The polar bear shin

### The causes

`probes/steps.py` saves the mesh after each step of the rig. `probes/bad_diagonals.py` lists 62
source edges of the left leg whose two corners across the edge sum to more than 180°
(`bad-diagonals.txt`). One runs from 1 cm above the knee down the shin front (vertices 1088 to
1229, 0.137 units, 290° across). The bent knee keeps it a straight chord, so its quad turns 32°
as a ridge in the source and 99° as a valley in the bind: the groove of L-30. With the other
diagonal, the bind quad is a ridge of 31°. The front ring cuts the chord at vertex 2152, but a
vertex on a chord stays on it: edge 1088 to 2152 turns 102° on `main` (`edge-steps.txt`).

The calf edges of the wedges turn 2° to 30° up to the crease step, and 58° to 105° after the knee
smoothing (`kneeCrease`). Its weight falls by rings of neighbors, and a long calf face puts its
far corner in ring 1, 0.087 units down the calf, next to a vertex that keeps its place. Each such
face tilts, and the low back views show it as a light wedge (`shin-drawings.webp`, hard edges
above the crease angle of 40° in red). The earlier round counted hard edges within 0.1 units of
the knee, and the wedges lie 0.1 to 0.15 units down the calf.

### The fix

The final config flips the bad diagonals within 0.15 units of the knee, fades the smoothing by
the distance from the seam, cuts the calf with two back rings, and keeps the hips in place. Each
row runs with the tool of the round (`leg_flips()`, `seam_relax()`, `knee_relax()`):

| Variant | Calf hard L / R | Outer hard L / R | Knee edge L / R | Leg folds |
|---|---:|---:|---:|---|
| `main` | 27 / 13 | 23 / 20 | 0.100 / 0.112 | none |
| flips within 0.25, rings and smoothing of `main` | 23 / 12 | 15 / 13 | 0.100 / 0.110 | the belly crease, 10,883 |
| flips within 0.15 | 23 / 13 | 14 / 16 | 0.100 / 0.116 | none |
| and the two calf rings | 18 / 10 | 14 / 16 | 0.100 / 0.118 | none |
| and the smoothing by distance 0.11, 16 rounds | 4 / 4 | 13 / 2 | 0.091 / 0.110 | inner right thigh, 6 |
| final with no calf rings | 12 / 5 | 12 / 4 | 0.096 / 0.112 | none |
| final: distance 0.105, 12 rounds | 4 / 5 | 12 / 4 | 0.096 / 0.112 | none |

The hard counts are the edges above 40° within 0.2 units of the knee: the calf on the inner side,
and the knee and shin front (`probes/zone_turns.py`, `zone-turns.txt`). The knee edge is the
longest edge within 0.1 units of the knee (`knee-probes.txt`: no edge through the skin, no hard
edge at the back of the knee). The leg folds are face samples of `pnpm rig-mesh polar-bear --check
--set` (`rig-check.txt`). A flip radius of 0.12, a reach of 0.09, or 16 or 20 rounds fold a face of
the inner right thigh, and a reach of 0.12 moves the lowest sole vertex and thus each pose
(`probes/lowest.py`).

### The gates

| Gate | `main` | Round |
|---|---|---|
| `pnpm body-probe --base main` | | only the polar bear mesh, joints and 1,492 pose sets the same (`body-probe-a.txt`) |
| `pnpm arm-check pianist --base main` | | each value of `main`, no `FAIL` (`arm-check-pianist.txt`) |
| `pnpm fold-probe pianist --base main` rest, play, lift | 34, 32, 34 | 34, 32, 34 (`fold-pianist.txt`) |
| Triangles of the polar bear | 4,452 | 4,560 |
| `pnpm size --base main` | 819,139 B | 819,692 B (`size-a.txt`) |

### The images

`main` is above the round in each image.

- `knee-low.webp`: the ten cameras of `knee-cams.json` at 8 s of `boulanger-matin` and at rest
  (60 s). `knee-180.webp`: R180 and L180 at full size.
- `strip-L-30.webp`, `strip-R150.webp`, `strip-L-150.webp`: the play from 8 s to 15.5 s.
- `legs-e20.webp`, `legs-e40.webp`: 2x crops of the legs at each moment, from six views
  (`pnpm close-views pianist --sheet --box 0.1,0.5,0.8,0.5 --scale 2`).

The groove and the sharp wedges are gone. At L180, one soft darker facet stays on the left calf,
where the fillet of the smoothing ends above the first calf ring (edge 2214 to 2251, 72°).
