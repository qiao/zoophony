# Decisions of the spotlight pool

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked for a look and feel of the animals and the scene that matches
`mockup.png`. In `mockup.png`, one warm spotlight from above makes a pool: the conductor and the
middle of the orchestra are bright, and the light falls off to the sides, the front corners, and
the back row. On `main` (`7ca3f80`), the players at the sides were as bright as the players in
the middle, and the back row was brighter. The spotlight pool agent decided the rows below. The
user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| Each spotlight gives a place of the stage a part of its light: `0.4 + 0.6 × exp(-(dx² + dz²))`, with the radii `0.6 × S` across and `0.42 × S` along the stage, around a center at 0.5 of the way from the stage center to the podium. A patch of the light chunk of three.js applies it at the world position of each pixel. The side lights gave most of the light on the visible faces of the players: with no side lights, the 90th percentile of the rabbits fell from 155 to 191 to 76 to 92, and with no key light, it stayed at 152 to 182. Thus a narrower key light alone did not dim the players at the sides | 4.5 |
| The key light also gets a hot spot of `1 + 0.7 × exp(-(r / 2 m)²)` around the podium center. The wood beside the podium had 104 and 149 against 152 and 138 in `mockup.png` | 4.5 |
| The pool is a factor in the shader, and no map of the spotlight. A map of three.js follows the cone of each light, so the low side lights would move the pool by about 2 m for each meter of height. A separate pool light cost about 0.4 ms (4.5) | 2.6, 4.5 |
| The gallery pages have no pool, so each model gets the same light | 4.5 |
| The key light stands on the axis of the stage, at `(0, 1.2, -0.7) × S`, and no longer 0.15 S to the right. The gloss of the wood then lies on both sides of the podium, and the shadows fan out to the left and the right, as the shadows of the chairs in `mockup.png`. This row replaces the position of the first row of `2026-10-07-scene-polish.md` | 4.5 |
| The fall-off of the wood alone behind the podium (`STAGE_POOL`, first row of `2026-10-07-scene-details.md`) is gone. Under the pool, it did not change the back of the stage, and it kept the wood among the strings at 68 against 76 in `mockup.png` | 4.5 |

Samples of the default view of the default demo during play at 1440 × 900, with the drawer open
(Free mode, with reduced motion), as the value (0.2126 R + 0.7152 G + 0.0722 B of the sRGB
values). "Main" is `7ca3f80`, and "branch" is the head of this branch. The boxes of
`mockup.png` cover the same parts of the scene, because the layouts differ.

The grid covers the visible stage in 5 columns from the left edge to the drawer, and 3 rows
(back, middle, front). Each cell gives the median of the wood pixels (a hue of 12° to 34° and an
HSV saturation of 0.45 to 0.92) and the 90th percentile of all pixels (the lit fur of the
players).

| Row | `mockup.png` | Main | Branch |
|---|---|---|---|
| Back | 17/30, 28/98, 53/125, 46/122, 32/67 | 14/29, 52/123, 63/132, 33/115, 14/43 | 13/20, 52/98, 59/103, 28/86, 13/32 |
| Middle | 36/124, 62/179, 76/155, 90/143, 51/109 | 16/153, 58/164, 75/137, 67/146, 26/124 | 16/139, 63/153, 77/134, 61/140, 25/110 |
| Front | 42/57, 76/109, 55/182, 110/184, 53/76 | 30/152, 69/132, 103/157, 115/153, 56/127 | 26/137, 83/138, 123/170, 92/135, 39/114 |

The fall-off of the lit wood (the 75th percentile of the wood pixels) in 9 bins from the left
edge of the stage to the right edge, in a band beside the podium, as a ratio to the bin of the
podium. The value of the podium bin is in parentheses.

| Band | `mockup.png` | Main | Branch |
|---|---|---|---|
| Beside the podium | 0.24, 0.35, 0.52, 0.80, 1 (162), 1.09, 0.74, 0.48, 0.33 | 0.24, 0.35, 0.53, 0.77, 1 (136), 1.10, 0.90, 0.58, 0.44 | 0.18, 0.28, 0.55, 0.94, 1 (161), 0.94, 0.60, 0.36, 0.26 |
| Among the strings | 0.31, 0.55, 0.67, 0.84, 1 (130), 1.09, 0.89, 0.56, 0.44 | 0.37, 1.09, 0.73, 0.97, 1 (87), 1.30, 1.18, 0.95, 0.68 | 0.28, 0.83, 0.72, 1.03, 1 (103), 1.06, 0.87, 0.67, 0.43 |

The 90th percentile of the box of each animal:

| Animal | `mockup.png` | Main | Branch |
|---|---|---|---|
| Rabbit, far left | 172 | 161 | 150 |
| Rabbit, back left | 182 | 165 | 156 |
| Rabbit, left middle | 191 | 184 | 174 |
| Rabbit, near the middle | 195 | 192 | 186 |
| Red fox, near the middle | 157 | 169 | 165 |
| Cat, middle | 147 | 153 | 152 |
| Cat, right of the middle | 131 | 162 | 158 |
| Dog, near the middle | 139 | 200 | 198 |
| Dog, middle | 154 | 192 | 176 |
| Dog, far right | 122 | 199 | 182 |
| Panda, back row | 170 | 230 | 183 |
| Hippo, back row | 68 | 144 | 103 |

Boxes of the conductor and the stage, as the value:

| Area | `mockup.png` | Main | Branch |
|---|---|---|---|
| Back of the bear | 46 | 43 | 38 |
| Head of the bear | 107 | 80 | 83 |
| Podium top beside the feet | 179, 181 | 145, 187 | 193, 197 |
| Podium top in front of the feet (shadow of the bear) | 31 | 119 | 110 |
| Front of the podium | 20 | 31 | 26 |
| Stage left and right of the podium | 152, 138 | 104, 149 | 152, 147 |
| Stage, front left and front right corners | 37, 49 | 30, 61 | 24, 40 |

The animals in the middle keep the values of the cast colors (the fox, the cats, and the rabbit
near the middle change by 6 or less). The animals at the sides and in the back row get darker,
as in `mockup.png`. The dogs stay brighter than the dogs of the mockup, and the rabbits a little
darker. Both sections sit at the same distance from the pool center, so a change of the light
moves both the same way. The fur colors of the cast colors agent give the difference.

The shadow of the bear falls to the front, over the front edge of the podium top and onto the
stage in front of the podium. In `mockup.png`, it lies on the podium top in front of the feet.
The key light from behind at about 46° above the podium puts the shadow of the body 0.6 m in
front of the feet, past the edge of the podium top at 0.45 m. A steeper key light also shortens
the shadows of the chairs, which the scene polish made longer.

The close shots, the views at 390 × 844, and the gallery pages: the subject of a close shot at
the side of the stage (the cellos, the piano solo) is darker than on `main`, as the players at the
sides in the default view. The gallery pages have no pool. Their shadows fall straight to the
front, because the key light moved to the axis.
