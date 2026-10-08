# Decisions of the cast colors

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked for a look of the animals that matches `mockup.png`. The light of
the scene polish (`2026-10-07-scene-polish.md`) is fixed. Under it, no light value gave both the
dark bear and the bright rabbits of the mockup. Thus the cast colors agent changed the base
colors of the species (design 4.5). It tuned each species against samples of `mockup.png`. The
user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The species colors move from `SPECIES` in `models/species.ts` to `SPECIES_COLORS` in `models/colors.ts`, beside the scene and instrument colors. `SPECIES` reads them from there. The seat dots of the UI read the fur through `SPECIES` | 4.5 |
| The bear fur is `#533621`, the belly `#583c27`, and the muzzle `#735d4b`. The fur `#93603a` gave the back of the bear 79 against 37 | 4.5 |
| The red fox fur is `#915125`. The fur `#f0934c` gave the lit head 208 with a hue of 37: AgX turned the bright orange to yellow | 4.5 |
| The white of the rabbits and of the bellies of the red fox and the wolf has a little more blue than red and green (`#ece6ff`, `#f4f0ff`, `#ece8ff`). The polar bear had `#f2eefc` until stage P3 of the proportions (`2026-10-07-blender-sculpts.md`). Under the key light, a cream white had a hue of 32 to 36 against 20 in the mockup. A white with a hue of 20 looks lavender in a close shot and in the gallery, so the whites stop at a hue of 27 to 28 | 4.5 |
| The cat fur is `#75707a`, the wolf fur `#645e6f`, and the elephant fur `#75708c`. The key light from behind lights the back row strongly, so the wolves and the elephant were up to twice as bright as in the mockup | 4.5 |
| The hippo fur is `#77709d`, a purple gray. The pink gray `#8f7d83` gave a hue of 21 to 24, and the hippos looked pale pink | 4.5 |
| The dog white is `#bcb1c0` with the belly `#c9bfd0`, and the cap and the ears `#44270f`. The dogs sit in the brightest part of the stage | 4.5 |
| The panda white is `#e2dcee`, and its black `#46434c`. The highlight of the key light sets the lit tops of the panda heads (221 against 151), so a darker white only turns the pandas gray | 4.5 |
| The tan fox fur is `#997657`. With the darker red foxes, the old tan `#c9a273` looked yellow. The mockup has no tan fox: the meerkat is the nearest tan sample | 4.5 |

Samples of the default view during play at 1440 × 900 with the drawer open (Free mode, with
reduced motion), as the value (0.2126 R + 0.7152 G + 0.0722 B of the sRGB values), the hue in
degrees, and the HSV saturation of the mean color of a box of pixels. The elephant comes from the
Beethoven 9 demo, because the default demo has no elephant. "Before" is `main` at `c96d7bd`, and
"after" is this branch. The boxes of `mockup.png` cover the same parts of the animals.

| Area | `mockup.png` | Before | After |
|---|---|---|---|
| Bear, lit head | 87, 22, 0.64 | 135, 22, 0.64 | 88, 21, 0.64 |
| Bear, back | 36, 20, 0.73 | 79, 21, 0.75 | 40, 21, 0.62 |
| Rabbit, lit chests | 155 to 162, 20, 0.28 to 0.29 | 129 to 150, 32 to 33, 0.42 to 0.43 | 131 to 152, 27 to 28, 0.34 to 0.36 |
| Red fox, lit head | 118, 20, 0.61 | 208, 37, 0.50 | 139, 18, 0.68 |
| Red fox, arm and side | 92 to 96, 17 to 21, 0.66 to 0.81 | 150 to 154, 22, 0.65 | 96 to 99, 18 to 19, 0.72 |
| Red fox, belly | 163, 19, 0.25 | 172, 32, 0.46 | 164, 27, 0.37 |
| Cat, lit head and body | 102 to 127, 20 to 22, 0.32 to 0.35 | 131 to 133, 29 to 30, 0.39 to 0.42 | 109 to 120, 25 to 26, 0.40 |
| Cat, shade | 66, 25, 0.55 | 94, 31, 0.38 | 72, 25, 0.42 |
| Dog, white | 140 to 147, 23 to 26, 0.36 to 0.40 | 183 to 186, 35 to 36, 0.33 to 0.41 | 153 to 160, 25 to 28, 0.34 to 0.41 |
| Dog, brown patches | 77 to 106, 22 to 26, 0.52 to 0.70 | 171, 23, 0.53 | 109, 24, 0.50 |
| Hippo, head and arm | 83, 5 to 8, 0.24 to 0.27 | 82 to 118, 21 to 24, 0.46 to 0.51 | 72 to 108, 8 to 13, 0.31 to 0.32 |
| Hippo, conductor shot | 83, 5 to 8, 0.24 to 0.27 | 84 to 142, 21 to 23, 0.46 to 0.48 | 73 to 128, 5 to 8, 0.28 to 0.29 |
| Wolf, heads | 95 to 104, 22 to 23, 0.32 to 0.35 | 183 to 195, 35 to 36, 0.34 to 0.35 | 111 to 120, 19, 0.40 |
| Panda, white of the heads | 151, 22, 0.26 | 223, 41 to 42, 0.21 to 0.23 | 221 to 222, 35 to 36, 0.18 to 0.20 |
| Panda, black | 43, 24, 0.39 | 18 to 32, 26 to 27, 0.47 to 0.48 | 37 to 50, 23 to 24, 0.39 to 0.40 |
| Elephant, lit head | 96, 12, 0.23 | 195, 35, 0.36 | 149, 18, 0.33 |
| Elephant, side | 80, 14, 0.26 | 112, 29, 0.47 | 85, 21, 0.35 |
| Pianist (meerkat, polar bear) | 86 to 104, 24 to 26, 0.50 to 0.56 | 155 to 190, 36 to 43, 0.18 to 0.39 | 158 to 192, 33 to 40, 0.13 to 0.32 |
| Tan fox, heads (meerkat as the tan sample) | 86 to 104, 24 to 26, 0.50 to 0.56 | 159 to 199, 31 to 36, 0.49 to 0.55 | 126 to 157, 23 to 25, 0.59 to 0.61 |

The close views of `scene.png` agree with the mockup: the rabbits have 141 to 155 with a hue of
11 to 13, the red foxes 76 to 102 with a hue of 17 to 19, the hippos 70 to 85 with a hue of 351
to 7, and the back of the bear 33 to 35.

The colors of the species that `mockup.png` does not show (deer, mouse, beaver, monkey, pig,
rhino, badger, meerkat, and penguin) do not change.
