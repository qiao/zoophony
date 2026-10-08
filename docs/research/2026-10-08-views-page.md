# The views page for the model sheets

Date: 2026-10-08. Branch: `views-page`, from `main` after the dog family of stage P2, then
rebased onto the bear family of stage P3 (`proportions-p3-bears` at `f83d077`).

## 1. Summary

The model agents compare each species with its model sheet in `docs/reference/` on the views
page. Two agents found that the page gave a wrong picture: the fox fur read 119 against 156 in
`fox-views.png`, the rabbit read lavender, and the violin was in front of the chest. This stage
gives the views page one page for each sheet, a light like the light of the sheets, and the pose
of each sheet.

- **Sheet pages.** `views.html?sheet=fox`, `rabbit`, `dog`, and `polar-bear` show the species
  at the size, the background, the scale, and the camera angle of its sheet, with the seat of
  each view on the place of the chair of the sheet (design 7.1).
- **Light.** The page has the tone mapping of the stage (AgX, exposure 1.15) and the grade of
  its final pass, with a warm key, a warm fill, and a rim light. The lit fur of each sheet
  matches within 10% in value.
- **Poses.** The violin of the fox and the rabbit lies on the left shoulder under the chin, the
  dog plays the cello with the bow square across the strings, and the polar bear has its palms on
  the keys. The stage does not change.

```text
 docs/reference/<id>-views.png ---------------------------+
                                                          v
 views.html?sheet=<id> --> capture.mjs --> <id>-page.png --> compose.py --> side by side
   VIEW_SHEETS (sheets.ts)                       |
   SHEET_MOMENTS (sheet-poses.ts)                +---------> measure.py --> lit fur, shade
   VIEW_LIGHT (views.ts)
```

## 2. Method

- The scripts are in [`scripts/views-page/`](scripts/views-page/). `capture.mjs` takes each
  sheet page at the size of the sheet image (the fox page with 2 device pixels for each CSS
  pixel). `compose.py` puts the sheet above the page, and writes a blend of the two.
- `measure.py` takes a box around the body of each view. In the box, a pixel is fur when it
  differs from the background and has the color of the species: orange for the fox (hue 12 to
  34, saturation above 0.4), white for the rabbit and the polar bear (saturation below 0.22 and
  0.2), and gold for the dog (hue 26 to 50). The lit fur is the 90th percentile of the value
  (0.2126 R + 0.7152 G + 0.0722 B), and its color is the mean of the pixels between the 75th and
  the 95th percentile. The shaded fur is the 25th percentile, and its color is the mean of the
  pixels between the 10th and the 40th percentile.
- "Before" is the views page with the neutral tone mapping, the old studio light, and the rows
  layout poses, on the sheet pages, with the polar bear of stage P2. "After" is this branch, with
  the polar bear of stage P3.

## 3. The lit fur

| Sheet | Sheet: lit, hue, sat | Before: lit, hue, sat | After: lit, hue, sat | After / sheet |
|---|---|---|---|---|
| `fox-views.png` | 156, 22, 0.67 | 119, 24, 0.76 | 160, 22, 0.62 | 1.02 |
| `rabbit-views.png` | 242, 28, 0.09 | 231, 280, 0.07 | 235, 30, 0.10 | 0.97 |
| `dog-views.png` | 201, 34, 0.54 | 209, 38, 0.44 | 219, 42, 0.42 | 1.09 |
| `polar-bear-views.png` | 238, 31, 0.10 | 238, 319, 0.04 | 238, 41, 0.15 | 1.00 |

| Sheet | Sheet: shade, hue | Before: shade, hue | After: shade, hue |
|---|---|---|---|
| fox | 90, 18 | 60, 25 | 79, 18 |
| rabbit | 200, 26 | 169, 280 | 172, 17 |
| dog | 141, 31 | 154, 39 | 153, 31 |
| polar bear | 186, 30 | 171, 319 | 229, 39 |

The tries, on the sheet pages with the sheet poses (lit fur of the fox, the rabbit, the dog, and
the polar bear of stage P2):

