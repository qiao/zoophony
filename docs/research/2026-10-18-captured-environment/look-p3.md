# Look lab

The frames of `8b555f68` (step P3) against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| tree, orchestra | 27 | 62 | 106 | 152 | 205 | 0.62 |
| tree, default | 25 | 57 | 96 | 147 | 209 | 0.65 |
| tree, violins | 25 | 40 | 103 | 136 | 188 | 0.61 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | tree, orchestra | (240, 170, 119) | 181 | 25 | 0.50 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | tree, orchestra | (215, 151, 106) | 161 | 25 | 0.51 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | tree, orchestra | (89, 41, 19) | 50 | 19 | 0.79 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | tree, orchestra | (212, 171, 122) | 176 | 33 | 0.42 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | tree, orchestra | 33.9 | 147.3 | 4.4 | (53, 20, 8) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | tree, orchestra | 35.1 | 196.3 | 5.6 | (56, 21, 8) |
