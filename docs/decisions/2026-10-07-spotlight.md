# Decisions of the spotlight

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked: "the bottom of the initial spotlight should be wider". The pool of
the key light on the stage of the first screen was narrow. In `orchestra-latest.png` and
`orchestra-side.png`, the warm pool covers the conductor and most of the orchestra, and it falls
off only at the sides and the front corners. The user also asked: "when toggling solo, the spot
light should shift to focus on that solo player(s)". The spotlight agent decided the rows below.
The user can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The hot spot of the key light is an ellipse with the radii `0.4 × S` across the stage and `0.2 × S` along it (was 2 m on each axis). It reaches from the piano to the cellos, as the pool of `orchestra-latest.png`. A first ellipse of `0.32 × S` alone raised the lit wood at the sides by 0.01 to 0.05 of the peak | 4.5 |
| The pool of the stage lights (`0.6 × S` and `0.42 × S`) and its floor of 0.4 stay. A wider pool also lights the players at the sides more, and the dogs of the cellos were already brighter than in `orchestra-latest.png` (90th percentile 161 to 170 against 147 to 155) | 4.5 |
| A solo moves the whole spotlight: the aim of the key light, the pool of the stage lights, the hot spot of the key light, and the foot of the visible beam. They move to the middle of the box of the places of the soloed players | 2.4, 4.5 |
| The light follows the solo flags of the seats, also of a soloed seat that the user mutes. A seat with no players moves no light. The scene gets the flags in each frame and makes a new aim only for a new list of flags, so a seek, a pause, a mute, and a new section size keep the light | 2.4, 4.5 |
| The radii of the pool and of the hot spot cover the box: 1.6 times its half size plus 0.8 m on each axis, at least 1.6 m, and at most the radii of the pool with no solo. One player gets a pool of 1.6 m | 4.5 |
| During a solo, the floor of the pool is 0.25 (0.4 with no solo), and the hot spot has the boost 0.7, also on a stage with no podium. With the floor 0.4, a solo of the cellos kept 50 of 85 in the box of the conductor and 38 of 80 in the first violins. With 0.25, they keep 39 and 27 | 4.5 |
| The key light keeps its place and its intensity, and only turns, as a spotlight on a stand. Its shadow camera follows the aim | 4.5 |
| The beam leans: its top stays at the light above the stage center, and its foot moves to the center of the aim. Each height keeps its circle, so the haze cone is a sheared cone, and the shader maps each view ray into the axes of the beam. The rules of the beam stay: it reaches the stage, and an item on the stage gets no haze. The top stays, so the beam reads as one lamp that turns | 4.5 |
| The lights ease to a new aim with a time constant of 0.25 s (95% in 0.75 s), in the render loop, and at once with reduced motion. A new layout starts at the aim with no solo | 2.4, 2.5, 4.5 |
| A solo of two seats far apart gets one pool between them. Its middle is brighter than the soloed players at its edges: with the cellos and the celesta of Boulanger, each soloed player keeps 0.66 or more of the light of the pool. More pools need more uniforms and more shader work for each light | 4.5 |

Samples of the first screen of the default demo at 1440 × 900 with the drawer open, with reduced
motion (Free mode), as the value (0.2126 R + 0.7152 G + 0.0722 B of the sRGB values). "Main" is
`6f1eb5c`, and "branch" is the head of this branch. A band runs across the stage at the depth of
the podium top, from the left edge of the stage to the right edge, in 11 bins. Each bin gives the
75th percentile of the wood pixels (a hue of 12° to 34° and an HSV saturation of 0.45 to 0.95),
as a ratio to the brightest bin. A bin of the piano or the bear has few wood pixels and is
marked "-". The podium of `orchestra-latest.png` is at 0.61 of the band, and our podium at 0.5,
so the table gives the ratio at a part of the way from the podium to each side edge.

| Way from the podium to the edge | `orchestra-latest.png` | Main | Branch |
|---|---|---|---|
| Right, 0.18 | 0.98 | 1.00 | 1.00 |
| Right, 0.36 to 0.41 | 0.92 | 0.77 | 0.99 |
| Right, 0.55 to 0.64 | 0.64 | 0.50 | 0.85 |
| Right, 0.73 | - | 0.34 | 0.66 |
| Right, 0.87 to 0.91 | 0.44 | 0.24 | 0.49 |
| Left, 0.18 to 0.33 | 0.93 | 1.00 | 1.00 |
| Left, 0.36 to 0.48 | 0.71 | 0.76 | 0.98 |
| Left, 0.55 | - | 0.48 | 0.86 |
| Left, 0.73 | - (piano) | 0.30 | 0.59 |
| Left, 0.91 to 0.93 | 0.32 | 0.19 | 0.37 |
| Bins with 0.6 or more of the peak | 0.55 | 0.45 | 0.73 |

The wood beside the podium (the median of a box left and right of it): `orchestra-latest.png` 214
and 183, main 204 and 207, branch 197 and 198. The HSV saturation of these boxes: 0.35 and 0.49,
main 0.38 and 0.36, branch 0.40 and 0.40.

During play in the same view, the bands at the podium, among the strings, and in front of the
podium give the same shape: at 0.73 of the way to the right edge, main has 0.33, 0.46, and 0.15
(a stand), and the branch 0.65, 0.75, and 0.24. The 90th percentile of the boxes of the players
at the sides (the floor in each box included): far left rabbit 146 and 148, front left rabbit
172 and 178, far right dog 161 and 163, front right dog 170 and 173 (main, branch). The players
keep their light. The values of the boxes grow by 2 to 6 because the wood in the boxes is
brighter. `orchestra-latest.png` has 198, 223, 147, and 155.

The branch pool is a little wider than the reference at the side edges (0.37 and 0.49 against
0.32 and 0.44). A narrower gloss made the wood beside the podium darker than the reference.

Samples of the solo light: the default view of the default demo during play at 1440 × 900, with
the drawer open and reduced motion (Free mode, the light moves at once), as the median value of
a box around each group, in the same frame of the song for each column. "Before" has no solo.

| Box | Before | Cellos | Celesta | Cellos and violas | Cellos and celesta | After the solo |
|---|---|---|---|---|---|---|
| Cellos (3 dogs, front right) | 101 | 113 | 25 | 117 | 105 | 101 |
| Conductor | 85 | 39 | 28 | 65 | 78 | 83 |
| First violins (4 rabbits, front left) | 80 | 27 | 56 | 39 | 78 | 80 |
| Celesta (the polar bear at the piano) | 48 | 12 | 65 | 18 | 44 | 47 |
| Violas (3 cats, middle) | 141 | 86 | 63 | 157 | 157 | 141 |

The frames of a column differ by the time of the song, so the poses differ a little. Without
reduced motion, the box of the conductor of the first screen went from 52 to 40, 29, 26, and
25 in screenshots at 0.23, 0.55, 0.87, 1.19, and 1.50 s after the click on "S" of the cellos.
