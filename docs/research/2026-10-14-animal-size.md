# The red fox at 1.3 times and the rabbit at 1.2 times their size (2026-10-14)

On 2026-10-14, the user saw the red violin fox in the app and said: "the fox is too small. make it
1.3x the size. also make the rabbit 1.2x the size". This round scales the two studio bodies of
the meshes of the user. The decisions are in
[`2026-10-14-animal-size.md`](../decisions/2026-10-14-animal-size.md).

The folder [`2026-10-14-animal-size/`](2026-10-14-animal-size/) holds each probe, log, and image
of this report. A file name with `-main` holds the measure of `main` before this round. The
probes `landmark-probe.ts`, `stage-sides.ts`, and `shots-probe.ts` run from that folder with
`node`. `frames.ts` writes the lineup and the play frame, and `depth-compare.py` compares two
sweep logs.

## The scale

```text
 ANIMALS of tools/studio-body.ts           tools/mesh-rigs/<animal>.json
   fox:    shoulders 0.7454 -> 0.969 m       app.shoulders, app.reach (0.377 -> 0.4901 m)
   rabbit: shoulders 0.581  -> 0.6972 m      app.shoulders, app.reach (0.377 -> 0.4524 m)
        |                                       | pnpm rig-mesh <animal>: same GLB bytes
        v                                       v
 pnpm studio-body <animal> --> src/models/studio/<animal>.ts (scale, heads, mesh in meters)
        |
        v
 SPECIES: H and the seat from the module, violinScale by the rule of a violin shop
```

The GLB files hold the units of the studio, so `pnpm rig-mesh fox` and `pnpm rig-mesh rabbit`
write the same bytes (sha256 `0e2de32e68c8` and `2c4c7d947a36`). Only the scale of the export
changes. The arm factors stay, so the reach grows with the body.

| Measure | Main | Branch | Probe |
|---|---|---|---|
| Fox: scale, standing shoulder joints | 1.19264 m/u, 0.745 m | 1.5504 m/u, 0.969 m | `rig-mesh-check-fox.log`, `landmark-probe.txt` |
| Fox: head top standing, seated | 1.083 m, 0.991 m | 1.408 m, 1.288 m | `landmark-probe-main.txt`, `landmark-probe.txt` |
| Fox: H, seat, chair depth | 0.249 m, 0.126 m, 0.250 m | 0.323 m, 0.164 m, 0.326 m | `landmark-probe.txt`, `rig-mesh-check-fox.log` |
| Fox: reach of each arm | 0.377 m | 0.490 m | `hold-reach-fox-red.txt` |
| Rabbit: scale, standing shoulder joints | 1.2232 m/u, 0.581 m | 1.4678 m/u, 0.697 m | `rig-mesh-check-rabbit.log`, `landmark-probe.txt` |
| Rabbit: head top standing, seated | 0.934 m, 0.887 m | 1.120 m, 1.064 m | `landmark-probe-main.txt`, `landmark-probe.txt` |
| Rabbit: H, seat, chair depth | 0.269 m, 0.103 m, 0.195 m | 0.323 m, 0.123 m, 0.225 m | `landmark-probe.txt`, `rig-mesh-check-rabbit.log` |
| Rabbit: reach of each arm | 0.377 m | 0.452 m | `hold-reach-rabbit.txt` |
| Seated head top of a rabbit over a red fox | 0.895 (0.907 above the seats) | 0.826 (0.837 above the seats) | `landmark-probe.txt` |
| Module after gzip: fox, rabbit | 28,930 B, 24.9 kB | 29,472 B, 25,440 B | `rig-mesh-check-*.log` |

The violin section of `orchestra-latest.png` gives 0.76 to 0.90 for the head ratio, so 0.826
lies in the range. The music stands keep their desk at 1.05 m. It is now 0.07 m below the eyes
of the seated fox (1.124 m) and 0.13 m above the eyes of the seated rabbit (0.925 m).

## The violins

`pnpm hold-reach` gives the scale of the rule of a violin shop at the new sizes. The old violins
were too small for the longer arms: with the scale only, the scroll was 0.062 m (fox) and 0.050 m
(rabbit) inside the reach of the extended left arm (`hold-reach-*-scale-only.txt`).

| Species | Main | Rule at the new size | Branch | Probe |
|---|---|---|---|---|
| Red fox | 0.43 (0.218 m) | 0.563 (0.285 m) | 0.56 (0.284 m), bow paw 0.030 to 0.250 m | `hold-reach-fox-red.txt` |
| Rabbit | 0.54 (0.274 m) | 0.643 (0.326 m) | 0.64 (0.324 m), bow paw 0.030 to 0.290 m | `hold-reach-rabbit.txt` |

## The stage and the layout

