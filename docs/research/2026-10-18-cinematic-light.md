# Cinematic light, steps P0 to P2

Date 2026-10-18. Round "implement the cinematic lighting, without subagents" (user, 2026-10-17).
Decisions: [`2026-10-18-cinematic-light.md`](../decisions/2026-10-18-cinematic-light.md). The plan
is [`2026-10-17-cinematic-lighting.md`](2026-10-17-cinematic-lighting.md). The probes and their
outputs are in [`2026-10-18-cinematic-light/`](2026-10-18-cinematic-light/). Each command runs from
the root of the tree.

## 1. The question

The user chose the steps P0 to P2 of the plan: the look lab (P0), the floor and the grade (P1),
and the bake of the static props (P2). The look lab decides: the regions of the camera
`orchestra` against the same regions of `orchestra-latest.png`.

## 2. The measures

### 2.1 Start and end of the round

`pnpm look-lab <dir>` on `b6d09883` (start) and `d1bb9738` (end). The outputs are
`look-start.md` and `look-end.md`, and `compare.py` makes `compare.webp`.

![orchestra-latest.png, the start, and the end of the round](2026-10-18-cinematic-light/compare.webp)

| Measure (camera `orchestra`) | Start | End | Reference |
|---|---|---|---|
| Stage luma p5/p25/p50/p75/p95 | 27/58/127/178/212 | 25/61/105/151/204 | 26/58/107/154/212 |
| Median saturation of the stage area | 0.51 | 0.62 | 0.67 |
| Lit floor left of the podium: hue, saturation | 35°, 0.39 | 26°, 0.47 | 28°, 0.54 |
| Lit floor right of the podium: hue, saturation | 34°, 0.40 | 25°, 0.50 | 26°, 0.60 |
| Back of the conductor: luma, saturation | 47, 0.70 | 45, 0.79 | 52, 0.73 |
| White fur of the rabbit: hue, saturation | 35°, 0.44 | 32°, 0.44 | 19°, 0.30 |
| Floor with player shadows: luma p90 / p5 | 5.6 | 4.0 | 2.6 |
| Floor in front of the podium: luma p90 / p5 | 4.0 | 6.5 | 4.7 |

### 2.2 The lookup table

`lut_check.ts` compares the trilinear lookup of the 33³ table with `gradeColor()` on a 64³ grid.

| Grade | Max error | Mean error | Probe |
|---|---|---|---|
| Old grade, at `a1c9b653` | 0.88 levels | 0.20 levels | the commit message of `a1c9b653` |
| New grade, at `d1bb9738` | 3.79 levels | 0.17 levels | `lut-check.txt` |

The largest error of the new grade is at (0.22, 0.83, 0.00), a saturated yellow green at the edge
of the gamut. The warm scene does not use it.

### 2.3 The floor under AgX alone

`fit.ts` measures frames of the camera `orchestra` that the app rendered with the identity grade.
`identity-frames.txt` has all regions, and `fit-e.txt` has frame E with `gradeColor()`.

| Frame | Stage p50 | Lit floor hue | Lit floor saturation |
|---|---|---|---|
| A. Floor of `main`, exposure 0.8 | 120 | 27° to 28° | 0.28 to 0.29 |
| B. Floor of `main`, exposure 1.0 | 130 | 28° | 0.26 to 0.27 |
| C. Gloss 1.0, clearcoat 1.0, planks `#3b2618` | 107 | 25° to 26° | 0.34 to 0.35 |
| D. Gloss 1.0, clearcoat 0.6, planks `#4b3120` | 114 | 27° to 28° | 0.28 to 0.31 |
| E. Gloss 0.5, clearcoat 0.6, planks `#5e351a` | 110 | 24° to 26° | 0.32 to 0.38 |
| E with `gradeColor()` | 105 | 25° to 26° | 0.46 to 0.50 |

### 2.4 The bake

`bake_time.ts` with `bake-time.patch` times each bake with `gl.finish()`, on the development Mac.
The output is `bake-time.txt`. The size of the first download grew by the
bake module, the grade module, and the stage shader.

| Measure | Value |
|---|---|
| Time of one bake, 12 layouts | 11.8 ms to 14.1 ms |
| Time of the first bake, with the compile of its shaders | 19.4 ms |
| GPU memory of the color target of the bake (1024², RGBA16F) | 8 MiB |
| First download (`pnpm size`) at `b6d09883` and at `d1bb9738` | 465,439 B and 470,705 B (+5,266 B) |

### 2.5 The gap under the feet of the conductor

The user reported a bright gap between the feet of the bear and their shadow on the podium. The
gap shows on the frame of `b6d09883` too. The normal bias of the key shadow moved each point of the
podium 6.5 cm up before the shadow test (texel 1.29 cm × (radius 3 + 2)). The baked stage takes no
normal bias, and the shadow now starts at the feet.

## 3. The result

The middle tones and the lit floor now match the reference within 2 levels and 2°. AgX alone gives
the lit floor the hue of the reference. The old lift of the highlights moved it to 35°. The
saturation of the floor came from three changes: the wood gives most of the floor light (frame E),
the grade adds saturation to pale colors, and the highlights get a warm tint.

These gaps stay open:

- The shadows on the floor are darker than in the reference (4.0 and 6.5 against 2.6 and 4.7). The
  reference has more warm light in its shadows. This is the fill and the bounce of step P3.
- The rabbit fur is more yellow than in the reference (32° against 19°). The colors of the studio
  bodies set it, and the grade keeps it.
- The players lose the shadows of the props on their bodies, such as the shadow of a chair seat on
  the shins.
- The frame cost of the new items is not measured, because the frame test is paused: the clearcoat
  lobe of the stage, the 4 texel reads of the bake and the 20 shadow samples on each stage pixel,
  and the 3D texture read of the final pass.

## Unverified

- The sky part of the bake (G) changes the floor only a little near the props: by an estimate, a chair seat hides
  about 17% of the sky of the floor below it. The contact darkness of the reference may need the
  players in G (plan, 4.1). To check: add the seated players in their rest pose to the casters of
  G, and measure the region "floor in front of the podium".
