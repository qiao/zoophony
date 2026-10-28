# Look lab

The frames of `scratch/v1/main-lab` against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| base, orchestra | 29 | 72 | 103 | 139 | 181 | 0.65 |
| base, default | 22 | 53 | 88 | 125 | 175 | 0.69 |
| base, violins | 26 | 55 | 102 | 135 | 172 | 0.65 |
| tree, orchestra | 63 | 96 | 125 | 152 | 221 | 0.64 |
| tree, default | 28 | 72 | 102 | 142 | 215 | 0.68 |
| tree, violins | 44 | 82 | 115 | 143 | 217 | 0.67 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | base, orchestra | (175, 107, 65) | 118 | 23 | 0.63 |
| lit floor, left of the podium | tree, orchestra | (190, 113, 63) | 126 | 24 | 0.67 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | base, orchestra | (188, 120, 78) | 131 | 23 | 0.59 |
| lit floor, right of the podium | tree, orchestra | (194, 116, 65) | 129 | 24 | 0.66 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | base, orchestra | (76, 36, 20) | 43 | 17 | 0.74 |
| back of the conductor | tree, orchestra | (136, 79, 46) | 89 | 22 | 0.66 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | base, orchestra | (179, 145, 119) | 150 | 26 | 0.34 |
| white fur, front left rabbit | tree, orchestra | (244, 214, 179) | 218 | 32 | 0.27 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | base, orchestra | 66.5 | 133.1 | 2.0 | (101, 51, 19) |
| floor with the shadows of the players | tree, orchestra | 75.7 | 136.8 | 1.8 | (118, 62, 28) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | base, orchestra | 22.0 | 35.8 | 1.6 | (37, 15, 8) |
| floor in front of the podium | tree, orchestra | 27.0 | 55.0 | 2.0 | (39, 21, 12) |

## Tones of the regions

A region with a mask measures only the pixels of its colors. The column Pixels gives their
count, so a change of the pixel set shows.

| Region | Frame | Pixels | Luma p10 | Luma p50 | Luma p90 | Hue | Saturation |
|---|---|---|---|---|---|---|---|
| rabbit torso, front left | base, orchestra | 3600 | 45 | 120 | 184 | 24 | 0.43 |
| rabbit torso, front left | tree, orchestra | 3600 | 86 | 205 | 226 | 30 | 0.34 |
| chair, front left | base, orchestra | 12 | 147 | 181 | 191 | 29 | 0.36 |
| chair, front left | tree, orchestra | 314 | 183 | 199 | 210 | 30 | 0.35 |
| hall above the stage, right of the beam | reference | 86569 | 7 | 12 | 49 | 24 | 0.56 |
| hall above the stage, right of the beam | base, orchestra | 51408 | 10 | 14 | 34 | 23 | 0.53 |
| hall above the stage, right of the beam | tree, orchestra | 51408 | 10 | 14 | 34 | 23 | 0.53 |

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
| front rows | base, default | 88680 | 88680 | 10370 | 40 | 103 | 187 | 0.22 | 23 | 0.65 |
| back rows | base, default | 50668 | 50668 | 35302 | 15 | 81 | 165 | 0.09 | 21 | 0.56 |
| back floor | base, default | 6805 | 6805 | 29461 | 21 | 63 | 127 | 0.16 | 22 | 0.69 |
| white fur, front rows | base, default | 21172 | 21172 | 10370 | 105 | 177 | 218 | 0.48 | 28 | 0.28 |
| white fur, back rows | base, default | 12478 | 12478 | 35302 | 111 | 156 | 202 | 0.55 | 27 | 0.34 |
| front rows | tree, default | 88680 | 88680 | 10370 | 74 | 134 | 224 | 0.33 | 23 | 0.61 |
| back rows | tree, default | 50668 | 50668 | 35302 | 18 | 94 | 177 | 0.10 | 22 | 0.53 |
| back floor | tree, default | 6805 | 6805 | 29461 | 22 | 57 | 126 | 0.18 | 23 | 0.68 |
| white fur, front rows | tree, default | 24801 | 24801 | 10370 | 159 | 217 | 235 | 0.68 | 30 | 0.25 |
| white fur, back rows | tree, default | 12954 | 12954 | 35302 | 120 | 166 | 210 | 0.57 | 28 | 0.34 |
| front rows | tree, default, pixel sets of base | 88680 | 88680 | 10370 | 74 | 134 | 224 | 0.33 | 23 | 0.61 |
| back rows | tree, default, pixel sets of base | 50668 | 50668 | 35302 | 18 | 94 | 177 | 0.10 | 22 | 0.53 |
| back floor | tree, default, pixel sets of base | 6805 | 6805 | 29461 | 22 | 57 | 126 | 0.18 | 23 | 0.68 |
| white fur, front rows | tree, default, pixel sets of base | 21172 | 24801 | 10370 | 155 | 220 | 236 | 0.66 | 30 | 0.24 |
| white fur, back rows | tree, default, pixel sets of base | 12478 | 12954 | 35302 | 118 | 165 | 211 | 0.56 | 28 | 0.34 |

| Frame | White fur p90, back rows against front rows |
|---|---|
| reference | 0.98 |
| base, default | 0.93 |
| tree, default | 0.89 |
| tree, default, pixel sets of base | 0.89 |
