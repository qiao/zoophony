# Fraunces wordmark

The logo shows the name "Zoophony" in the font Fraunces, as one SVG path (design 2.8).
`WORDMARK_PATH` in `src/ui/icons.ts` and the load state of `index.html` hold the path. The app loads no font file.

| Item | Value |
|---|---|
| Source | Google Fonts, <https://github.com/google/fonts>, folder `ofl/fraunces` |
| Source file | `Fraunces[SOFT,WONK,opsz,wght].ttf`, Fraunces v1.0 by Undercase Type |
| Commit | `ac502d8eff76ef4d9477cdcc8ef7d0c84fde5372` (2020-12-09), the last commit that changed the file |
| Source file SHA-256 | `177ff6c0f14e5550a3c624247cd1189611d4eb65d000b14944c63d967958abbb` |
| License | SIL Open Font License 1.1, Copyright 2018 The Fraunces Project Authors. `LICENSE.txt` in this folder is the `OFL.txt` of the folder |
| License SHA-256 | `bdf4c22802eaf804f998195871c6b8938aac2ac14b2d78a8bd66a6f1eced833b` |

## How the path was made

1. HarfBuzz 11.0.0 shapes the word at the instance `wght=600,SOFT=100,WONK=1,opsz=72`, with
   kerning: `hb-view --font-file=<ttf> --variations='wght=600,SOFT=100,WONK=1,opsz=72'
   --output-format=svg --font-size=upem --margin=0 --output-file=raw.svg 'Zoophony'`.
2. A script moves each glyph of `raw.svg` to its place, scales the em of 2000 units to 200 units,
   moves the box to 0, and writes one path with relative integer commands. The view box is
   `0 0 909 197`. The rounding moves a point by at most 0.25% of the em.

The SVG keeps the glyph outlines and no font data, so the app does not hold the Font Software.
The license file of the app still credits the font.
