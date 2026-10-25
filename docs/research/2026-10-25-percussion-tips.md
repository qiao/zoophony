# The tips of the snare sticks and the cymbal mallets

Date 2026-10-25. Round `percussion-tips`. Decisions:
[`2026-10-25-percussion-tips.md`](../decisions/2026-10-25-percussion-tips.md). The probes and their
outputs are in [`2026-10-25-percussion-tips/`](2026-10-25-percussion-tips/). Each command runs
from the root of the tree, and the base is `main` at `caaea96b`.

## 1. The question

The manager saw that the badger snare drummer and the badger cymbalist let the tip of the free
stick or mallet leave the playing area between strikes. A real player's tip stays over the drum
or the plate, and the stroke lifts it up over its spot (`docs/reference/percussion-technique.md`
3, 6, 7). The measure is the distance of each tip from its spot and from the rim, seen from above.

## 2. The cause

`tips.ts` poses the badger with the test notes of `ROLE_VIEWS` of `tools/close-views.ts` and
prints each tip in the model axes: the distance from its spot and from the rim on the floor
plane, the height above the spot, and the directions of the stick and of the forearm. `--set`
with `"pitch":null` gives the poses of `main`, because the refactor commit keeps all 1492 pose
sets of `pnpm body-probe --base main`.

```text
node docs/research/2026-10-25-percussion-tips/tips.ts --set '<main>'   # tips-moments.txt
TIMES=0.483,0.733 node docs/research/2026-10-25-percussion-tips/tips.ts --set '<main>'   # tips-strikes.txt
```

On `main`, each stick points in 33° from forward at a strike, and the forearm points 8° to 13°
out. Between strikes, the paw turned the stick to its rest direction across the forearm
(`MalletAcross.rest`). That direction follows the forearm, so the stick pointed in only 10°, and
the turn about the grip swung the tip 12 cm out, over the rim. The cymbal forearms point 28° to
33° out, so the mallets pointed 13° out, and the heads went 15 cm from their spots, 14 cm past
the rim. The "crash" moment is 17 ms after the strike (the seeded offset of the note layer), so
the rebound had already swept the head 5 cm out. At the strike itself, the head is on its spot,
1.2 cm in from the rim.

```text
              main                         branch
  grip *----------> tip at strike     grip *----------> tip at strike
        \                                    |  (wrist lifts the
         \  turn about the grip              |   tip straight up)
          v                                  v
          tip between strikes: out           tip between strikes: over the spot
```

## 3. The measures

Distances in cm on the floor plane. "Spot" is the distance from the playing spot, and "rim" the
distance in from the rim (negative: outside). Height is above the spot.

| Role, moment | Hand | main spot | main rim | main height | branch spot | branch rim | branch height |
|---|---|---|---|---|---|---|---|
| Snare, strike | R | 0.1 | 10.9 | 0.1 | 0.0 | 11.0 | 0.1 |
| Snare, strike of R | L (free) | 11.9 | -0.8 | 13.6 | 4.0 | 10.2 | 17.0 |
| Snare, strike of L | R (free) | 11.3 | -0.2 | 14.4 | 4.4 | 9.7 | 18.2 |
| Snare, between | L / R | 11.9 / 11.8 | -0.8 / -0.7 | 13.6 / 13.7 | 4.0 / 4.0 | 10.3 / 10.2 | 16.9 / 17.1 |
| Snare, rest | L / R | 20.3 | -9.3 | 6.3 | 20.3 | -9.3 | 6.3 |
| Cymbal, strike | R | 0.1 | 1.2 | 0.1 | 0.0 | 1.3 | 0.1 |
| Cymbal, "crash" | R | 5.1 | -3.7 | 4.5 | 0.4 | 1.5 | 4.0 |
| Cymbal, "crash" | L (free) | 15.8 | -14.4 | 11.9 | 4.0 | 3.3 | 11.7 |
| Cymbal, open | L / R | 15.8 / 15.5 | -14.4 / -14.2 | 11.9 / 12.2 | 4.0 / 4.1 | 3.3 / 3.3 | 11.7 / 11.9 |
| Cymbal, rest | L / R | 7.6 | -4.7 | 0.3 | 7.6 | -4.7 | 0.3 |

`arm-scan.sh` scans the pitch with `pnpm arm-check` (`arm-scan.txt`). Each value passes its
limit. The paw swing p95 grows with the pitch:

| Pitch rad | Snare L / R swing | Cymbal L / R swing | Snare tip height cm |
|---|---|---|---|
| main | 32 / 25 | 30 / 26 | 13.6 |
| 0.5 | 33 / 25 | 34 / 29 | 10.4 |
| 0.7 | 41 / 35 | 43 / 40 | not measured |
| 0.9 | 50 / 46 | 52 / 51 | 16.9 |
| 1.0 | 54 / 50 | 57 / 56 | 17.9 |

`pnpm arm-check --all --base main` (`arm-check-all.txt`) gives the same values as `main` for
each other role. Each `FAIL` is a growth against `main`, inside the limit:

| Role | Arm | Measure | main | branch | Limit |
|---|---|---|---|---|---|
| snare drummer | L | paw swing p95 | 32 | 50 | 70 |
| snare drummer | R | paw swing p95 | 25 | 46 | 70 |
| snare drummer | R | grip turn p50 | 0 | 23 | 45 |
| cymbalist | R | stretch p95 | 0.08 | 0.18 | 0.35 |
| cymbalist | R | grip turn p50 | 0 | 23 | 45 |

The paw swing is the wrist bend that lifts the tip, as the stroke from the wrist of reference 6.
The grip turn compares the play median with `ACCEPTED_GRIPS`, the median of the old rest
direction, and most play samples are between strikes. The cymbal stretch grows because the
wrist moves as the paw tips the mallet up while the grip stays.

## 4. The result

The snare takes the pitch 0.9: the tip rests 17 cm over its spot, near the 8 inches of a full
stroke (reference 6), and stays 4 cm from it. The cymbal takes 0.7: the head rests 12 cm over
its spot, as on `main`, and 3 cm in from the rim. The rest pose does not change, because the
arms hang (design 5.2). The crop pairs show `main` on the left: `*-above-*.webp` from an
elevation of 70°, and `*-paws-*.webp` as 2x crops of the paws from the front, the back, and each
side. `pose-depth-*.txt` shows no growth of a depth.
