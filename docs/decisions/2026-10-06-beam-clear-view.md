# Decisions of the clear view through the beam

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-06, the user wrote: "the spotlight is obstructing the view." The review of step 8
found the same fault (H2), and four more faults of the beam (H3, M1, M2, L3). The beam agent
decided the details below. The agent measured each view against a build with no beam: the
value that the beam adds to the lit stage and the players, and the loss of local contrast. The
user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The haze leaves out a player layer: a box of `0.94 × S` and 2.6 m around the stage center. The highest head of the demos, with the ears, is 2.54 m | 4.5 |
| A view ray from above that meets the top of the player box gets no haze, because it ends on a player or on the stage top. This rule uses no depth buffer, so the beam keeps its one pass | 4.5 |
| The haze comes back over an angle of 0.03 rad above the edge of the box. An angle gives the same soft edge on the screen at each camera distance. A margin in meters gave a hard edge on a phone | 4.5 |
| The density grows from the top of the layer to 0.45 of the light height. With 0.6, the beam of the desktop default view was too faint | 4.5 |
| The strength goes from 1.6 to 2.0. The top edge of the desktop default view keeps its value of 47. The phone view shows about 135 in the middle, more than the 87 to 111 of `mockup.png`, and less would make the desktop beam faint | 4.5 |
| A first try faded the haze by the height only, from 0.45 of the light height. In the desktop default view, all of that haze was above the top of the frame, so the beam was gone | 4.5 |
| The light of the spotlight on the stage does not change. The measure found no need | 4.5 |
| The motes drift in the haze column from the top of the player layer up, and they fade as the haze does | 4.5 |
| The beam always holds the motes of the high tier. A tier change sets the draw range and the haze samples | 2.6, 4.5 |
| The gallery creates its lights with `{ beam: false }` | 4.5 |
| With reduced motion, the time of the haze, the motes, and the grain is 0. The grain changes 24 times each second from the wall time | 2.5, 4.5 |

The measure: the default view of each demo at 1440 × 900 and of the default demo at 390 × 844,
and Free views of Beethoven 9 (high, top, near, low and near, inside the column) at both sizes.
"Added" is the mean value (of 255) that the beam adds to the pixels with a value above 30 in
the image with no beam. "Loss" is the loss of the local contrast of 8 × 8 blocks of these pixels.

| View | Added before | Loss before | Added after | Loss after |
|---|---|---|---|---|
| Default views, 1440 × 900 | 6.9 to 9.0 | 10.9% to 12.6% | 0.1 or less | 0.1% or less |
| Default view, 390 × 844 | 9.1 | 14.0% | 0.1 or less | 0.1% or less |
| Free, high (about 55°), both sizes | 10.9 to 11.5 | 14.2% to 17.8% | 0.1 or less | 0.1% or less |
| Free, near the stage, both sizes | 1.8 to 3.0 | 4.2% to 6.6% | 0.1 or less | 0.1% or less |

The values after the change vary by up to 0.4 between two runs, from the motion of the motes
and the grain.
