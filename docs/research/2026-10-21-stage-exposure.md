# The exposure of the stage

Date 2026-10-21. Round `stage-exposure`, phase 1 on `3017ca4c`, phase 2 on `306128ff`. Decisions:
[`2026-10-21-stage-exposure.md`](../decisions/2026-10-21-stage-exposure.md). The probes, their
outputs, and the images are in [`2026-10-21-stage-exposure/`](2026-10-21-stage-exposure/), and
`commands.txt` gives each command. Run each probe from the root of the tree, from `scratch/`.

## 1. The question

The user sent a screenshot of the default view in a wide window (`user-overexposed.webp`) and
said: "the scene seems to be over-exposed? adjust the lighting / rendering so that it's more
natural / cinematic." In the screenshot, the floor is an even, bright orange-tan, the white fur
is near white, and the stage has little falloff to its edges.

## 2. The method

`run.py` renders each variant on one dev server with the look override: the three frames of
`pnpm look-lab` (1440 × 900), and two frames at the size of the window of the user (2022 × 1076).
These are the user view (camera `0,0,6`) and the back rows (camera `0,20,10`). The close view of
the strings is the camera `violins` of the look lab. `exposure_measure.py` measures each frame:

- the luma percentiles of the stage band;
- the clipped share of the white fur (a channel at 255) and of the floor;
- the luma and the saturation of the floor in the pool;
- the falloff of the floor from the pool to the edges and to the back;
- the white fur p90 against the floor.

The floor boxes and the fur boxes of each camera are in `boxes.json`. The fur takes the mask of
the first frame of each camera, so each variant measures the same pixels. The probe edit of phase
1 (`probe.patch`) named the exposure `RENDER_LOOK`. Phase 2 made it `STAGE_TONE` of
`scene/renderer.ts`, and gave `pnpm close-views play` the option `--size`.

## 3. The cause

One factor at a time, in the user view (`diagnostics.txt`):

| Variant | stage p50/p95/p99 | fur p50 | fur clip % | floor clip % | pool floor |
|---|---|---|---|---|---|
| reference | 77/203/224 | 168 | 9.2 | 0.0 | 179 |
| base | 89/200/226 | 201 | 19.4 | 13.5 | 184 |
| grade curve off | 94/167/194 | 165 | 0.2 | 0.0 | 156 |
| exposure -0.3 stop | 79/186/221 | 186 | 14.2 | 0.7 | 166 |
| fill and ambient off | 87/199/226 | 199 | 18.7 | 13.0 | 183 |
| key light -0.5 stop | 80/190/224 | 196 | 17.3 | 0.4 | 163 |
| side lights -0.5 stop | 82/190/220 | 181 | 13.0 | 7.4 | 177 |
| bloom off | 87/199/226 | 199 | 17.4 | 12.9 | 183 |
| planks 0.75 | 80/194/226 | 200 | 18.0 | 1.1 | 167 |

The main cause is the tone curve of the grade. It took the AgX output 176 to 216 and 192 to 230
(`grade-curve.txt`), so it undid the soft roll-off of AgX. It scales the three channels by one
factor, so the red channel of the lit floor clipped. That gave the flat orange-tan of the
screenshot, and the middle tones of the white fur rose to 201 against 168. The key light makes
most of the floor clip, and the side lights most of the brightness of the fur. The fill, the
ambient light, and the bloom are no cause. The pool of 0.6 S covered almost the full stage, so the
floor at the edges kept 0.39 of the light of the pool.

## 4. The variants

`variants.json` holds A, B, and C, and `lineup.webp` shows them beside the reference
(`measures.txt`). In the user view:

