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

## 6. The change

The branch changes the skeleton, the seats, and the props of the standing players, and fits the
poses where a behavior test failed. The decision file gives each decision.

| Value | Before | Now | Reason |
|---|---|---|---|
| Seated knee above the seat (`seatedKnee.height`) | 0.30 H | 0.10 H | The reference median is 0.065 H. The round knee now reaches 0.33 H above the seat (0.53 H before). |
| Seated knee in front of the hip (`seatedKnee.forward`) | 0.68 H | 0.68 H | A thigh of 0.58 H put the shin 0.04 m through the front of the seat of the chair. |
| Seat above the rest of the feet (`seatHeight`, new) | the chair of 0.35 m: 0.68 to 1.23 H | 0.92 H for the chair and the foot ring of the high stool | The reference median. |
| Stool of the harp, piano bench | 0.35 m, 0.45 m | the same | The strings and the keys need the body at that height (section 7). |
| Standing base (`SHORT_STANDING_LEGS`) | 0.77 H | 0.55 H, each species but the penguin | The standing bear of both images. |
| Standing thigh (`standingThigh`, new) | 0.45 H | 0.33 H, each species but the penguin | The thigh keeps its part of the leg. |
| Desk of the conductor stand above the podium | 0.70 m | 0.59 m | Its top edge stays at the shoulders of the bear. |
| Snare head, xylophone bars, tambourine | 0.48 m | 0.40 m | The snare head was 0.07 m below the shoulders of the badger, and the sticks must slant down from 0.1 m. |
| Rest of a standing violin or viola soloist | scroll up | scroll forward and a little up, (0, 0.15, -1) | The instrument went 0.054 m (violin) and 0.119 m (viola) into the floor on `main`, and 0.14 m and 0.20 m with the short legs. |
| Rest palms of the pianist | 0.7 of the thigh | 0.6 of the thigh | With the lower knee, the left fingers touched the piano. |
| Rest left elbow of the oboe | (-1, -1, -1) | (-1.5, -1, -1) | The left upper arm of the mouse went 0.027 H into the trunk at the start of the lift (limit 0.02 H). |

`measure.ts` on the branch: each seated player has its knee center 0.10 H and its knee top 0.33 H
above the seat, and a shin of 0.77 H from the knee center to the top of the foot (0.73 to 1.28 H
before). The deer (0.69 H) and the polar bear (0.93 H) keep the seats of the harp and the piano.
The standing players have legs of 0.55 H, and the penguin keeps 0.77 H. The chair of the mouse is
0.26 m high, the chair of the rabbit and the foxes 0.35 m, and the chair of the rhino 0.47 m.

`pnpm body-probe --compare` against `main`: 94 of the 95 bodies and 22 of the 23 players
differ. The standing penguin and the player of the choir are the same.

**The seat height.** The first value of the branch was 0.8 H, in the lower part of the range,
because the user asked for shorter legs. The sheet checks showed its cost (section 7): the bodies
of the fox and the rabbit moved 34 px and 14 px down from the bodies of their sheets, and the sum of
their IoU fell. The branch then took the median, 0.92 H. The low knee gives the short shins.

```text
 seated leg, in H above the floor (rabbit)

   before                     now
   1.45 -- knee top           1.25 -- knee top
   1.22 -- knee center        1.02 -- knee center
   0.92 -- seat               0.92 -- seat
   0.25 -- top of the foot    0.25 -- top of the foot
   0    -- floor              0    -- floor
   shin: 0.97 H               shin: 0.77 H
```

## 7. The sheet check after the change

The same pages and the same scales as in section 5, on the last code commit of the branch.

| Sheet | View | IoU before | IoU now | Seat 0.8 H (first value) | Seat 0.85 H (trial) |
|---|---|---|---|---|---|
| fox | front | 0.734 | 0.735 | 0.700 | 0.721 |
| fox | side | 0.645 | 0.649 | 0.617 | 0.632 |
| fox | back | 0.670 | 0.672 | 0.661 | 0.675 |
| rabbit | front | 0.555 | 0.562 | 0.553 | 0.557 |
| rabbit | side | 0.711 | 0.715 | 0.661 | 0.685 |
| rabbit | back | 0.630 | 0.634 | 0.613 | 0.623 |
| bear | front | 0.661 | 0.608 | 0.608 | 0.608 |
| bear | side | 0.747 | 0.668 | 0.668 | 0.668 |
| bear | back | 0.679 | 0.618 | 0.618 | 0.618 |
| Sum of the fox and the rabbit | | 3.945 | 3.967 | 3.805 | 3.893 |
| Sum of all | | 6.032 | 5.861 | 5.699 | 5.832 |

The leg rows, counted as in section 5:

| Sheet | View | Different before | Different now | IoU of the leg rows before | Now |
|---|---|---|---|---|---|
| fox | front | 37,808 | 37,838 | 0.428 | 0.429 |
| fox | side | 32,060 | 33,833 | 0.519 | 0.506 |
| fox | back | 33,098 | 32,866 | 0.327 | 0.332 |
| rabbit | front | 6,771 | 6,533 | 0.471 | 0.494 |
| rabbit | side | 3,930 | 3,933 | 0.601 | 0.601 |
| rabbit | back | 1,991 | 1,965 | 0.610 | 0.616 |
| bear | front | 2,979 | 2,676 | 0.844 | 0.865 |
| bear | side | 4,366 | 3,595 | 0.671 | 0.732 |
| bear | back | 2,976 | 2,638 | 0.845 | 0.867 |

