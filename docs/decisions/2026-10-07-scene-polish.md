# Decisions of the scene polish

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked for a look and feel of the animals and the scene that matches
`mockup.png`. The scene polish agent changed the light, the stage, the hall, the beam, and the
grade. It tuned each value against samples of `mockup.png` and of the default view during play
at 1440 × 900 with the drawer open (Free mode, with reduced motion). The user can reverse each
row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The shadow camera of the key light follows the stage corners (`keyShadowFrustum()`). The fixed near and far planes of the light above the center cut the shadows at the front of the stage | 4.5 |
| The rim light and the front light become two side lights from the front corners of the hall. Each one crosses the stage and lights the fronts of the section on the other side. The number of lights does not change. The front light lit the back of the bear to 71 to 113 against 37 in `mockup.png` | 4.5 |
| The key light is `#ffca98`, a little more yellow than `#ffc3a0` | 4.5 |
| The planks are a dark walnut `#4b3220` with a tone of ±20% for each plank. Under the light that brings white fur to the values of the mockup, the planks `#76523a` were 150 to 206 in the pool | 4.5 |
| The wood keeps 0.55 of the direct gloss of the lights, and its roughness is 0.38. The full gloss made a pale spot in front of the podium | 4.5 |
| The skirt and the chamfer of the stage get a baked light of 0.8 and 0.25 of their base color, with a fade to the corners. The key light from behind reaches neither of them | 4.5 |
| A row of low lamps stands on the hall wall, `0.06 × h` above the floor and 3.4 m apart, because the default view sees the wall only below the balconies. Each lamp of the hall gets a soft glow disc that faces the camera, in one draw call of points | 4.5 |
| The haze of the beam fills a cone with the apex of the light and a radius of `0.25 × S` at the stage. Its density is 0.04 up to 0.12 of the light height and full from 0.45, the strength is 4.0, the concentration is at most 3 times, and the color is `#ffcf9e`. The old beam added a value of 4 to the hall in the default view | 4.5 |
| The dead code of the fur sheen is gone (user decision of 2026-10-07: no fur for now). It never reached a pixel | 4.5 |

Samples of the default view, as the value (0.2126 R + 0.7152 G + 0.0722 B of the sRGB values),
the hue in degrees, and the saturation of the mean color of a box of pixels. "Before" is the
head of `main` at the start of the session. "After" is the head of this branch. The boxes of the
two images cover the same parts of the scene, because the layouts differ.

| Area | `mockup.png` | Before | After |
|---|---|---|---|
| Stage, pool left of the podium | 110, 24, 0.57 | 130, 23, 0.58 | 104, 21, 0.60 |
| Stage, gloss right of the podium | 133, 25, 0.55 | 117, 21, 0.68 | 174, 29, 0.47 |
| Stage, left of the conductor | 134, 25, 0.56 | 142, 23, 0.58 | 123, 20, 0.58 |
| Stage, left front corner | 35, 22, 0.70 | 33, 18, 0.80 | 29, 21, 0.69 |
| Stage, right side | 50, 22, 0.68 | 62, 19, 0.82 | 68, 22, 0.69 |
| Lip (front edge) | 74, 23, 0.62 | 38, 19, 0.83 | 55, 20, 0.72 |
| Skirt | 33, 22, 0.63 | 4, 7, 0.84 | 20, 19, 0.58 |
| Floor in front of the stage | 15, 21, 0.47 | 17, 20, 0.72 | 19, 21, 0.52 |
| Floor below the podium | 20, 21, 0.55 | 23, 20, 0.72 | 32, 23, 0.50 |
| Hall wall, top right | 19, 21, 0.34 | 17, 24, 0.53 | 15, 23, 0.45 |
| Beam, top of the image, under the title shade | 101, 26, 0.40 | 21, 27, 0.45 | 33, 26, 0.41 |
| Beam, top of the image, with no title shade | 101, 26, 0.40 | not measured | 128, 27, 0.43 |
| Back of the bear | 37, 21, 0.73 | 71, 21, 0.81 | 87, 22, 0.70 |
| Rabbit, lit chest | 100, 22, 0.48 | 72, 26, 0.56 | 131, 32, 0.39 |
| Shadow of a chair on the stage | 63, 23, 0.65 | 51, 20, 0.78 | 48, 22, 0.72 |
| Rabbits, 50th, 90th, and 99th percentile | 66, 154, 220 | 78, 125, 159 | 71, 162, 198 |

The shade of the title (`ui/ui.css`) covers the top left of the canvas with 80% of `#0b0908` up
to about 880 × 370 px from the corner at 1440 × 900. It holds the top of the beam and the back
left of the stage. With the shade hidden, the top of the beam has 128 against 101 in the mockup,
and the back left of the stage 33 against 15.

The frame cost: `node tools/measure-frame.ts --free` with `perf-60.mid`, three runs of `main` and
three runs of the branch in turn, at a load average of 165 to 340 from other agents. The GPU p95
was 8.55 to 10.28 ms on `main` and 8.61 to 8.64 ms on the branch, and the main-thread p95 3.71 to
3.85 ms and 3.60 to 4.66 ms. The difference is within the noise of the load. The branch adds one
draw call of about 110 points (the lamp glows) and a few operations in the shaders of the stage
and the floor. The haze cone is narrower than the old haze column, so the beam shades fewer
pixels.
