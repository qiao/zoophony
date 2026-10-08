# Decisions of the spotlight

The Section column names a section of the design. [`design.md`](../design.md) gives the file of
each section.

On 2026-10-07, the user asked: "the bottom of the initial spotlight should be wider". The pool of
the key light on the stage of the first screen was narrow. In `orchestra-latest.png` and
`orchestra-side.png`, the warm pool covers the conductor and most of the orchestra, and it falls
off only at the sides and the front corners. The spotlight agent decided the rows below. The user
can reverse each row. Then update the section that holds it, and remove its row.

| Decision | Section |
|---|---|
| The gloss of the key light on the planks sets the width of the pool in the default view. With no gloss, the wood beside the podium had a value of 58 to 61 (75th percentile), and with the gloss 173. Thus the stage wood gets a rough finish (roughness 0.6, was 0.38) with 2.0 times the direct gloss (was 0.55). The players do not change | 4.5 |
| The hot spot of the key light is an ellipse with the radii `0.4 × S` across the stage and `0.2 × S` along it (was 2 m on each axis). It reaches from the piano to the cellos, as the pool of `orchestra-latest.png`. A first ellipse of `0.32 × S` alone raised the lit wood at the sides by 0.01 to 0.05 of the peak | 4.5 |
| The pool of the stage lights (`0.6 × S` and `0.42 × S`) and its floor of 0.4 stay. A wider pool also lights the players at the sides more, and the dogs of the cellos were already brighter than in `orchestra-latest.png` (90th percentile 161 to 170 against 147 to 155) | 4.5 |

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
