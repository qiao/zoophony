# Look lab

The frames of `/Users/xueqiaoxu/proj/zoophony/.claude/worktrees/sixth-key-look/scratch/v/ablate/main` against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| tree, orchestra | 26 | 74 | 98 | 120 | 174 | 0.71 |
| tree, default | 22 | 57 | 84 | 111 | 168 | 0.74 |
| tree, violins | 32 | 68 | 101 | 122 | 169 | 0.71 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | tree, orchestra | (172, 97, 51) | 110 | 23 | 0.70 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | tree, orchestra | (168, 93, 48) | 106 | 23 | 0.71 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | tree, orchestra | (67, 29, 12) | 36 | 19 | 0.82 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | tree, orchestra | (208, 163, 124) | 170 | 28 | 0.40 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | tree, orchestra | 71.6 | 120.9 | 1.7 | (114, 57, 24) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | tree, orchestra | 23.0 | 40.1 | 1.7 | (38, 17, 9) |

## Tones of the regions

A region with a mask measures only the pixels of its colors. The column Pixels gives their
count, so a change of the pixel set shows.

| Region | Frame | Pixels | Luma p10 | Luma p50 | Luma p90 | Hue | Saturation |
|---|---|---|---|---|---|---|---|
| rabbit torso, front left | tree, orchestra | 3600 | 41 | 130 | 184 | 26 | 0.49 |
| chair, front left | tree, orchestra | 326 | 167 | 178 | 187 | 29 | 0.40 |
| hall above the stage, right of the beam | reference | 86569 | 7 | 12 | 49 | 24 | 0.56 |
| hall above the stage, right of the beam | tree, orchestra | 51408 | 10 | 14 | 33 | 23 | 0.53 |

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
| front rows | tree, default | 88654 | 88654 | 10370 | 39 | 94 | 184 | 0.21 | 22 | 0.71 |
| back rows | tree, default | 50668 | 50668 | 35302 | 14 | 84 | 162 | 0.09 | 21 | 0.59 |
| back floor | tree, default | 6805 | 6805 | 29461 | 19 | 61 | 127 | 0.15 | 22 | 0.71 |
| white fur, front rows | tree, default | 14079 | 14079 | 10370 | 102 | 191 | 218 | 0.47 | 29 | 0.34 |
| white fur, back rows | tree, default | 9492 | 9492 | 35302 | 131 | 163 | 202 | 0.65 | 29 | 0.35 |

| Frame | White fur p90, back rows against front rows |
|---|---|
| reference | 0.98 |
| tree, default | 0.93 |