The stage of each demo grows by 0 to 1.58% (`stage-sides-main.txt`, `stage-sides.txt`): the
Boulanger demo from 11.367 m to 11.547 m, and K. 525, which has no violins of the mesh, by 0. The
paused test `models/layout-scene.test.ts` fails the same two checks as on `main`
(`layout-scene-paused-main.txt`, `layout-scene-paused.txt`): the reference composition (8.42 m on
`main`, 8.64 m now, limit 8.36 m) and the growth of K. 315 against its fixed side (9.21 m on
`main`, 9.31 m now, limit 9.20 m).

The plan of the shots of the Boulanger demo changes from the shot 2 on (`boulanger-shots-main.txt`,
`boulanger-shots.txt`). At 133.8 s, no subject has a clear camera after the conductor shot at
123.3 s, so the conductor fills the time with its other framing (design 5.6, rule 6). The test of
the neighbor shots refused this designed path, and it now asks for another field of view.

## The depths of the sweep

`pnpm pose-depth violinist` sweeps the first seated rabbit and the first seated red fox of each of
the 14 demos, with the fix `9fd0100d` of `main`, which gives the play samples to each player
(`pose-depth-main.txt` on `main` 658027d0, `pose-depth.txt` on the branch).
`depth-compare.py pose-depth-main.txt pose-depth.txt` gives the deepest point of each part over
the demos, in cm and in head heights. The table leaves out each pair with no depth. A depth passes
when it keeps its value in H, within the step of 0.1 cm of the tool, or stays under the contact
limit of 1.5 cm. The note targets put the bow hair on the strings (0.00 mm).

| Species | Set | Part | Main cm | Main H | Branch cm | Branch H | Pass |
|---|---|---|---:|---:|---:|---:|---|
| fox | lift | forearms in body | 1.3 | 0.052 | 1.4 | 0.043 | yes |
| fox | lift | forearms in violin | 1.0 | 0.040 | 1.3 | 0.040 | yes |
| fox | lift | paws in body | 0.5 | 0.020 | 0.0 | 0.000 | yes |
| fox | lift | paws in violin | 0.5 | 0.020 | 0.7 | 0.022 | yes |
| fox | lift | upper arms in body | 0.9 | 0.036 | 1.2 | 0.037 | yes |
| fox | lower | bow in violin | 0.0 | 0.000 | 0.1 | 0.003 | yes |
| fox | lower | forearms in body | 0.8 | 0.032 | 0.5 | 0.015 | yes |
| fox | lower | forearms in violin | 1.0 | 0.040 | 1.3 | 0.040 | yes |
| fox | lower | paws in violin | 0.9 | 0.036 | 1.1 | 0.034 | yes |
| fox | lower | upper arms in body | 0.9 | 0.036 | 1.2 | 0.037 | yes |
| fox | play | forearms in body | 1.9 | 0.076 | 2.4 | 0.074 | yes |
| fox | play | paws in body | 0.7 | 0.028 | 0.4 | 0.012 | yes |
| fox | play | paws in violin | 1.0 | 0.040 | 1.2 | 0.037 | yes |
| fox | play | upper arms in body | 0.9 | 0.036 | 1.2 | 0.037 | yes |
| fox | rest | forearms in violin | 0.9 | 0.036 | 1.1 | 0.034 | yes |
| fox | rest | paws in violin | 0.4 | 0.016 | 0.5 | 0.015 | yes |
| fox | rest | upper arms in body | 0.8 | 0.032 | 1.1 | 0.034 | yes |
| rabbit | lift | forearms in body | 0.3 | 0.011 | 0.3 | 0.009 | yes |
| rabbit | lift | forearms in violin | 1.4 | 0.052 | 1.6 | 0.050 | yes |
| rabbit | lift | paws in body | 0.2 | 0.007 | 0.3 | 0.009 | yes |
| rabbit | lift | paws in violin | 0.8 | 0.030 | 0.9 | 0.028 | yes |
| rabbit | lift | upper arms in body | 0.7 | 0.026 | 0.8 | 0.025 | yes |
| rabbit | lower | bow in body | 0.1 | 0.004 | 0.0 | 0.000 | yes |
| rabbit | lower | forearms in body | 0.5 | 0.019 | 0.5 | 0.015 | yes |
| rabbit | lower | forearms in violin | 1.4 | 0.052 | 1.6 | 0.050 | yes |
| rabbit | lower | paws in body | 0.4 | 0.015 | 0.5 | 0.015 | yes |
| rabbit | lower | paws in violin | 1.3 | 0.048 | 1.5 | 0.046 | yes |
| rabbit | lower | upper arms in body | 0.7 | 0.026 | 0.8 | 0.025 | yes |
| rabbit | play | bow in body | 0.1 | 0.004 | 0.1 | 0.003 | yes |
| rabbit | play | bow in violin | 0.0 | 0.000 | 0.1 | 0.003 | yes |
| rabbit | play | paws in body | 1.2 | 0.045 | 1.2 | 0.037 | yes |
| rabbit | play | paws in violin | 1.3 | 0.048 | 1.6 | 0.050 | yes |
| rabbit | rest | forearms in violin | 1.3 | 0.048 | 1.6 | 0.050 | yes |
| rabbit | rest | paws in violin | 0.8 | 0.030 | 0.9 | 0.028 | yes |
| rabbit | rest | upper arms in body | 0.3 | 0.011 | 0.4 | 0.012 | yes |

