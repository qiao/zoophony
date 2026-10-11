# Short legs: the legs of the reference images against the parametric bodies

Date: 2026-10-11. Branch: `short-legs`, from `main` at `89be7486`. The decision file
[`2026-10-11-short-legs.md`](../decisions/2026-10-11-short-legs.md) gives the decisions.

## 1. The request

After the revert of the bodies of 2026-10-11, the user said: "make these animals look more like
the reference images. specifically right now their legs too long." The reference images are the
target of the look (design 1). This report measures the legs of the reference images and of the
parametric bodies before the change. The later sections give the change and its results.

## 2. Method

**The unit.** The heads of the reference images are small against their bodies, and our heads
are large. The proportions report of 2026-10-07 found the same. A measure in the head height of
each image thus compares the legs with a head that our bodies do not have. The change keeps our
head and our torso, so this report measures the legs against the seated trunk: the height from
the seat to the crown. Our trunk is 2.30 H. The unit of an image is its trunk divided by 2.30, and
this report calls it H. For a standing body, the trunk is the height from the crotch to the
crown.

```text
            crown  ------------  2.30 H above the seat (our trunk)
              |
            seat   ------------  0
           / knee  ------------  knee center above the seat
          |
          | shin   (knee center to the top of the foot)
         _|__
        |foot|  --------------  floor: the seat height below the seat
```

**The landmarks.** The crown is the top of the head between the ears. The seat is the top of the
seat board, and the floor is the bottom of the chair legs. The knee center is the middle of the
round end of the thigh, and the knee top is the highest point of the thigh at the knee. The knee
front is the distance from the back of the torso at the seat to the front of the knee. The shin
runs from the knee center down to the top of the foot. The crotch is the row where the legs
separate in the front view.

**The tools.** `scripts/short-legs/crop.py` cuts a part of an image, scales it, and draws a grid
of 10 or 20 px. An agent read each landmark on the grid. A sharp edge has an error of about 2 px
on the model sheets and 1 px on `animals.webp`, at most 2% of H. A round landmark, such as the
knee center, has an error of about 0.05 H.
`scripts/short-legs/measure.ts` prints the same measures of the bind pose of each player of the
section cast and of the conductor.

## 3. The reference measures

**Seated animals.** The side view of each image, in H of the image (section 2).

| Image and view | H (px) | Seat | Knee center above the seat | Knee top above the seat | Knee front | Shin | Shin width | Feet on the floor |
|---|---|---|---|---|---|---|---|---|
| `animals.webp`, rabbit, side | 46.5 | 0.92 | 0.00 | 0.26 | 1.24 | 0.71 | 0.32 | yes |
| `animals.webp`, fox, side | 57.8 | 0.76 | 0.14 | 0.35 | 1.33 | 0.69 | 0.31 | yes |
| `animals.webp`, wolf, side | 49.6 | 0.87 | 0.04 | 0.24 | 1.29 | 0.67 | 0.32 | yes |
| `fox-views.png`, side | 265 | 0.97 | 0.25 | 0.43 | 1.35 | 0.83 | 0.32 | no, 0.12 H above |
| `rabbit-views.png`, profile | 107 | 1.02 | 0.06 | 0.31 | 1.59 | 0.68 | 0.37 | yes |
| `dog-views.png`, side | 151 | 1.10 | 0.07 | 0.23 | 1.24 | 0.96 | 0.43 | yes |
| `polar-bear-views.png`, side | 91 | 0.87 | (behind the piano) | | | | | yes |
| Median | | 0.92 | 0.065 | 0.29 | 1.31 | 0.70 | 0.32 | |

- The shins of the sheets narrow little from the knee to the ankle: the width at the ankle is
  0.89 (fox sheet), 0.90 (rabbit sheet), and 0.94 (fox of `animals.webp`) of the width at the
  knee.
- The thighs of the sheets are 0.45 H (fox), 0.37 H (rabbit), and 0.40 H (dog) thick in the
  middle.
- In the head height of each image, the seats are high: 1.10 (rabbit), 1.02 (fox), and 1.19 (wolf)
  of `animals.webp`, 1.29 (fox sheet), 1.40 (rabbit sheet), 1.90 (dog sheet), and 1.32 (polar
  bear sheet). The trunk is 2.74 to 3.95 head heights high, and ours is 2.30. Thus the legs of the
  references are short against the trunk. Against the head, they are long.
- `orchestra-latest.png` and `orchestra-side.png` show the same short legs, with the knees at the
  height of the seat and the feet on the floor. Their animals are too small and too much behind
  the music stands for a measure on a grid of 1 px.

**The standing bear.** The front view, in H of the image (crotch to crown divided by 2.30).