| Measure | base | A | B | C | reference |
|---|---|---|---|---|---|
| stage p5/p50/p95/p99 | 13/89/200/226 | 11/82/180/213 | 11/74/176/212 | 7/66/173/210 | 11/77/203/224 |
| fur p50/p90 | 201/233 | 179/224 | 176/223 | 171/220 | 168/237 |
| fur clip % | 19.4 | 8.8 | 8.9 | 6.6 | 9.2 |
| floor clip % | 13.5 | 0.0 | 0.0 | 0.0 | 0.0 |
| pool floor L / sat | 184 / 0.53 | 164 / 0.56 | 153 / 0.57 | 150 / 0.57 | 179 / 0.51 |
| falloff edge/pool | 0.39 | 0.41 | 0.36 | 0.28 | 0.34 |
| fur p90 / pool floor | 1.26 | 1.37 | 1.45 | 1.46 | 1.33 |

A is the exposure 0.7 and a soft shoulder of the curve. B adds a narrower pool, planks at 0.85,
a beam of 5.6, less fill on the floor, and the shadow radius 5. C adds a deeper toe and a vignette
of 0.6. Each variant changes uniforms and the lookup table of the grade only, so none adds a pass.
The user chose B.

## 5. The shadows of the players

`seam-shadow.txt` counts the black pixels and the sharp edges in the seam of the rabbit, in the
28 role views of the gallery (the mask of `2026-10-21-rabbit-arm.md`):

| Variant | black / edges |
|---|---|
| gallery radius 1 | 41,086 / 42,235 |
| radius 3 (the high tier) | 37,698 / 43,304 |
| radius 3, side map 2048 | 41,659 / 43,372 |
| radius 3, normal bias 4 texels | 35,868 / 43,217 |
| radius 5 | 34,851 / 43,041 |
| radius 5, normal bias 4 texels | 33,440 / 42,783 |
| radius 3, `FILL.players` 0.8 | 37,814 / 43,303 |
| radius 3, no shadow of the side lights | 21,748 / 34,364 |

The shadows of the side lights hold the black wedges: without them, the count equals the count
with no shadow on the rabbit. A finer map gives sharper steps. A softer filter keeps the shadow of
the arm and removes the steps (`shadow-pairs.webp`). The user chose "Keep, softer". The normal
bias of 4 texels took the shadow of the bow arm off the chest in the app (`bias-check.webp`), so
the bias stays at 2 texels. The baked floor takes no normal bias, so the feet keep their contact
shadow. With the gallery at the radius of the stage, the seam has 34,796 black pixels
(`seam-final.txt`).

## 6. The result

The code takes B and lifts the back-row lights from 2.25 to 2.9 lux. After B, the white fur of
the back rows had 0.90 of the p90 of the front rows, and 2.9 gives 0.92. `lineup-final.webp`
shows `306128ff` and the final tree (`final-measures.txt`, `look-final.md`):

| Measure | base | B (phase 1) | final |
|---|---|---|---|
| user view: stage p5/p50/p95/p99 | 13/88/200/226 | 11/74/176/212 | 11/74/176/212 |
| user view: fur p50/p90, clip % | 201/233, 19.2 | 174/223, 8.4 | 177/223, 8.7 |
| user view: floor clip % | 13.5 | 0.0 | 0.0 |
| user view: pool floor L / sat | 184 / 0.53 | 153 / 0.57 | 152 / 0.57 |
| user view: falloff edge/pool | 0.39 | 0.36 | 0.36 |
| close: fur p50/p90, clip % | 176/226, 14.8 | 154/211, 4.5 | 156/211, 4.5 |
| back: fur p50/p90 | 176/219 | 153/202 | 163/207 |
| look lab: back/front fur p90 | 0.94 | 0.90 | 0.92 |

## 7. Open

- The lit floor in the pool is darker than in the reference: 152 against 179 in the user view,
  and 119 against 191 left of the podium in the camera `orchestra`.
- The white fur of the back rows has 0.92 of the front rows, against 0.98.
- The shadows of the side lights keep about 13,000 more black pixels in the seam of the rabbit
  than no shadow.
- The chair mask of the look lab holds 4 pixels after the darker light, because its luma limit is
  90.
- `pnpm frame` did not run (paused rule). The change adds no pass and no shadow sample.