The rabbit paw in the body in the play had 1.7 cm (0.053 H) before the fit of the elbow at the
frog (`hold-fit-violinist.txt`, `pose-depth-rabbit-variants.txt`). The pole (1.2, -0.7, -1) gives
1.2 cm. These depths stay over the limit of 1.5 cm and keep their value in H: the right forearm
of the fox in the body in the play (`bach-bwv1050`, 162.55 s), and the left forearm and the left
paw of the rabbit in the violin.

`pnpm hold-fit violinist --demo all` and `pnpm hold-fit fox-violinist --demo all` give the same
deepest pairs with the folds at a step of 1 s (`hold-fit-*.txt`).


## The folds

`pnpm fold-probe` counts the folded faces of each body over the 14 demos, at a play step of
0.25 s. The red fox keeps its shares. The rabbit folds more in the play, at the top of the right
shoulder (`upper_arm_R`), when the bow arm rises at the frog.

| Rabbit variant | Play folds | Probe |
|---|---|---|
| `main`: violin 0.54 | 3.9% (687 of 17,788) | `fold-probe-violinist-main.txt` |
| Scale only: violin 0.54 | 5.1% | `rig-mesh-check-rabbit.log` |
| Violin 0.64 | 6.6% | `fold-probe-violinist.txt` |
| Violin 0.62, 0.648 | 6.3%, 6.7% | `fold-probe-violinist-violin-*.txt` |
| Violin 0.64, elbow at the frog (1.2, -0.7, -1) | 6.1% (1,082 of 17,788) | `fold-probe-violinist-final.txt` |
| The elbow, and a bow slant of 8° or of 12° with a shoulder turn of 25° | 6.4%, 15.6% | `fold-probe-violinist-pole-1.2-*.txt` |
| Violin 0.64, `HAIR_END` 0.036 m (a probe only) | 3.8% | `fold-probe-violinist-hair-end-0.036.txt` |

The holds are in head heights, but the free hair at each end of the bow is 0.03 m (`HAIR_END` of
`pose/bowed.ts`). The search of `bowRangeOf()` in `pose/bowed-rig.ts` starts there, so the reached
part of the hair starts at 0.030 m for each size: 11% of the hair of the rabbit on `main`, and
9.3% now. The strokes start a part of that range from its low end, so they come nearer to the frog
of the larger bow. With 0.036 m, the folds and the paw depth come back to the values of `main`.

| Red fox | Play folds | Lift folds | Probe |
|---|---|---|---|
| `main` | 3.3% (588 of 17,788) | 20.3% | `fold-probe-fox-violinist-main.txt` |
| Branch | 3.4% (601 of 17,788) | 22.8% | `fold-probe-fox-violinist.txt` |


## The other bodies

`pnpm body-probe --base main` (`body-probe.txt`) names 10 of 95 bodies (the rabbit and the red
fox on each of 5 supports) and 2 of 23 players. 729 of 1,492 pose sets change: 63 lines of
rabbits, 55 of red foxes, the conductor in each of the 14 demos, and players of 15 other species
by their places on the larger stages, their looks, and their cues. Two sets of a tan fox change,
in the Beethoven 9 and the Boulanger demos. The paused test `scene/hidden-heads.test.ts` passes
on `main` and on the branch (`hidden-heads-main.txt`, `hidden-heads.txt`).

The first download grows by 853 B after gzip, to 402,070 B (`size.txt`).


## The images

- `lineup.webp`: the rabbit, the red fox, the cat, and the bear conductor, standing in the rest
  pose on the species page of the gallery, for `main` (top) and the branch (bottom). Each image
  has one camera and one scale. The camera fits the row of models, so the two images have a
  slightly different distance. Compare each animal with the cat and the bear of its own image.
- `beethoven-9-play.webp` and `beethoven-9-violins.webp`: the Beethoven 9 demo after 6 s of play
  at 1440 x 900, and a crop of the violin sections, for `main` and the branch. No two players
  overlap. The desks of the music stands now lie at the height of the arms of the seated foxes.
- `close-views-violinist.webp` and `close-views-fox-violinist.webp`: `pnpm close-views` with
  `--base main`, the grid of `main` above the grid of the branch. The camera fits the body, so the
  two grids show the same pose at the new size.
- The snapshot of the round is `docs/snapshots/2026-10-14-1e6ae0ef/` (`pnpm snapshot` on the commit
  of the hold fit).

