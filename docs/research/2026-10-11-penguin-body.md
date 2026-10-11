# The penguin body of the choir

On 2026-10-11, the user said: "make these animals look more like the reference images ...
penguin looks off". The penguins of the choir had the parametric body of 2026-10-06 18:58 with
the colors of a penguin. This report gives the measures of the penguins of the two newest
reference images, the body built in code after them, and a compare before and after. The
decisions are in [`2026-10-11-penguin-body.md`](../decisions/2026-10-11-penguin-body.md).

## Method

The penguin has no model sheet, so `pnpm sheet-check` cannot compare it. The measures come from
crops of `orchestra-latest.png` (1762 × 1240 px) and `orchestra-side.png` (2002 × 1272 px), read
on a pixel grid at 5 to 8 times their size. Each value is a part of the body height `B`: the
distance from the crown to the bottom of the egg, with the feet out. The images show the choir
from above, so each value is the value of the image, with no correction for the angle of the
camera.

`pnpm choir-check <dir>` makes the compare. It renders the penguin of the gallery
(`gallery.html?page=species&only=penguin`) at a close view, and puts a crop of one penguin of each
image beside the render:

- The front view copies the penguin at the front right of the choir of `orchestra-latest.png`
  (crop at x 1060, y 236, 80 × 132 px), at an elevation of 25°, with a closed beak.
- The side view copies the penguin at the front left of `orchestra-side.png` (crop at x 86,
  y 280, 150 × 166 px), at an elevation of 22° and 40° to the right side of the penguin, with an
  open beak.

The measures of the renders come from the same pixel grid. The measures of the body in its bind
pose come from its mesh, with `buildPlayer('penguin', 'choir-folder')`.

## The measures of the reference images

Three penguins of `orchestra-latest.png`, seen from the front: A at x 1097 (front right of the
choir), B at x 958, and C at x 893 (both in the front row).

| Measure | A | B | C |
|---|---|---|---|
| Body height | 109.5 px | 106 px | 103 px |
| Body height / width of the belly | 2.58 | 3.0 | 3.1 |
| Width of the head / width of the belly | 0.68 | not measured | not measured |
| Eyes below the crown | 0.11 | 0.085 | 0.11 |
| Closed beak, top and bottom below the crown | 0.11 to 0.22 | 0.09 to 0.20 | 0.11 to 0.21 |
| Width of the beak | 0.14 | 0.13 | 0.155 |
| Top of the white front below the crown | 0.20 | 0.21 | 0.22 |
| Root of the flipper below the crown | 0.27 | 0.22 | not measured |
| Tip of the flipper at the folder below the crown | 0.57 | 0.57 | not measured |
| Middle of the folder below the crown | 0.52 | 0.56 | 0.54 |
| Feet below the body | 0.06 | 0.057 | 0.06 |
| Width of one foot | 0.10 | 0.094 | 0.10 |
| Distance between the middles of the feet | 0.26 | 0.23 | 0.24 |

Two penguins of `orchestra-side.png`, seen from the front right at about 45°: S1 at x 150 and
S2 at x 365. Both sing with an open beak.

| Measure | S1 | S2 |
|---|---|---|
| Body height | 145 px | 124 px |
| Body height / width, with the black back | 2.04 | 2.0 |
| Eye below the crown | 0.08 | 0.11 |
| Length of the beak, from the root to the tip | 0.17 | 0.13 |
| Height of the open beak at the root | 0.14 | not measured |
| Top of the white front below the crown | 0.19 | 0.25 |
| Middle of the folder below the crown | 0.51 | 0.52 |
| Feet below the body | 0.04 | 0.04 |

The forms in the two images:

- Each penguin is one tall egg with the head as its top. The head is about 0.68 of the width of
  the belly, and the outline has no neck. The belly is widest at about 0.75 to 0.8 of the body
  height below the crown.
- The back, the crown, and the flippers are black. The white front starts just under the beak
  with a nearly flat top, at about 0.8 of the width of the chest, and it reaches the sides of the
  belly.
- A light ring or patch carries each black eye, beside the root of the beak and a little above
  it. In `orchestra-side.png`, the patch is about 0.06 of the body height across.
- The large orange beak points forward. The open beaks of `orchestra-side.png` show a dark inside.
- The flippers hang from the shoulders at the sides, bow a little out, and their tips hold the
  outer edges of the folder in front of the belly.
- Two small orange feet show under the body, with the toes forward.

