# The neck of the red fox, the violins at the neck, and the seat place (2026-10-14)

This report gives the measures and the probes of the branch `neck-violin`. The decisions are in
[`2026-10-14-neck-violin.md`](../decisions/2026-10-14-neck-violin.md). The probes, the logs, and
the images are in [`2026-10-14-neck-violin/`](2026-10-14-neck-violin/).

## The requests of the user

On 2026-10-14, the user looked at the app after the merge of the branch `fox-rabbit-form` and
said:

1. "fox neck too long"
2. "fox and rabbit violin too small and not touching their neck"
3. "fox and rabbit are sitting on the edge of the chair. they should move inside a little bit"

## The neck

The rig gets a neck factor (`neckFactor` of the config of `pnpm rig-mesh`). The neck stretches
only between the neck joint and the head joint of the source, as the thigh and the shin do. The
head grows around the neck joint by the head factor, then moves down the grown neck with the head
joint, so the neck from joint to joint is the neck factor times the grown neck. With the factor 1,
the fox rig keeps the bytes of `main` (SHA-256 `c450e7b5`).

| Neck factor | Head drop | Neck joint to head joint | Play folds, hold of `main` |
|---|---|---|---|
| 1.0 (`main`) | 0 | 11.2 cm | 6.5% |
| 0.8 | 2.2 cm | 9.0 cm | 10.0% |
| 0.65 (chosen) | 3.9 cm | 7.3 cm | 14.5% |
| 0.5 | 5.6 cm | 5.6 cm | 32.2% |

The logs are `rig-mesh-check-fox-neck-*.log`, and `neck-variants.webp` puts the standing head
and neck of each factor beside the reference fox. With the hold of `main`, the neck faces add 13
folded faces over all samples. The other new folds are faces of the right upper arm: the holds
hang from the head center, so the violin and the bow go down with the head.

The export keeps `H` of the holds from the head before the growth, and the head center of the
holds goes down the short neck (`headRig()` and `ungrown()` of `tools/studio-body.ts`). A first
inverse removed only the growth, and `H` grew to 0.328 m, 0.332 m, and 0.336 m for the three
variants: a vertex of the chin that the neck shares moves down less than the head.

## The violins at the neck

`violin-probe.ts` poses the first seated rabbit and red fox of `beethoven-9.mid` every 10 s of
the play and measures the gap from the neck triangles and from the head to the closed violin, the
deepest corner of the violin in the closed trunk (the body with no head), and the deepest corner
of the head and the neck in the violin (`violin-probe-main.txt` and `violin-probe.txt`).

| Measure | Rabbit, `main` | Rabbit | Red fox, `main` | Red fox |
|---|---|---|---|---|
| Gap of the neck to the violin | 0.0 cm | 0.0 cm | 2.4 cm | 0.0 cm |
| Gap of the head to the violin | 0.0 cm | 0.0 cm | 2.2 cm | 0.0 cm |
| Violin into the trunk | 0.0 cm | 0.1 cm | 0.0 cm | 0.0 cm |
| Head and neck into the violin | 0.2 cm | 0.2 cm | 0.0 cm | 0.1 cm |

The violin of the red fox moved 0.087 H (2.8 cm) back and 0.035 H (1.1 cm) up from its place on
the collarbone, on the head center of the short neck. The violin of the rabbit moved 0.045 H
(1.5 cm) down: at the old place, the larger violin put the head 1.2 cm into it.

## The size

`full-reach.ts` measures the distance from the left shoulder joint to the scroll of each violin
size in the playing pose, and the arm factor that gives it, with the arm of factor 1 and the paw
of the form round. The factor is the arm factor that gives the reach (`full-reach-main.txt`, and
`full-reach.txt` at the new place and the new arms).

| Species | Violin 1.0 at the place of `main` | Violin 1.0 at the neck | Allowed factor | Factor | Reach | `violinScale` |
|---|---|---|---|---|---|---|
| Red fox | 0.637 m, factor 1.429 | 0.605 m, factor 1.352 | 1.35 | 1.35 (1.0782) | 0.604 m (0.490 m) | 0.998, 0.506 m (0.70) |
| Rabbit | 0.581 m, factor 1.891 | 0.579 m, factor 1.884 | 1.81 | 1.81 (1.445) | 0.557 m (0.452 m) | 0.958, 0.485 m (0.74) |

## The seat

`seat-probe.ts` measures the haunch of each seated body against the chair of the app, in the model
axes (`seat-probe-main.txt` and `seat-probe.txt`).

| Measure | Rabbit, `main` | Rabbit | Red fox, `main` | Red fox |
|---|---|---|---|---|
| Seat depth | 22.5 cm | 25.5 cm | 32.6 cm | 32.6 cm |
| Back of the haunch to the back posts | 3.3 cm | 3.3 cm | 5.1 cm | 1.1 cm |
| Knee past the front edge | 16.9 cm | 12.3 cm | 20.4 cm | 3.1 cm |
| Thighs within 2 cm of the seat top, over the seat | 0 cm | 0 cm | 3.3 cm | 6.0 cm |

## The rigs

