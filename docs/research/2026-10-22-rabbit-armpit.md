# The dent at the right armpit of the rabbit

Date 2026-10-22. Round `rabbit-armpit`, base `dee3f543`. Decisions:
[`2026-10-22-rabbit-armpit.md`](../decisions/2026-10-22-rabbit-armpit.md). The probes and their
outputs are in [`2026-10-22-rabbit-armpit/`](2026-10-22-rabbit-armpit/). Each command runs from
the root of the tree. Copy a probe of `probes/` to `scratch/` before you run it. `with-glb.ts`,
`dump.py`, and `flap.ts` are in [`2026-10-22-bear-armpit/`](2026-10-22-bear-armpit/) and
[`2026-10-22-arm-roots/`](2026-10-22-arm-roots/), and `elbow-look.ts` in
[`2026-10-21-rabbit-elbow/`](2026-10-21-rabbit-elbow/).

## 1. The question

The user said: "Note that the rabbit's arm is not yet fixed", then "I mean there's a dent near the
armpit of the rabbit". The screenshot showed a concave hollow with a shadow where the bow (right)
upper arm meets the chest, from the right front. The goal: a smooth convex surface at the right
arm root at each moment of `ROLE_VIEWS.violinist`, from six views at the heights 20° and 40°, by a
local edit of a copy of the mesh.

## 2. The cause

`probes/dump-mat.ts` writes the posed body of each fold sample (step 4 s, each second play
sample: 791 samples) with the bone matrices. `probes/sdent.py` gives, for each vertex near the
right shoulder, its depth below the convex hull of its neighbors (the rig vertices whose source
lies within 0.05 u), in the source and in each sample. The largest growth is at the front of the
right arm root, where the trunk of the source curls in toward the hanging arm
(`depth-base.txt`, `probes/srender.py`):

```text
   source, seen from the right front              vertex  weights (largest)
        shoulder                                   980    upper arm 0.65, spine1 0.24
           \   arm root   chest                    991    spine1 0.53, upper arm 0.32
            980 ---- 986 ----                      990    spine1 0.64, upper arm 0.23
           /  \ notch   \                          985    spine1 0.34, upper arm 0.42
       arm    975 982 991 985                      982    spine1 0.76 (body run of the cut)
           \    988 990                            988    spine1 0.74
```

The caps of the cut lie in this notch. With the arm down (rest, lift, lowering), the notch shows
as a dark pocket. In the play, the front of the root shows a V crease from az60.

`probes/decomp2.py` takes each pose apart. The bind of the rig turns each source arm onto its bind
arm with linear blend skinning, as a pure bend of about 41° (`bind_turns()` of
`tools/blender/rig_mesh.py`). Then the app turns the arm from the bind to the pose. The probe
recomputes the pose with the arm bones turned only by their bend (swing) from the clavicle, only
by their twist about the bind upper arm axis, or not at all (`decomp-base.txt`, p50 of the play,
cm):

| Vertex | Source | Bind | Play | Bend only | Twist only | No arm turn |
|---|---:|---:|---:|---:|---:|---:|
| 991 | 0.39 | 2.12 | 2.14 | 2.36 | 2.23 | 2.61 |
| 980 | 0.00 | 0.87 | 1.66 | 0.53 | 1.92 | 0.99 |
| 990 | 0.71 | 1.94 | 2.24 | 2.23 | 2.34 | 2.42 |
| 985 | 0.24 | 1.61 | 1.50 | 1.50 | 1.78 | 1.44 |

Of the growth from the source to the play (6.2 cm over the four vertices), the bend of the bind
gives 5.2 cm (84%). The play adds 1.0 cm (16%), and most of it is the twist at vertex 980. A
vertex with weights w and 1 - w on two bones that turn by the angle a apart sinks toward the joint
by r (1 - |w e^(ia) + 1 - w|), r (1 - cos(a / 2)) at w = 0.5. `probes/decomp.py` gives this radial
sink: 0.7 cm to 1.1 cm of bend at rest (swing 51°), and 0.4 cm of bend and 0.3 cm to 0.5 cm of
twist in the play (swing 14°, twist 39° at p50, `decomp-radial-base.txt`). The hull depth grows
more than the radial sink, because the arm vertices of the neighborhood move out while the
trunk vertex moves in.

## 3. The variants

`variants.txt` gives each edit and the rig check of `probes/var.sh`. Three ideas, 12 variants:

| Variant | Edit | Folds play / lift / rest | Look |
|---|---|---|---|
| base `dee3f543` | | 0.0% / 5.8% / 0.0% | dark pocket with the arm down, V crease in the play |
| p1 | push of 7 root vertices, at most 1.47 cm | 0.0% / 5.8% / 0.0% | softer V, smaller pocket |
| p2, p3, p4 | push up to 1.91 cm, with or with no split | 62.5% / 9.4% to 28.8% / 0% to 100% | the shapes of the right arm fail |
| p5 | p1 and 3 splits of the long edges | 0.0% / 5.8% / 0.0% | as p1 |
| h1 (chosen) | hull fill of 5 trunk vertices of the notch, at most 0.62 cm | 0.0% / 5.8% / 0.0% | no pocket with the arm down, V crease in the play |
| c1 to c5 | h1 and a push | 62.3% to 68.2% / 9.4% to 29.0% / 0% to 100% | the shapes fail |
| c6 | h1 and the 3 splits | 0.0% / 5.8% / 0.0% | not rendered |
| c1 with other `raise` rules | `below` 0.1 / 0.3, or `grow` 2 | 62.4% / 12.7% / 0.0% | the shape of the play fails |