The two images disagree. The penguins of `orchestra-latest.png` are 2.6 to 3.1 times as tall as
wide from the front. The penguins of `orchestra-side.png` are 2.0 times as tall as wide in their
three-quarter view, because their backs are deep and round. The brief of the user gave 2.2 to 2.6
for the egg. The body takes 2.48 in its bind pose, between the two images.

Color samples (sRGB, the median of a small box, in the warm stage light):

| Part | Image | Sample |
|---|---|---|
| Beak, lit | `orchestra-latest.png`, A | `#d48233` |
| Feet, in shade | `orchestra-latest.png`, A | `#904721` |
| Inside of the open beak | `orchestra-side.png`, S1 and the penguin at x 430 | `#321207` to `#4e240e`, 85th percentile `#6d3818` to `#9a5026` |
| Black back | `orchestra-side.png`, S1 | `#150e08` |

The species colors of 2026-10-06 stay for the fur, the belly, and the accent. The inside of the
beak gets `MOUTH_COLOR` `#4d2312`, a little lighter than the darkest samples.

## The body before

The parametric penguin was the biped of the other species with the colors of a penguin. In its
bind pose on the risers, it was 3.07 H (1.05 m) high and 1.39 H (0.48 m) wide with its arms, and
it had 2,136 triangles, and 2,184 with its folder. In the front view of `pnpm choir-check`:

- A round head 1.0 H tall, as wide as the torso, sat on a neck. The face below a black band was a
  white disc.
- The eyes were 0.20 of the height below the crown, and the beak was 0.05 of the height wide.
- The white front was a patch from 0.40 to 0.77 of the height below the crown.
- Black legs with large orange shoes took the lowest 0.23 of the height.
- With its arms, the whole body was 1.6 times as tall as wide.

![The parametric penguin beside the reference images](2026-10-11-penguin-body/choir-before.webp)

![The choir of the Ode to Joy before, in the play frame of pnpm screenshots --play](2026-10-11-penguin-body/beethoven-9-choir-before.webp)

## The body after

The egg body of `models/penguin/` (design 4.4). In its bind pose on the risers, the egg is
2.95 H (1.01 m) high and 1.19 H (0.41 m) wide, and the crown is 1.04 m above the soles. The body
has 1,356 triangles, and 1,404 with its folder.

| Measure | Bind pose | Front view | Side view | Images |
|---|---|---|---|---|
| Body height / width | 2.48 | 2.44 | 2.64 | 2.6 to 3.1 (front), 2.0 (side) |
| Width of the head / width of the belly | 0.68 | | | 0.68 |
| Eyes below the crown | 0.073 | 0.105 | 0.08 | 0.085 to 0.11 |
| Beak, top and bottom below the crown | | 0.12 to 0.26 | | 0.09 to 0.22 |
| Length of the beak | 0.16 | | 0.16 | 0.13 to 0.17 |
| Width of the beak | 0.13 | | | 0.13 to 0.155 |
| Top of the white front below the crown | 0.16 | 0.22 | 0.17 | 0.19 to 0.25 |
| Root of the flipper below the crown | 0.28 | | | 0.22 to 0.27 |
| Length of the flipper | 0.40 | | | about 0.30 to 0.35, seen from the front |
| Middle of the folder below the crown | 0.46 | 0.56 | 0.545 | 0.51 to 0.56 |
| Feet below the body | 0.034 | about 0.05 | | 0.04 to 0.06 |
| Width of one foot | 0.10 | | | 0.094 to 0.10 |
| Distance between the middles of the feet | 0.24 | 0.26 | | 0.23 to 0.26 |

The views show the beak and the folder lower than in the bind pose, because the camera looks down
on parts in front of the body.

![The egg body beside the reference images](2026-10-11-penguin-body/choir-after.webp)

![The choir of the Ode to Joy after, in the play frame of pnpm screenshots --play](2026-10-11-penguin-body/beethoven-9-choir-after.webp)

## The rounds

Each round changed the body, ran the tests of the area, and ran `pnpm choir-check`.

