# The round inner side of the rabbit arms

Date 2026-10-22. Round `rabbit-elbow`, base `7c1747ed`. Decisions:
[`2026-10-22-rabbit-elbow.md`](../decisions/2026-10-22-rabbit-elbow.md). The probes and their
outputs are in [`2026-10-22-rabbit-elbow/`](2026-10-22-rabbit-elbow/). Each command runs from the
root of the tree. Copy `elbow-look.ts` of
[`2026-10-21-rabbit-elbow/`](2026-10-21-rabbit-elbow/) into `scratch/` before you run it.

## 1. The question

The user said on 2026-10-21: "the rabbit's arm is deformed. Compare that with the original mesh".
The cause is in [`2026-10-21-rabbit-elbow.md`](2026-10-21-rabbit-elbow.md): the inner side of each
hanging arm of the source joins the trunk from the middle of the upper arm to past the elbow. The
cut of the rig closed the arm there with one flat polygon, which showed as a flat sheet with a
straight end at the bent elbow. The manager chose a remodel of the inner side of each arm in a
copy of the mesh, as the pig tubes do. The goal: a round elbow from each view, above and mid of
0.75 or more on each side, and no `FAIL` of the arm gate, with the armpit of `7c1747ed`.

## 2. The edit

`rabbit_elbows.py` writes `assets/models/rabbit/rabbit-4-elbows.glb` from `rabbit-4-arms.glb`:

```text
 source arm section (bind, at the elbow)        copy
        outer side                              outer side
       .---------.                             .---------.
      /           \                           /           \
     |    arm      |                         |    arm      |
      \___________/  <- flat cap of the cut   \           /  <- round patch
                                                '-------'
```

1. It removes the faces that join each arm to the trunk, with the rule of the cut: 15 on the
   right and 19 on the left.
2. It closes each arm with a patch over the arm run of the hole. New vertices lie on a grid of
   the chart of the arm, a constrained Delaunay triangulation joins them to the run, and 40
   rounds move each one to the mean of its neighbors and out to a circle fitted to the arm at its
   place, times 0.85. The push grows from 0.55 to 0.85 of the upper arm, so that the patch near
   the armpit stays near the old cap. Each patch has 14 new vertices and 35 faces.
3. The right run moves with the patch, except vertices 1003 and 975 (the armpit rounds pinned
   them). Vertex 1015 of the run lies 1.5 cm from the bone axis, and with a fixed run the patch
   showed a valley beside a ridge (`sections-main-e7.webp`).
4. It leaves the hole of the trunk open. The cut closes it with its caps, its quad, and the
   normals of `bodyNormals`, as before (`open_loop()` of `tools/blender/rig_mesh.py`).

The patch lies inside the plane `armSplit`, so the rig gives it to the free arm as an island
that only free arm vertices surround (`weights.armIslands`, `arm_islands()`). A plain run of the
script gives the same bytes (the SHA-256 is in `assets/models/rabbit/README.md`).

## 3. The measures

| Measure | red fox | `main` 7c1747ed | round |
|---|---:|---:|---:|
| Above, play p50 R / L | 0.95 / 0.86 | 0.57 / 0.65 | 0.93 / 0.77 |
| Mid, play p50 R / L | 0.91 / 0.94 | 0.63 / 0.79 | 0.94 / 0.96 |
| Below, play p50 R / L | 0.72 / 0.82 | 0.72 / 0.71 | 0.81 / 0.80 |
| Outer, play p50 R / L | 0.82 / 1.03 | 0.73 / 0.82 | 0.93 / 0.92 |
| Flat patch cm² p95 R / L | 72.4 / 41.5 | 40.7 / 46.3 | 43.9 / 37.9 |
| Section (`pnpm arm-look`) R / L | 0.93 / 0.74 | 0.74 / 0.82 | 0.60 / 0.81 |
| Arm gate flat p5 R / L | | 0.60 / 0.63 | 0.59 / 0.63 |
| Folds rest / play / lift | 100% / 5.0% / 21.0% | 0% / 0% / 5.8% | 0% / 0% / 5.8% |
| Upper arms in body, rest / lift / lower (cm) | 3.3 / 3.3 / 3.3 | 0.0 / 0.0 / 0.0 | 2.5 / 2.6 / 5.9 |
| Triangles (budget 3,200) | | 3,125 | 3,165 |

The outputs: `elbow-round.txt` (`node scratch/elbow-look.ts violinist`), `fold-violinist.txt`,
`arm-look.txt`, `arm-check-violinist.txt` and `arm-check-all.txt` (`--base 7c1747ed`, no
`FAIL`, each `OPEN` as on the base, and `gate-k417-165.webp` of `--views-all`), `pose-depth.txt`
(`--base 7c1747ed`), and `body-probe.txt` (only the 5 rabbit bodies and the rabbit violinist
change, and all 1,492 pose sets are equal). The fox and `main`
values of the elbow come from `elbow-main-fox.txt` and `elbow-main-rabbit.txt` of the last round.

`variants.txt` gives the 16 variants. A target circle of the full radius (e1) made a lump under
the bent elbow, and an ellipse on the chord of the hole (e2, e3) a web between the arm and the
trunk (`bind-main-e1-e7.webp`). A flat patch (f0) folded each play sample.

## 4. The images

`pairs-tip.webp`, `pairs-lift50.webp`, `pairs-frog.webp`, and `pairs-rest.webp` give `7c1747ed`
on the left of each pair, at the back, azimuth 150, the right, the front, the left, and azimuth 35
(`pnpm close-views violinist <dir> --lineup --moments tip,frog,crossing,lift50,lower50,rest
--views back,150,right,front,left,35 --base 7c1747ed`, then `pairs.py`). From the back and at
azimuth 150, the flat sheet with its straight end is gone: the bent elbow shows a lit round end.
The armpit, the dark band under the bow arm at the frog, and the rest views keep the look of
`main`. `strip-az*.webp` give the play of bach-bwv1047 from 208 s at the four azimuths: no clip
and no twist.

## 5. The open items

- The sweep gives "upper arms in body" of 2.5 cm at rest and 5.9 cm in the lowering
  (bach-bwv1050 at 14.2 s), 0 on `main`, so it marks `GROWS`. The patch bulges toward the trunk,
  and a hanging arm puts it into the side of the trunk, where no view shows it in the crops at
  `rest` and `lower50`. A smaller push near the armpit (e8) gave the right above 0.71.

- The section of the right upper arm of `pnpm arm-look` falls from 0.74 to 0.60. No variant with
  a round elbow kept it: e9 gave 0.70 with a flat patch of 95 cm². On the sample bach-bwv1047
  at 211.9 s, the section at 0.5 of the upper arm is 0.68 against 0.69 for the edge crossings, and
  0.75 against 0.79 for a contour at even steps (`section_density.py`). A bone heat on a flat
  patch did not change the median. The cause of the drop is open.
- At `lower50` and `lift50` from azimuth 150, a dark lower face of the elbow stays. From the
  front at the frog and the crossing, a thin dark line runs under the forearm near the elbow.
