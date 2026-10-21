# Look lab

The frames of `scratch/fin/lab` against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| base, orchestra | 34 | 80 | 124 | 166 | 205 | 0.62 |
| base, default | 27 | 62 | 106 | 150 | 200 | 0.65 |
| base, violins | 32 | 62 | 119 | 161 | 199 | 0.62 |
| tree, orchestra | 29 | 73 | 104 | 140 | 185 | 0.65 |
| tree, default | 23 | 54 | 87 | 125 | 176 | 0.69 |
| tree, violins | 26 | 54 | 99 | 134 | 172 | 0.65 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | base, orchestra | (211, 134, 84) | 147 | 24 | 0.60 |
| lit floor, left of the podium | tree, orchestra | (176, 107, 64) | 119 | 23 | 0.64 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | base, orchestra | (224, 148, 97) | 160 | 24 | 0.57 |
| lit floor, right of the podium | tree, orchestra | (188, 120, 77) | 131 | 23 | 0.59 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | base, orchestra | (87, 40, 20) | 49 | 18 | 0.77 |
| back of the conductor | tree, orchestra | (80, 37, 20) | 45 | 17 | 0.75 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | base, orchestra | (209, 170, 139) | 176 | 27 | 0.33 |
| white fur, front left rabbit | tree, orchestra | (187, 152, 125) | 157 | 26 | 0.33 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | base, orchestra | 76.2 | 163.2 | 2.1 | (111, 58, 23) |
| floor with the shadows of the players | tree, orchestra | 65.7 | 134.1 | 2.0 | (99, 50, 18) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | base, orchestra | 26.4 | 42.7 | 1.6 | (44, 20, 10) |
| floor in front of the podium | tree, orchestra | 22.5 | 35.8 | 1.6 | (37, 16, 8) |

## Tones of the regions

A region with a mask measures only the pixels of its colors. The column Pixels gives their
count, so a change of the pixel set shows.

| Region | Frame | Pixels | Luma p10 | Luma p50 | Luma p90 | Hue | Saturation |
|---|---|---|---|---|---|---|---|
| rabbit torso, front left | base, orchestra | 3600 | 54 | 143 | 208 | 25 | 0.38 |
| rabbit torso, front left | tree, orchestra | 3600 | 42 | 131 | 185 | 24 | 0.40 |
| chair, front left | base, orchestra | 73 | 177 | 182 | 193 | 30 | 0.54 |
| chair, front left | tree, orchestra | 4 | 159 | 172 | 177 | 28 | 0.38 |
| hall above the stage, right of the beam | reference | 86569 | 7 | 12 | 49 | 24 | 0.56 |
| hall above the stage, right of the beam | base, orchestra | 51408 | 11 | 15 | 26 | 22 | 0.52 |
| hall above the stage, right of the beam | tree, orchestra | 51408 | 10 | 13 | 23 | 21 | 0.53 |

## Regions of the camera default

The regions come from the layout of the default demo (`tools/look-regions.ts`). The white fur
takes the pixels with a saturation below 0.4 and a luma above 60. Pixels gives the count of
the measured pixels, and Own the count of the own mask of the frame. Dropped gives the pixels
of the boxes of the region that nearer items cover. The reference takes the boxes of
`back_measures.py`.

| Region | Frame | Pixels | Own | Dropped | Luma p10 | Luma p50 | Luma p90 | p10 / p90 | Hue | Saturation |
|---|---|---|---|---|---|---|---|---|---|---|
| back floor | reference | 4150 | 4150 | - | 9 | 41 | 80 | 0.12 | 23 | 0.74 |
| white fur, front rows | reference | 10827 | 10827 | - | 134 | 185 | 246 | 0.55 | 19 | 0.25 |
| white fur, back rows | reference | 10203 | 10203 | - | 109 | 164 | 242 | 0.45 | 21 | 0.30 |
| front rows | base, default | 92966 | 92966 | 10951 | 45 | 117 | 210 | 0.22 | 23 | 0.62 |
| back rows | base, default | 54449 | 54449 | 34592 | 18 | 82 | 175 | 0.10 | 22 | 0.55 |
| back floor | base, default | 6883 | 6883 | 26657 | 30 | 69 | 134 | 0.23 | 23 | 0.74 |
| white fur, front rows | base, default | 23704 | 23704 | 10951 | 111 | 198 | 232 | 0.48 | 28 | 0.27 |
| white fur, back rows | base, default | 13338 | 13338 | 34592 | 110 | 164 | 218 | 0.50 | 27 | 0.34 |
| front rows | tree, default | 92966 | 92966 | 10951 | 40 | 103 | 188 | 0.21 | 23 | 0.65 |
| back rows | tree, default | 54449 | 54449 | 34592 | 15 | 79 | 165 | 0.09 | 21 | 0.55 |
| back floor | tree, default | 6883 | 6883 | 26657 | 17 | 50 | 125 | 0.14 | 22 | 0.75 |
| white fur, front rows | tree, default | 22801 | 22801 | 10951 | 103 | 177 | 221 | 0.47 | 27 | 0.28 |
| white fur, back rows | tree, default | 13278 | 13278 | 34592 | 110 | 156 | 202 | 0.54 | 26 | 0.34 |
| front rows | tree, default, pixel sets of base | 92966 | 92966 | 10951 | 40 | 103 | 188 | 0.21 | 23 | 0.65 |
| back rows | tree, default, pixel sets of base | 54449 | 54449 | 34592 | 15 | 79 | 165 | 0.09 | 21 | 0.55 |
| back floor | tree, default, pixel sets of base | 6883 | 6883 | 26657 | 17 | 50 | 125 | 0.14 | 22 | 0.75 |
| white fur, front rows | tree, default, pixel sets of base | 23704 | 22801 | 10951 | 104 | 175 | 220 | 0.47 | 27 | 0.29 |
| white fur, back rows | tree, default, pixel sets of base | 13338 | 13278 | 34592 | 107 | 156 | 202 | 0.53 | 26 | 0.34 |

| Frame | White fur p90, back rows against front rows |
|---|---|
| reference | 0.98 |
| base, default | 0.94 |
| tree, default | 0.92 |
| tree, default, pixel sets of base | 0.92 |