The longer arms folded each sample of both bodies at first (`fold-faces-*-first.txt`):

- Red fox: a face of the throat (face 282, main bone `chest`) with 0.09 of each upper arm weight
  went across the middle with the linear stretch of the upper arm. The upper arm now stretches
  only from the shoulder joint out (`outward_stretch()`). Then the faces of the trunk below the
  right armpit, with upper arm weights of 0.29 to 0.47, folded in 29.7% of the play samples. With
  the stretch only on the free arm (`weights.stretchRamp` 0.02 units), 20.9%.
- Rabbit: two long thin faces over the elbows (faces 112 and 846) folded in each sample, because
  the ring of the left elbow (0.1 units) no longer reached their corners. Rings of 0.13 units at
  both elbows give 2.3%. The ramp of the fox put half of the upper arm of the rabbit in the band,
  and it folded in 18%, so the rabbit has no ramp.

The level thighs (`leg_turns.py <config> 0 8 20`) add 0.2% folded play samples for the rabbit
(2.3% to 2.5%) and none for the red fox (29.7% to 29.6%), within the limit of 2% of the manager
(`rig-mesh-check-*-legs.log`).

The underside of each seated body (the second part of `seat-probe.txt`) shows the haunch: the
front of the haunch rests on the seat, and the back of the haunch stays 2 cm to 5 cm (rabbit) and
3 cm to 11 cm (red fox) above it. The buttocks of the meshes curve up behind the hip joints, and
the seated bind turns no bone of the trunk, so the level thighs do not flatten them.

## The fit

`pnpm hold-fit <role> --base main` over the demos of `FIT_DEMOS` at a step of 1 s
(`hold-fit-*-base-main.txt`), and `pnpm fold-probe <role> --faces 10` over the 14 demos at a step
of 0.25 s (`fold-probe-*.txt`):

| Measure | Rabbit, `main` | Rabbit | Red fox, `main` | Red fox |
|---|---|---|---|---|
| Play folds, 14 demos | 4.6% | 2.5% | 6.5% | 14.2% |
| Play folds, `FIT_DEMOS` | 6.4% | 4.8% | 8.0% | 16.7% |
| Deepest point, play | 1.9 cm, paws in body | 2.1 cm, paws in violin | 2.4 cm, paws in body | 3.7 cm, forearms in body |
| Deepest point, lift | 1.4 cm | 1.4 cm | 2.4 cm | 2.9 cm |
| Deepest point, rest | 1.3 cm | 1.2 cm | 0.8 cm | 0.8 cm |
| Deepest point, lower | 3.2 cm, bow in body | 2.2 cm, bow in body | 2.8 cm | 2.4 cm |

The red fox stays above the stop of 10%. The faces that fold most are faces of the front of the
right shoulder (faces 390 and 389). `hold-fit-fox-violinist-variants-*.txt` tries the slant, the
turn of the right shoulder, the elbows, and the place of the violin on `beethoven-9.mid`: a turn
of 15° folds 14.9% there (18.0% with 25°), and a violin 0.083 H higher, as with the neck factor
0.8, 14.3%, with the right paw 4.1 cm in the body. `rig-mesh-check-fox-sliver.log` gives the
sliver rule over the thin faces of 0.05 units: each sample folds.

The left forearm of the rabbit went 1.9 cm into the larger violin at rest. Its left elbow at rest
points out, down, and a little back now (`pose-depth-violinist-rest.txt`).

## The scene

| Check | Result | Probe |
|---|---|---|
| Stage growth | at most 3.7% (`bach-bwv1047`, `bach-bwv1048`), the others 0.0% to 1.5% | `stage-sides.ts`, `stage-sides.txt`, `stage-sides-main.txt` |
| Touching obstacles | none in each demo and chamber test file, on `main` and on the branch | `overlap-probe.ts`, `overlap-probe.txt`, `overlap-probe-main.txt` |
| `pnpm body-probe --base main` | 85 of 95 bodies, 21 of 23 players, and 749 of 1,492 pose sets equal: the rabbits and the red foxes differ | `body-probe-base-main.txt` |
| Paused layout test | the 2 checks of the stage growth fail, as on `main` | `layout-scene-paused.txt` |
| First download | 403,507 B (402,759 B on `main`, +748 B) | `size.txt` |

`break-tests.txt` gives one break of each rule of `headRig()`, `ungrown()`, `neckFactorOf()`, and
the move back on the chair, and the test that fails for each.

## Images

- `neck-variants.webp`: the reference fox beside the neck factors 1.0, 0.8, 0.65, and 0.5,
  standing, from the side and from the front (`neck_sheet.py`).
- `lineup.webp`: the lineup of `pnpm close-views lineup`, `main` above the branch.
- `violins-user-camera.webp`: the rabbits and the red foxes of the Beethoven 9 demo in the rest and
  after 6 s of play, `main` above the branch (`frames.ts`, `violins_crop.py`).
- `side-views.webp`: side close views at the frog and at rest, with the seat, `main` above the
  branch (`side_views.py`).
- `close-views-violinist.webp` and `close-views-fox-violinist.webp`: the grids of
  `pnpm close-views <role> --base main`.
