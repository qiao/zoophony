# Light color, wood, floor shadows, and haze

Date 2026-10-18. Round "do 1-4" (user, 2026-10-18): steps 1 to 4 of the compare of the app with
`orchestra-latest.png`. Decisions:
[`2026-10-18-light-color.md`](../decisions/2026-10-18-light-color.md). The probes and their outputs
are in [`2026-10-18-light-color/`](2026-10-18-light-color/). Each command runs from the root of the
tree.

## 1. The question

After the shade on the bodies ([`2026-10-18-body-shade.md`](2026-10-18-body-shade.md)), the compare
showed four gaps: (1) the light is too orange, so each species turns orange-brown, (2) the wood is
too pale, (3) the floor shadows are too dark and too hard, and (4) the haze and the beam are weak.
The measures of `pnpm look-lab` and of `metrics.py` decide, in the camera `orchestra`.

## 2. The measures

`look-override.patch` adds a temporary override: the dev page reads light, color, and grade values
from the query `look`. `run-variants.sh` renders each variant of `variants.json` with
`pnpm look-lab --url` on a dev server, and `metrics.py` measures the frames (`variants.txt`). The
rabbit torso and the chair are fixed regions of the frame. The hall is the region of
[`2026-10-18-shot-light-lens-haze.md`](2026-10-18-shot-light-lens-haze.md).

| Variant | White fur L / hue / sat | Lit floor left L / hue / sat | Chair L / hue / sat | Floor shadows p5 / ratio | Hall p50 / p90 |
|---|---|---|---|---|---|
| Reference | 163 / 19° / 0.30 | 191 / 28° / 0.54 | 174 / 33° / 0.65 | 63 / 2.6 | 12 / 49 |
| Before (`c59660f4`) | 142 / 31° / 0.47 | 185 / 26° / 0.48 | 136 / 30° / 0.52 | 31 / 4.9 | 14 / 22 |
| c1: warm white side lights, neutral fill sky, vibrance 0.5, half tint | 155 / 28° / 0.33 | 186 / 24° / 0.44 | 152 / 31° / 0.44 | 35 / 4.4 | 14 / 22 |
| c2: c1 and a whiter key light | 162 / 30° / 0.24 | 196 / 24° / 0.36 | 163 / 33° / 0.41 | 37 / 4.4 | 14 / 22 |
| e1: c1, darker orange planks, gloss 0.3, lacquer 0.15 | 155 / 26° / 0.32 | 160 / 22° / 0.52 | 189 / 33° / 0.49 | 39 / 3.6 | 14 / 22 |
| f3: e1 with lighter orange planks | 159 / 26° / 0.32 | 187 / 25° / 0.50 | 183 / 29° / 0.40 | 58 / 3.0 | 14 / 22 |
| h2: f3, honey chairs, shadow blur 3, haze 2x, Free beam fade 0.38 to 0.43 | 159 / 28° / 0.31 | 192 / 25° / 0.48 | 184 / 30° / 0.52 | 60 / 2.9 | 21 / 35 |
| After (`fe8e4810`) | 158 / 26° / 0.32 | 189 / 25° / 0.46 | 183 / 30° / 0.53 | 56 / 3.1 | 17 / 27 |

The top of the beam in the default view (37% to 65% of the width, the top 10%) has a luma p50 /
p90 of 95 / 161 in the reference, 99 / 133 before, and 111 / 147 after.

`before-after.webp` shows the violins of the reference, before, and after.

## 3. The result

- **Light color.** The side lights give most of the light on the fronts, so their color sets the
  color of the white fur. A warm white side light, a neutral sky of the fill, and less extra
  saturation for the pale colors in the grade bring the white fur from 0.47 to 0.32. A whiter key
  light (c2) made the floor pale (0.36), because the key light gives the amber of the floor. So
  the key light keeps its orange.
- **Wood.** With white light, the wood must hold its color. A darker orange plank and less gloss
  (e1) gave a saturated but dark floor (luma 160). A lighter orange plank (f3) gives luma 187 and
  saturation 0.50, and it also lifts the floor shadows from 31 to 58. Bright colors lose
  saturation in AgX, so the chairs reach 0.53 against 0.65 with a strong honey color.
- **Floor shadows.** The lighter planks do most of the work. A blur of 3 times the radius of the
  tier gives softer edges, as in the reference.
- **Haze and beam.** A haze of 2 times the light made the whole hall brighter (p50 21 against 12),
  so the round keeps 1.5 times. The beam of the default view is near the reference. The camera
  `orchestra` stands at 0.43 of the default distance, where Free mode dims the beam as the close
  shots do. A fade from 0.38 to 0.43 showed the beam there (h2), but it breaks the rule that a
  change from Cinematic to Free mode keeps the beam. So the fade stays.

Gaps that stay: the white fur has a hue of 26° against 19°, the chairs a saturation of 0.53
against 0.65, and the stage of the camera `orchestra` is brighter than the reference outside the
pool (median 124 against 107), because the lighter planks lift it. The planks are finer (0.14 m by
0.9 m to 2.1 m) and still larger than the boards of the reference (about 0.1 m by 0.5 m).
