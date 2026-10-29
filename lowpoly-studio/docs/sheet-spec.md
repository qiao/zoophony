# Reference sheet spec

This spec is for the person who makes the reference images of a new animal, for example with
an image generator. The studio builds the model from the sheet alone. A sheet that follows
this spec gives a close first build. Each fault of a sheet sets a ceiling that no round of
work can pass.

The bear sheet (`animals/bear/reference/bear-views.png`) breaks three rules: the 3/4 view
turns the head more than the other views (the 3/4 IoU stays near 0.915), the arms hang against
the body (the trunk width above the belly is a guess), and the back view is darker than the
other views (`fur_value.back` fails). The polar bear sheet breaks the A-pose rule and the scale
rule too, and its front and back views disagree on the ears. A known fault can be accepted, but
each one stays a ceiling.

## The files

| File | Content | Needed |
|---|---|---|
| `<id>-views.png` | The four views in one row (the sheet) | yes |
| `<id>-face.png` | The front and the side view of the head at 2x | yes |
| `<id>-facets.png` | The chest, the belly, and the head at full size or 2x: the facet target | when the sheet facets are too small to read |
| `<id>-swatches.png` | Flat swatches of the main colors, with names | yes, or RGB values in the README |
| `README.md` | The stated facts (see "Stated facts") | yes |

Put the files in `animals/<id>/reference/`. Use PNG. JPEG blocks change the masks and the
colors.

## Views and their order

```text
 +-----------+-----------+-----------+-----------+
 |  front    |  side     |  back     |  3/4      |
 |  (az 0)   |  (az 90)  |  (az 180) |  (az 30   |
 |           |  faces    |           |  to 45)   |
 |           |  right    |           |           |
 +-----------+-----------+-----------+-----------+
 ======================= one ground line =========
```

- Four views, left to right: front, side, back, 3/4.
- Side: the camera is at the right of the animal, so the animal faces to the right of the
  image.
- 3/4: the camera is 30 to 45 degrees from the front, toward the right of the animal. The face
  and the right side show.
- The views show one figure from four cameras (a turnaround).
- At least 40 px of plain background between two views. No part of one view enters the
  column of another view.
- The soles of all views on one pixel row (within 2 px). The ear tops of all views on one row
  (within 1% of the figure height). The bear sheet has a ground spread of 5 px and heights of
  528 to 539 px (2%).

## The pose

- One pose in all views, with the same head turn. The head looks straight ahead in every
  view.
- An A-pose: the arms 15 to 30 degrees away from the body, the elbows a little bent, the paws
  open with the palms toward the body. In the front view, background shows between each arm
  and the trunk from the armpit to the hip. On the bear sheet only 10 of 105 rows of the chest
  show this gap.
- The legs straight, a small gap between them, the feet flat, the toes forward.
- The mouth closed, the eyes open, the ears in their rest place, the tail in its rest place.
- The fingers and the claws apart, so that each claw shows.
- No props and no clothes. The role adds the props.
- A standing pose also for a seated role. The role bends the legs.
- The animal is symmetric left to right in the front view. The model is mirrored. The bear
  front view has a mirror IoU of 0.971.

## The camera

- Orthographic is best. If the generator cannot make an orthographic image, state the focal
  length and the distance, and use a long lens (the camera at least 10 figure heights away).
  The studio fits a far, level camera (`sheet.camera`).
- The camera is level, at about half the figure height, with no tilt and no roll.
- In an orthographic turnaround, the front view and the back view have the same width at each
  height. On the bear sheet they differ by 2.3% (median), which shows a near camera or
  drawings that disagree.

## Background and light

- One flat background color in all views, stated as RGB. No gradient, no vignette, no
  texture, no floor plane, and no shadow on the ground. The border of the bear sheet varies
  from 199 to 207 in each channel, and of the polar bear sheet from 195 to 213. Both work,
  because the intake tests color and darkness. Keep the background a neutral gray: a tint
  makes it colored.
- The background must separate from every color of the animal. The intake counts a pixel as
  animal when it is colored (max minus min of RGB at least 14) or dark (R + G + B under 390).
  A neutral mid gray (the bear: RGB 202, 202, 203, the polar bear: 205, 205, 208) works for a
  colored animal and for a cream fur: the cream fur of the polar bear has a max minus min of
  30 to 35. A neutral white or gray fur (under 14) does not separate from a gray background,
  and a colored background counts as animal. Such an animal uses the rule by the distance from
  the measured background color (`intake.foreground = "difference"`, the default of `studio
  new`). That rule keeps a thin ground shadow out, but a dark cast shadow on the ground still
  costs a cleanup, so keep the ground free of shadows.
- A soft, even studio light, the same in all views: a key light from the upper left, a bright
  fill, soft shadows on the body, no hard cast shadows, no rim glow, no shine on the fur. The
  back view must have the same brightness as the front view.