- **The fox and the rabbit** match their sheets a little better: the sum of their IoU rises by
  0.022. The leg rows of the rabbit and of the front and the back of the fox improve or stay. The
  side view of the fox gets 5.5% more different pixels in its leg rows: the fox of `fox-views.png`
  has the highest knee of all references (0.25 H above the seat) and feet that hang 0.12 H above
  the floor, and our knee now follows the median. The rows of the feet of the fox (rows 1096 to
  1146) stay the largest differences, because our feet rest on the floor.
- **The bear** matches its legs better: each view has 10% to 18% fewer different pixels in the
  leg rows. Our legs are now 102 px long on the page, and the legs of the sheet 108 px (142 px
  before). But the whole IoU of the bear falls by 0.193. The page puts the soles on the same row
  as before, so the shorter bear moves 41 px down, and its top is 30 px below the top of the sheet
  bear (11 px above before). Our trunk is 425 px high on the page and the trunk of the sheet bear
  455 px: before, the long legs hid this gap. The design keeps the head and the torso, so the
  page cannot match both the legs and the top of the bear.
- The bear page has the scale of the bear of 2026-10-10 (1.6 m). With the scale that gives the
  page bear the height of the sheet bear (design 7.1), the IoU of the bear is 2.041 for the bear
  of `main` (351.6 px for each meter) and 1.939 for the bear of the branch (370.6 px for each
  meter). The page keeps its scale, so that the two runs compare the same page.
- The sum of all IoU falls from 6.032 to 5.861, by the bear alone. This misses the target of the
  task, which asked that the sum does not get worse.

## 8. Tests

`pnpm test` on `main`: 1,951 tests in 186 files. On the branch: 1,961 tests in 187 files, all green.

New tests, each failing without its change:

- `models/legs.test.ts`: each seated knee stays less than 0.45 H above the seat, and the standing
  legs of each species but the penguin stay below 0.6 H.
- `pose/rest-clearance.test.ts`: each player of the cast and the conductor stays above the floor at
  rest and in play. It found the violin and the viola of the standing soloists in the floor on
  `main`.
- `models/props.test.ts`: the chair, the high stool, and the support of any height, and the seat
  heights of each support. `models/instruments/piano.test.ts`: the bench of any height.

Changed tests:

- The test of the default skeleton reads `DEFAULT_PROPORTIONS`, in place of a copy of the old
  values.
- The stage test keeps the top edge of the conductor desk at the shoulders of the bear, in place
  of the value 0.70 m.
- The stance test and the chair back test read the seat of the species.
- The catalog test has the new heights of the snare drum and the tambourine.
- The test of the bind mesh above the floor went. The bind pose never shows, and the hanging bow
  of a standing violinist went 0.022 m below the floor in it. The posed floor test replaces it.

Other checks on the branch:

- `pnpm test:perf`: 8 tests in 5 files pass.
- `pnpm build && pnpm size`: the first download is 299,245 B (limit 1,000,000 B).
- `pnpm test:e2e --project=chromium`, first run: 64 tests pass, and 2 fail: the smoke test and the
  button "Play again" of `e2e/bar.e2e.ts`. In both, the song time stays at 0 s. The smoke test of
  `main` at `89be7486` fails in the same way on the same machine in the same hour. A second run of
  the branch, while the load average rose from 8 to 42, passes 61 tests and fails 5: the same 2,
  and 3 tests of the first screen that stop at the time limit of 120 s. The failures come from the
  audio of headless Chromium and the load of the machine. The branch changes no code of the audio
  or of the user interface.

## 9. Open points

- The sum of the IoU of the three sheets is 0.171 lower, by the bear (section 7). Two fixes are
  possible, each a decision for the user: a longer torso for the bear, as in `bear-views.png`
  (design 4.3 permits a species skeleton), or a scale of the bear page that follows the height of
  the conductor.
- The pianist keeps the bench of 0.45 m and long shins (0.93 H), because the keys are 0.70 m high.
  A lower bench needs a lower piano. The harp player keeps 0.84 H for the strings.
- The round knee goes into the front edge of the seat board, which is 0.04 m thick: up to 0.039 m
  (mouse) and 0.037 m (rhino and hippo) on the branch, and up to 0.032 m on `main`. On the chair,
  the shins of the rabbit, the foxes, the cat, the wolf, the beaver, the monkey, and the mouse stand
  up to 0.053 m behind the front edge of the seat, as on `main`. A seat that fits the depth of the
  thighs would remove this.
- The standing players have long arms for their short legs: in the bind pose, the hanging palms
  of a standing rabbit, badger, or bear are 0.04 m to 0.05 m above the floor. The poses of the
  standing players hold the arms up or bent, and the floor test passes.
- The feet of the fox of `fox-views.png` hang above the floor. The task asked for the feet on the
  floor, so the rows of the feet stay the largest differences of the fox sheet.
- A user who wants still shorter legs can lower `seatHeight`. With 0.8 H, the sum of the IoU of
  the fox and the rabbit falls from 3.945 to 3.805.