| Light | Fox | Rabbit | Dog | Polar bear | Note |
|---|---|---|---|---|---|
| AgX 1.0, key `#ffd9b0` 3, fill `#c8d4ff` 1 | 145 | 225 | 208 | 226 | fox 7% dark |
| AgX 1.15, key `#ffdcaa` | 157 | 232 | 217 | 232 | dog hue 42 |
| AgX 1.15, key `#ffd0a0`, fill `#dde4ff` | 155 | 229 | 216 | 231 | white shade blue-gray |
| AgX 1.15, fill `#eceef8`, ground `#4a3f36` | 157 | 230 | 216 | 233 | rabbit shade 147, hue 353 |
| AgX 1.15, key 2.6, fill `#fff4e8` 1.6, ground `#6a5a4a` | 159 | 235 | 221 | 235 | chosen |
| AgX 1.15, key 2.3, fill 2.1 | 140 | 237 | 223 | 237 | fox 10% dark |

- The fox and the rabbit match in value and in hue. The fox fur is 0.05 less saturated, and its
  shade is 12% darker than the sheet.
- The dog reads 9% lighter and 8° more yellow than its sheet. Its base color `#f2d08e` (hue 40)
  is more yellow than the gold of the sheet (hue 34). A redder key made the rabbit pink, so the
  light stays, and the dog agent can make the base color more orange.
- The polar bear of stage P3 has the base color `#f4e9dd`, which was tuned on the old views page.
  Under the warm light it reads 10° more yellow than the sheet (41 against 31), and its shade is
  brighter (229 against 186). The rabbit base `#ece6ff` reads with the hue of its sheet, so a
  base near the rabbit white, or a little warmer, matches the sheet on this page.
- A cool fill made the shaded white fur blue-gray (rabbit shade hue 353 against 26). Thus the
  fill is warm. The rim light stays white.

## 4. The poses

| Sheet | Sheet pose | Pose of the rows page (before) |
|---|---|---|
| fox, rabbit | violin on the left shoulder, 45° to the left of the front, scroll up 15°. Left wrist 0.36 H (fox) and 0.31 H (rabbit) below the head center. Bow near the frog on the open A string. Head upright | violin in front of the chest, left wrist 0.77 H below the head center |
| dog | cello in the hold of the stage, G3 in the middle of a long down-bow, bow square across the strings | D string at 0.4 of the first note of Beethoven 9, bow slanted 20° |
| polar bear | C3 and C5, palms 0.04 m above the keys. The front view hides the piano | the bind pose: Beethoven 9 has no piano |

- The violin of the sheet pose goes 0.007 H into the chin of the rabbit, and keeps 0.029 H from
  the head of the fox. The violin of the stage goes 0.036 H into the rabbit. The forearms keep at
  least 0.33 H from the torso, and the bow keeps 0.26 H from the head.
- The cello stays in the hold of the stage. A turn of 12° to upright put the neck of the cello
  into the head of the dog. The cello of the sheet is larger and its scroll is at the crown (dog
  family report, 3.2), so the bow of the sheet crosses the strings at the height of the
  shoulders, and our bow at the height of the knees.
- `playingPoses()` lost the `instrumentOffset` of `poseAt()`, so the violins of the rows page
  stayed 0.1 H behind their playing place. This branch keeps it.

## 5. The images

The top half of each image is the sheet, and the bottom half is the sheet page of this branch.

![fox-views.png above the fox sheet page](2026-10-08-views-page/fox-side-by-side.png)

![rabbit-views.png above the rabbit sheet page](2026-10-08-views-page/rabbit-side-by-side.png)

![dog-views.png above the dog sheet page](2026-10-08-views-page/dog-side-by-side.png)

![polar-bear-views.png above the polar bear sheet page](2026-10-08-views-page/polar-bear-side-by-side.png)

## 6. What the model agents need to know

- Compare on `views.html?sheet=<id>`, at the size of the sheet. A capture with
  `scripts/views-page/capture.mjs` lies pixel for pixel under the sheet, and `compose.py` makes
  the side-by-side image and the blend.
- Tune a species color on the sheet page and check the default view of the stage. The sheet
  page now has the tone mapping and the grade of the stage, so a color that matches here is near
  its look on the stage. Colors that were tuned on the old views page (neutral light, no grade)
  read more yellow and brighter now.
- The scale of the fox and the rabbit sheets comes from the chair seat of 0.35 m. The dog and
  the polar bear sheets have meter marks, and their chairs are higher than ours (the dog sheet
  seat is about 0.45 m). A model that is shorter than its sheet on the page is shorter in meters.
- The sheets have a small perspective, and the page is orthographic. The side views of the fox,
  the rabbit, and the dog are turned 65° to 80°, as the chairs of the sheets show.
- The front view of the polar bear has no piano, because the open lid of our piano hid the head.
  In the side view, the lid is a large black shape above the keys.
