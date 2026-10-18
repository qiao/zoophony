# Decisions of the beam that reaches the stage

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user wrote about the beam with the box of the player layer
([`2026-10-06-beam-clear-view.md`](2026-10-06-beam-clear-view.md)): "the beam is very unnatural
now. It should still extend all the way to the stage." The screenshot showed a high view from the
front. The haze ended in the air with a hard flat bottom, far above the stage, and the dust motes
looked like a field of stars. The earlier report still holds: "the spotlight is obstructing the
view." The beam agent decided the details below. The user can reverse each row. Then update the
section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The density grows with a smoothstep from 0.04 of the full density at the stage top to the full density at the light. With 0.12 and a full density at 0.55 of the light height, the column was as bright at mid-height as at the top | 4.5 |
| A depth pass renders the depth of the scene before the scene pass, with the light effects and the hall hidden. The resolve of the depth of the multisample target cost 2.1 ms (4.5, post effects). The haze in front of the hall shows in full, so the hall needs no depth | 4.5 |
| The depth has the size of the drawing buffer. At half size, the nearest texel gave a jagged edge of haze around each player | 4.5 |
| Each view ray ends on the scene | 4.5 |
| A sample of the haze counts `smoothstep(0, 0.15 × S, g)`, with `g` the gap to the surface behind it. A first try with `1 - exp(-g / (0.3 × S))` and no item rule left a veil of 4 to 9 on the players: the haze 2 to 12 m in front of the back rows is far from them | 4.5 |
| An item on the stage gets no haze: a surface inside the stage square, from 0.03 to 0.2 m above the stage top up to 3 m, with a fade out to 4 m. The stage top, the hall, and the air keep the haze, so the beam shows between and behind the players | 4.5 |
| An item keeps no part of the haze. The column seen end-on in the top view is so bright that 3% of it still showed on the heads | 4.5 |
| A ray leaves the cone at the first root after its entry and below the light. The larger root lay on the mirror cone above the apex for a steep ray, so a camera above the light saw no beam | 4.5 |
| The scene pass skips the update of the world matrices after the depth pass | 2.6, 4.5 |
| The strength stays 2.0. With 1.7, the beam of the high view looked thin | 4.5 |
| 140 motes on the high tier and 70 on the medium tier, with a light of 1.0, a size of 3 cm, and a twinkle of 25%. The motes fade with the square of the fade of the haze, and in front of a surface and an item | 2.6, 4.5 |

The measure: the default view of three demos at 1440 × 900, with the drawer open and closed for
the default demo, the default view at 390 × 844, Free views (the high view of the user report at
1121 × 883, a high view of Beethoven 9 at both sizes, a top view, and a near view), and four close
shots. Each view compares the frame with the same frame with no beam, in one task, with reduced
motion. "Added" is the mean value (of 255) that the beam adds to the pixels of the players. A
render with no shadows of the players, with and without the players, gives these pixels. "Loss"
is the loss of the local contrast of 8 × 8 blocks of these pixels. "Stage" is the value of the
beam alone (a render with only the beam, over the black of 2.2) in the band of the axis just
above the stage top. "Before" is the box of the player layer.

| View | Added before | Added after | Loss after | Stage before | Stage after |
|---|---|---|---|---|---|
| Default views, 1440 × 900 | 0.0 | 0.12 to 0.18 | 0.1% to 0.4% | 2.2 | 5.4 to 8.8 |
| Default view, 390 × 844 | 0.0 | 0.31 | 0.6% | 2.2 | 7.5 |
| Free, high view of the user report | 0.0 | 0.30 | 0.2% | 2.2 | 11.9 |
| Free, high, Beethoven 9, both sizes | 0.0 | 0.25 to 0.38 | 0.2% to 0.3% | 2.2 | 19.2 to 19.3 |
| Free, top (78°) | 0.0, and no beam | 1.12 | 1.3% to 1.4% | 2.2 | 134 |
| Free, near | 0.0 | 0.10 | 0.2% | 2.2 | 8.1 |
| Close shots (conductor, section, solo, side) | 0.0 | 0.05 or less | 0.2% or less | - | - |

The light of the beam alone falls with no step from the top of the frame to the stage top. In the
high view of the user report, the 24 bands of the axis go from about 120 near the light to 12 at
the stage top. In a band with a riser or a back row on the axis, the item rule lowers the value.
The beam adds 0.1 to 2.7 to the lit pixels of these views, the stage top with the players, and
3.1 in the top view. Thus the lit pool keeps its look.

The frame cost: 1440 × 900 at the device scale 2 with `perf-60.mid` in the default view, with a
sync after 60 frames. No beam took 2.45 to 2.53 ms, the box 2.53 to 2.60 ms, and the beam with the
depth pass 2.90 to 2.96 ms. The machine had a load of 10 to 60 from other agents.
