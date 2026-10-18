# Look lab

The frames of `main` at `d1bb9738` (the end of the round) against `docs/reference/orchestra-latest.png`.

## Stage tone

| Frame | p5 | p25 | p50 | p75 | p95 | Median saturation |
|---|---|---|---|---|---|---|
| reference | 26 | 58 | 107 | 154 | 212 | 0.67 |
| tree, orchestra | 25 | 61 | 105 | 151 | 204 | 0.62 |
| tree, default | 23 | 58 | 96 | 146 | 209 | 0.64 |
| tree, violins | 21 | 38 | 103 | 136 | 182 | 0.61 |

## Colors of the regions

| Region | Frame | Median RGB | Luma | Hue | Saturation |
|---|---|---|---|---|---|
| lit floor, left of the podium | reference | (252, 180, 115) | 191 | 28 | 0.54 |
| lit floor, left of the podium | tree, orchestra | (235, 172, 124) | 182 | 26 | 0.47 |
| lit floor, right of the podium | reference | (220, 146, 88) | 158 | 26 | 0.60 |
| lit floor, right of the podium | tree, orchestra | (214, 152, 108) | 162 | 25 | 0.50 |
| back of the conductor | reference | (89, 44, 24) | 52 | 18 | 0.73 |
| back of the conductor | tree, orchestra | (80, 38, 17) | 45 | 20 | 0.79 |
| white fur, front left rabbit | reference | (196, 156, 137) | 163 | 19 | 0.30 |
| white fur, front left rabbit | tree, orchestra | (213, 169, 120) | 175 | 32 | 0.44 |

## Shadows on the floor

| Region | Frame | Luma p5 | Luma p90 | Ratio | Shadow RGB |
|---|---|---|---|---|---|
| floor with the shadows of the players | reference | 63.1 | 162.7 | 2.6 | (69, 41, 24) |
| floor with the shadows of the players | tree, orchestra | 37.1 | 147.4 | 4.0 | (57, 23, 8) |
| floor in front of the podium | reference | 36.7 | 171.7 | 4.7 | (57, 29, 12) |
| floor in front of the podium | tree, orchestra | 30.2 | 196.7 | 6.5 | (38, 13, 5) |
