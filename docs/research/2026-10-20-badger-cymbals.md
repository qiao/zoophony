# The cymbals of the badger mesh

Date 2026-10-20. Round `badger-cymbals`. Decisions:
[`2026-10-20-badger-cymbals.md`](../decisions/2026-10-20-badger-cymbals.md). The probes and their
outputs are in [`2026-10-20-badger-cymbals/`](2026-10-20-badger-cymbals/). Each command runs from
the root of the tree, and the base is `8010553b`, the commit before the round.

## 1. The question

The short arms of the badger mesh (0.273 m from the shoulder joint to the palm) held the cymbals
of the app (0.40 m) 11 cm into the round body, and missed each crash by up to 84 mm
(`docs/research/2026-10-20-badger-mesh.md`). The user keeps a given mesh, and the props fit it.
The brief gives two variants: A, hand cymbals of a real size at a better place and tilt, and B, a
suspended cymbal on a stand, only if A fails.

## 2. Variant A: hand cymbals

Hand cymbals are 14 to 22 inches wide (0.356 to 0.559 m,
`docs/reference/percussion-technique.md` 7). The app cymbals are 0.40 m (15.7 inches), so the scan
range is the scale 0.889 (14 inches) to 1. Real players tilt the plates 5° to 45° from vertical,
with the right plate on top. `SpeciesParams.cymbalScale` and `PERCUSSION_PLACES.plateTurn` give
the scale and the tilt to `--set`.

`scan-hand.txt`: `pnpm pose-depth cymbalist --demo boulanger-matin --long --set
'badger.cymbalScale=0.889;percussion.crash=0,<y>,<z>'`, with the crash place in H from the middle
of the shoulder joints. A cell gives the plates in the body (play) and the worst crash error:

| Crash y \ z | -1.0 | -1.1 | -1.2 | -1.3 |
|---|---|---|---|---|
| -0.3 | 11.7 cm, 80 mm | 10.7 cm, 99 mm | 9.8 cm, 119 mm | 9.0 cm, 140 mm |
| -0.09 | 10.4 cm, 60 mm | 9.6 cm, 80 mm | 9.3 cm, 101 mm | 8.6 cm, 123 mm |
| 0.2 | 9.1 cm, 45 mm | 8.6 cm, 66 mm | 8.2 cm, 88 mm | 7.6 cm, 111 mm |
| 0.4 | 9.2 cm, 45 mm | 9.1 cm, 66 mm | 8.6 cm, 88 mm | 8.0 cm, 111 mm |

The base (scale 1, crash `0,-0.09,-1.1`) gives 11.0 cm and 84 mm. No place gives a crash within 5
mm. The forearms go 2.2 cm to 4.8 cm and the upper arms 2.9 cm to 4.3 cm into the body in each row
(limits 1.5 cm and 2.5 cm).

`scan-tilt.txt`: the tilt `holdTurn(0,<t>)` at two places:

| Place | Tilt 20° | Tilt 45° | Tilt 70° |
|---|---|---|---|
| `0,0.2,-1.0` | 8.7 cm, 59 mm | 9.4 cm, 78 mm | 10.4 cm, 94 mm |
| `0,-0.09,-1.1` | 10.1 cm, 67 mm | 10.9 cm, 108 mm | 12.0 cm, 119 mm |

A tilt turns the plates around the forward axis, so their depth toward the body stays the radius.
The plates need their middle a radius plus a gap in front of the chest, which is about 0.1 m in
front of the shoulder joints, and the palms must meet at the middle. The arms reach neither. Thus
no variant of A passes.

## 3. Variant B: a suspended cymbal

`SpeciesParams.cymbalForm` `suspended` gives the cymbals player one cymbal of the app size, level
on a stand, and two yarn mallets with the grip of the snare sticks (`SUSPENDED_CYMBAL`,
`SUSPENDED_CYMBAL_HOLD`). The hands strike in turn, near the edge, as section 7 of the reference
gives for a roll.

`scan-suspended.txt` (`pnpm pose-depth cymbalist --demo boulanger-matin --long --gaps --set
'badger.cymbalForm=suspended;...'`): each place of the cymbal reaches 100% of the strikes, and the
upper arms are the deepest part:

| Variant | Upper arms in body | Forearms in body | Held in body |
|---|---|---|---|
| spots 20° toward the player | 2.6 cm | 0 | 0 |
| forward 0.38 m | 3.8 cm | 0.2 cm | 0 |
| forward 0.46 m | 2.5 cm | 0 | 0 |
| rim 0.45 m high | 2.6 cm | 0 | 0 |
| rim 0.55 m high | 2.6 cm | 0 | 0 |

`fit-poles.txt`, `fit-spots.txt`, and `fit-homes.txt` (`pnpm hold-fit cymbalist --demo
boulanger-matin --set ...`) add the folds of the play:

| Variant | Play folds | Upper arms in body |
|---|---|---|
| spots 20° toward the player | 100% | 2.6 cm |
| elbows out, `poleL` -1,-1,0.3 | 100% | 2.5 cm |
| spots 30° toward the player | 100% | 3.1 cm |
| spots opposite | 3.5% | 2.4 cm |
| spots opposite, homes 0.6 H | 0% | 2.3 cm |
| spots 10° toward the player, homes 0.6 H | 1.8% | 2.5 cm |
| forward 0.46 m, homes 0.6 H | 0% | 2.5 cm |

The round takes the spots opposite each other, as three of the four sources give, and the homes at
0.6 H.

## 4. The result

| Measure | Base `8010553b` | Round |
|---|---|---|
| Strikes within 5 mm, `beethoven-9`, `boulanger-matin`, test score | 0% of 880, worst 84 mm | 100% of 440, worst 0 mm |
| Cymbal or mallets in the body, play | 11.0 cm | 0 cm |
| Forearms in the body, play | 3.9 cm | 0 cm |
| Upper arms in the body, play (limit 2.5 cm) | 3.8 cm | 2.3 cm |
| Arm folds p95, L / R | 7 / 3 | 0 / 0 |
| Paw swing p95, L / R | 43° / 43° | 30° / 26° |
| First download | 713,403 B | 713,723 B |

The hand cymbals count one target for each hand, so the base counts each crash twice.
`pose-depth-cymbalist.txt` (`pnpm pose-depth cymbalist --gaps`) gives no part over its limit.
`arm-check-cymbalist.txt` (`pnpm arm-check cymbalist --base 8010553b --views <dir>`) passes with
the new grips (L -29°, R -28°, the play median), and `arms-*.webp` gives the 2x crops of the worst
grip turns (236.63 s, 248.88 s), a strike (142.21 s), and a rest (103.58 s), the base at the left
of each pair. `arm-check-all.txt` (`pnpm arm-check --all --base 8010553b`) gives no `FAIL`, and
each `OPEN` has the value of the base. `body-probe.txt` (`pnpm body-probe --base 8010553b`): only
the badger cymbalist changes. `size.txt`: `pnpm size --base 8010553b`.

`compare.webp` (`compare.py` on `pnpm close-views cymbalist <dir> --base 8010553b`) shows the base
and the round from the front and the left, at a strike and at rest. `cymbalist-views.webp` and
`cymbalist-base-views.webp` give each moment and view.
