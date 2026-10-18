# Shot light, lens, and room haze, step P4

Date 2026-10-18. Round "yes" (user, 2026-10-18), step P4 of
[`2026-10-17-cinematic-lighting.md`](2026-10-17-cinematic-lighting.md). Decisions:
[`2026-10-18-cinematic-light.md`](../decisions/2026-10-18-cinematic-light.md). The probes and their
outputs are in [`2026-10-18-shot-light-lens-haze/`](2026-10-18-shot-light-lens-haze/). Each
command runs from the root of the tree.

## 1. The question

Step P4 adds the light of each shot kind, the lens effects, and a thin room haze (plan 4.6 to 4.8).
The measures decide: the black point and the tone of the stage (`pnpm look-lab`), the hall above
the stage, and the luma of one frame of each kind of shot of the default demo.

## 2. The measures

### 2.1 The lens

| Change | Stage luma p5/p50 (camera `orchestra`) | Probe |
|---|---|---|
| Before the lens (`8b555f68`) | 27/106 | `look-p3.md` of the P3 report |
| Diffusion 0.2 of the plan | 48/118 | `pnpm look-lab <dir> --measure`, not committed |
| Diffusion 0.015 (`7f5d9533`) | 29/107 | `pnpm look-lab <dir> --measure` |
| End of P4 (`e371e405`) | 29/107 | `look-p4.md` |

The upsample of the bloom adds its 6 levels, so the diffused light counts about 6 times. The
chromatic shift of 0.4 px showed no visible change at the corners, so the round left it out.

### 2.2 The room haze

`hall_measure.py` measures the hall above the stage, right of the beam. The output is
`hall-measure.txt`.

| Frame | p10 | p50 | p90 |
|---|---|---|---|
| `orchestra-latest.png` | 7 | 12 | 49 |
| No haze (`7f5d9533`) | 3 | 8 | 14 |
| Haze (`e371e405`) | 9 | 14 | 22 |

### 2.3 The shot light

`shots.ts` takes one frame of each kind of shot of the default demo, and `shot_stats.py` gives
the luma left of the open drawer. The output is `shot-stats.txt`, and `compare.py` makes
`compare.webp`.

![The conductor, section, and solo shots before (left) and after (right)](2026-10-18-shot-light-lens-haze/compare.webp)

| Shot | Before (`4cfd6e1d`) | First values of the plan | End (`e371e405`) |
|---|---|---|---|
| Conductor | 9/49/178/215 | 11/60/199/227 | 10/54/189/222 |
| Side | 9/34/131/208 | 11/42/159/215 | 10/36/138/209 |
| Section | 18/88/182/222 | 22/100/202/231 | 20/93/193/227 |
| Solo | 19/78/207/235 | 21/85/222/240 | 19/80/215/238 |
| Wide | 9/34/161/208 | 9/34/161/208 | 9/34/161/208 |

The values are the luma p5/p50/p95/p99.5. The first values of the plan were a key of 2.5 lux, a
follow-spot of 1.6 times the key, a kicker of 3 lux, and 0.3 stops.

`ratios.ts` gives the distance of each camera from the stage center, as a factor of the default
distance. The output is `ratios.txt`.

| Camera | Factor |
|---|---|
| Default view | 0.56 |
| Camera `orchestra` | 0.43 |
| Wide shots | 0.52 to 0.62 |
| Side shots | 0.35 to 0.42 |
| Conductor shots | 0.25 to 0.38 |
| Section and solo shots | 0.07 to 0.36 |

## 3. The result

- The lens adds a soft glow around the light parts, and lifts the black point of the stage by 2
  levels.
- The haze gives the hall above the stage a warm glow near the reference (p50 14 against 12).
  The stage in front of the subject keeps its black point. The glow around the beam in the
  reference is still brighter (p90 49 against 22).
- A close shot lifts the median of the image by 3% to 10%, and the brightest 0.5% by 1 to 7
  levels. The first values of the plan brought the white fur of the solo shot near clipping.
- In Free mode, the fade of the beam (0.45 to 0.5) gave the camera `orchestra` half of the close
  light, and its stage p50 rose from 107 to 121. The light now fades from 0.25 to 0.40.
- The frame cost is not measured, because the frame test is paused: 2 more spotlights in each
  lit pixel, and a depth read and the haze math in the final pass.