| Round | Change | Result |
|---|---|---|
| 1 | The first egg, 16 corners on each ring, a small beak, flat flippers seen edge-on from the front | The form of the images. The eyes looked large, the beak small, and the flippers thin. |
| 2 | Smaller eye patches and eyes, a larger beak, wider and thicker flippers, 14 corners on each ring with larger offsets | Larger facets, as the images. |
| 3 | The wide side of each flipper turns a little to the front. Only the root of the beak has the dark inside. Smaller feet. | The front view shows the flippers beside the body. An open beak shows a dark mouth and orange tips. |
| 4 | The chest bone moves from under the folder to 1 H below the head center | Two shot tests failed with the chest at 1.0 H: the shots of the choir read the chest as the place of the folder (design 5.6). |
| 5 | The shoulder joints move into the body | The roots of the flippers stood out over the shoulders as two points. |
| 6 | The feet move out | 0.22 to 0.24 of the body height apart, as the images. |
| 7 | The folder hold rises from 1.0 H to 0.85 H below the head center | The middle of the folder showed 0.57 to 0.61 below the crown, against 0.51 to 0.56. |
| 8 | The eyes, the root of the beak, and the top of the white rise by about 0.1 H | The eyes showed 0.14 below the crown, against 0.085 to 0.11. |
| 9 | The back of the belly and the chest is about 10% deeper | The side view went from 2.7 to 2.64 times as tall as wide, toward the 2.0 of `orchestra-side.png`. |

## Clearance of the folder and the flippers

The test "keeps the folder and the flippers out of the body of the penguin" of
`pose/choir.test.ts` poses the singer of its test file at five song times while it sings, and at
one time in the rest pose, each at four wall clock times. Since round 7, the nearest triangles of
the folder are 0.049 H (17 mm) from the body, and the middle parts and the tips of the flippers
0.066 H (23 mm). With the folder 0.6 H in front of the head center in place of 0.75 H, the
test fails.

## Round 2: the review of the look

The review of the branch found four faults of the look. Each change ran the tests of the area and
`pnpm choir-check`.

- The head read as a separate cap. Its lower ring was a straight ring wider than the throat, so a
  straight line showed under the beak from the front. When the head lifted to sing, it turned
  around the middle of the throat, and a white throat band with a jagged edge showed in the side
  view. Now the egg is one list of rings, the head starts at a ring of the body, and the `neck`
  and `head` bones are at the front of the lower edge of the head. At the lift of each note of the
  test of the singer, the lower edge of the head stays within 0.0026 H of the body, against 0.044 H
  with the bones in the middle of the throat.
- The eye patches were about 0.07 of the body height across, and they looked like toy eyes.
- The flippers were 0.40 of the body height and bent out at the elbow, so they showed as sharp
  black points beside the folder.
- The beak was a little low and long in the front view.

| Measure | Before this round | After this round | Images |
|---|---|---|---|
| Eye patch across, front view | about 0.07 | 0.043 | about 0.035 |
| Eyes below the crown, front view | 0.105 | 0.11 | 0.085 to 0.11 |
| Beak below the crown, front view | 0.12 to 0.26 | 0.10 to 0.224 | 0.09 to 0.22 |
| Width of the beak, front view | 0.13 | 0.15 | 0.13 to 0.155 |
| Top of the white front, front view | 0.22 | 0.21 | 0.20 to 0.22 |
| Flipper, from the shoulder joint to the tip | 0.40, bent out at the elbow | 0.32, along the body | 0.30 to 0.35 |
| Body height / width, front view | 2.44 | 2.44 | 2.6 to 3.1 |
| Body height / width, side view | 2.64 | 2.57 | 2.0 |
| Middle of the folder below the crown, side view | 0.545 | 0.50 | 0.51 to 0.52 |
| Width of the head / width of the belly, bind pose | 0.68 | 0.64 | 0.68 |

The side view sings with the head turned up around the front of the throat, so its crown is a
little lower in the view than before. The face behind the root of the beak now has the dark color
of the mouth, because the black and the white of the face showed as jagged triangles in the open
beak. The shorter beak read as a small mark in the play frame of the Ode to Joy, so its root is a
little wider, as in the images. In the default view and the play frame of the Ode to Joy, the
smaller eyes still show beside the beaks.

![The egg body of round 2 beside the reference images](2026-10-11-penguin-body/choir-round-2.webp)

![The choir of the Ode to Joy after round 2, in the play frame of pnpm screenshots --play](2026-10-11-penguin-body/beethoven-9-choir-round-2.webp)

## What is left

- The two images disagree on the width of the body (above). A deeper and wider body moves the side
  view toward `orchestra-side.png` and the front view away from `orchestra-latest.png`.
- In `orchestra-side.png`, the face under each eye is white down to the beak. The brief of the user
  and `orchestra-latest.png` show a black face with white eye patches, and the body follows them.