## Size

- At least 500 px of figure height in each view (the bear: 528 to 539 px). 700 to 1000 px is
  better.
- The face sheet at 2x the scale of the main sheet: the head at least 250 px tall.

## The face sheet

- The front and the side view of the head, with the same light and background as the main
  sheet.
- It shows the eye style (the dark outline, the white rim, the iris, the highlight), the nose,
  the mouth line, the muzzle colors, and the inner ear.

## The facet target

The model is low-poly: flat facets. The sheet shows the facet size and the contrast between
neighbor facets that the model must have.

- The facets are visible on the main sheet, or in a facet image of the chest, the belly, and
  the head at full size or 2x.
- The facet size varies: small facets on the face, the paws, and the feet, larger facets on
  the belly.
- The facets read by soft shading. No color noise on each face.

## Color swatches

Give a flat swatch, with a name, for each color: fur, belly, muzzle, nose, iris, eye
outline, white rim, inner ear, claws, paw pads, and each marking. Or give the RGB values in
the README. The swatches give the colors under the light of the sheet.

## Stated facts

`animals/<id>/reference/README.md` holds:

- the generator and its version, the prompt, the seed, and the date
- the license or the rights of the images
- the camera (orthographic, or the focal length and the distance)
- the background RGB
- the view order and the 3/4 azimuth
- the figure height in px
- the light (key direction, fill, softness)
- the SHA-256 of each file

## A prompt for an image generator

Replace the words in angle brackets. Generate the face sheet with the same prompt and the
last paragraph changed.

```text
A character turnaround sheet of a low-poly <animal>, <short description: build, colors,
markings>, standing in a relaxed A-pose. Four views of the SAME pose in one row, left to
right: front view, right side view (facing right), back view, and 3/4 front-right view at
about 40 degrees. Orthographic projection, no perspective. The camera is level at mid
height. Each view is the same scale, the soles of all views on one ground line, and wide
gaps between the views.

Pose: arms held 20 degrees away from the body, elbows slightly bent, paws open, palms toward
the body, claws apart. Legs straight with a small gap, feet flat, toes forward. Head level,
looking straight ahead, mouth closed. The head turn is the same in all four views.

Style: low-poly with flat facets, smaller facets on the face, paws, and feet, larger facets
on the belly. Soft, even studio light from the upper left with a bright fill, soft shading,
low contrast between facets, no hard shadows, no shine.

Eyes: <the eye style: dark outline, thin white rim, large dark iris, small highlight>.

Background: one flat color, RGB <r, g, b>, with no gradient, no floor, and no ground shadow.
No props, no clothes, no text, no labels. <figure height> px figure height in each view.
```

For the face sheet, replace the first paragraph with: "A close-up sheet of the head of the
same low-poly <animal>: front view and right side view, side by side, the same light and
background, the head <n> px tall."

## A checker for `studio new`

`python3 studio new` finds the background and the four view columns, and the sheet check of
the intake (`studio/consistency.py`, `out/sheet-check.json`) tests the scale, the ground line,
the A-pose (the arm gap), the symmetry, the ears of the front and the back view, and the head
turn of the front and the 3/4 view (see the README, "The intake"). The other rows of this table
are not in the tool yet. The values of the two sheets come from test scripts.

| Check | Method | Pass | Bear sheet | Polar bear sheet |
|---|---|---|---|---|
| Four views | runs of figure columns (`detect_views`) | exactly 4, gaps of at least 40 px | 4 | 4 |
| Flat background | spread of each channel on the border and in the gaps | 20 or less, and no tint | 8 | 18 |
| Background separates | IoU of the intake mask with a mask of the pixels more than 30 (sum of the channel differences) from the background, in each view | at least 0.95 | 0.959 to 0.964 | 0.971 to 0.982 |
| No ground shadow | gap columns and the rows below the soles hold only background pixels | yes | not measured | not measured |
| Figure size | `height_px` of each view | at least 500 | 528 to 539 | 553 to 578 |
| One ground line | spread of `ground_px` of the views | 2 px or less | 5 px | 4 px |
| One scale | spread of `height_px` | 1% or less | 2% | 4.5% |
| A-pose | front rows from 0.45 to 0.65 with three or more runs (arm, trunk, arm) | at least 80% | 10% | 12% |
| Symmetry | IoU of the front mask with its mirror about the axis | at least 0.97 | 0.971 | 0.969 |
| One pose, orthographic | median difference of the outer width of the front and the back mask at each height | 1% or less | 2.3% | 1.7% |
| Holes | the area of the filled holes of each mask | under 1% of the mask | not measured | not measured |

The checker prints each result and a verdict ("follow", "fix the sheet", or "ask the user").
It does not stop the scaffold, because a known limit can be accepted. Both sheets fail the
scale and the A-pose checks, and both animals still pass the gates.
