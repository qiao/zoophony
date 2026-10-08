# Decisions of the polished look

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user added the polished reference images `mockup.png` and `scene.png` and
asked for a scene that looks as close to them as possible, with shaders for the effects (1). The
look agent decided the details below: the hall, the stage, the light, the beam, and the post
effects. The agent tuned each value against samples of the two images, with screenshots of the
frontal default view at 1280 × 720. The user can reverse each row. Then update the section that
holds it, and remove its row.

| Decision | Section |
|---|---|
| A dark concert hall stands around the stage: a ring of 36 wall faces, two balcony tiers with gilded rails, and warm lamps 2.6 m apart. Its size follows the stage side, with a minimum of 9 m. It takes no light: baked vertex colors hold a glow from the stage. Its faces point into the hall, and a camera outside the ring does not see the part of the hall within 75° of its own direction | 4.1, 4.5 |
| The stage has no steps, as in the two images, which win over `orchestra.webp` (1). The planks run from the left to the right, 0.22 m wide and 2.4 to 4.8 m long, with staggered joints and a tone of up to ±12% for each plank. A chamfer of 0.04 m catches the light at the edge, the sides are a skirt of panels, and the podium has a lighter top plate | 4.1, 4.5 |
| The stage has its own glossy material (roughness 0.42) with a grain along the planks. The players keep their materials | 4.5 |
| The light: a warm orange key (`#ffc3a0`, 29°, penumbra 1) aimed at 0.35 of the way to the podium, so the pool is near the conductor. A low neutral fill, a warm rim spotlight from behind, and a soft front light. No separate pool light, because each light costs GPU time on each lit pixel | 4.5 |
| AgX tone mapping at exposure 0.8 in place of ACES. ACES moved the dark wood to red. The grade lifts the middle tones to a saturation of 1.25 and keeps the shadows at 0.7 | 4.5 |
| The visible beam is haze in a column of 0.3 S inside the cone of `models/beam.ts`, so the shot planner keeps its cone. The haze grows with the concentration of the light, so the beam is a column of light. A tiling 3D noise drifts in it, and dust motes drift in the column | 4.5 |
| The camera factor of the beam (5.6) still scales the haze and the motes. A camera inside the column draws the back faces, so the close shots show the beam | 4.5 |
| The post effects: MSAA in a target of packed floats, a bloom from 1.8, a depth of field, and one final pass with the tone mapping, the grade, a vignette of 0.45, and a grain of 0.035. The canvas has no MSAA. The gallery pages keep their transparent canvas with MSAA and ACES | 2.6, 4.5 |
| The depth of field: a thin lens focused on the point that the camera looks at, with an aperture of 0.025 m that closes from a focus distance of 1.0 S to 1.5 S (0.07 m until the user found the area in focus too small on 2026-10-07). The wide views are sharp and skip the blur passes. The depth comes from a separate pass at half size | 4.5 |
| Each tier keeps the final pass. The low tier drops the bloom, the depth of field, and the dust motes. The table of 2.6 gives the samples of each tier | 2.6 |
| The CSS gradient of the page stays, because it shows during the load, before the first frame | 4.5 |

Samples of the default view against `mockup.png`, as the value (0.2126 R + 0.7152 G + 0.0722 B
of the sRGB values) of a box of pixels:

| Area | `mockup.png` | Screenshot |
|---|---|---|
| Stage center, lit | 135 | 114 |
| Stage sides | 25 to 41 | 42 to 44 |
| Back of the bear | 48 | 48 |
| White rabbits at the front | about 100 | 95 |
| Floor in front of the stage | 17 to 36 | 22 |
| Beam, middle | 87 | 96 |
| Dark hall | 9 to 15 | 9 |