Each failure is the relax of a shape of the right arm (`raise` of `tools/mesh-rigs/rabbit.json`):
it turns faces 114, 116, 117, 281, 342, and 346 over, which are the notch faces at the body run of
the cut (vertices 982, 984, 987, 988, 990, 991).

## 4. The measures

| Measure | red fox | base | round |
|---|---:|---:|---:|
| Depth of 991 / 990 / 980 below their neighbors, play p50 (cm, `depth-*.txt`) | | 2.14 / 2.24 / 1.66 | 0.66 / 0.11 / 1.69 |
| Same, rest (cm) | | 1.00 / 0.93 / 0.00 | 0.05 / 0.88 / 0.00 |
| Sum of the depths of 980, 985, 987, 988, 990, 991, play p50 (cm) | | 9.21 | 3.52 |
| Deepest notch vertex below the hull of its ring, rest / play p50 (cm, `notch.txt`) | | 5.39 / 4.32 | 3.35 / 4.42 |
| Down area own R, play p50 (cm², `flap.ts --step 2`) | 5.3 | 15.4 | 15.0 |
| Crease share / section R (`pnpm arm-look violinist`) | 7.3% / 0.93 | 7.1% / 0.60 | 5.0% / 0.58 |
| Above / mid R, play p50 (`elbow-look.ts`) | 0.95 / 0.91 | 0.93 / 0.93 | 0.93 / 0.93 |
| Folds play / lift / rest (`pnpm fold-probe violinist`) | | 0.0% / 5.8% / 0.0% | 0.0% / 5.8% / 0.0% |
| Upper arms in the body, play / lift / rest / lower (cm, `pnpm pose-depth --every 4`) | | 1.2 / 3.3 / 3.3 / 5.9 | 1.2 / 3.3 / 3.3 / 5.9 |
| Triangles of the rig | | 3,165 | 3,165 |
| First download (B, `pnpm size --base dee3f543`) | | 734,439 | 734,349 |

The fox values come from the reports of the bear armpit, the dog seams, and the rabbit elbow. The
deepest notch vertex of the play is the arm vertex 980, which the fill does not move. The sweep
gives the largest value of the role, with the red fox, so the round keeps each value.

`pnpm arm-check violinist --base dee3f543` (`arm-check-violinist.txt`, base in brackets):

| Arm | folds p95 | twist p95 | forearm twist p95 | flat p5 | paw twist p95 | stretch p95 | move twist max | Verdict |
|---|---|---|---|---|---|---|---|---|
| L | 1 (1) | 11 (11) | 78 (78) | 0.63 (0.63) | 167 (167) | 0.15 (0.15) | 180 (180) OPEN | OPEN |
| R | 0 (0) | 29 (29) | 50 (50) | 0.55 (0.59) | 129 (129) | 0.09 (0.09) | 157 (157) | PASS |

The flat p5 of the right arm falls to the limit 0.55, at the start of the lift of mozart-k191
(0.54 at wall 0.5 s). `pnpm arm-check --all --base dee3f543` gives no `FAIL`, and each `OPEN` row
has its base value (`arm-check-all.txt`). `pnpm body-probe --base dee3f543` changes only the 5
rabbit bodies and the rabbit violinist, and all 1,492 pose sets are equal (`body-probe.txt`).

## 5. The images

`root-<moment>-e20.webp` and `-e40.webp` give the 3x crops of the right arm root at each moment
from az35, az60, the right, the front, az150, and the back: the base on top, p5 in the middle,
and the round below (`pnpm close-views violinist <dir> --glb <rig> --base dee3f543 --lineup
--crop 3 --moments frog,tip,crossing,rest,lift50,lower50,stand --views 35,60,right,front,150,back
--elevation <e>`, then `probes/sheet.py`).

At rest, at `lower50`, and at `lift50`, the dark pocket at the front of the root is gone from az35
and az60. From the right and the front, a small light V stays. At the frog, the tip, and the
crossing, the round keeps the look of the base: a V crease at the front of the root from az60 and
a soft hollow from az35. p5 softens that V, but it keeps a smaller pocket with the arm down.

`stage-at-pairs.webp` gives the rabbits from the stage at full size in brahms-2 at 130.38 s (left
column) and 678.63 s (right column), from az35, az120, az180, and az-150 (`pnpm close-views play
<dir> --demo brahms-2 --time 130.38 --time 678.63 --at rabbit:violin --azimuth <a> --base
dee3f543`), the base left of the round in each pair. At this size, the round keeps the look of the
base, with no new mark.

## 6. The result

The round takes h1. It removes the dark pocket of the front notch with the arm down, and it
lowers the depths of the trunk vertices of the notch in the play, with no change of the folds,
the gate, or the elbow. The V crease at the front of the root in the play stays. Its arm vertex 980
sinks by the bend of the bind and the twist of the play, and a push of the root front on top of
the fill made the shapes of the right arm fail. The next step: let the shapes relax with the fill
and the push, or fill the bind (in place of the source) so that the arm-down shape gives the
source back at rest.