| Image | H (px) | Legs, crotch to soles | Width of one leg |
|---|---|---|---|
| `animals.webp`, bear, front | 51.3 | 0.55 | 0.39 |
| `bear-views.png`, front | 198 | 0.55 | 0.40 |

The legs of the reference bear are two thick columns with no visible knee. They are 19% of the
height of the bear from the soles to the crown.

## 4. The parametric bodies before the change

`measure.ts` on `main` at `89be7486`. The seat of a chair or a stool is 0.35 m, the high stool
has its foot ring 0.35 m below its seat, and the bench is 0.45 m. The same 0.35 m is a different
part of H for each size of species.

| Measure | Our bodies | Reference median |
|---|---|---|
| Seat above the rest of the feet | 0.92 H (rabbit and foxes), 0.68 (rhino, hippo) to 1.23 (mouse) | 0.92 |
| Knee center above the seat | 0.30 | 0.065 |
| Knee top above the seat | 0.53 | 0.29 |
| Knee front | 1.40 to 1.42 | 1.31 |
| Shin, knee center to the top of the foot | 0.97 (rabbit), 0.73 (rhino) to 1.28 (mouse) | 0.70 |
| Shin width, knee to ankle | 0.44 to 0.34, ankle 0.77 of the knee | 0.32, ankle 0.89 to 0.94 of the knee |
| Thigh thickness, middle | 0.59 | 0.37 to 0.45 |
| Standing legs, floor to the base of the torso | 0.77 | 0.55 (bear) |

The gaps:

1. **The knee is too high.** Our knee center is 0.30 H above the seat, and the round knee reaches
   0.53 H. The references have the knee at the height of the seat (median 0.065 H), and the knee
   top at 0.29 H.
2. **The shin is too long.** It is 0.97 H on the rabbit and 1.28 H on the mouse, against 0.70 H.
   The high knee gives 0.24 H of it. The fixed chair gives the rest: a small species has a seat
   of up to 1.23 H.
3. **The thigh reaches too far forward**, by about 0.1 H.
4. **The shin narrows too much** to the ankle, so it looks thin.
5. **The standing legs are too long**: 0.77 H against 0.55 H.

The seat of the rabbit and the foxes is at the median of the references. The user asked for
shorter legs, so the change takes a seat in the lower part of the range (section 5).

The thighs and the shins are already as thick as the references, or thicker. A short shin of the
same width looks stubby, as in the references.

## 5. The sheet check before the change

`pnpm sheet-check fox`, `rabbit`, and `bear` on `main` at `89be7486`. The sheets have the scale
of `VIEW_SHEETS` in `src/gallery/sheets.ts`. The fox and the rabbit pages put a chair seat of
0.35 m on the seat of the sheet.

| Sheet | View | IoU | Sheet only | Page only |
|---|---|---|---|---|
| fox | front | 0.734 | 10.3% | 22.3% |
| fox | side | 0.645 | 11.8% | 36.7% |
| fox | back | 0.670 | 16.2% | 25.1% |
| rabbit | front | 0.555 | 18.4% | 47.1% |
| rabbit | side | 0.711 | 8.6% | 28.6% |
| rabbit | back | 0.630 | 14.0% | 36.6% |
| bear | front | 0.661 | 23.8% | 15.4% |
| bear | side | 0.747 | 16.9% | 11.2% |
| bear | back | 0.679 | 21.8% | 15.2% |
| Sum | | 6.032 | | |

The rows with the most different pixels of the fox are leg rows: the front view at rows 1110 to
1146 (up to 266 px that only the page has), and the side view at rows 1096 to 1137 (up to 265 px).
The page has its feet on the floor and lower knees than the sheet fox, whose feet hang above the
floor. The rabbit has one leg row in each list: row 558 of the front view (123 px) and row 560 of
the side view (83 px). The bear rows are rows of the shoulders.

`scripts/short-legs/leg_rows.py` counts the pixels of the leg rows of each difference image: the
rows from the seat of the sheet down (fox row 855, rabbit row 437), and from the crotch of the
bear down (row 620).

| Sheet | View | Sheet only | Page only | Different | IoU of the leg rows |
|---|---|---|---|---|---|
| fox | front | 6,131 | 31,677 | 37,808 | 0.428 |
| fox | side | 1,219 | 30,841 | 32,060 | 0.519 |
| fox | back | 12,894 | 20,204 | 33,098 | 0.327 |
| rabbit | front | 2,577 | 4,194 | 6,771 | 0.471 |
| rabbit | side | 1,000 | 2,930 | 3,930 | 0.601 |
| rabbit | back | 823 | 1,168 | 1,991 | 0.610 |
| bear | front | 2,506 | 473 | 2,979 | 0.844 |
| bear | side | 3,423 | 943 | 4,366 | 0.671 |
| bear | back | 2,532 | 444 | 2,976 | 0.845 |
