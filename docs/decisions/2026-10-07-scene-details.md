# Decisions of the scene details

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked for a look of the animals and the scene that matches `mockup.png`.
The review `docs/reviews/2026-10-07-mockup-match.md` found three small gaps of the scene: the
light pool on the stage was too bright (gap 9), the inside of the piano read as a flat gold tray
(gap 10), and four lamp glows floated above the stage (gap 11). The scene details agent decided
the rows below. The user can reverse each row. Then update the section that holds it, and remove
its row.

| Decision | Section |
|---|---|
| The direct diffuse light on the stage wood falls off behind the podium, by `0.22 + 0.78 × exp(-t²)`, with `t` the distance behind the podium center in units of `0.55 × S`. The players, the gloss, and the fill keep their light, so the fur keeps the values of the cast colors. The review proposed a narrower and weaker key light, but that light also lights the fur | 4.5 |
| The open piano shows a well: a rim wall of 0.08 of the outline, the soundboard `#5a3c22` 0.14 m below the top of the rim, a dark gold plate `#6b5226` across the front 0.22 m, 0.08 m below the top, and 16 strings `#a89064` of 0.016 m, 0.06 m below the top | 4.5 |
| The lid of the piano keeps 35°. In the default view of the default demo at 25°, the lid at 45° hides 26% and 55% of the heads of two horn players behind the piano, and the lid at 35° hides 5.7% of one head | 4.6 |

Samples of the default view of the default demo during play at 1440 × 900, with the drawer open
(Free mode, with reduced motion), as the value (0.2126 R + 0.7152 G + 0.0722 B of the sRGB
values), the hue in degrees, and the HSV saturation of the mean color of a box. "Main" is
`b9455f1` (the camera at 25°), and "after" is this branch on it. The boxes of `mockup.png` cover
the same parts of the scene.

| Area | `mockup.png` | Main | After |
|---|---|---|---|
| Stage wood, median of the back quarter | 42 | 45 | 37 |
| Stage wood, median of the second quarter | 61 | 65 | 52 |
| Stage wood, median of the third quarter | 59 | 75 | 60 |
| Stage wood, median of the front quarter | 65 | 83 | 69 |
| Stage among the violas | 123, 25, 0.55 | 108, 20, 0.65 | 80, 24, 0.61 |
| Stage beside the first violins | 73, 23, 0.62 | 88, 21, 0.67 | 72, 23, 0.65 |
| Stage, front right | 51, 22, 0.67 | 74, 22, 0.68 | 60, 22, 0.65 |
| Stage, left of the podium | 152, 26, 0.53 | 115, 21, 0.59 | 104, 23, 0.56 |
| Back of the bear | 39, 20, 0.71 | 45, 22, 0.62 | 45, 22, 0.62 |
| Rabbit, lit chest | 150, 22, 0.33 | 127, 26, 0.38 | 127, 26, 0.38 |
| Inside of the piano | 54, 25, 0.77 | 73, 29, 0.76 | 29, 26, 0.64 |
| Middle of the lamp glows above the stage | no glow | 165 to 189 | no glow |

A wood pixel of the median rows has a hue of 12° to 34° and a saturation of 0.45 to 0.92, inside
the stage top. These rows also count the red foxes and the bear, so they change less than the
wood. The fur samples do not change.

The light pool of `mockup.png` is a bright spot around the podium, with the stage behind the
orchestra dark. On main, the wood of the full orchestra was as bright as the wood behind the
conductor. The spot left of the podium in `mockup.png` (152) is the gloss of the light. The gloss
of this branch lies right of the podium (149 there).

The lamps: at 844 × 390 and at 390 × 844, the branch still shows the low lamps at the sides of
the hall, at the edges of the image, and the lamps on the balcony rails. A glow of the back wall
no longer shows over the stage or near the play button of the first screen.
